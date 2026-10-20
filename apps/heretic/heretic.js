// Blasphemer: the Heretic engine (Crispy Heretic from Crispy Doom 7.2,
// compiled to WebAssembly, in engine/, built by tools/build-doom.mjs) with
// the free game Blasphemer, plus Heretic WADs the player loads from their own
// copies. It is Freedoom (../doom/doom.js) made over for Heretic: the same
// engine calls, plus an inventory and flying. WADs are kept in this screen's
// IndexedDB and never leave it; the free one is kept too once downloaded, so
// it starts without a connection.
//
// Heretic runs on this page's main thread, one frame per screen refresh, and
// draws to #canvas through SDL. Controllers and the on-screen controls are
// merged here and handed to Heretic once a frame as a single gamepad
// (web_pad, in tools/doom/crispy-web.patch); a keyboard goes to it directly.
//
// Saves and settings live in the engine's /heretic folder, kept in IndexedDB
// (IDBFS), with a save folder per WAD. A game in progress is saved to slot 47
// ("AUTOSAVE", the last slot of the save menu's last page) whenever the page
// is hidden or the hub closes the app, and Continue loads it.
//
// The engine can't be restarted within a page, so leaving a game reloads it.

import { phonePanel } from '../_shared/phone.js';
import { MAX_WAD_FILE, cleanName, findWad, maybeWad } from '../_shared/roms.js';

const BLASPHEMER = '0.1.8';
const FREE = [
  {
    id: 'blasphemer', title: 'Blasphemer', wad: 'blasphem.wad', file: `blasphem-${BLASPHEMER}`, size: 20417448, download: 7720633,
    about: 'Dark fantasy with spells and relics: five episodes of new levels, monsters and music, made free for the Heretic engine.',
  },
];

const TITLES = {
  'heretic1.wad': 'Heretic (shareware)', 'heretic.wad': 'Heretic', 'blasphem.wad': 'Blasphemer',
};

// Whether a WAD is a Heretic game: Heretic's episode maps and status bar.
// Doom games have E1M1 too but no BARBACK; Hexen has BARBACK but MAP01s.
function isHeretic(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = v.getInt32(4, true), dir = v.getInt32(8, true);
  const names = new Set();
  for (let i = 0; i < count; i++) {
    const at = dir + i * 16 + 8;
    let name = '';
    for (let j = 0; j < 8 && bytes[at + j]; j++) name += String.fromCharCode(bytes[at + j]);
    names.add(name.toUpperCase());
  }
  return names.has('E1M1') && names.has('BARBACK');
}

const AUTOSAVE = 47;

const $ = id => document.getElementById(id);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('heretic.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('heretic.' + key, JSON.stringify(value)); } catch {} },
};
const mb = bytes => `${(bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0)} MB`;

// ---------- WADs (IndexedDB) ----------
// { id, title, wad (file name the engine sees), size, added, data }. The
// free games are stored as "free:<id>" once downloaded.

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('heretic', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('wads', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('wads', mode);
    const req = fn(tx.objectStore('wads'));
    tx.oncomplete = () => { d.close(); resolve(req && req.result); };
    tx.onerror = tx.onabort = () => { d.close(); reject(tx.error); };
  });
}

const listWads = () => store('readonly', s => s.getAllKeys()).catch(() => []);
const getWad = id => store('readonly', s => s.get(id));
const putWad = wad => store('readwrite', s => s.put(wad));
const deleteWad = id => store('readwrite', s => s.delete(id));
// Everything but the data, which can be tens of MB per game
async function wadInfo() {
  const out = [];
  await store('readonly', s => {
    const req = s.openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (!c) return;
      const { data, ...info } = c.value;
      out.push(info);
      c.continue();
    };
    return req;
  }).catch(() => {});
  return out;
}

