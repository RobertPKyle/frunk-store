import { createLoop, QUALITY } from './engine/loop.js';
import { createInput } from './engine/input.js';
import { autoResize } from './engine/canvas.js';
import { createStore } from './engine/save.js';
import { createIdle } from './engine/idle.js';
import { createSim } from './sim.js';
import { createRenderer } from './render.js';
import { createUI } from './ui.js';
import { catchUp, offlineDaysFor } from './offline.js';

var WORLD_HEIGHT = 1000;   // the tank is always this tall in sim units

var canvas = document.getElementById('tank');
var overlay = document.getElementById('overlay');

var store = createStore('tesla.terrarium', 3);
var saved = store.read();

// One seed, resolved once. Deriving it twice would mean the tank we simulate
// and the seed we persist disagree on every fresh start.
var seedValue = saved && typeof saved.seed === 'number'
  ? saved.seed
  : Math.floor(Math.random() * 1e9);
var sim = createSim(seedValue);

var renderer = createRenderer(canvas);
var fit = 1;
var viewW = 0, viewH = 0;

var idle = createIdle({
  delayMs: 20000,
  onEnterAmbient: function () {
    ui.setChrome(false);
    ui.hideAll();
  },
  onExitAmbient: function () {
    ui.setChrome(true);
  }
});

var ui = createUI(overlay, {
  onFeed: function () {
    idle.poke();
    // Scatter across the tank rather than at a point: this button is the
    // "I don't know where to touch" affordance.
    for (var i = 0; i < 4; i++) {
      sim.feed(sim.rng.range(80, sim.state.w - 80), sim.rng.range(80, sim.state.h * 0.7), 7);
    }
    sim.note('fed', 'You scattered food across the water.');
  },
  onDarter: function () {
    idle.poke();
    sim.addDarter();
    sim.note('darter', 'A darter slipped into the tank.');
  },
  onJournal: function () {
    idle.poke();
    ui.showJournal(sim.state.journal, sim.state);
  }
});

// ---------------------------------------------------------------------------
// Layout: the world's aspect always matches the viewport, so a single uniform
// scale maps between screen and sim coordinates in both directions.
// ---------------------------------------------------------------------------

autoResize(canvas, function (w, h, dpr) {
  viewW = w; viewH = h;
  var worldW = Math.round(WORLD_HEIGHT * (w / h));
  sim.resize(worldW, WORLD_HEIGHT);
  fit = h / WORLD_HEIGHT;
  renderer.resize(w, h, dpr);
});

function toWorld(px, py) {
  return { x: px / fit, y: py / fit };
}

// ---------------------------------------------------------------------------
// Load: replay the time we were gone before the first frame is ever drawn.
// ---------------------------------------------------------------------------

var awaySummary = null;

if (saved && saved.sim) {
  sim.deserialize(saved.sim);
  var hours = store.elapsedHours(saved);
  var days = offlineDaysFor(hours);
  if (days > 0.15) {
    var t0 = performance.now();
    awaySummary = catchUp(sim, days);
    var cost = Math.round(performance.now() - t0);
    if (window.console && window.console.info) {
      window.console.info('[terrarium] caught up ' + days.toFixed(1) +
                          ' tank days in ' + cost + 'ms');
    }
  }
} else {
  sim.seed(26);
  sim.note('start', 'The tank was filled.');
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

createInput(canvas, {
  onDown: function () {
    idle.poke();
    ui.setChrome(true);
    ui.hideAway();
  },
  onMove: function (p) {
    idle.poke();
    // Only a real stroke makes a current; a resting finger shouldn't stir
    // the water.
    var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (speed < 1.5) return;
    var w = toWorld(p.x, p.y);
    sim.pushCurrent(w.x, w.y, p.vx / fit, p.vy / fit);
  },
  onTap: function (p) {
    idle.poke();
    var w = toWorld(p.x, p.y);
    var hit = sim.creatureAt(w.x, w.y, 34 / fit);
    if (hit) {
      // Tapping an animal asks about it; tapping water feeds it.
      ui.showInspect(hit);
    } else {
      ui.hideInspect();
      sim.feed(w.x, w.y, 14);
    }
  },
  onLongPress: function (p) {
    idle.poke();
    var w = toWorld(p.x, p.y);
    var hit = sim.creatureAt(w.x, w.y, 60 / fit);
    if (hit) ui.showInspect(hit);
  }
});

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------

var clock = 0;

var loop = createLoop({
  // Explicit because it is a choice, not a fallback: the tank simulates at 30Hz
  // and is drawn every frame with interpolation. budgetMs is deliberately not
  // set — the loop derives it from the display's measured period.
  hz: 30,
  step: function (dt) {
    clock += dt;
    sim.step(dt);
    idle.update(dt);
  },
  draw: function (alpha, quality) {
    renderer.draw(sim, {
      quality: quality,
      time: clock,
      dt: 1 / 30,
      ambient: idle.blend()
    });
    if (!idle.isAmbient()) ui.updateReadout(sim);
  },
  onQuality: function (q) {
    renderer.applyQuality(q);
    if (window.console && window.console.info) {
      window.console.info('[terrarium] quality tier -> ' + q);
    }
  }
});

renderer.applyQuality(QUALITY.FULL);
ui.setChrome(true);
loop.start();

if (awaySummary) {
  ui.showAway(awaySummary);
  var obs = awaySummary.observations;
  for (var i = 0; i < obs.length; i++) sim.note('away', obs[i]);
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

store.autosave(function () {
  return { seed: seedValue, sim: sim.serialize() };
}, 10000);

// Exposed for the headless test harness; harmless in the car.
window.__terrarium = {
  sim: sim, loop: loop, store: store, idle: idle,
  awaySummary: awaySummary
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    // Registration only. An earlier version also reloaded the page when a new
    // worker took control, to pull a fresh build into the current session.
    // That is removed: it was measured as racy - one run recovered in 4s, an
    // identical run had not after 8 - and a page that reloads itself is
    // indistinguishable, from the driver's seat, from a page that is broken.
    // The worker is network-first now, so the current build arrives on the
    // request rather than needing the page thrown away and rebuilt.
    navigator.serviceWorker.register('/sw.js')['catch'](function () {
      // Offline caching is a bonus; never let it break the tank.
    });
  });
}
