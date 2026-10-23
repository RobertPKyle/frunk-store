// BattleShip: JRickey's PC port of Super Smash Bros. (N64), compiled to
// WebAssembly in engine/ by tools/build-battleship.mjs. It's a native port
// built from the game's decompilation, not an emulator, so it needs the
// game's assets: the player's own ROM goes through Torch (extract.js, on a
// worker) once, which makes BattleShip.o2r, the port's game files. Those are
// kept in this screen's IndexedDB; the ROM isn't.
//
// The game runs on this page's main thread and draws to #canvas through SDL,
// which also reads the keyboard and controllers. Its saves and settings are
// files in its working folder (/bs); they're copied to IndexedDB every half
// minute, when the page is hidden and when the hub closes it. One game per
// page: quitting reloads the page.

import { holdersGate } from '../_shared/holders.js';
import { phonePanel } from '../_shared/phone.js';
import { findGame } from '../_shared/roms.js';
import { keepAwake } from '../_shared/awake.js';

// Early access for FrunkStore token holders: nothing starts until this
// screen is unlocked from a holder's phone
await holdersGate('BattleShip');

const $ = id => document.getElementById(id);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('battleship.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('battleship.' + key, JSON.stringify(value)); } catch {} },
};

// The dumps BattleShip supports (its README): this build is the US one
const US_SHA1 = 'e2929e10fccc0aa84e5776227e798abc07cedabf';
const JP_SHA1 = '4b71f0e01878696733eefa9c80d11c147ecb4984';
const DIR = '/bs';
// Files the page writes into /bs on every start; everything else there is
// the game's (saves, settings) and is kept
const OURS = new Set(['BattleShip.o2r', 'f3d.o2r', 'gamecontrollerdb.txt', 'assets', 'logs']);

// ---------- storage (IndexedDB) ----------
// files: { name: 'BattleShip.o2r', data, recipe }; saves: { path, data }

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('battleship', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('files', { keyPath: 'name' });
      req.result.createObjectStore('saves', { keyPath: 'path' });
    };
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

const getGame = () => store('files', 'readonly', s => s.get('BattleShip.o2r')).catch(() => null);
const putGame = (data, recipe) => store('files', 'readwrite', s => s.put({ name: 'BattleShip.o2r', data, recipe }));
const removeGame = () => store('files', 'readwrite', s => s.delete('BattleShip.o2r'));
const getSaves = () => store('saves', 'readonly', s => s.getAll()).catch(() => []);
const putSaves = files => store('saves', 'readwrite', s => { for (const f of files) s.put(f); });

// The recipe Torch follows; a game made with an older one is made again
let recipe = null;
async function loadRecipe() {
  if (recipe) return recipe;
  const text = await (await fetch('engine/recipe.json')).text();
  recipe = { data: JSON.parse(text), hash: await sha1(new TextEncoder().encode(text)) };
  return recipe;
}

