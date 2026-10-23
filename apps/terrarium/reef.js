// Reef structure: the tank was all open water, which reads as an aquarium
// rather than a reef. A real reef is mostly *structure* — the animals are the
// small bright things moving across a large dark mass.
//
// Everything here is drawn once into three offscreen buffers at resize and
// blitted per frame, so the whole reef costs three drawImage calls no matter
// how much detail is in it. That is the only reason the weak half of the fleet
// can afford this at all: complexity is paid for at build time, not per frame.
//
// Three depth bands, each parallaxing at its own rate under the ambient camera:
//
//   far   hazy silhouettes, low contrast, tinted toward the water colour
//   mid   the reef proper - coral heads, fans, luminous patches
//   near  a dark foreground shelf that the fish swim behind
//
// The shapes are seeded from the tank's own seed, so a given tank always grows
// the same reef and two tanks never look alike.

import { createBuffer } from './engine/canvas.js';
import { makeRng, lerp } from './engine/rng.js';

// Depth 0 = farthest. Parallax factor is how much of the camera's pan this
// layer takes: distant things move less, which is the whole depth cue.
export var LAYERS = [
  { name: 'far',  parallax: 0.25 },
  { name: 'mid',  parallax: 0.62 },
  { name: 'near', parallax: 1.15 }
];

// Buffers are built this much larger than the screen on every side, so the
// parallax offset can be applied by moving the *source* rectangle rather than
// by transforming the destination.
//
// This is the difference between the reef being affordable and not. A scaled
// or sub-pixel-translated drawImage of a full-screen buffer has to resample
// 2.3M pixels; three of those per frame measured at 278ms under the 6x throttle
// that approximates an MCU2, against a 16.6ms budget. Blitting a 1:1 sub-rect
// at integer offsets is a straight copy with no resampling, and costs a small
// fraction of that.
export var PAD = 72;

// A lumpy closed blob - brain coral, boulder coral, rock. Built by walking a
// circle and pushing each vertex out by layered noise, then closing it with
// quadratic segments so the outline stays organic rather than polygonal.
function blob(c, cx, cy, r, wobble, rng, squash) {
  var steps = 18;
  var pts = [];
  var seedA = rng() * 6.283, seedB = rng() * 6.283, seedC = rng() * 6.283;
  for (var i = 0; i < steps; i++) {
    var a = (i / steps) * Math.PI * 2;
    var n = Math.sin(a * 3 + seedA) * 0.5 +
            Math.sin(a * 5 + seedB) * 0.3 +
            Math.sin(a * 9 + seedC) * 0.2;
    var rr = r * (1 + n * wobble);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * (squash || 1)]);
  }
  c.beginPath();
  c.moveTo((pts[0][0] + pts[steps - 1][0]) / 2, (pts[0][1] + pts[steps - 1][1]) / 2);
  for (var j = 0; j < steps; j++) {
    var p = pts[j];
    var q = pts[(j + 1) % steps];
    c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  c.closePath();
}

// Branching coral - a recursive fan. Depth is capped low because the cost is
// exponential and past three levels it reads as noise anyway.
function branch(c, x, y, angle, len, width, depth, rng) {
  if (depth <= 0 || len < 3) return;
  var ex = x + Math.cos(angle) * len;
  var ey = y + Math.sin(angle) * len;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(x + Math.cos(angle - 0.3) * len * 0.5,
                     y + Math.sin(angle - 0.3) * len * 0.5, ex, ey);
  c.stroke();
  var n = rng() < 0.35 ? 2 : 3;
  for (var i = 0; i < n; i++) {
    var spread = (i - (n - 1) / 2) * (0.45 + rng() * 0.3);
    branch(c, ex, ey, angle + spread, len * (0.62 + rng() * 0.16),
           width * 0.70, depth - 1, rng);
  }
}

// Soft coral fingers - the pale upright clusters in the foreground of a reef
// photo. Cheap: a handful of tapered strokes from a common base.
function fingers(c, x, y, count, height, rng, colour) {
  c.strokeStyle = colour;
  c.lineCap = 'round';
  for (var i = 0; i < count; i++) {
    var lean = (rng() - 0.5) * 0.8;
    var h = height * (0.55 + rng() * 0.65);
    c.lineWidth = 2 + rng() * 4;
    c.beginPath();
    c.moveTo(x + (rng() - 0.5) * height * 0.5, y);
    c.quadraticCurveTo(x + lean * h * 0.4, y - h * 0.6,
                       x + lean * h, y - h);
    c.stroke();
  }
}

function shade(base, t, alpha) {
  return 'rgba(' + Math.round(base[0] * t) + ',' + Math.round(base[1] * t) +
         ',' + Math.round(base[2] * t) + ',' + (alpha === undefined ? 1 : alpha) + ')';
}

