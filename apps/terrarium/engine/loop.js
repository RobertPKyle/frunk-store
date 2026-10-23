// Fixed-timestep loop with automatic quality degradation.
//
// This is the most important file in the repo. Compute on the measured car is
// laptop-class, but MCU2 has never been measured and is far weaker, so the goal
// is never "run everything" — it's "hold the frame rate and shed detail quietly
// when we can't".
//
// Simulation rate and draw rate are deliberately decoupled: `step` runs at a
// fixed `hz` and `draw` runs every rAF with an interpolation alpha, so a 30Hz
// sim drawn at 60fps is the normal case, not a compromise.

export var QUALITY = { FULL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

// Bounds on the frame period we will aim at. Above 60Hz we stop chasing the
// display — there is no benefit and it only tightens the budget on the machine
// that least needs it. Below 30Hz we stop following it *down*, because a loop
// that adopts the rate it is currently achieving would raise its own ceiling
// every time it fell behind and never shed anything. 30fps is the floor the
// Idle Beauty contract asks for.
var PERIOD_MIN_MS = 1000 / 60;
var PERIOD_MAX_MS = 1000 / 30;
var PERIOD_SAMPLES = 30;
var BUDGET_FRACTION = 0.8;

// How long to ignore before the ladder is allowed to move at all. Page load,
// first layout and any build-once offscreen buffers land here, and they are not
// representative of steady state. Without this the loop can shed a tier or two
// on startup cost alone and then have to earn them back.
//
// Both this and the post-change cooldown are wall-clock, not frame counts. A
// frame count means something entirely different at 60fps and at 6fps — 90
// frames is the intended three seconds on a healthy machine and sixteen on a
// struggling one, so the ladder reacts slowest precisely where it is needed
// most.
var WARMUP_MS = 2000;
var COOLDOWN_MS = 3000;

// How long a measured per-tier cost is trusted. Tier costs are what stop the
// ladder from climbing back into a tier it cannot afford, but conditions do
// change — a population crash, night falling, the tab regaining focus — so an
// estimate eventually expires and the tier is retried once.
var TIER_ESTIMATE_TTL_MS = 300000;

export function createLoop(opts) {
  var step = opts.step;                       // step(dt) — fixed dt, in seconds
  var draw = opts.draw;                       // draw(alpha, quality)
  var onQuality = opts.onQuality;             // optional notification
  var hz = opts.hz || 30;                     // simulation rate
  var dt = 1 / hz;

  // The per-frame ceiling, in milliseconds of *work* — not of elapsed time.
  //
  // There is no measured constant to put here. The car reported a frame
  // *interval* of 16.6ms, which is exactly vsync: it says the workload fit
  // inside a 60fps frame, not how much of one it used. So instead of guessing,
  // derive the ceiling from the display's own period once we have seen enough
  // frames to know it. An explicit opts.budgetMs overrides and disables the
  // measurement.
  var budgetOverride = opts.budgetMs || 0;
  var periodMs = PERIOD_MIN_MS;
  var periodSamples = [];
  var budgetMs = budgetOverride || periodMs * BUDGET_FRACTION;

  var quality = QUALITY.FULL;
  var accumulator = 0;
  var last = 0;
  var running = false;
  var raf = 0;

  // Rolling window of frame costs. We only move between tiers on sustained
  // evidence — a single slow frame is usually GC or a tab switch, not a trend.
  var samples = new Float32Array(30);
  var sampleAt = 0;
  var sampleCount = 0;
  var cooldownUntil = 0;

  // What each tier actually cost, last time we were in it, and when we learned
  // it. 0 means never measured. This is what makes the ladder stable: headroom
  // at the current tier says nothing about whether the tier above fits, and in
  // Terrarium the gap between them is roughly twentyfold.
  var tierCost = [0, 0, 0, 0];
  var tierCostAt = [0, 0, 0, 0];
  var warmUntil = 0;

  var stats = { fps: 0, frameMs: 0, medianMs: 0, quality: quality, steps: 0,
                budgetMs: budgetMs, periodMs: periodMs };
  var fpsAccum = 0, fpsFrames = 0;

  // Estimate the display's frame period from rAF deltas, once, over the first
  // PERIOD_SAMPLES plausible frames. Implausible intervals are discarded rather
  // than clamped: a backgrounded tab, a GC pause or a resize would otherwise
  // drag the median up and hand us a budget that never sheds.
  function measurePeriod(intervalMs) {
    if (budgetOverride) return;
    if (periodSamples.length >= PERIOD_SAMPLES) return;
    if (!(intervalMs > 1 && intervalMs < 100)) return;

    periodSamples.push(intervalMs);
    if (periodSamples.length < PERIOD_SAMPLES) return;

    var sorted = periodSamples.slice().sort(function (a, b) { return a - b; });
    var m = sorted[sorted.length >> 1];
    periodMs = Math.max(PERIOD_MIN_MS, Math.min(PERIOD_MAX_MS, m));
    budgetMs = periodMs * BUDGET_FRACTION;
    stats.periodMs = periodMs;
    stats.budgetMs = budgetMs;
  }

  function median() {
    var n = Math.min(sampleCount, samples.length);
    if (n === 0) return 0;
    var copy = Array.prototype.slice.call(samples, 0, n);
    copy.sort(function (a, b) { return a - b; });
    return copy[n >> 1];
  }

  function setQuality(q) {
    if (q === quality) return;
    quality = q;
    stats.quality = q;
    sampleCount = 0;
    sampleAt = 0;
    cooldownUntil = performance.now() + COOLDOWN_MS;
    if (onQuality) onQuality(q);
  }

  // Would the tier above fit? Headroom where we are is not evidence about where
  // we would be going: a tier that looks affordable from underneath can blow the
  // budget the instant we enter it, shed again, and look affordable again. That
  // flap is worse than simply staying low, because every cycle spends a second
  // at exactly the frame rate the ladder exists to prevent. So climb only into
  // a tier we have either never tried, or measured and found affordable.
  function tierFits(q) {
    var c = tierCost[q];
    if (!c) return true;                                        // never tried
    if (performance.now() - tierCostAt[q] > TIER_ESTIMATE_TTL_MS) return true;
    return c <= budgetMs;
  }

  function assess() {
    var now = performance.now();
    if (now < warmUntil) return;
    if (now < cooldownUntil) return;
    if (sampleCount < samples.length) return;

    var m = median();
    stats.medianMs = m;
    tierCost[quality] = m;
    tierCostAt[quality] = now;

    if (m > budgetMs && quality < QUALITY.LOW) {
      setQuality(quality + 1);
    } else if (m < budgetMs * 0.55 && quality > QUALITY.FULL && tierFits(quality - 1)) {
      // Real headroom here, and no evidence that the tier above cannot afford it.
      setQuality(quality - 1);
    }
  }

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);

    var intervalMs = now - last;
    var elapsed = intervalMs / 1000;
    last = now;
    // A long gap means the tab was backgrounded. Don't try to catch up on
    // thousands of steps — just resume.
    if (elapsed > 0.5) elapsed = dt;

    measurePeriod(intervalMs);

    var t0 = performance.now();

    accumulator += elapsed;
    var steps = 0;
    while (accumulator >= dt && steps < 5) {
      step(dt);
      accumulator -= dt;
      steps++;
    }
    if (accumulator > dt * 5) accumulator = 0;
    stats.steps = steps;

    draw(accumulator / dt, quality);

    var cost = performance.now() - t0;
    stats.frameMs = cost;
    samples[sampleAt] = cost;
    sampleAt = (sampleAt + 1) % samples.length;
    if (sampleCount < samples.length) sampleCount++;
    assess();

    fpsAccum += elapsed; fpsFrames++;
    if (fpsAccum >= 0.5) {
      stats.fps = fpsFrames / fpsAccum;
      fpsAccum = 0; fpsFrames = 0;
    }
  }

  return {
    start: function () {
      if (running) return;
      running = true;
      last = performance.now();
      warmUntil = last + WARMUP_MS;   // a resume is a cold start for frame costs too
      cooldownUntil = 0;
      raf = requestAnimationFrame(frame);
    },
    stop: function () {
      running = false;
      cancelAnimationFrame(raf);
    },
    stats: stats,
    quality: function () { return quality; },
    budget: function () { return budgetMs; },
    forceQuality: setQuality
  };
}
