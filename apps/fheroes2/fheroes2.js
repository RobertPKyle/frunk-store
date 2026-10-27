// fheroes2: the open-source engine for Heroes of Might and Magic II
// (fheroes2 1.1.17, compiled to WebAssembly in engine/ by
// tools/build-fheroes2.mjs, unmodified), playing the player's own copy of
// the game. Its files come from the phone or this device's file picker and
// are kept in this screen's IndexedDB (database fheroes2); they never leave
// it.
//
// The engine runs on this page's main thread and draws to #canvas through
// SDL, which sizes the canvas's pixels to its box (the room under the bar,
// in whole CSS pixels); fheroes2 scales its 640×480 picture into it. Touches reach it
// as SDL finger events and fheroes2 handles them itself: one finger is the
// left mouse button, and a second finger while the first is down is the
// right one (the game's info popups).
//
// Its build has no module wrapper: it reads its settings from a global
// Module and leaves FS, ENV, IDBFS and its run dependencies global. The
// engine's home (/fheroes2: settings and saves) is kept in IndexedDB by
// IDBFS, which fheroes2 updates whenever it writes a file; the game's files
// are written to /h2 on each start, outside it.
//
// The engine can't be restarted within a page, so leaving the game reloads it.

import { phonePanel } from '../_shared/phone.js';
import { MAX_HEROES_FILE, heroesPath, isZip, unzipAll } from '../_shared/roms.js';
import { holdersGate } from '../_shared/holders.js';

// Early access for FrunkStore token holders: nothing starts until this
// screen is unlocked from a holder's phone
await holdersGate('fheroes2');

const HOME = '/fheroes2';
const DATA = '/h2';

const $ = id => document.getElementById(id);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('fheroes2.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('fheroes2.' + key, JSON.stringify(value)); } catch {} },
};
const mb = bytes => `${(bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0)} MB`;

// ---------- storage (IndexedDB) ----------
// files: { path: 'data/heroes2.agg', size, added, data }

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('fheroes2', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('files', { keyPath: 'path' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('files', mode);
    const req = fn(tx.objectStore('files'));
    tx.oncomplete = () => { d.close(); resolve(req && req.result); };
    tx.onerror = tx.onabort = () => { d.close(); reject(tx.error); };
  });
}

const allFiles = () => store('readonly', s => s.getAll());
const putFile = file => store('readwrite', s => s.put(file));
const clearFiles = () => store('readwrite', s => s.clear());

// The stored files' paths and sizes, without reading them
async function fileSizes() {
  const out = new Map();
  await store('readonly', s => {
    const req = s.openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (!c) return;
      out.set(c.value.path, c.value.size);
      c.continue();
    };
    return req;
  }).catch(() => {});
  return out;
}

// ---------- adding files ----------

// Saves one of the player's files where it goes; returns what it is, or
// null when it isn't a file of the game
async function saveFile(name, bytes) {
  const path = heroesPath(name);
  if (!path || !bytes.length) return null;
  await putFile({ path, size: bytes.length, added: Date.now(), data: bytes });
  return path;
}

const KIND = path => path === 'data/heroes2.agg' ? 'The Succession Wars' : path === 'data/heroes2x.agg' ? 'The Price of Loyalty'
  : path.startsWith('maps/') ? 'a map' : 'music';

// A file from the phone or the file picker; a zip may hold the whole game
async function addFile(name, bytes) {
  if (!isZip(bytes)) {
    const path = await saveFile(name, bytes);
    return path && `${name.replace(/^.*\//, '')}: ${KIND(path)}`;
  }
  const entries = await unzipAll(bytes, 512 * 1048576).catch(() => null);
  if (!entries) return null;
  const counts = new Map();
  for (const e of entries) {
    const path = await saveFile(e.name, e.bytes);
    if (path) counts.set(KIND(path), (counts.get(KIND(path)) || 0) + 1);
  }
  if (!counts.size) return null;
  return `${name}: ${[...counts].map(([kind, n]) => kind === 'a map' ? `${n} map${n === 1 ? '' : 's'}` : kind === 'music' ? `${n} music file${n === 1 ? '' : 's'}` : kind).join(', ')}`;
}

async function addFiles(files) {
  const msg = $('addMsg');
  msg.textContent = 'Adding…';
  const added = [];
  const skipped = [];
  for (const file of files) {
    try {
      const what = file.size <= MAX_HEROES_FILE * 4 && await addFile(file.name, new Uint8Array(await file.arrayBuffer()));
      if (what) added.push(what); else skipped.push(file.name);
    } catch { skipped.push(file.name); }
  }
  msg.textContent = (added.length ? `Added ${added.join('; ')}.` : 'No Heroes II files found there.') +
    (skipped.length ? ` Skipped: ${skipped.join(', ')}.` : '');
  renderFiles();
}

