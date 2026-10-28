// Craft 4K: Minecraft4k-CPP (engine/craft4k.{js,wasm}, built by
// tools/build-craft4k.mjs) with touch, controller, keyboard and mouse
// input. The game draws into the canvas at a low resolution, which CSS
// scales up with sharp pixels; Detail picks how many rows it draws.
//
// The world is made from a seed, so only the seed and the blocks the player
// changed are saved (IndexedDB "craft4k"), with where the player stood and
// the time of day: every 20 seconds after a change, when the page is hidden
// and when the hub's close handshake asks.

import { holdersGate } from '../_shared/holders.js';
import { keepAwake } from '../_shared/awake.js';

const $ = id => document.getElementById(id);

// Hotbar: the game's block ids
const BLOCKS = [
  { id: 1, name: 'Grass', swatch: 'linear-gradient(#6aaa40 0 38%, #966c4a 38%)' },
  { id: 2, name: 'Dirt', swatch: '#966c4a' },
  { id: 4, name: 'Stone', swatch: 'repeating-linear-gradient(90deg, #8a8a8a 0 5px, #727272 5px 9px)' },
  { id: 5, name: 'Bricks', swatch: 'linear-gradient(#bcafa5 0 2px, transparent 2px) 0 0 / 100% 10px, linear-gradient(90deg, #bcafa5 0 2px, transparent 2px) 0 0 / 16px 100%, #b53a15' },
  { id: 7, name: 'Wood', swatch: 'radial-gradient(circle, #bc9862 0 30%, #9c7c4a 30% 45%, #bc9862 45% 60%, #675231 60%)' },
  { id: 8, name: 'Leaves', swatch: 'radial-gradient(circle at 30% 30%, #50d937 0 25%, transparent 26%) 0 0 / 12px 12px, #3c9f29' },
  { id: 9, name: 'Mirror', swatch: 'linear-gradient(135deg, #e9f2f8, #9fb3c2 45%, #f7fbff 55%, #a8bccb)' },
];
const DETAIL = [
  { name: 'Low', rows: 120, dist: 48 },
  { name: 'Medium', rows: 240, dist: 80 },
  { name: 'High', rows: 480, dist: 80 },
];
const SAVE_EVERY = 20000;
const REPEAT = 250;   // ms between blocks while Break or Place is held

