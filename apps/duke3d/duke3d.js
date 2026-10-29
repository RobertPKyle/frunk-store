// Duke Nukem 3D: EDuke32 (Duke Nukem 3D's source code with Ken Silverman's
// Build engine, compiled to WebAssembly in engine/ by
// tools/build-duke3d.mjs) with the shareware Episode One, plus the
// player's own copy of the full game. Files are kept in this screen's
// IndexedDB and never leave it; the shareware is kept too once downloaded,
// so it starts without a connection.
//
// The game's own loops run inside main(); with JSPI it waits for this page
// at the end of every frame (Module.webFrame, resolved once per screen
// refresh) and now and then in loops that don't draw. Controllers and the
// on-screen controls are merged here: in the game they go in as one state
// per frame (web_pad, web_look: game functions held, the stick's and the
// right stick's axes, finger look), in menus as arrow, Enter and Escape
// keys (web_key). A keyboard and mouse go to the game directly.
//
// The game's folder (/duke) is in the engine's memory. Its saves and
// settings are copied to IndexedDB when they change; the game in progress
// is saved as "Continue" whenever the page is hidden or left, and
// Continue loads it. The engine can't be restarted within a page, so
// leaving a game reloads it.

import { phonePanel } from '../_shared/phone.js';
import { MAX_DUKE_FILE, dukePath, isZip, unzipAll } from '../_shared/roms.js';

// The shareware as 3D Realms released it: a zip holding DN3DSW13.SHR (a
// self-extracting zip) holding the game's files
const SHAREWARE = { zip: 'shareware/3dduke13SW.zip', size: 5924374, grp: 11035779 };

// The games: base is whose files they use
const GAMES = [
  {
    key: 'shareware', title: 'Duke Nukem 3D: Episode One', base: 'shareware', free: true,
    about: 'L.A. Meltdown: six levels of the 1996 shooter, from Hollywood Holocaust to Launch Facility. The shareware episode, free to share.',
  },
  { key: 'duke', title: 'Duke Nukem 3D', base: 'duke' },
];

// Duke's game functions (source/duke3d/src/function.h), as the bits web_pad
// takes
const FN = { fire: 5, open: 6, jump: 9, duck: 10, item: 31, itemprev: 30, useitem: 29, map: 38, kick: 49, next: 50, prev: 51 };
// SDL scancodes, for menus
const SC = { enter: 40, escape: 41, space: 44, up: 82, down: 81, left: 80, right: 79 };

const $ = id => document.getElementById(id);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('duke3d.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('duke3d.' + key, JSON.stringify(value)); } catch {} },
};
const mb = bytes => `${(bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0)} MB`;

// ---------- storage (IndexedDB) ----------
// files: { id: '<base>/<file>', base, path, size, added, data }
// saves: { key: <game key>, files: [{ name, data }], updated }

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('duke3d', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('files', { keyPath: 'id' });
      req.result.createObjectStore('saves', { keyPath: 'key' });
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

const getFile = id => store('files', 'readonly', s => s.get(id));
const putFile = file => store('files', 'readwrite', s => s.put(file));
const deleteFile = id => store('files', 'readwrite', s => s.delete(id));
const getSaves = key => store('saves', 'readonly', s => s.get(key)).catch(() => null);
const putSaves = record => store('saves', 'readwrite', s => s.put(record));

// The sizes of the stored files, by id, without reading them
async function fileSizes() {
  const out = new Map();
  await store('files', 'readonly', s => {
    const req = s.openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (!c) return;
      out.set(c.value.id, c.value.size);
      c.continue();
    };
    return req;
  }).catch(() => {});
  for (const [id, data] of memoryOnly) out.set(id, data.length);
  return out;
}

// Files that didn't fit in storage, for this visit only
const memoryOnly = new Map();
const readFile = async id => memoryOnly.get(id) || (await getFile(id).catch(() => null))?.data || null;

// ---------- adding files ----------

let lastSkip = '';

