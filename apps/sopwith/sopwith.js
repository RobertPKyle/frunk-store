// Sopwith: SDL Sopwith (engine/, compiled to WebAssembly by
// tools/build-sopwith.mjs with tools/sopwith/sopwith-web.patch). The game's
// pictures and sounds are part of the code, so there is only the engine to
// load. It keeps its settings and high scores in /libsdl, mounted from
// IndexedDB. Its own touch strip is switched off: this page draws touch
// buttons beside the picture and reads controllers itself (the car lists each
// one twice), and passes both on through the web_* calls the patch adds.

import { padMenu, reason, secondTap } from '../_shared/gamepage.js';

(() => {

const $ = id => document.getElementById(id);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('sopwith.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('sopwith.' + key, JSON.stringify(value)); } catch {} },
};
const ENGINE = 'engine/';
const SAVES = '/libsdl';
const params = new URLSearchParams(location.search);
// ?touch=1 or ?touch=0 overrides it (for testing)
const touchFirst = params.has('touch') ? params.get('touch') !== '0' : !matchMedia('(hover: hover) and (pointer: fine)').matches;

// the game's keys (enum gamekey) and menu presses (enum menukey)
const KEY = { PULLUP: 1, PULLDOWN: 2, FLIP: 3, BOMB: 4, FIRE: 5, HOME: 6, ACCEL: 9, DECEL: 10 };
const MENUKEY = { START: 1, BACK: 2, UP: 3, DOWN: 4 };
const MENU = 1, GAME = 2;   // web_screen()
const ESC = 27, ENTER = 13;
const ROWS = 25;            // text rows on the game's 320x200 screen, 8 pixels each

let started = false, running = false, game = null;
let screen = 0, textWanted = false;

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

const canvas = $('canvas');
const focusGame = () => { if (running && $('name').hidden) canvas.focus({ preventScroll: true }); };

// ---------- saving ----------

let syncing = false, again = false;
function save() {
  if (!game || !running) return Promise.resolve();
  if (syncing) { again = true; return Promise.resolve(); }
  syncing = true;
  return new Promise(resolve => game.FS.syncfs(false, err => {
    syncing = false;
    if (err) console.warn('saving failed', err);
    resolve();
    if (again) { again = false; save(); }
  }));
}
// the game writes its settings and scores as files; this carries them to IndexedDB
setInterval(save, 10000);

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

// ---------- what the game is showing ----------

function showScreen() {
  const inGame = screen === GAME;
  for (const id of ['leftSide', 'rightSide']) $(id).hidden = !inGame;
  for (const id of ['leftMenu', 'rightMenu']) $(id).hidden = inGame;
  $('menuTouch').hidden = !touchFirst || inGame;
  $('endBtn').disabled = !inGame;
}

function readState() {
  const before = screen, wanted = textWanted;
  screen = game._web_screen();
  textWanted = !!game._web_text_input();
  if (screen !== before) {
    releaseAll();
    showScreen();
    if (screen === MENU && before === GAME) save();
  }
  if (textWanted && !wanted) {
    releaseAll();
    $('nameInput').value = settings.get('initials', '');
    $('name').hidden = false;
    if (!touchFirst) $('nameInput').focus();
  } else if (!textWanted && wanted) {
    $('name').hidden = true;
    focusGame();
  }
}

// ---------- high score initials ----------

function typeText(text) {
  for (const c of text) game._web_char(c.charCodeAt(0));
  game._web_char(ENTER);
}
$('nameForm').onsubmit = e => {
  e.preventDefault();
  const initials = $('nameInput').value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
  if (initials) settings.set('initials', initials);
  $('name').hidden = true;
  typeText(initials || 'CAR');
  save();
};
$('nameSkip').onclick = () => {
  $('name').hidden = true;
  game._web_char(ESC);   // the game leaves the name empty
};

// ---------- top bar ----------

secondTap($('endBtn'), () => { if (running && screen === GAME) game._web_ctrl('q'.charCodeAt(0)); });

// ---------- touch ----------

// Beside the picture in a level: hold a button and the game sees its key held.
const held = new Map();   // button -> key
function press(b, down) {
  const key = Number(b.dataset.key);
  if (down) {
    if (held.has(b)) return;
    held.set(b, key);
    b.classList.add('down');
  } else {
    if (!held.has(b)) return;
    held.delete(b);
    b.classList.remove('down');
  }
  if (running) game._web_key(key, down ? 1 : 0);
}
for (const b of document.querySelectorAll('.pad[data-key]')) {
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); press(b, true); });
  b.addEventListener('pointerup', () => press(b, false));
  b.addEventListener('pointercancel', () => press(b, false));
  b.addEventListener('lostpointercapture', () => press(b, false));
}

// In a menu: a tap on a line of text presses that item's key; the bottom
// lines ("ESC - Exit Menu") go back.
$('menuTouch').addEventListener('pointerdown', e => {
  if (!running || screen !== MENU) return;
  const r = canvas.getBoundingClientRect();
  const row = Math.floor((e.clientY - r.top) / r.height * ROWS);
  if (row < 0 || row >= ROWS) return;
  // a finger is wider than a line: try the line, then the ones either side
  for (const d of [0, 1, -1]) {
    const key = game._web_menu_row(row + d);
    if (key) { game._web_char(key); return; }
  }
  if (row >= 20) game._web_char(ESC);
});
$('backBtn').onclick = () => { if (running && screen === MENU) game._web_char(ESC); };

// ---------- controller ----------