async function sha1(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-1', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------- library ----------

function status(text) { $('status').textContent = text; }

async function renderLibrary() {
  const game = await getGame();
  const current = game && game.recipe === (await loadRecipe().catch(() => null))?.hash;
  $('playBtn').hidden = !current;
  $('removeBtn').hidden = !game;
  $('fromPhone').classList.toggle('primary', !current);
  if (current) status('Your game is ready.');
  else if (game) status('This update makes the game files a new way: send your ROM again to play.');
  else status('');
}

// The player confirms once that the game is theirs
function owned(then) {
  if (settings.get('owned', false)) return then();
  $('terms').hidden = false;
  $('termsOk').onclick = () => {
    settings.set('owned', true);
    $('terms').hidden = true;
    then();
  };
  $('termsCancel').onclick = () => { $('terms').hidden = true; };
}

// N64 dumps come in three byte orders; Torch and the hashes want the
// cartridge's own (.z64)
function toZ64(bytes) {
  const out = bytes.slice();
  if (bytes[0] === 0x37 && bytes[1] === 0x80) {           // .v64: pairs swapped
    for (let i = 0; i + 1 < out.length; i += 2) [out[i], out[i + 1]] = [bytes[i + 1], bytes[i]];
  } else if (bytes[0] === 0x40 && bytes[1] === 0x12) {    // .n64: each four reversed
    for (let i = 0; i + 3 < out.length; i += 4) {
      out[i] = bytes[i + 3]; out[i + 1] = bytes[i + 2]; out[i + 2] = bytes[i + 1]; out[i + 3] = bytes[i];
    }
  }
  return out;
}

// Checks a ROM; returns it as .z64, or null with why() saying what's wrong
let whyNot = '';
async function checkRom(name, bytes) {
  const game = await findGame(name, bytes);
  if (!game || game.system !== 'n64') { whyNot = 'not a Nintendo 64 game'; return null; }
  const rom = toZ64(game.bytes);
  const hash = await sha1(rom);
  if (hash === US_SHA1) return rom;
  whyNot = hash === JP_SHA1 ? 'the Japanese version; this plays the US version 1.0'
    : 'not the US version 1.0 of Super Smash Bros. (or a damaged dump)';
  return null;
}

function loading(title, text, progress) {
  $('loading').hidden = false;
  $('loadTitle').textContent = title;
  $('loadText').textContent = text;
  $('loadBar').style.width = `${Math.round(100 * (progress || 0))}%`;
}

// Makes BattleShip.o2r from a checked ROM and keeps it
async function extract(rom) {
  loading('Making the game files', 'This takes about half a minute.', 0);
  try {
    const { data, hash } = await loadRecipe();
    const o2r = await new Promise((resolve, reject) => {
      const worker = new Worker('extract.js', { type: 'module' });
      worker.onmessage = ({ data: m }) => {
        if (m.progress) $('loadBar').style.width = `${Math.round(100 * m.progress)}%`;
        if (m.error) { console.log(m.log.join('\n')); reject(new Error(m.error)); }
        if (m.o2r) resolve(m.o2r);
        if (m.error || m.o2r) worker.terminate();
      };
      worker.onerror = e => { worker.terminate(); reject(new Error(e.message || 'the extractor failed')); };
      worker.postMessage({ rom, recipe: data }, [rom.buffer]);
    });
    await putGame(o2r, hash);
    status('Your game is ready.');
  } catch (e) {
    status(`Couldn't make the game files: ${e.message}`);
  } finally {
    $('loading').hidden = true;
    renderLibrary();
  }
}

let pending = null;   // a ROM from the phone, made into game files when the panel closes
const phone = phonePanel({
  app: 'battleship',
  save: async (name, bytes) => {
    const rom = await checkRom(name, bytes);
    if (!rom) return null;
    pending = rom;
    return 'Super Smash Bros. (USA)';
  },
  notPlayable: () => whyNot,
  onSaved: () => { if (pending) phone.close(); },
  onClose: () => {
    const rom = pending;
    pending = null;
    if (rom) extract(rom);
  },
});

$('fromPhone').onclick = () => owned(() => phone.show());
$('addFile').onclick = () => owned(() => { $('fileInput').value = ''; $('fileInput').click(); });
$('fileInput').onchange = async () => {
  const file = $('fileInput').files[0];
  if (!file) return;
  if (file.size > 80e6) return status(`${file.name} is too big to be a Nintendo 64 game.`);
  const rom = await checkRom(file.name, new Uint8Array(await file.arrayBuffer()));
  if (!rom) return status(`${file.name}: ${whyNot}.`);
  extract(rom);
};

// A second tap within 3 seconds removes
$('removeBtn').onclick = async () => {
  const btn = $('removeBtn');
  if (!btn.classList.contains('armed')) {
    btn.classList.add('armed');
    btn.textContent = 'Sure? Tap again';
    setTimeout(() => { btn.classList.remove('armed'); btn.textContent = 'Remove game'; }, 3000);
    return;
  }
  await removeGame().catch(() => {});
  btn.classList.remove('armed');
  btn.textContent = 'Remove game';
  status('Removed. Your saves stay on this screen.');
  renderLibrary();
};

// ---------- playing ----------

let mod = null;   // the running game (Emscripten module)

function loadScript(src) {
  return new Promise((resolve, reject) => {
    document.head.append(Object.assign(document.createElement('script'), { src, onload: resolve, onerror: () => reject(new Error(`couldn't load ${src}`)) }));
  });
}

const fetchBytes = async url => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`couldn't load ${url}`);
  return new Uint8Array(await res.arrayBuffer());
};

