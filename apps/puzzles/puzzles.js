// Logic Puzzles: Simon Tatham's Portable Puzzle Collection (40 puzzles,
// each compiled to WebAssembly in engine/ by tools/build-puzzles.mjs),
// made for a touch screen.
//
// Each puzzle is upstream's own web build: its script finds this page's
// elements by id (the canvas, the Type menu, New, Undo and the rest) and
// runs them itself. This page adds what a car needs: the list of puzzles,
// touch (a tap is the puzzle's left click, a long press its right click,
// a two-finger tap its middle click, and Right-click swaps tap and hold),
// keys at the side for puzzles that take numbers or letters (web_keys in
// tools/puzzles/puzzles-web.patch), a controller, the manual's chapter as
// Help, and the game kept after every move (in localStorage, as the
// puzzle's own save file), so leaving loses nothing.
//
// One puzzle per page: going back to the list reloads it.
(() => {
'use strict';

const $ = id => document.getElementById(id);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('puzzles.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('puzzles.' + key, JSON.stringify(value)); } catch {} },
};
// A game in progress, as the puzzle's save file
const saved = id => { try { return localStorage.getItem(`puzzles.${id}.save`); } catch { return null; } };
const forget = id => { try { localStorage.removeItem(`puzzles.${id}.save`); } catch {} };

let toastTimer = 0;
function toast(text, ms = 4000) {
  clearTimeout(toastTimer);
  $('toast').textContent = text;
  $('toast').hidden = !text;
  if (text) toastTimer = setTimeout(() => { $('toast').hidden = true; }, ms);
}

// ---------- library ----------

let list = [];   // puzzles.json: [{ id, title, description, objective }]

function status(text) {
  $('status').textContent = text;
  $('status').hidden = !text;
}

async function renderLibrary() {
  try {
    const res = await fetch('puzzles.json');
    if (!res.ok) throw new Error(res.status);
    list = (await res.json()).puzzles;
  } catch {
    status('Couldn\'t load the list of puzzles. Check the connection and try again.');
    return;
  }
  $('list').replaceChildren(...list.map(p => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'puzzle';
    const img = document.createElement('img');
    img.src = `icons/${p.id}.png`;
    img.alt = '';
    img.loading = 'lazy';
    const t = document.createElement('b');
    t.textContent = p.title;
    const s = document.createElement('small');
    const solved = settings.get(`${p.id}.solved`, 0);
    if (saved(p.id)) { s.textContent = 'In progress'; s.className = 'going'; }
    else s.textContent = solved ? `Solved ${solved === 1 ? 'once' : `${solved} times`}` : p.description;
    b.title = p.objective;
    b.append(img, t, s);
    b.onclick = () => play(p, b);
    return b;
  }));
  const last = list.find(p => p.id === settings.get('last', null) && saved(p.id));
  $('continue').hidden = !last;
  if (last) {
    $('continue').textContent = `Continue ${last.title}`;
    $('continue').onclick = () => play(last, $('continue'));
  }
}

// ---------- the puzzle ----------

let current = null;       // the puzzle being played
let ready = false;        // it has started
let api = null;           // its functions

function play(p, btn) {
  if (current) return;
  current = p;
  btn?.classList.add('busy');
  settings.set('last', p.id);
  // each puzzle's own preferences (its Options), not one set for the page
  window.puzzle_prefs_key = `puzzles.${p.id}.prefs`;
  // the puzzles report problems (a bad custom size) with alert(), which the
  // hub's frame doesn't allow
  window.alert = text => toast(String(text), 6000);
  $('title').textContent = p.title;
  $('library').hidden = true;
  $('puzzle').hidden = false;
  $('loading').hidden = false;
  showRight();
  const s = document.createElement('script');
  s.src = `engine/${p.id}.js`;
  s.onerror = () => {
    current = null;
    btn?.classList.remove('busy');
    $('puzzle').hidden = true;
    $('loading').hidden = true;
    $('library').hidden = false;
    status(`Couldn't load ${p.title}. Check the connection and try again.`);
  };
  // The puzzle calls post_init() once it has drawn its first board
  s.onload = () => {
    const real = window.post_init;
    window.post_init = () => { real(); started(); };
  };
  document.body.append(s);
  setTimeout(() => {
    if (ready || !current) return;
    $('loading').textContent = `${p.title} didn't start. Tap to go back to the puzzles.`;
    $('loading').onclick = () => location.reload();
  }, 20000);
}

function started() {
  const M = window.Module;
  api = {
    mousedown: M.cwrap('mousedown', 'boolean', ['number', 'number', 'number']),
    mouseup: M.cwrap('mouseup', 'boolean', ['number', 'number', 'number']),
    mousemove: M.cwrap('mousemove', 'boolean', ['number', 'number', 'number']),
    getSave: M.cwrap('get_save_file', 'number', []),
    freeSave: M.cwrap('free_save_file', 'void', ['number']),
    loadGame: M.cwrap('load_game', 'void', []),
    keys: M.cwrap('web_keys', 'number', []),
    key: M.cwrap('web_key', 'void', ['number']),
    cursor: M.cwrap('web_cursor', 'void', ['number']),
    status: M.cwrap('web_status', 'number', []),
  };
  const text = saved(current.id);
  if (text) {
    if (!load(text)) forget(current.id);
    // a finished game left last time: a new one of the same kind
    else if (api.status() !== 0) $('new').click();
  }
  ready = true;
  $('loading').hidden = true;
  afterMove();
  requestAnimationFrame(pads);
  if (!settings.get('hinted', false)) {
    settings.set('hinted', true);
    toast('Tap for a click, hold for a right click. Help has each puzzle\'s rules.', 6000);
  }
}

// Loads a game from the puzzle's save file; false if it wasn't one
function load(text) {
  const bytes = new TextEncoder().encode(text);
  let pos = 0, ok = true;
  window.savefile_read_callback = (buf, len) => {
    if (pos + len > bytes.length) return false;
    window.Module.writeArrayToMemory(bytes.subarray(pos, pos + len), buf);
    pos += len;
    return true;
  };
  const alert = window.alert;
  window.alert = () => { ok = false; };
  try { api.loadGame(); } catch { ok = false; }
  window.alert = alert;
  window.savefile_read_callback = null;
  return ok;
}

function save() {
  if (!ready) return;
  try {
    const ptr = api.getSave();
    const text = window.Module.UTF8ToString(ptr);
    api.freeSave(ptr);
    localStorage.setItem(`puzzles.${current.id}.save`, text);
  } catch {}
}

// The puzzle calls web_moved() after every move, new game and undo (from
// inside its own code, so the work waits for it to return)
let moveTimer = 0, saveTimer = 0;
window.web_moved = () => {
  if (!ready) return;
  clearTimeout(moveTimer);
  moveTimer = setTimeout(afterMove, 0);
};
function afterMove() {
  showKeys();
  showStatus();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 500);
}

