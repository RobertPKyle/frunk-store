// Command & Conquer: Tiberian Dawn and Red Alert on Vanilla Conquer
// (engine/, compiled to WebAssembly by tools/build-cnc.mjs with
// tools/cnc/vanilla-conquer-web.patch), with the games' files from EA's
// freeware releases (data/, packed by tools/supertux/pack.mjs).
//
// Each game's files are one stream of 1 MB blocks (data/<game>/<version>/<n>.bin),
// and the page mounts every file at /game with its size but no contents.
// When the game reads a file, the blocks it needs come from memory, else
// from IndexedDB ("cnc", where every block ever fetched is kept), else from
// the network. The engine's read import (fd_read) is wrapped with JSPI
// (WebAssembly.Suspending): a read whose blocks aren't in memory suspends the
// game's stack until they are. The game's loops run inside main() and wait
// for each animation frame the same way (Module.webFrame).
//
// The games keep their options and saved games in
// /home/web_user/.config/vanilla-conquer, mounted from IndexedDB (IDBFS)
// and written back now and then, when the page is hidden and when it's left.
//
// Touch: the page takes the touches (#touch, over the canvas) and hands the
// game mouse events on the canvas, as SDL reads them: a tap clicks, one
// finger dragging draws a selection box, two fingers move the map
// (web_scroll), and a finger held still right-clicks.

