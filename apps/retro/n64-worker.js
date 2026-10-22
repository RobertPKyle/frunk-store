// Runs n64js (Nintendo 64; n64/n64js.js, built by tools/build-n64js.mjs) on
// its own thread, as the other cores' workers do: it paces itself by the
// screen's refreshes and its sound, draws with WebGL 2 to the canvas (handed
// over as an OffscreenCanvas), sends sound straight to the page's
// AudioWorklet and keeps saves in IndexedDB. The messages are listed in
// worker-core.js; the page side is n64.js.
//
// In-game saves (EEPROM, SRAM, FlashRAM, Controller Paks) are kept in
// IndexedDB (database "n64"), keyed by the game's file name, written a
// second after the game changes them and when it's paused or closed. n64js
// has no snapshots, so a game starts from power-on each time.

import * as emu from './n64/n64js.js';

// n64js narrates a lot of what the game does; nobody reads it in the car
console.log = console.warn = () => {};

// ---------- saves (IndexedDB) ----------

function saves(mode, fn) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('n64', 1);
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

// Writes run one at a time, in order
let saving = Promise.resolve();
const queue = job => (saving = saving.then(job).catch(() => {}));

// ---------- state ----------

let count = null, game = null, items = null, paused = true, failed = false, saveTimer = 0;
let refreshes = 0, since = 0, hz = 0, reported = 0, working = 0, busy = 0, detail = false;

// The game's saves as they are now, written in order with any before
function persist() {
  clearTimeout(saveTimer);
  if (!game) return saving;
  const name = game, record = { ...items };
  return queue(() => writeSave(name, record));
}

// ---------- sound ----------
// Samples go to the page's AudioWorklet in batches; the shared counter
// (played) says how many it has taken, so the difference is what's queued.
// When it stops taking them for a while (the page suspended its sound),
// nothing more is sent, and the emulator stops waiting for it.

const audio = { port: null, rate: 48000, played: null, on: true, written: 0, seen: 0, seenAt: 0 };
self.sound = audio;   // for looking at from the browser's tools (and the e2e checks)

const sink = {
  get rate() { return audio.rate; },
  lead() {
    if (!audio.played) return null;
    const now = performance.now(), played = Atomics.load(audio.played, 0);
    if (played !== audio.seen) { audio.seen = played; audio.seenAt = now; }
    else if (audio.written !== played && now - audio.seenAt > 300) return null;
    return ((audio.written - played) | 0) / audio.rate;
  },
  send(l, r) {
    if (sink.lead() === null && audio.played) return;
    audio.written = (audio.written + l.length) | 0;   // (sending empties l)
    audio.port.postMessage({ l, r }, [l.buffer, r.buffer]);
  },
};

function routeSound() {
  emu.sound(audio.port && audio.on ? sink : null);
}

// ---------- running ----------

const nextFrame = self.requestAnimationFrame
  ? f => self.requestAnimationFrame(f)
  : f => setTimeout(() => f(performance.now()), 1000 / 60);

function tick(t) {
  nextFrame(tick);
  if (!game || paused || failed) { since = t; refreshes = working = 0; return; }
  refreshes++;
  if (t - since >= 1000) {
    const elapsed = t - since;
    hz = Math.round(refreshes * 1000 / elapsed);
    busy = Math.min(100, Math.round(working * 100 / elapsed));
    if (detail) postMessage({ type: 'detail', text: describe(emu.profile(true), working, elapsed) });
    since = t;
    refreshes = working = 0;
    if (count) { Atomics.store(count, 1, hz); Atomics.store(count, 5, busy); }
  }
  let error = null;
  const started = performance.now();
  try {
    if (!emu.run(t)) error = emu.status().error;
  } catch (e) {
    error = e && e.message || String(e);
  }
  working += performance.now() - started;
  if (error) {
    // n64js stopped on something it can't emulate
    failed = true;
    postMessage({ type: 'failed', error: String(error) });
    return;
  }
  const n = emu.presented();
  if (count) Atomics.store(count, 0, n);
  else if (t - reported > 250) { reported = t; postMessage({ type: 'frames', n, hz, steady: false, busy }); }
}
nextFrame(tick);

// The details readout's line: how much of the time (in percent) went to the
// game's own code, reading its display lists, drawing (WebGL) and sound;
// then the frames drawn and skipped each second, and the RSP tasks n64js
// couldn't do itself (which run slowly, along with the game's code)
function describe(p, working, elapsed) {
  const pc = ms => Math.round(ms * 100 / elapsed);
  const per = n => Math.round(n * 1000 / elapsed);
  const game = working - p.gl - p.lists - p.sound;
  return `game ${pc(game)}% · lists ${pc(p.lists)}% · gl ${pc(p.gl)}% · sound ${pc(p.sound)}%` +
    ` · ${per(p.drawn)} drawn, ${per(p.skipped)} skipped` + (p.rsp ? ` · rsp ${per(p.rsp)}` : '');
}

async function load({ bytes, name }) {
  game = null;
  items = { ...(await readSave(name)) };
  try {
    emu.load(bytes, items, () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(persist, 1000);
    });
  } catch {
    return 'the file may be damaged.';
  }
  game = name;
  failed = false;
  paused = false;
  since = performance.now();
  refreshes = 0;
  emu.resume();
}

onmessage = async ({ data: msg }) => {
  switch (msg.type) {
    case 'canvas':
      emu.init(msg.canvas);
      count = msg.count || null;
      break;
    case 'audio':
      if (audio.port) audio.port.close();
      audio.port = msg.port;
      audio.rate = msg.rate || 48000;
      audio.played = msg.played || null;
      audio.written = audio.seen = 0;
      audio.seenAt = performance.now();
      routeSound();
      break;
    case 'sound':
      audio.on = msg.on;
      audio.seenAt = performance.now();
      routeSound();
      break;
    case 'load':
      postMessage({ id: msg.id, error: await load(msg) });
      break;
    case 'input': {
      // per port: buttons, stick x and y; then whether port 2 is plugged in
      const b = msg.buttons;
      emu.input(0, b[0], b[1], b[2]);
      emu.input(1, b[3], b[4], b[5]);
      emu.plug(1, !!b[6]);
      break;
    }
    case 'pause':
      paused = msg.on;
      if (!paused) {
        emu.resume();
        audio.seenAt = performance.now();
      }
      break;
    case 'detail':
      // the details readout: measure where the time goes, or stop
      detail = msg.on;
      emu.profile(detail);
      break;
    case 'reset':
      if (!game) break;
      failed = false;
      emu.reset();
      break;
    case 'save':
      if (game) emu.flush();
      await persist();
      postMessage({ id: msg.id });
      break;
    case 'quit':
      if (game) emu.flush();
      await persist();
      game = null;
      paused = true;
      postMessage({ id: msg.id });
      break;
  }
};