// Solved or lost; a solve is counted once per game, and not when Solve
// gave the answer
let lastStatus = 0, counted = false, helped = false;
function showStatus() {
  const s = api.status();
  $('won').hidden = !s;
  $('won').textContent = s > 0 ? 'Solved!' : s < 0 ? 'Lost' : '';
  $('won').classList.toggle('lost', s < 0);
  if (s > 0 && lastStatus <= 0 && !counted && !helped) {
    counted = true;
    settings.set(`${current.id}.solved`, settings.get(`${current.id}.solved`, 0) + 1);
  }
  lastStatus = s;
}
const freshGame = () => { counted = false; helped = false; };
$('new').addEventListener('click', freshGame, true);
$('restart').addEventListener('click', () => { helped = false; }, true);
$('solve').addEventListener('click', () => { helped = true; }, true);

// ---------- keys at the side ----------

let keysShown = null;
function showKeys() {
  const ptr = api.keys();
  const raw = window.Module.UTF8ToString(ptr);
  api.freeSave(ptr);
  if (raw === keysShown) return;
  keysShown = raw;
  $('keys').replaceChildren(...raw.split('\x1e').filter(Boolean).map(k => {
    const [label, button] = k.split('\x1f');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = label.length > 2 ? 'btn wide' : 'btn';
    b.textContent = label;
    // pressed on touch, so the puzzle keeps its selection and focus
    b.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (ready) api.key(+button);
    });
    return b;
  }));
}

// ---------- touch ----------

const canvas = $('puzzlecanvas');
const HOLD = 450;         // ms to a long press
const SLOP = 8;           // CSS px a finger may wander and still tap
let finger = null;        // { id, at, cx, cy, button (-1 until known), middle, timer }

// Right-click: taps are right clicks and long presses left ones
const tapButton = () => (settings.get('right', false) ? 2 : 0);
function showRight() {
  $('rightBtn').setAttribute('aria-pressed', String(settings.get('right', false)));
}
$('rightBtn').onclick = () => {
  settings.set('right', !settings.get('right', false));
  showRight();
};

const at = e => window.canvas_mouse_coords(e, canvas);
function press(button) {
  clearTimeout(finger.timer);
  finger.button = button;
  api.mousedown(finger.at.x, finger.at.y, button);
}

canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' || !ready) return;
  // no made-up mouse events after this: the puzzle hears only this page
  e.preventDefault();
  if (finger) {
    // a second finger before the first did anything: a middle click
    if (finger.button < 0) { clearTimeout(finger.timer); finger.middle = true; }
    return;
  }
  finger = { id: e.pointerId, at: at(e), cx: e.clientX, cy: e.clientY, button: -1, middle: false };
  finger.timer = setTimeout(() => {
    if (finger && finger.button < 0 && !finger.middle) press(2 - tapButton());
  }, HOLD);
  try { canvas.setPointerCapture(e.pointerId); } catch {}
});
canvas.addEventListener('pointermove', e => {
  if (!finger || e.pointerId !== finger.id) return;
  const p = at(e);
  if (finger.button < 0) {
    if (finger.middle || Math.hypot(e.clientX - finger.cx, e.clientY - finger.cy) < SLOP) return;
    press(tapButton());
  }
  api.mousemove(p.x, p.y, 1 << finger.button);
});
function lift(e) {
  if (!finger || e.pointerId !== finger.id) return;
  clearTimeout(finger.timer);
  if (finger.button < 0) {
    if (e.type === 'pointerup') {
      const b = finger.middle ? 1 : tapButton();
      api.mousedown(finger.at.x, finger.at.y, b);
      api.mouseup(finger.at.x, finger.at.y, b);
    }
  } else {
    const p = at(e);
    api.mouseup(p.x, p.y, finger.button);
  }
  finger = null;
}
canvas.addEventListener('pointerup', lift);
canvas.addEventListener('pointercancel', lift);

// ---------- controllers ----------
// Buttons by position, as in the other games: a is the right face button
// (A on Nintendo layouts), b the bottom one, x the left, y the top. The car
// lists a controller twice (raw and standard), so buttons come only from
// standard pads when there is one; raw pads add D-pad directions.

const CURSOR = { up: 0, down: 1, left: 2, right: 3 };
const held = new Map();   // name -> time of its next repeat

function readPads() {
  const out = new Set();
  const pads = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean);
  const standard = pads.filter(p => p.mapping === 'standard');
  const dirs = (p, ax) => {
    if (ax[1] < -0.5) out.add('up');
    if (ax[1] > 0.5) out.add('down');
    if (ax[0] < -0.5) out.add('left');
    if (ax[0] > 0.5) out.add('right');
  };
  for (const p of pads) {
    const on = i => p.buttons[i]?.pressed;
    dirs(p, p.axes);
    if (p.mapping === 'standard') {
      for (const [i, n] of [[12, 'up'], [13, 'down'], [14, 'left'], [15, 'right'], [1, 'a'], [0, 'b'], [2, 'x'], [3, 'y']]) if (on(i)) out.add(n);
    } else if (!standard.length) {
      for (const [i, n] of [[0, 'a'], [1, 'b'], [3, 'x'], [4, 'y']]) if (on(i)) out.add(n);
    }
  }
  return out;
}

function pads(t) {
  requestAnimationFrame(pads);
  if (!ready || document.hidden || !$('help').hidden || window.dlg_dimmer) return;
  const now = readPads();
  for (const n of now) {
    const next = held.get(n);
    if (next === undefined || (n in CURSOR && t >= next)) {
      held.set(n, t + (next === undefined ? 350 : 110));
      if (n in CURSOR) api.cursor(CURSOR[n]);
      else if (n === 'a') api.cursor(4);
      else if (n === 'b') api.cursor(5);
      else if (n === 'x') $('undo').click();
      else if (n === 'y') $('redo').click();
    }
  }
  for (const n of held.keys()) if (!now.has(n)) held.delete(n);
}

// ---------- menus and help ----------

// The puzzle's sizes and kinds: a sheet that closes once one is picked
$('typeBtn').onclick = () => $('typeItem').classList.add('open');
$('types').addEventListener('click', e => {
  if (e.target === $('types')) { $('typeItem').classList.remove('open'); return; }
  if (e.target.matches('input')) {
    freshGame();
    setTimeout(() => $('typeItem').classList.remove('open'), 150);
  }
});

const helpCache = new Map();
$('helpBtn').onclick = async () => {
  const id = current.id;
  if (!helpCache.has(id)) {
    try {
      const res = await fetch(`help/${id}.html`);
      if (!res.ok) throw new Error(res.status);
      helpCache.set(id, await res.text());
    } catch {
      toast('Couldn\'t load the help. Check the connection.');
      return;
    }
  }
  // the manual is written for a mouse; how its clicks work here
  $('helpText').innerHTML = `<p class="touchhelp">On this screen, a tap is a left click and pressing and holding is a right click (Right-click swaps them), and a tap with two fingers is a middle click. Keys the puzzle needs are at the side. On a controller, the D-pad is the arrow keys, A and B are the two select keys (Enter and Space), X undoes and Y redoes.</p>${helpCache.get(id)}`;
  $('helpText').scrollTop = 0;
  $('help').hidden = false;
};
$('helpOk').onclick = () => { $('help').hidden = true; };

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  $('help').hidden = true;
  $('typeItem').classList.remove('open');
});

$('quitBtn').onclick = () => {
  save();
  location.reload();
};

// ---------- leaving ----------

// Keep the game while the screen is off or another app shows
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

// The hub's Apps button (or the car's back button) unloads this page. The
// hub asks first, so the game can be kept; it waits up to a second.
addEventListener('message', e => {
  if (e.source !== parent || e.data?.frunk !== 'close') return;
  save();
  e.source.postMessage({ frunk: 'closed' }, e.origin);
});
if (parent !== window) parent.postMessage({ frunk: 'save-on-close' }, '*');

renderLibrary();
})();
