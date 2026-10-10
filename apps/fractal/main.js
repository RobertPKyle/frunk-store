// Fractal Explorer: drag to pan, pinch / wheel / double-tap to zoom.
// Rendering runs in fractal.wasm (f64x2 SIMD). When the page is
// cross-origin isolated, a pool of workers share one WebAssembly.Memory and
// split the rows; otherwise a single instance renders on the main thread.

const OUT_BYTES = 16 * 1024 * 1024;          // must match fractal.wat
const MAX_PIXELS = OUT_BYTES / 4;
const PALETTE_OFFSET = OUT_BYTES;
const PAGES = 257;
const ITER_STEPS = [128, 256, 512, 1024, 2048];
const HOME = { cx: -0.6, cy: 0, span: 3.4 };  // span = complex width shown

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const info = document.getElementById('info');
const off = document.createElement('canvas');
const offCtx = off.getContext('2d');

const view = { cx: HOME.cx, cy: HOME.cy, scale: 1, maxIter: 256 }; // scale = complex units per CSS px
let engine;

function fail(msg) {
  const el = document.getElementById('error');
  el.hidden = false;
  el.textContent = msg;
  info.hidden = true;
}

function writePalette(memory) {
  const pal = new Uint32Array(memory.buffer, PALETTE_OFFSET, 256);
  for (let i = 0; i < 256; i++) {
    const t = (i / 64) % 1;
    const fade = Math.min(1, i / 10);         // dark near the outer escape bands
    const ch = d => Math.round(255 * fade * (0.5 + 0.5 * Math.cos(2 * Math.PI * (t + d))));
    pal[i] = (255 << 24 | ch(0.55) << 16 | ch(0.30) << 8 | ch(0.10)) >>> 0;
  }
}

async function loadModule(file) {
  const res = await fetch(file);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return WebAssembly.compile(await res.arrayBuffer());
}

async function createEngine() {
  const isolated = self.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined';

  if (!isolated) {
    const memory = new WebAssembly.Memory({ initial: PAGES, maximum: PAGES });
    const instance = await WebAssembly.instantiate(await loadModule('fractal-st.wasm'), { env: { mem: memory } });
    writePalette(memory);
    return {
      memory,
      label: 'main thread (not isolated)',
      run: p => instance.exports.render(0, 1, p.w, p.h, p.cx, p.cy, p.scale, p.maxIter),
    };
  }

  const memory = new WebAssembly.Memory({ initial: PAGES, maximum: PAGES, shared: true });
  const module = await loadModule('fractal.wasm');
  writePalette(memory);
  const count = Math.max(1, Math.min(navigator.hardwareConcurrency || 2, 8));
  const workers = await Promise.all(Array.from({ length: count }, () => new Promise((resolve, reject) => {
    const w = new Worker('worker.js');
    w.onerror = e => reject(new Error(e.message || 'worker failed to start'));
    w.onmessage = ({ data }) => { if (data.type === 'ready') resolve(w); };
    w.postMessage({ type: 'init', module, memory });
  })));

  let frameId = 0;
  return {
    memory,
    label: `${count} threads`,
    run: p => {
      const id = ++frameId;
      return Promise.all(workers.map((w, k) => new Promise(resolve => {
        w.onmessage = ({ data }) => { if (data.type === 'done' && data.id === id) resolve(); };
        w.postMessage({ ...p, id, y0: k, ystep: workers.length });
      })));
    },
  };
}

// --- Rendering: one frame in flight at a time, latest request wins ---

let busy = false, queued = null, settleTimer = 0;

function sizeCanvas() {
  canvas.width = Math.round(canvas.clientWidth * devicePixelRatio);
  canvas.height = Math.round(canvas.clientHeight * devicePixelRatio);
}

async function renderFrame(quality) {
  let w = Math.max(2, Math.round(canvas.width * quality));
  let h = Math.max(2, Math.round(canvas.height * quality));
  if (w * h > MAX_PIXELS) {
    const k = Math.sqrt(MAX_PIXELS / (w * h));
    w = Math.floor(w * k); h = Math.floor(h * k);
  }
  const t0 = performance.now();
  await engine.run({ w, h, cx: view.cx, cy: view.cy, scale: view.scale * canvas.clientWidth / w, maxIter: view.maxIter });
  const ms = Math.round(performance.now() - t0);

  if (off.width !== w || off.height !== h) { off.width = w; off.height = h; }
  const img = offCtx.createImageData(w, h);
  img.data.set(new Uint8ClampedArray(engine.memory.buffer, 0, w * h * 4));
  offCtx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = quality < 1;
  ctx.drawImage(off, 0, 0, canvas.width, canvas.height);

  const zoom = HOME.span / (view.scale * canvas.clientWidth);
  info.textContent = `${engine.label} · SIMD · ${ms} ms · ${w}×${h} · zoom ${zoom < 1e4 ? zoom.toFixed(1) : zoom.toExponential(1)}×`;
}

async function requestRender(quality = 1) {
  if (busy) { queued = Math.min(queued ?? quality, quality); return; }
  busy = true;
  try { await renderFrame(quality); }
  catch (e) { fail('Render failed: ' + e.message); }
  busy = false;
  if (queued !== null) { const q = queued; queued = null; requestRender(q); }
}