// The car adds a "Tesla Virtual Gamepad" (standard layout) for a controller
// it recognises, next to the controller's own raw device, and both report
// every press. While a standard pad is present, the game sees only those.
function standardPadsOnly() {
  const all = navigator.getGamepads?.bind(navigator);
  if (!all) return;
  navigator.getGamepads = () => {
    const pads = [...all()];
    if (!pads.some(p => p?.mapping === 'standard')) return pads;
    return pads.map(p => (p?.mapping === 'standard' ? p : null));
  };
}

function fail(text) {
  if (!$('failed').hidden) return;
  keepAwake(false);
  $('loading').hidden = true;
  $('failedText').textContent = text;
  $('failed').hidden = false;
}
$('failedOk').onclick = () => location.reload();

async function play() {
  loading('Starting BattleShip', 'Loading the game…', 0.1);
  try {
    const game = await getGame();
    if (!game) throw new Error('the game files are missing');
    const [f3d, montserrat, inconsolata] = await Promise.all(['engine/f3d.o2r', 'engine/fonts/Montserrat-Regular.ttf',
      'engine/fonts/Inconsolata-Regular.ttf'].map(fetchBytes));
    $('loadBar').style.width = '40%';
    const saves = await getSaves();
    await loadScript('engine/BattleShip.js');
    $('loadBar').style.width = '70%';
    standardPadsOnly();
    mod = await createBattleShip({
      canvas: $('canvas'),
      locateFile: f => `engine/${f}`,
      print: line => console.log(line),
      printErr: line => console.log(line),
      onAbort: what => fail(`BattleShip stopped (${what}). Tap Back to start again.`),
      // Quitting from BattleShip's own menu
      onGameExit: async () => { await saveGame(); location.reload(); },
      preRun: [m => {
        const { FS } = m;
        FS.mkdirTree(`${DIR}/assets/custom/fonts`);
        FS.writeFile(`${DIR}/BattleShip.o2r`, game.data);
        FS.writeFile(`${DIR}/f3d.o2r`, f3d);
        // The browser maps controllers itself; an empty list keeps SDL quiet
        FS.writeFile(`${DIR}/gamecontrollerdb.txt`, '');
        FS.writeFile(`${DIR}/assets/custom/fonts/Montserrat-Regular.ttf`, montserrat);
        FS.writeFile(`${DIR}/assets/custom/fonts/Inconsolata-Regular.ttf`, inconsolata);
        for (const s of saves) {
          FS.mkdirTree(s.path.slice(0, s.path.lastIndexOf('/')));
          FS.writeFile(s.path, s.data);
        }
        FS.chdir(DIR);
      }],
    });
    $('library').hidden = true;
    $('loading').hidden = true;
    $('player').hidden = false;
    keepAwake(true);
    mod.callMain([]);
    // SDL takes the canvas's on-screen size from a resize
    setTimeout(() => dispatchEvent(new Event('resize')), 100);
    hint(navigator.getGamepads?.().some(Boolean) ? 'Menu opens BattleShip\'s settings.' : 'Connect a controller to play (a keyboard works too).', 6000);
    setInterval(saveGame, 30000);
    showFps();
    showSound();
  } catch (e) {
    fail(`BattleShip couldn't start: ${e.message}.`);
  }
}
$('playBtn').onclick = () => play();

