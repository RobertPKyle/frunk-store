// Rocks'n'Diamonds (engine/, compiled to WebAssembly by tools/build-rocks.mjs
// with tools/rocks/rocks-web.patch). The game runs as upstream's web build
// does, on a global Module: its data package first, then the engine. It keeps
// progress in /persistent, mounted from IndexedDB, and this page writes that
// back when the game is hidden or closed.

import { fetchPackage, padMenu, reason } from '../_shared/gamepage.js';
import { mbOf } from '../_shared/engine.js';

const $ = id => document.getElementById(id);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('rocks.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('rocks.' + key, JSON.stringify(value)); } catch {} },
};
const ENGINE = 'engine/';
const W = 672, H = 560;
const params = new URLSearchParams(location.search);
// ?touch=1 or ?touch=0 overrides it (for testing)
const touchFirst = params.has('touch') ? params.get('touch') !== '0' : !matchMedia('(hover: hover) and (pointer: fine)').matches;

let started = false, running = false, game = null;

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

// ---------- controller ----------

// The car lists each controller twice: the device itself, and a "Tesla Virtual
// Gamepad" copy with the standard layout, and both report every press. SDL
// reads these, so it gets only the standard pads when there are any. A small
// controller has only a D-pad, which may show up on the standard pad's buttons
// or only on the device's own axes, so those count as the left stick.
//
// SDL takes the first change it sees on an axis as that axis's resting value
// and doesn't pass it on, which would lose the first press in each direction.
// So once the game has had a moment to list its pads, an axis at rest reads as
// a hair off zero, far inside the game's dead zone: that's the first change.
// (window.fakePads stands in for real pads in the end-to-end check.)
const realPads = navigator.getGamepads ? navigator.getGamepads.bind(navigator) : () => [];
let engineStart = 0;
navigator.getGamepads = () => {
  const pads = [...(window.fakePads || realPads())];
  const anyStandard = pads.some(p => p?.mapping === 'standard');
  const devices = anyStandard ? pads.filter(p => p && p.mapping !== 'standard') : [];
  const rest = engineStart && performance.now() - engineStart > 1000 ? 0.001 : 0;
  return pads.map(p => {
    if (!p || (anyStandard && p.mapping !== 'standard')) return null;
    const axes = [...p.axes];
    if (p.mapping === 'standard') {
      const on = i => !!p.buttons[i]?.pressed;
      if (on(14)) axes[0] = -1;
      if (on(15)) axes[0] = 1;
      if (on(12)) axes[1] = -1;
      if (on(13)) axes[1] = 1;
    }
    for (const d of devices) for (const i of [0, 1]) if (Math.abs(d.axes[i] || 0) > 0.5) axes[i] = d.axes[i];
    return { id: p.id, index: p.index, mapping: p.mapping, connected: p.connected, timestamp: 0, axes: axes.map(v => v || rest), buttons: p.buttons };
  });
};
function pollPads() {
  requestAnimationFrame(pollPads);
  if (!running || !$('padNote').hidden) return;
  if (navigator.getGamepads().some(p => p?.buttons.some(b => b.pressed))) $('padNote').hidden = false;
}
pollPads();

// ---------- sound ----------

const audioContext = () => game?.SDL2?.audioContext;
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
}, 1000);

// ---------- screen and keys ----------

function fit() {
  const box = $('screen').getBoundingClientRect();
  if (!box.width || !box.height) return;
  const scale = Math.min(box.width / W, box.height / H);
  const canvas = $('canvas');
  canvas.style.setProperty('--w', `${Math.round(W * scale)}px`);
  canvas.style.setProperty('--h', `${Math.round(H * scale)}px`);
}
addEventListener('resize', fit);

// The game reads the keyboard through SDL, which listens on the window
const KEY = { Escape: 27, ' ': 32 };
function tapKey(key) {
  const init = { key, code: key === ' ' ? 'Space' : key, keyCode: KEY[key], which: KEY[key], bubbles: true };
  window.dispatchEvent(new KeyboardEvent('keydown', init));
  setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', init)), 80);
}
$('menuBtn').onclick = () => { if (running) tapKey('Escape'); };

