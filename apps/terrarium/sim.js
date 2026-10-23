// The live simulation. DOM-free on purpose: this runs identically in the
// browser and under node, which is how the ecology gets tuned and regression
// tested without a screen.

import { makeRng, clamp } from './engine/rng.js';
import { createGrid } from './grid.js';
import * as G from './genome.js';

export var TIME = {
  // Watching: one tank day every four real minutes, so a 20-minute charging
  // stop is about five tank days — roughly a generation turning over.
  REAL_SECONDS_PER_DAY: 240,
  // Away: one tank day every six real hours. The asymmetry is deliberate —
  // attention accelerates the tank, and a fortnight of neglect doesn't erase it.
  REAL_HOURS_PER_DAY_AWAY: 6,
  MAX_OFFLINE_DAYS: 30
};

// Median sink rate for food, px per real second. Roughly thirty times the old
// effective rate, and consistently downward - the old signed velocity let some
// food drift upward.
//
// Not chosen freely. Food that sinks is reached by whoever gets there first,
// which is a selection pressure the coarse offline model has no way to
// represent - it has no positions. Measured over ten seeds, worst-trait drift
// between the live sim and the coarse model at ten tank days:
//
//   old (stationary)  mean 0.120   0/10 seeds past the 0.2 tolerance
//   1.5               mean 0.134   0/10
//   3                 mean 0.142   1/10
//   6                 mean 0.146   4/10
//
// 1.5 is the fastest rate that keeps the away card as honest as it was. Going
// faster looks better and measurably degrades it; closing that gap properly
// means teaching the coarse model about food it never had to model.
export var FOOD_SINK = 1.5;

// Food scattered when a tank is first created.
//
// This was 90, against a tank that holds 0-8 standing food once it settles -
// so a new tank opened peppered with bright specks that outnumbered its own
// creatures three to one, for the four to eight real minutes it took the
// founders to eat through them. That is the whole of most people's first look.
//
// It bought nothing. Swept 90 / 45 / 24 / 12 / 6 across six seeds: the
// population never dips below the 26 founders at any of them, time to reach
// 100 creatures is 1.50-1.54 tank days at all of them, and the settled
// population is the same. The founders are fed by the ongoing spawn rate, not
// by this. 12 sits just above what the tank naturally holds, so it opens
// looking like a tank that is already running.
var SEED_FOOD = 12;

// Where a crumb comes to rest, as a fraction of tank height. Food used to
// settle on a single line at h - 6, so everything that was not eaten ended up
// in one row along the very bottom edge - a gutter, not a seabed.
//
// The reef mass centres at 0.64h (far), 0.75h (mid) and 0.90h (near), and food
// is drawn over the mid layer and under the near one. A crumb resting in this
// band therefore sits among the plants rather than beneath them, at a
// different height from its neighbours.
export var FOOD_REST = { lo: 0.70, hi: 0.92 };

// How long a crumb lingers where it settled, in tank days, before the
// substrate takes it. Raising it to 0.6 changed the offline model's drift by
// nothing at all - digit for digit the same ten seeds - because at a full tank
// settled food is grazed long before it expires. Left where it was.
var FOOD_LINGER_DAYS = 0.18;

export var LIMITS = {
  maxCreatures: 140,
  // The ceiling logistic growth climbs toward, not a safety limit. It was 380,
  // and nothing decays: an uneaten crumb leaves only by being eaten. So a tank
  // whose population has collapsed stops grazing and food grows to the ceiling
  // and stays there - measured at a settled 156 crumbs with four creatures
  // alive, against the 0-8 a healthy tank holds.
  //
  // A healthy tank never approaches this, so lowering it costs nothing there:
  // mean standing food is 4.6 at 380 and 4.3 at 60, over eight tank days. What
  // it changes is the collapsed tank, from 156 down to 47 - still visibly an
  // algae bloom with nothing grazing it, no longer a starfield. Also leaves
  // room for two presses of Feed, which adds 28 each.
  maxFood: 60,
  // Was 5, when three darters routinely chased the same fish and five of
  // them amounted to about one and a half effective hunters. Separation ended
  // that redundancy, which tripled the kills for the same darter-days: median
  // crash depth over 24 seeds fell from 17 creatures to 5, and half the tanks
  // reached minCreatures. Four dispersed darters measure back at the old
  // pressure (median 20, same count of tanks reaching the floor). Per-strike
  // lethality was the obvious knob and turned out to be a weak one - halving
  // it barely moved the median, because a darter that misses simply stays out
  // hunting longer.
  maxDarters: 4,
  maxLurkers: 1,         // rare on purpose: see LURKER below
  minCreatures: 4        // below this, founders drift in — the tank never dies
};