// Saves one of the player's files; returns what it is, or null when it
// isn't a Duke Nukem 3D file this uses
async function saveDukeFile(name, bytes) {
  const path = dukePath(name, bytes);
  if (path === 'shareware') { lastSkip = 'the shareware episode, which is already here'; return null; }
  if (!path) return null;
  await putFile({ id: `duke/${path}`, base: 'duke', path, size: bytes.length, added: Date.now(), data: bytes });
  return `${name.replace(/^.*\//, '')}: ${path === 'DUKE.RTS' ? 'Remote Ridicule sounds' : 'Duke Nukem 3D'}`;
}

// A file from the phone or the file picker; a zip may hold several
async function addFile(name, bytes) {
  if (!isZip(bytes)) return saveDukeFile(name, bytes);
  const entries = await unzipAll(bytes, 256 * 1048576).catch(() => null);
  if (!entries) return null;
  const added = [];
  for (const e of entries) {
    const what = await saveDukeFile(e.name, e.bytes);
    if (what) added.push(what.replace(/^.*: /, ''));
  }
  return added.length ? `${name}: ${added.join(', ')}` : null;
}

async function addFiles(files) {
  const msg = $('addMsg');
  msg.textContent = 'Adding…';
  const added = [];
  const skipped = [];
  for (const file of files) {
    lastSkip = '';
    try {
      const what = file.size <= MAX_DUKE_FILE * 4 && await addFile(file.name, new Uint8Array(await file.arrayBuffer()));
      if (what) added.push(what); else skipped.push(lastSkip ? `${file.name} (${lastSkip})` : file.name);
    } catch { skipped.push(file.name); }
  }
  msg.textContent = (added.length ? `Added ${added.join('; ')}.` : 'No Duke Nukem 3D files found there.') +
    (skipped.length ? ` Skipped: ${skipped.join(', ')}.` : '');
  renderMine();
  renderContinue();
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
  app: 'duke3d',
  save: (name, bytes) => { lastSkip = ''; return addFile(name, bytes); },
  onSaved: () => { renderMine(); renderContinue(); },
  notPlayable: () => lastSkip || 'not a Duke Nukem 3D file this uses',
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

const has = (sizes, game) => sizes.has(`${game.base}/DUKE3D.GRP`);

async function renderFree() {
  const sizes = await fileSizes();
  const g = GAMES[0];
  $('free').replaceChildren(card(`${g.title}: New game`, [
    ['small', `3D Realms · shareware · ${has(sizes, g) ? 'ready to play' : `${mb(SHAREWARE.size)} download the first time`}`],
    ['p', g.about],
  ], b => play(g, b, false)));
}

async function renderMine() {
  const sizes = await fileSizes();
  const g = GAMES[1];
  const mine = [...sizes.keys()].filter(id => id.startsWith('duke/'));
  if (!has(sizes, g)) {
    $('mine').replaceChildren(...(mine.length ? [Object.assign(document.createElement('p'), { className: 'note', textContent: 'Add DUKE3D.GRP too: DUKE.RTS goes with it.' })] : []));
    return;
  }
  const wrap = document.createElement('div');
  wrap.className = 'wrap';
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'del';
  del.textContent = 'Remove';
  del.setAttribute('aria-label', `Remove ${g.title}`);
  del.onclick = () => confirmTap(del, async () => {
    for (const id of mine) await deleteFile(id).catch(() => {});
    renderMine();
    renderContinue();
  });
  const size = mine.reduce((n, id) => n + sizes.get(id), 0);
  wrap.append(card(`${g.title}: New game`, [['small', `${mb(size)} · on this screen only`]], b => play(g, b, false)), del);
  $('mine').replaceChildren(wrap);
}

// The last game played, to pick up from its Continue save
async function renderContinue() {
  const btn = $('continue');
  btn.hidden = true;
  const last = GAMES.find(g => g.key === settings.get('last', null));
  if (!last) return;
  const [sizes, saves] = await Promise.all([fileSizes(), getSaves(last.key)]);
  if (!has(sizes, last) && !last.free) return;
  if (!saves?.files?.some(f => f.name === 'continue.esv')) return;
  btn.textContent = `Continue ${last.free ? 'Episode One' : last.title}`;
  btn.onclick = () => play(last, btn, true);
  btn.hidden = false;
}

// ---------- loading ----------

function loading(title, text, part) {
  $('loading').hidden = false;
  $('loadTitle').textContent = title;
  $('loadText').textContent = text;
  $('loadBar').style.width = `${Math.round(100 * part)}%`;
}

// Downloads the shareware zip with progress, takes the game's files out of
// it and keeps them for next time
async function downloadFree(game) {
  if (await readFile('shareware/DUKE3D.GRP')) return;
  const res = await fetch(SHAREWARE.zip);
  if (!res.ok || !res.body) throw new Error(`download failed (${res.status})`);
  const reader = res.body.getReader();
  const chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    loading(game.title, `Downloading ${mb(got)} of ${mb(SHAREWARE.size)}…`, 0.85 * got / SHAREWARE.size);
  }
  loading(game.title, 'Unpacking…', 0.88);
  const zip = new Uint8Array(await new Blob(chunks).arrayBuffer());
  const shr = (await unzipAll(zip, 64 * 1048576))?.find(e => /DN3DSW13\.SHR$/i.test(e.name));
  const files = shr && await unzipAll(shr.bytes, 64 * 1048576);
  const pick = name => files?.find(e => e.name.toUpperCase() === name)?.bytes;
  const grp = pick('DUKE3D.GRP'), rts = pick('DUKE.RTS');
  if (!grp || grp.length !== SHAREWARE.grp || !rts) throw new Error('the download was damaged');
  navigator.storage?.persist?.().catch(() => {});
  for (const [path, data] of [['DUKE3D.GRP', grp], ['DUKE.RTS', rts]]) {
    await putFile({ id: `shareware/${path}`, base: 'shareware', path, size: data.length, added: Date.now(), data })
      .catch(() => { memoryOnly.set(`shareware/${path}`, data); });   // full storage: play anyway, download again next time
  }
}