// The name the engine sees: lower case, without a browser's " (1)"
const wadName = name => name.replace(/^.*\//, '').toLowerCase().replace(/\s*\(\d+\)(?=\.wad$)/, '');

// Checks and saves one file (unzipping it if needed); returns its title, or
// null when it isn't a Heretic game this plays
let lastProblem = '';
async function saveWad(name, file) {
  lastProblem = '';
  const found = await findWad(name, file);
  if (!found) return null;
  const wad = wadName(/\.wad$/i.test(found.name) ? found.name : `${cleanName(found.name)}.wad`);
  if (found.kind !== 'IWAD') { lastProblem = 'an add-on (PWAD); only whole games (IWADs) for now'; return null; }
  if (!isHeretic(found.bytes)) { lastProblem = 'not a Heretic game; Doom games go in Freedoom'; return null; }
  const title = TITLES[wad] || cleanName(found.name);
  await putWad({ id: `${wad}|${found.bytes.length}`, title, wad, size: found.bytes.length, added: Date.now(), data: found.bytes });
  return title;
}

async function addFiles(files) {
  const msg = $('addMsg');
  let added = 0;
  const skipped = [];
  msg.textContent = 'Adding…';
  for (const file of files) {
    if (!maybeWad(file.name) || file.size > MAX_WAD_FILE) { skipped.push(file.name); continue; }
    try {
      if (await saveWad(file.name, new Uint8Array(await file.arrayBuffer()))) added++;
      else skipped.push(lastProblem ? `${file.name} (${lastProblem})` : file.name);
    } catch { skipped.push(file.name); }
  }
  msg.textContent = (added ? `Added ${added} game${added === 1 ? '' : 's'}.` : 'No Heretic games (.wad or .zip) found there.') +
    (skipped.length ? ` Skipped: ${skipped.join(', ')}.` : '');
  renderMine();
}

// Before the first game is added, the player confirms they own their games
function ownGames(then) {
  if (settings.get('owned', false)) return then();
  $('terms').hidden = false;
  $('termsOk').onclick = () => {
    settings.set('owned', true);
    $('terms').hidden = true;
    then();   // still inside the tap, so the file picker may open
  };
  $('termsCancel').onclick = () => { $('terms').hidden = true; };
}

const phone = phonePanel({
  app: 'heretic',
  save: saveWad,
  onSaved: renderMine,
  notPlayable: () => lastProblem || 'not a Heretic game this plays',
});

// ---------- library ----------

function status(text) { $('status').textContent = text; }

// Buttons that lose games ask for a second tap within 3 seconds
function confirmTap(btn, action) {
  if (btn.dataset.armed) {
    clearTimeout(+btn.dataset.armed);
    delete btn.dataset.armed;
    btn.textContent = btn.dataset.label;
    action();
    return;
  }
  btn.dataset.label = btn.textContent;
  btn.textContent = 'Sure?';
  btn.dataset.armed = setTimeout(() => {
    delete btn.dataset.armed;
    btn.textContent = btn.dataset.label;
  }, 3000);
}

function card(title, lines, onPlay) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'game';
  const t = document.createElement('b');
  t.textContent = title;
  b.append(t, ...lines.map(([tag, text]) => Object.assign(document.createElement(tag), { textContent: text })));
  b.onclick = () => onPlay(b);
  return b;
}

async function renderFree() {
  const have = new Set(await listWads());
  $('free').replaceChildren(...FREE.map(g => card(g.title, [
    ['small', `Blasphemer project · BSD license · ${have.has(`free:${g.id}`) ? 'ready to play' : `${mb(g.download)} download the first time`}`],
    ['p', g.about],
  ], b => play(freeEntry(g), b, false))));
}

const freeEntry = g => ({ id: `free:${g.id}`, title: g.title, wad: g.wad, free: g });

