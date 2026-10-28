// Arcade: MAME (engine/arcade.{js,wasm}, built by tools/build-mame.mjs with
// only the drivers of the games in games.js) playing the arcade games whose
// owners let mamedev.org give them away for free, non-commercial use.
//
// mamedev.org may hand them out only from its own site, so nothing here
// holds a game: the player downloads each zip there on their phone and sends
// it with "Get games from phone" (../_shared/phone.js). The zips are kept in
// IndexedDB ("arcade", store "roms"), written to /roms in MAME's memory
// file system when a game starts, and MAME is run with the zip's name.
// MAME's settings and each game's NVRAM (high scores, the operator's
// settings) live in /mame, mounted from IndexedDB (IDBFS), and are saved
// through web_save() when the page is left or hidden.
//
// The on-screen controls and controllers are read here and reach MAME as
// the keys its default layout uses (arrows, Ctrl, Alt, Space, Shift, 5 for
// a coin and 1 to start), so MAME's own joystick input stays off.
//
// MAME can't be restarted within a page, so leaving a game reloads it.

import { mbOf, wasmProgress } from '../_shared/engine.js';
import { phonePanel } from '../_shared/phone.js';
import { BY_SET, GAMES, MAX_ROM_FILE, setName } from './games.js';

const $ = id => document.getElementById(id);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('arcade.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('arcade.' + key, JSON.stringify(value)); } catch {} },
};
const touchFirst = !matchMedia('(hover: hover) and (pointer: fine)').matches;

// ---------- the zips (IndexedDB) ----------
// { name: MAME's set name, data: Uint8Array, added }