const setting = {
  get: (k, d) => { try { const v = localStorage.getItem('craft4k.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('craft4k.' + k, JSON.stringify(v)); } catch {} },
};

// ---------- saved world ----------

// One connection, kept open, so a save on closing starts at once
let connection;
function db() {
  connection ||= new Promise((resolve, reject) => {
    const req = indexedDB.open('craft4k', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('world');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { connection = null; reject(req.error); };
  });
  return connection;
}

async function store(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('world', mode);
    const req = fn(tx.objectStore('world'));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}

const loadWorld = () => store('readonly', s => s.get('world')).catch(() => null);

// ---------- start ----------

await holdersGate('Craft 4K');

let game, saved;
try {
  if (!document.createElement('canvas').getContext('webgl2')) throw new Error('This browser has no WebGL 2, which the game draws with.');
  const [{ default: Craft4k }, world] = await Promise.all([import('./engine/craft4k.js'), loadWorld()]);
  saved = world || { seed: [...crypto.getRandomValues(new Uint32Array(2))], edits: new Uint32Array(0), time: 0 };
  game = await Craft4k();
  // let the loading screen draw before the world is made
  await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
  if (!game._c4k_init(saved.seed[0], saved.seed[1])) throw new Error('The graphics chip couldn\'t start the game.');
} catch (e) {
  $('loading').hidden = true;
  $('failedText').textContent = e.message || String(e);
  $('failed').hidden = false;
  throw e;
}

// The player's changes: index in the world → block
const edits = new Map();
for (const e of saved.edits) {
  edits.set(e >>> 8, e & 0xff);
  game._c4k_set_block(e >>> 8, e & 0xff);
}
if (saved.player) game._c4k_set_player(...saved.player);

let dirty = false, lastSave = performance.now();
let discarded = false;   // New world: nothing more is saved before the reload

function takeEdits() {
  const n = game._c4k_edit_count();
  if (!n) return;
  const list = new Uint32Array(game.HEAPU32.buffer, game._c4k_edits(), n);
  for (const e of list) edits.set(e >>> 8, e & 0xff);
  game._c4k_clear_edits();
  dirty = true;
}

async function save() {
  if (discarded) return;
  takeEdits();
  const player = [0, 1, 2, 3, 4].map(i => game._c4k_player(i));
  const list = Uint32Array.from(edits, ([index, block]) => index << 8 | block);
  lastSave = performance.now();
  dirty = false;
  try {
    await store('readwrite', s => s.put({ seed: saved.seed, edits: list, player, time: clock() }, 'world'));
    navigator.storage?.persist?.().catch(() => {});   // so the browser doesn't clear the world to make room
  } catch {
    hint('Couldn\'t save the world on this screen');
  }
}

// ---------- the clock: playing time, which stops while the page is hidden ----------

let paused = 0, hiddenAt = 0;
const start = performance.now() - (saved.time || 0);
const clock = () => (hiddenAt || performance.now()) - start - paused;

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hiddenAt = performance.now();
    save();
  } else if (hiddenAt) {
    paused += performance.now() - hiddenAt;
    hiddenAt = 0;
  }
});

// The hub's Apps button (or the car's back button) unloads this page. The
// hub asks first, so the world can be saved; it waits up to a second.
let closing = false;
addEventListener('message', async e => {
  if (e.source !== parent || e.data?.frunk !== 'close') return;
  closing = true;   // no more frames: the page is about to go
  await save();
  e.source.postMessage({ frunk: 'closed' }, e.origin);
});
if (parent !== window) parent.postMessage({ frunk: 'save-on-close' }, '*');

// ---------- screen ----------

const canvas = $('canvas');
// Until Detail is picked, it steps down by itself while the game runs
// slowly, and starts where it got to last time
let autoDetail = setting.get('detail', null) === null;
let detail = Math.min(DETAIL.length - 1, Math.max(0, setting.get('detail', setting.get('autoDetail', 1))));

function showDetail() { $('detailBtn').textContent = `Detail: ${DETAIL[detail].name}`; }
showDetail();
function setDetail(d) {
  detail = Math.min(DETAIL.length - 1, Math.max(0, d));
  autoDetail = false;
  setting.set('detail', detail);
  showDetail();
}
$('detailBtn').onclick = () => setDetail((detail + 1) % DETAIL.length);

let hintTimer;
function hint(text) {
  $('hint').textContent = text;
  $('hint').hidden = false;
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => { $('hint').hidden = true; }, 2500);
}

// ---------- hotbar ----------

let held = Math.min(BLOCKS.length - 1, Math.max(0, setting.get('held', 0)));
const slots = BLOCKS.map((b, i) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.title = b.name;
  btn.setAttribute('aria-label', b.name);
  btn.append(Object.assign(document.createElement('i'), { style: `background: ${b.swatch}` }));
  btn.onclick = () => pick(i);
  return btn;
});
$('hotbar').append(...slots);
function pick(i) {
  held = (i + BLOCKS.length) % BLOCKS.length;
  setting.set('held', held);
  slots.forEach((s, n) => s.setAttribute('aria-pressed', String(n === held)));
}
pick(held);

const breakBlock = () => game._c4k_break();
const placeBlock = () => game._c4k_place(BLOCKS[held].id);

// ---------- input ----------

const keys = new Set();
const stick = { x: 0, y: 0 };
let touchJump = false;

// Touch controls show on screens without a fine pointer, and once touched
const touchUi = $('touch');
touchUi.hidden = matchMedia('(pointer: fine)').matches;
addEventListener('touchstart', () => { touchUi.hidden = false; }, { capture: true, passive: true });