// ---------- engine ----------

let duke = null;          // the running engine (Emscripten module)
let current = null;       // the game it's playing
let audio = null;         // its AudioContext
let raf = 0, frames = 0, fpsSince = 0;
let saved = new Map();    // file name -> mtime, as last copied to IndexedDB
let frameWaiting = null;  // resolves the game's wait for the next frame

const KEEP = /\.esv$|^eduke32(_settings)?\.cfg$|^grpfiles\.cache$/i;

function exists(path) {
  try { duke.FS.stat(path); return true; } catch { return false; }
}

// Copies the game folder's saves and settings to IndexedDB when any of
// them changed
let persisting = Promise.resolve();
function persist() {
  persisting = persisting.then(async () => {
    if (!duke) return;
    let names;
    try { names = duke.FS.readdir('/duke').filter(n => KEEP.test(n)); } catch { return; }
    const stamps = new Map(names.map(n => [n, +duke.FS.stat(`/duke/${n}`).mtime]));
    if (stamps.size === saved.size && [...stamps].every(([n, t]) => saved.get(n) === t)) return;
    const files = names.map(name => ({ name, data: duke.FS.readFile(`/duke/${name}`) }));
    await putSaves({ key: current.key, files, updated: Date.now() }).catch(() => {});
    saved = stamps;
  });
  return persisting;
}

// Saves the game in progress and the settings, and keeps them
async function saveAll() {
  if (!duke) return;
  try { duke._web_autosave(); } catch {}
  try { duke._web_save_config(); } catch {}
  await persist();
}

// Back to the library: the engine can't restart, so the page reloads
async function leave() {
  cancelAnimationFrame(raf);
  await persist();
  location.reload();
}

function failed(message) {
  cancelAnimationFrame(raf);
  audio?.suspend();
  $('failedText').textContent = message || 'Something went wrong.';
  $('failed').hidden = false;
  $('loading').hidden = true;
  persist();
}
$('failedOk').onclick = () => location.reload();

// The size the game draws at: square pixels filling the space under the
// bar, at half the screen's size (or full size with Sharp graphics),
// within what the engine allows
function gameSize() {
  const W = innerWidth, H = innerHeight - 60;
  const sharp = settings.get('sharp', false);
  const scale = sharp ? Math.max(1, Math.floor(H / 720) + 1) : Math.max(1, Math.round(H / 270));
  let h = Math.max(200, Math.min(sharp ? 720 : 400, Math.floor(H / scale)));
  let w = Math.round(h * Math.max(4 / 3, Math.min(W / H, 2.4)));
  return { w: Math.max(320, w & ~3), h: h & ~1 };
}