(() => {

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('cnc.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('cnc.' + key, JSON.stringify(value)); } catch {} },
};

const GAMES = {
  td: { name: 'Tiberian Dawn', engine: 'vanillatd', dir: 'vanillatd', ini: 'CONQUER.INI', play: 'playTd', kept: 'keptTd' },
  ra: { name: 'Red Alert', engine: 'vanillara', dir: 'vanillara', ini: 'REDALERT.INI', play: 'playRa', kept: 'keptRa' },
};
const DATA = 'data/';
const ENGINE = 'engine/';
const USERDIR = '/home/web_user/.config/vanilla-conquer';
const W = 640, H = 400;   // the games' screen
const KEEP = 48;          // blocks kept in memory (48 MB)
const PARALLEL = 6;       // block downloads at once
const MB = n => `${Math.round(n / 1e6)} MB`;

// ---------- blocks: memory, IndexedDB, network ----------

const indexes = {};       // game -> data/<game>/index.json: { version, block, blocks, bytes, boot, gz, files }
let game = null;          // the game being played
let index = null, gz = new Set();
const mem = new Map();    // block -> Uint8Array, least recently used first
const pending = new Map();  // block -> promise
const pinned = new Set();   // blocks a waiting read needs
const stats = { fetched: 0, fromDb: 0, waits: 0, waitMs: 0, maxWaitMs: 0 };

const idb = (() => {
  let db = null;
  const open = () => db || (db = new Promise((resolve, reject) => {
    const req = indexedDB.open('cnc', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('blocks');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
  const tx = async (mode, fn) => {
    const d = await open();
    return new Promise((resolve, reject) => {
      const t = d.transaction('blocks', mode);
      const req = fn(t.objectStore('blocks'));
      t.oncomplete = () => resolve(req?.result);
      t.onerror = t.onabort = () => reject(t.error);
    });
  };
  return {
    get: key => tx('readonly', s => s.get(key)),
    put: (key, value) => tx('readwrite', s => s.put(value, key)),
    keys: () => tx('readonly', s => s.getAllKeys()),
    del: keys => tx('readwrite', s => { for (const k of keys) s.delete(k); return null; }),
  };
})();
const blockKey = (g, n) => `${g}/${indexes[g].version}/${n}`;

async function download(g, n) {
  const ix = indexes[g];
  const packed = ix.gz.includes(n);
  const res = await fetch(`${DATA}${g}/${ix.version}/${n}.bin${packed ? '.gz' : ''}`);
  if (!res.ok) throw new Error(`block ${n}: HTTP ${res.status}`);
  const body = packed ? res.body.pipeThrough(new DecompressionStream('gzip')) : res.body;
  const buf = await new Response(body).arrayBuffer();
  stats.fetched++;
  // ArrayBuffers, not Blobs: Blobs from IndexedDB have failed to read in the car
  idb.put(blockKey(g, n), buf).catch(() => {});
  return new Uint8Array(buf);
}

function keep(n, bytes) {
  mem.delete(n);
  mem.set(n, bytes);
  for (const old of mem.keys()) {
    if (mem.size <= KEEP) break;
    if (!pinned.has(old)) mem.delete(old);
  }
}

// The block of the game being played, in memory, from IndexedDB or the network
function load(n) {
  if (mem.has(n)) { const b = mem.get(n); mem.delete(n); mem.set(n, b); return Promise.resolve(b); }
  if (pending.has(n)) return pending.get(n);
  const p = (async () => {
    let buf = null;
    try { buf = await idb.get(blockKey(game, n)); } catch {}
    if (buf) stats.fromDb++;
    const bytes = buf ? new Uint8Array(buf) : await download(game, n);
    keep(n, bytes);
    return bytes;
  })().finally(() => pending.delete(n));
  pending.set(n, p);
  return p;
}

// Runs fn over 0..count-1, a few at a time
async function each(count, fn, parallel = PARALLEL) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(parallel, count) }, async () => {
    while (next < count) await fn(next++);
  }));
}

// ---------- the data as files ----------

let FS = null, memory = null;
const trace = params.has('trace') ? [] : null;   // ?trace=1: the files in the order first read
window.cncTrace = () => trace;
if (trace) window.cncFile = path => M.FS.readFile(path, { encoding: 'utf8' });

function mountData(M) {
  FS = M.FS;
  const EIO = 29;
  const B = index.block;
  // Reads come from the blocks in memory; fd_read (below) has made sure
  // they are there. Sequential readers (music) get the next block early.
  const read = (stream, buffer, offset, length, position) => {
    const f = stream.node.st;
    if (trace && !f.seen) { f.seen = true; trace.push(f.path); }
    if (trace) (window.cncReads ||= []).push([f.path, position, length]);
    if (position >= f.size) return 0;
    const len = Math.min(length, f.size - position);
    const at = f.start + position;
    const first = Math.floor(at / B), last = Math.floor((at + len - 1) / B);
    for (let b = first, done = 0; b <= last; b++) {
      const block = mem.get(b);
      if (!block) throw new FS.ErrnoError(EIO);
      const off = at + done - b * B;
      const take = Math.min(block.length - off, len - done);
      buffer.set(block.subarray(off, off + take), offset + done);
      done += take;
    }
    const end = at + len, next = last + 1;
    if (end - last * B > B / 2 && next * B < f.start + f.size && !mem.has(next)) load(next).catch(() => {});
    return len;
  };
  const dirs = new Set();
  let at = 0, ops = null;
  for (const [path, size] of index.files) {
    const full = `/game/${path}`;
    const dir = full.slice(0, full.lastIndexOf('/'));
    if (!dirs.has(dir)) { FS.mkdirTree(dir); dirs.add(dir); }
    const node = FS.create(full, 0o100444);
    if (!ops) ops = { ...node.stream_ops, read, write: () => { throw new FS.ErrnoError(63); }, mmap: () => { throw new FS.ErrnoError(63); } };
    node.stream_ops = ops;
    node.usedBytes = size;   // what MEMFS's stat and SEEK_END use
    node.st = { start: at, size, path };
    at += size;
  }
}

// The blocks a read on fd needs that aren't in memory, loading; null if none
function missing(fd, iov, iovcnt) {
  let stream = null;
  try { stream = FS.getStream(fd); } catch {}
  const f = stream?.node?.st;
  if (!f) return null;
  const view = new DataView(memory.buffer);
  let len = 0;
  for (let i = 0; i < iovcnt; i++) len += view.getUint32(iov + i * 8 + 4, true);
  const pos = stream.position;
  if (!len || pos >= f.size) return null;
  const B = index.block;
  const at = f.start + pos, end = f.start + Math.min(f.size, pos + len);
  const want = [];
  for (let b = Math.floor(at / B); b <= Math.floor((end - 1) / B); b++) if (!mem.has(b)) want.push(b);
  if (!want.length) return null;
  for (const b of want) pinned.add(b);
  // the game's stack is suspended until these come, so anything else that
  // runs the game's code meanwhile is outside it
  inGame = false;
  const t = performance.now();
  const slow = setTimeout(() => { $('wait').hidden = false; }, 300);
  return Promise.all(want.map(load)).finally(() => {
    inGame = true;
    for (const b of want) pinned.delete(b);
    clearTimeout(slow);
    $('wait').hidden = true;
    const ms = performance.now() - t;
    stats.waits++;
    stats.waitMs += ms;
    stats.maxWaitMs = Math.max(stats.maxWaitMs, ms);
  });
}

// ---------- start screen ----------

function status(text) { $('status').textContent = text; }

async function fetchIndex(g) {
  const res = await fetch(`${DATA}${g}/index.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  indexes[g] = await res.json();
  return indexes[g];
}

async function showKept() {
  let keys = [];
  try { keys = await idb.keys(); } catch {}
  let complete = true;
  for (const g of Object.keys(GAMES)) {
    try { if (!indexes[g]) await fetchIndex(g); } catch { complete = false; $(GAMES[g].kept).textContent = ''; continue; }
    const ix = indexes[g];
    const count = keys.filter(k => k.startsWith(`${g}/${ix.version}/`)).length;
    // blocks of an older build of this game's data
    const old = keys.filter(k => k.startsWith(`${g}/`) && !k.startsWith(`${g}/${ix.version}/`));
    if (old.length) idb.del(old).catch(() => {});
    $(GAMES[g].kept).textContent = count >= ix.blocks ? 'All downloaded' : count ? `${MB(Math.min(count * ix.block, ix.bytes))} of ${MB(ix.bytes)} downloaded` : '';
    if (count < ix.blocks) complete = false;
  }
  $('all').disabled = complete;
}

let filling = false;
$('all').onclick = async () => {
  if (filling) return;
  filling = true;
  $('all').disabled = true;
  try {
    const have = new Set(await idb.keys());
    const todo = [];
    let total = 0;
    for (const g of Object.keys(GAMES)) {
      const ix = indexes[g] || await fetchIndex(g);
      total += ix.blocks;
      for (let n = 0; n < ix.blocks; n++) if (!have.has(blockKey(g, n))) todo.push([g, n]);
    }
    let done = 0;
    await each(todo.length, async i => {
      await download(...todo[i]);
      done++;
      if (done % 4 === 0 || done === todo.length) status(`Downloading: ${total - todo.length + done} of ${total} MB`);
    }, 4);
    status('Everything is downloaded. Both games play without a connection now.');
  } catch (err) {
    status(`The download stopped (${err.message}). Try again to carry on where it stopped.`);
  }
  filling = false;
  showKept();
};

let forgetArmed = 0;
$('forget').onclick = async () => {
  if (!forgetArmed) {
    $('forget').classList.add('armed');
    $('forget').textContent = 'Sure?';
    forgetArmed = setTimeout(() => { forgetArmed = 0; $('forget').classList.remove('armed'); $('forget').textContent = 'Remove'; }, 3000);
    return;
  }
  clearTimeout(forgetArmed);
  forgetArmed = 0;
  $('forget').classList.remove('armed');
  $('forget').textContent = 'Remove';
  try { await idb.del(await idb.keys()); } catch {}
  status('The downloaded game data is removed. Your saved games are kept.');
  showKept();
};

// ---------- the game ----------

let started = false, running = false;
const log = [];
window.cncLog = log;
const remember = line => { log.push(String(line)); if (log.length > 300) log.shift(); };

function loading(text, fraction) {
  $('loading').hidden = false;
  $('loadText').textContent = text;
  $('loadBar').hidden = fraction == null;
  if (fraction != null) $('loadBar').value = fraction;
}

function failed(message) {
  $('failedText').textContent = message || 'Something went wrong.';
  $('failed').hidden = false;
  $('loading').hidden = true;
}
$('failedOk').onclick = () => location.reload();

// The game's sound: every AudioContext it makes (Emscripten's OpenAL makes one)
const contexts = [];
if (window.AudioContext) {
  const Real = window.AudioContext;
  window.AudioContext = class extends Real {
    constructor(...args) { super(...args); contexts.push(this); showSound(); }
  };
}

// Whether the game's own stack (main() and its loop) is the one running.
// Only it can wait for data: anything else that runs the game's code (the
// page's calls below, SDL's event handlers) is outside it, where a read
// that waited would throw, so there a read of missing data just fails.
let inGame = false;
let M = null;

// Calls into the game from the page (not from its own loop)
function call(name, ...args) {
  if (!running) return;
  try { M[`_${name}`](...args); } catch (err) { console.warn(name, err); }
}

// The game's settings for the browser, kept with whatever else the game
// has written to its INI
const INI = {
  Video: { Windowed: 'yes', WindowWidth: W, WindowHeight: H, Boxing: 'no', HardwareCursor: 'no', Scaler: 'nearest', FrameLimit: 60 },
  Mouse: { RawInput: 'no', ControllerEnabled: 'no' },
  Intro: { PlayIntro: 'No' },
};
function setIni(path) {
  let text = '';
  try { text = M.FS.readFile(path, { encoding: 'utf8' }); } catch {}
  const lines = text.split(/\r?\n/);
  for (const [section, keys] of Object.entries(INI)) {
    let start = lines.findIndex(l => l.trim().toLowerCase() === `[${section.toLowerCase()}]`);
    if (start < 0) { lines.push('', `[${section}]`); start = lines.length - 1; }
    for (const [k, v] of Object.entries(keys)) {
      let end = lines.findIndex((l, i) => i > start && /^\s*\[/.test(l));
      if (end < 0) end = lines.length;
      const at = lines.findIndex((l, i) => i > start && i < end && l.split('=')[0].trim().toLowerCase() === k.toLowerCase());
      if (at >= 0) lines[at] = `${k}=${v}`;
      else lines.splice(start + 1, 0, `${k}=${v}`);
    }
  }
  // the game's INI reader skips a last line without a line break
  M.FS.writeFile(path, lines.join('\r\n').replace(/^(\r\n)+/, '').replace(/(\r\n)*$/, '\r\n'));
}

// The canvas at the largest 16:10 size the screen area holds
function fit() {
  const r = $('screen').getBoundingClientRect();
  const scale = Math.min(r.width / W, r.height / H);
  const w = Math.floor(W * scale), h = Math.floor(H * scale);
  Object.assign($('canvas').style, { width: `${w}px`, height: `${h}px`, left: `${Math.floor((r.width - w) / 2)}px`, top: `${Math.floor((r.height - h) / 2)}px` });
}
addEventListener('resize', () => setTimeout(fit, 0));

const smooth = () => settings.get('smooth', false);
function showSmooth() {
  $('canvas').classList.toggle('smooth', smooth());
  $('smoothBtn').textContent = smooth() ? 'Smooth' : 'Sharp';
}
$('smoothBtn').onclick = () => { settings.set('smooth', !smooth()); showSmooth(); };

// The games' files on disk (options, saved games) go back to IndexedDB
let syncing = false, syncAgain = false;
function syncfs() {
  return new Promise(resolve => {
    if (!running) return resolve();
    if (syncing) { syncAgain = true; return resolve(); }
    syncing = true;
    try {
      FS.syncfs(false, err => {
        if (err) console.warn('saving failed', err);
        syncing = false;
        if (syncAgain) { syncAgain = false; syncfs(); }
        resolve();
      });
    } catch { syncing = false; resolve(); }
  });
}
setInterval(() => { if (running && !document.hidden) syncfs(); }, 10000);

async function play(g) {
  if (started) return;
  started = true;
  game = g;
  for (const id of Object.values(GAMES).map(x => x.play)) $(id).disabled = true;
  $('loadTitle').textContent = $('title').textContent = GAMES[g].name;
  try { navigator.storage?.persist?.(); } catch {}
  loading('Getting ready…', null);
  try {
    index = indexes[g] || await fetchIndex(g);
    gz = new Set(index.gz);
    // the files the game reads while starting, all at once
    const boot = Math.ceil(index.boot / index.block);
    let done = 0;
    loading('Loading the game…', 0);
    await each(boot, async n => {
      await load(n);
      done++;
      loading('Loading the game…', done / boot);
    });
  } catch (err) {
    return failed(`Couldn't download the game (${err.message}). Check the connection and try again.`);
  }
  loading('Starting…', null);
  start();
}
for (const g of Object.keys(GAMES)) $(GAMES[g].play).onclick = () => play(g);

async function start() {
  const canvas = $('canvas');
  let firstFrame = true;
  const engine = `${ENGINE}${GAMES[game].engine}`;
  let createConquer;
  try {
    ({ default: createConquer } = await import(`./${engine}.js`));
  } catch {
    return failed('Couldn\'t load the game. Check the connection and try again.');
  }
  const config = {
    canvas,
    locateFile: path => ENGINE + path,
    print: remember,
    printErr: line => { remember(line); console.warn(line); },
    onAbort: what => failed(`The game stopped: ${what}`),
    // The game quit (its Exit menu) or stopped with an error
    onExit: code => {
      running = false;
      syncfs().finally(() => {
        if (code) failed(`The game stopped (exit code ${code}). ${log.slice(-3).join(' ')}`);
        else location.reload();
      });
    },
    // The game's loops wait here between frames
    webFrame: () => new Promise(resolve => (inGame = false, requestAnimationFrame(() => {
      if (firstFrame) {
        firstFrame = false;
        $('start').hidden = true;
        $('loading').hidden = true;
        $('player').hidden = false;
        fit();
        showSmooth();
        // the rest of what's read in the first minutes, a block at a time in the background
        const from = Math.ceil(index.boot / index.block), to = Math.ceil(index.next / index.block);
        each(to - from, i => load(from + i).catch(() => {}), 1);
      }
      stats.frames = (stats.frames || 0) + 1;
      inGame = true;
      resolve();
    }))),
    // Reads wait for their blocks: fd_read suspends the game (JSPI) when
    // they aren't in memory yet
    instantiateWasm(imports, done) {
      const real = imports.wasi_snapshot_preview1.fd_read;
      const fdRead = new WebAssembly.Suspending((fd, iov, iovcnt, pnum) => {
        const wait = inGame ? missing(fd, iov, iovcnt) : null;
        return wait ? wait.then(() => real(fd, iov, iovcnt, pnum), () => real(fd, iov, iovcnt, pnum)) : real(fd, iov, iovcnt, pnum);
      });
      imports.wasi_snapshot_preview1 = { ...imports.wasi_snapshot_preview1, fd_read: fdRead };
      WebAssembly.instantiateStreaming(fetch(`${engine}.wasm`), imports).then(r => {
        memory = r.instance.exports.memory;
        done(r.instance, r.module);
      }, err => failed(`Couldn't start the game (${err.message}).`));
      return {};
    },
    preRun: [Mod => {
      mountData(Mod);
      Mod.FS.mkdirTree(USERDIR);
      Mod.FS.mount(Mod.IDBFS, {}, USERDIR);
      Mod.addRunDependency('saves');
      Mod.FS.syncfs(true, err => {
        if (err) console.warn('loading saves failed', err);
        Mod.FS.mkdirTree(`${USERDIR}/${GAMES[game].dir}`);
        M = Mod;
        setIni(`${USERDIR}/${GAMES[game].dir}/${GAMES[game].ini}`);
        Mod.removeRunDependency('saves');
      });
    }],
  };
  try {
    M = await createConquer(config);
  } catch (err) {
    return failed(`Couldn't start the game (${err.message || err}).`);
  }
  running = true;
  inGame = true;
  // main() runs on the game's own stack, until the game quits
  M.callMain([]);
}

window.cncStats = () => ({ game, ...stats, inMemory: mem.size, heapMB: memory ? Math.round(memory.buffer.byteLength / 1e6) : 0, frames: running ? M._web_frames() : 0, audio: contexts.map(c => `${c.state} ${c.sampleRate}`) });

// ---------- touch ----------

// Mouse events on the canvas, where SDL listens, at a point on the screen
// (kept on the canvas: the screen around it is outside the game)
function mouse(type, x, y, button = 0) {
  const r = $('canvas').getBoundingClientRect();
  x = Math.min(Math.max(x, r.left), r.right - 1);
  y = Math.min(Math.max(y, r.top), r.bottom - 1);
  $('canvas').dispatchEvent(new MouseEvent(type, {
    bubbles: true, cancelable: true, clientX: x, clientY: y, screenX: x, screenY: y,
    button, buttons: type === 'mouseup' ? 0 : 1 << (button === 2 ? 1 : 0),
  }));
}

// A click: the button stays down for a few frames, so a game frame sees it
function click(x, y, button) {
  mouse('mousemove', x, y);
  mouse('mousedown', x, y, button);
  setTimeout(() => mouse('mouseup', x, y, button), 60);
}

// Game pixels per screen pixel, for moving the map with two fingers
const gameScale = () => W / $('canvas').getBoundingClientRect().width;

const HOLD = 550;         // ms a still finger takes to right-click
const SLOP = 10;          // px a finger may wander and still tap
const touches = new Map();   // id -> { x, y, x0, y0 }
let gesture = null;          // 'tap' | 'drag' | 'pan' | 'held'
let holdTimer = 0, panX = 0, panY = 0;

function centroid() {
  let x = 0, y = 0;
  for (const t of touches.values()) { x += t.x; y += t.y; }
  return [x / touches.size, y / touches.size];
}

const touchLayer = $('touch');
touchLayer.addEventListener('touchstart', e => {
  e.preventDefault();
  for (const t of e.changedTouches) touches.set(t.identifier, { x: t.clientX, y: t.clientY, x0: t.clientX, y0: t.clientY });
  if (touches.size === 1 && !gesture) {
    const [t] = touches.values();
    gesture = 'tap';
    mouse('mousemove', t.x, t.y);
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      if (gesture !== 'tap') return;
      gesture = 'held';
      click(t.x, t.y, 2);
    }, HOLD);
  } else if (touches.size >= 2) {
    clearTimeout(holdTimer);
    // a second finger: move the map, and let go of a box being drawn
    if (gesture === 'drag') { const [x, y] = centroid(); mouse('mouseup', x, y); }
    gesture = 'pan';
    [panX, panY] = centroid();
  }
}, { passive: false });