// Walk stick
const stickEl = $('stick'), knob = $('knob');
let stickId = null;
function moveStick(e) {
  const r = stickEl.getBoundingClientRect();
  let x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
  let y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
  const len = Math.hypot(x, y);
  if (len > 1) { x /= len; y /= len; }
  stick.x = x; stick.y = y;
  knob.style.transform = `translate(${x * r.width / 3}px, ${y * r.height / 3}px)`;
}
stickEl.addEventListener('pointerdown', e => {
  stickId = e.pointerId;
  stickEl.setPointerCapture(e.pointerId);
  moveStick(e);
});
stickEl.addEventListener('pointermove', e => { if (e.pointerId === stickId) moveStick(e); });
const stickUp = e => {
  if (e.pointerId !== stickId) return;
  stickId = null;
  stick.x = stick.y = 0;
  knob.style.transform = '';
};
stickEl.addEventListener('pointerup', stickUp);
stickEl.addEventListener('pointercancel', stickUp);

// Buttons that act while held: Jump, and Break and Place, which repeat
function holdButton(el, down, up) {
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    el.classList.add('down');
    down();
  });
  const release = () => { el.classList.remove('down'); up(); };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
}
holdButton($('jump'), () => { touchJump = true; }, () => { touchJump = false; });

const repeating = new Map();   // what → { act, next }
function startRepeat(what, act) {
  act();
  repeating.set(what, { act, next: performance.now() + REPEAT });
}
const stopRepeat = what => repeating.delete(what);
holdButton($('break'), () => startRepeat('touchBreak', breakBlock), () => stopRepeat('touchBreak'));
holdButton($('place'), () => startRepeat('touchPlace', placeBlock), () => stopRepeat('touchPlace'));

// Look: drag anywhere else on the game; with a mouse, click to capture it
const looks = new Map();   // pointerId → last position
canvas.addEventListener('pointerdown', e => {
  canvas.focus();
  if (e.pointerType === 'mouse') {
    if (document.pointerLockElement !== canvas) { canvas.requestPointerLock?.()?.catch?.(() => {}); return; }
    if (e.button === 0) startRepeat('mouse0', breakBlock);
    if (e.button === 2) startRepeat('mouse2', placeBlock);
    return;
  }
  canvas.setPointerCapture(e.pointerId);
  looks.set(e.pointerId, [e.clientX, e.clientY]);
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') {
    if (document.pointerLockElement === canvas) game._c4k_look(e.movementX, e.movementY);
    return;
  }
  const last = looks.get(e.pointerId);
  if (!last) return;
  game._c4k_look((e.clientX - last[0]) * 1.5, (e.clientY - last[1]) * 1.5);
  looks.set(e.pointerId, [e.clientX, e.clientY]);
});
const lookUp = e => {
  looks.delete(e.pointerId);
  if (e.pointerType === 'mouse') stopRepeat('mouse' + e.button);
};
canvas.addEventListener('pointerup', lookUp);
canvas.addEventListener('pointercancel', lookUp);
canvas.addEventListener('wheel', e => { e.preventDefault(); pick(held + Math.sign(e.deltaY)); }, { passive: false });