async function renderMine() {
  const wads = (await wadInfo()).filter(w => !w.id.startsWith('free:')).sort((a, b) => a.title.localeCompare(b.title));
  $('mine').replaceChildren(...wads.map(w => {
    const wrap = document.createElement('div');
    wrap.className = 'wrap';
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del';
    del.textContent = 'Remove';
    del.setAttribute('aria-label', `Remove ${w.title}`);
    del.onclick = () => confirmTap(del, async () => {
      await deleteWad(w.id);
      renderMine();
      renderContinue();
    });
    wrap.append(card(w.title, [['small', `${w.wad} · ${mb(w.size)} · on this screen only`]], b => play(w, b, false)), del);
    return wrap;
  }));
}

// The last game played, to pick up from its autosave
async function renderContinue() {
  const last = settings.get('last', null);
  const btn = $('continue');
  btn.hidden = true;
  if (!last) return;
  const free = FREE.find(g => `free:${g.id}` === last.id);
  const entry = free ? freeEntry(free) : (await wadInfo()).find(w => w.id === last.id);
  if (!entry) return;
  btn.textContent = `Continue ${entry.title}`;
  btn.onclick = () => play(entry, btn, true);
  btn.hidden = false;
}

// ---------- loading ----------

function loading(title, text, part) {
  $('loading').hidden = false;
  $('loadTitle').textContent = title;
  $('loadText').textContent = text;
  $('loadBar').style.width = `${Math.round(100 * part)}%`;
}

