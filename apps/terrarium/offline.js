// "While you were away."
//
// The tank keeps running between visits. Replaying the real simulation for a
// fortnight of absence would mean ~12 million steps and a frozen tab, so this
// is a coarse population-level model stepped one tank hour at a time.
//
// Critically it imports the *same* genome module as the live sim — the same
// costs, the same mutation, the same predation risk. Nothing here invents a
// second set of rules, so what you're told happened is consistent with what you
// would have watched happen.

import { clamp } from './engine/rng.js';
import * as G from './genome.js';
import { TIME, LIMITS, ECOLOGY, FOOD_SINK, FOOD_REST } from './sim.js';

// Calibration constants, tuned against the live simulation by
// test/calibrate.mjs. Exported so that harness can sweep them.
export var COARSE = {
  // Motes encountered per tank day at full food density and unit forage ability.
  encounter: 45,
  // How sharply competition favours the better forager. At 1 everyone gets a
  // share proportional to their appetite, which under-selects badly: in the
  // live tank the fast, wide-sensed creature physically reaches the food first
  // and the poor forager gets nothing. Raising this reproduces that pressure.
  sharpness: 2.5
};
//
// Calibration result (test/calibrate.mjs, 10 tank days, 3 seeds): mean genome
// error 0.07 against the live simulation, population within ~16%. Generation
// count runs about 30% low — the coarse model paces reproduction off an energy
// average rather than individual feeding events. That is a deliberate trade:
// the away card describes *traits*, and trait fidelity is what makes it honest.

export function offlineDaysFor(elapsedRealHours) {
  var days = elapsedRealHours / TIME.REAL_HOURS_PER_DAY_AWAY;
  return clamp(days, 0, TIME.MAX_OFFLINE_DAYS);
}

// Advances `sim` by `days` of tank time without rendering or per-frame motion.
// Returns a summary suitable for the away card.
export function catchUp(sim, days) {
  var state = sim.state;
  var rng = sim.rng;

  var before = {
    population: state.creatures.length,
    genome: G.meanGenome(state.creatures),
    generation: state.generation,
    births: state.births,
    deaths: state.deaths,
    darters: state.darters.length
  };

  var STEP = 1 / 24;                       // one tank hour
  var ticks = Math.min(Math.round(days / STEP), TIME.MAX_OFFLINE_DAYS * 24);
  var peakPop = before.population;
  var troughPop = before.population;
  var avertedBefore = state.extinctionsAverted;

  for (var t = 0; t < ticks; t++) {
    state.tankTime += STEP;
    var lit = sim.lightAt(state.tankTime);
    var night = lit < 0.35;

    growFood(state, lit, STEP);
    forage(state, night, STEP, rng);
    reproduceAndDie(state, rng);
    predate(state, night, STEP, rng);
    sim.ensureSurvival();

    if (state.creatures.length > peakPop) peakPop = state.creatures.length;
    if (state.creatures.length < troughPop) troughPop = state.creatures.length;
    if (t % 36 === 0) sim.archive();
  }

  // Scatter the surviving population back across the tank. Positions are not
  // tracked by the coarse model, and a shoal frozen where it stood a fortnight
  // ago would look wrong the moment the first frame draws.
  scatter(state, rng);

  var after = {
    population: state.creatures.length,
    genome: G.meanGenome(state.creatures),
    generation: state.generation
  };

  return {
    days: days,
    ticks: ticks,
    before: before,
    after: after,
    births: state.births - before.births,
    deaths: state.deaths - before.deaths,
    generations: Math.max(0, after.generation - before.generation),
    peakPop: peakPop,
    troughPop: troughPop,
    crashed: troughPop <= LIMITS.minCreatures,
    averted: state.extinctionsAverted - avertedBefore,
    observations: describe(before, after, troughPop, peakPop)
  };
}

function growFood(state, lit, dd) {
  var F = state.food.length;
  var K = LIMITS.maxFood;
  var r = ECOLOGY.growthRate * (0.15 + lit);
  var ambient = ECOLOGY.ambient * (0.25 + lit);
  var growth = (r * (F + ECOLOGY.reserve) * (1 - F / K) + ambient) * dd;
  if (growth < 0) growth = 0;
  var target = Math.min(K, F + growth);
  // Food is tracked as a plain count here; positions are regenerated on scatter.
  while (state.food.length < Math.floor(target)) {
    state.food.push({ x: 0, y: 0, vx: 0, sink: FOOD_SINK, wobble: 0 });
  }
}

