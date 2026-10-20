// Block Builder: ClassiCube (a Minecraft Classic style game, compiled to
// WebAssembly in engine/ by tools/build-blocks.mjs) in creative mode, with
// a free texture pack and sounds (data/).
//
// The game keeps its files (its options and the worlds, maps/<name>.cw) in
// its own IndexedDB database, "/classicube". This page lists the worlds
// from there, starts the game with one (or with a new one it describes in
// Module.newWorld), and saves the world through web_save() every minute,
// when the page is hidden and when it's left: the hub's Apps button asks
// first (save-on-close) and waits for it. The game draws to #canvas and
// takes the touches, mouse, keyboard and controllers itself; on a touch
// screen it shows its own on-screen controls (Module.touchUI). The changes
// to the game are in tools/blocks/classicube-web.patch.
//
// One world per page: going back to the worlds reloads the page.
(() => {
'use strict';

const $ = id => document.getElementById(id);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('blocks.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('blocks.' + key, JSON.stringify(value)); } catch {} },
};

const SIZES = { Small: 128, Large: 256 };
const LANDS = { Hills: false, Flat: true };
const HEIGHT = 64;
const AUTOSAVE_MS = 60000;

// ---------- the game's files (IndexedDB "/classicube", store FILE_DATA) ----------
// keys are paths, values { timestamp, mode, contents }

const DB = '/classicube', STORE = 'FILE_DATA', MAPS = '/classicube/maps/';

function openDb() {
  return new Promise((resolve, reject) => {
    // version 21, as the game opens it, so it doesn't have to upgrade
    const req = indexedDB.open(DB, 21);
    req.onupgradeneeded = () => {
      const s = req.result.objectStoreNames.contains(STORE) ? req.transaction.objectStore(STORE) : req.result.createObjectStore(STORE);
      if (!s.indexNames.contains('timestamp')) s.createIndex('timestamp', 'timestamp', { unique: false });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const d = await openDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { d.close(); resolve(req && req.result); };
    tx.onerror = tx.onabort = () => { d.close(); reject(tx.error); };
  });
}

// The worlds: [{ name, path, time, bytes }], most recently played first
async function listWorlds() {
  const out = [];
  await withStore('readonly', s => {
    const req = s.openCursor(IDBKeyRange.bound(MAPS, MAPS + '￿'));
    req.onsuccess = () => {
      const c = req.result;
      if (!c) return;
      const name = c.key.slice(MAPS.length);
      if (/\.cw$/i.test(name) && !name.includes('/')) {
        out.push({ name: name.slice(0, -3), path: 'maps/' + name, time: +c.value.timestamp || 0, bytes: c.value.contents?.length || 0 });
      }
      c.continue();
    };
    return req;
  }).catch(() => {});
  return out.sort((a, b) => b.time - a.time);
}

const deleteWorld = w => withStore('readwrite', s => s.delete(MAPS + w.path.slice(5)));

// ---------- library ----------

function status(text) { $('status').textContent = text; }

function ago(t) {
  const s = (Date.now() - t) / 1000;
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} minutes ago`;
  if (s < 86400 * 1.5) return `${Math.round(s / 3600)} hours ago`;
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

let worlds = [];

async function renderLibrary() {
  worlds = await listWorlds();
  $('worlds').replaceChildren(...worlds.map(w => {
    const box = document.createElement('div');
    box.className = 'world';
    const b = document.createElement('button');
    b.type = 'button';
    const t = document.createElement('b');
    t.textContent = w.name;
    const s = document.createElement('small');
    s.textContent = `Played ${ago(w.time)}`;
    b.append(t, s);
    b.onclick = () => play({ name: w.name, path: w.path }, b);
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del';
    del.textContent = 'Delete';
    del.setAttribute('aria-label', `Delete ${w.name}`);
    let armed = 0;
    del.onclick = async () => {
      if (!armed) {
        del.classList.add('armed');
        del.textContent = 'Sure?';
        armed = setTimeout(() => { armed = 0; del.classList.remove('armed'); del.textContent = 'Delete'; }, 3000);
        return;
      }
      clearTimeout(armed);
      await deleteWorld(w).catch(() => {});
      if (settings.get('last', null) === w.name) settings.set('last', null);
      renderLibrary();
    };
    box.append(b, del);
    return box;
  }));
  const last = worlds.find(w => w.name === settings.get('last', null)) || worlds[0];
  $('continue').hidden = !last;
  if (last) {
    $('continue').textContent = `Play ${last.name}`;
    $('continue').onclick = () => play({ name: last.name, path: last.path }, $('continue'));
  }
  showNew();
}

function segment(id, values, key, fallback, onChange) {
  const el = $(id);
  const show = () => {
    const v = settings.get(key, fallback);
    for (const b of el.children) b.setAttribute('aria-pressed', String(b.dataset.v === v));
    onChange?.(v);
  };
  el.replaceChildren(...values.map(v => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.v = v;
    b.textContent = v;
    b.onclick = () => { settings.set(key, v); show(); };
    return b;
  }));
  show();
}

// A name no world has yet: World 1, World 2, ...
function freshName() {
  const taken = new Set(worlds.map(w => w.name.toLowerCase()));
  for (let n = 1; ; n++) if (!taken.has(`world ${n}`)) return `World ${n}`;
}

function showNew() {
  const size = SIZES[settings.get('size', 'Small')];
  $('newNote').textContent = `${freshName()}: ${size} × ${size} blocks${settings.get('land', 'Hills') === 'Flat' ? ', flat grass' : ''}`;
}
segment('sizeSeg', Object.keys(SIZES), 'size', 'Small', showNew);
segment('landSeg', Object.keys(LANDS), 'land', 'Hills', showNew);
segment('sharpSeg', ['Normal', 'Sharp'], 'sharp', 'Normal');

$('create').onclick = () => {
  const size = SIZES[settings.get('size', 'Small')];
  play({ name: freshName(), fresh: { size, height: HEIGHT, flat: LANDS[settings.get('land', 'Hills')] } }, $('create'));
};

// ---------- the game ----------

let game = null;          // the world being played: { name, path?, fresh? }
let ready = false;        // the engine has started (a first save worked)
let lastSave = 0;
const log = [];
window.blocksLog = log;

const touchFirst = !matchMedia('(hover: hover) and (pointer: fine)').matches;

// Canvas pixels per CSS pixel: 1, or every device pixel when Sharp
const canvasScale = () => (settings.get('sharp', 'Normal') === 'Sharp' ? devicePixelRatio || 1 : 1);

// The canvas' size in canvas pixels. The game calls this (resizeGameCanvas)
// when the window changes.
function fitCanvas() {
  const c = $('canvas'), r = c.getBoundingClientRect();
  const scale = canvasScale();
  const w = Math.max(1, Math.round(r.width * scale)), h = Math.max(1, Math.round(r.height * scale));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
}
window.resizeGameCanvas = fitCanvas;

function loading(title, text) {
  $('loading').hidden = false;
  $('loadTitle').textContent = title;
  $('loadText').textContent = text;
}

function failed(message) {
  $('failedText').textContent = message || 'Something went wrong.';
  $('failed').hidden = false;
  $('loading').hidden = true;
}
$('failedOk').onclick = () => location.reload();

function play(world, btn) {
  if (game) return;
  game = world;
  btn?.classList.add('busy');
  startSound();
  settings.set('last', world.name);
  loading(world.name, world.fresh ? 'Making the world…' : 'Loading…');
  $('title').textContent = world.name;
  $('library').hidden = true;
  $('player').hidden = false;
  fitCanvas();
  const remember = line => {
    log.push(String(line));
    if (log.length > 200) log.shift();
  };
  let named = !world.fresh;
  window.Module = {
    canvas: $('canvas'),
    // a world's path loads it; a name starts a new world (Module.newWorld)
    arguments: [world.path || 'Player'],
    newWorld: world.fresh || null,
    // The name for a world that has none yet: the new world's from the
    // list, then a fresh one for each world made in the game's own menu
    worldName: () => {
      const name = named ? freshName() : game.name;
      named = true;
      worlds.push({ name });
      return name;
    },
    worldSaved: name => {
      lastSave = Date.now();
      if (name !== game.name) { game.name = name; $('title').textContent = name; settings.set('last', name); }
      showSaved();
    },
    texturePackUrl: 'data/textures.zip',
    soundUrl: name => `data/sounds/${name}.ogg`,
    touchUI: touchFirst,
    // the game sizes its buttons and text by this
    canvasScale: canvasScale(),
    locateFile: path => `engine/${path}`,
    print: remember,
    printErr: remember,
    setStatus: () => {},
    onAbort: what => failed(`The game stopped: ${what}`),
  };
  const s = document.createElement('script');
  s.src = 'engine/ClassiCube.js';
  s.onerror = () => failed('Couldn\'t load the game. Check the connection and try again.');
  document.body.append(s);
  waitForStart(performance.now());
}

// The game is up once it can save the world (a new one has finished being
// made); a new world is saved straight away, so it's in the list
function waitForStart(since) {
  if (!game) return;
  let saved = false;
  try { saved = window.Module._web_save() === 0; } catch {}
  if (saved) {
    ready = true;
    $('loading').hidden = true;
    $('canvas').focus();
    if (touchFirst) hint('Drag to look around, use the arrows to walk', 5000);
    setInterval(save, AUTOSAVE_MS);
    return;
  }
  if (performance.now() - since > 60000) {
    const why = [...log].reverse().find(l => /error|failed/i.test(l));
    failed(`The world didn't open${why ? `: ${why}` : '.'}`);
    return;
  }
  setTimeout(() => waitForStart(since), 250);
}

// Saves the world; true if it did. The game writes it to IndexedDB in the
// background, so callers that need it there wait for flush()
function save() {
  if (!ready) return false;
  try { return window.Module._web_save() === 0; } catch { return false; }
}
// Resolves once the game's writes so far have reached IndexedDB: a write
// transaction queues behind them, as they touch the same store
const flush = () => withStore('readwrite', () => null).catch(() => {});

function showSaved() {
  $('saved').textContent = lastSave ? 'Saved' : '';
}

let hintTimer = 0;
function hint(text, ms = 4000) {
  clearTimeout(hintTimer);
  $('hint').textContent = text;
  $('hint').hidden = !text;
  if (text) hintTimer = setTimeout(() => { $('hint').hidden = true; }, ms);
}

$('menuBtn').onclick = () => { if (ready) window.Module._web_escape(); };

let leaving = false;
async function leave() {
  if (leaving) return;
  leaving = true;
  if (save()) await flush();
  location.reload();
}
$('quitBtn').onclick = () => leave();

// ---------- sound ----------

// The game's sound lives in window.AUDIO: its AudioContext, and the decoded
// sounds by name. The game downloads a sound the first time it's asked to
// play it, and skips playing it that time, so the page makes AUDIO itself:
// the context inside the tap that starts the game (so the browser lets it
// play), and every sound fetched and decoded up front.
const SOUNDS = [
  ...['cloth', 'grass', 'gravel', 'sand', 'snow', 'stone', 'wood'].flatMap(g => [1, 2, 3, 4].map(n => `step_${g}${n}`)),
  ...['cloth', 'grass', 'gravel', 'sand', 'snow', 'stone', 'wood'].flatMap(g => [1, 2, 3, 4].map(n => `dig_${g}${n}`)),
  'dig_glass1', 'dig_glass2', 'dig_glass3',
];
function startSound() {
  let context;
  try { context = new AudioContext(); } catch { return; }
  if (!settings.get('sound', true)) context.suspend();
  window.AUDIO = { context, sources: [], buffers: {}, errors: [], seen: {} };
  for (const name of SOUNDS) {
    window.AUDIO.seen[name] = true;
    fetch(`data/sounds/${name}.ogg`)
      .then(res => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(res.status))))
      .then(data => context.decodeAudioData(data))
      .then(buffer => { window.AUDIO.buffers[name] = buffer; }, () => { delete window.AUDIO.seen[name]; });
  }
}