// Before the first file is added, the player confirms they own their games
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
  app: 'fheroes2',
  save: addFile,
  onSaved: renderFiles,
  notPlayable: () => 'not a Heroes II file this uses',
});

$('fromPhone').onclick = () => ownGames(phone.show);
$('addFiles').onclick = () => ownGames(() => {
  const input = $('fileInput');
  input.value = '';
  input.onchange = () => addFiles([...input.files]);
  input.click();
});

// ---------- library ----------

function status(text) { $('status').textContent = text; }

function tile(title, line, missing) {
  const el = document.createElement('div');
  el.className = `file${missing ? ' missing' : ''}`;
  el.append(Object.assign(document.createElement('b'), { textContent: title }), Object.assign(document.createElement('small'), { textContent: line }));
  return el;
}

async function renderFiles() {
  const sizes = await fileSizes();
  const has = path => sizes.has(path);
  const sum = prefix => [...sizes].filter(([p]) => p.startsWith(prefix));
  const maps = sum('maps/'), music = sum('music/');
  const total = list => mb(list.reduce((n, [, s]) => n + s, 0));
  $('files').replaceChildren(
    tile('HEROES2.AGG', has('data/heroes2.agg') ? `The Succession Wars · ${mb(sizes.get('data/heroes2.agg'))}` : 'Needed to play: from the DATA folder', !has('data/heroes2.agg')),
    tile('HEROES2X.AGG', has('data/heroes2x.agg') ? `The Price of Loyalty · ${mb(sizes.get('data/heroes2x.agg'))}` : 'Optional: The Price of Loyalty', !has('data/heroes2x.agg')),
    tile('Maps', maps.length ? `${maps.length} map${maps.length === 1 ? '' : 's'} · ${total(maps)}` : 'From the MAPS folder: .MP2 and .MX2', !maps.length),
    tile('Music', music.length ? `${music.length} track${music.length === 1 ? '' : 's'} · ${total(music)}` : 'Optional: from the MUSIC folder', !music.length),
  );
  $('playBtn').disabled = !has('data/heroes2.agg');
  $('removeAll').hidden = !sizes.size;
}

// Buttons that lose files ask for a second tap within 3 seconds
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
$('removeAll').onclick = () => confirmTap($('removeAll'), async () => {
  await clearFiles().catch(() => {});
  $('addMsg').textContent = 'Removed the game files. Your saves are kept.';
  renderFiles();
});

// ---------- loading ----------

function loading(title, text, part) {
  $('loading').hidden = false;
  $('loadTitle').textContent = title;
  $('loadText').textContent = text;
  $('loadBar').style.width = `${Math.round(100 * part)}%`;
}

function failed(message) {
  $('failedText').textContent = message || 'Something went wrong.';
  $('failed').hidden = false;
  $('loading').hidden = true;
}
$('failedOk').onclick = () => location.reload();

// ---------- engine ----------

let running = false;      // the engine is up (it can't be started twice)
let audio = null;         // the AudioContext SDL plays through

const exists = path => { try { window.FS.stat(path); return true; } catch { return false; } };

// Copies the engine's home (settings, saves) to IndexedDB
function syncHome() {
  return new Promise(resolve => {
    if (!running || !window.FS) { resolve(); return; }
    try { window.FS.syncfs(false, () => resolve()); } catch { resolve(); }
  });
}

// Settings for a first start, as fheroes2.cfg (the game fills in the rest):
// no intro video (the copy's ANIM folder isn't sent), and a save at the
// start of each turn as well as at its end, so leaving the car mid-turn
// loses little
const touchFirst = !matchMedia('(hover: hover) and (pointer: fine)').matches;
const DEFAULTS = `show game intro = off
auto save at the beginning of the turn = on
`;

let starting = false;

async function play(btn) {
  if (starting || running) return;
  starting = true;
  btn?.classList.add('busy');
  // Made inside the tap, so the browser lets it play
  try { audio = new AudioContext(); } catch { audio = null; }
  if (audio && !settings.get('sound', true)) audio.suspend();
  try {
    loading('fheroes2', 'Loading your game files…', 0.02);
    const files = await allFiles();
    if (!files.some(f => f.path === 'data/heroes2.agg')) throw new Error('HEROES2.AGG is missing; add it first');
    await boot(files);
  } catch (e) {
    if (running) { failed(`Couldn't start fheroes2: ${e && e.message ? e.message : 'something went wrong'}.`); return; }
    $('loading').hidden = true;
    $('player').hidden = true;
    $('library').hidden = false;
    status(`Couldn't start fheroes2: ${e && e.message ? e.message : 'check the connection and try again'}.`);
    audio?.close().catch(() => {});
    audio = null;
  } finally {
    starting = false;
    btn?.classList.remove('busy');
  }
}
$('playBtn').onclick = () => play($('playBtn'));

