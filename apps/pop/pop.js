// Prince of Persia: SDLPoP 1.23 (engine/, compiled to WebAssembly by
// tools/build-pop.mjs with tools/pop/sdlpop-web.patch) with the game's data
// as SDLPoP ships it, preloaded at /pop. The game's own loops run inside
// main() on a stack that can wait (JSPI): every wait in the game hands the
// page its turn, so the screen updates and the page's events come through.
//
// Input reaches the game as keyboard events: the on-screen buttons and the
// controller (read here, not by SDL, since the car lists each controller
// twice) send the keys the DOS game knows. Saves (PRINCE.SAV, the quick
// save, the pause menu's settings) live in /save, mounted from IndexedDB
// (IDBFS) and written back every few seconds, when the page is hidden and
// when it's left (the hub's Apps button asks first).

(() => {

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('pop.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('pop.' + key, JSON.stringify(value)); } catch {} },
};
const ENGINE = 'engine/';
const SAVE = '/save';
// ?touch=1 or ?touch=0 overrides it (for testing)
const touchFirst = params.has('touch') ? params.get('touch') !== '0' : !matchMedia('(hover: hover) and (pointer: fine)').matches;

let started = false, running = false, FS = null;

function loading(text) { $('loading').hidden = false; $('loadText').textContent = text; }
function failed(text) {
  running = false;
  $('loading').hidden = true;
  $('failedText').textContent = text;
  $('failed').hidden = false;
}
$('failedOk').onclick = () => location.reload();

// ---------- keys ----------

// What the game reads: the DOS game's keys, as SDL sees them from the page
const CODES = { ArrowLeft: [37, 'ArrowLeft'], ArrowRight: [39, 'ArrowRight'], ArrowUp: [38, 'ArrowUp'], ArrowDown: [40, 'ArrowDown'],
  ShiftLeft: [16, 'Shift'], Escape: [27, 'Escape'], Enter: [13, 'Enter'], F6: [117, 'F6'], F9: [120, 'F9'] };
const held = new Set();
function key(code, down) {
  if (!running || held.has(code) === down) return;
  if (down) held.add(code); else held.delete(code);
  const [keyCode, name] = CODES[code];
  window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: name, keyCode, which: keyCode, bubbles: true, cancelable: true }));
}
const tap = code => { key(code, true); setTimeout(() => key(code, false), 80); };

// ---------- on-screen buttons ----------

let padMode = false;
function setPadMode(on) {
  if (padMode === on) return;
  padMode = on;
  $('touch').hidden = on || !touchFirst;
  $('padNote').hidden = !on;
}
for (const b of $('touch').querySelectorAll('button')) {
  const code = b.dataset.key;
  const down = e => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); b.classList.add('held'); key(code, true); };
  const up = e => { e.preventDefault(); b.classList.remove('held'); key(code, false); };
  b.addEventListener('pointerdown', down);
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('lostpointercapture', up);
}
$('menuBtn').onclick = () => tap('Escape');
addEventListener('touchstart', () => setPadMode(false), { capture: true, passive: true });

// ---------- controller ----------

// The car lists each controller twice: the device itself and a "Tesla
// Virtual Gamepad" copy with the standard layout. One pad is read: the
// virtual one, else a standard one, else the first.
const DEAD = 0.5;
const padKeys = new Set();
function readPad() {
  const pads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
  const pad = pads.find(p => /tesla virtual/i.test(p.id)) || pads.find(p => p.mapping === 'standard') || pads[0];
  const want = new Set();
  if (pad) {
    const on = i => !!pad.buttons[i]?.pressed;
    const std = pad.mapping === 'standard';
    const [x = 0, y = 0] = pad.axes;
    if ((std && on(14)) || x < -DEAD) want.add('ArrowLeft');
    if ((std && on(15)) || x > DEAD) want.add('ArrowRight');
    if ((std && on(12)) || y < -DEAD || on(0)) want.add('ArrowUp');          // bottom button jumps
    if ((std && on(13)) || y > DEAD || on(2)) want.add('ArrowDown');         // left button crouches
    if (on(1) || on(3) || on(4) || on(5) || on(6) || on(7)) want.add('ShiftLeft');   // right, top, shoulders, triggers
    if (on(9)) want.add('Escape');
    if (on(8)) want.add('Enter');
  }
  for (const code of padKeys) if (!want.has(code)) { padKeys.delete(code); key(code, false); }
  for (const code of want) if (!padKeys.has(code)) { padKeys.add(code); key(code, true); }
  if (want.size) setPadMode(true);
}
function pollPads() {
  requestAnimationFrame(pollPads);
  if (running && !document.hidden) readPad();
}
pollPads();

// ---------- sound ----------

