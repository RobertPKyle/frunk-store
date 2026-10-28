// Adventure Games: ScummVM 2026.4.0 compiled to WebAssembly (engine/, built
// by tools/build-scummvm.mjs with tools/scummvm/scummvm-web.patch), with
// freeware adventures from the ScummVM project plus games the player loads
// from their own copies. Games are kept in this screen's IndexedDB and never
// leave it; the free ones are kept too once downloaded, so they start
// without a connection.
//
// A game is a folder of files. Before ScummVM starts, its files are written
// to /games/<id> in the engine's memory file system and ScummVM is told to
// recognise and run whatever is there. ScummVM's own data (menu themes,
// engine tables) is fetched from data/ as needed. Its settings and saves
// live in /home/web_user, which it keeps in IndexedDB itself.
//
// ScummVM draws to #canvas and reads touches itself: a tap clicks there, a
// second finger's tap right-clicks. The Right-click button turns the next tap
// into a right click, the bar's other buttons send keys, and controllers move
// a pointer; all of these reach ScummVM as made-up mouse and keyboard events.
//
// A game in progress is autosaved (by the patch's web_request_save) every
// minute, when the page is hidden and when the player leaves with Games, and
// Continue loads that save. The save happens in ScummVM's own loop, which
// needs the page's timers: the hub's close handshake is tried too, but going
// back in the hub's history (its Apps button) stops this frame's timers, so
// the minute-by-minute saves are what make sure little is lost.
// ScummVM can't be restarted within a page, so leaving a game reloads it.

import { mbOf, wasmProgress } from '../_shared/engine.js';
import { phonePanel } from '../_shared/phone.js';
import { cleanName, isZip, unzipAll } from '../_shared/roms.js';

const MB = 1024 * 1024;
const MAX_GAME = 1024 * MB;   // all of a game's files together

const FREE = [
  {
    id: 'bass', title: 'Beneath a Steel Sky', maker: 'Revolution, 1994', zips: [['BASS-Floppy-1.3.zip', 7675813]],
    about: 'Sci-fi thriller: escape a city of towers ruled from below, with Joey, a robot who lives on a circuit board.',
  },
  {
    id: 'queen', title: 'Flight of the Amazon Queen', maker: 'Interactive Binary Illusions, 1995', zips: [['FOTAQ_Floppy.zip', 7109570]],
    about: 'Pulp comedy: 1940s pilot Joe King crash-lands in the Amazon and stumbles into a mad scientist\'s plot.',
  },
  {
    id: 'lure', title: 'Lure of the Temptress', maker: 'Revolution, 1992', zips: [['lure-1.1.zip', 5678861]],
    about: 'Fantasy: break out of a sorceress\'s dungeon and free a town whose people go about their own lives.',
  },
  {
    id: 'drascula', title: 'Drascula: The Vampire Strikes Back', maker: 'Alcachofa Soft, 1996',
    zips: [['drascula-1.0.zip', 32842993], ['drascula-audio-2.0.zip', 36531704]],
    about: 'Slapstick horror: rescue your girlfriend from Count Drascula. Silly jokes all the way.',
  },
  {
    id: 'soltys', title: 'Sołtys', maker: 'LK Avalon, 1995', zips: [['soltys-en-v1.0.zip', 3484518]],
    about: 'A Polish comedy adventure, full of odd puzzles and odder characters.',
  },
  {
    id: 'sfinx', title: 'Sfinx', maker: 'LK Avalon', zips: [['sfinx-en-v1.1.zip', 16549117]],
    about: 'A puzzle-packed comedy adventure from the makers of Sołtys.',
  },
  {
    id: 'nippon', title: 'Nippon Safes, Inc.', maker: 'Dynabyte, 1992', zips: [['nippon-1.0.zip', 1977894]],
    about: 'Play three bumbling crooks, each with a story of their own, in a comic caper.',
  },
  {
    id: 'outoforder', title: 'Out Of Order', maker: 'Hungry Software, 2003', zips: [['outoforder.zip', 10606154]],
    about: 'Comedy sci-fi starring a guy in silly slippers: thirty hand-drawn rooms, made by one person over three years.',
  },
  {
    id: 'tsotc', title: 'The Secret of Tremendous Corporation', maker: 'Sebastian Krzyszkowiak, Konrad Burandt and Paweł Radej',
    zips: [['tsotc-v6.zip', 34612275]],
    about: 'A game-jam comedy grown into a full adventure about a very secretive company. Its high-resolution art is heavy work: it may run slowly on older cars.',
  },
  {
    id: 'frasse', title: 'Frasse and the Peas of Kejick', maker: 'Rikard Peterson', zips: [['frasse-1.04.zip', 12769570]],
    about: 'A comedy adventure by one of the developers who later carried on the SLUDGE engine itself.',
  },
  {
    id: 'nsc', title: 'Nathan\'s Second Chance', maker: 'Upper Orbit Software', zips: [['nsc.zip', 7883785]],
    about: 'A comedy adventure that eases you in with a little tutorial in its opening chapter.',
  },
  {
    id: 'mysthous', title: 'Mystery House', maker: 'On-Line Systems (later Sierra), 1980', zips: [['MYSTHOUS.zip', 59353]],
    about: 'The first graphic adventure: the guests in an old mansion turn up dead one by one. Type commands like GO NORTH (tap Type for the keyboard).',
  },
];
const download = g => g.zips.reduce((n, [, size]) => n + size, 0);