// Downloads a free game, gzipped, with progress; keeps it for next time
async function downloadFree(entry) {
  const g = entry.free;
  const res = await fetch(`blasphemer/${g.file}.wad.gz`);
  if (!res.ok || !res.body) throw new Error(`download failed (${res.status})`);
  const reader = res.body.getReader();
  const chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    loading(entry.title, `Downloading ${mb(got)} of ${mb(g.download)}…`, 0.9 * got / g.download);
  }
  loading(entry.title, 'Unpacking…', 0.92);
  const data = new Uint8Array(await new Response(new Blob(chunks).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  if (data.length !== g.size) throw new Error('the download was damaged');
  navigator.storage?.persist?.().catch(() => {});
  await putWad({ id: entry.id, title: entry.title, wad: entry.wad, size: data.length, added: Date.now(), data })
    .catch(() => {});   // full storage: play anyway, download again next time
  return data;
}

// ---------- engine ----------

// Settings for a first start, written to both of the engine's settings files
// (each takes the ones it knows): windowed in the page, no mouse, the
// on-screen controls and controllers as a gamepad with the buttons below,
// always run, classic 320x200 graphics at 4:3, drawn on every screen
// refresh, no text-mode startup screen. Sound is mixed on this page's main thread in 2048-sample (46 ms)
// slices: the default 1024 leaves less slack, and short buffers crackled in
// the car in Retro Console.
const DEFAULTS = `
fullscreen 0
show_endoom 0
use_mouse 0
grabmouse 0
use_joystick 0
use_gamepad 0
use_analog 1
joyb_fire 0
joyb_use 1
joyb_prevweapon 2
joyb_nextweapon 3
joyb_menu_activate 4
joyb_toggle_automap 5
joyb_invleft 6
joyb_invright 7
joyb_useartifact 8
joyb_flyup 9
joyb_flydown 10
joyb_strafe -1
joyb_strafeleft -1
joyb_straferight -1
joyb_jump -1
joyb_speed 31
snd_samplerate 44100
snd_maxslicetime_ms 50
crispy_hires 0
crispy_uncapped 1
crispy_widescreen 0
aspect_ratio_correct 1
graphical_startup 0
`;
const BIT = { fire: 1, use: 2, prev: 4, next: 8, menu: 16, map: 32, invl: 64, invr: 128, arti: 256, up: 512, down: 1024 };
const DIR = { up: 1, down: 2, left: 4, right: 8 };   // i_joystick.h's JOY_DIR_*

let engine = null;        // the running engine (Emscripten module)
let audio = null;         // its AudioContext
let syncing = Promise.resolve();
let raf = 0, frames = 0, fpsSince = 0;

// Copies /heretic to IndexedDB (or back, with load); one copy at a time
function sync(load = false) {
  syncing = syncing.then(() => new Promise(resolve => {
    if (!engine) return resolve();
    engine.FS.syncfs(load, () => resolve());
  }));
  return syncing;
}

function exists(path) {
  try { engine.FS.stat(path); return true; } catch { return false; }
}

// Saves the game in progress, the settings and both to IndexedDB
async function saveAll() {
  if (!engine) return;
  try { engine._web_autosave(); } catch {}
  try { engine._web_save_config(); } catch {}
  await sync();
}

// Back to the library: the engine can't restart, so the page reloads
async function leave() {
  cancelAnimationFrame(raf);
  await sync();
  location.reload();
}

function failed(message) {
  cancelAnimationFrame(raf);
  $('failedText').textContent = message || 'Something went wrong.';
  $('failed').hidden = false;
  $('loading').hidden = true;
  sync();
}
$('failedOk').onclick = () => location.reload();

async function boot(entry, data, resume) {
  loading(entry.title, 'Starting…', 0.95);
  const { default: createDoom } = await import('./engine/crispy-heretic.js');
  const module = await createDoom({
    canvas: $('canvas'),
    SDL2: audio ? { audioContext: audio } : {},
    print: () => {},
    printErr: () => {},
    onQuit: () => leave(),
    onError: message => failed(message),
  });
  engine = module;
  const FS = module.FS;
  FS.mkdir('/heretic');
  FS.mount(module.IDBFS, {}, '/heretic');
  await sync(true);
  if (!exists('/heretic/heretic.cfg')) {
    FS.writeFile('/heretic/heretic.cfg', DEFAULTS);
    FS.writeFile('/heretic/crispy-heretic.cfg', DEFAULTS);
  }
  const dir = `/heretic/${entry.id.replace(/[^\w.-]+/g, '-')}`;
  if (!exists(dir)) FS.mkdir(dir);
  FS.mkdir('/wads');
  FS.writeFile(`/wads/${entry.wad}`, data, { canOwn: true });
  const args = ['-iwad', `/wads/${entry.wad}`, '-config', '/heretic/heretic.cfg', '-extraconfig', '/heretic/crispy-heretic.cfg', '-savedir', dir, '-nogui'];
  if (resume && exists(`${dir}/hticsav${AUTOSAVE}.hsg`)) args.push('-loadgame', String(AUTOSAVE));

  $('title').textContent = entry.title;
  $('library').hidden = true;
  $('player').hidden = false;
  $('loading').hidden = true;
  showSound();
  fit();
  module.callMain(args);
  frames = 0;
  fpsSince = performance.now();
  raf = requestAnimationFrame(loop);
  setInterval(() => { if (!document.hidden) sync(); }, 20000);   // saves made from the game's menu
}

let starting = false;

async function play(entry, btn, resume) {
  if (starting || engine) return;
  starting = true;
  btn?.classList.add('busy');
  // Made inside the tap, so the browser lets it play
  try { audio = new AudioContext({ sampleRate: 44100 }); } catch { audio = null; }
  if (audio && !settings.get('sound', true)) audio.suspend();
  try {
    loading(entry.title, 'Loading…', 0);
    const stored = await getWad(entry.id).catch(() => null);
    const data = stored ? stored.data : entry.free ? await downloadFree(entry) : null;
    if (!data) throw new Error('that game is no longer on this screen');
    settings.set('last', { id: entry.id });
    await boot(entry, data, resume);
  } catch (e) {
    // The engine is up and can't start again within this page, so the
    // library's buttons would do nothing: back to it by reloading
    if (engine) { failed(`Couldn't start ${entry.title}: ${e && e.message ? e.message : 'something went wrong'}.`); return; }
    $('loading').hidden = true;
    status(`Couldn't start ${entry.title}: ${e && e.message ? e.message : 'check the connection and try again'}.`);
    audio?.close().catch(() => {});
    audio = null;
    renderFree();
    renderMine();
    renderContinue();
  } finally {
    starting = false;
    btn?.classList.remove('busy');
  }
}

// ---------- sound ----------

function showSound() {
  $('soundBtn').textContent = settings.get('sound', true) ? 'Sound on' : 'Sound off';
}
$('soundBtn').onclick = () => {
  const on = !settings.get('sound', true);
  settings.set('sound', on);
  showSound();
  if (audio) on ? audio.resume() : audio.suspend();
};

// ---------- input ----------

const touch = new Map();          // pointerId -> { stick: true, x, y } or { b: name }
// A quick tap can start and end between two of Heretic's tics (35 a second).
// Keep each press down for a few frames so the game always sees it.
const sticky = new Map();         // button -> frames left
const press = b => sticky.set(b, 4);

// Pads with a right stick that has been used: their left stick strafes, as
// on twin-stick games. Others (D-pad controllers, and sticks reported as a
// D-pad) turn with left and right, like the classic console versions.
const twinStick = new Set();

const dead = v => Math.abs(v) < 0.2 ? 0 : v;

// The car adds a "Tesla Virtual Gamepad" (standard layout) for a controller
// it recognises, next to the controller's own raw device, and both report
// every press under different numbers. So when any standard pad is present,
// buttons come only from standard pads; raw pads add only D-pad directions
// from their axes. Without a standard pad, raw pads are read with the usual
// raw layout (A 0, B 1, X 3, Y 4, L 6, R 7, Select 10, Start 11).
function readPads(s) {
  const pads = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean);
  const standard = pads.filter(p => p.mapping === 'standard');
  const raw = pads.filter(p => p.mapping !== 'standard');
  for (const p of standard.length ? standard : raw) readPad(p, s);
  if (standard.length) for (const p of raw) padDirs(p, s);
}