// Copies the game's own files in /bs (saves, settings) to IndexedDB,
// those that changed since the last copy
const saved = new Map();   // path -> modification time
async function saveGame() {
  if (!mod) return;
  const files = [];
  const walk = dir => {
    for (const name of mod.FS.readdir(dir)) {
      if (name === '.' || name === '..' || (dir === DIR && OURS.has(name))) continue;
      const path = `${dir}/${name}`;
      const st = mod.FS.stat(path);
      if (mod.FS.isDir(st.mode)) walk(path);
      else if (st.size < 4 * 1048576 && saved.get(path) !== +st.mtime) {
        saved.set(path, +st.mtime);
        files.push({ path, data: mod.FS.readFile(path) });
      }
    }
  };
  try {
    walk(DIR);
    if (files.length) await putSaves(files);
  } catch {}
}

// Escape opens BattleShip's own menu (settings, controls, enhancements)
function key(type, code, keyCode) {
  const e = new KeyboardEvent(type, { key: code, code, bubbles: true });
  Object.defineProperty(e, 'keyCode', { get: () => keyCode });
  Object.defineProperty(e, 'which', { get: () => keyCode });
  dispatchEvent(e);
}
$('menuBtn').onclick = () => {
  key('keydown', 'Escape', 27);
  setTimeout(() => key('keyup', 'Escape', 27), 80);
};

let hintTimer = 0;
function hint(text, ms) {
  clearTimeout(hintTimer);
  $('hint').textContent = text;
  $('hint').hidden = !text;
  if (text) hintTimer = setTimeout(() => { $('hint').hidden = true; }, ms);
}

function showFps() {
  let last = mod.gameFrames || 0;
  setInterval(() => {
    const now = mod.gameFrames || 0;
    $('fps').textContent = `${now - last} fps`;
    last = now;
  }, 1000);
}

// ---------- sound ----------

// SDL's AudioContext; the browser may hold it back until a tap
const audio = () => mod?.SDL2?.audioContext;
const soundBlocked = () => settings.get('sound', true) && audio() && audio().state !== 'running' && !document.hidden;
function showSound() {
  $('soundBtn').textContent = !settings.get('sound', true) ? 'Sound off' : soundBlocked() ? 'Tap for sound' : 'Sound on';
}
function wakeSound() {
  if (soundBlocked()) audio().resume().then(showSound, () => {});
}
$('soundBtn').onclick = () => {
  if (soundBlocked()) { wakeSound(); return; }
  const on = !settings.get('sound', true);
  settings.set('sound', on);
  if (audio()) on ? audio().resume() : audio().suspend();
  showSound();
};
for (const type of ['pointerdown', 'keydown']) addEventListener(type, wakeSound, true);
setInterval(() => { if (mod) showSound(); }, 2000);

// ---------- leaving ----------

$('quitBtn').onclick = async () => {
  await saveGame();
  location.reload();
};

// Keep the saves, and stop the sound, while the screen is off or another app
// is showing (the game itself stops with the page's refreshes)
document.addEventListener('visibilitychange', () => {
  if (!mod) return;
  if (document.hidden) {
    audio()?.suspend();
    saveGame();
  } else if (settings.get('sound', true)) {
    audio()?.resume();
  }
});

// The hub's Apps button (or the car's back button) unloads this page. The
// hub asks first, so the saves can be kept; it waits up to a second.
addEventListener('message', async e => {
  if (e.source !== parent || e.data?.frunk !== 'close') return;
  await saveGame();
  e.source.postMessage({ frunk: 'closed' }, e.origin);
});
if (parent !== window) parent.postMessage({ frunk: 'save-on-close' }, '*');

addEventListener('error', e => { if (mod) fail(`BattleShip stopped: ${e.message}. Tap Back to start again.`); });
addEventListener('unhandledrejection', e => { if (mod) fail(`BattleShip stopped: ${e.reason?.message || e.reason}. Tap Back to start again.`); });

renderLibrary();