const $ = id => document.getElementById(id);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('adventure.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('adventure.' + key, JSON.stringify(value)); } catch {} },
};
const mb = bytes => `${(bytes / MB).toFixed(bytes < 10 * MB ? 1 : 0)} MB`;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// ---------- games (IndexedDB) ----------
// { id, title, size, added, files: [{ path, data }] }. The free games are
// stored as "free:<id>" once downloaded; others as "g:<time>". A game's
// title starts as a guess and becomes the name ScummVM gives it when it runs.

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('adventure', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('games', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('games', mode);
    const req = fn(tx.objectStore('games'));
    tx.oncomplete = () => { d.close(); resolve(req && req.result); };
    tx.onerror = tx.onabort = () => { d.close(); reject(tx.error); };
  });
}

const listGames = () => store('readonly', s => s.getAllKeys()).catch(() => []);
const getGame = id => store('readonly', s => s.get(id));
const putGame = game => store('readwrite', s => s.put(game));
const deleteGame = id => store('readwrite', s => s.delete(id));
// Everything but the files, which can be hundreds of MB per game
async function gameInfo() {
  const out = [];
  await store('readonly', s => {
    const req = s.openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (!c) return;
      const { files, ...info } = c.value;
      out.push(info);
      c.continue();
    };
    return req;
  }).catch(() => {});
  return out;
}

async function renameGame(id, title) {
  const game = await getGame(id).catch(() => null);
  if (!game || game.title === title) return;
  game.title = title;
  await putGame(game).catch(() => {});
}

// A game's files with the folder they were zipped in (if all share one)
// taken off, and without the clutter Macs and Windows add
function tidy(files) {
  files = files.filter(f => !/(^|\/)(__MACOSX\/|\.DS_Store$|Thumbs\.db$|desktop\.ini$)/i.test(f.path));
  const top = files.length && files[0].path.includes('/') ? files[0].path.split('/')[0] + '/' : '';
  if (top && files.every(f => f.path.startsWith(top))) files = files.map(f => ({ ...f, path: f.path.slice(top.length) }));
  return files;
}

async function saveFiles(title, files) {
  files = tidy(files);
  const size = files.reduce((n, f) => n + f.data.length, 0);
  if (!files.length || size > MAX_GAME) return null;
  await putGame({ id: `g:${Date.now()}`, title, size, added: Date.now(), files });
  return title;
}

// A zip is one game; loose files wait in `pending` until the batch they came
// in is over (the file picker closed, or Done on the phone panel), then
// become one game together
let pending = [];