function padDirs(p, s) {
  const ax = p.axes;
  if (ax[1] < -0.5) s.dirs.add('up');
  if (ax[1] > 0.5) s.dirs.add('down');
  if (ax[0] < -0.5) s.dirs.add('left');
  if (ax[0] > 0.5) s.dirs.add('right');
}

function readPad(p, s) {
  const on = i => p.buttons[i] && p.buttons[i].pressed;
  const ax = p.axes;
  if (p.mapping !== 'standard') {
    padDirs(p, s);
    for (const [i, b] of [[0, 'fire'], [1, 'use'], [3, 'next'], [4, 'prev'], [6, 'sl'], [7, 'sr'], [10, 'map'], [11, 'menu']]) if (on(i)) s.held.add(b);
    return;
  }
  if (Math.abs(ax[2] || 0) > 0.5 || Math.abs(ax[3] || 0) > 0.5) twinStick.add(p.index);
  const lx = dead(ax[0] || 0), ly = dead(ax[1] || 0);
  s.move += ly;
  if (twinStick.has(p.index)) {
    s.strafe += lx;
    s.turn += dead(ax[2] || 0);
  } else {
    s.turn += lx;
  }
  if (ly < -0.5) s.stick |= DIR.up;
  if (ly > 0.5) s.stick |= DIR.down;
  if (lx < -0.5) s.stick |= DIR.left;
  if (lx > 0.5) s.stick |= DIR.right;
  if (on(12)) s.dirs.add('up');
  if (on(13)) s.dirs.add('down');
  if (on(14)) s.dirs.add('left');
  if (on(15)) s.dirs.add('right');
  // by position: right face button (A on Nintendo layouts, B on Xbox) fires,
  // bottom face button uses, left and top change weapons
  for (const [i, b] of [[1, 'fire'], [7, 'fire'], [0, 'use'], [6, 'arti'], [2, 'prev'], [3, 'next'], [4, 'sl'], [5, 'sr'], [8, 'map'], [9, 'menu']]) if (on(i)) s.held.add(b);
}