// The settings file with this page's choices: the window, the parental
// lock and the console's settings
function config(text, { w, h }) {
  const set = (section, key, value) => {
    const line = `${key} = ${value}`;
    const re = new RegExp(`^${key} = .*$`, 'm');
    if (re.test(text)) { text = text.replace(re, line); return; }
    if (!text.includes(`[${section}]`)) text += `\n[${section}]\n`;
    text = text.replace(`[${section}]\n`, `[${section}]\n${line}\n`);
  };
  set('Screen Setup', 'ScreenWidth', w);
  set('Screen Setup', 'ScreenHeight', h);
  set('Screen Setup', 'ScreenBPP', 8);
  set('Screen Setup', 'ScreenMode', 0);
  set('Screen Setup', 'Out', settings.get('lock', false) ? 1 : 0);
  set('Setup', 'ForceSetup', 0);
  return text;
}

// Run at every start: always run, and fingers and the mouse look up and
// down (the page's look comes in as the mouse)
const AUTOEXEC = 'cl_autorun 1\nin_mousemode 1\n';

async function boot(game, resume) {
  loading(game.title, 'Starting…', 0.95);
  const { default: createDuke } = await import('./engine/eduke32.js');
  const log = [];
  const keep = line => { log.push(line); if (log.length > 60) log.shift(); };
  const module = await createDuke({
    canvas: $('canvas'),
    SDL2: audio ? { audioContext: audio } : {},
    print: keep,
    printErr: keep,
    webFrame: () => new Promise(resolve => { frameWaiting = resolve; }),
    onQuit: () => leave(),
    onMessage: (title, text) => failed(`${title}: ${text}`),
  });
  duke = module;
  current = game;
  const FS = module.FS;
  FS.mkdir('/duke');
  // The game's files, from IndexedDB (each written once, owned by the file
  // system so they aren't copied)
  for (const path of ['DUKE3D.GRP', 'DUKE.RTS']) {
    const data = await readFile(`${game.base}/${path}`);
    if (data) FS.writeFile(`/duke/${path}`, data, { canOwn: true });
    else if (path === 'DUKE3D.GRP') throw new Error('a game file is missing; add it again');
  }
  const saves = await getSaves(game.key);
  for (const f of saves?.files || []) FS.writeFile(`/duke/${f.name}`, f.data);
  const size = gameSize();
  const cfg = exists('/duke/eduke32.cfg') ? new TextDecoder().decode(FS.readFile('/duke/eduke32.cfg')) : '';
  FS.writeFile('/duke/eduke32.cfg', config(cfg, size));
  FS.writeFile('/duke/autoexec.cfg', AUTOEXEC);
  saved = new Map((saves?.files || []).map(f => [f.name, +FS.stat(`/duke/${f.name}`).mtime]));
  FS.chdir('/duke');
  if (resume && exists('/duke/continue.esv')) module._web_load_at_start();

  $('title').textContent = game.title;
  $('library').hidden = true;
  $('player').hidden = false;
  $('loading').hidden = true;
  $('player').classList.toggle('mouse', !touchFirst);
  showSound();
  fit(size);
  addEventListener('resize', () => fit(size));
  frames = 0;
  fpsSince = performance.now();
  raf = requestAnimationFrame(loop);
  setInterval(() => { if (!document.hidden) persist(); }, 10000);   // saves made from the game's menu
  // The game runs until it's quit; with JSPI, main returns a promise
  Promise.resolve(module.callMain(['-usecwd', '-nosetup'])).catch(e => {
    if (e === 'unwind' || e?.name === 'ExitStatus') return;
    failed(`The game stopped: ${e?.message || e}. ${log.slice(-3).join(' ')}`);
  });
}

let starting = false;