async function addFile(name, bytes) {
  if (isZip(bytes)) {
    const entries = await unzipAll(bytes, MAX_GAME).catch(() => null);
    if (!entries) return null;
    return saveFiles(cleanName(name), entries.map(e => ({ path: e.name, data: e.bytes })));
  }
  pending.push({ path: name.replace(/^.*\//, ''), data: bytes });
  return `${name}: part of a new game`;
}

async function finishPending() {
  if (!pending.length) return null;
  const files = pending;
  pending = [];
  // Name it after its biggest file until ScummVM names it
  const biggest = files.reduce((a, b) => (b.data.length > a.data.length ? b : a));
  return saveFiles(cleanName(biggest.path), files);
}

async function addFiles(files) {
  const msg = $('addMsg');
  msg.textContent = 'Adding…';
  let added = 0;
  const skipped = [];
  for (const file of files) {
    try {
      const title = await addFile(file.name, new Uint8Array(await file.arrayBuffer()));
      if (title && !pending.length) added++;
      if (!title) skipped.push(file.name);
    } catch { skipped.push(file.name); }
  }
  if (await finishPending().catch(() => null)) added++;
  msg.textContent = (added ? `Added ${added} game${added === 1 ? '' : 's'}. ScummVM names each one when it starts.` : 'Nothing could be added.') +
    (skipped.length ? ` Skipped: ${skipped.join(', ')}.` : '');
  renderMine();
}

// Before the first game is added, the player confirms they own their games
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
  app: 'adventure',
  save: addFile,
  onSaved: renderMine,
  onClose: async () => {
    if (await finishPending().catch(() => null)) status('Added a game from your phone. ScummVM names it when it starts.');
    renderMine();
  },
  notPlayable: () => 'not a game folder this can read',
});

// ---------- library ----------

function status(text) { $('status').textContent = text; }

// Buttons that lose games ask for a second tap within 3 seconds
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

function card(title, lines, onPlay) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'game';
  const t = document.createElement('b');
  t.textContent = title;
  b.append(t, ...lines.map(([tag, text]) => Object.assign(document.createElement(tag), { textContent: text })));
  b.onclick = () => onPlay(b);
  return b;
}

const freeEntry = g => ({ id: `free:${g.id}`, title: g.title, free: g });

async function renderFree() {
  const have = new Set(await listGames());
  $('free').replaceChildren(...FREE.map(g => card(g.title, [
    ['small', `${g.maker} · freeware · ${have.has(`free:${g.id}`) ? 'ready to play' : `${mb(download(g))} download the first time`}`],
    ['p', g.about],
  ], b => play(freeEntry(g), b, false))));
}

async function renderMine() {
  const games = (await gameInfo()).filter(g => !g.id.startsWith('free:')).sort((a, b) => a.title.localeCompare(b.title));
  $('mine').replaceChildren(...games.map(g => {
    const wrap = document.createElement('div');
    wrap.className = 'wrap';
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del';
    del.textContent = 'Remove';
    del.setAttribute('aria-label', `Remove ${g.title}`);
    del.onclick = () => confirmTap(del, async () => {
      await deleteGame(g.id);
      renderMine();
      renderContinue();
    });
    wrap.append(card(g.title, [['small', `${mb(g.size)} · on this screen only`]], b => play(g, b, false)), del);
    return wrap;
  }));
}

// The last game played, to pick up from its autosave
async function renderContinue() {
  const last = settings.get('last', null);
  const btn = $('continue');
  btn.hidden = true;
  if (!last || settings.get(`slot.${last}`, null) === null) return;
  const free = FREE.find(g => `free:${g.id}` === last);
  const entry = free ? freeEntry(free) : (await gameInfo()).find(g => g.id === last);
  if (!entry) return;
  btn.textContent = `Continue ${entry.title}`;
  btn.onclick = () => play(entry, btn, true);
  btn.hidden = false;
}

// ---------- loading ----------

function loading(title, text, part) {
  $('loading').hidden = false;
  $('loadTitle').textContent = title;
  $('loadText').textContent = text;
  $('loadBar').style.width = `${Math.round(100 * part)}%`;
}

