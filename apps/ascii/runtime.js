// The PC the translated Kroz games run on, inside worker.js: an 80x25
// text screen that behaves like Turbo Pascal's Crt unit, the BIOS keyboard,
// the PC speaker, a small disk for saves and high scores, and a clock.
//
// The games were written for 1990 PCs and pace themselves by how fast the
// CPU runs: the main loop counts to 800 between monster moves, sound effects
// are loops of Sound calls. So each call into this file costs some time on
// a made-up clock (about what it took on a PC AT), and the worker sleeps
// whenever that clock runs ahead of the real one. Delay is real time.
//
// Shared memory with the page (ascii.js): the screen as one 16-bit cell per
// character (code | attribute << 8), a few control values, and a ring of key
// presses (BIOS style: ASCII | scan code << 8). The speaker's changes go to
// the page's AudioWorklet (speaker.js) with their times on the clock.

export const crt = { textattr: 7, lastmode: 3, checkbreak: true, directvideo: true, checksnow: false };

// ctrl[] slots, shared with ascii.js
export const CTRL = { CURX: 0, CURY: 1, CURSOR: 2, BORDER: 3, LINE: 4, PX: 5, PY: 6, SLEEP: 7, SPEED: 8, BUSY: 9 };
export const KEY_SLOTS = 64;

let screen = null, ctrl = null, keys = null, audio = null, onFile = () => {}, state = null;
let cx = 1, cy = 1;
const win = { x1: 1, y1: 1, x2: 80, y2: 25 };

// ---------- clock ----------

// Microseconds each kind of call took on a PC AT, roughly; tuned so that
// monsters move and sounds last about as they did
const COST = { key: 24, read: 10, call: 14, char: 6, goto: 6, color: 1, sound: 12, random: 3 };
let vt = 0, speed = 1, lastFlush = 0;
const now = () => performance.now();

function spend(us) {
  vt += us * speed / 1000;
  if (vt > now() + 2) pause();
}

// Sleeps until the made-up clock and the real one agree
function pause() {
  flushSound();
  publish();
  if (ctrl[CTRL.SPEED]) speed = ctrl[CTRL.SPEED] / 100;
  const t = now();
  if (vt < t - 60) vt = t - 60;   // never owe more than a moment when the device is slow
  const ahead = vt - t;
  if (ahead > 0) Atomics.wait(ctrl, CTRL.SLEEP, 0, ahead);
}

// Makes up for time spent waiting on the player
function caughtUp() { vt = Math.max(vt, now()); }

export function delay(ms) {
  vt += Math.max(0, ms | 0);
  if (vt > now()) pause();
}

// ---------- speaker ----------

// Sound(Hz) as Turbo Pascal does it: frequencies up to 18 Hz don't fit the
// timer and are ignored; the rest become the nearest timer rate
let events = [];
let tone = 0;
function speaker(hz) {
  if (hz === tone) return;
  tone = hz;
  events.push(vt, hz);
  if (events.length > 512 || vt - lastFlush > 12) flushSound();
}
export function sound(hz) {
  spend(COST.sound);
  hz &= 65535;
  if (hz <= 18) return;
  speaker(1193180 / Math.floor(1193180 / hz));
}
export function nosound() {
  spend(COST.sound);
  speaker(0);
}
function flushSound() {
  lastFlush = vt;
  if (!events.length) return;
  if (audio) {
    const t = new Float64Array(events.length / 2), f = new Float32Array(events.length / 2);
    for (let i = 0; i < events.length; i += 2) { t[i >> 1] = events[i]; f[i >> 1] = events[i + 1]; }
    audio.postMessage({ t, f }, [t.buffer, f.buffer]);
  }
  events = [];
}

// ---------- screen ----------

const cell = (x, y) => (y - 1) * 80 + (x - 1);

function put(code) { screen[cell(cx, cy)] = code | crt.textattr << 8; }

function blank(x1, y1, x2, y2) {
  const v = 32 | crt.textattr << 8;
  for (let y = y1; y <= y2; y++) screen.fill(v, cell(x1, y), cell(x2, y) + 1);
}

