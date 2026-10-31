// The Elder Scrolls: Arena and Daggerfall in DOSBox (engine/, em-dosbox
// compiled to WebAssembly by tools/build-elderscrolls.mjs with
// tools/elderscrolls/em-dosbox-web.patch), with the games' files from
// Bethesda's freeware releases (data/, packed by tools/supertux/pack.mjs).
//
// Each game's files are one stream of 1 MB blocks (data/<game>/<version>/<n>.bin),
// and the page mounts every file at /game/<game> with its size but no
// contents. When the game reads a file, the blocks it needs come from
// memory, else from IndexedDB ("elderscrolls", where every block ever
// fetched is kept), else from the network. The engine's read import
// (fd_read) is wrapped with JSPI (WebAssembly.Suspending): a read whose
// blocks aren't in memory suspends DOSBox until they are. DOSBox's own loop
// runs inside main() and lets the page run every 10 ms or so the same way.
//
// DOSBox mounts /game/<game> as C: with an overlay drive on top: whatever
// the game writes (saved games, settings) goes to /save/<game>, mounted from
// IndexedDB (IDBFS) and written back now and then, when the page is hidden
// and when it's left.
//
// Both games are played with the mouse pointer. Touch: a tap clicks, a
// finger dragged holds the button down while the pointer follows it, and a
// finger held still presses the right button (a right click, or a weapon
// swing if it then moves). A controller walks with the left stick or D-pad
// (the arrow keys), moves the pointer with the right stick, clicks with A
// and B, swings with the right trigger, and has the games' main keys on the
// other buttons. The games poll the mouse once a frame, so every click is
// held down until DOSBox has drawn a couple of frames.