// Palettes per depth. Distant reef is pushed toward the water so it reads as
// haze rather than as a nearer object that happens to be dim.
var PALETTE = {
  far:  { rock: [46, 62, 118], accent: [78, 104, 168], glow: [120, 190, 230], alpha: 0.5 },
  mid:  { rock: [52, 40, 96],  accent: [150, 74, 150], glow: [90, 235, 205], alpha: 0.95 },
  near: { rock: [10, 12, 32],  accent: [58, 30, 74],   glow: [70, 205, 195], alpha: 1 }
};

// Coral colours sampled toward a reef photograph rather than derived from the
// rock tone: the point of a reef is that the structure itself is coloured, not
// just lit. Picked per mound so one reef carries several.
var CORAL = [
  [196, 92, 128],   // pink sea fan
  [214, 132, 64],   // orange encrusting
  [122, 196, 176],  // pale green brain coral
  [150, 96, 196],   // purple
  [92, 150, 210]    // blue-grey
];

function buildLayer(w, h, depth, rng) {
  var buf = createBuffer(w, h);
  var c = buf.getContext('2d');
  var spec = LAYERS[depth];
  var pal = PALETTE[spec.name];

  // Highest y that any shape reaches. Everything above it is transparent, and
  // blitting transparent rows still costs a per-pixel composite, so the
  // renderer uses this to blit only the part of the buffer with reef in it.
  // Tracked while drawing rather than by scanning the finished pixels: a
  // getImageData over a 2000x1300 buffer is a visible stall on an MCU2.
  var top = h;
  function reaches(y) { if (y < top) top = y; }

  // Skyline: the height of the reef mass across the frame. Far layers sit low
  // and flat, near layers rise high and jagged, which is what separates them
  // at a glance even before parallax moves.
  var baseline = h * (depth === 0 ? 0.64 : depth === 1 ? 0.75 : 0.90);
  var relief = h * (depth === 0 ? 0.09 : depth === 1 ? 0.14 : 0.10);

  // --- the mass itself -----------------------------------------------------
  // Many small forms, not a few big ones. A reef is built at the scale of a
  // boulder; oversized mounds read as a mountain range seen from a valley,
  // which is a completely different picture and not the one wanted here.
  var mounds = depth === 0 ? 16 : depth === 1 ? 22 : 14;
  c.globalAlpha = pal.alpha;
  for (var i = 0; i < mounds; i++) {
    var cx = (i / (mounds - 1)) * w + (rng() - 0.5) * w * 0.13;
    var r = (0.042 + rng() * 0.070) * w * (depth === 2 ? 1.25 : 1);
    // Squash varies per mound: uniformly flattened blobs read as dunes, and a
    // reef is built of boulders and columns as much as of mounds.
    var squash = 0.45 + rng() * 0.45;
    var cy = baseline + relief * (rng() - 0.5) + r * squash * 0.4;
    var t = 0.66 + rng() * 0.7;
    // Roughly a third of the mass is coloured coral rather than rock, tinted
    // toward the layer's rock tone so it still sits in the same water.
    var useCoral = depth < 2 && rng() < 0.36;
    if (useCoral) {
      var col = CORAL[Math.floor(rng() * CORAL.length)];
      c.fillStyle = 'rgba(' +
        Math.round(lerp(pal.rock[0], col[0], 0.55) * t) + ',' +
        Math.round(lerp(pal.rock[1], col[1], 0.55) * t) + ',' +
        Math.round(lerp(pal.rock[2], col[2], 0.55) * t) + ',1)';
    } else {
      c.fillStyle = shade(pal.rock, t);
    }
    blob(c, cx, cy, r, depth === 2 ? 0.26 : 0.22, rng, squash);
    c.fill();
    reaches(cy - r * squash * 1.4);
  }

  // Fills the gaps between mounds so no water shows through where there should
  // be solid reef. The top edge is a gradient, not a straight cut: a flat
  // fillRect here draws a hard horizontal line across the entire frame, which
  // is exactly as obvious as it sounds.
  var fillTop = baseline + relief * 0.35;
  var fade = c.createLinearGradient(0, fillTop, 0, fillTop + h * 0.10);
  fade.addColorStop(0, shade(pal.rock, 0.85, 0));
  fade.addColorStop(1, shade(pal.rock, 0.85));
  c.fillStyle = fade;
  c.fillRect(0, fillTop, w, h * 0.10);
  c.fillStyle = shade(pal.rock, 0.85);
  c.fillRect(0, fillTop + h * 0.10 - 1, w, h);

  // --- branching coral -----------------------------------------------------
  var fans = depth === 0 ? 7 : depth === 1 ? 16 : 7;
  for (var f = 0; f < fans; f++) {
    var fx = rng() * w;
    var fy = baseline + (rng() - 0.3) * relief + h * 0.04;
    c.globalAlpha = pal.alpha * (0.5 + rng() * 0.4);
    var fanCol = CORAL[Math.floor(rng() * CORAL.length)];
    c.strokeStyle = 'rgba(' +
      Math.round(lerp(pal.accent[0], fanCol[0], 0.6)) + ',' +
      Math.round(lerp(pal.accent[1], fanCol[1], 0.6)) + ',' +
      Math.round(lerp(pal.accent[2], fanCol[2], 0.6)) + ',1)';
    c.lineCap = 'round';
    var fanLen = h * (0.028 + rng() * 0.042);
    branch(c, fx, fy, -Math.PI / 2 + (rng() - 0.5) * 0.5, fanLen, 7 + rng() * 5, 3, rng);
    // Three levels at ~0.6 decay reach roughly 2x the first segment.
    reaches(fy - fanLen * 2.2);
  }

  // --- luminous patches ----------------------------------------------------
  // The cyan-green fluorescing coral is what makes a reef photo read as a reef
  // rather than as rocks. Additive, so it lifts whatever it sits on.
  var patches = depth === 0 ? 5 : depth === 1 ? 14 : 6;
  c.globalCompositeOperation = 'lighter';
  for (var p = 0; p < patches; p++) {
    var px = rng() * w;
    var py = baseline + (rng() - 0.2) * relief + h * 0.05;
    var pr = h * (0.018 + rng() * 0.045);
    var grad = c.createRadialGradient(px, py, 0, px, py, pr * 2.2);
    var hueShift = rng();
    var gr = Math.round(lerp(pal.glow[0], 200, hueShift * 0.5));
    var gg = Math.round(lerp(pal.glow[1], 250, hueShift * 0.3));
    var gb = Math.round(lerp(pal.glow[2], 170, hueShift * 0.5));
    grad.addColorStop(0, 'rgba(' + gr + ',' + gg + ',' + gb + ',' + (0.46 * pal.alpha) + ')');
    grad.addColorStop(0.45, 'rgba(' + gr + ',' + gg + ',' + gb + ',' + (0.16 * pal.alpha) + ')');
    grad.addColorStop(1, 'rgba(' + gr + ',' + gg + ',' + gb + ',0)');
    c.fillStyle = grad;
    c.beginPath();
    c.arc(px, py, pr * 2.2, 0, Math.PI * 2);
    c.fill();
    reaches(py - pr * 2.2);

    c.globalAlpha = 0.68 * pal.alpha;
    c.fillStyle = 'rgba(' + gr + ',' + gg + ',' + gb + ',0.6)';
    blob(c, px, py, pr, 0.35, rng, 0.7);
    c.fill();
    c.globalAlpha = pal.alpha;
  }
  c.globalCompositeOperation = 'source-over';

  // --- soft coral fingers, foreground only ---------------------------------
  if (depth >= 1) {
    var clusters = depth === 1 ? 9 : 10;
    for (var s = 0; s < clusters; s++) {
      c.globalAlpha = pal.alpha * (0.45 + rng() * 0.35);
      var fh = h * (0.05 + rng() * 0.06);
      fingers(c, rng() * w, baseline + relief * 0.7 + h * 0.07,
              4 + Math.floor(rng() * 5), fh, rng,
              shade(pal.accent, 1.1 + rng() * 0.5));
      reaches(baseline + relief * 0.7 + h * 0.07 - fh * 1.2);
    }
  }

  // --- rim light -----------------------------------------------------------
  // A faint lift along the top of the mass, suggesting light falling from the
  // surface. Without it the near layer reads as a flat black cut-out.
  c.globalAlpha = depth === 2 ? 0.16 : 0.10;
  c.globalCompositeOperation = 'lighter';
  // Fades in *and* out. A gradient that starts at full alpha has a hard edge at
  // its first stop, which reads as a ruled line across the tank.
  var rim = c.createLinearGradient(0, baseline - relief, 0, baseline + relief);
  rim.addColorStop(0, 'rgba(140,200,255,0)');
  rim.addColorStop(0.42, 'rgba(140,200,255,0.5)');
  rim.addColorStop(1, 'rgba(140,200,255,0)');
  c.fillStyle = rim;
  c.fillRect(0, baseline - relief, w, relief * 2);
  reaches(baseline - relief);

  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  return { canvas: buf, top: Math.max(0, Math.floor(top)) };
}

// Builds all three layers. `seedValue` ties the reef to the tank so it is
// stable across reloads; note the name - a bare `seed` would shadow badly if
// this file ever grew a local function of that name, which is how every tank
// once ended up sharing one RNG stream.
export function buildReef(w, h, seedValue) {
  var out = [];
  for (var i = 0; i < LAYERS.length; i++) {
    // A separate stream per layer, so changing the detail of one layer does
    // not reshuffle the others.
    var rng = makeRng((seedValue | 0) + i * 7919);
    out.push(buildLayer(w + PAD * 2, h + PAD * 2, i, rng));
  }
  return out;
}

export function reefHorizon(h) {
  // Where the mid-reef mass starts, in screen units. Used to keep food and
  // creature spawns from burying themselves in the rock.
  return h * 0.80;
}