// The game's sound: the AudioContext SDL makes
const contexts = [];
if (window.AudioContext) {
  const Real = window.AudioContext;
  window.AudioContext = class extends Real {
    constructor(...args) { super(...args); contexts.push(this); showSound(); }
  };
}
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
  if (!running) return;
  if (!soundOn()) for (const c of contexts) if (c.state === 'running') c.suspend();
  showSound();
}, 1000);

// ---------- saves ----------

let syncing = false, syncAgain = false;
function syncfs() {
  return new Promise(resolve => {
    if (!running || !FS) return resolve();
    if (syncing) { syncAgain = true; return resolve(); }
    syncing = true;
    try {
      FS.syncfs(false, err => {
        if (err) console.warn('saving failed', err);
        syncing = false;
        if (syncAgain) { syncAgain = false; syncfs(); }
        resolve();
      });
    } catch { syncing = false; resolve(); }
  });
}
setInterval(syncfs, 3000);

function showKept() {
  const req = indexedDB.open(SAVE);
  req.onupgradeneeded = () => { req.transaction.abort(); };
  req.onsuccess = () => {
    const db = req.result;
    let kept = false;
    if (db.objectStoreNames.contains('FILE_DATA')) {
      const g = db.transaction('FILE_DATA').objectStore('FILE_DATA').getAllKeys();
      g.onsuccess = () => {
        kept = g.result.some(k => /\.SAV$/i.test(k));
        $('kept').textContent = kept ? 'A saved game is on this car.' : '';
        db.close();
      };
    } else db.close();
  };
  req.onerror = () => {};
}

// ---------- start ----------

async function play() {
  if (started) return;
  started = true;
  for (const b of [$('play'), $('play2')]) b.disabled = true;
  try { navigator.storage?.persist?.(); } catch {}
  loading('Loading…');
  // The player (and its canvas) is shown now, under the loading screen: SDL
  // sizes a resizable window by the canvas's CSS size when it's made, and a
  // hidden canvas measures 0 by 0
  $('start').hidden = true;
  $('player').hidden = false;
  $('touch').hidden = true;
  const canvas = $('canvas');
  let firstFrame = true;
  window.Module = {
    canvas,
    thisProgram: '/pop/prince',           // the game looks for its data next to the program
    locateFile: path => ENGINE + path,
    print: line => { if (window.popDebug) console.log(line); },
    printErr: line => console.warn(line),
    setStatus: () => {},
    onAbort: what => failed(`The game stopped: ${what}`),
    preRun: [M => {
      M.FS.mkdir(SAVE);
      M.FS.mount(M.IDBFS, {}, SAVE);
      M.FS.chdir(SAVE);                   // saves and settings go here
      M.addRunDependency('saves');
      M.FS.syncfs(true, err => {
        if (err) console.warn('loading saves failed', err);
        M.removeRunDependency('saves');
      });
    }],
    onRuntimeInitialized: () => {
      FS = window.Module.FS;
      running = true;
      // the first drawn frame shows the game
      const shown = () => {
        if (!running) return;
        if (window.Module.popFrames > 0 && firstFrame) {
          firstFrame = false;
          $('loading').hidden = true;
          $('touch').hidden = padMode || !touchFirst;
          canvas.focus();
        } else if (firstFrame) requestAnimationFrame(shown);
      };
      requestAnimationFrame(shown);
      try {
        Promise.resolve(window.Module.callMain([])).catch(err => { console.warn(err?.stack || err); failed(`The game stopped: ${err?.message || err}`); });
      } catch (err) { failed(`The game stopped: ${err?.message || err}`); }
    },
  };
  const s = document.createElement('script');
  s.src = ENGINE + 'prince.js';
  s.onerror = () => failed('Couldn\'t load the game. Check the connection and try again.');
  document.body.append(s);
}
$('play').onclick = $('play2').onclick = play;

window.popStats = () => ({ frames: window.Module?.popFrames | 0, running, held: [...held], audio: contexts.map(c => `${c.state} ${c.sampleRate}`) });

// ---------- leaving ----------

async function save() {
  await syncfs();
}

let leaving = false;
$('quitBtn').onclick = async () => {
  if (leaving) return;
  leaving = true;
  await save();
  location.reload();
};

document.addEventListener('visibilitychange', () => {
  if (!running) return;
  if (document.hidden) {
    for (const code of [...held]) key(code, false);   // nothing stays pressed
    tap('Escape');                                    // the pause menu, so the clock stops
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
  await save();
  e.source.postMessage({ frunk: 'closed' }, e.origin);
});
if (parent !== window) parent.postMessage({ frunk: 'save-on-close' }, '*');

addEventListener('error', e => { if (started) failed(`The game stopped: ${e.message}`); });
addEventListener('unhandledrejection', e => { if (started && /promising|suspend|RuntimeError/i.test(String(e.reason))) failed(`The game stopped: ${e.reason}`); });

showKept();
})();
