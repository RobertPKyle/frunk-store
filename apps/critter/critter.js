// Critical Mass (Critter): Frank Becker's space shooter (engine/, compiled to
// WebAssembly by tools/build-critter.mjs with tools/critter/critter-web.patch).
// The game's data is one zip, preloaded as /resource.dat. It draws 4:3 at the
// size the page asks for, runs from the browser's animation frames, and keeps
// its settings and scores in /Critter, mounted from IndexedDB. The game reads
// only a mouse and a keyboard, so this page turns touch and controllers into
// the web_* calls the patch adds.

import { fetchPackage, padMenu, reason, secondTap } from '../_shared/gamepage.js';
import { mbOf } from '../_shared/engine.js';
import { inputSwap } from '../_shared/inputswap.js';

(() => {

const $ = id => document.getElementById(id);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('critter.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('critter.' + key, JSON.stringify(value)); } catch {} },
};
const ENGINE = 'engine/';
const SAVES = '/Critter';
const params = new URLSearchParams(location.search);
// ?touch=1 or ?touch=0 overrides it (for testing)
const touchFirst = params.has('touch') ? params.get('touch') !== '0' : !matchMedia('(hover: hover) and (pointer: fine)').matches;

// SDL key codes for the keys the game's bindings and menus read
const KEY = { UP: 1073741906, DOWN: 1073741905, LEFT: 1073741904, RIGHT: 1073741903, ENTER: 13, BACKSPACE: 8, SPACE: 32, ALT: 1073742050, CTRL: 1073742048, P: 112 };
const MENU = 1, GAME = 2, PAUSED = 3;   // web_state's low bits

let started = false, running = false, game = null, frames = 0;
let canvasRect = null;

function loading(text) { $('loading').hidden = false; $('loadText').textContent = text; }
const NO_LOAD = 'Couldn\'t load the game. Check the connection and try again.';
function failed(text, title) {
  if (title) $('failedTitle').textContent = title;
  running = false;
  $('loading').hidden = true;
  $('failedText').textContent = text;
  $('failed').hidden = false;
}
$('failedOk').onclick = () => location.reload();
padMenu();

const key = (sym, down) => game._web_key(sym, down ? 1 : 0);
const tapKey = sym => { key(sym, true); setTimeout(() => key(sym, false), 40); };

// ---------- saving ----------

let syncing = false, again = false;
function syncfs() {
  if (!game) return Promise.resolve();
  if (syncing) { again = true; return Promise.resolve(); }
  syncing = true;
  return new Promise(resolve => game.FS.syncfs(false, err => {
    syncing = false;
    if (err) console.warn('saving failed', err);
    resolve();
    if (again) { again = false; syncfs(); }
  }));
}
function save() {
  if (!running) return Promise.resolve();
  try { game._web_save(); } catch (e) { console.warn(e); }
  return syncfs();
}
setInterval(save, 60000);

// The hub's Apps button (or the car's back button) unloads this page. The hub
// asks first, so the scores can be written back; it waits up to a second.
addEventListener('message', async e => {
  if (e.source !== parent || e.data?.frunk !== 'close') return;
  await save();
  e.source.postMessage({ frunk: 'closed' }, e.origin);
});
if (parent !== window) parent.postMessage({ frunk: 'save-on-close' }, '*');

// ---------- sound ----------

let audio = null;
const soundOn = () => settings.get('sound', true);
const blocked = () => soundOn() && audio && audio.state !== 'running' && !document.hidden;
function showSound() {
  $('soundBtn').textContent = !soundOn() ? 'Sound off' : blocked() ? 'Tap for sound' : 'Sound on';
}
function wakeSound() {
  if (audio && soundOn() && !document.hidden && audio.state !== 'running') audio.resume().then(showSound, () => {});
}
$('soundBtn').onclick = () => {
  if (blocked()) { wakeSound(); return; }
  settings.set('sound', !soundOn());
  if (audio) soundOn() ? audio.resume() : audio.suspend();
  showSound();
};
for (const type of ['pointerdown', 'keydown', 'touchstart']) addEventListener(type, wakeSound, true);
setInterval(() => {
  if (!running) return;
  if (audio && !soundOn() && audio.state === 'running') audio.suspend();
  showSound();
}, 1000);

// ---------- picture ----------

const SIZES = { fast: [640, 480], sharp: [800, 600] };
const showSharp = () => { $('sharp').textContent = `Picture: ${settings.get('sharp', true) ? 'Sharp' : 'Fast'}`; };
$('sharp').onclick = () => { settings.set('sharp', !settings.get('sharp', true)); showSharp(); };
showSharp();

// ---------- what the game is doing ----------

let state = 0, context = 0, alive = true, nameWanted = false, score = 0;
let touchMode = touchFirst;   // Alt and Special show in a level (the swap button below sets it)

function showState() {
  const inGame = context === GAME && alive && !nameWanted;
  $('pauseBtn').textContent = context === PAUSED ? 'Resume' : 'Pause';
  $('pauseBtn').disabled = !(context === PAUSED || inGame);
  for (const b of [$('alt'), $('special')]) b.hidden = !touchMode || !inGame;
  $('over').hidden = !(context === GAME && !alive && !nameWanted);
  if (nameWanted && $('name').hidden) {
    $('nameInput').value = settings.get('name', 'Driver');
    $('name').hidden = false;
  }
}

function readState() {
  state = game._web_state();
  const before = context;
  context = state & 7;
  alive = !!(state & 8);
  nameWanted = !!(state & 16);
  score = game._web_score();
  showState();
  if (context !== before) {
    releaseHeld();
    if (context === MENU && before === GAME) save();
  }
}

$('nameForm').onsubmit = e => {
  e.preventDefault();
  const name = $('nameInput').value.trim().replace(/\s+/g, '_').slice(0, 15) || 'Driver';
  settings.set('name', name);
  const size = game.lengthBytesUTF8(name) + 1;
  const ptr = game._malloc(size);
  game.stringToUTF8(name, ptr, size);
  game._web_name(ptr);
  game._free(ptr);
  $('name').hidden = true;
  save();
};

// ---------- top bar ----------

$('pauseBtn').onclick = () => { if (running) tapKey(KEY.P); };
$('menuBtn').onclick = () => { if (running) tapKey(KEY.BACKSPACE); };
$('againBtn').onclick = () => { if (running) tapKey(KEY.CTRL); };   // the game restarts on the third weapon's button
$('overMenuBtn').onclick = () => { if (running) tapKey(KEY.BACKSPACE); };

// ---------- touch ----------

// One finger on the picture drives: the ship moves with the drag, and fires
// for as long as the finger is down. Alt and Special hold the other two
// weapons. In the menus a tap points at an item and clicks it.
const DRAG = 1.6;   // ship travel for a given finger travel
let dragId = null, dragX = 0, dragY = 0, firing = false, clicking = false;

function canvasBox() {
  if (!canvasRect) canvasRect = $('canvas').getBoundingClientRect();
  return canvasRect;
}
addEventListener('resize', () => { canvasRect = null; });

function menuPoint(e) {
  const r = canvasBox();
  game._web_menu_point((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
}
function setFiring(on) {
  if (firing === on) return;
  firing = on;
  key(KEY.SPACE, on);
}

$('touch').addEventListener('pointerdown', e => {
  if (!running || dragId !== null) return;
  dragId = e.pointerId;
  $('touch').setPointerCapture(e.pointerId);
  dragX = e.clientX;
  dragY = e.clientY;
  if (context === MENU) {
    menuPoint(e);
    clicking = true;
    game._web_mouse_button(1, 1);
  } else if (context === GAME && alive) {
    setFiring(true);
  }
});
$('touch').addEventListener('pointermove', e => {
  if (e.pointerId !== dragId || !running) return;
  const r = canvasBox();
  const scale = $('canvas').width / r.width * DRAG;
  if (context === MENU) menuPoint(e);
  else game._web_move((e.clientX - dragX) * scale, (dragY - e.clientY) * scale);
  dragX = e.clientX;
  dragY = e.clientY;
});
function endTouch(e) {
  if (e.pointerId !== dragId) return;
  dragId = null;
  if (!running) return;
  setFiring(false);
  if (clicking) { clicking = false; game._web_mouse_button(1, 0); }
}
$('touch').addEventListener('pointerup', endTouch);
$('touch').addEventListener('pointercancel', endTouch);

const held = [];
for (const [id, sym] of [['alt', KEY.ALT], ['special', KEY.CTRL]]) {
  const b = $(id);
  const up = () => { if (b.classList.contains('down')) { b.classList.remove('down'); if (running) key(sym, false); } };
  b.addEventListener('pointerdown', e => { b.setPointerCapture(e.pointerId); b.classList.add('down'); if (running) key(sym, true); });
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  held.push(up);
}

function releaseHeld() {
  for (const up of held) up();
  setFiring(false);
  // a button still down from the last screen must be let go before it counts again
  const p = readPad();
  for (const i of padDown.keys()) padDown.set(i, !!p);
  if (p) [p.a, p.b, p.c].forEach((down, i) => padDown.set('held' + i, down));
  for (const b of padKeys) if (b.on) { b.on = false; key(b.sym, false); }
}

// ---------- touch or controller ----------

// Touch mode shows Alt and Special in a level; controller mode leaves the
// picture clear. Dragging steers either way. A controller press picks
// controller mode and a finger on the picture picks touch, until the player
// pins one on the bar's button.
const input = inputSwap({
  id: 'critter', button: $('inputBtn'), start: touchFirst ? 'touch' : 'pad',
  apply: mode => {
    touchMode = mode === 'touch';
    if (!touchMode) for (const up of held) up();   // a weapon held as its button goes would keep firing
    if (running) showState();
  },
});
$('touch').addEventListener('pointerdown', e => { if (e.pointerType === 'touch') input.auto('touch'); });

// ---------- controller ----------

// The car lists each controller twice: the device itself, and a "Tesla Virtual
// Gamepad" copy with the standard layout, whose A and B are the other way
// round. Buttons come only from the standard pad when there is one; the
// device's own axes still count for direction, since a small controller's
// D-pad may arrive only there. (window.fakePads stands in for real pads in the
// end-to-end check.)
const DEAD = 0.18, REPEAT = [350, 120], ACROSS = 0.9;   // seconds for the ship to cross the screen on a full stick
const padKeys = [{ i: 0, sym: KEY.SPACE, on: false }, { i: 1, sym: KEY.ALT, on: false }, { i: 2, sym: KEY.CTRL, on: false }];
const padDown = new Map();      // button -> held since before it may count again
let repeatDir = null, repeatAt = 0, lastPad = 0;

function readPad() {
  const pads = [...(window.fakePads || navigator.getGamepads?.() || [])].filter(Boolean);
  const standard = pads.filter(p => p.mapping === 'standard');
  const pad = standard[0] || pads[0];
  if (!pad) return null;
  let x = pad.axes[0] || 0, y = pad.axes[1] || 0;
  const std = pad.mapping === 'standard';
  const on = i => !!pad.buttons[i]?.pressed;
  if (std) {
    if (on(14)) x = -1;
    if (on(15)) x = 1;
    if (on(12)) y = -1;
    if (on(13)) y = 1;
  }
  // a controller's D-pad may be only on the device's own axes
  for (const p of pads) {
    if (p === pad || !standard.length) continue;
    if (Math.abs(p.axes[0] || 0) > 0.5) x = p.axes[0];
    if (Math.abs(p.axes[1] || 0) > 0.5) y = p.axes[1];
  }
  const swap = /tesla virtual/i.test(pad.id);
  const a = std ? (swap ? on(1) : on(0)) : on(0);
  const b = std ? (swap ? on(0) : on(1)) : on(1);
  const c = std ? on(2) : on(3);
  const start = std ? on(9) : on(11);
  const select = std ? on(8) : on(10);
  return { x, y, a, b, c, start, select };
}

function edge(name, now) {
  const was = padDown.get(name) || false;
  padDown.set(name, now);
  return now && !was;
}

function pollPad(dt, now) {
  const p = readPad();
  if (!p) return;
  if (p.a || p.b || p.c || p.start || p.select || Math.abs(p.x) > 0.5 || Math.abs(p.y) > 0.5) input.auto('pad');
  const inGame = context === GAME && alive && !nameWanted;

  if (edge('start', p.start)) tapKey(KEY.BACKSPACE);
  if (edge('select', p.select) && (inGame || context === PAUSED)) tapKey(KEY.P);

  if (inGame) {
    const x = Math.abs(p.x) > DEAD ? p.x : 0, y = Math.abs(p.y) > DEAD ? p.y : 0;
    if (x || y) {
      const speed = $('canvas').width / ACROSS * dt;
      game._web_move(x * speed, -y * speed);
    }
    const buttons = [p.a, p.b, p.c];
    for (const b of padKeys) {
      const down = buttons[b.i];
      if (down && !padDown.get('held' + b.i)) {
        if (!b.on) { b.on = true; key(b.sym, true); }
      } else if (!down) {
        padDown.set('held' + b.i, false);
        if (b.on) { b.on = false; key(b.sym, false); }
      }
    }
    // (kept up to date, so the fire button held at the moment the ship dies isn't a press)
    edge('a', p.a);
    edge('b', p.b);
    return;
  }

  if (context === GAME && !alive && !nameWanted) {
    if (edge('a', p.a)) $('againBtn').click();
    if (edge('b', p.b)) $('overMenuBtn').click();
    return;
  }
  if (nameWanted) {
    if (edge('a', p.a)) $('nameForm').requestSubmit();
    return;
  }
  if (context !== MENU) return;

  // the menus: a press, then a repeat while the D-pad is held
  const dir = p.y < -0.5 ? KEY.UP : p.y > 0.5 ? KEY.DOWN : p.x < -0.5 ? KEY.LEFT : p.x > 0.5 ? KEY.RIGHT : null;
  if (dir && (dir !== repeatDir || now >= repeatAt)) {
    repeatAt = now + REPEAT[dir === repeatDir ? 1 : 0];
    tapKey(dir);
  }
  repeatDir = dir;
  if (edge('a', p.a)) tapKey(KEY.ENTER);
  if (edge('b', p.b)) tapKey(KEY.BACKSPACE);
}

function tick(now) {
  requestAnimationFrame(tick);
  if (!running || !game.critterReady) return;
  readState();
  const dt = Math.min(0.1, (now - lastPad) / 1000);
  lastPad = now;
  pollPad(dt, now);
}

// ---------- start ----------

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(NO_LOAD));
    document.body.append(s);
  });
}

