// Rogue Rogue by KesieV: game/rogue.js, built by tools/build-roguerogue.mjs
// from upstream's scripts. The game draws a 256x224 canvas; this page sizes it
// to whole device pixels, gives it touch buttons and hands it the controllers
// one per player. High scores are upstream's, in localStorage.

import { padMenu, secondTap } from '../_shared/gamepage.js';

(() => {

const $ = id => document.getElementById(id);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('roguerogue.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('roguerogue.' + key, JSON.stringify(value)); } catch {} },
};
const params = new URLSearchParams(location.search);
// ?touch=1 or ?touch=0 overrides it (for testing)
const touchFirst = params.has('touch') ? params.get('touch') !== '0' : !matchMedia('(hover: hover) and (pointer: fine)').matches;
const SCREEN_W = 256, SCREEN_H = 224;
const STUCK = 40000;   // ms without a loading step before it counts as failed

let started = false, running = false, rogue = null, canvas = null, watchdog = 0;

function loading(text) { $('loading').hidden = false; $('loadText').textContent = text; }
function failed(text, title) {
  clearTimeout(watchdog);
  if (title) $('failedTitle').textContent = title;
  running = false;
  $('loading').hidden = true;
  $('failedText').textContent = text;
  $('failed').hidden = false;
}
const NO_LOAD = 'Couldn\'t load the game. Check the connection and try again.';
$('failedOk').onclick = () => location.reload();
padMenu();

// ---------- controller ----------

// The car lists each controller twice: the device itself, and a "Tesla Virtual
// Gamepad" copy with the standard layout, and both report every press. The
// game takes pad 0 as player one and pad 1 as player two, so it gets only the
// standard pads when there are any, packed from 0. A small controller's D-pad
// may show only on the device's own axes, so those count as the stick.
// (window.fakePads stands in for real pads in the end-to-end check.)
const realPads = navigator.getGamepads ? navigator.getGamepads.bind(navigator) : () => [];
navigator.getGamepads = () => {
  const pads = [...(window.fakePads || realPads())].filter(Boolean);
  const standard = pads.filter(p => p.mapping === 'standard');
  const devices = standard.length ? pads.filter(p => p.mapping !== 'standard') : [];
  return (standard.length ? standard : pads).slice(0, 2).map((p, n) => {
    const axes = [...p.axes];
    const d = devices[n];
    if (d) for (const i of [0, 1]) if (Math.abs(d.axes[i] || 0) > 0.5) axes[i] = d.axes[i];
    const buttons = p.buttons.map(b => ({ pressed: !!b.pressed, touched: !!b.pressed, value: b.pressed ? 1 : b.value || 0 }));
    return { id: p.id, index: n, mapping: p.mapping, connected: true, timestamp: 0, axes, buttons };
  });
};

// A press on a controller hides the touch buttons and gives the picture the
// room; a finger on the screen brings them back.
function setPadMode(on) {
  if (document.body.classList.contains('pad') === on) return;
  document.body.classList.toggle('pad', on);
  layout();
}
function pollPads() {
  requestAnimationFrame(pollPads);
  if (!running || document.body.classList.contains('pad')) return;
  if (navigator.getGamepads().some(p => p.buttons.some(b => b.pressed) || p.axes.some(v => Math.abs(v) > 0.5))) setPadMode(true);
}
pollPads();
addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && running) setPadMode(false); }, true);
document.body.classList.toggle('pad', !touchFirst);

// ---------- touch ----------

// What the game reads for player one each frame. One finger can slide from
// button to button (left to right, for instance), so each finger is tracked by
// where it is now and a button is down while any finger is on it.
const touchKeys = { 0: {} };
const fingers = new Map();
const keys = [...document.querySelectorAll('.key')];

