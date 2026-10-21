// Runs Gearsystem (Master System, Game Gear and SG-1000) on its own thread,
// like nes-worker.js does jsnes: it paces itself by the screen's refreshes,
// draws to the canvas (handed over as an OffscreenCanvas), sends sound
// straight to the page's AudioWorklet and keeps saves in IndexedDB. Used by
// sms.js; the messages are listed in worker-core.js.
//
// Progress is kept in IndexedDB (database "sms"), keyed by the game's file
// name: the battery save of games that have one (copied every few seconds
// when it changes) and a "resume" snapshot taken when the game is paused,
// hidden or closed. Reset starts over, keeping the battery save.

const SLOW_HZ = 54;
const BATCH = 512;
const KEYS = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0, 0x80];   // Gearsystem's key for each bit sms.js sends

// ---------- saves (IndexedDB) ----------

function saves(mode, fn) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('sms', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('saves');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const d = req.result;
      const tx = d.transaction('saves', mode);
      const r = fn(tx.objectStore('saves'));
      tx.oncomplete = () => { d.close(); resolve(r && r.result); };
      tx.onerror = tx.onabort = () => { d.close(); reject(tx.error); };
    };
  });
}
const readSave = name => saves('readonly', s => s.get(name)).catch(() => null);
const writeSave = (name, value) => saves('readwrite', s => s.put(value, name)).catch(() => {});

// ---------- state ----------

let ctx = null, image = null, count = null, width = 0, height = 0;
let gs = null, loading = null, game = null, battery = null, saveTimer = 0;
let frameMs = 1000 / 59.92;
let paused = true, steady = false, odd = false, last = 0, due = 0, drawn = true, frames = 0, reported = 0;
let refreshes = 0, since = 0, hz = 0, slowSeconds = 0, loadedAt = 0;
const held = [0, 0];
const audio = { port: null, l: new Float32Array(BATCH), r: new Float32Array(BATCH), n: 0 };

const nextFrame = self.requestAnimationFrame
  ? f => self.requestAnimationFrame(f)
  : f => setTimeout(() => f(performance.now()), frameMs);

// The emulator, loaded on first use
function emulator() {
  if (!loading) {
    loading = import('./sms/gearsystem.js').then(m => m.default()).then(m => (gs = m));
    loading.catch(() => { loading = null; });
  }
  return loading;
}

// Copies bytes into the emulator's memory; free the result with _gs_free
function copyIn(bytes) {
  const p = gs._gs_alloc(bytes.length);
  gs.HEAPU8.set(bytes, p);
  return p;
}

// Passes on the sound of the frames just run
function takeSound() {
  const n = gs._gs_sample_count();
  const p = gs._gs_samples() >> 1;
  if (!audio.port) return;
  const s = gs.HEAP16;
  for (let i = 0; i < n; i += 2) {
    audio.l[audio.n] = s[p + i] / 32768;
    audio.r[audio.n] = s[p + i + 1] / 32768;
    if (++audio.n === BATCH) {
      const out = { l: audio.l.slice(), r: audio.r.slice() };
      audio.port.postMessage(out, [out.l.buffer, out.r.buffer]);
      audio.n = 0;
    }
  }
}

// Runs one frame; when draw is set, copies its picture for the next refresh
function runFrame(draw) {
  const size = gs._gs_frame(draw ? 1 : 0);
  takeSound();
  if (!draw) return;
  const w = size >>> 16, h = size & 0xffff;
  if (w !== width || h !== height) {
    width = ctx.canvas.width = w;
    height = ctx.canvas.height = h;
    image = ctx.createImageData(w, h);
    if (count) { Atomics.store(count, 3, w); Atomics.store(count, 4, h); }
  }
  const p = gs._gs_screen();
  image.data.set(gs.HEAPU8.subarray(p, p + w * h * 4));
  drawn = false;
}

// The battery save, when the game has one and it changed since last time
function newBattery() {
  const size = gs && game ? gs._gs_battery_size() : 0;
  if (!size) return null;
  const p = gs._gs_battery();
  const now = gs.HEAPU8.slice(p, p + size);
  if (battery && battery.length === size && now.every((v, i) => v === battery[i])) return null;
  return battery = now;
}

function snapshot() {
  const room = gs._gs_state_size();
  if (!room) return null;
  const p = gs._gs_alloc(room);
  const size = gs._gs_state_save(p, room);
  const state = size ? gs.HEAPU8.slice(p, p + size) : null;
  gs._gs_free(p);
  return state;
}

