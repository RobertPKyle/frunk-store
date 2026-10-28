// OpenTTD: the open-source transport game (OpenTTD 15.3, compiled to
// WebAssembly in engine/ by tools/build-openttd.mjs) with its free base
// sets: OpenGFX graphics, OpenSFX sounds and OpenMSX music. The sets are
// downloaded once and kept in this screen's IndexedDB (database openttd),
// so the game starts without a connection after that.
//
// OpenTTD runs on this page's main thread, drawing to #canvas through SDL
// at one game pixel per CSS pixel. Touches and the mouse land on #touch, over
// the canvas, and reach the game as SDL mouse events (web_mouse in
// tools/openttd/openttd-web.patch): a tap clicks, one finger drags, a long
// press holds the right button (the game's tooltips), and two fingers move
// the map (web_scroll) or scroll a list, and pinch to zoom. The keyboard
// goes to SDL directly.
//
// The game's own folder (/home/web_user/.openttd: settings, saves, online
// content) is kept in IndexedDB by Emscripten's IDBFS, copied there each
// time the game saves something. The game in progress is saved as
// autosave/exit.sav whenever the page is hidden or left, and Continue loads
// it. Music: the game hands each song's MIDI file to midi.js.
//
// The engine can't be restarted within a page, so leaving a game reloads it.

import { MidiPlayer } from './midi.js';
import { holdersGate } from '../_shared/holders.js';
import { mbOf, wasmProgress } from '../_shared/engine.js';

// Early access for FrunkStore token holders: nothing starts until this
// screen is unlocked from a holder's phone
await holdersGate('OpenTTD');

// The base sets: [name, tar size, gzipped size]
const SETS = [['opengfx-8.0', 5396480, 3578953], ['opensfx-1.0.3', 13291520, 11596681], ['openmsx-0.4.2', 798720, 150332]];
const download = SETS.reduce((n, s) => n + s[2], 0);

const HOME = '/home/web_user/.openttd';
const EXIT_SAVE = `${HOME}/save/autosave/exit.sav`;

const $ = id => document.getElementById(id);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('openttd.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('openttd.' + key, JSON.stringify(value)); } catch {} },
};
const mb = bytes => `${(bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0)} MB`;
const touchFirst = !matchMedia('(hover: hover) and (pointer: fine)').matches;

// Settings for a first start, as openttd.cfg (the game fills in the rest):
// save the game when it's left, so Continue has it; on touch screens, bigger
// buttons, the map moved by dragging it, tooltips on a long press (the
// right button) and the game's own keyboard for text boxes. (Without the
// version, the game would read its private settings from this file.)
const DEFAULTS = `[version]
ini_version = 7

[gui]
autosave_on_exit = true
${touchFirst ? `scroll_mode = 3
hover_delay_ms = 0
osk_activation = immediately
` : ''}
[misc]
${touchFirst ? 'gui_scale = 150' : ''}
`;
// Don't ask about OpenTTD's survey (this build can't send it anyway)
const PRIVATE = `[network]
participate_survey = no
`;

// ---------- storage (IndexedDB) ----------
// files: { id: <set name>, size, data }

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('openttd', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('files', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(name, mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(name, mode);
    const req = fn(tx.objectStore(name));
    tx.oncomplete = () => { d.close(); resolve(req && req.result); };
    tx.onerror = tx.onabort = () => { d.close(); reject(tx.error); };
  });
}

const fileIds = () => store('files', 'readonly', s => s.getAllKeys()).catch(() => []);
const getFile = id => store('files', 'readonly', s => s.get(id));
const putFile = file => store('files', 'readwrite', s => s.put(file));

// The game's own folder, as IDBFS keeps it: whether the exit save is there,
// and when it was made, without starting the engine
function exitSave() {
  return new Promise(resolve => {
    const req = indexedDB.open(HOME);
    req.onupgradeneeded = () => { req.transaction.abort(); };
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('FILE_DATA')) { d.close(); resolve(null); return; }
      const get = d.transaction('FILE_DATA').objectStore('FILE_DATA').get(EXIT_SAVE);
      get.onsuccess = () => { d.close(); resolve(get.result ? new Date(get.result.timestamp) : null); };
      get.onerror = () => { d.close(); resolve(null); };
    };
  });
}

// ---------- library ----------