async function play(game, btn, resume) {
  if (starting || duke) return;
  starting = true;
  btn?.classList.add('busy');
  // Made inside the tap, so the browser lets it play
  try { audio = new AudioContext(); } catch { audio = null; }
  if (audio && !settings.get('sound', true)) audio.suspend();
  try {
    loading(game.title, 'Loading…', 0);
    if (game.free) await downloadFree(game);
    settings.set('last', game.key);
    await boot(game, resume);
  } catch (e) {
    // The engine is up and can't start again within this page, so the
    // library's buttons would do nothing: back to it by reloading
    if (duke) { failed(`Couldn't start ${game.title}: ${e && e.message ? e.message : 'something went wrong'}.`); return; }
    $('loading').hidden = true;
    $('player').hidden = true;
    $('library').hidden = false;
    status(`Couldn't start ${game.title}: ${e && e.message ? e.message : 'check the connection and try again'}.`);
    audio?.close().catch(() => {});
    audio = null;
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
  $('soundBtn').textContent = settings.get('sound', true) ? 'Sound on' : 'Sound off';
}
$('soundBtn').onclick = () => {
  const on = !settings.get('sound', true);
  settings.set('sound', on);
  showSound();
  if (audio) on ? audio.resume() : audio.suspend();
};

// ---------- input ----------

const touchFirst = !matchMedia('(hover: hover) and (pointer: fine)').matches;
const touch = new Map();          // pointerId -> { stick: true, x, y } or { b, x, y } or { look: true, x, y }
// A quick tap can start and end between two of the game's frames; keep
// each press down for a few frames so the game always sees it.
const sticky = new Map();         // button -> frames left
const press = (b, n = 4) => sticky.set(b, n);

// Pads with a right stick that has been used: their left stick steps
// sideways, as on twin-stick games. Others (D-pad controllers, and sticks
// reported as a D-pad) turn with left and right.
const twinStick = new Set();

const dead = v => Math.abs(v) < 0.2 ? 0 : v;

// The car adds a "Tesla Virtual Gamepad" (standard layout) for a controller
// it recognises, next to the controller's own raw device, and both report
// every press under different numbers. So when any standard pad is present,
// buttons come only from standard pads; raw pads add only D-pad directions
// from their axes. Without a standard pad, raw pads are read with the usual
// raw layout (A 0, B 1, X 3, Y 4, L 6, R 7, Select 10, Start 11).
function readPads(s) {
  const pads = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean);
  const standard = pads.filter(p => p.mapping === 'standard');
  const raw = pads.filter(p => p.mapping !== 'standard');
  for (const p of standard.length ? standard : raw) readPad(p, s);
  if (standard.length) for (const p of raw) padDirs(p, s);
}

function padDirs(p, s) {
  const ax = p.axes;
  if (ax[1] < -0.5) s.dirs.add('up');
  if (ax[1] > 0.5) s.dirs.add('down');
  if (ax[0] < -0.5) s.dirs.add('left');
  if (ax[0] > 0.5) s.dirs.add('right');
}

// Buttons by position: a is the right face button (A on Nintendo layouts),
// b the bottom one, x the left, y the top
function readPad(p, s) {
  const on = i => p.buttons[i] && p.buttons[i].pressed;
  const ax = p.axes;
  if (p.mapping !== 'standard') {
    padDirs(p, s);
    for (const [i, b] of [[0, 'a'], [1, 'b'], [3, 'x'], [4, 'y'], [6, 'l'], [7, 'r'], [10, 'select'], [11, 'start']]) if (on(i)) s.held.add(b);
    return;
  }
  if (Math.abs(ax[2] || 0) > 0.5 || Math.abs(ax[3] || 0) > 0.5) twinStick.add(p.index);
  const lx = dead(ax[0] || 0), ly = dead(ax[1] || 0);
  s.forward -= ly;
  if (twinStick.has(p.index)) {
    s.side += lx;
    s.turn += dead(ax[2] || 0);
    s.pitch += dead(ax[3] || 0);
  } else {
    s.turn += lx;
  }
  if (ly < -0.5) s.stick.add('up');
  if (ly > 0.5) s.stick.add('down');
  if (lx < -0.5) s.stick.add('left');
  if (lx > 0.5) s.stick.add('right');
  if (on(12)) s.dirs.add('up');
  if (on(13)) s.dirs.add('down');
  if (on(14)) s.dirs.add('left');
  if (on(15)) s.dirs.add('right');
  for (const [i, b] of [[1, 'a'], [0, 'b'], [2, 'x'], [3, 'y'], [4, 'l'], [5, 'r'], [6, 'lt'], [7, 'rt'], [8, 'select'], [9, 'start']]) if (on(i)) s.held.add(b);
}

