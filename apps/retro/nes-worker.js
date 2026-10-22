// Runs jsnes on its own thread, so the page's main thread only reads
// controllers: this worker paces itself by the screen's refreshes, draws to
// the canvas (handed over as an OffscreenCanvas), sends sound straight to the
// page's AudioWorklet and keeps saves in IndexedDB. Used by nes.js.
//
// Messages in:
//   { type: 'canvas', canvas, count }        the screen, once; count is an optional
//                                            shared Int32Array: frames drawn, refresh rate, steady
//   { type: 'audio', port, rate }            where sound goes (port may be null)
//   { id, type: 'load', bytes, name }        -> { id, error? }
//   { type: 'input', buttons: [p1, p2] }     held buttons as jsnes button bitmasks
//   { type: 'pause', on } / { type: 'reset' }
//   { id, type: 'save' }, { id, type: 'quit' }  -> { id } once saved
// Messages out: { type: 'frames', n, hz, steady } a few times a second, when
// there's no shared counter.
//
// Steady mode, as in retro.js but measured on this worker's own refreshes
// (they keep going when the page's main thread is slow): after three seconds
// under 54 refreshes a second, draw every other refresh, a steady frame rate
// at full game speed. It stays on until the next game starts.
//
// Progress is kept in IndexedDB (database "nes"), keyed by the game's file
// name: the battery save of games that have one (copied every few seconds
// when it changes) and a "resume" snapshot taken when the game is paused,
// hidden or closed. Reset starts over, keeping the battery save.

importScripts('jsnes.min.js');
const { NES } = self.jsnes;

const FRAME_MS = 1000 / 60.0988;   // NTSC frame rate
const SRAM = 0x6000, SRAM_SIZE = 0x2000;   // battery-backed RAM in CPU memory
const BATCH = 512;

// ---------- saves (IndexedDB) ----------

function saves(mode, fn) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('nes', 1);
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

let ctx = null, image = null, pixels = null, count = null;
let nes = null, game = null, rom = '', battery = null, saveTimer = 0;
let paused = true, steady = false, odd = false, last = 0, due = 0, drawn = true, frames = 0, reported = 0;
let refreshes = 0, since = 0, hz = 0, slowSeconds = 0, loadedAt = 0;
const SLOW_HZ = 54;
const held = [0, 0];
const audio = { port: null, rate: 48000, l: new Float32Array(BATCH), r: new Float32Array(BATCH), n: 0 };

const nextFrame = self.requestAnimationFrame
  ? f => self.requestAnimationFrame(f)
  : f => setTimeout(() => f(performance.now()), FRAME_MS);

function sample(l, r) {
  if (!audio.port) return;
  audio.l[audio.n] = l;
  audio.r[audio.n] = r;
  if (++audio.n === BATCH) {
    const out = { l: audio.l.slice(), r: audio.r.slice() };
    audio.port.postMessage(out, [out.l.buffer, out.r.buffer]);
    audio.n = 0;
  }
}

function onFrame(buffer) {
  // jsnes gives 0xBBGGRR; the canvas wants 0xAABBGGRR on little-endian
  for (let i = 0; i < 61440; i++) pixels[i] = 0xff000000 | buffer[i];
  drawn = false;
}

// The battery save, when the game has one and it changed since last time
function newBattery() {
  if (!nes || !nes.rom.batteryRam) return null;
  const now = nes.cpu.mem.slice(SRAM, SRAM + SRAM_SIZE);
  if (battery && now.every((v, i) => v === battery[i])) return null;
  return battery = now;
}

// Saves run one at a time: each reads the game's record and writes it back,
// so one running alongside another (the battery save every few seconds and
// the snapshot when the game is left) could undo the other's change
let saving = Promise.resolve();
const queue = job => (saving = saving.then(job).catch(() => {}));

