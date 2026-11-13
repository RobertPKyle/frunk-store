// A DOS game in DOSBox, played with the keyboard, a controller or on-screen
// buttons: the common part of the shareware DOS game apps (Death Rally,
// Wolfenstein 3D, Commander Keen 1). The engine is em-dosbox compiled to WebAssembly by
// tools/build-dos.mjs (with tools/elderscrolls/em-dosbox-web.patch), at
// engine/ in the app; the game's files are packed by tools/supertux/pack.mjs
// into 1 MB blocks at data/<version>/<n>.bin, all fetched before the game
// starts and kept in IndexedDB (database <id>) for next time.
//
// The page mounts the files at /game/<id>; DOSBox mounts that as C: with an
// overlay drive on /save/<id> (IDBFS) for whatever the game writes (its
// settings, saved games, high scores), written back now and then, when the
// page is hidden and when it's left. The engine's read import (fd_read) is
// wrapped with JSPI (WebAssembly.Suspending), so a read whose block isn't in
// memory yet suspends DOSBox until it is; DOSBox's own loop runs inside
// main() and lets the page run every 10 ms or so the same way.
//
// Keys reach the game through web_key (SDL scancodes). The page's controller
// buttons and on-screen buttons each hold one or more keys; a key the page
// presses is let go no sooner than two of DOSBox's frames after it went
// down, so a game that polls the keyboard once a frame sees it. Keyboard
// brings up the car's keyboard for names and the games' other keys.
// #inputBtn (inputswap.js) swaps between the on-screen buttons and a
// controller; both kinds of input work either way.
//
//   import { dosGame } from '../_shared/dosgame.js';
//   dosGame({ id, title, memsize, dir: 'DIR', exe: 'GAME.EXE', pad: {...}, seed: {...} });
//   (?run=OTHER.EXE runs another program from the game's folder, for setup)
//
// pad: for each controller button (a, b, x, y, lb, rb, lt, rt, ls, rs,
// start, back) the key names it holds (an array), or a function called when
// it's pressed that returns them. The left stick and D-pad hold the arrow
// keys (pad.axes can rename them: { up, down, left, right }).
// seed: files written into the save overlay the first time ({ 'DIR/FILE':
// Uint8Array }), such as a sound setup the game would otherwise ask for.
// pcSpeaker: true for a game whose only sound is the PC speaker.
//
// The page needs: #start with #play (and #kept, #status), #loading with
// #loadTitle #loadText #loadBar, #failed with #failedText #failedOk, #player
// with #title #wait #inputBtn #menuBtn #keysBtn #smoothBtn #soundBtn #quitBtn,
// #screen > #canvas, #touch (buttons with data-key="name name"), #kbd.

import { fetchBlock, padMenu, reason, secondTap } from './gamepage.js';
import { inputSwap } from './inputswap.js';

export function dosGame(G) {

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem(`${G.id}.${key}`)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(`${G.id}.${key}`, JSON.stringify(value)); } catch {} },
};
const DATA = 'data/';
const ENGINE = 'engine/';
const SAVES = '/save';
const KEEP = 64;          // blocks kept in memory (64 MB; these games are far smaller)
const PARALLEL = 6;       // block downloads at once
const MB = n => n < 1e6 ? 'Under 1 MB' : `${Math.round(n / 1e6)} MB`;
// ?touch=1 or ?touch=0 overrides it (for testing)
const touchFirst = params.has('touch') ? params.get('touch') !== '0' : !matchMedia('(hover: hover) and (pointer: fine)').matches;

// ---------- blocks: memory, IndexedDB, network ----------

let index = null;         // data/index.json: { version, block, blocks, bytes, boot, gz, files }
const mem = new Map();    // block -> Uint8Array
const pending = new Map();  // block -> promise
const stats = { fetched: 0, fromDb: 0, waits: 0, waitMs: 0, maxWaitMs: 0 };