// Moves lines from..to of the window up (dir 1) or down (dir -1) by one
function scroll(from, to, dir) {
  if (dir > 0) {
    for (let y = from; y < to; y++) screen.copyWithin(cell(win.x1, y), cell(win.x1, y + 1), cell(win.x2, y + 1) + 1);
    blank(win.x1, to, win.x2, to);
  } else {
    for (let y = to; y > from; y--) screen.copyWithin(cell(win.x1, y), cell(win.x1, y - 1), cell(win.x2, y - 1) + 1);
    blank(win.x1, from, win.x2, from);
  }
}

function lineFeed() {
  if (cy < win.y2) cy++;
  else scroll(win.y1, win.y2, 1);
}

function writeCode(c) {
  switch (c) {
    case 7: beep(); return;
    case 8: if (cx > win.x1) cx--; return;
    case 10: lineFeed(); return;
    case 13: cx = win.x1; return;
  }
  put(c);
  if (++cx > win.x2) { cx = win.x1; lineFeed(); }
}

function beep() {
  speaker(1193180 / Math.floor(1193180 / 800));
  vt += 100;
  speaker(0);
}

export function write(s) {
  spend(COST.call + COST.char * s.length);
  for (let i = 0; i < s.length; i++) writeCode(s.charCodeAt(i));
}

export function gotoxy(x, y) {
  spend(COST.goto);
  const ax = win.x1 + x - 1, ay = win.y1 + y - 1;
  if (x < 1 || y < 1 || ax > win.x2 || ay > win.y2) return;
  cx = ax; cy = ay;
}
export const wherex = () => cx - win.x1 + 1;
export const wherey = () => cy - win.y1 + 1;

export function textcolor(c) {
  spend(COST.color);
  crt.textattr = (crt.textattr & 0x70) | (c & 0x0f) | (c & 0xf0 ? 0x80 : 0);
}
export function textbackground(c) {
  spend(COST.color);
  crt.textattr = (crt.textattr & 0x8f) | ((c & 7) << 4);
}
export function lowvideo() { crt.textattr &= 0xf7; }
export function highvideo() { crt.textattr |= 0x08; }
export function normvideo() { crt.textattr = 7; }

export function window(x1, y1, x2, y2) {
  if (x1 < 1 || y1 < 1 || x2 > 80 || y2 > 25 || x1 > x2 || y1 > y2) return;
  Object.assign(win, { x1, y1, x2, y2 });
  cx = x1; cy = y1;
}
export function clrscr() {
  spend(COST.call + 200);
  blank(win.x1, win.y1, win.x2, win.y2);
  cx = win.x1; cy = win.y1;
}
export function clreol() { blank(cx, cy, win.x2, cy); }
export function insline() { scroll(cy, win.y2, -1); }
export function delline() { scroll(cy, win.y2, 1); }
export function textmode(mode) {
  crt.lastmode = mode;
  window(1, 1, 80, 25);
  crt.textattr = 7;
  clrscr();
}

// Video BIOS calls the games make: the cursor's shape and the border colour
export function intr(n, r) {
  const ah = r.ax >> 8;
  if (n !== 0x10) return;
  if (ah === 1) ctrl[CTRL.CURSOR] = r.cx & 0x2000 ? 0 : (r.cx & 0xff) - (r.cx >> 8) > 4 ? 2 : 1;
  else if (ah === 0x0b) ctrl[CTRL.BORDER] = r.bx & 15;
}

// Copies the cursor and the player's place where the page can see them
function publish() {
  ctrl[CTRL.CURX] = cx; ctrl[CTRL.CURY] = cy;
  if (state) {
    const [x, y] = state();
    ctrl[CTRL.PX] = x; ctrl[CTRL.PY] = y;
  }
}

// ---------- keyboard ----------

let ext = null;   // the second half of an extended key

const waiting = () => Atomics.load(keys, 0) > keys[1];
function takeKey() {
  for (;;) {
    const w = Atomics.load(keys, 0), r = keys[1];
    if (r < w) {
      const k = keys[2 + (r % KEY_SLOTS)];
      Atomics.store(keys, 1, r + 1);
      return k;
    }
    flushSound();
    publish();
    ctrl[CTRL.BUSY] = 0;
    Atomics.wait(keys, 0, w, 500);
    ctrl[CTRL.BUSY] = 1;
    caughtUp();
  }
}