// ---------- saving ----------

let writing = false;
function save(then) {
  if (!running || !game?.FS || writing) { then?.(); return; }
  writing = true;
  game.FS.syncfs(false, err => {
    writing = false;
    if (err) console.warn('saving failed', err);
    then?.();
  });
}
setInterval(save, 30000);
let pausedByHide = false;
document.addEventListener('visibilitychange', () => {
  if (!running) return;
  if (document.hidden) {
    save();
    audioContext()?.suspend();
    if (game._web_state() === 2 && !game._web_paused()) { pausedByHide = true; tapKey(' '); }
  } else {
    wakeSound();
    if (pausedByHide && game._web_state() === 2 && game._web_paused()) tapKey(' ');
    pausedByHide = false;
  }
});
// the hub's Apps button: it asks first and waits for the save
addEventListener('message', e => {
  if (e.data?.frunk !== 'close' || e.source !== parent) return;
  save(() => e.source.postMessage({ frunk: 'closed' }, e.origin));
});
if (parent !== window) parent.postMessage({ frunk: 'save-on-close' }, '*');

// ---------- start ----------

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Couldn\'t load the game. Check the connection and try again.'));
    document.body.append(s);
  });
}

async function play() {
  if (started) return;
  started = true;
  for (const b of [$('play'), $('play2')]) b.disabled = true;
  try { navigator.storage?.persist?.(); } catch {}
  loading('Loading…');
  $('start').hidden = true;
  $('player').hidden = false;
  fit();
  const canvas = $('canvas');
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); failed('The car\'s browser lost the game\'s picture. Start again to carry on.'); });
  try {
    let pack = await fetchPackage(ENGINE + 'rocksndiamonds.data', (got, total) => loading(`Loading… ${mbOf(got, total)}`));
    loading('Starting…');
    await new Promise((resolve, reject) => {
      window.Module = game = {
        canvas,
        rocksTouch: touchFirst,
        locateFile: path => ENGINE + path,
        getPreloadedPackage: () => { const p = pack; pack = null; return p; },
        print: line => { if (window.rocksDebug) console.log(line); },
        printErr: line => { if (window.rocksDebug) console.warn(line); },
        onAbort: what => (running ? failed(`The game stopped: ${what}`) : failed(reason(what, NO_LOAD), 'Couldn\'t start the game')),
        onRuntimeInitialized: resolve,
      };
      loadScript(ENGINE + 'rocksndiamonds.data.js').then(() => loadScript(ENGINE + 'rocksndiamonds.js')).catch(reject);
    });
    running = true;
    engineStart = performance.now();
    game.callMain([]);
    $('loading').hidden = true;
    canvas.focus();
    showSound();
  } catch (err) {
    if (err === 'unwind' || err?.name === 'ExitStatus') return;
    console.warn(err?.stack || err);
    if (running) failed(err?.message || String(err));
    else failed(reason(err, NO_LOAD), 'Couldn\'t start the game');
  }
}
$('play').onclick = $('play2').onclick = play;

window.rocksGame = () => game;
window.rocksStats = () => {
  const on = !!(game && game._web_state);
  return {
    running, width: $('canvas').width, height: $('canvas').height,
    state: on ? game._web_state() : -1, level: on ? game._web_level() : -1,
    x: on ? game._web_player_x() : -1, y: on ? game._web_player_y() : -1,
    paused: on ? game._web_paused() : 0, frames: on ? game._web_frames() : 0, engine: on ? game._web_engine() : 0, solved: on ? game._web_solved() : 0,
    audio: audioContext()?.state, memoryMB: game?.HEAP8 ? Math.round(game.HEAP8.length / 1048576) : 0,
  };
};

// ---------- leaving ----------

$('quitBtn').onclick = () => save(() => location.reload());

addEventListener('error', e => { if (started && e.message && !/unwind/.test(e.message)) failed(`The game stopped: ${e.message}`); });
