// DPR-aware canvas sizing and offscreen buffer helpers.
// The Tesla browser reports a desktop UA at 1920x1200 (Model 3/Y) or 2200x1300
// (Model S/X), and the browser window is not always fullscreen — so nothing here
// may assume a fixed size.

export function createBuffer(w, h) {
  var c = document.createElement('canvas');
  c.width = Math.max(1, Math.floor(w));
  c.height = Math.max(1, Math.floor(h));
  return c;
}

// Resizes a canvas to its CSS box at the given pixel ratio, and calls onResize
// with logical (CSS-pixel) dimensions whenever that box actually changes.
export function autoResize(canvas, onResize, maxRatio) {
  var cap = typeof maxRatio === 'number' ? maxRatio : 2;
  var last = { w: 0, h: 0, dpr: 0 };

  function apply() {
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width));
    var h = Math.max(1, Math.round(rect.height));
    // Cap DPR: on a 2200x1300 panel a ratio of 2 would mean pushing 11M pixels
    // through a CPU roughly 5x slower than a laptop.
    var dpr = Math.min(window.devicePixelRatio || 1, cap);

    if (w === last.w && h === last.h && dpr === last.dpr) return;
    last.w = w; last.h = h; last.dpr = dpr;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    onResize(w, h, dpr);
  }

  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
  // The browser chrome can collapse/expand without a resize event on some builds.
  if (typeof ResizeObserver === 'function') {
    var ro = new ResizeObserver(apply);
    ro.observe(canvas);
  }
  return apply;
}

// Cheap radial sprite, drawn once and blitted many times. Far faster than
// per-particle createRadialGradient on weak hardware.
export function glowSprite(radius, r, g, b) {
  var size = Math.max(2, Math.ceil(radius * 2));
  var c = createBuffer(size, size);
  var ctx = c.getContext('2d');
  var grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',1)');
  grad.addColorStop(0.4, 'rgba(' + r + ',' + g + ',' + b + ',0.35)');
  grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return c;
}