function forage(state, night, dd, rng) {
  var K = LIMITS.maxFood;
  var density = state.food.length / K;
  var creatures = state.creatures;
  if (creatures.length === 0) return;

  // Each creature's share of what it could find, before competition.
  var demand = new Float64Array(creatures.length);
  var weight = new Float64Array(creatures.length);
  var total = 0, weightTotal = 0;
  for (var i = 0; i < creatures.length; i++) {
    var ability = G.forageAbility(creatures[i].genome, night);
    var want = ability * density * COARSE.encounter * dd;
    demand[i] = want;
    total += want;
    var w = Math.pow(ability, COARSE.sharpness);
    weight[i] = w;
    weightTotal += w;
  }

  // Crowding: when the shoal collectively wants more than the water holds, the
  // fixed pie is divided by competitive weight rather than by appetite — that
  // is what makes a marginally better forager meaningfully more likely to eat,
  // and it is the selection pressure the live simulation applies for free.
  // The pie is whatever the shoal can collectively find, capped by what is in
  // the water. It is always divided by competitive weight — an earlier version
  // only did this when demand exceeded supply, which in practice was almost
  // never, so selection ran linear and the offline tank drifted noticeably less
  // than the live one over the same period.
  var available = state.food.length;
  var pool = Math.min(total, available);
  var consumed = 0;

  for (var j = 0; j < creatures.length; j++) {
    var c = creatures[j];
    var got = weightTotal > 0 ? (weight[j] / weightTotal) * pool : 0;
    consumed += got;
    c.energy = Math.min(G.maxEnergy(c.genome),
                        c.energy + got * ECOLOGY.foodValue);
    c.energy -= G.metabolicCost(c.genome) * dd;
    c.age += dd;
  }

  var remove = Math.min(state.food.length, Math.round(consumed));
  state.food.length = state.food.length - remove;
}

function reproduceAndDie(state, rng) {
  var survivors = [];
  var newborns = [];
  for (var i = 0; i < state.creatures.length; i++) {
    var c = state.creatures[i];
    var g = c.genome;
    if (c.energy <= 0 || c.age > G.lifespan(g)) {
      state.deaths++;
      // Matter returns to the tank, same as in the live sim.
      if (state.food.length < LIMITS.maxFood) {
        state.food.push({ x: 0, y: 0, vx: 0, sink: FOOD_SINK, wobble: 0 });
      }
      continue;
    }
    if (c.energy > G.maxEnergy(g) * 0.7 && c.age > G.maturity(g) &&
        state.creatures.length + newborns.length < LIMITS.maxCreatures) {
      c.energy *= 0.5;
      var child = {
        genome: G.mutate(g, rng),
        x: c.x, y: c.y, vx: 0, vy: 0,
        energy: c.energy, age: 0,
        generation: c.generation + 1,
        phase: 0, id: 0
      };
      newborns.push(child);
      state.births++;
      if (child.generation > state.generation) state.generation = child.generation;
    }
    survivors.push(c);
  }
  state.creatures = survivors.concat(newborns);
}

function predate(state, night, dd, rng) {
  var alive = [];
  for (var i = 0; i < state.darters.length; i++) {
    var p = state.darters[i];
    p.age += dd;
    p.energy -= 46 * dd;

    // Kills per tank hour scale with how much prey there is to find.
    var attempts = 2.2 * dd * Math.min(1, state.creatures.length / 40);
    var kills = Math.floor(attempts) + (rng() < (attempts % 1) ? 1 : 0);
    for (var k = 0; k < kills && state.creatures.length > LIMITS.minCreatures; k++) {
      var idx = rng.int(state.creatures.length);
      var victim = state.creatures[idx];
      if (rng() < clamp(G.predationRisk(victim.genome, night) * 0.6, 0.05, 0.95)) {
        state.creatures.splice(idx, 1);
        state.deaths++;
        p.energy = Math.min(210, p.energy + 62);
      }
    }
    if (p.energy <= 0 || p.age > 14) { state.deaths++; continue; }
    alive.push(p);
  }
  state.darters = alive;
}

