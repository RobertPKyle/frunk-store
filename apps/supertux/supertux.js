// SuperTux: the SuperTux 0.7.0 game (engine/, compiled to WebAssembly by
// tools/build-supertux.mjs with tools/supertux/supertux-web.patch) and its
// data (data/, packed by tools/supertux/pack.mjs).
//
// The data is 300 MB, more than the car's browser can hold in memory. So it
// is one stream of 1 MB blocks (data/<version>/<n>.bin), and the page mounts
// every file at /data with its size but no contents. When the game reads a
// file, the blocks it needs come from memory (a few dozen are kept), else
// from IndexedDB ("supertux", where every block ever fetched is kept), else
// from the network. The engine's read import (fd_read) is wrapped with JSPI
// (WebAssembly.Suspending): a read whose blocks aren't in memory suspends the
// game's stack until they are, and the game carries on as if the read had
// simply taken a while. The game's main loop runs inside main() and waits
// for each animation frame the same way (Module.nextFrame), so everything
// the game does happens on that one suspendable stack.
//
// The game keeps its saves and options in /home/web_user/.local/share/supertux2,
// mounted from IndexedDB (IDBFS) and written back now and then, when the
// page is hidden and when it's left (the hub's Apps button asks first).

(() => {

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('supertux.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('supertux.' + key, JSON.stringify(value)); } catch {} },
};

const DATA = 'data/';
const ENGINE = 'engine/';
const USERDIR = '/home/web_user/.local/share/supertux2';
const KEEP = 48;          // blocks kept in memory (48 MB)
const PARALLEL = 6;       // block downloads at once
// ?touch=1 or ?touch=0 overrides it (for testing)
const touchFirst = params.has('touch') ? params.get('touch') !== '0' : !matchMedia('(hover: hover) and (pointer: fine)').matches;
const MB = n => `${Math.round(n / 1e6)} MB`;

// ---------- blocks: memory, IndexedDB, network ----------

let index = null;         // data/index.json: { version, block, blocks, bytes, boot, gz, files }
let gz = new Set();
const mem = new Map();    // block -> Uint8Array, least recently used first
const pending = new Map();  // block -> promise
const pinned = new Set();   // blocks a waiting read needs
const stats = { fetched: 0, fromDb: 0, waits: 0, waitMs: 0, maxWaitMs: 0 };

const idb = (() => {
  let db = null;
  const open = () => db || (db = new Promise((resolve, reject) => {
    const req = indexedDB.open('supertux', 1);
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
const key = n => `${index.version}/${n}`;

async function download(n) {
  const res = await fetch(`${DATA}${index.version}/${n}.bin${gz.has(n) ? '.gz' : ''}`);
  if (!res.ok) throw new Error(`block ${n}: HTTP ${res.status}`);
  const body = gz.has(n) ? res.body.pipeThrough(new DecompressionStream('gzip')) : res.body;
  const buf = await new Response(body).arrayBuffer();
  stats.fetched++;
  // ArrayBuffers, not Blobs: Blobs from IndexedDB have failed to read in the car
  idb.put(key(n), buf).catch(() => {});
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

// The block in memory, from IndexedDB or the network
function load(n) {
  if (mem.has(n)) { const b = mem.get(n); mem.delete(n); mem.set(n, b); return Promise.resolve(b); }
  if (pending.has(n)) return pending.get(n);
  const p = (async () => {
    let buf = null;
    try { buf = await idb.get(key(n)); } catch {}
    if (buf) stats.fromDb++;
    const bytes = buf ? new Uint8Array(buf) : await download(n);
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
let trace = params.has('trace') ? [] : null;   // ?trace=1: the files in the order first read
window.supertuxTrace = () => trace;

function mountData(M) {
  FS = M.FS;
  const EIO = 29;
  const B = index.block;
  // Reads come from the blocks in memory; fd_read (below) has made sure
  // they are there. Sequential readers (music) get the next block early.
  const read = (stream, buffer, offset, length, position) => {
    const f = stream.node.st;
    if (trace && !f.seen) { f.seen = true; trace.push(f.path); }
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
    const full = `/data/${path}`;
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

async function showKept() {
  let count = 0;
  try {
    const res = await fetch(`${DATA}index.json`, { cache: 'no-cache' });
    index = await res.json();
    gz = new Set(index.gz);
    const keys = await idb.keys();
    count = keys.filter(k => k.startsWith(index.version + '/')).length;
    // blocks of an older build of the data
    const old = keys.filter(k => !k.startsWith(index.version + '/'));
    if (old.length) idb.del(old).catch(() => {});
  } catch {}
  if (!index) { $('kept').textContent = ''; return; }
  const bytes = Math.min(count * index.block, index.bytes);
  $('kept').textContent = count >= index.blocks ? 'All downloaded' : count ? `${MB(bytes)} of ${MB(index.bytes)} downloaded` : '';
  $('all').disabled = count >= index.blocks;
}

let filling = false;
$('all').onclick = async () => {
  if (filling || !index) return;
  filling = true;
  $('all').disabled = true;
  try {
    const have = new Set(await idb.keys());
    const todo = [];
    for (let n = 0; n < index.blocks; n++) if (!have.has(key(n))) todo.push(n);
    let done = 0;
    await each(todo.length, async i => {
      const n = todo[i];
      if (!mem.has(n)) await download(n);
      done++;
      if (done % 4 === 0 || done === todo.length) status(`Downloading: ${MB((index.blocks - todo.length + done) * index.block)} of ${MB(index.bytes)}`);
    }, 4);
    status('Everything is downloaded. The game plays without a connection now.');
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
  status('The downloaded game data is removed. Your progress is kept.');
  showKept();
};

// ---------- the game ----------

let started = false, running = false;
const log = [];
window.supertuxLog = log;
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

// The car shows each controller twice: the device itself and a "Tesla
// Virtual Gamepad" copy with the standard mapping. SDL would open both and
// one press would count twice, so the game only sees the virtual pads when
// there are any, else only standard pads when there are any.
{
  const all = navigator.getGamepads?.bind(navigator);
  if (all) {
    const keepPad = pads => {
      const list = [...pads].filter(Boolean);
      if (list.some(p => /tesla virtual/i.test(p.id))) return p => /tesla virtual/i.test(p.id);
      if (list.some(p => p.mapping === 'standard')) return p => p.mapping === 'standard';
      return () => true;
    };
    navigator.getGamepads = () => {
      const pads = all(), ok = keepPad(pads);
      return [...pads].map(p => (p && ok(p) ? p : null));
    };
    addEventListener('gamepadconnected', e => {
      if (!keepPad(all())(e.gamepad)) e.stopImmediatePropagation();
    }, true);
  }
}

// Whether the game's own stack (main() and its loop) is the one running.
// Only it can wait for data: anything else that runs the game's code (the
// page's calls below, SDL's event handlers) is outside it, where a read
// that waited would throw, so there a read of missing data just fails.
let inGame = false;

// Calls into the game from the page (not from its own loop)
function call(name, types = [], args = []) {
  if (!running) return;
  try { window.Module.ccall(name, null, types, args); } catch (err) { console.warn(name, err); }
}

// The game draws at the size of the screen area, one canvas pixel per CSS pixel
function fit() {
  const r = $('screen').getBoundingClientRect();
  call('set_resolution', ['number', 'number'], [Math.max(320, Math.floor(r.width)), Math.max(200, Math.floor(r.height))]);
}
addEventListener('resize', () => setTimeout(fit, 0));

// The game's files on disk (saves, options) go back to IndexedDB
let syncing = false, syncAgain = false, lastSync = 0;
function syncfs() {
  return new Promise(resolve => {
    if (!running) return resolve();
    if (syncing) { syncAgain = true; return resolve(); }
    syncing = true;
    lastSync = performance.now();
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

// What the game's own code asks of its page (tools/supertux/supertux-web.patch
// keeps upstream's names)
Object.assign(window, {
  // called every frame: write back at most every 2 seconds
  supertux2_syncfs: () => { if (performance.now() - lastSync > 2000) syncfs(); },
  supertux_loadFiles: () => {},
  supertux_saveFiles: () => syncfs(),
  supertux_setAutofit: () => setTimeout(fit, 0),
  supertux2_ispersistent: () => 1,
  supertux_download: () => false,
  supertux_upload: () => {},
  // no add-ons: their downloads fail at once
  supertux_xhr_file_download: (ptr, id) => setTimeout(() => call('onDownloadError', ['number', 'number'], [ptr, id]), 0),
  supertux_xhr_string_download: (ptr, id) => setTimeout(() => call('onDownloadError', ['number', 'number'], [ptr, id]), 0),
});

async function play() {
  if (started) return;
  started = true;
  for (const b of [$('play'), $('play2')]) b.disabled = true;
  try { navigator.storage?.persist?.(); } catch {}
  loading('Getting ready…', null);
  try {
    if (!index) {
      const res = await fetch(`${DATA}index.json`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      index = await res.json();
    }
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
$('play').onclick = $('play2').onclick = play;

function start() {
  const canvas = $('canvas');
  let firstFrame = true;
  window.Module = {
    canvas,
    touchControls: touchFirst,
    locateFile: path => ENGINE + path,
    print: remember,
    printErr: line => { remember(line); console.warn(line); },
    setStatus: () => {},
    onAbort: what => failed(`The game stopped: ${what}`),
    // The game's loop waits here between frames
    nextFrame: () => new Promise(resolve => (inGame = false, requestAnimationFrame(() => {
      if (firstFrame) {
        firstFrame = false;
        $('start').hidden = true;
        $('loading').hidden = true;
        $('player').hidden = false;
        fit();
        canvas.focus();
        // what the game reads next (the intro, the first world map and its
        // first level), two blocks at a time in the background
        const from = Math.ceil(index.boot / index.block), to = Math.ceil(index.next / index.block);
        each(to - from, i => load(from + i).catch(() => {}), 2);
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
      WebAssembly.instantiateStreaming(fetch(ENGINE + 'supertux2.wasm'), imports).then(r => {
        memory = r.instance.exports.memory;
        done(r.instance, r.module);
      }, err => failed(`Couldn't start the game (${err.message}).`));
      return {};
    },
    preRun: [M => {
      mountData(M);
      M.FS.mkdirTree(USERDIR);
      M.FS.mount(M.IDBFS, {}, USERDIR);
      M.addRunDependency('saves');
      M.FS.syncfs(true, err => {
        if (err) console.warn('loading saves failed', err);
        M.removeRunDependency('saves');
      });
    }],
    // main() runs next, on the game's own stack
    onRuntimeInitialized: () => { running = true; inGame = true; },
  };
  const s = document.createElement('script');
  s.src = ENGINE + 'supertux2.js';
  s.onerror = () => failed('Couldn\'t load the game. Check the connection and try again.');
  document.body.append(s);
}

window.supertuxStats = () => ({ ...stats, inMemory: mem.size, heapMB: memory ? Math.round(memory.buffer.byteLength / 1e6) : 0, audio: contexts.map(c => `${c.state} ${c.sampleRate}`) });

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

async function save() {
  call('save_config');
  await syncfs();
}

let leaving = false;
$('quitBtn').onclick = async () => {
  if (leaving) return;
  leaving = true;
  await save();
  location.reload();
};

document.addEventListener('visibilitychange', () => {
  if (!running) return;
  if (document.hidden) {
    save();
    for (const c of contexts) c.suspend();
  } else if (soundOn()) {
    wakeSound();
  }
});

// The hub's Apps button (or the car's back button) unloads this page. The
// hub asks first, so the game can be saved; it waits up to a second.
addEventListener('message', async e => {
  if (e.source !== parent || e.data?.frunk !== 'close') return;
  await save();
  e.source.postMessage({ frunk: 'closed' }, e.origin);
});
if (parent !== window) parent.postMessage({ frunk: 'save-on-close' }, '*');

addEventListener('error', e => { if (started) failed(`The game stopped: ${e.message}`); });
addEventListener('unhandledrejection', e => { if (started && /promising|suspend|RuntimeError/i.test(String(e.reason))) failed(`The game stopped: ${e.reason}`); });

showKept();
})();