function status(text) { $('status').textContent = text; }

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
  const have = new Set(await fileIds());
  const ready = SETS.every(([name]) => have.has(name));
  $('free').replaceChildren(card('OpenTTD: Play', [
    ['small', `OpenTTD team · GPL · ${ready ? 'ready to play' : `${mb(download)} download the first time`}`],
    ['p', 'Build a transport empire: trains, road vehicles, ships and planes carrying passengers and cargo between towns and industries, from 1950 on.'],
  ], b => play(b, false)));
}

// The game left last time, to pick up from its exit save
async function renderContinue() {
  const btn = $('continue');
  const when = await exitSave();
  btn.hidden = !when;
  if (!when) return;
  btn.textContent = 'Continue';
  btn.title = `Saved ${when.toLocaleString()}`;
  btn.onclick = () => play(btn, true);
}

// ---------- loading ----------

function loading(title, text, part) {
  $('loading').hidden = false;
  $('loadTitle').textContent = title;
  $('loadText').textContent = text;
  $('loadBar').style.width = `${Math.round(100 * part)}%`;
}

// Downloads the base sets, gzipped, with progress; keeps them for next time
const memoryOnly = new Map();
async function downloadSets() {
  let got = 0;
  const have = new Set(await fileIds());
  for (const [name, size, gz] of SETS) {
    if (have.has(name)) { got += gz; continue; }
    const res = await fetch(`data/${name}.tar.gz`);
    if (!res.ok || !res.body) throw new Error(`download failed (${res.status})`);
    const reader = res.body.getReader();
    const chunks = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      loading('OpenTTD', `Downloading ${mb(got)} of ${mb(download)}…`, 0.9 * got / download);
    }
    loading('OpenTTD', 'Unpacking…', 0.9 * got / download);
    const data = new Uint8Array(await new Response(new Blob(chunks).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    if (data.length !== size) throw new Error('the download was damaged');
    navigator.storage?.persist?.().catch(() => {});
    await putFile({ id: name, size, data }).catch(() => { memoryOnly.set(name, data); });   // full storage: play anyway, download again next time
  }
}

// The files in a tar, as views into it: [path, bytes]
function untar(tar) {
  const out = [];
  const text = (at, len) => new TextDecoder().decode(tar.subarray(at, at + len)).replace(/\0.*$/s, '');
  for (let at = 0; at + 512 <= tar.length;) {
    const name = text(at, 100);
    if (!name) break;
    const size = parseInt(text(at + 124, 12).trim(), 8) || 0;
    const type = String.fromCharCode(tar[at + 156]);
    const prefix = text(at + 345, 155);
    if (type === '0' || type === '\0') out.push([(prefix ? prefix + '/' : '') + name, tar.subarray(at + 512, at + 512 + size)]);
    at += 512 + Math.ceil(size / 512) * 512;
  }
  return out;
}

// ---------- engine ----------

let ottd = null;          // the running engine (Emscripten module)
let audio = null;         // its AudioContext, shared with the music
let raf = 0, frames = 0, fpsSince = 0;
const music = new MidiPlayer();

function exists(path) {
  try { ottd.FS.stat(path); return true; } catch { return false; }
}

// Saves the game in progress and copies the game's folder to IndexedDB
async function saveAll() {
  if (!ottd) return;
  try { ottd._web_autosave(); } catch {}
  await ottd.syncfs().catch(() => {});
}

// Back to the library: the engine can't restart, so the page reloads
async function leave() {
  cancelAnimationFrame(raf);
  music.stop();
  if (ottd) await ottd.syncfs().catch(() => {});
  location.reload();
}

function failed(message) {
  cancelAnimationFrame(raf);
  music.stop();
  $('failedText').textContent = message || 'Something went wrong.';
  $('failed').hidden = false;
  $('loading').hidden = true;
}
$('failedOk').onclick = () => location.reload();

async function boot(resume) {
  loading('OpenTTD', 'Starting…', 0.95);
  const { default: createOpenTTD } = await import('./engine/openttd.js');
  const log = [];
  const keep = line => { log.push(line); if (log.length > 40) log.shift(); };
  const module = await createOpenTTD({
    canvas: $('canvas'),
    locateFile: path => new URL(`engine/${path}`, location.href).href,
    instantiateWasm: wasmProgress(new URL('engine/openttd.wasm', location.href).href, {
      progress: (got, total) => loading('OpenTTD', `Loading the game engine… ${mbOf(got, total)}`, 0.9 + 0.08 * got / total),
      arrived: () => loading('OpenTTD', 'Starting…', 0.98),
      failed: e => failed(`The game engine couldn't be loaded (${e.message}). Check the connection and try again.`),
    }),
    SDL2: audio ? { audioContext: audio } : {},
    print: keep,
    printErr: keep,
    onExit: () => leave(),
    onAbort: () => failed(`OpenTTD stopped: ${log.slice(-3).join(' ') || 'an error'}`),
    onOpenUrl: openUrl,
    onMusic: (path, loop, start, end) => {
      try { music.play(module.FS.readFile(path), { loop: !!loop, start, end }); } catch { music.stop(); }
      // which song is playing, for anyone checking
      if (music.playing) $('player').dataset.music = path.replace(/^.*\//, ''); else delete $('player').dataset.music;
    },
    onMusicStop: () => { music.stop(); delete $('player').dataset.music; },
    onMusicVolume: v => music.setVolume(v),
    musicPlaying: () => music.playing,
  });
  ottd = module;
  window.ottd = module;   // for checks
  const FS = module.FS;
  // The base sets, unpacked where the game looks (not in its saved folder)
  for (const [name] of SETS) {
    const tar = memoryOnly.get(name) || (await getFile(name))?.data;
    if (!tar) throw new Error('a game file is missing; try again');
    for (const [path, bytes] of untar(tar)) {
      FS.mkdirTree(`/baseset/${path.slice(0, path.lastIndexOf('/'))}`);
      FS.writeFile(`/baseset/${path}`, bytes, { canOwn: true });
    }
  }
  if (!exists(`${HOME}/openttd.cfg`)) FS.writeFile(`${HOME}/openttd.cfg`, DEFAULTS);
  if (!exists(`${HOME}/private.cfg`)) FS.writeFile(`${HOME}/private.cfg`, PRIVATE);

  $('library').hidden = true;
  $('player').hidden = false;
  $('loading').hidden = true;
  showSound();
  showCtrl();
  const { w, h } = fit();
  const args = ['-r', `${w}x${h}`, '-v', 'sdl', '-s', 'sdl:samples=2048', '-m', 'web'];
  if (resume && exists(EXIT_SAVE)) args.push('-g', EXIT_SAVE);
  try {
    module.callMain(args);
  } catch (e) {
    if (e !== 'unwind') throw e;
  }
  // no pointer on the game until a mouse comes in
  if (touchFirst) send(LEAVE);
  frames = 0;
  fpsSince = performance.now();
  raf = requestAnimationFrame(loop);
  if (touchFirst && !settings.get('hinted', false)) {
    settings.set('hinted', true);
    hint('Drag to move the map · pinch to zoom · hold a button to see what it does', 7000);
  }
}

let starting = false;

async function play(btn, resume) {
  if (starting || ottd) return;
  starting = true;
  btn?.classList.add('busy');
  // Made inside the tap, so the browser lets it play
  try { audio = new AudioContext({ sampleRate: 44100 }); } catch { audio = null; }
  if (audio) music.connect(audio);
  if (audio && !settings.get('sound', true)) audio.suspend();
  try {
    loading('OpenTTD', 'Loading…', 0);
    await downloadSets();
    await boot(resume);
  } catch (e) {
    // The engine is up and can't start again within this page, so the
    // library's buttons would do nothing: back to it by reloading
    if (ottd) { failed(`Couldn't start OpenTTD: ${e && e.message ? e.message : 'something went wrong'}.`); return; }
    $('loading').hidden = true;
    $('player').hidden = true;
    $('library').hidden = false;
    status(`Couldn't start OpenTTD: ${e && e.message ? e.message : 'check the connection and try again'}.`);
    audio?.close().catch(() => {});
    audio = null;
    renderFree();
    renderContinue();
  } finally {
    starting = false;
    btn?.classList.remove('busy');
  }
}

// What the game is doing, for the page and for checks
const MODES = ['menu', 'game', 'editor', 'starting'];
let mode = '';

function loop(t) {
  raf = requestAnimationFrame(loop);
  if (document.hidden) return;
  const state = ottd._web_state();
  const now = MODES[state & 3];
  if (now !== mode) {
    mode = now;
    $('player').dataset.mode = mode;
  }
  if (t - fpsSince >= 1000) {
    const n = ottd._web_frames();
    $('fps').textContent = `${Math.round((n - frames) * 1000 / (t - fpsSince))} fps`;
    frames = n;
    fpsSince = t;
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
// Mouse events for the game, in its pixels: 0 move, 1 down, 2 up (button 1
// left, 3 right), 3 wheel (steps), 4 the pointer came in, 5 it went out

const MOVE = 0, DOWN = 1, UP = 2, WHEEL = 3, ENTER = 4, LEAVE = 5;
const LEFT = 1, RIGHT = 3;
const send = (type, x = 0, y = 0, button = 0) => ottd?._web_mouse(type, Math.round(x), Math.round(y), button);

function at(e) {
  const r = $('canvas').getBoundingClientRect();
  const c = $('canvas');
  return { x: (e.clientX - r.left) * c.width / r.width, y: (e.clientY - r.top) * c.height / r.height };
}

// Touch: one finger taps (on lifting it), drags once it has moved (the map,
// a window, or a building tool's line), or holds the right button after a
// long press. A second finger before any of that starts a two-finger
// gesture: moving the map (or scrolling a list under the fingers) and
// pinching to zoom, one zoom level at a time.
const SLOP = 10;          // CSS px a finger may wander and still tap
const HOLD = 500;         // ms to a long press
const ZOOM = 1.45;        // pinch ratio per zoom level
const SCROLL = 22;        // game px of two-finger drag per scroll step
const fingers = new Map();   // pointerId -> { x, y } in game px, { cx, cy } in CSS px
let gesture = null;
// { kind: 'pending', id, x, y, cx, cy, timer } | { kind: 'drag'|'hold', id } |
// { kind: 'multi', map, mx, my, dist, wheel }

function centre() {
  const ps = [...fingers.values()];
  const x = ps.reduce((n, p) => n + p.x, 0) / ps.length, y = ps.reduce((n, p) => n + p.y, 0) / ps.length;
  const dist = ps.length > 1 ? Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) : 0;
  return { x, y, dist };
}

function startMulti() {
  const c = centre();
  gesture = { kind: 'multi', map: !ottd._web_window_at(Math.round(c.x), Math.round(c.y)), mx: c.x, my: c.y, dist: c.dist, wheel: 0 };
}

function onTouch(e) {
  if (!ottd) return;
  const p = at(e);
  if (e.type === 'pointerdown') {
    try { $('touch').setPointerCapture(e.pointerId); } catch {}
    fingers.set(e.pointerId, { ...p, cx: e.clientX, cy: e.clientY });
    if (fingers.size === 1 && !gesture) {
      send(ENTER);
      send(MOVE, p.x, p.y);
      const g = { kind: 'pending', id: e.pointerId, x: p.x, y: p.y, cx: e.clientX, cy: e.clientY };
      g.timer = setTimeout(() => {
        if (gesture !== g) return;
        send(DOWN, g.x, g.y, RIGHT);
        gesture = { kind: 'hold', id: g.id };
      }, HOLD);
      gesture = g;
    } else if (gesture?.kind === 'pending') {
      clearTimeout(gesture.timer);
      startMulti();
    } else if (gesture?.kind === 'multi' && fingers.size === 2) {
      startMulti();
    }
    return;
  }
  const f = fingers.get(e.pointerId);
  if (!f) return;
  if (e.type === 'pointermove') {
    Object.assign(f, p, { cx: e.clientX, cy: e.clientY });
    if (gesture?.kind === 'pending' && gesture.id === e.pointerId) {
      if (Math.hypot(e.clientX - gesture.cx, e.clientY - gesture.cy) < SLOP) return;
      clearTimeout(gesture.timer);
      send(DOWN, gesture.x, gesture.y, LEFT);
      send(MOVE, p.x, p.y);
      gesture = { kind: 'drag', id: e.pointerId };
    } else if ((gesture?.kind === 'drag' || gesture?.kind === 'hold') && gesture.id === e.pointerId) {
      send(MOVE, p.x, p.y);
    } else if (gesture?.kind === 'multi' && fingers.size >= 2) {
      const c = centre();
      const dx = c.x - gesture.mx, dy = c.y - gesture.my;
      gesture.mx = c.x;
      gesture.my = c.y;
      if (gesture.map) {
        ottd._web_scroll(Math.round(-dx), Math.round(-dy));
      } else {
        // a list under the fingers scrolls: fingers up, the list goes on
        gesture.wheel -= dy;
        while (Math.abs(gesture.wheel) >= SCROLL) {
          const step = Math.sign(gesture.wheel);
          gesture.wheel -= step * SCROLL;
          send(MOVE, c.x, c.y);
          send(WHEEL, c.x, c.y, step);
        }
      }
      if (gesture.map && gesture.dist > 0) {
        const ratio = c.dist / gesture.dist;
        if (ratio > ZOOM || ratio < 1 / ZOOM) {
          send(MOVE, c.x, c.y);
          send(WHEEL, c.x, c.y, ratio > 1 ? -1 : 1);
          gesture.dist = c.dist;
        }
      }
    }
    return;
  }
  // pointerup, pointercancel
  fingers.delete(e.pointerId);
  const cancel = e.type === 'pointercancel';
  if (gesture?.kind === 'pending' && gesture.id === e.pointerId) {
    clearTimeout(gesture.timer);
    if (!cancel) {
      send(DOWN, gesture.x, gesture.y, LEFT);
      send(UP, gesture.x, gesture.y, LEFT);
    }
    gesture = null;
  } else if (gesture?.kind === 'drag' && gesture.id === e.pointerId) {
    send(UP, p.x, p.y, LEFT);
    gesture = null;
  } else if (gesture?.kind === 'hold' && gesture.id === e.pointerId) {
    send(UP, p.x, p.y, RIGHT);
    gesture = null;
  } else if (gesture?.kind === 'multi') {
    if (fingers.size === 0) gesture = null;
    else startMulti();
  }
  if (fingers.size === 0) {
    gesture = null;
    send(LEAVE);
  }
}

// A mouse (or pen) goes to the game as it is. Buttons pressed while
// another is down come only as pointermove, so each event's buttons are
// compared with the last ones.
const BUTTONS = [[1, LEFT], [2, RIGHT], [4, 2]];
let mouseButtons = 0, wheelSum = 0;
function onMouse(e) {
  if (!ottd) return;
  const p = at(e);
  if (e.type === 'pointerenter') { send(ENTER); send(MOVE, p.x, p.y); return; }
  if (e.type === 'pointerleave') { send(LEAVE); return; }
  if (e.type === 'pointerdown') try { $('touch').setPointerCapture(e.pointerId); } catch {}
  send(MOVE, p.x, p.y);
  for (const [bit, button] of BUTTONS) {
    if ((e.buttons ^ mouseButtons) & bit) send(e.buttons & bit ? DOWN : UP, p.x, p.y, button);
  }
  mouseButtons = e.buttons;
}

for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerenter', 'pointerleave']) {
  $('touch').addEventListener(type, e => {
    e.preventDefault();
    if (e.pointerType === 'touch') { if (type !== 'pointerenter' && type !== 'pointerleave') onTouch(e); }
    else onMouse(e);
  });
}
$('touch').addEventListener('wheel', e => {
  e.preventDefault();
  if (!ottd) return;
  const p = at(e);
  wheelSum += e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
  while (Math.abs(wheelSum) >= 50) {
    const step = Math.sign(wheelSum);
    wheelSum -= step * 50;
    send(MOVE, p.x, p.y);
    send(WHEEL, p.x, p.y, step);
  }
}, { passive: false });

// Links in the game (its manuals, online content pages) can't open: the
// hub doesn't let apps open pages. The address is shown instead.
function openUrl(url) {
  hint(`Links don't open here: ${url}`, 8000);
}

// Ctrl held down for taps, until tapped again
function showCtrl() {
  const on = !!$('ctrlBtn').dataset.on;
  $('ctrlBtn').classList.toggle('on', on);
  $('ctrlBtn').setAttribute('aria-pressed', String(on));
  ottd?._web_modifiers(on ? 1 : 0, 0);
}
$('ctrlBtn').onclick = () => {
  if ($('ctrlBtn').dataset.on) delete $('ctrlBtn').dataset.on; else $('ctrlBtn').dataset.on = '1';
  showCtrl();
};

let hintTimer = 0;
function hint(text, ms = 4000) {
  clearTimeout(hintTimer);
  $('hint').textContent = text;
  $('hint').hidden = !text;
  if (text) hintTimer = setTimeout(() => { $('hint').hidden = true; }, ms);
}

// ---------- screen ----------

// The game fills the room under the bar, one game pixel per CSS pixel
function fit() {
  const w = Math.max(320, Math.floor(innerWidth)), h = Math.max(240, Math.floor(innerHeight - 60));
  const c = $('canvas');
  c.style.setProperty('width', `${w}px`, 'important');
  c.style.setProperty('height', `${h}px`, 'important');
  if (ottd && !$('player').hidden && (c.width !== w || c.height !== h)) ottd._web_resize?.(w, h);
  return { w, h };
}
addEventListener('resize', () => { if (!$('player').hidden) fit(); });

// ---------- leaving ----------

// Save, and stop the sound, while the screen is off or another app is
// showing (the game itself stops with the page's refreshes)
document.addEventListener('visibilitychange', () => {
  if (!ottd) return;
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

renderFree();
renderContinue();
