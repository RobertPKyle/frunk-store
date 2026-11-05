// Neverball, the tilt-the-floor marble game (engine/, compiled to WebAssembly
// by tools/build-neverball.mjs with tools/neverball/neverball-web.patch). All
// the level sets are in one zip, preloaded at /data. The game draws at the
// canvas's laid-out size, runs from the browser's animation frames, reads touch
// and controllers through SDL, and keeps its settings, scores and replays in
// /neverball, mounted from IndexedDB (IDBFS). The game records a replay as it
// plays, a few bytes at a time, so that folder is written back every few
// seconds rather than at every write (IDBFS's autoPersist), and when the page
// is hidden or left. Sound goes through audio.js.

(() => {

const $ = id => document.getElementById(id);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('neverball.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('neverball.' + key, JSON.stringify(value)); } catch {} },
};
const ENGINE = 'engine/';
const USER = '/neverball';
const params = new URLSearchParams(location.search);
// ?touch=1 or ?touch=0 overrides it (for testing)
const touchFirst = params.has('touch') ? params.get('touch') !== '0' : !matchMedia('(hover: hover) and (pointer: fine)').matches;

let started = false, running = false, game = null, frames = 0;

function loading(text) { $('loading').hidden = false; $('loadText').textContent = text; }
function failed(text) {
  running = false;
  $('loading').hidden = true;
  $('failedText').textContent = text;
  $('failed').hidden = false;
}
$('failedOk').onclick = () => location.reload();

// ---------- controller ----------

// The car lists each controller twice: the device itself, and a "Tesla Virtual
// Gamepad" copy with the standard layout, and both report every press. SDL
// asks here, so it gets only the standard pads when there are any. The game's
// stick is the only way it reads direction, and a small controller has only a
// D-pad, which may show up on the standard pad's buttons or only on the
// device's own axes, so those count as the stick.
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

const audioContext = () => window.Neverball.audioContext;
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

// ---------- picture ----------

const showSharp = () => { $('sharp').textContent = `Picture: ${settings.get('sharp', false) ? 'Sharp' : 'Fast'}`; };
$('sharp').onclick = () => { settings.set('sharp', !settings.get('sharp', false)); showSharp(); };
showSharp();

// ---------- start ----------

// The engine's push_user_event: Esc, and pause if a level is being played
const USER_EVENT_BACK = -1, USER_EVENT_PAUSE = 0;
$('menuBtn').onclick = () => { if (running) game._push_user_event(USER_EVENT_BACK); };

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
  // The player (and its canvas) is shown now, under the loading screen: the
  // game takes its size from the canvas's laid-out size, and a hidden canvas has none
  $('start').hidden = true;
  $('player').hidden = false;
  const canvas = $('canvas');
  window.neverballSharp = settings.get('sharp', false);     // the engine reads it when it makes the window
  // The game asks for the pointer while the ball is in play. On a touch screen
  // there is no pointer to lock, only the browser's notice about it
  if (touchFirst) canvas.requestPointerLock = () => {};
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); failed('The car\'s browser lost the game\'s picture. Start again to carry on.'); });
  try {
    await loadScript(ENGINE + 'neverball.js');
    game = await window.Neverball_createEmscriptenModule({
      canvas,
      locateFile: path => ENGINE + path,
      print: line => { if (window.neverballDebug) console.log(line); },
      printErr: line => { if (window.neverballDebug) console.warn(line); },
      setStatus: text => {
        const m = /\((\d+)\/(\d+)\)/.exec(text || '');
        if (m) loading(`Loading… ${Math.round(m[1] / 1048576)} of ${Math.round(m[2] / 1048576)} MB`);
      },
      onAbort: what => failed(`The game stopped: ${what}`),
      preMainLoop: () => { frames++; },
    });
    const FS = game.FS;
    FS.mkdir(USER);
    FS.mount(game.IDBFS, {}, USER);
    await new Promise(resolve => FS.syncfs(true, err => {
      if (err) console.warn('loading settings failed', err);
      resolve();
    }));
    window.neverballQuit = () => { syncfs().finally(() => location.reload()); };
    running = true;
    engineStart = performance.now();
    game.callMain([]);
    $('loading').hidden = true;
    canvas.focus();
    showSound();
  } catch (err) {
    if (err === 'unwind' || err?.name === 'ExitStatus') return;
    console.warn(err?.stack || err);
    failed(err?.message || String(err));
  }
}
$('play').onclick = $('play2').onclick = play;

window.neverballGame = () => game;
window.neverballStats = () => ({ frames, running, states: game?.neverballStates | 0, syncs, width: $('canvas').width, height: $('canvas').height, audio: window.Neverball.audioContext?.state,
  memoryMB: game ? Math.round(game.HEAP8.length / 1048576) : 0 });

// ---------- what the game wrote ----------

let syncing = false, syncAgain = false, syncs = 0;
function syncfs() {
  return new Promise(resolve => {
    if (!game) return resolve();
    if (syncing) { syncAgain = true; return resolve(); }
    syncing = true;
    syncs++;
    game.FS.syncfs(false, err => {
      if (err) console.warn('saving failed', err);
      syncing = false;
      if (syncAgain) { syncAgain = false; syncfs(); }
      resolve();
    });
  });
}
setInterval(() => { if (running && !document.hidden) syncfs(); }, 5000);

// ---------- leaving ----------

$('quitBtn').onclick = () => { syncfs().finally(() => location.reload()); };

document.addEventListener('visibilitychange', () => {
  if (!running) return;
  const c = audioContext();
  if (document.hidden) {
    syncfs();
    c?.suspend();
    game._push_user_event(USER_EVENT_PAUSE);
  } else wakeSound();
});

// The hub's Apps button (or the car's back button) unloads this page. The
// hub asks first, so scores and replays can be written back; it waits up to a second.
addEventListener('message', async e => {
  if (e.source !== parent || e.data?.frunk !== 'close') return;
  await syncfs();
  e.source.postMessage({ frunk: 'closed' }, e.origin);
});
if (parent !== window) parent.postMessage({ frunk: 'save-on-close' }, '*');

// Esc on a keyboard ends the pointer lock without reaching the game; that pauses too
let locked = false;
document.addEventListener('pointerlockchange', () => {
  const now = !!document.pointerLockElement;
  if (locked && !now && running) game._push_user_event(USER_EVENT_PAUSE);
  locked = now;
});

addEventListener('error', e => { if (started && e.message && !/unwind/.test(e.message)) failed(`The game stopped: ${e.message}`); });

})();