// Select on a controller is also a modifier, as controllers have run out of
// buttons by then: held with L or R it picks an item, with the fire button
// it uses the picked one, and with up or down it flies. Pressed alone it
// shows the map, when it's let go.
let selectHeld = false, selectCombo = false;
function selectCombos(s) {
  if (!s.held.has('map')) {
    if (selectHeld && !selectCombo) press('map');
    selectHeld = selectCombo = false;
    return;
  }
  selectHeld = true;
  s.held.delete('map');
  for (const [from, to] of [['sl', 'invl'], ['sr', 'invr'], ['fire', 'arti']]) {
    if (s.held.delete(from)) { s.held.add(to); selectCombo = true; }
  }
  for (const d of ['up', 'down']) {
    if (s.dirs.delete(d) || (s.stick & DIR[d])) { s.held.add(d); selectCombo = true; }
  }
  s.stick = 0;
  s.move = 0;
}

// While a controller is in use, the on-screen controls are hidden and the
// game gets their room; touching the screen brings them back
let padMode = false;
function setPadMode(on) {
  if (on === padMode) return;
  padMode = on;
  $('player').classList.toggle('pad', on);
  fit();
}

const clamp = v => Math.max(-1, Math.min(1, v));
const fixed = v => Math.round(clamp(v) * 65536);

function loop(t) {
  raf = requestAnimationFrame(loop);
  if (document.hidden) return;
  const s = { held: new Set(), dirs: new Set(), move: 0, turn: 0, strafe: 0, stick: 0 };
  readPads(s);
  if (s.held.size || s.dirs.size || s.move || s.turn || s.strafe) setPadMode(true);
  selectCombos(s);
  for (const [b, left] of sticky) {
    s.held.add(b);
    if (left <= 1) sticky.delete(b); else sticky.set(b, left - 1);
  }
  for (const p of touch.values()) {
    if (p.b) s.held.add(p.b);
    else if (p.stick) {
      s.move += dead(p.y);
      s.turn += dead(p.x);
      if (p.y < -0.5) s.stick |= DIR.up;
      if (p.y > 0.5) s.stick |= DIR.down;
      if (p.x < -0.5) s.stick |= DIR.left;
      if (p.x > 0.5) s.stick |= DIR.right;
    }
  }
  if (s.dirs.has('up')) s.move -= 1;
  if (s.dirs.has('down')) s.move += 1;
  if (s.dirs.has('left')) s.turn -= 1;
  if (s.dirs.has('right')) s.turn += 1;
  if (s.held.has('sl')) s.strafe -= 1;
  if (s.held.has('sr')) s.strafe += 1;
  let buttons = 0;
  for (const b of s.held) buttons |= BIT[b] || 0;
  let dpad = 0;
  for (const d of s.dirs) dpad |= DIR[d];
  engine._web_pad(buttons, fixed(s.turn), fixed(s.move), fixed(s.strafe), dpad | (s.stick << 4));
  showTouch(s.held);

  if (t - fpsSince >= 1000) {
    // 0 title, 1 playing, 2 between levels; +4 menu open, +8 paused,
    // +16 flying (the fly buttons show)
    const state = engine._web_state();
    $('player').dataset.state = state & 15;
    $('player').classList.toggle('flying', !!(state & 16));
    const n = engine._web_frames();
    $('fps').textContent = `${Math.round((n - frames) * 1000 / (t - fpsSince))} fps`;
    frames = n;
    fpsSince = t;
  }
}

// Lights the on-screen buttons that are held; touches the page only when
// that changes
const touchButtons = [...document.querySelectorAll('#player [data-b]')];
let shownTouch = '';
function showTouch(set) {
  const key = [...set].sort().join() + (touch.size ? 's' : '');
  if (key === shownTouch) return;
  shownTouch = key;
  for (const el of touchButtons) el.classList.toggle('on', set.has(el.dataset.b));
  $('stick').classList.toggle('on', [...touch.values()].some(p => p.stick));
}