touchLayer.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const p = touches.get(t.identifier);
    if (p) { p.x = t.clientX; p.y = t.clientY; }
  }
  if (gesture === 'pan') {
    const [x, y] = centroid();
    const s = gameScale();
    const dx = Math.round((panX - x) * s), dy = Math.round((panY - y) * s);
    if (dx || dy) {
      call('web_scroll', dx, dy);
      panX -= dx / s;
      panY -= dy / s;
    }
    return;
  }
  const [t] = touches.values();
  if (!t) return;
  if (gesture === 'tap' && Math.hypot(t.x - t.x0, t.y - t.y0) > SLOP) {
    clearTimeout(holdTimer);
    gesture = 'drag';
    mouse('mousedown', t.x0, t.y0);
  }
  if (gesture === 'drag' || gesture === 'tap') mouse('mousemove', t.x, t.y);
}, { passive: false });

function touchEnd(e) {
  e.preventDefault();
  const ended = [...e.changedTouches].map(t => touches.get(t.identifier)).filter(Boolean);
  for (const t of e.changedTouches) touches.delete(t.identifier);
  if (touches.size) return;
  clearTimeout(holdTimer);
  const t = ended[ended.length - 1];
  if (t) {
    if (gesture === 'tap') click(t.x, t.y, 0);
    else if (gesture === 'drag') { mouse('mousemove', t.x, t.y); mouse('mouseup', t.x, t.y); }
  }
  gesture = null;
}
touchLayer.addEventListener('touchend', touchEnd, { passive: false });
touchLayer.addEventListener('touchcancel', touchEnd, { passive: false });