export function keypressed() {
  spend(COST.key);
  return ext !== null || waiting();
}

// Two questions every game asks first have one right answer here: colour,
// and a fast PC (this clock is set to one). The cursor sits on the default.
const ANSWERS = [[/\(C\/M\)\? C$/, 'C'], [/\(S\/F\)\? S$/, 'F']];
function promptAtCursor() {
  let s = '';
  for (let x = 1; x <= cx; x++) s += String.fromCharCode(screen[cell(x, cy)] & 255);
  return s;
}

// Turbo Pascal 3's Kbd: a key without echo; an extended key comes as ESC
// and then its scan code
export function readKbd() {
  spend(COST.read);
  if (ext !== null) { const c = ext; ext = null; return c; }
  if (!waiting()) {
    const line = promptAtCursor();
    for (const [re, key] of ANSWERS) if (re.test(line)) return key;
  }
  const k = takeKey();
  const ascii = k & 255, scan = k >> 8;
  if (ascii === 0) { ext = String.fromCharCode(scan); return '\x1b'; }
  return String.fromCharCode(ascii);
}

// Crt's ReadKey: an extended key comes as #0 and then its scan code
export function readkey() {
  spend(COST.read);
  if (ext !== null) { const c = ext; ext = null; return c; }
  const k = takeKey();
  if ((k & 255) === 0) { ext = String.fromCharCode(k >> 8); return '\x00'; }
  return String.fromCharCode(k & 255);
}

// Readln: a line typed with echo, Backspace to fix, Enter to end
export function readLine(max) {
  max = max || 127;
  ctrl[CTRL.LINE] = max;
  publish();
  let s = '';
  for (;;) {
    const k = takeKey(), c = k & 255;
    if (c === 13) break;
    if (c === 8) {
      if (s) { s = s.slice(0, -1); writeCode(8); writeCode(32); writeCode(8); }
    } else if (c >= 32 && s.length < max) {
      s += String.fromCharCode(c);
      writeCode(c);
    }
    publish();
  }
  writeCode(13); writeCode(10);
  ctrl[CTRL.LINE] = 0;
  caughtUp();
  return s;
}
export const readChar = () => readLine(1)[0] || ' ';

// ---------- random numbers (Turbo Pascal's own generator) ----------

let seed = 0;
export function random(n) {
  spend(COST.random);
  seed = (Math.imul(seed, 134775813) + 1) | 0;
  return Math.floor(((seed >>> 0) / 4294967296) * (n & 65535));
}
export function randomReal() {
  seed = (Math.imul(seed, 134775813) + 1) | 0;
  return (seed >>> 0) / 4294967296;
}
export function randomize() { seed = (Date.now() * 1000) | 0; }

// ---------- files ----------

const disk = new Map();
let ioError = 0;
export const KBD = { kbd: true }, LST = {}, OUTPUT = {}, INPUT = {};

export const file = () => ({ name: '', pos: 0, data: null, dirty: false });
export function assign(f, name) { f.name = String(name).trim().toUpperCase(); }
export function reset(f) {
  const d = disk.get(f.name);
  if (!d) { ioError = 2; f.data = null; return; }
  f.data = d; f.pos = 0;
}
export function rewrite(f) {
  f.data = [];
  disk.set(f.name, f.data);
  f.pos = 0; f.dirty = true;
}
export function close(f) {
  if (f.data && f.dirty) onFile(f.name, f.data);
  f.dirty = false;
}
export function erase(f) { disk.delete(f.name); onFile(f.name, null); }
export function seek(f, n) { f.pos = n; }
export const eof = f => !f.data || f.pos >= f.data.length;
export const filesize = f => (f.data ? f.data.length : 0);
export function fread(f) {
  if (!f.data) { ioError = 103; return null; }
  if (f.pos >= f.data.length) { ioError = 100; return clone(f.data[f.data.length - 1] ?? null); }
  return clone(f.data[f.pos++]);
}
export function fwrite(f, v) {
  if (!f.data) { ioError = 103; return; }
  f.data[f.pos++] = clone(v);
  f.dirty = true;
}
export function ioresult() { const e = ioError; ioError = 0; return e; }

