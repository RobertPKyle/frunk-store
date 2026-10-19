// The genome, and every trade-off derived from it.
//
// This module is deliberately free of DOM and rendering concerns: both the live
// simulation and the offline catch-up model import it, which is what keeps
// "what happened while you were away" consistent with "what you'd have watched".
//
// There is no fitness function. Selection emerges from the cost web below —
// which is the whole reason the tank stays interesting. There is no single
// winning genome, because the optimum moves with food density, crowding, day
// length, and whether darters are in the water.

import { clamp, lerp } from './engine/rng.js';

export var GENES = ['speed', 'size', 'sense', 'social', 'glow', 'hue'];

// A tank day is the unit of biological time. See TIME in sim.js for how it maps
// onto real seconds while watching versus while away.
export var MUTATION_RATE = 0.045;
// Neutral drift, so lineages stay visible. Kept low on purpose: hue is a random
// walk, so its spread grows with the square root of the generation count, and at
// 0.07 a month away scattered the tank across a third of the colour wheel. The
// drift should be legible as "they have gone bluer", not as confetti.
export var HUE_MUTATION_RATE = 0.032;

export function randomGenome(rng) {
  return {
    speed: rng.range(0.25, 0.6),
    size: rng.range(0.25, 0.55),
    sense: rng.range(0.25, 0.6),
    social: rng.range(0.2, 0.7),
    glow: rng.range(0.05, 0.35),
    hue: rng()
  };
}

export function mutate(g, rng) {
  var child = {
    speed: clamp(g.speed + rng.normal() * MUTATION_RATE, 0.02, 1),
    size: clamp(g.size + rng.normal() * MUTATION_RATE, 0.05, 1),
    sense: clamp(g.sense + rng.normal() * MUTATION_RATE, 0.02, 1),
    social: clamp(g.social + rng.normal() * MUTATION_RATE, 0, 1),
    glow: clamp(g.glow + rng.normal() * MUTATION_RATE, 0, 1),
    // Hue wraps rather than clamping — colour space is a circle, and clamping
    // would pile every lineage up at red and green.
    hue: (g.hue + rng.normal() * HUE_MUTATION_RATE + 1) % 1
  };
  return child;
}

export function blend(a, b, t, rng) {
  var out = {};
  for (var i = 0; i < GENES.length; i++) {
    var k = GENES[i];
    if (k === 'hue') {
      // Shortest way around the colour wheel.
      var d = b.hue - a.hue;
      if (d > 0.5) d -= 1; else if (d < -0.5) d += 1;
      out.hue = (a.hue + d * t + 1) % 1;
    } else {
      out[k] = clamp(lerp(a[k], b[k], t), 0.02, 1);
    }
  }
  if (rng) return mutate(out, rng);
  return out;
}

// ---------------------------------------------------------------------------
// Derived traits. Every one of these is a lever with a matching cost below.
// ---------------------------------------------------------------------------

export function maxSpeed(g)     { return 18 + g.speed * 78; }            // px/s
export function radius(g)       { return 4.2 + g.size * 9.5; }           // px
export function senseRadius(g)  { return 26 + g.sense * 150; }           // px
export function maxEnergy(g)    { return 34 + 120 * g.size * g.size; }
export function maturity(g)     { return 0.35 + g.size * 0.5; }          // tank days
export function lifespan(g)     { return 5.5 + g.size * 7.5; }           // tank days

// Energy burned per tank day. The squared terms are what stop the tank from
// simply maximising every gene: speed is expensive to carry at size, and a wide
// sensory field costs more than a narrow one out of proportion to its reach.
export function metabolicCost(g) {
  // Schooling creatures draft in each other's wake and swim cheaper — a real
  // effect in fish, and the benefit that makes `social` worth carrying. The
  // counterweight is competition: a tight shoal grazes the same water, so high
  // `social` only pays where food is plentiful enough to share.
  var drafting = 1 - 0.22 * g.social;
  var locomotion = 22 * g.speed * g.speed * (0.35 + g.size) * (0.35 + g.size) * drafting;
  var perception = 9 * g.sense * g.sense;
  var luminance = 5 * g.glow;
  var upkeep = 9 + 7 * g.size;
  return upkeep + locomotion + perception + luminance;
}

// Chance multiplier of being caught by a darter. Big is safer, schooling is
// safer (dilution), and glowing at night is a liability — so bioluminescence
// only pays when there is nothing hunting.
export function predationRisk(g, isNight) {
  var bySize = 1.35 - 0.85 * g.size;
  var bySchool = 1.15 - 0.45 * g.social;
  var byGlow = isNight ? 1 + 0.9 * g.glow : 1;
  return Math.max(0.05, bySize * bySchool * byGlow);
}

// How effectively this creature converts available food into intake. Used
// directly by the offline model, and as the interception bonus when live.
// Glow's payoff. Producing light costs energy around the clock (see
// metabolicCost) and makes you conspicuous to darters after dark (see
// predationRisk) — but it also draws plankton in, widening the effective
// sensory field at night. So bioluminescence is worth carrying in a tank with
// no predators and a liability in one with them, and the night-time look of the
// aquarium is an evolved outcome rather than a decorative constant.
export function senseRadiusAt(g, isNight) {
  var base = senseRadius(g);
  return isNight ? base * (1 + 0.9 * g.glow) : base;
}

export function forageAbility(g, isNight) {
  var base = 0.35 + 0.75 * g.sense + 0.55 * g.speed;
  if (isNight) base *= 1 + 0.55 * g.glow;
  // Many eyes: a creature in a shoal finds food its neighbours found. This is
  // the mean-field version used by the offline model; the live simulation
  // applies it against the actual neighbour count in sim.steer().
  base *= 1 + 0.4 * g.social;
  return base;
}

export function meanGenome(creatures) {
  var out = { speed: 0, size: 0, sense: 0, social: 0, glow: 0, hue: 0 };
  if (creatures.length === 0) return out;
  // Hue averaged as a unit vector, or a shoal split across the red wrap point
  // would average to a cyan that nothing in the tank actually is.
  var hx = 0, hy = 0;
  for (var i = 0; i < creatures.length; i++) {
    var g = creatures[i].genome;
    out.speed += g.speed; out.size += g.size; out.sense += g.sense;
    out.social += g.social; out.glow += g.glow;
    hx += Math.cos(g.hue * Math.PI * 2);
    hy += Math.sin(g.hue * Math.PI * 2);
  }
  var n = creatures.length;
  out.speed /= n; out.size /= n; out.sense /= n; out.social /= n; out.glow /= n;
  out.hue = (Math.atan2(hy / n, hx / n) / (Math.PI * 2) + 1) % 1;
  return out;
}