// A real mouse goes straight through to the game
for (const type of ['mousedown', 'mousemove', 'mouseup', 'wheel']) {
  touchLayer.addEventListener(type, e => {
    if (e.isTrusted) $('canvas').dispatchEvent(new e.constructor(e.type, e));
  });
}
touchLayer.addEventListener('contextmenu', e => e.preventDefault());

$('deselectBtn').onclick = () => {
  // a right click in the middle of the map
  const r = $('canvas').getBoundingClientRect();
  click(r.left + r.width * 0.4, r.top + r.height * 0.5, 2);
};

// ---------- typing ----------

// SDL scancodes for what the car's keyboard types
const SCANCODE = { '\n': 40, ' ': 44, '-': 45, '=': 46, "'": 52, ',': 54, '.': 55, '/': 56 };
for (let i = 0; i < 26; i++) SCANCODE[String.fromCharCode(97 + i)] = 4 + i;
for (let i = 1; i <= 9; i++) SCANCODE[String(i)] = 29 + i;
SCANCODE['0'] = 39;
const KEYS = { Enter: 40, Escape: 41, Backspace: 42, Tab: 43 };
const SHIFT = 225;

// Key presses, one after another, so each frame sees them in order
let typing = Promise.resolve();
function press(codes) {
  typing = typing.then(async () => {
    for (const code of codes) {
      call('web_key', code, 1);
      await new Promise(r => setTimeout(r, 20));
      call('web_key', code, 0);
      await new Promise(r => setTimeout(r, 20));
    }
  });
}
function typeText(text) {
  for (const ch of text) {
    const code = SCANCODE[ch.toLowerCase()];
    if (code == null) continue;
    if (ch !== ch.toLowerCase()) {
      typing = typing.then(() => call('web_key', SHIFT, 1));
      press([code]);
      typing = typing.then(() => call('web_key', SHIFT, 0));
    } else {
      press([code]);
    }
  }
}