function keyAt(x, y) {
  for (const k of keys) {
    const r = k.getBoundingClientRect();
    if (r.width && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return k;
  }
  return null;
}
function refresh() {
  const down = new Set(fingers.values());
  for (const k of keys) {
    const on = down.has(k);
    k.classList.toggle('down', on);
    touchKeys[0][k.dataset.key] = on;
  }
}
for (const col of [$('leftCol'), $('rightCol')]) {
  col.addEventListener('pointerdown', e => {
    e.preventDefault();
    col.setPointerCapture?.(e.pointerId);
    fingers.set(e.pointerId, keyAt(e.clientX, e.clientY));
    refresh();
    wakeSound();
  });
  col.addEventListener('pointermove', e => {
    if (!fingers.has(e.pointerId)) return;
    fingers.set(e.pointerId, keyAt(e.clientX, e.clientY));
    refresh();
  });
  for (const type of ['pointerup', 'pointercancel']) {
    col.addEventListener(type, e => { fingers.delete(e.pointerId); refresh(); });
  }
  col.addEventListener('contextmenu', e => e.preventDefault());
}

// ---------- picture ----------

// Whole device pixels per game pixel keep the art crisp. With touch buttons
// the columns at the sides are theirs; with a controller only the left column
// is kept, for the hub's Apps button and Sound and Quit.
function layout() {
  if (!canvas) return;
  const stage = $('stage').getBoundingClientRect();
  const dpr = devicePixelRatio || 1;
  const pad = document.body.classList.contains('pad');
  const left = pad ? 100 : 132, right = pad ? 0 : 132;
  const room = Math.max(1, stage.width - left - right);
  const scale = Math.max(1, Math.floor(Math.min(room * dpr / SCREEN_W, stage.height * dpr / SCREEN_H) + 1e-6));
  const width = scale * SCREEN_W / dpr, height = scale * SCREEN_H / dpr;
  const snap = v => Math.round(v * dpr) / dpr;
  Object.assign(canvas.style, {
    width: `${width}px`, height: `${height}px`,
    left: `${snap(left + (room - width) / 2)}px`, top: `${snap((stage.height - height) / 2)}px`,
  });
}
addEventListener('resize', layout);

// ---------- sound ----------

const audioContext = () => rogue?.game.getAudioContext?.();
const soundOn = () => settings.get('sound', true);
const blocked = () => soundOn() && audioContext() && audioContext().state !== 'running' && !document.hidden;
function showSound() {
  $('soundBtn').textContent = !soundOn() ? 'Sound off' : blocked() ? 'Tap for sound' : 'Sound on';
}
function wakeSound() {
  const c = audioContext();
  if (c && soundOn() && !document.hidden && c.state !== 'running') c.resume().then(showSound, () => {});
}
$('soundBtn').onclick = () => {
  if (blocked()) { wakeSound(); return; }
  settings.set('sound', !soundOn());
  const c = audioContext();
  if (c) soundOn() ? c.resume() : c.suspend();
  showSound();
};
for (const type of ['pointerdown', 'keydown', 'touchstart']) addEventListener(type, wakeSound, true);
setInterval(() => {
  if (!running) return;
  const c = audioContext();
  if (c && !soundOn() && c.state === 'running') c.suspend();
  showSound();
  // a nudge while nobody is playing yet: the game waits for Start
  const inGame = rogue.C.MEMORY?.players?.some(p => p.isInGame);
  $('kStart').classList.toggle('nudge', !inGame);
}, 1000);

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

function alive() {
  clearTimeout(watchdog);
  watchdog = setTimeout(() => failed(NO_LOAD, 'Couldn\'t start the game'), STUCK);
}

async function play() {
  if (started) return;
  started = true;
  for (const b of [$('play'), $('play2')]) b.disabled = true;
  try { navigator.storage?.persist?.(); } catch {}
  loading('Loading…');
  $('start').hidden = true;
  $('player').hidden = false;
  alive();
  try {
    await loadScript('game/rogue.js');
    rogue = window.gameRun({
      resourcesPrefix: 'game/',
      stage: $('stage'),
      touchKeys,
      onLoading(message) {
        alive();
        if (message) loading(message.replace(/ left\)$/, ' to go)'));
      },
      onCanvas(node) {
        clearTimeout(watchdog);
        canvas = node;
        layout();
        running = true;
        $('loading').hidden = true;
        if (!soundOn()) audioContext()?.suspend();
        wakeSound();
        showSound();
      },
    });
  } catch (err) {
    console.warn(err?.stack || err);
    failed(err?.message || NO_LOAD, 'Couldn\'t start the game');
  }
}
$('play').onclick = $('play2').onclick = play;

// ---------- leaving ----------

secondTap($('quitBtn'), () => location.reload());

document.addEventListener('visibilitychange', () => {
  if (!running) return;
  // the game's loop runs from animation frames, which stop while hidden
  if (document.hidden) audioContext()?.suspend();
  else wakeSound();
});

addEventListener('error', e => { if (started && e.message) failed(`The game stopped: ${e.message}`); });

// ---------- for the end-to-end check ----------

window.roguerogueStats = () => {
  const g = rogue?.game, C = rogue?.C;
  const box = canvas?.getBoundingClientRect();
  return {
    running,
    frames: g?.frames | 0,
    scene: g?.scenes ? Object.keys(g.scenes).find(k => g.scenes[k] === g.scene) ?? null : null,
    inGame: C?.MEMORY?.players?.filter(p => p.isInGame).length | 0,
    credits: C?.MEMORY?.credits,
    hiscore: C?.HIGHSCORE,
    mode: document.body.classList.contains('pad') ? 'pad' : 'touch',
    audio: g?.getAudioContext?.()?.state,
    pads: navigator.getGamepads().length,
    picture: box ? { width: box.width, height: box.height, left: box.left, top: box.top } : null,
  };
};
window.roguerogueGame = () => rogue;

})();
