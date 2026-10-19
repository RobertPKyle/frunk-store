// Rendering. The brief is "worth looking at from the passenger seat", on a CPU
// that is laptop-class in the car we measured and an unmeasured Intel Atom in
// half the fleet — so almost everything here is about buying atmosphere
// cheaply: cached gradients, pre-tinted glow sprites, and a quarter-resolution
// bloom pass that does most of the night-time work.

import { createBuffer, glowSprite } from './engine/canvas.js';
import { QUALITY } from './engine/loop.js';
import { clamp, lerp } from './engine/rng.js';
import * as G from './genome.js';
import { buildReef, LAYERS, PAD } from './reef.js';

var HUE_BUCKETS = 12;

export function createRenderer(canvas) {
  var ctx = canvas.getContext('2d', { alpha: false });
  var W = 0, H = 0, DPR = 1;

  var bgCache = null, bgKey = -1, bgSeed = -1;
  var vignette = null;
  var glowBuf = null, glowCtx = null, glowScale = 0.25;
  var bubbles = [];
  var reef = null, reefSeed = -1;
  var creatureGlow = [];
  var darterGlow = null;

  // Pre-tinted glow sprites, one per hue bucket. Tinting at draw time would
  // mean a createRadialGradient per creature per frame; this is one blit.
  function buildSprites() {
    creatureGlow = [];
    for (var i = 0; i < HUE_BUCKETS; i++) {
      var rgb = hslToRgb(i / HUE_BUCKETS, 0.75, 0.6);
      creatureGlow.push(glowSprite(26, rgb[0], rgb[1], rgb[2]));
    }
    darterGlow = glowSprite(30, 255, 120, 120);
  }

  // These were called snow and fell, which is what marine snow does - but they
  // are drawn as round pale discs, and a round pale disc in water is a bubble.
  // Rising is what the eye expects of them, so they rise.
  //
  // The two layers are depth: small ones are further off, so they are fainter
  // and slower. That parallax happens to be right for bubbles too - a bigger
  // bubble displaces more and climbs faster.
  function buildBubbles(w, h) {
    bubbles = [];
    for (var layer = 0; layer < 2; layer++) {
      var count = layer === 0 ? 70 : 45;
      var arr = [];
      for (var i = 0; i < count; i++) {
        arr.push({
          x: Math.random() * w,
          // Spread over the full height at startup so the screen is not empty
          // for the first several seconds while the column fills.
          y: Math.random() * h,
          r: (layer === 0 ? 0.7 : 1.5) + Math.random() * (layer === 0 ? 0.8 : 1.4),
          speed: (layer === 0 ? 5 : 11) + Math.random() * 7,
          drift: Math.random() * Math.PI * 2,
          // Own rate and amplitude. A shared wobble clock makes every bubble
          // at a given depth sway in step, which reads as a single sheet of
          // them rather than as many separate ones.
          driftRate: 0.3 + Math.random() * 0.55,
          driftAmp: 3 + Math.random() * 5,
          alpha: layer === 0 ? 0.16 : 0.26
        });
      }
      bubbles.push(arr);
    }
  }

  function buildVignette(w, h) {
    vignette = createBuffer(w, h);
    var c = vignette.getContext('2d');
    var g = c.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.24,
                                   w / 2, h * 0.5, Math.max(w, h) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.65, 'rgba(0,0,0,0.28)');
    g.addColorStop(1, 'rgba(0,0,0,0.72)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }

  function resize(w, h, dpr) {
    W = w; H = h; DPR = dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bgCache = null; bgKey = -1;
    buildBubbles(w, h);
    buildVignette(w, h);
    reef = null;   // rebuilt on the next draw, at the new size
    if (creatureGlow.length === 0) buildSprites();
    setGlowScale(glowScale);
  }

  function setGlowScale(s) {
    glowScale = s;
    if (s <= 0) { glowBuf = null; glowCtx = null; return; }
    glowBuf = createBuffer(Math.max(1, W * s), Math.max(1, H * s));
    glowCtx = glowBuf.getContext('2d');
  }

  // Water colour by time of day. Cached in 24 buckets — a fresh linear gradient
  // every frame is one of the easiest ways to waste a frame budget.
  function background(light, seedValue) {
    var key = Math.round(light * 23);
    if (bgCache && bgKey === key && bgSeed === seedValue) return bgCache;
    var t = key / 23;
    bgCache = createBuffer(W, H);
    var c = bgCache.getContext('2d');
    var g = c.createLinearGradient(0, 0, 0, H);
    // Blue-violet rather than teal, and brighter at the surface: a lit reef
    // photographs as saturated blue shading to indigo, not as green water.
    g.addColorStop(0, rgb(lerp(8, 34, t), lerp(20, 116, t), lerp(52, 196, t)));
    g.addColorStop(0.42, rgb(lerp(6, 20, t), lerp(14, 70, t), lerp(40, 148, t)));
    g.addColorStop(1, rgb(lerp(2, 8, t), lerp(5, 24, t), lerp(18, 62, t)));
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);

    // The far reef is baked in rather than blitted. It is haze - its parallax
    // factor is 0.25, so it barely moves - and folding it into a buffer that
    // is already composited once per frame makes it cost nothing per frame
    // instead of a third of the reef's whole budget.
    if (reef && reef[0]) {
      c.globalAlpha = clamp(0.34 + t * 0.66, 0.34, 1);
      c.drawImage(reef[0].canvas, PAD, PAD, W, H, 0, 0, W, H);
      c.globalAlpha = 1;
    }

    bgKey = key;
    bgSeed = seedValue;
    return bgCache;
  }

  function drawCaustics(time, light) {
    if (light < 0.18) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.05 + light * 0.11;
    for (var i = 0; i < 5; i++) {
      var phase = time * 0.11 + i * 1.7;
      var x = (i + 0.5) / 5 * W + Math.sin(phase) * W * 0.11;
      var spread = W * (0.055 + 0.02 * Math.sin(phase * 0.7));
      var g = ctx.createLinearGradient(x, 0, x + Math.sin(phase) * 90, H * 0.85);
      g.addColorStop(0, 'rgba(150,225,255,0.55)');
      g.addColorStop(0.5, 'rgba(120,200,240,0.16)');
      g.addColorStop(1, 'rgba(80,160,210,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - spread * 0.35, 0);
      ctx.lineTo(x + spread * 0.35, 0);
      ctx.lineTo(x + spread * 1.5 + Math.sin(phase) * 70, H * 0.9);
      ctx.lineTo(x - spread * 1.5 + Math.sin(phase) * 70, H * 0.9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBubbles(dt, quality) {
    var layers = quality >= QUALITY.MEDIUM ? 1 : 2;
    if (quality >= QUALITY.LOW) return;
    ctx.save();
    for (var l = 0; l < layers; l++) {
      var arr = bubbles[l];
      for (var i = 0; i < arr.length; i++) {
        var p = arr[i];
        p.y -= p.speed * dt;
        p.drift += dt * p.driftRate;
        p.x += Math.sin(p.drift) * p.driftAmp * dt;
        // Off the top: reappear below the floor, so it climbs up out of the
        // near reef rather than materialising in open water. This layer is
        // drawn last, over the near reef, which is what sells that.
        if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
        if (p.x < -4) p.x = W + 4; else if (p.x > W + 4) p.x = -4;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = '#cfeaff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawCreature(c, night) {
    var g = c.genome;
    var r = G.radius(g);
    var angle = Math.atan2(c.vy, c.vx);
    var speed = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
    var vitality = clamp(c.energy / G.maxEnergy(g), 0.12, 1);
    // Juveniles are drawn smaller so a nursery of newborns reads at a glance.
    var youth = clamp(c.age / Math.max(0.001, G.maturity(g)), 0.45, 1);
    var scale = r * youth;

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(angle);

    var lightness = night ? 42 + g.glow * 26 : 50 + vitality * 14;
    var sat = 48 + vitality * 30;
    var hue = Math.round(g.hue * 360);
    var body = 'hsl(' + hue + ',' + sat + '%,' + lightness + '%)';

    // Tail, wagging at a rate driven by actual speed.
    var wag = Math.sin(c.phase * 2.2) * (0.35 + Math.min(speed / 90, 1) * 0.55);
    ctx.beginPath();
    ctx.moveTo(-scale * 1.1, 0);
    ctx.quadraticCurveTo(-scale * 2.3, wag * scale * 1.5,
                         -scale * 3.0, wag * scale * 2.4);
    ctx.quadraticCurveTo(-scale * 2.1, wag * scale * 0.6, -scale * 1.1, 0);
    ctx.fillStyle = body;
    ctx.globalAlpha = 0.85;
    ctx.fill();

    // Body.
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, scale * 1.95, scale * 0.92, 0, 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.fill();

    // A dorsal highlight, so they read as three-dimensional rather than as dots.
    ctx.globalAlpha = 0.32;
    ctx.beginPath();
    ctx.ellipse(scale * 0.25, -scale * 0.32, scale * 1.1, scale * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'hsl(' + hue + ',80%,82%)';
    ctx.fill();

    // Eye.
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(scale * 1.15, -scale * 0.18, Math.max(0.8, scale * 0.22), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6,14,20,0.85)';
    ctx.fill();

    ctx.restore();
  }

  function drawDarter(p) {
    var angle = Math.atan2(p.vy, p.vx);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    var s = 13;
    var wag = Math.sin(p.phase * 2.6) * 0.6;
    ctx.beginPath();
    ctx.moveTo(-s * 1.0, 0);
    ctx.quadraticCurveTo(-s * 2.2, wag * s * 1.5, -s * 2.9, wag * s * 2.2);
    ctx.quadraticCurveTo(-s * 2.0, wag * s * 0.5, -s * 1.0, 0);
    ctx.fillStyle = 'rgba(84,26,38,0.9)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 2.1, s * 0.72, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#5d1c26';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 1.3, -s * 0.16, s * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd9d9';
    ctx.fill();
    ctx.restore();
  }

  // Big, slow and nearly unlit. A darter is a red dart you notice immediately;
  // a lurker should register as a shape the light does not reach, which is why
  // it stays dark against dark rather than being given a colour of its own.
  //
  // What it was: an ellipse, a wedge for a tail, and a dot for an eye. That
  // reads as a blob at a glance and never resolves into an animal however long
  // you watch it. What makes a fish legible is not colour, it is the outline -
  // a pointed snout, a deep belly, a narrow wrist before the tail, and fins.
  //
  // So the body is one continuous curve, it bends along its whole length while
  // it swims rather than pivoting a rigid ellipse behind a flapping wedge, and
  // the tail is forked. It is still nearly black: the only things added to the
  // palette are a gradient from spine to belly, which is what gives it volume,
  // and the cold rim along the back that says it is a solid body rather than a
  // hole punched in the water. The eye is still the one bright thing on it.
  //
  // There is at most one lurker in the tank, ever (LIMITS.maxLurkers), so this
  // is the one animal that can afford an outline instead of a primitive.
  var LURKER_S = 34;
  var lurkerFill = null;

  function bodyFill() {
    if (lurkerFill) return lurkerFill;
    var s = LURKER_S;
    // Built once in the fish's own coordinates. A canvas gradient resolves its
    // coordinates against the transform in force when it is filled, so the one
    // object stays correct wherever the fish has swum to.
    lurkerFill = ctx.createLinearGradient(0, -s * 1.05, 0, s * 1.05);
    lurkerFill.addColorStop(0, '#05070e');     // the spine, unlit
    lurkerFill.addColorStop(0.45, '#0b0e1a');
    lurkerFill.addColorStop(1, '#161d2e');     // the belly, catching a little
    return lurkerFill;
  }

  function drawLurker(L) {
    var angle = Math.atan2(L.vy, L.vx);
    var s = LURKER_S;
    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.rotate(angle);

    // One travelling wave down the body, sampled at three stations. A real fish
    // is a wave, not a hinge: the head barely moves, the wrist swings, the tail
    // swings furthest and latest. The phase offsets are what make it look like
    // it is swimming rather than being waggled.
    var wag = Math.sin(L.phase * 1.1) * 0.42;
    var wrist = Math.sin(L.phase * 1.1 - 0.55) * 0.42 * s * 0.55;
    var tail = wag * s * 2.15;
    var mid = Math.sin(L.phase * 1.1 - 1.1) * 0.42 * s * 0.16;

    // ---- behind the body ----------------------------------------------------
    ctx.fillStyle = 'rgba(8,10,20,0.78)';

    // Caudal fin, forked. The middle control point pulls back toward the wrist,
    // which is what opens the notch between the two lobes.
    ctx.beginPath();
    ctx.moveTo(-s * 1.30, wrist);
    ctx.quadraticCurveTo(-s * 2.15, wrist * 0.5 + tail * 0.30 - s * 0.48,
                         -s * 3.30, tail - s * 0.88);
    // Back toward the wrist before going out again: that is the notch. Too
    // shallow and it is one wide paddle; too deep and it is a guppy, which is
    // the wrong animal for something this size.
    ctx.quadraticCurveTo(-s * 2.30, tail * 0.45 + wrist * 0.3, -s * 3.24, tail + s * 0.86);
    ctx.quadraticCurveTo(-s * 2.15, wrist * 0.5 + tail * 0.30 + s * 0.48,
                         -s * 1.30, wrist);
    ctx.fill();

    // Dorsal fin. A long root that follows the back and a trailing edge swept
    // toward the tail - a fin is a sail raked backwards, and drawn as a rounded
    // lump on top it reads as a hat instead.
    ctx.beginPath();
    ctx.moveTo(s * 0.88, -s * 0.58);
    ctx.quadraticCurveTo(s * 0.36, -s * 1.16, -s * 0.20, -s * 1.24);
    ctx.quadraticCurveTo(-s * 0.58, -s * 1.00, -s * 0.86, -s * 0.48 + mid);
    // The root runs back inside the body outline, so the fin grows out of the
    // back instead of sitting on it.
    ctx.quadraticCurveTo(-s * 0.10, -s * 0.66 + mid, s * 0.88, -s * 0.58);
    ctx.fill();

    // Anal fin: the same shape underneath, smaller, and it is what stops the
    // underside being a bare curve from belly to tail.
    ctx.beginPath();
    ctx.moveTo(-s * 0.32, s * 0.62 + mid);
    ctx.quadraticCurveTo(-s * 0.58, s * 1.14, -s * 0.98, s * 1.06 + wrist * 0.4);
    ctx.quadraticCurveTo(-s * 1.10, s * 0.76 + wrist * 0.4, -s * 1.18, s * 0.42 + wrist * 0.6);
    ctx.quadraticCurveTo(-s * 0.78, s * 0.70, -s * 0.32, s * 0.62 + mid);
    ctx.fill();

    // ---- the body -----------------------------------------------------------
    ctx.beginPath();
    ctx.moveTo(s * 2.35, mid * 0.3);
    // over the head, along the back, into the wrist
    ctx.bezierCurveTo(s * 1.55, -s * 0.70, s * 0.55, -s * 0.98, -s * 0.35, -s * 0.78 + mid);
    ctx.bezierCurveTo(-s * 0.88, -s * 0.64, -s * 1.10, -s * 0.34, -s * 1.32, wrist - s * 0.17);
    // and back along the belly to the snout
    ctx.bezierCurveTo(-s * 1.10, wrist + s * 0.34, -s * 0.88, s * 0.70, -s * 0.35, s * 0.82 + mid);
    ctx.bezierCurveTo(s * 0.60, s * 0.94, s * 1.62, s * 0.58, s * 2.35, mid * 0.3);
    ctx.closePath();
    ctx.fillStyle = bodyFill();
    ctx.fill();

    // The cold rim, following the back it actually has rather than a separate
    // ellipse floating above it.
    ctx.beginPath();
    ctx.moveTo(s * 2.05, -s * 0.28);
    ctx.bezierCurveTo(s * 1.55, -s * 0.70, s * 0.55, -s * 0.98, -s * 0.35, -s * 0.78 + mid);
    ctx.bezierCurveTo(-s * 0.88, -s * 0.64, -s * 1.10, -s * 0.34, -s * 1.32, wrist - s * 0.17);
    ctx.strokeStyle = 'rgba(127,176,216,0.30)';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Gill cover: one stroke, and the head stops being a nose cone.
    ctx.beginPath();
    ctx.moveTo(s * 1.18, -s * 0.54);
    ctx.quadraticCurveTo(s * 0.90, 0, s * 1.14, s * 0.50);
    ctx.strokeStyle = 'rgba(127,176,216,0.16)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Pectoral fin, on the near side and in front of the body, sculling at its
    // own rate. Nothing else in the tank moves at two speeds at once.
    var pec = Math.sin(L.phase * 2.3) * 0.30;
    ctx.beginPath();
    ctx.moveTo(s * 1.10, s * 0.12);
    ctx.quadraticCurveTo(s * 0.72, s * 0.80 + pec * s * 0.34,
                         s * 0.22, s * 0.94 + pec * s * 0.46);
    // The return curve hugs the leading edge, so it is a slender blade rather
    // than the opaque lozenge it was.
    ctx.quadraticCurveTo(s * 0.80, s * 0.40, s * 1.10, s * 0.12);
    ctx.fillStyle = 'rgba(6,8,16,0.72)';
    ctx.fill();

    // ---- the one bright thing ----------------------------------------------
    ctx.beginPath();
    ctx.arc(s * 1.62, -s * 0.20, s * 0.155, 0, Math.PI * 2);
    ctx.fillStyle = '#01030a';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 1.62, -s * 0.20, s * 0.092, 0, Math.PI * 2);
    ctx.fillStyle = '#b9d6ef';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 1.655, -s * 0.235, s * 0.034, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // The mouth. One short line, and the blunt end becomes a head facing
    // somewhere.
    ctx.beginPath();
    ctx.moveTo(s * 2.30, mid * 0.3 + s * 0.10);
    ctx.quadraticCurveTo(s * 1.98, s * 0.30, s * 1.72, s * 0.34);
    ctx.strokeStyle = 'rgba(127,176,216,0.20)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  function drawGlowPass(state, night, quality, camera) {
    if (!glowCtx || quality >= QUALITY.MEDIUM) return;
    // Creature positions are in sim-world units; the glow buffer is a fraction
    // of the *screen*. Without the world->screen fit factor the bloom drifts
    // away from the animal casting it.
    var fit = Math.max(W / state.w, H / state.h);
    var s = glowScale * fit;
    glowCtx.setTransform(1, 0, 0, 1, 0, 0);
    glowCtx.clearRect(0, 0, glowBuf.width, glowBuf.height);
    glowCtx.globalCompositeOperation = 'lighter';

    // Food does not glow. It is food. Only the animals are bioluminescent, and
    // giving crumbs the same treatment made them compete with the creatures
    // for attention while costing a sprite blit each, every frame.
    var i, sprite;

    for (i = 0; i < state.creatures.length; i++) {
      var c = state.creatures[i];
      var intensity = night ? c.genome.glow : c.genome.glow * 0.28;
      if (intensity < 0.04) continue;
      var bucket = Math.min(HUE_BUCKETS - 1, Math.floor(c.genome.hue * HUE_BUCKETS));
      sprite = creatureGlow[bucket];
      var cs = sprite.width * glowScale * (0.5 + G.radius(c.genome) * 0.055);
      glowCtx.globalAlpha = clamp(intensity * 0.95, 0, 1);
      glowCtx.drawImage(sprite, c.x * s - cs / 2, c.y * s - cs / 2, cs, cs);
    }

    for (i = 0; i < state.darters.length; i++) {
      var d = state.darters[i];
      var ds = darterGlow.width * glowScale * 0.9;
      glowCtx.globalAlpha = 0.45;
      glowCtx.drawImage(darterGlow, d.x * s - ds / 2, d.y * s - ds / 2, ds, ds);
    }

    // Upscaling the low-res buffer is what turns hard sprites into soft bloom —
    // the interpolation is doing the blur for free.
    //
    // The buffer is in screen space, so it has to be composited under the same
    // ambient camera push as the world; otherwise the bloom slides off the
    // creatures again as soon as the screensaver starts drifting.
    ctx.save();
    ctx.translate(W / 2 + camera.panX, H / 2 + camera.panY);
    ctx.scale(camera.scale, camera.scale);
    ctx.translate(-W / 2, -H / 2);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = night ? 0.95 : 0.24;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(glowBuf, 0, 0, W, H);
    ctx.restore();
  }

  // One reef layer, pushed by its own share of the ambient camera. Distant
  // layers take less of the pan than near ones, which is the depth cue; the
  // creatures themselves sit between the mid and near layers.
  function drawReefLayer(index, camera, light) {
    if (!reef || !reef[index]) return;
    var layer = reef[index];
    var spec = LAYERS[index];
    // Parallax by moving the source window inside the oversized buffer, at
    // integer offsets, so this stays a 1:1 copy. Transforming the destination
    // instead would resample the whole buffer every frame - see PAD in reef.js
    // for what that cost when it was measured.
    var sx = clamp(Math.round(PAD - camera.panX * spec.parallax), 0, PAD * 2);
    var sy = clamp(Math.round(PAD - camera.panY * spec.parallax), 0, PAD * 2);

    // Skip the transparent rows above the reef. A full-screen composite costs
    // the same whether the source pixels are opaque or empty, and the reef
    // occupies well under half the frame, so this is most of the saving.
    var skip = Math.max(0, layer.top - sy);
    var rows = H - skip;
    if (rows <= 0) return;

    ctx.save();
    // The reef dims with the light like everything else, but never to black:
    // at night it is the silhouette that tells you the tank still has a shape.
    ctx.globalAlpha = clamp(0.34 + light * 0.66, 0.34, 1);
    ctx.drawImage(layer.canvas, sx, sy + skip, W, rows, 0, skip, W, rows);
    ctx.restore();
  }

  function drawFood(state, night) {
    ctx.save();
    ctx.fillStyle = night ? 'rgba(168,224,150,0.75)' : 'rgba(190,238,158,0.9)';
    for (var i = 0; i < state.food.length; i++) {
      var f = state.food[i];
      ctx.beginPath();
      ctx.arc(f.x, f.y, 1.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // -------------------------------------------------------------------------

  function draw(sim, opts) {
    var state = sim.state;
    var light = sim.light();
    var night = light < 0.35;
    var quality = opts.quality;
    var time = opts.time;
    var dt = opts.dt;
    var ambient = opts.ambient;   // 0..1 blend into screensaver mode

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // Built on first draw after a resize rather than in resize() itself: the
    // seed lives on the sim, which resize() has no reference to. Must happen
    // before background(), which bakes the far layer into its cache.
    if (!reef || reefSeed !== state.seed) {
      reef = buildReef(W, H, state.seed | 0);
      reefSeed = state.seed;
      bgCache = null;
    }

    ctx.drawImage(background(light, state.seed), 0, 0);

    // Ambient camera: a very slow Ken Burns push, so an untouched tank is never
    // a completely static frame.
    var scale = 1 + ambient * 0.06;
    var panX = Math.sin(time * 0.031) * W * 0.02 * ambient;
    var panY = Math.cos(time * 0.023) * H * 0.02 * ambient;
    var camera = { scale: scale, panX: panX, panY: panY };

    if (quality <= QUALITY.HIGH) drawCaustics(time, light);

    // Mid is the expensive layer - it covers about 40% of the frame against
    // near's 23% - so it is the one to shed, and the first rather than the
    // last. The original order had this backwards: it dropped near first,
    // which is both the cheapest layer and the only one holding the picture
    // down, leaving the pale far haze floating in mid-water with nothing
    // beneath it. That does not read as a degraded reef, it reads as a reef
    // in the wrong place.
    if (quality < QUALITY.MEDIUM) drawReefLayer(1, camera, light);

    ctx.save();
    ctx.translate(W / 2 + panX, H / 2 + panY);
    ctx.scale(scale, scale);
    ctx.translate(-state.w / 2, -state.h / 2);

    // World is drawn in sim coordinates; the canvas is scaled to fit it.
    var fit = Math.max(W / state.w, H / state.h);
    ctx.translate(state.w / 2, state.h / 2);
    ctx.scale(fit, fit);
    ctx.translate(-state.w / 2, -state.h / 2);

    drawFood(state, night);

    for (var i = 0; i < state.creatures.length; i++) drawCreature(state.creatures[i], night);
    for (var j = 0; j < state.darters.length; j++) drawDarter(state.darters[j]);
    // Drawn last of the animals: it is the largest thing in the tank and should
    // pass in front of what it is hunting.
    if (state.lurkers) {
      for (var k = 0; k < state.lurkers.length; k++) drawLurker(state.lurkers[k]);
    }

    ctx.restore();

    drawGlowPass(state, night, quality, camera);

    // In front of the animals: a fish passing behind the foreground shelf is
    // the strongest depth cue in the frame, and the dark mass along the bottom
    // is what makes the reef read as a floor rather than as something adrift.
    // Kept at every tier - at 23% of the frame it is the cheapest of the three
    // and the least worth losing. The far layer also survives everywhere,
    // because it is baked into the background buffer and costs nothing extra.
    drawReefLayer(2, camera, light);

    drawBubbles(dt, quality);

    ctx.save();
    ctx.globalAlpha = 0.55 + ambient * 0.3;
    ctx.drawImage(vignette, 0, 0);
    ctx.restore();

    // A faint cool wash after dark, to sell "this is night" beyond brightness.
    if (night) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = (0.35 - light) * 0.5;
      ctx.fillStyle = '#0a1e3c';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  function applyQuality(q) {
    if (q === QUALITY.FULL) setGlowScale(0.25);
    else if (q === QUALITY.HIGH) setGlowScale(0.125);
    else setGlowScale(0);
  }

  return {
    resize: resize,
    draw: draw,
    applyQuality: applyQuality,
    size: function () { return { w: W, h: H }; }
  };
}

function rgb(r, g, b) {
  return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
}

function hslToRgb(h, s, l) {
  var c = (1 - Math.abs(2 * l - 1)) * s;
  var x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  var m = l - c / 2;
  var r = 0, g = 0, b = 0;
  var seg = Math.floor(h * 6) % 6;
  if (seg === 0) { r = c; g = x; }
  else if (seg === 1) { r = x; g = c; }
  else if (seg === 2) { g = c; b = x; }
  else if (seg === 3) { g = x; b = c; }
  else if (seg === 4) { r = x; b = c; }
  else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