// While a controller is in use, the on-screen controls are hidden;
// touching the screen brings them back
let padMode = false;
function setPadMode(on) {
  if (on === padMode) return;
  padMode = on;
  $('player').classList.toggle('pad', on);
}

// Menus: keys go down when a direction or button is first held and repeat
// while it stays held, as a keyboard would
const menuHeld = new Map();       // key name -> time of the next repeat
function menuKeys(names, t) {
  for (const k of names) {
    if (!menuHeld.has(k)) {
      duke._web_key(SC[k], 1);
      menuHeld.set(k, t + 400);
    } else if (t >= menuHeld.get(k) && ['up', 'down', 'left', 'right'].includes(k)) {
      duke._web_key(SC[k], 1);
      menuHeld.set(k, t + 110);
    }
  }
  for (const k of menuHeld.keys()) {
    if (names.has(k)) continue;
    duke._web_key(SC[k], 0);
    menuHeld.delete(k);
  }
}

// A key pressed and let go a few frames later: the game looks at which
// keys are down once a frame, so one let go at once would be missed
const tapped = new Map();         // key name -> frames until it's let go
function tapKey(name) {
  duke._web_key(SC[name], 1);
  tapped.set(name, 4);
}
function releaseTapped() {
  for (const [name, left] of tapped) {
    if (left > 1) { tapped.set(name, left - 1); continue; }
    duke._web_key(SC[name], 0);
    tapped.delete(name);
  }
}

const clamp = v => Math.max(-1, Math.min(1, v));
const fixed = v => Math.round(clamp(v) * 65536);
let mode = '';
let gameStart = false;
let lastMode = '', swallow = new Set();
// Select is a modifier: held with another button it picks that button's
// second job; let go on its own it shows the map
let selectDown = false, selectUsed = false;
// mouse units of turn per CSS pixel a finger moves (about 0.3 degrees),
// and of looking up and down
const LOOK_X = 55, LOOK_Y = 40;