addEventListener('keydown', e => {
  if (e.target.closest?.('button') && (e.key === ' ' || e.key === 'Enter')) e.target.blur();
  keys.add(e.code);
  if (/^Digit[1-7]$/.test(e.code)) pick(+e.code.slice(5) - 1);
  if (e.code === 'Comma' || e.code === 'Period') setDetail(detail + (e.code === 'Period' ? 1 : -1));
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

// Controller: standard mapping
const padHeld = new Set();
function readPad() {
  const move = { x: 0, y: 0, jump: false };
  for (const pad of navigator.getGamepads?.() || []) {
    if (!pad || pad.mapping !== 'standard') continue;
    const dead = v => Math.abs(v) < 0.2 ? 0 : v;
    move.x += dead(pad.axes[0]);
    move.y += dead(pad.axes[1]);
    const lx = dead(pad.axes[2]), ly = dead(pad.axes[3]);
    if (lx || ly) game._c4k_look(lx * Math.abs(lx) * 14, ly * Math.abs(ly) * 14);
    const pressed = i => pad.buttons[i]?.pressed;
    move.jump ||= pressed(0);
    const edge = (i, on, off) => {
      const key = `${pad.index}:${i}`;
      if (pressed(i) && !padHeld.has(key)) { padHeld.add(key); on(); }
      else if (!pressed(i) && padHeld.has(key)) { padHeld.delete(key); off?.(); }
    };
    edge(7, () => startRepeat(`pad${pad.index}place`, placeBlock), () => stopRepeat(`pad${pad.index}place`));
    edge(6, () => startRepeat(`pad${pad.index}break`, breakBlock), () => stopRepeat(`pad${pad.index}break`));
    edge(4, () => pick(held - 1));
    edge(5, () => pick(held + 1));
  }
  return move;
}

// ---------- loop ----------

const fpsEl = $('fps');
let frames = 0, fpsSince = performance.now(), slowSeconds = 0;

function frame() {
  if (closing) return;
  requestAnimationFrame(frame);
  if (document.hidden) return;

  const pad = readPad();
  const k = c => keys.has(c) ? 1 : 0;
  const forward = k('KeyW') + k('ArrowUp') - k('KeyS') - k('ArrowDown') - stick.y - pad.y;
  const right = k('KeyD') + k('ArrowRight') - k('KeyA') - k('ArrowLeft') + stick.x + pad.x;
  game._c4k_input(forward, right, keys.has('Space') || touchJump || pad.jump ? 1 : 0);

  const now = performance.now();
  for (const r of repeating.values()) {
    if (now >= r.next) { r.act(); r.next = now + REPEAT; }
  }

  // The canvas: Detail's rows, as many columns as the screen's shape needs
  const box = canvas.getBoundingClientRect();
  const rows = DETAIL[detail].rows;
  const cols = Math.max(1, Math.round(rows * box.width / Math.max(1, box.height)));
  if (canvas.width !== cols || canvas.height !== rows) { canvas.width = cols; canvas.height = rows; }
  game._c4k_frame(clock(), cols, rows, DETAIL[detail].dist);

  takeEdits();
  if (dirty && now - lastSave > SAVE_EVERY) save();

  frames++;
  if (now - fpsSince >= 1000) {
    const fps = Math.round(frames * 1000 / (now - fpsSince));
    fpsEl.textContent = `${fps} fps`;
    // two slow seconds in a row, not counting the first ones while it settles
    slowSeconds = fps < 24 && performance.now() - startedAt > 3000 ? slowSeconds + 1 : 0;
    if (autoDetail && detail > 0 && slowSeconds >= 2) {
      detail--;
      slowSeconds = 0;
      setting.set('autoDetail', detail);
      showDetail();
      hint(`Detail lowered to ${DETAIL[detail].name} to keep it smooth`);
    }
    frames = 0;
    fpsSince = now;
  }
}

// ---------- bar ----------

$('aboutBtn').onclick = () => { $('about').hidden = false; };
$('aboutOk').onclick = () => { $('about').hidden = true; setting.set('seenHelp', true); };

// A second tap within 3 seconds makes a new world
$('newBtn').onclick = async () => {
  const btn = $('newBtn');
  if (!btn.classList.contains('armed')) {
    btn.classList.add('armed');
    btn.textContent = 'Sure? Tap again';
    setTimeout(() => { btn.classList.remove('armed'); btn.textContent = 'New world'; }, 3000);
    return;
  }
  discarded = true;
  await store('readwrite', s => s.delete('world')).catch(() => {});
  location.reload();
};

$('loading').hidden = true;
$('player').hidden = false;
if (!setting.get('seenHelp', false)) $('about').hidden = false;
keepAwake(true);
const startedAt = performance.now();
requestAnimationFrame(frame);