function scatter(state, rng) {
  for (var i = 0; i < state.creatures.length; i++) {
    var c = state.creatures[i];
    c.x = rng.range(40, state.w - 40);
    c.y = rng.range(40, state.h - 40);
    c.vx = rng.range(-14, 14);
    c.vy = rng.range(-14, 14);
    c.phase = rng() * Math.PI * 2;
    c.id = Math.floor(rng() * 1e9);
  }
  for (var j = 0; j < state.food.length; j++) {
    var f = state.food[j];
    f.x = rng.range(6, state.w - 6);
    f.y = rng.range(6, state.h - 6);
    f.vx = rng.range(-4, 4);
    // sink, not vy: food sinks, and vy is no longer read by the live sim.
    // Everything here is about to be stepped live, so a stale field name is
    // an undefined sink and an immediate NaN.
    f.sink = rng.range(FOOD_SINK * 0.55, FOOD_SINK * 1.45);
    f.restY = rng.range(state.h * FOOD_REST.lo, state.h * FOOD_REST.hi);
    f.wobble = rng() * Math.PI * 2;
    f.settled = 0;
    f.eaten = false;
  }
  for (var d = 0; d < state.darters.length; d++) {
    state.darters[d].x = rng.range(40, state.w - 40);
    state.darters[d].y = rng.range(40, state.h - 40);
  }
}

// ---------------------------------------------------------------------------
// Turning a genome diff into something worth reading in three seconds.
// ---------------------------------------------------------------------------

var HUE_NAMES = [
  [0.04, 'red'], [0.11, 'amber'], [0.19, 'gold'], [0.30, 'green'],
  [0.45, 'jade'], [0.55, 'teal'], [0.68, 'blue'], [0.80, 'violet'],
  [0.92, 'magenta'], [1.01, 'red']
];

function hueName(h) {
  for (var i = 0; i < HUE_NAMES.length; i++) {
    if (h <= HUE_NAMES[i][0]) return HUE_NAMES[i][1];
  }
  return 'red';
}

function hueDelta(a, b) {
  var d = b - a;
  if (d > 0.5) d -= 1; else if (d < -0.5) d += 1;
  return d;
}

function describe(before, after, trough, peak) {
  var out = [];
  var a = before.genome, b = after.genome;
  if (before.population === 0) return ['The tank was empty. Something drifted in.'];

  var cands = [
    { d: b.speed - a.speed, up: 'The shoal runs faster now.', down: 'They have slowed, and hold their ground.' },
    { d: b.size - a.size, up: 'They have grown heavier.', down: 'A smaller, quicker build has taken over.' },
    { d: b.sense - a.sense, up: 'They find food from further off.', down: 'They hunt closer to home.' },
    { d: b.social - a.social, up: 'They school more tightly than they did.', down: 'The shoal has broken into loners.' },
    { d: b.glow - a.glow, up: 'Bioluminescence is spreading.', down: 'The night has gone dark; the glow has been bred out.' }
  ];
  cands.sort(function (x, y) { return Math.abs(y.d) - Math.abs(x.d); });

  for (var i = 0; i < cands.length && out.length < 2; i++) {
    if (Math.abs(cands[i].d) < 0.04) continue;
    out.push(cands[i].d > 0 ? cands[i].up : cands[i].down);
  }

  var hd = hueDelta(a.hue, b.hue);
  if (Math.abs(hd) > 0.05 && out.length < 3) {
    out.push('The colour has drifted toward ' + hueName(b.hue) + '.');
  }

  if (trough <= LIMITS.minCreatures) {
    out.unshift('The population very nearly went out.');
  } else if (after.population > before.population * 1.6) {
    out.unshift('The tank is much fuller than you left it.');
  } else if (after.population < before.population * 0.6) {
    out.unshift('Numbers are well down on when you left.');
  }

  if (out.length === 0) out.push('Little has changed. The tank held steady.');
  return out.slice(0, 3);
}
