// The Idle Beauty contract, implemented once for all twelve titles.
//
// Untouched, a title drifts into a self-playing ambient mode that is worth
// looking at from the passenger seat. The first finger down hands control back
// immediately — there is never a menu, a pause screen, or a "press start"
// between the person and the thing.

export function createIdle(opts) {
  var delayMs = opts.delayMs || 20000;
  var fadeSeconds = opts.fadeSeconds || 2.5;
  var onEnter = opts.onEnterAmbient;
  var onExit = opts.onExitAmbient;

  var lastActivity = performance.now();
  var ambient = false;
  // 0 = fully interactive, 1 = fully ambient. Everything visual should ease on
  // this rather than snapping, or the transition reads as a glitch.
  var blend = 0;

  function poke() {
    lastActivity = performance.now();
    if (ambient) {
      ambient = false;
      if (onExit) onExit();
    }
  }

  function update(dt) {
    if (!ambient && performance.now() - lastActivity > delayMs) {
      ambient = true;
      if (onEnter) onEnter();
    }
    var target = ambient ? 1 : 0;
    var rate = dt / fadeSeconds;
    // Return to interactive faster than we drift away from it: being ignored
    // should be gradual, being touched should feel instant.
    if (target > blend) blend = Math.min(target, blend + rate);
    else blend = Math.max(target, blend - rate * 3);
  }

  return {
    poke: poke,
    update: update,
    isAmbient: function () { return ambient; },
    blend: function () { return blend; },
    idleFor: function () { return performance.now() - lastActivity; }
  };
}