const idb = (() => {
  let db = null;
  const open = () => db || (db = new Promise((resolve, reject) => {
    const req = indexedDB.open(G.id, 1);
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
const blockKey = n => `${index.version}/${n}`;

async function download(n) {
  const packed = index.gz.includes(n);
  const buf = await fetchBlock(`${DATA}${index.version}/${n}.bin${packed ? '.gz' : ''}`, packed);
  stats.fetched++;
  // ArrayBuffers, not Blobs: Blobs from IndexedDB have failed to read in the car
  idb.put(blockKey(n), buf).catch(() => {});
  return new Uint8Array(buf);
}

function keep(n, bytes) {
  mem.delete(n);
  mem.set(n, bytes);
  for (const old of mem.keys()) {
    if (mem.size <= KEEP) break;
    mem.delete(old);
  }
}

// A block, in memory, from IndexedDB or the network
function load(n) {
  if (mem.has(n)) { const b = mem.get(n); mem.delete(n); mem.set(n, b); return Promise.resolve(b); }
  if (pending.has(n)) return pending.get(n);
  const p = (async () => {
    let buf = null;
    try { buf = await idb.get(blockKey(n)); } catch {}
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

function mountData(M) {
  FS = M.FS;
  const EIO = 29;
  const B = index.block;
  const base = `/game/${G.id}`;
  // Reads come from the blocks in memory; fd_read (below) has made sure they are there
  const read = (stream, buffer, offset, length, position) => {
    const f = stream.node.st;
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
    return len;
  };
  const dirs = new Set();
  let at = 0, ops = null;
  for (const [path, size] of index.files) {
    const full = `${base}/${path}`;
    const dir = full.slice(0, full.lastIndexOf('/'));
    if (!dirs.has(dir)) { FS.mkdirTree(dir); dirs.add(dir); }
    // writable as far as DOS can tell; writes go to the overlay drive,
    // which copies a file there before changing it
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
  const t = performance.now();
  const slow = setTimeout(() => { $('wait').hidden = false; }, 300);
  return Promise.all(want.map(load)).finally(() => {
    clearTimeout(slow);
    $('wait').hidden = true;
    const ms = performance.now() - t;
    stats.waits++;
    stats.waitMs += ms;
    stats.maxWaitMs = Math.max(stats.maxWaitMs, ms);
  });
}

// ---------- start screen ----------

function status(text) { if ($('status')) $('status').textContent = text; }

async function fetchIndex() {
  const res = await fetch(`${DATA}index.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  index = await res.json();
  return index;
}

async function showKept() {
  if (!$('kept')) return;
  try {
    if (!index) await fetchIndex();
    const keys = await idb.keys();
    const count = keys.filter(k => k.startsWith(`${index.version}/`)).length;
    // blocks of an older build of the data
    const old = keys.filter(k => !k.startsWith(`${index.version}/`));
    if (old.length) idb.del(old).catch(() => {});
    $('kept').textContent = count >= index.blocks ? 'Downloaded, plays without a connection.' : `${MB(index.bytes)} to download the first time.`;
  } catch { $('kept').textContent = ''; }
}

// ---------- the game ----------

let started = false, running = false;
const log = [];
const remember = line => { log.push(String(line)); if (log.length > 300) log.shift(); };

function loading(text, fraction) {
  $('loading').hidden = false;
  $('loadText').textContent = text;
  $('loadBar').hidden = fraction == null;
  if (fraction != null) $('loadBar').value = fraction;
}

function failed(message, title) {
  if (title) $('failedTitle').textContent = title;
  $('failedText').textContent = message || 'Something went wrong.';
  $('failed').hidden = false;
  $('loading').hidden = true;
}
$('failedOk').onclick = () => location.reload();
padMenu();

// The game's sound: every AudioContext it makes (SDL makes one)
const contexts = [];
if (window.AudioContext) {
  const Real = window.AudioContext;
  window.AudioContext = class extends Real {
    constructor(...args) { super(...args); contexts.push(this); showSound(); }
  };
}

let M = null;

// DOSBox's settings: a VGA card, a Sound Blaster 16 with its FM synth at
// 220h, IRQ 7, DMA 1 (DOSBox sets the BLASTER variable to match, which the
// games' sound setups read), the CPU as fast as the car allows, no DOSBox
// joystick (the page reads the controller), and the game started from C:,
// the game's files with an overlay for what it writes
function dosboxConf() {
  return [
    '[sdl]', 'fullscreen=false', 'output=surface', 'autolock=false', 'sensitivity=100', 'waitonerror=false', 'usescancodes=true',
    `[dosbox]`, `machine=${params.get('machine') || G.machine || 'svga_s3'}`, `memsize=${G.memsize || 16}`,
    '[render]', 'frameskip=0', 'aspect=false', 'scaler=none',
    '[cpu]', `core=${params.get('core') || G.core || 'normal'}`, 'cputype=auto', `cycles=${params.get('cycles') || G.cycles || 'max'}`,
    '[mixer]', 'nosound=false', 'rate=48000', 'blocksize=2048', 'prebuffer=40',
    '[midi]', 'mpu401=none', 'mididevice=none',
    '[sblaster]', 'sbtype=sb16', 'sbbase=220', 'irq=7', 'dma=1', 'hdma=5', 'sbmixer=true', 'oplmode=auto', 'oplemu=default', 'oplrate=48000',
    '[gus]', 'gus=false',
    '[speaker]', `pcspeaker=${G.pcSpeaker ? 'true' : 'false'}`, 'tandy=off', 'disney=false',
    '[joystick]', 'joysticktype=none',
    '[serial]', 'serial1=disabled', 'serial2=disabled', 'serial3=disabled', 'serial4=disabled',
    '[dos]', 'xms=true', 'ems=true', 'umb=true', 'keyboardlayout=none',
    '[ipx]', 'ipx=false',
    '[autoexec]', '@echo off', `mount c /game/${G.id}`, `mount -t overlay c ${SAVES}/${G.id}`, 'c:', `cd ${G.dir}`, params.get('run') || G.exe, 'exit', '',
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

// What the game wrote (settings, saved games) goes back to IndexedDB
let syncing = false, syncAgain = false;
function syncfs() {
  return new Promise(resolve => {
    if (!FS) return resolve();
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

async function play() {
  if (started) return;
  started = true;
  for (const b of document.querySelectorAll('.play')) b.disabled = true;
  $('loadTitle').textContent = G.title;
  $('title').textContent = G.title;
  try { navigator.storage?.persist?.(); } catch {}
  loading('Getting ready…', null);
  try {
    if (!index) await fetchIndex();
    // the whole game, all at once
    let done = 0;
    loading('Loading the game…', 0);
    await each(index.blocks, async n => {
      await load(n);
      done++;
      loading(index.bytes > 2e6 ? `Loading the game… ${Math.min(done, Math.round(index.bytes / 1e6))} of ${MB(index.bytes)}` : 'Loading the game…', done / index.blocks);
    });
  } catch (err) {
    return failed(`Couldn't download the game. ${reason(err, 'Check the connection and try again.')}`, 'Couldn\'t start the game');
  }
  loading('Starting…', null);
  start();
}
for (const b of document.querySelectorAll('.play')) b.onclick = play;

async function start() {
  const canvas = $('canvas');
  let createDosbox;
  try {
    // relative to the page, not this module
    ({ default: createDosbox } = await import(new URL(`${ENGINE}dosbox.js`, location.href).href));
  } catch {
    return failed('Couldn\'t load the game. Check the connection and try again.', 'Couldn\'t start the game');
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
    // Reads wait for their blocks: fd_read suspends DOSBox (JSPI) when they aren't in memory
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
      }, err => failed(`Couldn't load the game. ${reason(err, 'Check the connection and try again.')}`, 'Couldn\'t start the game'));
      return {};
    },
    preRun: [Mod => {
      mountData(Mod);
      Mod.FS.mkdirTree(SAVES);
      Mod.FS.mount(Mod.IDBFS, {}, SAVES);
      Mod.addRunDependency('saves');
      Mod.FS.syncfs(true, err => {
        if (err) console.warn('loading saves failed', err);
        Mod.FS.mkdirTree(`${SAVES}/${G.id}`);
        for (const d of G.dirs || []) Mod.FS.mkdirTree(`${SAVES}/${G.id}/${d}`);
        // the first time: the files the game would otherwise ask for
        for (const [path, bytes] of Object.entries(G.seed || {})) {
          const full = `${SAVES}/${G.id}/${path}`;
          if (Mod.FS.analyzePath(full).exists) continue;
          Mod.FS.mkdirTree(full.slice(0, full.lastIndexOf('/')));
          Mod.FS.writeFile(full, bytes);
        }
        Mod.FS.writeFile('/dosbox.conf', dosboxConf());
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
  requestAnimationFrame(loop);
  // main() runs DOSBox, until the game quits
  M.callMain(config.arguments);
}

window.dosStats = () => ({
  game: G.id, started, running, ...stats, inMemory: mem.size, heapMB: memory ? Math.round(memory.buffer.byteLength / 1e6) : 0,
  frames: running ? M._web_frames() : 0, cycles: running ? M._web_cycles() : 0,
  canvas: `${$('canvas').width}x${$('canvas').height}`, held: [...heldKeys.keys()], padMode: input.mode === 'pad', touch: !$('touch').hidden,
  audio: contexts.map(c => `${c.state} ${c.sampleRate}`),
});
window.dosLog = log;
window.dosFS = () => FS;

// ---------- keys ----------

// SDL scancodes
const SC = {
  enter: 40, escape: 41, backspace: 42, tab: 43, space: 44, minus: 45, equals: 46, quote: 52, comma: 54, period: 55, slash: 56,
  f1: 58, f2: 59, f3: 60, f4: 61, f5: 62, f6: 63, f7: 64, f8: 65, f9: 66, f10: 67, f11: 68, f12: 69,
  insert: 73, home: 74, pageup: 75, delete: 76, end: 77, pagedown: 78, right: 79, left: 80, down: 81, up: 82,
  lctrl: 224, lshift: 225, lalt: 226, rctrl: 228, rshift: 229, ralt: 230, pause: 72,
};
for (let i = 0; i < 26; i++) SC[String.fromCharCode(97 + i)] = 4 + i;
for (let i = 1; i <= 9; i++) SC[String(i)] = 29 + i;
SC['0'] = 39;

function key(name, down) {
  if (running && SC[name] != null) M._web_key(SC[name], down ? 1 : 0);
}

// Keys held down by the page, each counted by the sources holding it (a
// controller button and an on-screen button may hold the same key); a key
// is let go no sooner than two of DOSBox's frames (and 70 ms) after it went
// down, so the game sees it
const heldKeys = new Map();       // name -> { since, frame, holders, release, again }
function keyDown(name, again = 0) {
  const k = heldKeys.get(name);
  if (k) {
    k.holders++;
    if (k.release) { k.release = false; k.again++; }
    return;
  }
  key(name, true);
  heldKeys.set(name, { since: performance.now(), frame: running ? M._web_frames() : 0, holders: 1, release: false, again });
}
function keyUp(name) {
  const k = heldKeys.get(name);
  if (!k) return;
  k.holders = Math.max(0, k.holders - 1);
  if (!k.holders) k.release = true;
}
const tapKey = name => { keyDown(name); keyUp(name); };
const keysDown = names => { for (const n of names) keyDown(n); };
const keysUp = names => { for (const n of names) keyUp(n); };

// a key is let go once the game has drawn 2 frames since, or after 200 ms on a
// still picture: under DOSBox's 500 ms key repeat and the ~300 ms some games
// (Blake Stone's menus) count as a second press
const seen = h => performance.now() - h.since >= 70 && (!running || M._web_frames() - h.frame >= 2 || performance.now() - h.since >= 200);
function releaseDue() {
  for (const [name, k] of heldKeys) {
    if (!k.release || !seen(k)) continue;
    key(name, false);
    heldKeys.delete(name);
    // pressed again while still held: pressed twice
    if (k.again) { keyDown(name, k.again - 1); keyUp(name); }
  }
}

// ---------- on-screen buttons ----------

// Each holds its keys (data-key="space", or several) while a finger is on
// it. They show in touch mode and hide in controller mode: the button on the
// bar swaps the two. Until it's tapped, the mode follows the player: a touch
// screen starts with them, a controller press hides them and a touch brings
// them back; once tapped, only the button changes it (kept per game).
const input = inputSwap({
  id: G.id, button: $('inputBtn'), start: touchFirst ? 'touch' : 'pad',
  apply: mode => { $('touch').hidden = mode === 'pad'; },
});
for (const b of $('touch').querySelectorAll('button')) {
  const names = b.dataset.key.split(/\s+/).filter(Boolean);
  let down = false;
  const press = e => { e.preventDefault(); if (down) return; down = true; b.setPointerCapture?.(e.pointerId); b.classList.add('held'); keysDown(names); };
  const lift = e => { e.preventDefault(); if (!down) return; down = false; b.classList.remove('held'); keysUp(names); };
  b.addEventListener('pointerdown', press);
  b.addEventListener('pointerup', lift);
  b.addEventListener('pointercancel', lift);
  b.addEventListener('lostpointercapture', lift);
  b.addEventListener('contextmenu', e => e.preventDefault());
}
addEventListener('touchstart', () => input.auto('touch'), { capture: true, passive: true });
$('menuBtn').onclick = () => tapKey('escape');

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

const BUTTONS = ['a', 'b', 'x', 'y', 'lb', 'rb', 'ls', 'rs', 'start', 'back'];
const AXES = { up: 'up', down: 'down', left: 'left', right: 'right', ...(G.pad.axes || {}) };
const padHeld = new Map();        // button or axis -> the key names it holds
// v is the pad entry: key names, or a function giving them (or doing its own
// thing), called once per press
function padHold(what, v) {
  if (padHeld.has(what)) return;
  const names = keysOf(v);
  padHeld.set(what, names);
  keysDown(names);
}
function padLet(what) {
  const names = padHeld.get(what);
  if (!names) return;
  padHeld.delete(what);
  keysUp(names);
}
const keysOf = v => typeof v === 'function' ? v() : v;

function pad() {
  const s = readPads();
  if (s.held.size || s.lx || s.ly || s.rx || s.ry || s.lt > 0.3 || s.rt > 0.3) input.auto('pad');

  // the left stick and the D-pad hold the arrow keys
  const want = new Set();
  if (s.ly < -0.4 || s.held.has('up')) want.add('up');
  if (s.ly > 0.4 || s.held.has('down')) want.add('down');
  if (s.lx < -0.4 || s.held.has('left')) want.add('left');
  if (s.lx > 0.4 || s.held.has('right')) want.add('right');
  for (const d of ['up', 'down', 'left', 'right']) {
    if (want.has(d)) padHold(`axis:${d}`, [AXES[d]].flat());
    else padLet(`axis:${d}`);
  }
  // the right stick, where a game uses it
  if (G.pad.rx) {
    if (s.rx < -0.5) padHold('rx-', G.pad.rx[0]); else padLet('rx-');
    if (s.rx > 0.5) padHold('rx+', G.pad.rx[1]); else padLet('rx+');
  }
  if (G.pad.ry) {
    if (s.ry < -0.5) padHold('ry-', G.pad.ry[0]); else padLet('ry-');
    if (s.ry > 0.5) padHold('ry+', G.pad.ry[1]); else padLet('ry+');
  }
  // the triggers
  for (const [t, v] of [['lt', s.lt], ['rt', s.rt]]) {
    if (!G.pad[t]) continue;
    if (v > 0.5) padHold(t, G.pad[t]);
    else if (v < 0.3) padLet(t);
  }
  // the buttons: each holds its keys while it's down
  for (const b of BUTTONS) {
    if (!G.pad[b]) continue;
    if (s.held.has(b)) padHold(b, G.pad[b]);
    else padLet(b);
  }
}

function loop() {
  if (!running) return;
  requestAnimationFrame(loop);
  fit();
  if (document.hidden) return;
  pad();
  releaseDue();
}

// Taps on the game itself (outside the on-screen buttons) go to the game as
// Enter, if the game wants that (its "press a key" screens)
if (G.tapKey) {
  $('screen').addEventListener('pointerdown', e => {
    if (e.target.closest('button') || e.target === $('kbd')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    tapKey(G.tapKey);
  });
}
$('screen').addEventListener('contextmenu', e => e.preventDefault());

// A real keyboard goes straight to the game: SDL listens for keys on the
// window. (The car's keyboard types into #kbd below, which keeps its keys
// from the window.)

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
secondTap($('quitBtn'), async () => {
  if (leaving) return;
  leaving = true;
  await syncfs();
  location.reload();
});

document.addEventListener('visibilitychange', () => {
  if (!running) return;
  if (document.hidden) {
    // nothing stays pressed
    for (const what of [...padHeld.keys()]) padLet(what);
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
return { tapKey, keyDown, keyUp };
}