// Writes the battery save when it changed, and the resume snapshot when asked
const persist = snapshot => queue(() => persistNow(snapshot));
async function persistNow(snapshot) {
  if (!nes || !game) return;
  const name = game, changed = newBattery();
  if (!changed && !snapshot) return;
  const record = { ...(await readSave(name)) };
  if (battery) record.battery = battery;
  if (snapshot) record.state = nes.toJSON();
  await writeSave(name, record);
}

// Loads the game fresh (a power cycle), with its battery save if any
function powerOn() {
  nes.loadROM(rom);
  if (battery && nes.rom.batteryRam) nes.cpu.mem.set(battery, SRAM);
}

async function load({ bytes, name }) {
  nes = new NES({ onFrame, onAudioSample: sample, emulateSound: !!audio.port, sampleRate: audio.rate });
  // jsnes reads ROMs as a binary string
  rom = '';
  for (let i = 0; i < bytes.length; i += 8192) rom += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  try {
    nes.loadROM(rom);
  } catch (e) {
    nes = null;
    return /mapper/i.test(String(e && e.message))
      ? 'this game uses a cartridge type the emulator doesn\'t support yet.'
      : 'the file may be damaged.';
  }
  game = name;
  const saved = await readSave(game);
  battery = saved?.battery || null;
  powerOn();
  if (saved?.state) {
    // An unreadable snapshot (say, from another jsnes version) starts over
    try { nes.fromJSON(saved.state); } catch { powerOn(); }
  }
  held[0] = held[1] = 0;
  audio.n = 0;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 256, 240);
  paused = false; steady = false; due = 0; last = since = loadedAt = performance.now();
  refreshes = slowSeconds = 0;
  clearInterval(saveTimer);
  saveTimer = setInterval(() => { if (!paused) persist(false); }, 5000);
}

function setButtons(buttons) {
  for (let p = 0; p < 2; p++) {
    const diff = buttons[p] ^ held[p];
    for (let b = 0; b < 8; b++) {
      if (!(diff & (1 << b))) continue;
      if (buttons[p] & (1 << b)) nes.buttonDown(p + 1, b); else nes.buttonUp(p + 1, b);
    }
    held[p] = buttons[p];
  }
}

// Every screen refresh: run the frames that are due, draw the last one
function tick(t) {
  nextFrame(tick);
  if (!nes || paused) { last = since = t; refreshes = 0; return; }
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
  if (due > FRAME_MS * catchUp) due = FRAME_MS * catchUp;
  while (due >= FRAME_MS) {
    nes.frame();
    due -= FRAME_MS;
  }
  if (!drawn) {
    ctx.putImageData(image, 0, 0);
    drawn = true;
    frames++;
    if (count) Atomics.store(count, 0, frames);
  }
  if (!count && t - reported > 250) { reported = t; postMessage({ type: 'frames', n: frames, hz, steady }); }
}
nextFrame(tick);

onmessage = async ({ data: msg }) => {
  switch (msg.type) {
    case 'canvas':
      ctx = msg.canvas.getContext('2d');
      count = msg.count || null;
      image = ctx.createImageData(256, 240);
      pixels = new Uint32Array(image.data.buffer);
      break;
    case 'audio':
      if (audio.port) audio.port.close();
      audio.port = msg.port;
      if (msg.rate) audio.rate = msg.rate;
      break;
    case 'load':
      postMessage({ id: msg.id, error: await load(msg) });
      break;
    case 'input':
      if (nes) setButtons(msg.buttons);
      break;
    case 'pause':
      paused = msg.on;
      last = performance.now();
      break;
    case 'reset': {
      if (!nes) break;
      const name = game;
      powerOn();
      queue(() => readSave(name).then(old => old && writeSave(name, { ...old, state: null })));
      break;
    }
    case 'save':
      await persist(true);
      postMessage({ id: msg.id });
      break;
    case 'quit':
      clearInterval(saveTimer);
      await persist(true);
      nes = null;
      game = null;
      rom = '';
      paused = true;
      postMessage({ id: msg.id });
      break;
  }
};