function makeAudio() {
  try { return new AudioContext({ sampleRate: 44100, latencyHint: 'playback' }); } catch {}
  try { return new AudioContext(); } catch {}
  return null;
}

async function play() {
  if (started) return;
  started = true;
  for (const b of [$('play'), $('play2')]) b.disabled = true;
  try { navigator.storage?.persist?.(); } catch {}
  // made here, inside the tap, so the browser lets it play
  audio = makeAudio();
  if (audio && !soundOn()) audio.suspend();
  loading('Loading…');
  $('start').hidden = true;
  $('player').hidden = false;
  const canvas = $('canvas');
  // the game asks for the pointer to steer with a mouse; on a touch screen
  // there is no pointer to lock, only the browser's notice about it
  if (touchFirst) {
    canvas.requestPointerLock = () => {};
    $('touch').hidden = false;
  } else {
    canvas.addEventListener('mousedown', () => {
      if (running && context === GAME && !document.pointerLockElement) canvas.requestPointerLock()?.catch?.(() => {});
    });
  }
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); failed('The car\'s browser lost the game\'s picture. Start again to carry on.'); });
  try {
    // Ahead of the engine, so a dropped connection carries on where it
    // stopped; the engine on its own would hang
    let pack = await fetchPackage(ENGINE + 'critter.data', (got, total) => loading(`Loading… ${mbOf(got, total)}`));
    loading('Starting…');
    await loadScript(ENGINE + 'critter.js');
    const [critterWidth, critterHeight] = SIZES[settings.get('sharp', true) ? 'sharp' : 'fast'];
    game = await window.createCritter({
      canvas,
      critterWidth,
      critterHeight,
      SDL2: audio ? { audioContext: audio } : {},
      getPreloadedPackage: () => { const p = pack; pack = null; return p; },
      locateFile: path => ENGINE + path,
      print: line => { if (window.critterDebug) console.log(line); },
      printErr: line => { if (window.critterDebug) console.warn(line); },
      onAbort: what => (running ? failed(`The game stopped: ${what}`) : failed(reason(what, NO_LOAD), 'Couldn\'t start the game')),
      preMainLoop: () => { frames++; },
      gamePostRun: () => location.reload(),
    });
    const FS = game.FS;
    FS.mkdir(SAVES);
    FS.mount(game.IDBFS, {}, SAVES);
    await new Promise(resolve => FS.syncfs(true, err => {
      if (err) console.warn('loading saves failed', err);
      resolve();
    }));
    window.critterGame = () => game;
    game.readyToStart = 1;
    running = true;
    game.callMain([]);
  } catch (err) {
    if (err === 'unwind' || err?.name === 'ExitStatus') {
      // the game's main loop is running; it ends main by throwing
    } else {
      console.warn(err?.stack || err);
      if (running) failed(err?.message || String(err));
      else failed(reason(err, NO_LOAD), 'Couldn\'t start the game');
      return;
    }
  }
  // the first frames load the game's data; the screen shows once they have
  const waitReady = () => {
    if (game.critterFailed) { failed('The game couldn\'t start.'); return; }
    if (game.critterReady) {
      $('loading').hidden = true;
      canvas.focus();
      showSound();
      return;
    }
    requestAnimationFrame(waitReady);
  };
  waitReady();
}
$('play').onclick = $('play2').onclick = play;
requestAnimationFrame(tick);

window.critterStats = () => ({
  frames, running, context, alive, nameWanted, score,
  width: $('canvas').width, height: $('canvas').height, ready: !!game?.critterReady,
  audio: audio?.state, memoryMB: game ? Math.round(game.HEAP8.length / 1048576) : 0,
});

// ---------- leaving ----------

secondTap($('quitBtn'), async () => {
  await save();
  location.reload();
});

document.addEventListener('visibilitychange', () => {
  if (!running) return;
  if (document.hidden) {
    audio?.suspend();
    if (context === GAME && alive) tapKey(KEY.P);   // pauses the game
    save();
  } else wakeSound();
});

// Esc on a keyboard ends the pointer lock without reaching the game; that opens the menu
let locked = false;
document.addEventListener('pointerlockchange', () => {
  const now = !!document.pointerLockElement;
  if (locked && !now && running && context === GAME && alive) tapKey(KEY.BACKSPACE);
  locked = now;
});

addEventListener('error', e => { if (started && e.message && !/unwind/.test(e.message)) failed(`The game stopped: ${e.message}`); });

})();