(() => {

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('elderscrolls.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('elderscrolls.' + key, JSON.stringify(value)); } catch {} },
};

// keys: what the controller's buttons press, by SDL key name (SC below);
// run is held with the left trigger. X is Enter: both games pick from
// lists and confirm with it (a click only highlights a list's line).
const GAMES = {
  arena: {
    name: 'Arena', title: 'The Elder Scrolls: Arena', play: 'playArena', kept: 'keptArena', memsize: 16,
    run: ['cd ARENA', 'ARENA.BAT'],
    keys: { x: 'enter', y: 'j', lb: 'c', rb: 'a', ls: 'l', rs: 'f1', map: 'm', run: 'lctrl' },
  },
  daggerfall: {
    name: 'Daggerfall', title: 'The Elder Scrolls II: Daggerfall', play: 'playDaggerfall', kept: 'keptDaggerfall', memsize: 32,
    run: ['cd DAGGER', 'FALL.EXE Z.CFG'],
    // the installer makes these, and the game saves into them
    dirs: ['DAGGER/SAVE0', 'DAGGER/SAVE1', 'DAGGER/SAVE2', 'DAGGER/SAVE3', 'DAGGER/SAVE4', 'DAGGER/SAVE5'],
    keys: { x: 'enter', y: 'j', lb: 'backspace', rb: 'a', ls: 'l', rs: 'f5', map: 'm', run: 'p' },
  },
};
const DATA = 'data/';
const ENGINE = 'engine/';
const SAVES = '/save';
const KEEP = 48;          // blocks kept in memory (48 MB)
const PARALLEL = 6;       // block downloads at once
const MB = n => `${Math.round(n / 1e6)} MB`;

// ---------- blocks: memory, IndexedDB, network ----------

const indexes = {};       // game -> data/<game>/index.json: { version, block, blocks, bytes, boot, gz, files }
let game = null;          // the game being played
let index = null;
const mem = new Map();    // block -> Uint8Array, least recently used first
const pending = new Map();  // block -> promise
const pinned = new Set();   // blocks a waiting read needs
const stats = { fetched: 0, fromDb: 0, waits: 0, waitMs: 0, maxWaitMs: 0 };

const idb = (() => {
  let db = null;
  const open = () => db || (db = new Promise((resolve, reject) => {
    const req = indexedDB.open('elderscrolls', 1);
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

// One small file of a game's data, outside the game (Arena's list of spell costs)
async function readGameFile(g, path) {
  const ix = indexes[g] || await fetchIndex(g);
  let at = 0, size = -1;
  for (const [p, s] of ix.files) {
    if (p === path) { size = s; break; }
    at += s;
  }
  if (size < 0) throw new Error(`${path} isn't in ${g}`);
  const out = new Uint8Array(size);
  for (let b = Math.floor(at / ix.block); b * ix.block < at + size; b++) {
    let buf = null;
    try { buf = await idb.get(blockKey(g, b)); } catch {}
    const bytes = buf ? new Uint8Array(buf) : await download(g, b);
    const from = Math.max(at, b * ix.block), to = Math.min(at + size, (b + 1) * ix.block);
    out.set(bytes.subarray(from - b * ix.block, to - b * ix.block), from - at);
  }
  return out;
}

// ---------- the data as files ----------

let FS = null, memory = null;
const trace = params.has('trace') ? [] : null;   // ?trace=1: the files in the order first read
window.esTrace = () => trace;

function mountData(M) {
  FS = M.FS;
  const EIO = 29;
  const B = index.block;
  const base = `/game/${game}`;
  // Reads come from the blocks in memory; fd_read (below) has made sure
  // they are there. Sequential readers (cutscenes) get the next block early.
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
    const full = `${base}/${path}`;
    const dir = full.slice(0, full.lastIndexOf('/'));
    if (!dirs.has(dir)) { FS.mkdirTree(dir); dirs.add(dir); }
    // writable as far as DOS can tell (no read-only attribute); writes go to
    // the overlay drive, which copies a file there before changing it
    const node = FS.create(full, 0o100666);
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
  const t = performance.now();
  const slow = setTimeout(() => { $('wait').hidden = false; }, 300);
  return Promise.all(want.map(load)).finally(() => {
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

// Arena's copy protection asks the cost of a spell; Bethesda's answers
let spellList = null;
async function showSpells() {
  $('spells').hidden = false;
  if (spellList) return;
  $('spellText').textContent = 'Loading…';
  try {
    const bytes = await readGameFile('arena', 'ARENA/Docs/Passwords.txt');
    spellList = new TextDecoder('latin1').decode(bytes).replace(/\r/g, '').replace(/_+\n/g, '').trim();
    $('spellText').textContent = spellList;
  } catch (err) {
    $('spellText').textContent = `Couldn't load the list (${err.message}).`;
  }
}
$('spellsArena').onclick = showSpells;
$('spellsBtn').onclick = showSpells;
$('spellsOk').onclick = () => { $('spells').hidden = true; };

// ---------- the game ----------

let started = false, running = false;
const log = [];
window.esLog = log;
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

// The game's sound: every AudioContext it makes (SDL makes one)
const contexts = [];
if (window.AudioContext) {
  const Real = window.AudioContext;
  window.AudioContext = class extends Real {
    constructor(...args) { super(...args); contexts.push(this); showSound(); }
  };
}

let M = null;

// DOSBox's settings: a VGA card, a Sound Blaster 16 with its FM synth (both
// games are set up for one at 220h, IRQ 7, DMA 1), the CPU as fast as the
// car allows, no DOSBox joystick (the page reads the controller), and the
// game started from C:, the game's files with an overlay for what it writes
function dosboxConf(g) {
  const G = GAMES[g];
  return [
    '[sdl]', 'fullscreen=false', 'output=surface', 'autolock=false', 'sensitivity=100', 'waitonerror=false', 'usescancodes=true',
    '[dosbox]', 'machine=svga_s3', `memsize=${G.memsize}`,
    '[render]', 'frameskip=0', 'aspect=false', 'scaler=none',
    '[cpu]', 'core=normal', 'cputype=auto', 'cycles=max',
    '[mixer]', 'nosound=false', 'rate=48000', 'blocksize=2048', 'prebuffer=40',
    '[midi]', 'mpu401=none', 'mididevice=none',
    '[sblaster]', 'sbtype=sb16', 'sbbase=220', 'irq=7', 'dma=1', 'hdma=5', 'sbmixer=true', 'oplmode=auto', 'oplemu=default', 'oplrate=48000',
    '[gus]', 'gus=false',
    '[speaker]', 'pcspeaker=false', 'tandy=off', 'disney=false',
    '[joystick]', 'joysticktype=none',
    '[serial]', 'serial1=disabled', 'serial2=disabled', 'serial3=disabled', 'serial4=disabled',
    '[dos]', 'xms=true', 'ems=true', 'umb=true', 'keyboardlayout=none',
    '[ipx]', 'ipx=false',
    '[autoexec]', '@echo off', `mount c /game/${g}`, `mount -t overlay c ${SAVES}/${g}`, 'c:', ...G.run, 'exit', '',
  ].join('\n');
}

// The canvas at the largest 4:3 size the screen area holds (DOS's 320x200
// was shown on 4:3 monitors). DOSBox sizes the canvas to the video mode and
// sets its CSS size too, so this runs again whenever that changes.
let fitted = '', fittedWidth = '';
function fit() {
  const c = $('canvas');
  const r = $('screen').getBoundingClientRect();
  const key = `${c.width}x${c.height}@${r.width}x${r.height}`;
  if (key === fitted && c.style.width === fittedWidth) return;
  fitted = key;
  const h = Math.floor(Math.min(r.height, r.width * 3 / 4)), w = Math.floor(h * 4 / 3);
  Object.assign(c.style, { width: `${w}px`, height: `${h}px`, left: `${Math.floor((r.width - w) / 2)}px`, top: `${Math.floor((r.height - h) / 2)}px` });
  fittedWidth = c.style.width;
}
addEventListener('resize', () => { fitted = ''; setTimeout(fit, 0); });

const smooth = () => settings.get('smooth', false);
function showSmooth() {
  $('canvas').classList.toggle('smooth', smooth());
  $('smoothBtn').textContent = smooth() ? 'Smooth' : 'Sharp';
}
$('smoothBtn').onclick = () => { settings.set('smooth', !smooth()); showSmooth(); };

// What the game wrote (saved games, settings) goes back to IndexedDB
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
  $('loadTitle').textContent = GAMES[g].title;
  $('title').textContent = GAMES[g].title;
  $('spellsBtn').hidden = g !== 'arena';
  try { navigator.storage?.persist?.(); } catch {}
  loading('Getting ready…', null);
  try {
    index = indexes[g] || await fetchIndex(g);
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
  let createDosbox;
  try {
    ({ default: createDosbox } = await import(`./${ENGINE}dosbox.js`));
  } catch {
    return failed('Couldn\'t load the game. Check the connection and try again.');
  }
  const config = {
    canvas,
    arguments: ['-conf', '/dosbox.conf'],
    locateFile: path => ENGINE + path,
    print: remember,
    printErr: remember,
    onAbort: what => failed(`The game stopped: ${what}`),
    // The game quit, so DOSBox did (the autoexec's last line), or it stopped with an error
    onExit: code => {
      running = false;
      syncfs().finally(() => {
        if (code) failed(`The game stopped (exit code ${code}). ${log.slice(-3).join(' ')}`);
        else location.reload();
      });
    },
    // Reads wait for their blocks: fd_read suspends DOSBox (JSPI) when
    // they aren't in memory yet
    instantiateWasm(imports, done) {
      const real = imports.wasi_snapshot_preview1.fd_read;
      const fdRead = new WebAssembly.Suspending((fd, iov, iovcnt, pnum) => {
        const wait = missing(fd, iov, iovcnt);
        return wait ? wait.then(() => real(fd, iov, iovcnt, pnum), () => real(fd, iov, iovcnt, pnum)) : real(fd, iov, iovcnt, pnum);
      });
      imports.wasi_snapshot_preview1 = { ...imports.wasi_snapshot_preview1, fd_read: fdRead };
      WebAssembly.instantiateStreaming(fetch(`${ENGINE}dosbox.wasm`), imports).then(r => {
        memory = r.instance.exports.memory;
        done(r.instance, r.module);
      }, err => failed(`Couldn't start the game (${err.message}).`));
      return {};
    },
    preRun: [Mod => {
      mountData(Mod);
      Mod.FS.mkdirTree(SAVES);
      Mod.FS.mount(Mod.IDBFS, {}, SAVES);
      Mod.addRunDependency('saves');
      Mod.FS.syncfs(true, err => {
        if (err) console.warn('loading saves failed', err);
        for (const d of ['', ...(GAMES[game].dirs || [])]) Mod.FS.mkdirTree(`${SAVES}/${game}/${d}`);
        Mod.FS.writeFile('/dosbox.conf', dosboxConf(game));
        Mod.removeRunDependency('saves');
      });
    }],
  };
  try {
    M = await createDosbox(config);
  } catch (err) {
    return failed(`Couldn't start the game (${err.message || err}).`);
  }
  running = true;
  $('start').hidden = true;
  $('loading').hidden = true;
  $('player').hidden = false;
  fit();
  showSmooth();
  // the rest of what's read in the first minutes, a block at a time in the background
  const from = Math.ceil(index.boot / index.block), to = Math.ceil(index.next / index.block);
  each(to - from, i => load(from + i).catch(() => {}), 1);
  requestAnimationFrame(loop);
  // main() runs DOSBox, until the game quits
  M.callMain(config.arguments);
}

window.esStats = () => ({
  game, ...stats, inMemory: mem.size, heapMB: memory ? Math.round(memory.buffer.byteLength / 1e6) : 0,
  frames: running ? M._web_frames() : 0, cycles: running ? M._web_cycles() : 0,
  canvas: `${$('canvas').width}x${$('canvas').height}`, pointer: [Math.round(pointer.x), Math.round(pointer.y)],
  gamePointer: running ? [M._web_mouse_x(), M._web_mouse_y()] : null,
  audio: contexts.map(c => `${c.state} ${c.sampleRate}`),
});

// ---------- keys ----------

// SDL scancodes
const SC = {
  enter: 40, escape: 41, backspace: 42, tab: 43, space: 44, minus: 45, equals: 46, quote: 52, comma: 54, period: 55, slash: 56,
  f1: 58, f2: 59, f3: 60, f4: 61, f5: 62, f6: 63, f7: 64, f8: 65, f9: 66, f10: 67, f11: 68, f12: 69,
  insert: 73, home: 74, pageup: 75, delete: 76, end: 77, pagedown: 78, right: 79, left: 80, down: 81, up: 82,
  lctrl: 224, lshift: 225, lalt: 226, rctrl: 228, rshift: 229, ralt: 230,
};
for (let i = 0; i < 26; i++) SC[String.fromCharCode(97 + i)] = 4 + i;
for (let i = 1; i <= 9; i++) SC[String(i)] = 29 + i;
SC['0'] = 39;

function key(name, down) {
  if (running && SC[name] != null) M._web_key(SC[name], down ? 1 : 0);
}

// Keys and buttons held down by the page; each is let go no sooner than
// two of DOSBox's frames (and 70 ms) after it went down, so the game sees it
const heldKeys = new Map();       // name -> { since, frame, release, again }
function keyDown(name, again = 0) {
  const k = heldKeys.get(name);
  if (k) {
    if (k.release) k.again++;
    return;
  }
  key(name, true);
  heldKeys.set(name, { since: performance.now(), frame: running ? M._web_frames() : 0, release: false, again });
}
function keyUp(name) { const k = heldKeys.get(name); if (k) k.release = true; }
const tapKey = name => { keyDown(name); keyUp(name); };

const seen = h => performance.now() - h.since >= 70 && (!running || M._web_frames() - h.frame >= 2 || performance.now() - h.since >= 600);
function releaseDue() {
  for (const [name, k] of heldKeys) {
    if (!k.release || !seen(k)) continue;
    key(name, false);
    heldKeys.delete(name);
    // pressed again while still held: pressed twice
    if (k.again) { keyDown(name, k.again - 1); keyUp(name); }
  }
  for (const [b, h] of heldButtons) {
    if (!h.release || !seen(h)) continue;
    mouseEvent('mouseup', b);
    heldButtons.delete(b);
    // pressed again while this click was still held: a second click (a double click)
    if (h.again) { buttonDown(b, h.again - 1); buttonUp(b); }
  }
}

// ---------- the pointer ----------

// Where the page's pointer is, in the game's pixels (the canvas's size,
// the video mode), and mouse events on the canvas, where SDL listens
const pointer = { x: 160, y: 100 };
let movedAt = 0;                  // when the page last moved it
const gameSize = () => [$('canvas').width || 320, $('canvas').height || 200];
function clientOf(x, y) {
  const r = $('canvas').getBoundingClientRect();
  const [W, H] = gameSize();
  return [r.left + (x + 0.5) * r.width / W, r.top + (y + 0.5) * r.height / H];
}
function mouseEvent(type, button = 0) {
  const [x, y] = clientOf(pointer.x, pointer.y);
  let buttons = 0;
  for (const b of heldButtons.keys()) if (type !== 'mouseup' || b !== button) buttons |= b === 2 ? 2 : 1;
  if (type === 'mousedown') buttons |= button === 2 ? 2 : 1;
  $('canvas').dispatchEvent(new MouseEvent(type, {
    bubbles: true, cancelable: true, clientX: x, clientY: y, screenX: x, screenY: y, button, buttons,
  }));
}
function movePointer(x, y) {
  const [W, H] = gameSize();
  x = Math.min(Math.max(x, 0), W - 1);
  y = Math.min(Math.max(y, 0), H - 1);
  if (x === pointer.x && y === pointer.y) return;
  pointer.x = x;
  pointer.y = y;
  movedAt = performance.now();
  mouseEvent('mousemove');
}

// A game may move the pointer itself (Arena does, in its menus); the page's
// pointer follows, so the right stick carries on from where the game put it
function followGame() {
  if (performance.now() - movedAt < 200 || heldButtons.size || swing) return;
  const x = M._web_mouse_x(), y = M._web_mouse_y();
  if (Math.abs(x - pointer.x) <= 1 && Math.abs(y - pointer.y) <= 1) return;
  pointer.x = pointer.fx = x;
  pointer.y = pointer.fy = y;
}
const heldButtons = new Map();    // 0 (left) or 2 (right) -> { since, frame, release, again }
function buttonDown(b, again = 0) {
  const h = heldButtons.get(b);
  if (h) {
    if (h.release) h.again++;
    return;
  }
  heldButtons.set(b, { since: performance.now(), frame: running ? M._web_frames() : 0, release: false, again });
  mouseEvent('mousedown', b);
}
function buttonUp(b) { const h = heldButtons.get(b); if (h) h.release = true; }

// A weapon swing: the right button held while the pointer sweeps across,
// as the games read a swing from the mouse. dx, dy: the stroke's direction.
let swing = null;
function startSwing(dx, dy) {
  if (swing) return;
  const [W, H] = gameSize();
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len, reach = W * 0.12;
  // across the middle of the view (above the games' bottom panels)
  const cx = W / 2, cy = H * 0.4;
  swing = { back: { x: pointer.x, y: pointer.y }, from: { x: cx - ux * reach, y: cy - uy * reach }, to: { x: cx + ux * reach, y: cy + uy * reach }, step: 0, frame: 0, at: 0 };
}
function runSwing() {
  if (!swing) return;
  const s = swing, frame = M._web_frames(), now = performance.now();
  // each step waits for the game to draw a frame since the last
  if (s.step && (frame === s.frame || now - s.at < 30)) return;
  s.frame = frame;
  s.at = now;
  if (s.step === 0) movePointer(Math.round(s.from.x), Math.round(s.from.y)), buttonDown(2);
  else if (s.step <= 4) {
    const t = s.step / 4;
    movePointer(Math.round(s.from.x + (s.to.x - s.from.x) * t), Math.round(s.from.y + (s.to.y - s.from.y) * t));
  } else if (s.step === 5) buttonUp(2);
  else if (!heldButtons.has(2)) {
    movePointer(s.back.x, s.back.y);
    swing = null;
    return;
  }
  s.step++;
}

// ---------- controller ----------

// The car adds a "Tesla Virtual Gamepad" (standard layout) for a controller
// it recognises, next to the controller's own raw device, and both report
// every press under different numbers. So when any standard pad is present,
// buttons come only from standard pads; raw pads add only D-pad directions
// from their axes. Without a standard pad, raw pads are read with the usual
// raw layout (A 0, B 1, X 3, Y 4, L 6, R 7, Select 10, Start 11).
const dead = (v, d = 0.2) => Math.abs(v) < d ? 0 : v;
function readPads() {
  const s = { held: new Set(), lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0 };
  const pads = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean);
  const standard = pads.filter(p => p.mapping === 'standard');
  const raw = pads.filter(p => p.mapping !== 'standard');
  for (const p of standard.length ? standard : raw) readPad(p, s);
  if (standard.length) for (const p of raw) padDirs(p, s);
  return s;
}
function padDirs(p, s) {
  const ax = p.axes;
  if (ax[1] < -0.5) s.held.add('up');
  if (ax[1] > 0.5) s.held.add('down');
  if (ax[0] < -0.5) s.held.add('left');
  if (ax[0] > 0.5) s.held.add('right');
}
// By position: a is the bottom face button (A on Xbox pads), b the right
function readPad(p, s) {
  const on = i => p.buttons[i] && p.buttons[i].pressed;
  if (p.mapping !== 'standard') {
    padDirs(p, s);
    for (const [i, b] of [[0, 'a'], [1, 'b'], [3, 'x'], [4, 'y'], [6, 'lb'], [7, 'rb'], [10, 'back'], [11, 'start']]) if (on(i)) s.held.add(b);
    return;
  }
  const ax = p.axes;
  s.lx += dead(ax[0] || 0); s.ly += dead(ax[1] || 0);
  s.rx += dead(ax[2] || 0, 0.15); s.ry += dead(ax[3] || 0, 0.15);
  s.lt = Math.max(s.lt, p.buttons[6]?.value || 0);
  s.rt = Math.max(s.rt, p.buttons[7]?.value || 0);
  for (const [i, b] of [[0, 'a'], [1, 'b'], [2, 'x'], [3, 'y'], [4, 'lb'], [5, 'rb'], [8, 'back'], [9, 'start'], [10, 'ls'], [11, 'rs'],
                        [12, 'up'], [13, 'down'], [14, 'left'], [15, 'right']]) if (on(i)) s.held.add(b);
}

// While a controller is in use the bar says so; touching the screen ends it
let padMode = false;
function setPadMode(on) {
  if (on === padMode) return;
  padMode = on;
  $('padNote').hidden = !on;
}

let lastHeld = new Set();
const moveKeys = new Set();       // arrow keys held for walking
let backUsed = false, lastT = 0, swingAgain = 0;
const POINTER_SPEED = 1.1;        // screen widths a second at full tilt

function pad(t) {
  const s = readPads();
  const G = GAMES[game].keys;
  const pressed = b => s.held.has(b) && !lastHeld.has(b);
  const released = b => !s.held.has(b) && lastHeld.has(b);
  const dt = Math.min(0.05, (t - (lastT || t)) / 1000);
  lastT = t;
  if (s.held.size || s.lx || s.ly || s.rx || s.ry || s.lt > 0.3 || s.rt > 0.3) setPadMode(true);

  // Select held: the D-pad moves the pointer (for pads without a right stick)
  const dpadPointer = s.held.has('back');
  let px = s.rx, py = s.ry;
  if (dpadPointer) {
    if (s.held.has('left')) px -= 0.6;
    if (s.held.has('right')) px += 0.6;
    if (s.held.has('up')) py -= 0.6;
    if (s.held.has('down')) py += 0.6;
    if (['up', 'down', 'left', 'right'].some(d => s.held.has(d))) backUsed = true;
  }
  if (px || py) {
    const [W] = gameSize();
    const mag = Math.min(1, Math.hypot(px, py));
    const speed = W * POINTER_SPEED * mag * mag / Math.max(mag, 1e-6);
    pointer.fx = (pointer.fx ?? pointer.x) + px * speed * dt;
    pointer.fy = (pointer.fy ?? pointer.y) + py * speed * dt;
    movePointer(Math.round(pointer.fx), Math.round(pointer.fy));
    pointer.fx = Math.min(Math.max(pointer.fx, 0), gameSize()[0] - 1);
    pointer.fy = Math.min(Math.max(pointer.fy, 0), gameSize()[1] - 1);
  } else {
    pointer.fx = pointer.x;
    pointer.fy = pointer.y;
  }

  // walking: the left stick or the D-pad hold the arrow keys
  const want = new Set();
  if (s.ly < -0.4 || (!dpadPointer && s.held.has('up'))) want.add('up');
  if (s.ly > 0.4 || (!dpadPointer && s.held.has('down'))) want.add('down');
  if (s.lx < -0.4 || (!dpadPointer && s.held.has('left'))) want.add('left');
  if (s.lx > 0.4 || (!dpadPointer && s.held.has('right'))) want.add('right');
  for (const k of want) if (!moveKeys.has(k)) { moveKeys.add(k); keyDown(k); }
  for (const k of moveKeys) if (!want.has(k)) { moveKeys.delete(k); keyUp(k); }

  // running: held with the left trigger
  if (s.lt > 0.5 && !heldKeys.has(G.run)) keyDown(G.run);
  else if (s.lt <= 0.3 && heldKeys.has(G.run) && !heldKeys.get(G.run).release) keyUp(G.run);

  // the mouse buttons follow A and B
  if (pressed('a')) buttonDown(0);
  if (released('a')) buttonUp(0);
  if (pressed('b')) buttonDown(2);
  if (released('b')) buttonUp(2);

  // swings, again and again while the trigger stays down
  if (s.rt > 0.5 && !swing && t >= swingAgain) {
    const aim = Math.hypot(s.rx, s.ry) > 0.5;
    startSwing(aim ? s.rx : 1, aim ? s.ry : 0);
    swingAgain = t + 550;
  }

  for (const b of ['x', 'y', 'lb', 'rb', 'ls', 'rs']) if (pressed(b)) tapKey(G[b]);
  if (pressed('start')) tapKey('escape');
  if (pressed('back')) backUsed = false;
  if (released('back') && !backUsed) tapKey(G.map);
  lastHeld = s.held;
}

function loop(t) {
  if (!running) return;
  requestAnimationFrame(loop);
  fit();
  if (document.hidden) return;
  followGame();
  if (game) pad(t);
  runSwing();
  releaseDue();
}

// ---------- touch ----------

const HOLD = 450;         // ms a still finger takes to press the right button
const SLOP = 10;          // px a finger may wander and still tap
let finger = null;        // { id, x0, y0, gesture: 'tap' | 'drag' | 'held' }
let holdTimer = 0;

// The game pixel under a point on the screen
function gameOf(clientX, clientY) {
  const r = $('canvas').getBoundingClientRect();
  const [W, H] = gameSize();
  return [Math.floor((clientX - r.left) * W / r.width), Math.floor((clientY - r.top) * H / r.height)];
}

const touchLayer = $('touch');
touchLayer.addEventListener('touchstart', e => {
  e.preventDefault();
  setPadMode(false);
  if (finger) return;
  const t = e.changedTouches[0];
  finger = { id: t.identifier, x0: t.clientX, y0: t.clientY, gesture: 'tap' };
  movePointer(...gameOf(t.clientX, t.clientY));
  clearTimeout(holdTimer);
  holdTimer = setTimeout(() => {
    if (finger?.gesture !== 'tap') return;
    finger.gesture = 'held';
    buttonDown(2);
  }, HOLD);
}, { passive: false });

touchLayer.addEventListener('touchmove', e => {
  e.preventDefault();
  const t = [...e.changedTouches].find(c => c.identifier === finger?.id);
  if (!t) return;
  if (finger.gesture === 'tap' && Math.hypot(t.clientX - finger.x0, t.clientY - finger.y0) > SLOP) {
    clearTimeout(holdTimer);
    finger.gesture = 'drag';
    buttonDown(0);
  }
  movePointer(...gameOf(t.clientX, t.clientY));
}, { passive: false });

function touchEnd(e) {
  e.preventDefault();
  if (!finger || ![...e.changedTouches].some(c => c.identifier === finger.id)) return;
  clearTimeout(holdTimer);
  if (finger.gesture === 'tap') { buttonDown(0); buttonUp(0); }
  else if (finger.gesture === 'drag') buttonUp(0);
  else buttonUp(2);
  finger = null;
}
touchLayer.addEventListener('touchend', touchEnd, { passive: false });
touchLayer.addEventListener('touchcancel', touchEnd, { passive: false });

// A real mouse goes straight through to the game, and moves the page's pointer
for (const type of ['mousedown', 'mousemove', 'mouseup', 'wheel']) {
  touchLayer.addEventListener(type, e => {
    if (!e.isTrusted) return;
    const [x, y] = gameOf(e.clientX, e.clientY);
    const [W, H] = gameSize();
    pointer.x = Math.min(Math.max(x, 0), W - 1);
    pointer.y = Math.min(Math.max(y, 0), H - 1);
    movedAt = performance.now();
    $('canvas').dispatchEvent(new e.constructor(e.type, e));
  });
}
touchLayer.addEventListener('contextmenu', e => e.preventDefault());

$('menuBtn').onclick = () => tapKey('escape');

// ---------- typing ----------

// SDL scancodes for what the car's keyboard types
const TYPED = { '\n': 'enter', ' ': 'space', '-': 'minus', '=': 'equals', "'": 'quote', ',': 'comma', '.': 'period', '/': 'slash' };
const KEYS = { Enter: 'enter', Escape: 'escape', Backspace: 'backspace', Tab: 'tab' };

// Key presses, one after another, each held until the game has seen it
let typing = Promise.resolve();
const until = test => new Promise(resolve => { const check = () => test() ? resolve() : setTimeout(check, 15); check(); });
function press(names, shift = false) {
  typing = typing.then(async () => {
    for (const name of names) {
      if (shift) keyDown('lshift');
      keyDown(name);
      keyUp(name);
      await until(() => !heldKeys.has(name));
      if (shift) { keyUp('lshift'); await until(() => !heldKeys.has('lshift')); }
    }
  });
}
function typeText(text) {
  for (const ch of text) {
    const lower = ch.toLowerCase();
    const name = TYPED[lower] || (SC[lower] != null && /^[a-z0-9]$/.test(lower) ? lower : null);
    if (name) press([name], ch !== lower);
  }
}

const kbd = $('kbd');
// pressing the button takes the focus from the field, so whether the
// keyboard was up is read before that
let kbdWasUp = false;
$('keysBtn').addEventListener('pointerdown', () => { kbdWasUp = document.activeElement === kbd; });
$('keysBtn').onclick = () => {
  if (kbdWasUp) kbd.blur();
  else kbd.focus();
  kbdWasUp = false;
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
  if (e.inputType === 'deleteContentBackward') press(['backspace']);
  else if (e.inputType === 'insertLineBreak') press(['enter']);
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
    // the game stops until the page is back
    if (!M.webHold) M.webHold = new Promise(resolve => { M.webResume = resolve; });
  } else {
    if (M.webHold) { const resume = M.webResume; M.webHold = M.webResume = null; resume(); }
    if (soundOn()) wakeSound();
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