// Writes the battery save when it changed, and the resume snapshot when asked
async function persist(withSnapshot) {
  if (!gs || !game) return;
  const name = game, changed = newBattery();
  if (!changed && !withSnapshot) return;
  const record = { ...(await readSave(name)) };
  if (battery) record.battery = battery;
  if (withSnapshot) record.state = snapshot();
  await writeSave(name, record);
}

async function load({ bytes, name }) {
  try {
    await emulator();
  } catch {
    return 'the emulator didn\'t load. Check the connection and try again.';
  }
  game = null;
  const rom = copyIn(bytes);
  const label = new TextEncoder().encode(name + '\0');
  const path = copyIn(label);
  const kind = gs._gs_load(rom, bytes.length, path);
  gs._gs_free(path);
  gs._gs_free(rom);
  if (!kind) return 'the file may be damaged.';
  frameMs = 1000 / (kind === 2 ? 49.7 : 59.92);
  game = name;
  const saved = await readSave(game);
  battery = saved?.battery || null;
  const size = gs._gs_battery_size();
  if (battery && battery.length === size) gs.HEAPU8.set(battery, gs._gs_battery());
  if (saved?.state) {
    const p = copyIn(saved.state);
    // An unreadable snapshot (say, from another Gearsystem version) starts over
    if (!gs._gs_state_load(p, saved.state.length)) gs._gs_reset();
    gs._gs_free(p);
  }
  held[0] = held[1] = 0;
  audio.n = 0;
  gs._gs_samples();
  width = height = 0;
  runFrame(true);
  paused = false; steady = false; due = 0; last = since = loadedAt = performance.now();
  refreshes = slowSeconds = 0;
  clearInterval(saveTimer);
  saveTimer = setInterval(() => { if (!paused) persist(false); }, 5000);
}

function setButtons(buttons) {
  for (let p = 0; p < 2; p++) {
    const diff = buttons[p] ^ held[p];
    for (let b = 0; b < KEYS.length; b++) {
      if (KEYS[b] && diff & (1 << b)) gs._gs_button(p, KEYS[b], buttons[p] & (1 << b) ? 1 : 0);
    }
    held[p] = buttons[p];
  }
}

// Every screen refresh: run the frames that are due, draw the last one
function tick(t) {
  nextFrame(tick);
  if (!game || paused) { last = since = t; refreshes = 0; return; }
  refreshes++;
  if (t - since >= 1000) {
    hz = Math.round(refreshes * 1000 / (t - since));
    // the first two seconds don't count: starting a game can stall
    slowSeconds = hz < SLOW_HZ && t - loadedAt > 2000 ? slowSeconds + 1 : 0;
    if (slowSeconds >= 3) steady = true;
    since = t;
    refreshes = 0;
    if (count) { Atomics.store(count, 1, hz); Atomics.store(count, 2, steady ? 1 : 0); }
  }
  odd = !odd;
  if (steady && odd) return;   // steady mode draws every other refresh
  due += Math.min(t - last, 100);
  last = t;
  // Catch up at most two frames per refresh (four in steady mode); drop the
  // rest when the CPU can't keep up, so the game slows instead of stuttering
  const catchUp = steady ? 4 : 2;
  if (due > frameMs * catchUp) due = frameMs * catchUp;
  while (due >= frameMs) {
    due -= frameMs;
    runFrame(due < frameMs);   // draw only the last one
  }
  if (!drawn) {
    ctx.putImageData(image, 0, 0);
    drawn = true;
    frames++;
    if (count) Atomics.store(count, 0, frames);
  }
  if (!count && t - reported > 250) { reported = t; postMessage({ type: 'frames', n: frames, hz, steady, width, height }); }
}
nextFrame(tick);

onmessage = async ({ data: msg }) => {
  switch (msg.type) {
    case 'canvas':
      ctx = msg.canvas.getContext('2d');
      count = msg.count || null;
      break;
    case 'audio':
      if (audio.port) audio.port.close();
      audio.port = msg.port;
      break;
    case 'load':
      postMessage({ id: msg.id, error: await load(msg) });
      break;
    case 'input':
      if (game) setButtons(msg.buttons);
      break;
    case 'pause':
      paused = msg.on;
      last = performance.now();
      break;
    case 'reset': {
      if (!game) break;
      const name = game;
      gs._gs_reset();
      readSave(name).then(old => old && writeSave(name, { ...old, state: null }));
      break;
    }
    case 'save':
      await persist(true);
      postMessage({ id: msg.id });
      break;
    case 'quit':
      clearInterval(saveTimer);
      await persist(true);
      game = null;
      paused = true;
      postMessage({ id: msg.id });
      break;
  }
};