function boot(files) {
  return new Promise((resolve, reject) => {
    // The engine's settings, read when its script runs (see the header)
    window.Module = {
      canvas: $('canvas'),
      SDL2: audio ? { audioContext: audio } : {},
      // The engine's data package, next to its script (the script finds
      // its .wasm there by itself)
      locateFile: path => `engine/${path}`,
      preRun: [() => {
        const { FS, ENV, IDBFS } = window;
        ENV.FHEROES2_DATA = DATA;
        ENV.HOME = HOME;
        window.addRunDependency('frunk-files');
        for (const { path, data } of files) {
          FS.mkdirTree(`${DATA}/${path.slice(0, path.lastIndexOf('/'))}`);
          FS.writeFile(`${DATA}/${path}`, data, { canOwn: true });
        }
        files.length = 0;
        FS.mkdir(HOME);
        FS.mount(IDBFS, {}, HOME);
        FS.syncfs(true, err => {
          if (err) console.warn('fheroes2: saves not read', err);
          const cfg = `${HOME}/.fheroes2/fheroes2.cfg`;
          if (!exists(cfg)) {
            FS.mkdirTree(`${HOME}/.fheroes2`);
            FS.writeFile(cfg, DEFAULTS);
          }
          running = true;
          window.removeRunDependency('frunk-files');
        });
      }],
      // "Downloading data... (n/total)" while the engine's own data loads,
      // then "Running..." as the game starts
      setStatus: text => {
        const m = /\((\d+)\/(\d+)\)/.exec(text || '');
        if (m) loading('fheroes2', `Downloading the engine… ${mb(+m[1])} of ${mb(+m[2])}`, 0.05 + 0.85 * m[1] / m[2]);
        if (/^Running/.test(text || '') && $('player').hidden) {
          showPlayer();
          resolve();
        }
      },
    };
    loading('fheroes2', 'Downloading the engine…', 0.05);
    const script = Object.assign(document.createElement('script'), { src: 'engine/fheroes2.js' });
    script.onerror = () => reject(new Error('the engine didn\'t download; check the connection and try again'));
    document.body.append(script);
  });
}

// An error from the engine stops the game; say so rather than freeze
addEventListener('error', e => { if (running) failed(`fheroes2 stopped: ${e.message || 'an error'}`); });
addEventListener('unhandledrejection', e => { if (running) failed(`fheroes2 stopped: ${e.reason?.message || e.reason || 'an error'}`); });

// The game's own Quit ends the engine, and SDL then shrinks the canvas to
// nothing (a resolution change can do that for a moment, so it must last);
// back to the library then
function watchExit() {
  let gone = 0;
  const timer = setInterval(async () => {
    gone = $('canvas').width ? 0 : gone + 1;
    if (gone < 3 || !$('failed').hidden) return;
    clearInterval(timer);
    await syncHome();
    location.reload();
  }, 500);
}

function showPlayer() {
  watchExit();
  $('library').hidden = true;
  $('player').hidden = false;
  $('loading').hidden = true;
  fitCanvas();
  showSound();
  if (touchFirst && !settings.get('hinted', false)) {
    settings.set('hinted', true);
    hint('Tap to click · drag to scroll the map · touch with a second finger for the right button', 8000);
  }
}

// ---------- screen ----------

// The canvas gets whole CSS pixels: in a frame at a fractional pixel ratio
// (the car's 1.53) its box can come out at 773.2 by 541.3, and SDL then
// missed every tap and click (keys still worked). Sized before the game
// starts, as SDL takes its window's size from it.
function fitCanvas() {
  const c = $('canvas'), room = c.parentElement;
  if (!room.clientWidth) return;
  c.style.setProperty('width', `${Math.floor(room.clientWidth)}px`, 'important');
  c.style.setProperty('height', `${Math.floor(room.clientHeight)}px`, 'important');
}
new ResizeObserver(fitCanvas).observe($('canvas').parentElement);

let hintTimer = 0;
function hint(text, ms = 4000) {
  clearTimeout(hintTimer);
  $('hint').textContent = text;
  $('hint').hidden = !text;
  if (text) hintTimer = setTimeout(() => { $('hint').hidden = true; }, ms);
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

// ---------- leaving ----------

// Save, and stop the sound, while the screen is off or another app is
// showing
document.addEventListener('visibilitychange', () => {
  if (!running) return;
  if (document.hidden) {
    audio?.suspend();
    syncHome();
  } else if (audio && settings.get('sound', true)) {
    audio.resume();
  }
});

// The hub's Apps button (or the car's back button) unloads this page. The
// hub asks first, so the saves can be copied; it waits up to a second.
addEventListener('message', async e => {
  if (e.source !== parent || e.data?.frunk !== 'close') return;
  await syncHome();
  e.source.postMessage({ frunk: 'closed' }, e.origin);
});
if (parent !== window) parent.postMessage({ frunk: 'save-on-close' }, '*');

$('quitBtn').onclick = async () => {
  await syncHome();
  location.reload();
};

renderFiles();