const db = (() => {
  let open = null;
  const get = () => open || (open = new Promise((resolve, reject) => {
    const req = indexedDB.open('arcade', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('roms', { keyPath: 'name' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
  const tx = async (mode, fn) => {
    const d = await get();
    return new Promise((resolve, reject) => {
      const t = d.transaction('roms', mode);
      const req = fn(t.objectStore('roms'));
      t.oncomplete = () => resolve(req?.result);
      t.onerror = t.onabort = () => reject(t.error);
    });
  };
  return {
    names: () => tx('readonly', s => s.getAllKeys()),
    get: name => tx('readonly', s => s.get(name)),
    put: rom => tx('readwrite', s => s.put(rom)),
    del: name => tx('readwrite', s => s.delete(name)),
  };
})();

// ---------- library ----------

function status(text) { $('status').textContent = text; }
const titleOf = set => BY_SET.get(set)?.title || set;

let have = new Set();
async function renderLibrary() {
  have = new Set(await db.names().catch(() => []));
  const card = (set, title, maker, about) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `game${have.has(set) ? ' ready' : ''}`;
    const t = document.createElement('b');
    t.textContent = title;
    const m = document.createElement('small');
    m.textContent = maker;
    const a = document.createElement('span');
    a.textContent = about;
    const e = document.createElement('em');
    e.textContent = have.has(set) ? 'Play' : 'Get it from your phone';
    b.append(t, m, ...(about ? [a] : []), e);
    b.onclick = () => (have.has(set) ? play(set) : phone.show());
    return b;
  };
  $('games').replaceChildren(...GAMES.map(g => card(g.set, g.title, g.maker, g.about)));
  const others = [...have].filter(s => !BY_SET.has(s)).sort();
  $('otherBox').hidden = !others.length;
  $('others').replaceChildren(...others.map(s => card(s, s, 'Sent from your phone', '')));
  const last = settings.get('last', null);
  $('continue').hidden = !(last && have.has(last));
  if (last && have.has(last)) {
    $('continue').textContent = `Play ${titleOf(last)}`;
    $('continue').onclick = () => play(last);
  }
  const count = GAMES.filter(g => have.has(g.set)).length;
  if (!$('status').textContent) status(count ? `${count} of ${GAMES.length} games on this car.` : '');
}

// A zip from the phone: kept under MAME's name for it
async function saveRom(name, bytes) {
  if (!/\.zip$/i.test(name) || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes.length > MAX_ROM_FILE) return null;
  const set = setName(name);
  if (!/^[a-z0-9_]{2,16}$/.test(set)) return null;
  await db.put({ name: set, data: bytes, added: Date.now() });
  return titleOf(set);
}

const phone = phonePanel({
  app: 'arcade',
  save: saveRom,
  onSaved: () => { status(''); renderLibrary(); },
  notPlayable: () => 'not a game zip',
});
$('fromPhone').onclick = () => phone.show();

// ---------- the game ----------

let engine = null;        // MAME (Emscripten's Module)
let current = null;       // the game's set name
let running = false;
const log = [];
window.arcadeLog = log;
const remember = line => { log.push(String(line)); if (log.length > 60) log.shift(); };

function failed(message) {
  $('failedText').textContent = message || 'Something went wrong.';
  $('failed').hidden = false;
  $('loading').hidden = true;
}
$('failedOk').onclick = () => location.reload();

// Why MAME stopped, in its own words where it said so
function whyStopped() {
  const lines = log.filter(l => /missing|not found|error|wrong|required|fatal|unknown system/i.test(l));
  if (lines.some(l => /unknown system|is not a known|no such/i.test(l))) return 'This game isn\'t one this arcade has the hardware for.';
  if (lines.some(l => /missing|NOT FOUND|required files/i.test(l))) return 'Some of the game\'s files are missing or different. Send the zip from mamedev.org again, unchanged.';
  return lines.slice(-2).join(' ') || 'MAME stopped.';
}

// The game's area, in whole CSS pixels
function area() {
  const r = $('screen').getBoundingClientRect();
  return [Math.max(160, Math.floor(r.width)), Math.max(120, Math.floor(r.height))];
}

async function play(set) {
  if (engine) return;
  const rom = await db.get(set).catch(() => null);
  if (!rom) return phone.show();
  current = set;
  settings.set('last', set);
  const game = BY_SET.get(set) || { stick: 'joy', buttons: 4 };
  $('title').textContent = titleOf(set);
  $('loadTitle').textContent = titleOf(set);
  $('loading').hidden = false;
  $('library').hidden = true;
  $('player').hidden = false;
  setControls(game);
  startSound();
  const [w, h] = area();
  const canvas = $('canvas');
  window.JSMESS = window.JSMESS || {};
  window.Module = engine = {
    canvas,
    arguments: [set, '-rompath', '/roms', '-homepath', '/mame', '-cfg_directory', '/mame/cfg', '-nvram_directory', '/mame/nvram',
      '-window', '-resolution', `${w}x${h}`, '-video', 'accel', '-nothrottle', '-skip_gameinfo', '-samplerate', '44100',
      '-joystickprovider', 'none', '-noreadconfig'],
    locateFile: file => `engine/${file}`,
    // the engine is 39 MB: its download is shown, not just "Starting…"
    instantiateWasm: wasmProgress('engine/arcade.wasm', {
      progress: (got, total) => { $('loadText').textContent = `Loading the arcade… ${mbOf(got, total)}`; },
      arrived: () => { $('loadText').textContent = 'Starting…'; },
      failed: e => failed(`The arcade couldn't be loaded (${e.message}). Check the connection and try again.`),
    }),
    print: remember,
    printErr: remember,
    preRun: [M => {
      const FS = M.FS;
      FS.mkdirTree('/roms');
      FS.writeFile(`/roms/${set}.zip`, rom.data);
      FS.mkdirTree('/mame');
      FS.mount(M.IDBFS, {}, '/mame');
      M.addRunDependency('saves');
      FS.syncfs(true, err => {
        if (err) console.warn('loading saves failed', err);
        for (const d of ['/mame/cfg', '/mame/nvram']) try { FS.mkdir(d); } catch {}
        M.removeRunDependency('saves');
      });
    }],
    onAbort: what => failed(`MAME stopped: ${what || 'unknown error'}`),
    // MAME ended: Escape on a keyboard, or a game that didn't start
    onExit: () => { if (!leaving) (running ? leave() : failed(whyStopped())); },
    onMameExit: () => { if (!leaving) leave(); },
  };
  const s = document.createElement('script');
  s.src = 'engine/arcade.js';
  s.onerror = () => failed('The arcade couldn\'t be loaded. Check the connection and try again.');
  document.body.append(s);
  // MAME says when the game is running
  const t0 = performance.now();
  const wait = setInterval(() => {
    if (window.JSMESS.running) {
      clearInterval(wait);
      running = true;
      $('loading').hidden = true;
      canvas.focus();
      if (touchFirst) hint('Tap Coin, then Start', 5000);
    } else if (performance.now() - t0 > 60000 && $('failed').hidden) {
      clearInterval(wait);
      failed(whyStopped());
    }
  }, 200);
  requestAnimationFrame(tick);
}

let hintTimer = 0;
function hint(text, ms = 4000) {
  clearTimeout(hintTimer);
  $('hint').textContent = text;
  $('hint').hidden = !text;
  if (text) hintTimer = setTimeout(() => { $('hint').hidden = true; }, ms);
}

// The on-screen controls for this game: a pad, its buttons, Star Fire's lever
function setControls(game) {
  $('dpad').hidden = !game.stick;
  $('throttle').hidden = !game.throttle;
  $('fire').replaceChildren(...Array.from({ length: game.buttons }, (_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.b = `b${i + 1}`;
    b.textContent = String(i + 1);
    b.setAttribute('aria-label', `Button ${i + 1}`);
    return b;
  }));
}

// ---------- input: everything becomes MAME's keys ----------

const KEYS = {
  up: ['ArrowUp', 'ArrowUp', 38], down: ['ArrowDown', 'ArrowDown', 40], left: ['ArrowLeft', 'ArrowLeft', 37], right: ['ArrowRight', 'ArrowRight', 39],
  b1: ['ControlLeft', 'Control', 17], b2: ['AltLeft', 'Alt', 18], b3: ['Space', ' ', 32], b4: ['ShiftLeft', 'Shift', 16],
  coin: ['Digit5', '5', 53], start: ['Digit1', '1', 49],
  // Star Fire's speed lever (MAME's AD stick Z: A and Z)
  fast: ['KeyZ', 'z', 90], slow: ['KeyA', 'a', 65],
};
const sent = new Set();
function key(name, down) {
  const [code, k, keyCode] = KEYS[name];
  const location = /Left$/.test(code) && keyCode < 20 ? 1 : 0;
  document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: k, keyCode, which: keyCode, location, bubbles: true, cancelable: true }));
}

const touch = new Map();          // pointerId -> { dpad: true, held } or { held }
// A quick tap can start and end between two of MAME's frames: each press is
// held for a few frames at least
const sticky = new Map();         // control -> frames left
const press = b => sticky.set(b, 4);

// The car shows each controller twice: the device itself and a "Tesla
// Virtual Gamepad" copy with the standard mapping. Read the virtual pads
// when there are any, else standard pads, else the rest (raw layout).
function readPads(out) {
  const pads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
  const virtual = pads.filter(p => /tesla virtual/i.test(p.id));
  const standard = pads.filter(p => p.mapping === 'standard');
  const use = virtual.length ? virtual : standard.length ? standard : pads;
  for (const p of use.slice(0, 1)) {
    const on = i => p.buttons[i]?.pressed;
    const [x = 0, y = 0] = p.axes;
    if (y < -0.5) out.add('up');
    if (y > 0.5) out.add('down');
    if (x < -0.5) out.add('left');
    if (x > 0.5) out.add('right');
    if (p.mapping === 'standard') {
      if (on(12)) out.add('up');
      if (on(13)) out.add('down');
      if (on(14)) out.add('left');
      if (on(15)) out.add('right');
      // by position: bottom, right, left, top face buttons
      if (on(0)) out.add('b1');
      if (on(1)) out.add('b2');
      if (on(2)) out.add('b3');
      if (on(3)) out.add('b4');
      if (on(4) || on(6)) out.add('slow');
      if (on(5) || on(7)) out.add('fast');
      if (on(8)) out.add('coin');
      if (on(9)) out.add('start');
    } else {
      if (on(0)) out.add('b1');
      if (on(1)) out.add('b2');
      if (on(3)) out.add('b3');
      if (on(4)) out.add('b4');
      if (on(10)) out.add('coin');
      if (on(11)) out.add('start');
    }
  }
  return use.length > 0;
}

let padMode = false;
function setPadMode(on) {
  if (on === padMode) return;
  padMode = on;
  $('player').classList.toggle('pad', on);
}

function tick() {
  if (!engine || leaving) return;
  const now = new Set();
  for (const [b, left] of sticky) {
    now.add(b);
    if (left <= 1) sticky.delete(b); else sticky.set(b, left - 1);
  }
  for (const t of touch.values()) for (const b of t.held || []) now.add(b);
  const pad = new Set();
  if (readPads(pad) && pad.size) setPadMode(true);
  for (const b of pad) now.add(b);
  if (running) {
    for (const b of now) if (!sent.has(b)) { sent.add(b); key(b, true); }
    for (const b of [...sent]) if (!now.has(b)) { sent.delete(b); key(b, false); }
  }
  showTouch(now);
  requestAnimationFrame(tick);
}

const lit = () => [...document.querySelectorAll('#player [data-b]')];
let shown = '';
function showTouch(set) {
  const k = [...set].sort().join();
  if (k === shown) return;
  shown = k;
  const d = $('dpad');
  for (const dir of ['up', 'down', 'left', 'right']) d.classList.toggle(dir, set.has(dir));
  for (const el of lit()) el.classList.toggle('on', set.has(el.dataset.b));
}

function dpadDirs(e) {
  const r = $('dpad').getBoundingClientRect();
  const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
  const out = [];
  if (Math.hypot(x, y) < 14) return out;
  const a = Math.atan2(y, x) * 180 / Math.PI;   // 0 = right, 90 = down
  if (a > -67.5 && a < 67.5) out.push('right');
  if (a > 112.5 || a < -112.5) out.push('left');
  if (a > 22.5 && a < 157.5) out.push('down');
  if (a < -22.5 && a > -157.5) out.push('up');
  return out;
}

function buttonAt(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const b = el && el.closest('#player .side [data-b]');
  return b ? [b.dataset.b] : [];
}

function onPointer(e) {
  if (e.type === 'pointerdown' && e.target.closest('.side, .screen')) setPadMode(false);
  if (e.type === 'pointerdown') {
    if (e.target.closest('#dpad')) touch.set(e.pointerId, { dpad: true, held: dpadDirs(e) });
    else if (e.target.closest('#player .side [data-b]')) touch.set(e.pointerId, { held: buttonAt(e) });
    else return;
    touch.get(e.pointerId).held.forEach(press);
    e.preventDefault();
    try { e.target.setPointerCapture(e.pointerId); } catch {}
  } else if (e.type === 'pointermove') {
    const t = touch.get(e.pointerId);
    if (!t) return;
    t.held = t.dpad ? dpadDirs(e) : buttonAt(e);   // slide from one button to the next
  } else {
    touch.delete(e.pointerId);
  }
}
for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) $('player').addEventListener(type, onPointer);

// ---------- sound ----------

// MAME makes its own AudioContext; the page keeps every one it makes
const contexts = [];
if (window.AudioContext) {
  const Real = window.AudioContext;
  window.AudioContext = class extends Real {
    constructor(...args) { super(...args); contexts.push(this); showSound(); }
  };
}
function startSound() { showSound(); }
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
  if (!engine) return;
  if (!soundOn()) for (const c of contexts) if (c.state === 'running') c.suspend();
  showSound();
}, 1000);

// ---------- leaving ----------

// MAME writes the game's NVRAM and its settings (web_save), then they go to
// IndexedDB
function save() {
  try { if (running) engine._web_save(); } catch {}
  return new Promise(resolve => {
    try { engine.FS.syncfs(false, err => { if (err) console.warn('saving failed', err); resolve(); }); } catch { resolve(); }
  });
}

let leaving = false;
async function leave() {
  if (leaving) return;
  leaving = true;
  for (const c of contexts) c.suspend();
  if (engine) await save();
  location.reload();
}
$('quitBtn').onclick = () => leave();

document.addEventListener('visibilitychange', () => {
  if (!engine || !running) return;
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
  if (engine) await save();
  e.source.postMessage({ frunk: 'closed' }, e.origin);
});
if (parent !== window) parent.postMessage({ frunk: 'save-on-close' }, '*');

addEventListener('error', e => { if (engine && !running) failed(`MAME stopped: ${e.message}`); });

renderLibrary();