// Downloads a free game's zips with progress, unzips them and keeps the
// game for next time
async function downloadFree(entry) {
  const g = entry.free;
  const total = download(g);
  let got = 0;
  const files = [];
  for (const [zip, size] of g.zips) {
    const res = await fetch(`games/${zip}`);
    if (!res.ok || !res.body) throw new Error(`download failed (${res.status})`);
    const reader = res.body.getReader();
    const chunks = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      loading(entry.title, `Downloading ${mb(got)} of ${mb(total)}…`, 0.9 * got / total);
    }
    const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
    if (bytes.length !== size) throw new Error('the download was damaged');
    loading(entry.title, 'Unpacking…', 0.9 * got / total);
    const entries = await unzipAll(bytes, MAX_GAME);
    if (!entries) throw new Error('the download was damaged');
    files.push(...tidy(entries.map(e => ({ path: e.name, data: e.bytes }))));
  }
  navigator.storage?.persist?.().catch(() => {});
  const game = { id: entry.id, title: entry.title, size: files.reduce((n, f) => n + f.data.length, 0), added: Date.now(), files };
  await putGame(game).catch(() => {});   // full storage: play anyway, download again next time
  return game;
}

// ---------- engine ----------

let engine = null;        // the running ScummVM (Emscripten's Module)
let current = null;       // the game it's playing
let audio = null;         // its AudioContext
let started = false;      // ScummVM recognised the game and started it
let leaving = false;
const log = [];           // ScummVM's last lines, for errors

function sync() {
  return new Promise(resolve => {
    if (!engine?.FS) return resolve();
    try { engine.FS.syncfs(false, () => resolve()); } catch { resolve(); }
  });
}

// Asks ScummVM for an autosave and waits (up to 0.9 s, which fits the hub's
// one-second wait) for it, then makes sure it's in IndexedDB. The game is
// saved in its autosave slot unless it can't save right now; either way,
// ScummVM says which slot holds an autosave, for Continue.
async function saveAll() {
  if (!engine || !started || leaving) return;
  try {
    const before = engine._web_saves_done();
    engine._web_request_save();
    const t0 = performance.now();
    while (engine._web_saves_done() === before && performance.now() - t0 < 900) await sleep(25);
    const slot = engine._web_saves_done() !== before ? engine._web_last_save() : -1;
    if (slot >= 0) settings.set(`slot.${current.id}`, slot);
  } catch {}
  await sync();
}

// Back to the library: ScummVM can't restart, so the page reloads. A message
// for the library can ride along.
async function leave(message) {
  if (leaving) return;
  leaving = true;
  audio?.suspend();
  await sync();
  if (message) try { sessionStorage.setItem('adventure.message', message); } catch {}
  location.reload();
}

function failed(message) {
  if (leaving) return;
  leaving = true;
  audio?.suspend();
  $('failedText').textContent = message || 'Something went wrong.';
  $('failed').hidden = false;
  $('loading').hidden = true;
  sync();
}
$('failedOk').onclick = () => location.reload();

// ScummVM names the game it recognised in the window title
let titleTimer = 0;
function watchTitle() {
  clearInterval(titleTimer);
  titleTimer = setInterval(() => {
    const t = document.title;
    if (!t || t === 'Adventure Games' || /^ScummVM\b/.test(t)) return;
    clearInterval(titleTimer);
    started = true;
    const name = t.replace(/\s*\([^)]*\)$/, '');
    $('title').textContent = name;
    if (!current.free) renameGame(current.id, name);
  }, 500);
}

const unrecognised = entry => `ScummVM didn't recognise a game it supports in ${entry.title}. Check that all of the game's files were sent.`;