const kbd = $('kbd');
$('keysBtn').onclick = () => {
  if (document.activeElement === kbd) kbd.blur();
  else kbd.focus();
};
// One character always in the field, so the car keyboard's backspace has
// something to delete (and fires an input event)
const refill = () => { kbd.value = '_'; kbd.setSelectionRange(1, 1); };
kbd.addEventListener('focus', () => { refill(); $('keysBtn').classList.add('on'); });
kbd.addEventListener('blur', () => $('keysBtn').classList.remove('on'));
// Keys the field doesn't type go to the game as keys; what it types comes
// from its input events (the car's keyboard sends no key codes for letters)
kbd.addEventListener('keydown', e => {
  e.stopPropagation();
  if (KEYS[e.key]) { e.preventDefault(); press([KEYS[e.key]]); }
});
kbd.addEventListener('keyup', e => e.stopPropagation());
kbd.addEventListener('keypress', e => e.stopPropagation());
kbd.addEventListener('input', e => {
  if (e.inputType === 'deleteContentBackward') press([KEYS.Backspace]);
  else if (e.inputType === 'insertLineBreak') press([KEYS.Enter]);
  else if (e.data) typeText(e.data);
  refill();
});

// ---------- sound ----------

// The browser may hold the sound back until a tap; the button says so
const soundOn = () => settings.get('sound', true);
const blocked = () => soundOn() && contexts.some(c => c.state !== 'running') && !document.hidden;
function showSound() {
  $('soundBtn').textContent = !soundOn() ? 'Sound off' : blocked() ? 'Tap for sound' : 'Sound on';
}
function wakeSound() {
  if (soundOn() && !document.hidden) for (const c of contexts) if (c.state !== 'running') c.resume().then(showSound, () => {});
}
$('soundBtn').onclick = () => {
  if (blocked()) { wakeSound(); return; }
  settings.set('sound', !soundOn());
  for (const c of contexts) soundOn() ? c.resume() : c.suspend();
  showSound();
};
for (const type of ['pointerdown', 'keydown', 'touchstart']) addEventListener(type, wakeSound, true);
setInterval(() => {
  if (!running) return;
  if (!soundOn()) for (const c of contexts) if (c.state === 'running') c.suspend();
  showSound();
}, 1000);

// ---------- leaving ----------

let leaving = false;
$('quitBtn').onclick = async () => {
  if (leaving) return;
  leaving = true;
  await syncfs();
  location.reload();
};

document.addEventListener('visibilitychange', () => {
  if (!running) return;
  if (document.hidden) {
    syncfs();
    for (const c of contexts) c.suspend();
  } else if (soundOn()) {
    wakeSound();
  }
});

// The hub's Apps button (or the car's back button) unloads this page. The
// hub asks first, so saved games can be written back; it waits up to a second.
addEventListener('message', async e => {
  if (e.source !== parent || e.data?.frunk !== 'close') return;
  await syncfs();
  e.source.postMessage({ frunk: 'closed' }, e.origin);
});
if (parent !== window) parent.postMessage({ frunk: 'save-on-close' }, '*');

addEventListener('error', e => { if (started) failed(`The game stopped: ${e.message}`); });
addEventListener('unhandledrejection', e => {
  if (!started || /ExitStatus/.test(String(e.reason?.name || e.reason))) return;
  if (/promising|suspend|RuntimeError/i.test(String(e.reason))) failed(`The game stopped: ${e.reason}`);
});

showKept();
})();