// The car lists each controller twice: the device itself, and a "Tesla Virtual
// Gamepad" copy with the standard layout, whose A and B are the other way
// round. Buttons come only from the standard pad when there is one; the
// device's own axes still count for direction, since a small controller's
// D-pad may arrive only there. (window.fakePads stands in for real pads in the
// end-to-end check.)
const REPEAT = [350, 120];
const padHeld = new Map();   // game key -> held by the controller
const padDown = new Map();   // button -> down last time
let repeatDir = 0, repeatAt = 0, padSeen = false;

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
  for (const p of pads) {
    if (p === pad || !standard.length) continue;
    if (Math.abs(p.axes[0] || 0) > 0.5) x = p.axes[0];
    if (Math.abs(p.axes[1] || 0) > 0.5) y = p.axes[1];
  }
  const swap = /tesla virtual/i.test(pad.id);
  return {
    x, y,
    a: std ? (swap ? on(1) : on(0)) : on(0),
    b: std ? (swap ? on(0) : on(1)) : on(1),
    x2: std ? on(2) : on(3),
    y2: std ? on(3) : on(4),
    lb: std ? on(4) || on(6) : on(6) || on(8),
    rb: std ? on(5) || on(7) : on(7) || on(9),
    start: std ? on(9) : on(11),
  };
}

function edge(name, now) {
  const was = padDown.get(name) || false;
  padDown.set(name, now);
  return now && !was;
}

function padKey(key, down) {
  if (!!padHeld.get(key) === down) return;
  padHeld.set(key, down);
  game._web_key(key, down ? 1 : 0);
}

function pollPad(now) {
  const p = readPad();
  if (!p) return;
  const any = p.a || p.b || p.x2 || p.y2 || p.lb || p.rb || p.start || Math.abs(p.x) > 0.5 || Math.abs(p.y) > 0.5;
  if (any && !padSeen) {
    padSeen = true;
    $('padNote').hidden = false;
    game._web_set_pad(1);   // the menus show a cursor
  }
  if (!padSeen) return;

  if (!$('name').hidden) {
    if (edge('a', p.a) || edge('start', p.start)) $('nameForm').requestSubmit();
    else if (edge('b', p.b)) $('nameSkip').click();
    return;
  }

  if (screen === GAME) {
    padKey(KEY.PULLUP, p.y < -0.5);
    padKey(KEY.PULLDOWN, p.y > 0.5);
    padKey(KEY.FIRE, p.a);
    padKey(KEY.BOMB, p.b);
    padKey(KEY.FLIP, p.x2);
    padKey(KEY.HOME, p.y2);
    padKey(KEY.ACCEL, p.rb);
    padKey(KEY.DECEL, p.lb);
    for (const name of ['a', 'b', 'start']) edge(name, p[name]);
    return;
  }

  // the menus: a press, then a repeat while the D-pad is held
  const dir = p.y < -0.5 ? MENUKEY.UP : p.y > 0.5 ? MENUKEY.DOWN : 0;
  if (dir && (dir !== repeatDir || now >= repeatAt)) {
    repeatAt = now + REPEAT[dir === repeatDir ? 1 : 0];
    game._web_menu_key(dir);
  }
  repeatDir = dir;
  if (edge('a', p.a) || edge('start', p.start)) game._web_menu_key(MENUKEY.START);
  if (edge('b', p.b)) game._web_menu_key(MENUKEY.BACK);
}

// lets go of every key the page holds, so none sticks across screens
function releaseAll() {
  for (const b of [...held.keys()]) press(b, false);
  for (const key of padHeld.keys()) padKey(key, false);
  // a button still down from the last screen must be let go before it counts again
  const p = readPad();
  if (p) for (const name of ['a', 'b', 'start']) padDown.set(name, p[name]);
}

function tick(now) {
  requestAnimationFrame(tick);
  if (!running) return;
  readState();
  pollPad(now);
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
  try { return new AudioContext({ latencyHint: 'playback' }); } catch {}
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
  $('field').classList.toggle('touch', touchFirst);
  showScreen();
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); failed('The car\'s browser lost the game\'s picture. Start again to carry on.'); });
  try {
    await loadScript(ENGINE + 'sopwith.js');
    game = await window.createSopwith({
      canvas,
      SDL2: audio ? { audioContext: audio } : {},
      locateFile: path => ENGINE + path,
      print: line => { if (window.sopwithDebug) console.log(line); },
      printErr: line => { if (window.sopwithDebug) console.warn(line); },
      onAbort: what => (running ? failed(`The game stopped: ${what}`) : failed(reason(what, NO_LOAD), 'Couldn\'t start the game')),
    });
    loading('Starting…');
    const FS = game.FS;
    FS.mkdir(SAVES);
    FS.mount(FS.filesystems.IDBFS, {}, SAVES);
    await new Promise(resolve => FS.syncfs(true, err => {
      if (err) console.warn('loading saves failed', err);
      resolve();
    }));
    window.sopwithGame = () => game;
    running = true;
    $('loading').hidden = true;
    game.callMain([]);
  } catch (err) {
    if (err === 'unwind' || err?.name === 'ExitStatus') {
      // the game's loop is running; main hands back to the browser by unwinding
    } else {
      console.warn(err?.stack || err);
      if (running) failed(err?.message || String(err));
      else failed(reason(err, NO_LOAD), 'Couldn\'t start the game');
      return;
    }
  }
  focusGame();
  showSound();
}
$('play').onclick = $('play2').onclick = play;
requestAnimationFrame(tick);

// a tap on a button takes the keyboard's focus from the picture; give it back
addEventListener('pointerup', () => setTimeout(focusGame, 0));

window.sopwithStats = () => ({
  running, screen, textWanted, padSeen,
  width: canvas.width, height: canvas.height,
  audio: audio?.state,
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
    releaseAll();
    save();
  } else wakeSound();
});

addEventListener('error', e => { if (started && e.message && !/unwind/.test(e.message)) failed(`The game stopped: ${e.message}`); });

})();
