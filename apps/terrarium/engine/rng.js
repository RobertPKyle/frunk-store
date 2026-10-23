// Seeded PRNG. Deterministic so offline catch-up can be tested and replayed.
// ES2019 target: the oldest cars we still support may run Chromium 79, which
// predates optional chaining and nullish coalescing. The car we measured runs
// Chromium 140 — the floor is for the fleet we have not measured, not for the
// one we have. See scripts/check-es2019.sh, which enforces it.

// mulberry32: small, fast, good enough for simulation noise.
export function makeRng(seed) {
  var a = seed >>> 0;
  var rng = function () {
    a = (a + 0x6d2b79f5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Box-Muller, one cached spare per generator.
  var spare = null;
  rng.normal = function () {
    if (spare !== null) {
      var s = spare;
      spare = null;
      return s;
    }
    var u = 0, v = 0, mag = 0;
    do {
      u = rng() * 2 - 1;
      v = rng() * 2 - 1;
      mag = u * u + v * v;
    } while (mag === 0 || mag >= 1);
    var scale = Math.sqrt((-2 * Math.log(mag)) / mag);
    spare = v * scale;
    return u * scale;
  };

  rng.range = function (lo, hi) { return lo + rng() * (hi - lo); };
  rng.int = function (n) { return Math.floor(rng() * n); };
  rng.pick = function (arr) { return arr[Math.floor(rng() * arr.length)]; };
  rng.chance = function (p) { return rng() < p; };
  rng.state = function () { return a; };
  rng.setState = function (s) { a = s >>> 0; spare = null; };

  return rng;
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