async function boot(entry, game, resume) {
  loading(entry.title, 'Starting…', 0.95);
  current = entry;
  const dir = `/games/${entry.id.replace(/[^\w.-]+/g, '-')}`;
  // --no-exit: when nothing is recognised, go on to where the launcher
  // would show (onLauncher below) instead of ending the program
  const args = [`--path=${dir}`, '--auto-detect', '--no-exit'];
  const slot = settings.get(`slot.${entry.id}`, null);
  if (resume && slot !== null) args.push(`--save-slot=${slot}`);

  $('title').textContent = entry.title;
  $('library').hidden = true;
  $('player').hidden = false;
  showSound();
  fit();

  window.Module = engine = {
    arguments: args,
    canvas: $('canvas'),
    SDL3: audio ? { audioContext: audio } : {},
    locateFile: file => `engine/${file}`,
    // ScummVM is 33 MB: its download is shown, not just "Starting…"
    instantiateWasm: wasmProgress('engine/scummvm.wasm', {
      progress: (got, total) => loading(entry.title, `Loading the game engine… ${mbOf(got, total)}`, 0.9 + 0.08 * got / total),
      arrived: () => loading(entry.title, 'Starting…', 0.98),
      failed: e => failed(`The game engine couldn't be loaded (${e.message}). Check the connection and try again.`),
    }),
    preRun: [() => {
      const FS = engine.FS;
      for (const f of game.files) {
        const path = `${dir}/${f.path}`;
        FS.mkdirTree(path.slice(0, path.lastIndexOf('/')));
        FS.writeFile(path, f.data, { canOwn: true });
      }
      game.files = null;
      $('loading').hidden = true;
    }],
    print: line => { log.push(line); if (log.length > 30) log.shift(); },
    printErr: line => { log.push(line); if (log.length > 30) log.shift(); },
    // The patch calls this where ScummVM would show its own game list: the
    // game ended, or none was recognised in the files
    onLauncher: () => leave(started ? '' : unrecognised(entry)),
    onAbort: what => failed(`ScummVM stopped: ${what || 'unknown error'}`),
    onExit: code => (code && started ? failed(log.slice(-3).join(' ') || `ScummVM stopped (${code}).`) : leave(started ? '' : unrecognised(entry))),
  };
  watchTitle();
  const script = document.createElement('script');
  script.src = 'engine/scummvm.js';
  script.onerror = () => failed('The game engine couldn\'t be loaded. Check the connection and try again.');
  document.body.append(script);
  setInterval(() => { if (!document.hidden) sync(); }, 20000);   // saves made from ScummVM's menu
  setInterval(() => { if (!document.hidden) saveAll(); }, 60000);
}

let starting = false;

async function play(entry, btn, resume) {
  if (starting || engine) return;
  starting = true;
  btn?.classList.add('busy');
  // Made inside the tap, so the browser lets it play
  try { audio = new AudioContext(); } catch { audio = null; }
  if (audio && !settings.get('sound', true)) audio.suspend();
  try {
    loading(entry.title, 'Loading…', 0);
    const stored = await getGame(entry.id).catch(() => null);
    const game = stored || (entry.free ? await downloadFree(entry) : null);
    if (!game) throw new Error('that game is no longer on this screen');
    settings.set('last', entry.id);
    await boot(entry, game, resume);
  } catch (e) {
    $('loading').hidden = true;
    $('player').hidden = true;
    $('library').hidden = false;
    status(`Couldn't start ${entry.title}: ${e && e.message ? e.message : 'check the connection and try again'}.`);
    audio?.close().catch(() => {});
    audio = null;
    engine = null;
    renderFree();
    renderMine();
    renderContinue();
  } finally {
    starting = false;
    btn?.classList.remove('busy');
  }
}

// ---------- sound ----------

function showSound() {
  const on = settings.get('sound', true);
  $('soundBtn').classList.toggle('off', !on);
  $('soundBtn').setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
}
$('soundBtn').onclick = () => {
  const on = !settings.get('sound', true);
  settings.set('sound', on);
  showSound();
  if (audio) on ? audio.resume() : audio.suspend();
};

// ---------- made-up input ----------
// Events this page makes for ScummVM, so the right-click trap lets them by
const made = new WeakSet();
const canvas = $('canvas');

function mouse(type, x, y, button = 0) {
  const buttons = type === 'mousedown' ? (button === 2 ? 2 : 1) : 0;
  const e = new MouseEvent(type, { clientX: x, clientY: y, button, buttons, bubbles: true, cancelable: true, view: window });
  made.add(e);
  canvas.dispatchEvent(e);
}