// Fast low-res frames while the user is moving, one sharp frame after.
function interact() {
  requestRender(0.5);
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => requestRender(1), 180);
}

// --- View math ---

function zoomAt(px, py, factor) {
  const minScale = 1e-15, maxScale = 0.05;
  const next = Math.min(maxScale, Math.max(minScale, view.scale * factor));
  const ox = px - canvas.clientWidth / 2, oy = py - canvas.clientHeight / 2;
  // keep the complex point under (px, py) fixed
  view.cx += ox * (view.scale - next);
  view.cy += oy * (view.scale - next);
  view.scale = next;
}

function resetView() {
  view.cx = HOME.cx; view.cy = HOME.cy;
  view.scale = HOME.span / canvas.clientWidth;
}

// --- Touch / mouse ---

const pointers = new Map();
let lastTap = { t: 0, x: 0, y: 0 };

canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY, x0: e.offsetX, y0: e.offsetY, t0: performance.now() });
});

canvas.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  if (pointers.size === 1) {
    view.cx -= (e.offsetX - p.x) * view.scale;
    view.cy -= (e.offsetY - p.y) * view.scale;
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const before = Math.hypot(a.x - b.x, a.y - b.y);
    const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
    p.x = e.offsetX; p.y = e.offsetY;
    const after = Math.hypot(a.x - b.x, a.y - b.y);
    const nMidX = (a.x + b.x) / 2, nMidY = (a.y + b.y) / 2;
    view.cx -= (nMidX - midX) * view.scale;
    view.cy -= (nMidY - midY) * view.scale;
    if (before > 0 && after > 0) zoomAt(nMidX, nMidY, before / after);
    interact();
    return;
  }
  p.x = e.offsetX; p.y = e.offsetY;
  interact();
});

function endPointer(e) {
  const p = pointers.get(e.pointerId);
  pointers.delete(e.pointerId);
  if (!p || pointers.size) return;
  const isTap = Math.hypot(e.offsetX - p.x0, e.offsetY - p.y0) < 12 && performance.now() - p.t0 < 300;
  if (!isTap) return;
  const now = performance.now();
  if (now - lastTap.t < 350 && Math.hypot(e.offsetX - lastTap.x, e.offsetY - lastTap.y) < 40) {
    zoomAt(e.offsetX, e.offsetY, 0.4);
    requestRender(1);
    lastTap.t = 0;
  } else {
    lastTap = { t: now, x: e.offsetX, y: e.offsetY };
  }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', e => pointers.delete(e.pointerId));

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  zoomAt(e.offsetX, e.offsetY, Math.exp(e.deltaY * 0.002));
  interact();
}, { passive: false });

// --- Buttons ---

const center = () => [canvas.clientWidth / 2, canvas.clientHeight / 2];
document.getElementById('zoomIn').onclick = () => { zoomAt(...center(), 0.5); requestRender(1); };
document.getElementById('zoomOut').onclick = () => { zoomAt(...center(), 2); requestRender(1); };
document.getElementById('reset').onclick = () => { resetView(); requestRender(1); };
const itersBtn = document.getElementById('iters');
itersBtn.onclick = () => {
  view.maxIter = ITER_STEPS[(ITER_STEPS.indexOf(view.maxIter) + 1) % ITER_STEPS.length];
  itersBtn.textContent = `${view.maxIter} iter`;
  requestRender(1);
};

// --- Gamepad: left stick pans, A / right trigger zoom in, B / left trigger zoom out ---

let padLoop = false;
function pollPad(prev) {
  const pad = [...(navigator.getGamepads?.() || [])].find(Boolean);
  if (!pad) { padLoop = false; return; }
  const now = performance.now(), dt = Math.min(0.05, (now - prev) / 1000);
  const dead = v => (Math.abs(v) < 0.15 ? 0 : v);
  const sx = dead(pad.axes[0] || 0), sy = dead(pad.axes[1] || 0);
  const zin = pad.buttons[0]?.pressed || (pad.buttons[7]?.value || 0) > 0.2;
  const zout = pad.buttons[1]?.pressed || (pad.buttons[6]?.value || 0) > 0.2;
  if (sx || sy || zin || zout) {
    const speed = canvas.clientWidth * 0.8 * dt;
    view.cx += sx * speed * view.scale;
    view.cy += sy * speed * view.scale;
    if (zin) zoomAt(...center(), Math.pow(0.35, dt));
    if (zout) zoomAt(...center(), Math.pow(1 / 0.35, dt));
    interact();
  }
  requestAnimationFrame(() => pollPad(now));
}
addEventListener('gamepadconnected', () => {
  if (!padLoop) { padLoop = true; pollPad(performance.now()); }
});

// --- Start ---

addEventListener('resize', () => { sizeCanvas(); requestRender(1); });

(async () => {
  if (typeof WebAssembly !== 'object') return fail('This browser has no WebAssembly support.');
  try {
    engine = await createEngine();
  } catch (e) {
    return fail('Could not start the renderer: ' + e.message);
  }
  sizeCanvas();
  resetView();
  requestRender(1);
})();