// The third trophic level.
//
// Darters have no functional response: they sit near a full energy bar even
// when prey is scarce, so nothing about the ecology ends a crash - only the
// hard `age > 14` cap does. Measured: cutting their food per kill from 62 to 30
// produced a digit-for-digit identical population trace, because their income
// never came close to binding. Suppression lasted exactly fourteen tank days
// whatever the tank was doing, which is a timer wearing an ecosystem's clothes.
//
// A predator of predators supplies the missing feedback, and supplies it the
// honest way. A lurker arrives *because* darters are abundant, and starves
// without them - so the thing that ends a crash is the crash itself, not a
// constant. Unlike a darter its energy genuinely binds: upkeep is high and one
// darter is worth little more than a day, so it cannot bank a surplus and wait.
//
// Rare by construction. arriveAt is a daily probability scaled by how many
// darters there are, so one darter almost never draws one and a full five draw
// one within a few days.
//
// Tuned by sweep against the case that prompted this: five darters on a young
// tank. At 0.16 they were cleaned up in a mean of 3 days, which made the Darter
// button do almost nothing. At 0.06 darters last a mean of 5.3 days - long
// enough to matter, against the 14 they used to get regardless of the state of
// the tank. Verified across four seeds that no lurker ever arrives with zero or
// one darter present.
export var LURKER = {
  arriveAt: 0.06,        // per darter, per tank day
  needDarters: 2,        // fewer than this and none will come
  upkeep: 150,           // per tank day - high, so hunger binds
  perDarter: 190,        // energy from one kill: about 1.3 days of upkeep
  maxEnergy: 320,
  senseRadius: 620,      // hunts by sensing darters, which are not subtle
  speed: 104,            // slower than a darter's 132: it wins by persistence
  catchRadius: 26
};

// Ecology tunables, exported so the headless tuning harness in test/ can sweep
// them. These values were chosen by sweeping for an equilibrium that is
// food-limited rather than cap-limited: the population should be regulated by
// what grows, not by LIMITS.maxCreatures, or the tank stops having dynamics.
export var ECOLOGY = {
  foodValue: 9,
  growthRate: 3.2,
  reserve: 100,      // non-grazeable algae film; keeps the web restartable
  ambient: 18       // drift-in from outside the tank
};

var FOOD_RADIUS = 3;