function loop(t) {
  raf = requestAnimationFrame(loop);
  if (document.hidden) return;
  const state = duke._web_state();
  const now = state & 1 ? 'menu' : state & 2 ? 'game' : 'title';
  if (now !== mode) {
    mode = now;
    const p = $('player');
    p.classList.toggle('menu', mode === 'menu');
    p.classList.toggle('title', mode === 'title');
    p.dataset.mode = mode;
    hint(mode === 'title' ? 'Tap the game to go on' : '');
  }
  const deadNow = mode === 'game' && (state & 64) !== 0;
  if (deadNow !== ($('player').dataset.dead === '1')) {
    $('player').dataset.dead = deadNow ? '1' : '';
    if (deadNow) hint('Press OPEN to start again', 6000);
  }

  const s = { held: new Set(), dirs: new Set(), stick: new Set(), forward: 0, side: 0, turn: 0, pitch: 0 };
  readPads(s);
  // A button that switched between the game and a menu (Start opens the
  // menu, A picks New Game) does nothing more until it's let go
  if (now !== lastMode) {
    lastMode = now;
    swallow = new Set([...s.held, ...s.dirs]);
  }
  for (const b of swallow) {
    if (s.held.has(b) || s.dirs.has(b)) { s.held.delete(b); s.dirs.delete(b); } else swallow.delete(b);
  }
  if (s.held.size || s.dirs.size || s.forward || s.turn || s.side || s.pitch) setPadMode(true);
  for (const [b, left] of sticky) {
    s.held.add(b);
    if (left <= 1) sticky.delete(b); else sticky.set(b, left - 1);
  }
  for (const p of touch.values()) {
    if (p.b) s.held.add(p.b);
    else if (p.stick) {
      s.forward -= dead(p.y);
      s.side += dead(p.x);
    }
  }

  if (mode !== 'game') {
    const keys = new Set();
    for (const d of [...s.dirs, ...s.stick]) keys.add(d);
    if (mode === 'menu') {
      if (s.held.has('a') || s.held.has('enter')) keys.add('enter');
      if (s.held.has('b') || s.held.has('start') || s.held.has('escape')) keys.add('escape');
      for (const k of ['up', 'down', 'left', 'right']) if (s.held.has(k)) keys.add(k);
    } else if (s.held.has('a') || s.held.has('b') || s.held.has('start') || s.held.has('tap')) {
      keys.add('enter');
    }
    menuKeys(keys, t);
    duke._web_pad(0, 0, 0, 0, 0, 0);
    selectDown = selectUsed = false;
  } else {
    menuKeys(new Set(), t);
    const fns = new Set();
    const select = s.held.has('select');
    if (select) {
      // Select + a button: its second job
      if (s.held.has('b')) fns.add('duck');
      if (s.held.has('a')) fns.add('kick');
      if (s.held.has('x')) fns.add('useitem');
      if (s.held.has('y')) fns.add('prev');
      if (s.held.has('l')) fns.add('itemprev');
      if (s.held.has('r')) fns.add('item');
      if (['a', 'b', 'x', 'y', 'l', 'r'].some(b => s.held.has(b))) selectUsed = true;
    } else {
      if (s.dirs.has('up')) s.forward += 1;
      if (s.dirs.has('down')) s.forward -= 1;
      if (s.dirs.has('left')) s.turn -= 1;
      if (s.dirs.has('right')) s.turn += 1;
      if (s.held.has('l')) s.side -= 1;
      if (s.held.has('r')) s.side += 1;
      if (s.held.has('a') || s.held.has('rt')) fns.add('fire');
      if (s.held.has('b')) fns.add('jump');
      if (s.held.has('x')) fns.add('open');
      if (s.held.has('y')) fns.add('next');
      if (s.held.has('lt')) fns.add('duck');
    }
    if (selectDown && !select && !selectUsed) press('map', 3);
    if (!select) selectUsed = false;
    selectDown = select;
    for (const b of ['fire', 'open', 'jump', 'duck', 'kick', 'next', 'prev', 'item', 'useitem', 'map']) if (s.held.has(b)) fns.add(b);
    let lo = 0, hi = 0;
    for (const f of fns) {
      const n = FN[f];
      if (n < 32) lo |= 1 << n; else hi |= 1 << (n - 32);
    }
    duke._web_pad(lo >>> 0, hi >>> 0, fixed(s.forward), fixed(s.side), fixed(s.turn), fixed(s.pitch));
    // Start opens the menu
    const start = s.held.has('start');
    if (start && !gameStart) tapKey('escape');
    gameStart = start;
  }
  showTouch(s.held);
  releaseTapped();

  // The game's frame goes now, with this input
  const resolve = frameWaiting;
  frameWaiting = null;
  resolve?.();

  if (t - fpsSince >= 1000) {
    const n = duke._web_frames();
    $('fps').textContent = `${Math.round((n - frames) * 1000 / (t - fpsSince))} fps`;
    frames = n;
    fpsSince = t;
  }
}

// Lights the on-screen buttons that are held; touches the page only when
// that changes
const touchButtons = [...document.querySelectorAll('#touch [data-b], #touch [data-k]')];
let shownTouch = '';
function showTouch(set) {
  const key = [...set].sort().join() + (touch.size ? 's' : '');
  if (key === shownTouch) return;
  shownTouch = key;
  for (const el of touchButtons) el.classList.toggle('on', set.has(el.dataset.b || el.dataset.k));
  $('stick').classList.toggle('on', [...touch.values()].some(p => p.stick));
}

const STICK_RANGE = 50;   // px from the centre for full speed
function stickAt(p, e) {
  const r = $('stick').getBoundingClientRect();
  const x = (e.clientX - (r.left + r.width / 2)) / STICK_RANGE, y = (e.clientY - (r.top + r.height / 2)) / STICK_RANGE;
  const len = Math.hypot(x, y);
  p.x = len > 1 ? x / len : x;
  p.y = len > 1 ? y / len : y;
  const knob = $('stick').firstElementChild;
  knob.style.transform = `translate(${p.x * 40}px, ${p.y * 40}px)`;
}