// Keys by name: [key, code, keyCode]
const KEYS = {
  Escape: ['Escape', 'Escape', 27], F5: ['F5', 'F5', 116], Control: ['Control', 'ControlLeft', 17], Shift: ['Shift', 'ShiftLeft', 16],
  Enter: ['Enter', 'Enter', 13], Backspace: ['Backspace', 'Backspace', 8], Tab: ['Tab', 'Tab', 9], ' ': [' ', 'Space', 32],
  ArrowUp: ['ArrowUp', 'ArrowUp', 38], ArrowDown: ['ArrowDown', 'ArrowDown', 40], ArrowLeft: ['ArrowLeft', 'ArrowLeft', 37], ArrowRight: ['ArrowRight', 'ArrowRight', 39],
};
const PUNCT = { '.': ['Period', 190], ',': ['Comma', 188], '-': ['Minus', 189], "'": ['Quote', 222], '/': ['Slash', 191], ';': ['Semicolon', 186], '=': ['Equal', 187] };

// [key, code, keyCode, shifted] for a typed character, or null
function keyFor(ch) {
  if (KEYS[ch]) return [...KEYS[ch], false];
  if (/^[a-z]$/i.test(ch)) return [ch, `Key${ch.toUpperCase()}`, ch.toUpperCase().charCodeAt(0), ch !== ch.toLowerCase()];
  if (/^[0-9]$/.test(ch)) return [ch, `Digit${ch}`, ch.charCodeAt(0), false];
  if (PUNCT[ch]) return [ch, PUNCT[ch][0], PUNCT[ch][1], false];
  if (ch.length === 1 && ch.charCodeAt(0) >= 32) return [ch, '', 0, false];
  return null;
}

function keyEvent(type, [key, code, keyCode], mods = {}) {
  const text = type === 'keypress';
  const e = new KeyboardEvent(type, {
    key, code, keyCode: text ? key.charCodeAt(0) : keyCode, which: text ? key.charCodeAt(0) : keyCode,
    charCode: text ? key.charCodeAt(0) : 0, bubbles: true, cancelable: true, ...mods,
  });
  made.add(e);
  window.dispatchEvent(e);
}

// One key press, with Control or Shift held if asked. Keys are let go a few
// frames later, all in order: ScummVM reads which modifiers are down when it
// gets to the key, not when it was pressed.
let keyQueue = Promise.resolve();
function press(name, { ctrl = false, shift = false } = {}) {
  const k = KEYS[name] || keyFor(name);
  if (!k) return;
  keyQueue = keyQueue.then(async () => {
    const mods = { ctrlKey: ctrl, shiftKey: shift };
    if (ctrl) keyEvent('keydown', KEYS.Control, mods);
    if (shift) keyEvent('keydown', KEYS.Shift, mods);
    keyEvent('keydown', k, mods);
    if (k[0].length === 1) keyEvent('keypress', k, mods);
    await sleep(60);
    keyEvent('keyup', k, mods);
    if (shift) keyEvent('keyup', KEYS.Shift, { ctrlKey: ctrl });
    if (ctrl) keyEvent('keyup', KEYS.Control);
    await sleep(20);
  });
}

function typeChar(ch) {
  const k = keyFor(ch);
  if (k) press(ch, { shift: k[3] });
}

// ---------- touch: right-click mode ----------
// While Right-click is on, the next touch (or click) holds the right button
// down where it lands, follows the finger and lets go with it, and nothing
// of it reaches ScummVM as a touch. Holding matters: in some games (Lure of
// the Temptress) the right button opens a menu of actions, and letting go
// over one picks it.

let rightMode = false;
let held = null;          // the touch that is holding the right button: { x, y, since }

function setRightMode(on) {
  rightMode = on;
  $('rightBtn').classList.toggle('on', on);
  $('rightBtn').setAttribute('aria-pressed', String(on));
  hint(on ? 'Tap where to right-click' : '');
}
$('rightBtn').onclick = () => setRightMode(!rightMode);