const STICK_RANGE = 50;   // px from the centre for full speed
function stickAt(p, e) {
  const r = $('stick').getBoundingClientRect();
  const x = (e.clientX - (r.left + r.width / 2)) / STICK_RANGE, y = (e.clientY - (r.top + r.height / 2)) / STICK_RANGE;
  const len = Math.hypot(x, y);
  p.x = len > 1 ? x / len : x;
  p.y = len > 1 ? y / len : y;
  const knob = $('stick').firstElementChild;
  knob.style.transform = `translate(${p.x * 40}px, ${p.y * 40}px)`;
}

function onPointer(e) {
  if (e.type === 'pointerdown' && !e.target.closest('.bar')) setPadMode(false);
  if (e.type === 'pointerdown') {
    const b = e.target.closest('#player [data-b]');
    if (e.target.closest('#stick')) {
      const p = { stick: true, x: 0, y: 0 };
      stickAt(p, e);
      touch.set(e.pointerId, p);
    } else if (b) {
      touch.set(e.pointerId, { b: b.dataset.b });
      press(b.dataset.b);
    } else return;
    e.preventDefault();
    try { e.target.setPointerCapture(e.pointerId); } catch {}
  } else if (e.type === 'pointermove') {
    const p = touch.get(e.pointerId);
    if (p && p.stick) stickAt(p, e);
  } else if (touch.has(e.pointerId)) {
    if (touch.get(e.pointerId).stick) $('stick').firstElementChild.style.transform = '';
    touch.delete(e.pointerId);
  }
}
for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) $('player').addEventListener(type, onPointer);

// ---------- screen ----------

// The game is 4:3 and as big as fits under the bar. The on-screen controls
// sit inside its lower corners, just above the status bar (the bottom 42 of
// its 200 lines). SDL keeps the canvas's pixels matched to its size when the
// window says it resized.
function fit() {
  if ($('player').hidden) return;
  const W = innerWidth, H = innerHeight - 60;
  const w = Math.floor(Math.max(160, Math.min(W - 8, H * 4 / 3)));
  const h = Math.floor(w * 3 / 4);
  const c = $('canvas');
  c.style.setProperty('width', `${w}px`, 'important');
  c.style.setProperty('height', `${h}px`, 'important');
  const screen = document.querySelector('.screen').style;
  screen.setProperty('--above-status', `${Math.round((H - h) / 2 + h * 42 / 200 + 10)}px`);
  screen.setProperty('--inset', `${Math.round((W - w) / 2 + 10)}px`);
  dispatchEvent(new Event('resize'));
}
addEventListener('resize', e => { if (e.isTrusted) fit(); });

// ---------- leaving ----------

// Save, and stop the sound, while the screen is off or another app is
// showing (the game itself stops with the page's refreshes)
document.addEventListener('visibilitychange', () => {
  if (!engine) return;
  if (document.hidden) {
    audio?.suspend();
    saveAll();
  } else if (audio && settings.get('sound', true)) {
    audio.resume();
  }
});

// The hub's Apps button (or the car's back button) unloads this page. The
// hub asks first, so the game can be saved; it waits up to a second.
addEventListener('message', async e => {
  if (e.source !== parent || e.data?.frunk !== 'close') return;
  await saveAll();
  e.source.postMessage({ frunk: 'closed' }, e.origin);
});
if (parent !== window) parent.postMessage({ frunk: 'save-on-close' }, '*');

$('quitBtn').onclick = async () => {
  await saveAll();
  leave();
};
$('addFiles').onclick = () => ownGames(() => {
  const input = $('fileInput');
  input.value = '';
  input.onchange = () => addFiles([...input.files]);
  input.click();
});
$('fromPhone').onclick = () => ownGames(phone.show);

renderFree();
renderMine();
renderContinue();