// ---------- strings and values ----------

export const trunc = (s, n) => (s.length > n ? s.slice(0, n) : s);
export const charAt = (s, i) => (i === 0 ? String.fromCharCode(s.length) : s[i - 1] ?? ' ');
export function setChar(s, i, c) {
  if (i === 0) return s.slice(0, c.charCodeAt(0)).padEnd(c.charCodeAt(0), ' ');
  if (i > s.length) return s;
  return s.slice(0, i - 1) + c + s.slice(i);
}
export function copy(s, i, n) {
  if (i < 1) i = 1;
  return n <= 0 ? '' : s.substr(i - 1, n);
}
export const del = (s, i, n) => (i < 1 || i > s.length || n <= 0 ? s : s.slice(0, i - 1) + s.slice(i - 1 + n));
export const ins = (src, s, i) => s.slice(0, Math.max(0, i - 1)) + src + s.slice(Math.max(0, i - 1));
export const upcase = c => (c >= 'a' && c <= 'z' ? c.toUpperCase() : c);
export function fmt(v, width) {
  const s = typeof v === 'number' ? String(Math.trunc(v)) : String(v);
  return width > s.length ? s.padStart(width, ' ') : s;
}
export function val(s) {
  const t = s.trim();
  const m = /^[+-]?(\$[0-9a-f]+|\d+)$/i.exec(t);
  if (!m) {
    let i = 0;
    while (i < s.length && /[\s+\-0-9]/.test(s[i])) i++;
    return [0, i + 1];
  }
  return [t.includes('$') ? parseInt(t.replace('$', ''), 16) * (t[0] === '-' ? -1 : 1) : parseInt(t, 10), 0];
}
export const round = x => (x < 0 ? -Math.round(-x) : Math.round(x));
export function fill(a, v) { if (a.fill) a.fill(v); }
export const noop = () => {};
export function clone(v) {
  if (v === null || typeof v !== 'object') return v;
  if (ArrayBuffer.isView(v)) return v.slice();
  if (Array.isArray(v)) return v.map(clone);
  const o = {};
  for (const k in v) o[k] = clone(v[k]);
  return o;
}

// ---------- sets: 256 bits, never changed in place ----------

export const EMPTY = new Uint8Array(32);
export function setOf(...ranges) {
  const s = new Uint8Array(32);
  for (let i = 0; i < ranges.length; i += 2) {
    for (let v = Math.max(0, ranges[i]); v <= Math.min(255, ranges[i + 1]); v++) s[v >> 3] |= 1 << (v & 7);
  }
  return s;
}
export const inSet = (s, v) => v >= 0 && v < 256 && (s[v >> 3] & (1 << (v & 7))) !== 0;
const both = (a, b, f) => { const s = new Uint8Array(32); for (let i = 0; i < 32; i++) s[i] = f(a[i], b[i]); return s; };
export const union = (a, b) => both(a, b, (x, y) => x | y);
export const diff = (a, b) => both(a, b, (x, y) => x & ~y);
export const inter = (a, b) => both(a, b, (x, y) => x & y);
export const setEq = (a, b) => a.every((x, i) => x === b[i]);
export const setNe = (a, b) => !setEq(a, b);
export const subset = (a, b) => a.every((x, i) => (x & ~b[i]) === 0);
export const superset = (a, b) => subset(b, a);

// ---------- start and stop ----------

export class Halt extends Error {}
export function halt() { throw new Halt('halt'); }

// Hands the runtime its shared memory and the player's saved files
export function start(opts) {
  screen = opts.screen; ctrl = opts.ctrl; keys = opts.keys;
  audio = opts.audio || null;
  onFile = opts.onFile;
  state = opts.state || null;
  for (const [name, data] of Object.entries(opts.files || {})) disk.set(name, data);
  speed = ctrl[CTRL.SPEED] / 100 || 1;
  if (opts.seed !== undefined) seed = opts.seed | 0;
  screen.fill(32 | 7 << 8);
  ctrl[CTRL.CURSOR] = 1;
  ctrl[CTRL.BUSY] = 1;
  vt = now();
}

export function flush() { flushSound(); speaker(0); flushSound(); publish(); }