function trap(e) {
  if (made.has(e) || (e.target !== canvas && !held)) return;
  if (!rightMode && !held) return;
  e.stopImmediatePropagation();
  if (e.cancelable) e.preventDefault();
  const p = e.changedTouches ? e.changedTouches[0] : e;
  const start = e.type === 'touchstart' || (e.type === 'pointerdown' && e.pointerType !== 'touch');
  if (rightMode && start) {
    setRightMode(false);
    held = { x: p.clientX, y: p.clientY, since: performance.now() };
    mouse('mousemove', held.x, held.y);
    mouse('mousedown', held.x, held.y, 2);
  } else if (held && (e.type === 'touchmove' || e.type === 'mousemove')) {
    held.x = p.clientX;
    held.y = p.clientY;
    mouse('mousemove', held.x, held.y);
  } else if (held && ((e.type === 'touchend' || e.type === 'touchcancel') ? e.touches.length === 0 : e.type === 'mouseup')) {
    // a quick tap still holds for a few frames: some games check whether the
    // button is down rather than reading clicks
    const { x, y, since } = held;
    held = null;
    setTimeout(() => mouse('mouseup', x, y, 2), Math.max(0, 150 - (performance.now() - since)));
  }
}
for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'mousedown', 'mousemove', 'mouseup']) {
  window.addEventListener(type, trap, { capture: true, passive: false });
}

// ---------- bar ----------

let hintTimer = 0;
function hint(text, ms = 0) {
  clearTimeout(hintTimer);
  $('hint').textContent = text;
  $('hint').hidden = !text;
  if (text && ms) hintTimer = setTimeout(() => { $('hint').hidden = true; }, ms);
}

$('skipBtn').onclick = () => press('Escape');
$('menuBtn').onclick = () => press('F5', { ctrl: true });   // ScummVM's own menu: save, load, options

// Typing goes through #kb, so the car shows its keyboard. Everything typed
// there is sent to ScummVM as key presses, and kept from reaching it twice.
const kb = $('kb');
$('typeBtn').onclick = () => {
  kb.value = '';
  kb.focus();
  hint('Type, then Enter. Tap the game to hide the keyboard.', 4000);
};
// Caught on the way down, before ScummVM's own listeners can see them
function kbKeys(e) {
  if (e.target !== kb || made.has(e)) return;
  e.stopImmediatePropagation();
  if (e.type === 'keydown' && ['Enter', 'Backspace', 'Escape', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
    press(e.key);
    if (e.key === 'Enter' || e.key === 'Escape') kb.blur();
  }
}
for (const type of ['keydown', 'keypress', 'keyup']) window.addEventListener(type, kbKeys, true);
kb.addEventListener('input', () => {
  for (const ch of kb.value) typeChar(ch);
  kb.value = '';
});
canvas.addEventListener('pointerdown', () => { if (document.activeElement === kb) kb.blur(); });

// ---------- controllers ----------
// The stick or D-pad moves a pointer over the game; buttons click and press
// keys. The car adds a "Tesla Virtual Gamepad" (standard layout) next to a
// controller's raw device and both report every press, so when a standard
// pad is present, buttons come only from standard pads, as in Freedoom.

const pointer = { x: -1, y: -1 };
let padHeld = new Set();
let padRaf = 0;

function readPads() {
  const pads = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean);
  const standard = pads.filter(p => p.mapping === 'standard');
  const s = { held: new Set(), x: 0, y: 0 };
  for (const p of standard.length ? standard : pads) {
    const on = i => p.buttons[i] && p.buttons[i].pressed;
    const ax = p.axes;
    s.x += Math.abs(ax[0] || 0) > 0.2 ? ax[0] : 0;
    s.y += Math.abs(ax[1] || 0) > 0.2 ? ax[1] : 0;
    // by position: right face button clicks (A on Nintendo layouts), bottom
    // right-clicks, left skips, top types a period
    const map = p.mapping === 'standard'
      ? [[1, 'click'], [0, 'right'], [2, 'skip'], [3, 'period'], [9, 'menu'], [8, 'gamemenu'], [12, 'up'], [13, 'down'], [14, 'left'], [15, 'right-d']]
      : [[0, 'click'], [1, 'right'], [4, 'skip'], [3, 'period'], [11, 'menu'], [10, 'gamemenu']];
    for (const [i, b] of map) if (on(i)) s.held.add(b);
  }
  if (standard.length) {
    for (const p of pads.filter(q => q.mapping !== 'standard')) {
      if (Math.abs(p.axes[0] || 0) > 0.5) s.x += Math.sign(p.axes[0]);
      if (Math.abs(p.axes[1] || 0) > 0.5) s.y += Math.sign(p.axes[1]);
    }
  }
  if (s.held.has('up')) s.y -= 1;
  if (s.held.has('down')) s.y += 1;
  if (s.held.has('left')) s.x -= 1;
  if (s.held.has('right-d')) s.x += 1;
  return s;
}