// The browser may still hold the sound back until a tap; the button says so
const audio = () => window.AUDIO?.context || null;
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
  showSound();
  const a = audio();
  if (a) on ? a.resume() : a.suspend();
};
for (const type of ['pointerdown', 'keydown', 'touchstart']) addEventListener(type, wakeSound, true);
setInterval(() => {
  if (!game) return;
  const a = audio();
  if (a && !settings.get('sound', true) && a.state === 'running') a.suspend();
  showSound();
}, 1000);

// ---------- leaving ----------

// Save, and stop the sound, while the screen is off or another app shows
document.addEventListener('visibilitychange', () => {
  if (!game) return;
  if (document.hidden) {
    save();
    audio()?.suspend();
  } else if (settings.get('sound', true)) {
    audio()?.resume();
  }
});

// The hub's Apps button (or the car's back button) unloads this page. The
// hub asks first, so the world can be saved; it waits up to a second.
addEventListener('message', async e => {
  if (e.source !== parent || e.data?.frunk !== 'close') return;
  if (save()) await flush();
  e.source.postMessage({ frunk: 'closed' }, e.origin);
});
if (parent !== window) parent.postMessage({ frunk: 'save-on-close' }, '*');

addEventListener('error', e => { if (game && !ready) failed(`The game stopped: ${e.message}`); });

renderLibrary();
})();