// A finger that moves turns and looks: FIRE's while it's held, or one
// anywhere else on the game
function look(p, e) {
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX;
  p.y = e.clientY;
  if (duke && mode === 'game') duke._web_look(Math.round(dx * LOOK_X), Math.round(dy * LOOK_Y));
}

function onPointer(e) {
  if (e.type === 'pointerdown' && e.pointerType === 'touch') {
    setPadMode(false);
    $('player').classList.remove('mouse');
  }
  if (e.type === 'pointerdown') {
    const b = e.target.closest('#touch [data-b], #touch [data-k]');
    if (e.target.closest('#stick')) {
      const p = { stick: true, x: 0, y: 0 };
      stickAt(p, e);
      touch.set(e.pointerId, p);
    } else if (b) {
      const name = b.dataset.b || b.dataset.k;
      touch.set(e.pointerId, { b: name, x: e.clientX, y: e.clientY });
      press(name);
    } else if (e.target.closest('#touch')) {
      // between levels and on title screens a tap goes on
      if (mode === 'title') press('tap');
      touch.set(e.pointerId, { look: true, x: e.clientX, y: e.clientY });
    } else return;
    e.preventDefault();
    try { e.target.setPointerCapture(e.pointerId); } catch {}
  } else if (e.type === 'pointermove') {
    const p = touch.get(e.pointerId);
    if (p?.stick) stickAt(p, e);
    else if (p?.look || p?.b === 'fire') look(p, e);
  } else if (touch.has(e.pointerId)) {
    if (touch.get(e.pointerId).stick) $('stick').firstElementChild.style.transform = '';
    touch.delete(e.pointerId);
  }
}
for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) $('player').addEventListener(type, onPointer);
// Touches on the game make no mouse events: the game's menus take mouse
// clicks (SDL listens for them on the whole page), so a tap on OK would
// also click wherever the mouse last was
$('touch').addEventListener('touchstart', e => e.preventDefault(), { passive: false });

$('menuBtn').onclick = () => {
  if (!duke) return;
  tapKey('escape');
};

let hintTimer = 0;
function hint(text, ms = 4000) {
  clearTimeout(hintTimer);
  $('hint').textContent = text;
  $('hint').hidden = !text;
  if (text) hintTimer = setTimeout(() => { $('hint').hidden = true; }, ms);
}

// ---------- screen ----------

// The game is as big as fits under the bar, at its own shape. The
// on-screen controls sit inside its lower corners, just above the game's
// health and ammo counters.
function fit({ w: gw, h: gh }) {
  if ($('player').hidden) return;
  const W = innerWidth, H = innerHeight - 60;
  const k = Math.min(W / gw, H / gh);
  const w = Math.floor(gw * k), h = Math.floor(gh * k);
  const c = $('canvas');
  c.style.setProperty('width', `${w}px`, 'important');
  c.style.setProperty('height', `${h}px`, 'important');
  const screen = document.querySelector('.screen').style;
  screen.setProperty('--above-hud', `${Math.round((H - h) / 2 + h * 0.13 + 6)}px`);
  screen.setProperty('--inset', `${Math.round((W - w) / 2 + 10)}px`);
}

// ---------- settings ----------

function showToggle(btn, key) {
  const on = settings.get(key, false);
  $(btn).classList.toggle('on', on);
  $(btn).setAttribute('aria-pressed', String(on));
}
for (const [btn, key] of [['sharpBtn', 'sharp'], ['lockBtn', 'lock']]) {
  $(btn).onclick = () => {
    settings.set(key, !settings.get(key, false));
    showToggle(btn, key);
  };
  showToggle(btn, key);
}

// ---------- leaving ----------

// Save, and stop the sound, while the screen is off or another app is
// showing (the game itself stops with the page's refreshes)
document.addEventListener('visibilitychange', () => {
  if (!duke) return;
  if (document.hidden) {
    audio?.suspend();
    saveAll();
  } else if (audio && settings.get('sound', true)) {
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

renderFree();
renderMine();
renderContinue();