export function createSim(seedValue) {
  // Note: do not name this parameter `seed` — the local `function seed(n)`
  // declaration below hoists over it and every tank ends up on the same stream.
  var resolvedSeed = typeof seedValue === 'number' ? seedValue : 20260822;
  var rng = makeRng(resolvedSeed);

  var state = {
    // Kept on state and serialized so the reef a tank grows is stable across
    // reloads: the renderer builds its structure from this, not from the live
    // RNG, which has moved on by the time anything is drawn.
    seed: resolvedSeed,
    w: 1600, h: 1000,
    tankTime: 0,          // in tank days, monotonic
    creatures: [],
    food: [],
    darters: [],
    lurkers: [],
    currents: [],
    generation: 1,
    births: 0,
    deaths: 0,
    extinctionsAverted: 0,
    ancestralPool: [],    // archived genomes, so recovery inherits history
    journal: []
  };

  var grid = createGrid(120);
  var foodGrid = createGrid(120);

  // -------------------------------------------------------------------------
  // Time and light
  // -------------------------------------------------------------------------

  // 0 at midnight, 1 at noon. Algae photosynthesise on this curve, so the whole
  // food web has a daily rhythm rather than a flat trickle.
  function lightAt(t) { return 0.5 - 0.5 * Math.cos(t * Math.PI * 2); }
  function light() { return lightAt(state.tankTime); }
  function isNight() { return light() < 0.35; }

  // -------------------------------------------------------------------------
  // Spawning
  // -------------------------------------------------------------------------

  function spawnFood(x, y, drift) {
    if (state.food.length >= LIMITS.maxFood) return;
    state.food.push({
      x: clamp(x, 4, state.w - 4),
      y: clamp(y, 4, state.h - 4),
      vx: drift ? rng.range(-4, 4) : 0,
      // Sink rate in px per real second, per crumb. This used to be
      // rng.range(-2, 3) - a signed velocity, so some food drifted upward,
      // which food does not do.
      sink: drift ? rng.range(FOOD_SINK * 0.55, FOOD_SINK * 1.45) : 0,
      // Its own resting height, chosen when it spawns rather than at the
      // moment it lands, so crumbs settle scattered through the reef instead
      // of accumulating on one line.
      //
      // Never above where it started. A corpse or a handful of food dropped
      // low in the tank is already among the plants, and snapping it up to a
      // band it began below would be a visible jump.
      restY: drift
        ? Math.max(rng.range(state.h * FOOD_REST.lo, state.h * FOOD_REST.hi),
                   clamp(y, 4, state.h - 4))
        : clamp(y, 4, state.h - 4),
      wobble: rng() * Math.PI * 2
    });
  }

  function makeCreature(genome, x, y, energy) {
    var e = typeof energy === 'number' ? energy : G.maxEnergy(genome) * 0.55;
    return {
      genome: genome,
      x: x, y: y,
      vx: rng.range(-10, 10), vy: rng.range(-10, 10),
      energy: e,
      age: 0,
      generation: state.generation,
      phase: rng() * Math.PI * 2,   // tail oscillation offset
      id: Math.floor(rng() * 1e9)
    };
  }

  function addCreature(genome, x, y, energy) {
    if (state.creatures.length >= LIMITS.maxCreatures) return null;
    var c = makeCreature(genome, x, y, energy);
    state.creatures.push(c);
    return c;
  }

  function addDarter() {
    if (state.darters.length >= LIMITS.maxDarters) return;
    state.darters.push({
      x: rng.range(0, state.w), y: rng.range(0, state.h),
      vx: 0, vy: 0,
      energy: 120,
      age: 0,
      phase: rng() * Math.PI * 2,
      // The idle wander gets its own clock and its own frequencies. It used
      // to advance p.phase, which is the tail-wag clock and is also driven by
      // speed at the bottom of stepDarters - so the search pattern was
      // speed-modulated, and two darters moving at the same rate swept the
      // same figure. Per-darter rates mean they never do.
      wander: rng() * Math.PI * 2,
      wanderRate: rng.range(0.62, 1.25),
      wanderRatio: rng.range(0.55, 0.95),
      id: Math.floor(rng() * 1e9)
    });
  }

  function addLurker() {
    if (state.lurkers.length >= LIMITS.maxLurkers) return;
    // Enters from an edge rather than appearing mid-water: something this size
    // arriving out of nowhere reads as a glitch, arriving from the dark reads
    // as a visitor.
    var edge = rng.int(4);
    state.lurkers.push({
      x: edge === 0 ? 0 : edge === 1 ? state.w : rng.range(0, state.w),
      y: edge === 2 ? 0 : edge === 3 ? state.h : rng.range(0, state.h),
      vx: 0, vy: 0,
      energy: LURKER.maxEnergy * 0.55,
      age: 0,
      phase: rng() * Math.PI * 2,
      id: Math.floor(rng() * 1e9)
    });
    note('lurker', 'Something larger is moving through.');
  }

  function stepLurkers(dt, dd) {
    // Arrival is a daily probability per darter, so it is the darters' own
    // abundance that calls this down on them. Below needDarters nothing comes,
    // which keeps a tank nobody has poked entirely free of them.
    if (state.darters.length >= LURKER.needDarters &&
        state.lurkers.length < LIMITS.maxLurkers) {
      if (rng() < LURKER.arriveAt * state.darters.length * dd) addLurker();
    }

    var alive = [];
    for (var i = 0; i < state.lurkers.length; i++) {
      var L = state.lurkers[i];
      L.age += dd;
      L.energy -= LURKER.upkeep * dd;
      if (L.energy <= 0) { continue; }   // starves out; no age cap, hunger is the clock

      var best = null, bestD2 = LURKER.senseRadius * LURKER.senseRadius;
      for (var j = 0; j < state.darters.length; j++) {
        var d = state.darters[j];
        var dx = d.x - L.x, dy = d.y - L.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; best = d; }
      }

      var ax = 0, ay = 0;
      if (best) {
        var bx = best.x - L.x, by = best.y - L.y;
        var bl = Math.sqrt(bx * bx + by * by) || 1;
        ax = (bx / bl) * 120; ay = (by / bl) * 120;
        if (bl < LURKER.catchRadius) {
          var idx = state.darters.indexOf(best);
          if (idx >= 0) {
            state.darters.splice(idx, 1);
            state.deaths++;
            L.energy = Math.min(LURKER.maxEnergy, L.energy + LURKER.perDarter);
          }
        }
      } else {
        // Nothing to hunt: drift, and burn. With no darters left a lurker is
        // gone in about two tank days, which is what keeps them from becoming
        // permanent residents.
        L.phase += dt * 0.5;
        ax = Math.cos(L.phase) * 26;
        ay = Math.sin(L.phase * 0.6) * 26;
      }

      var margin = 40;
      if (L.x < margin) ax += (margin - L.x) * 2;
      if (L.x > state.w - margin) ax -= (L.x - (state.w - margin)) * 2;
      if (L.y < margin) ay += (margin - L.y) * 2;
      if (L.y > state.h - margin) ay -= (L.y - (state.h - margin)) * 2;

      L.vx += ax * dt; L.vy += ay * dt;
      var sp = Math.sqrt(L.vx * L.vx + L.vy * L.vy);
      if (sp > LURKER.speed) { L.vx = (L.vx / sp) * LURKER.speed; L.vy = (L.vy / sp) * LURKER.speed; }
      L.vx *= 0.985; L.vy *= 0.985;
      L.x = clamp(L.x + L.vx * dt, 2, state.w - 2);
      L.y = clamp(L.y + L.vy * dt, 2, state.h - 2);
      L.phase += dt * (1 + sp * 0.02);
      alive.push(L);
    }
    state.lurkers = alive;
  }

  function seed(n) {
    var count = n || 26;
    // One founding lineage, not twenty-six. Every tank gets its own base hue
    // and the founders sit close around it, so the population reads as related
    // and neutral drift widens the palette over generations instead of
    // starting from noise.
    var baseHue = rng();
    for (var i = 0; i < count; i++) {
      var g = G.randomGenome(rng);
      g.hue = (baseHue + rng.normal() * 0.045 + 1) % 1;
      addCreature(g, rng.range(0, state.w), rng.range(0, state.h));
    }
    for (var j = 0; j < SEED_FOOD; j++) {
      spawnFood(rng.range(0, state.w), rng.range(0, state.h), true);
    }
    archive();
  }

  // Keep a rolling sample of genomes from across the tank's history. Founders
  // are blended out of this pool, so a recovery looks like a return of
  // something that used to live here rather than a factory reset.
  function archive() {
    if (state.creatures.length === 0) return;
    var pick = state.creatures[rng.int(state.creatures.length)];
    state.ancestralPool.push({
      genome: pick.genome,
      atDay: Math.round(state.tankTime * 10) / 10
    });
    if (state.ancestralPool.length > 12) state.ancestralPool.shift();
  }

  // -------------------------------------------------------------------------
  // The never-dies guarantee
  // -------------------------------------------------------------------------
  //
  // Two mechanisms, both explicit rather than emergent. Food regrowth is
  // logistic with an ambient floor, so a population crash is followed by an
  // algae bloom the survivors can ride back up. And if the population still
  // falls below LIMITS.minCreatures, founders drift in.
  function ensureSurvival() {
    if (state.creatures.length >= LIMITS.minCreatures) return;

    var basis = null;
    if (state.ancestralPool.length > 0) {
      basis = state.ancestralPool[rng.int(state.ancestralPool.length)].genome;
    }
    var living = state.creatures.length > 0 ? G.meanGenome(state.creatures) : null;

    var founder;
    if (basis && living)      founder = G.blend(basis, living, 0.5, rng);
    else if (basis)           founder = G.mutate(basis, rng);
    else if (living)          founder = G.mutate(living, rng);
    else                      founder = G.randomGenome(rng);

    addCreature(founder, rng.range(0, state.w), rng.range(0, state.h),
                G.maxEnergy(founder) * 0.7);

    if (state.creatures.length === 1) {
      state.extinctionsAverted++;
      note('drifters', 'A few drifters found their way in.');
    }
    // Give them something to eat on arrival.
    for (var i = 0; i < 14; i++) {
      spawnFood(rng.range(0, state.w), rng.range(0, state.h), true);
    }
  }

  function note(kind, text) {
    state.journal.push({ day: Math.round(state.tankTime * 10) / 10, kind: kind, text: text });
    if (state.journal.length > 20) state.journal.shift();
  }

  // -------------------------------------------------------------------------
  // Step
  // -------------------------------------------------------------------------

  var archiveTimer = 0;

  function step(dtSeconds) {
    var dd = dtSeconds / TIME.REAL_SECONDS_PER_DAY;   // elapsed tank days
    state.tankTime += dd;
    var lit = light();
    var night = lit < 0.35;

    growFood(dd, lit);
    // Sweep settled food here rather than only in stepCreatures, so an empty
    // tank still clears its floor.
    for (var fi = state.food.length - 1; fi >= 0; fi--) {
      if (state.food[fi].eaten) state.food.splice(fi, 1);
    }
    rebuildGrids();
    stepCreatures(dtSeconds, dd, night);
    stepDarters(dtSeconds, dd, night);
    stepLurkers(dtSeconds, dd);
    stepCurrents(dtSeconds);
    ensureSurvival();

    archiveTimer += dd;
    if (archiveTimer > 1.5) { archiveTimer = 0; archive(); }
  }

  function growFood(dd, lit) {
    // Logistic growth driven by daylight, plus an ambient trickle so the tank
    // can climb back from zero — logistic growth alone is stuck at zero forever.
    var F = state.food.length;
    var K = LIMITS.maxFood;
    var r = ECOLOGY.growthRate * (0.15 + lit);
    var ambient = ECOLOGY.ambient * (0.25 + lit);
    // RESERVE is algae film on the glass that creatures can't graze. Without it
    // pure logistic growth is proportional to standing stock, so the first time
    // the tank gets grazed to zero the food web can never restart — which is
    // exactly the death spiral this simulation is not allowed to have.
    var RESERVE = ECOLOGY.reserve;
    var growth = (r * (F + RESERVE) * (1 - F / K) + ambient) * dd;
    if (growth < 0) growth = 0;

    var whole = Math.floor(growth);
    var frac = growth - whole;
    if (rng() < frac) whole++;
    for (var i = 0; i < whole; i++) {
      spawnFood(rng.range(0, state.w), rng.range(0, state.h * FOOD_REST.lo), true);
    }

    // Sink.
    //
    // This was scaled by `dd * REAL_SECONDS_PER_DAY * 0.02`, and the two time
    // factors cancel: it came to (vy + 0.6) * dtSeconds * 0.02, which is
    // -0.03 to +0.07 px per second. Measured over 20 tank days and 5140
    // crumbs, the furthest any one of them ever travelled was 7.6px in a
    // 1000px tank - stationary, next to bubbles moving at 5-18px/s.
    //
    // That also quietly disabled the settling below: nothing ever reached the
    // floor by sinking, so the larder that comment guards against was only
    // being prevented by food happening to get eaten first.
    var secs = dd * TIME.REAL_SECONDS_PER_DAY;
    for (var j = 0; j < state.food.length; j++) {
      var f = state.food[j];
      f.wobble += secs * 0.9;
      f.x += (f.vx * 0.02 + Math.sin(f.wobble) * 1.6) * secs;
      // Defaulted, not assumed. The offline model creates food of its own and
      // hands it straight back to the live sim; a missing sink here is not a
      // slow drift but an immediate NaN, and a crumb at NaN goes into the
      // spatial hash and can then never be reached, eaten, or removed.
      if (typeof f.sink !== 'number') f.sink = FOOD_SINK;
      f.y += f.sink * secs;
      // Anything that reaches the floor settles into the substrate and is gone
      // shortly after. Without this the bottom becomes a permanent larder and
      // every creature in the tank spends its life down there.
      var rest = typeof f.restY === 'number' ? f.restY : state.h - 6;
      if (f.y > rest) {
        f.y = rest;
        f.sink = 0;
        f.settled = (f.settled || 0) + dd;
        if (f.settled > FOOD_LINGER_DAYS) f.eaten = true;
      }
      if (f.x < 4 || f.x > state.w - 4) f.vx *= -1;
      f.x = clamp(f.x, 4, state.w - 4);
    }
  }

  function rebuildGrids() {
    grid.clear();
    for (var i = 0; i < state.creatures.length; i++) {
      var c = state.creatures[i];
      grid.insert(c, c.x, c.y);
    }
    foodGrid.clear();
    for (var j = 0; j < state.food.length; j++) {
      var f = state.food[j];
      foodGrid.insert(f, f.x, f.y);
    }
  }

  function stepCreatures(dt, dd, night) {
    var survivors = [];
    var newborns = [];

    for (var i = 0; i < state.creatures.length; i++) {
      var c = state.creatures[i];
      var g = c.genome;

      c.age += dd;
      c.energy -= G.metabolicCost(g) * dd;

      if (c.energy <= 0 || c.age > G.lifespan(g)) {
        state.deaths++;
        // A death returns its matter to the tank.
        spawnFood(c.x, c.y, true);
        continue;
      }

      steer(c, g, dt, night);
      eat(c, g);

      // Reproduction: split when well fed and mature, halving energy into a
      // mutated child. Blocked at the population cap so a food glut can't run
      // the frame budget off a cliff.
      if (c.energy > G.maxEnergy(g) * 0.7 && c.age > G.maturity(g) &&
          state.creatures.length + newborns.length < LIMITS.maxCreatures) {
        c.energy *= 0.5;
        var childGenome = G.mutate(g, rng);
        var child = makeCreature(childGenome, c.x + rng.range(-8, 8), c.y + rng.range(-8, 8), c.energy);
        child.generation = c.generation + 1;
        if (child.generation > state.generation) state.generation = child.generation;
        newborns.push(child);
        state.births++;
      }

      survivors.push(c);
    }

    state.creatures = survivors.concat(newborns);

    for (var k = state.food.length - 1; k >= 0; k--) {
      if (state.food[k].eaten) state.food.splice(k, 1);
    }
  }

  function steer(c, g, dt, night) {
    var maxV = G.maxSpeed(g);
    var sense = G.senseRadiusAt(g, night);
    var ax = 0, ay = 0;

    // --- flee darters (overrides everything else) ---
    var fleeing = false;
    for (var d = 0; d < state.darters.length; d++) {
      var p = state.darters[d];
      var dx = c.x - p.x, dy = c.y - p.y;
      var dist2 = dx * dx + dy * dy;
      var range = sense * 1.3;
      if (dist2 < range * range && dist2 > 0.01) {
        var dist = Math.sqrt(dist2);
        var urgency = (1 - dist / range) * 260;
        ax += (dx / dist) * urgency;
        ay += (dy / dist) * urgency;
        fleeing = true;
      }
    }

    // --- schooling, weighted by the social gene ---
    var sepX = 0, sepY = 0, cohX = 0, cohY = 0, aliX = 0, aliY = 0, n = 0;
    // Deliberately small. A large neighbourhood means every creature is a
    // neighbour of every other, and the whole tank converges to one clump
    // instead of forming several drifting shoals.
    var neighbourRange = clamp(sense * 0.42, 46, 96);
    var personal = G.radius(g) * 4.6;
    grid.query(c.x, c.y, neighbourRange, function (o) {
      if (o === c) return;
      var ox = c.x - o.x, oy = c.y - o.y;
      var d2 = ox * ox + oy * oy;
      if (d2 > neighbourRange * neighbourRange || d2 < 0.0001) return;
      var dd2 = Math.sqrt(d2);
      if (dd2 < personal) {
        // Squared falloff: crowding has to bite hard at close range or
        // cohesion from a dozen neighbours simply overwhelms it.
        var push = (1 - dd2 / personal);
        sepX += (ox / dd2) * push * push;
        sepY += (oy / dd2) * push * push;
      }
      cohX += o.x; cohY += o.y;
      aliX += o.vx; aliY += o.vy;
      n++;
    });

    ax += sepX * 340;
    ay += sepY * 340;
    if (n > 0 && !fleeing) {
      // Every creature schools a little; `social` modulates how much above that
      // floor. The floor is a deliberate visual guarantee — selection pushes
      // this gene around quite a lot between tanks, and an aquarium where the
      // fish happen to have evolved into loners should still look like an
      // aquarium rather than a screensaver of drifting dots.
      var social = g.social;
      cohX = cohX / n - c.x; cohY = cohY / n - c.y;
      var cl = Math.sqrt(cohX * cohX + cohY * cohY) || 1;
      // Only pull toward the shoal once actually adrift from it. Cohering when
      // already in the middle of the group is what compacts it to a point.
      if (cl > personal * 1.6) {
        ax += (cohX / cl) * (10 + 26 * social);
        ay += (cohY / cl) * (10 + 26 * social);
      }
      var al = Math.sqrt(aliX * aliX + aliY * aliY) || 1;
      ax += (aliX / al) * (12 + 26 * social);
      ay += (aliY / al) * (12 + 26 * social);
    }

    // --- seek the nearest food inside the sensory field ---
    if (!fleeing) {
      // Many eyes: a creature surrounded by shoal-mates effectively sees
      // further, because it can follow whoever spotted something. This is what
      // makes `social` worth carrying against the cost of competing for the
      // same water — without it, schooling is selected straight out of the tank.
      var foodSense = sense * (1 + 0.5 * g.social * Math.min(n / 6, 1));
      var bestD2 = Infinity, bx = 0, by = 0, found = false;
      foodGrid.query(c.x, c.y, foodSense, function (f) {
        var fx = f.x - c.x, fy = f.y - c.y;
        var d2 = fx * fx + fy * fy;
        if (d2 < bestD2 && d2 < foodSense * foodSense) { bestD2 = d2; bx = fx; by = fy; found = true; }
      });
      if (found) {
        var bl = Math.sqrt(bestD2) || 1;
        // Hungrier creatures commit harder to the chase.
        var hunger = 1 - clamp(c.energy / G.maxEnergy(g), 0, 1);
        ax += (bx / bl) * (60 + 90 * hunger);
        ay += (by / bl) * (60 + 90 * hunger);
      } else {
        // Nothing in range: wander, so an empty tank still looks alive.
        c.phase += dt * 1.4;
        ax += Math.cos(c.phase * 0.7 + c.id) * 22;
        ay += Math.sin(c.phase * 0.5 + c.id) * 22;
      }
    }

    // --- user-made currents ---
    for (var k = 0; k < state.currents.length; k++) {
      var cur = state.currents[k];
      var cdx = c.x - cur.x, cdy = c.y - cur.y;
      var cd2 = cdx * cdx + cdy * cdy;
      if (cd2 < cur.radius * cur.radius) {
        var falloff = (1 - Math.sqrt(cd2) / cur.radius) * cur.life;
        ax += cur.vx * falloff * 9;
        ay += cur.vy * falloff * 9;
      }
    }

    // --- walls ---
    var margin = 70;
    if (c.x < margin) ax += (margin - c.x) * 2.2;
    if (c.x > state.w - margin) ax -= (c.x - (state.w - margin)) * 2.2;
    if (c.y < margin) ay += (margin - c.y) * 2.2;
    if (c.y > state.h - margin) ay -= (c.y - (state.h - margin)) * 2.2;
    // Creatures rest lower at night.
    ay += night ? 4 : -3;

    c.vx += ax * dt;
    c.vy += ay * dt;

    var sp = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
    var cap = fleeing ? maxV * 1.45 : maxV;
    if (sp > cap) { c.vx = (c.vx / sp) * cap; c.vy = (c.vy / sp) * cap; }
    c.vx *= 0.985; c.vy *= 0.985;

    c.x = clamp(c.x + c.vx * dt, 2, state.w - 2);
    c.y = clamp(c.y + c.vy * dt, 2, state.h - 2);
    c.phase += dt * (2 + sp * 0.08);
  }

  // Food is marked rather than spliced: removing from the middle of the array
  // while the spatial grid still holds references to it would leave the grid
  // pointing at food that no longer exists. One filter pass per step instead.
  function eat(c, g) {
    var reach = G.radius(g) + FOOD_RADIUS + 2;
    var hit = null;
    foodGrid.query(c.x, c.y, reach, function (f) {
      if (hit || f.eaten) return;
      var dx = f.x - c.x, dy = f.y - c.y;
      if (dx * dx + dy * dy < reach * reach) hit = f;
    });
    if (hit) {
      hit.eaten = true;
      c.energy = Math.min(G.maxEnergy(g), c.energy + ECOLOGY.foodValue);
    }
  }

  // Darters are about 65px long. Two closer than this read as one object on
  // screen, which is what "several stacked" looks like; the force holds a
  // small gap rather than merely un-overlapping them.
  var DARTER_SEPARATION = 70;

  // Named because both were swept when separation changed the balance, and
  // both turned out to be the wrong lever - the headcount was. Left as
  // constants so the next person can see what has already been tried.
  var DARTER_LETHALITY = 0.75;
  var DARTER_SENSE = 420;

  function stepDarters(dt, dd, night) {
    // Two passes. Separation needs to know which darters are actually alive,
    // and a single pass knows that only for the ones it has already visited.
    var alive = [];
    for (var i = 0; i < state.darters.length; i++) {
      var p = state.darters[i];
      p.age += dd;
      // Darters are expensive to run, which is what makes them boom and bust
      // instead of flattening the tank permanently.
      p.energy -= 46 * dd;
      if (p.energy <= 0 || p.age > 14) {
        state.deaths++;
        continue;
      }
      alive.push(p);
    }

    // Prey already chosen by another darter this tick. Every darter used to
    // score every creature identically, so any two within range of the same
    // fish picked it, converged on the same point, and stayed there - the
    // stacking was mostly this rather than a lack of noise.
    var claimed = [];

    for (var n = 0; n < alive.length; n++) {
      var d = alive[n];

      // Hunt the nearest creature, weighted by how catchable it is.
      var best = null, bestScore = Infinity;
      for (var j = 0; j < state.creatures.length; j++) {
        var c = state.creatures[j];
        var dx = c.x - d.x, dy = c.y - d.y;
        var d2 = dx * dx + dy * dy;
        if (d2 > DARTER_SENSE * DARTER_SENSE) continue;
        var score = d2 / G.predationRisk(c.genome, night);
        // A claimed fish is not forbidden, just less attractive: with one
        // fish and three darters they should still all go for it.
        if (claimed.indexOf(c) >= 0) score *= 3.2;
        if (score < bestScore) { bestScore = score; best = c; }
      }

      var ax = 0, ay = 0;
      if (best) {
        claimed.push(best);
        var bx = best.x - d.x, by = best.y - d.y;
        var bl = Math.sqrt(bx * bx + by * by) || 1;
        ax = (bx / bl) * 150; ay = (by / bl) * 150;
        if (bl < 14) {
          // Caught — but not certainly. predationRisk keeps size, schooling
          // and bioluminescence meaningful.
          if (rng() < clamp(G.predationRisk(best.genome, night) * DARTER_LETHALITY, 0.05, 0.95)) {
            var idx = state.creatures.indexOf(best);
            if (idx >= 0) {
              state.creatures.splice(idx, 1);
              state.deaths++;
              d.energy = Math.min(210, d.energy + 62);
            }
          }
        }
      } else {
        d.wander += dt * d.wanderRate;
        ax = Math.cos(d.wander) * 40;
        ay = Math.sin(d.wander * d.wanderRatio) * 40;
      }

      // Separation. Nothing pushed darters apart, so two that converged
      // stayed converged: same target, same steering, same speed cap, and no
      // force in the system with any opinion about it.
      for (var k = 0; k < alive.length; k++) {
        if (k === n) continue;
        var o = alive[k];
        var sx = d.x - o.x, sy = d.y - o.y;
        var sd2 = sx * sx + sy * sy;
        if (sd2 > DARTER_SEPARATION * DARTER_SEPARATION) continue;
        var sdist = Math.sqrt(sd2);
        if (sdist < 0.001) {
          // Exactly co-located. Any direction will do, but it has to be a
          // direction — normalising a zero vector gives NaN and the darter
          // leaves the tank forever.
          var a0 = rng() * Math.PI * 2;
          sx = Math.cos(a0); sy = Math.sin(a0); sdist = 1;
        }
        var push = 1 - sdist / DARTER_SEPARATION;
        ax += (sx / sdist) * push * 300;
        ay += (sy / sdist) * push * 300;
      }

      var margin = 60;
      if (d.x < margin) ax += (margin - d.x) * 2;
      if (d.x > state.w - margin) ax -= (d.x - (state.w - margin)) * 2;
      if (d.y < margin) ay += (margin - d.y) * 2;
      if (d.y > state.h - margin) ay -= (d.y - (state.h - margin)) * 2;

      d.vx += ax * dt; d.vy += ay * dt;
      var sp = Math.sqrt(d.vx * d.vx + d.vy * d.vy);
      if (sp > 132) { d.vx = (d.vx / sp) * 132; d.vy = (d.vy / sp) * 132; }
      d.vx *= 0.98; d.vy *= 0.98;
      d.x = clamp(d.x + d.vx * dt, 2, state.w - 2);
      d.y = clamp(d.y + d.vy * dt, 2, state.h - 2);
      d.phase += dt * (2 + sp * 0.05);
    }

    state.darters = alive;
  }

  function stepCurrents(dt) {
    for (var i = state.currents.length - 1; i >= 0; i--) {
      var c = state.currents[i];
      c.life -= dt * 1.6;
      if (c.life <= 0) state.currents.splice(i, 1);
    }
  }

  // -------------------------------------------------------------------------
  // External interaction
  // -------------------------------------------------------------------------

  function feed(x, y, count) {
    var n = count || 14;
    for (var i = 0; i < n; i++) {
      var a = rng() * Math.PI * 2;
      var r = rng() * 46;
      spawnFood(x + Math.cos(a) * r, y + Math.sin(a) * r, true);
    }
  }

  function pushCurrent(x, y, vx, vy) {
    state.currents.push({ x: x, y: y, vx: vx, vy: vy, radius: 190, life: 1 });
    if (state.currents.length > 24) state.currents.shift();
  }

  function creatureAt(x, y, tolerance) {
    var tol = tolerance || 28;
    var best = null, bestD2 = tol * tol;
    for (var i = 0; i < state.creatures.length; i++) {
      var c = state.creatures[i];
      var dx = c.x - x, dy = c.y - y;
      var d2 = dx * dx + dy * dy;
      if (d2 < bestD2) { bestD2 = d2; best = c; }
    }
    return best;
  }

  function resize(w, h) {
    var oldW = state.w, oldH = state.h;
    state.w = w; state.h = h;
    if (oldW === w && oldH === h) return;
    var sx = w / oldW, sy = h / oldH;
    var all = state.creatures.concat(state.darters);
    for (var i = 0; i < all.length; i++) {
      all[i].x = clamp(all[i].x * sx, 2, w - 2);
      all[i].y = clamp(all[i].y * sy, 2, h - 2);
    }
    for (var j = 0; j < state.food.length; j++) {
      state.food[j].x = clamp(state.food[j].x * sx, 4, w - 4);
      state.food[j].y = clamp(state.food[j].y * sy, 4, h - 4);
      // The resting height is an absolute y, so it has to scale with the tank
      // or every crumb on a rotated screen aims at the wrong depth.
      if (typeof state.food[j].restY === 'number') {
        state.food[j].restY = clamp(state.food[j].restY * sy, 4, h - 4);
      }
    }
  }

  // Persistence. Food positions are deliberately not saved — they are
  // regenerated on load, and storing 380 coordinate pairs to reproduce a
  // scattering of drifting specks nobody remembers is wasted quota.
  function serialize() {
    var creatures = [];
    for (var i = 0; i < state.creatures.length; i++) {
      var c = state.creatures[i];
      creatures.push({
        g: c.genome,
        e: Math.round(c.energy * 100) / 100,
        a: Math.round(c.age * 1000) / 1000,
        n: c.generation
      });
    }
    var darters = [];
    for (var j = 0; j < state.darters.length; j++) {
      darters.push({ e: state.darters[j].energy, a: state.darters[j].age });
    }
    var lurkers = [];
    for (var L = 0; L < state.lurkers.length; L++) {
      lurkers.push({ e: state.lurkers[L].energy, a: state.lurkers[L].age });
    }
    return {
      tankTime: state.tankTime,
      lurkers: lurkers,
      creatures: creatures,
      darters: darters,
      foodCount: state.food.length,
      generation: state.generation,
      births: state.births,
      deaths: state.deaths,
      extinctionsAverted: state.extinctionsAverted,
      ancestralPool: state.ancestralPool,
      journal: state.journal,
      seed: state.seed,
      rngState: rng.state()
    };
  }

  function deserialize(data) {
    if (!data || !data.creatures) return false;
    state.tankTime = data.tankTime || 0;
    state.generation = data.generation || 1;
    state.births = data.births || 0;
    state.deaths = data.deaths || 0;
    state.extinctionsAverted = data.extinctionsAverted || 0;
    state.ancestralPool = data.ancestralPool || [];
    state.journal = data.journal || [];
    // Saves written before the reef existed carry no seed; keep the one this
    // sim was constructed with rather than resetting it to a constant, so an
    // upgraded tank keeps a reef of its own instead of everyone sharing one.
    if (typeof data.seed === 'number') state.seed = data.seed;
    if (typeof data.rngState === 'number') rng.setState(data.rngState);

    state.creatures = [];
    for (var i = 0; i < data.creatures.length && i < LIMITS.maxCreatures; i++) {
      var r = data.creatures[i];
      if (!r || !r.g) continue;
      var c = makeCreature(r.g, rng.range(0, state.w), rng.range(0, state.h), r.e);
      c.age = r.a || 0;
      c.generation = r.n || 1;
      state.creatures.push(c);
    }

    state.darters = [];
    for (var j = 0; j < (data.darters || []).length && j < LIMITS.maxDarters; j++) {
      addDarter();
      var d = state.darters[state.darters.length - 1];
      if (d) { d.energy = data.darters[j].e; d.age = data.darters[j].a; }
    }

    state.lurkers = [];
    for (var L = 0; L < (data.lurkers || []).length && L < LIMITS.maxLurkers; L++) {
      addLurker();
      var lk = state.lurkers[state.lurkers.length - 1];
      if (lk) { lk.energy = data.lurkers[L].e; lk.age = data.lurkers[L].a; }
    }

    state.food = [];
    var fc = Math.min(LIMITS.maxFood, data.foodCount || 0);
    for (var k = 0; k < fc; k++) {
      spawnFood(rng.range(0, state.w), rng.range(0, state.h), true);
    }
    return true;
  }

  return {
    state: state,
    rng: rng,
    step: step,
    serialize: serialize,
    deserialize: deserialize,
    seed: seed,
    feed: feed,
    addDarter: addDarter,
    addLurker: addLurker,
    addCreature: addCreature,
    pushCurrent: pushCurrent,
    creatureAt: creatureAt,
    resize: resize,
    archive: archive,
    note: note,
    ensureSurvival: ensureSurvival,
    light: light,
    isNight: isNight,
    lightAt: lightAt
  };
}