let padSpeed = 0;
function padLoop() {
  padRaf = requestAnimationFrame(padLoop);
  if (document.hidden || !started) return;
  const s = readPads();
  const r = canvas.getBoundingClientRect();
  if (pointer.x < 0) { pointer.x = r.left + r.width / 2; pointer.y = r.top + r.height / 2; }
  const len = Math.min(1, Math.hypot(s.x, s.y));
  if (len > 0) {
    // speeds up while held, so it's both precise and quick across the screen
    padSpeed = Math.min(1, padSpeed + 0.04);
    const v = (3 + 12 * padSpeed) * len * len / Math.max(len, 1e-6);
    pointer.x = Math.max(r.left, Math.min(r.right - 1, pointer.x + s.x * v));
    pointer.y = Math.max(r.top, Math.min(r.bottom - 1, pointer.y + s.y * v));
    mouse('mousemove', pointer.x, pointer.y);
  } else {
    padSpeed = 0;
  }
  for (const b of s.held) {
    if (padHeld.has(b)) continue;
    if (b === 'click' || b === 'right') {
      mouse('mousemove', pointer.x, pointer.y);
      mouse('mousedown', pointer.x, pointer.y, b === 'click' ? 0 : 2);
    }
    if (b === 'skip') press('Escape');
    if (b === 'period') press('.');
    if (b === 'menu') press('F5', { ctrl: true });
    if (b === 'gamemenu') press('F5');
  }
  for (const b of padHeld) {
    if (s.held.has(b)) continue;
    if (b === 'click') mouse('mouseup', pointer.x, pointer.y, 0);
    if (b === 'right') mouse('mouseup', pointer.x, pointer.y, 2);
  }
  padHeld = s.held;
}
addEventListener('gamepadconnected', () => { if (!padRaf) padRaf = requestAnimationFrame(padLoop); });

// ---------- screen ----------

// The canvas fills the room under the bar; ScummVM fits the game in it at
// the right shape. SDL keeps the canvas's pixels matched to its size when
// the window says it resized.
function fit() {
  if ($('player').hidden) return;
  const w = innerWidth, h = innerHeight - 60;
  canvas.style.setProperty('width', `${w}px`, 'important');
  canvas.style.setProperty('height', `${h}px`, 'important');
  pointer.x = pointer.y = -1;
  dispatchEvent(new Event('resize'));
}
addEventListener('resize', e => { if (e.isTrusted) fit(); });

// ---------- leaving ----------

// Save, and stop the sound, while the screen is off or another app is
// showing
document.addEventListener('visibilitychange', () => {
  if (!engine) return;
  if (document.hidden) {
    saveAll();
    audio?.suspend();
  } else if (audio && settings.get('sound', true) && !leaving) {
    audio.resume();
  }
});

// The hub's Apps button (or the car's back button) unloads this page. The
// hub asks first, so the game can be saved; it waits up to a second.
addEventListener('message', async e => {
  if (e.source !== parent || e.data?.frunk !== 'close') return;
  await saveAll();
  e.source.postMessage({ frunk: 'closed' }, e.origin);
});
if (parent !== window) parent.postMessage({ frunk: 'save-on-close' }, '*');

$('quitBtn').onclick = async () => {
  await saveAll();
  leave();
};
$('addFiles').onclick = () => ownGames(() => {
  const input = $('fileInput');
  input.value = '';
  input.onchange = () => addFiles([...input.files]);
  input.click();
});
$('fromPhone').onclick = () => ownGames(phone.show);

try {
  const message = sessionStorage.getItem('adventure.message');
  if (message) { status(message); sessionStorage.removeItem('adventure.message'); }
} catch {}
renderFree();
renderMine();
renderContinue();
