// LibreQuake: Quake's engine (Chocolate Quake 2.1.0, a faithful port of
// Quake 1.09 and its software renderer, compiled to WebAssembly in engine/
// by tools/build-quake.mjs) with the free LibreQuake, plus the player's own
// Quake files. Files are kept in this screen's IndexedDB and never leave
// it; the free ones are kept too once downloaded, so they start without a
// connection.
//
// Quake runs on this page's main thread, one frame per screen refresh, and
// draws to #canvas through SDL. Controllers and the on-screen controls are
// merged here: in the game they go to Quake as one state per frame
// (web_pad, web_look, in tools/quake/chocolate-web.patch), in menus as
// arrow, Enter and Escape keys (web_key). A keyboard and mouse go to Quake
// directly.
//
// The game's folder (/quake/id1, or the mission pack's) is in the engine's
// memory. Its saves and config.cfg are copied to IndexedDB when they
// change; the game in progress is saved as "auto" whenever the page is
// hidden or left, and Continue loads it. Music is played by this page from
// the trackNN.ogg files; Quake says which track.
//
// The engine can't be restarted within a page, so leaving a game reloads it.

import { phonePanel } from '../_shared/phone.js';
import { MAX_QUAKE_FILE, isZip, quakePath, unzipAll } from '../_shared/roms.js';

const LIBREQUAKE = '0.09-beta';
const FREE_PAKS = [['id1/pak0.pak', 43948916, 23124584], ['id1/pak1.pak', 5856792, 2698332]];
const download = FREE_PAKS.reduce((n, p) => n + p[2], 0);

// The games: base is whose files they use; dir is the folder Quake saves in
const GAMES = [
  {
    key: 'librequake', title: 'LibreQuake', base: 'librequake', dir: 'id1', needs: FREE_PAKS.map(p => p[0]), args: [], free: true,
    about: 'A free game for the Quake engine: dark bases, castles and crypts, with a full set of new monsters, weapons and music.',
  },
  { key: 'quake', title: 'Quake', base: 'quake', dir: 'id1', needs: ['id1/pak0.pak'], args: [] },
  { key: 'hipnotic', title: 'Scourge of Armagon', base: 'quake', dir: 'hipnotic', needs: ['id1/pak0.pak', 'hipnotic/pak0.pak'], args: ['-hipnotic'] },
  { key: 'rogue', title: 'Dissolution of Eternity', base: 'quake', dir: 'rogue', needs: ['id1/pak0.pak', 'rogue/pak0.pak'], args: ['-rogue'] },
];

// Settings for a first start, as the game's config.cfg (the game's own
// default.cfg runs first): always run, look with the mouse, the usual
// screen size, music on.
const DEFAULTS = `cl_forwardspeed 400
cl_backspeed 400
viewsize 100
bgmvolume 1
volume 0.7
lookspring 0
`;

// Quake's key numbers, for menus
const K = { enter: 13, escape: 27, tab: 9, up: 128, down: 129, left: 130, right: 131 };
// web_pad's buttons
const BIT = { fire: 1, jump: 2, next: 4, prev: 8 };

const $ = id => document.getElementById(id);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('quake.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('quake.' + key, JSON.stringify(value)); } catch {} },
};
const mb = bytes => `${(bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0)} MB`;

// ---------- storage (IndexedDB) ----------
// files: { id: '<base>/<path>', base, path, size, added, data }
// saves: { key: <game key>, files: [{ name, data }], updated }

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('quake', 1);
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

const fileIds = () => store('files', 'readonly', s => s.getAllKeys()).catch(() => []);
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
  return out;
}

// ---------- adding files ----------

// Saves one of the player's files where it goes; returns what it is, or
// null when it isn't a Quake file this knows
async function saveQuakeFile(name, bytes) {
  const path = quakePath(name, bytes);
  if (!path) return null;
  await putFile({ id: `quake/${path}`, base: 'quake', path, size: bytes.length, added: Date.now(), data: bytes });
  return `${name.replace(/^.*\//, '')}: ${describe(path)}`;
}

function describe(path) {
  if (path === 'id1/pak0.pak') return 'Quake (episode 1)';
  if (path === 'id1/pak1.pak') return 'Quake (episodes 2 to 4)';
  if (path === 'hipnotic/pak0.pak') return 'Scourge of Armagon';
  if (path === 'rogue/pak0.pak') return 'Dissolution of Eternity';
  return `music ${path.slice(6)}`;
}

// A file from the phone or the file picker; a zip may hold several
async function addFile(name, bytes) {
  if (!isZip(bytes)) return saveQuakeFile(name, bytes);
  const entries = await unzipAll(bytes, 256 * 1048576).catch(() => null);
  if (!entries) return null;
  const added = [];
  for (const e of entries) {
    const what = await saveQuakeFile(e.name, e.bytes);
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
    try {
      const what = file.size <= MAX_QUAKE_FILE * 4 && await addFile(file.name, new Uint8Array(await file.arrayBuffer()));
      if (what) added.push(what); else skipped.push(file.name);
    } catch { skipped.push(file.name); }
  }
  msg.textContent = (added.length ? `Added ${added.join('; ')}.` : 'No Quake files found there.') +
    (skipped.length ? ` Skipped: ${skipped.join(', ')}.` : '');
  renderMine();
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
  app: 'quake',
  save: addFile,
  onSaved: renderMine,
  notPlayable: () => 'not a Quake file this knows',
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

const has = (sizes, game) => game.needs.every(p => sizes.has(`${game.base}/${p}`));
// Quake with only the first pak is the shareware episode
const titleOf = (game, sizes) => (game.key === 'quake' && !sizes.has('quake/id1/pak1.pak') ? 'Quake (shareware)' : game.title);

async function renderFree() {
  const sizes = await fileSizes();
  const g = GAMES[0];
  $('free').replaceChildren(card(`${g.title}: New game`, [
    ['small', `LibreQuake project · BSD license · ${has(sizes, g) ? 'ready to play' : `${mb(download)} download the first time`}`],
    ['p', g.about],
  ], b => play(g, b, false)));
}

async function renderMine() {
  const sizes = await fileSizes();
  const games = GAMES.filter(g => !g.free && has(sizes, g));
  const cards = games.map(g => {
    const wrap = document.createElement('div');
    wrap.className = 'wrap';
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del';
    del.textContent = 'Remove';
    const title = titleOf(g, sizes);
    del.setAttribute('aria-label', `Remove ${title}`);
    // Quake takes its mission packs and music with it
    const mine = [...sizes.keys()].filter(id => g.key === 'quake' ? id.startsWith('quake/') : id === `quake/${g.dir}/pak0.pak`);
    del.onclick = () => confirmTap(del, async () => {
      for (const id of mine) await deleteFile(id).catch(() => {});
      renderMine();
      renderContinue();
    });
    const size = mine.reduce((n, id) => n + sizes.get(id), 0);
    wrap.append(card(`${title}: New game`, [['small', `${mb(size)} · on this screen only`]], b => play(g, b, false)), del);
    return wrap;
  });
  // A mission pack or music without the game itself
  const loose = [...sizes.keys()].filter(id => id.startsWith('quake/')).length && !has(sizes, GAMES[1]);
  if (loose) {
    const p = Object.assign(document.createElement('p'), { className: 'note', textContent: 'Add PAK0.PAK from Quake\'s id1 folder too: the mission packs and music need it.' });
    cards.push(p);
  }
  $('mine').replaceChildren(...cards);
}

// The last game played, to pick up from its autosave
async function renderContinue() {
  const btn = $('continue');
  btn.hidden = true;
  const last = GAMES.find(g => g.key === settings.get('last', null));
  if (!last) return;
  const [sizes, saves] = await Promise.all([fileSizes(), getSaves(last.key)]);
  if (!has(sizes, last) && !last.free) return;
  if (!saves?.files?.some(f => f.name === 'auto.sav')) return;
  btn.textContent = `Continue ${titleOf(last, sizes)}`;
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

// Downloads LibreQuake's paks, gzipped, with progress; keeps them for next
// time
async function downloadFree(game) {
  let got = 0;
  for (const [path, size] of FREE_PAKS) {
    if (await getFile(`librequake/${path}`).catch(() => null)) { got += FREE_PAKS.find(p => p[0] === path)[2]; continue; }
    const res = await fetch(`librequake/${path.slice(4)}.gz`);
    if (!res.ok || !res.body) throw new Error(`download failed (${res.status})`);
    const reader = res.body.getReader();
    const chunks = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      loading(game.title, `Downloading ${mb(got)} of ${mb(download)}…`, 0.9 * got / download);
    }
    loading(game.title, 'Unpacking…', 0.9 * got / download);
    const data = new Uint8Array(await new Response(new Blob(chunks).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    if (data.length !== size) throw new Error('the download was damaged');
    navigator.storage?.persist?.().catch(() => {});
    await putFile({ id: `librequake/${path}`, base: 'librequake', path, size, added: Date.now(), data })
      .catch(() => { memoryOnly.set(`librequake/${path}`, data); });   // full storage: play anyway, download again next time
  }
}
const memoryOnly = new Map();

// ---------- engine ----------

let quake = null;         // the running engine (Emscripten module)
let current = null;       // the game it's playing
let audio = null;         // its AudioContext
let raf = 0, frames = 0, fpsSince = 0;
let saved = new Map();    // save file name -> mtime, as last copied to IndexedDB

function exists(path) {
  try { quake.FS.stat(path); return true; } catch { return false; }
}

// Copies the game folder's saves and config.cfg to IndexedDB when any of
// them changed
let persisting = Promise.resolve();
function persist() {
  persisting = persisting.then(async () => {
    if (!quake) return;
    const dir = `/quake/${current.dir}`;
    let names;
    try { names = quake.FS.readdir(dir).filter(n => /\.sav$|^config\.cfg$/i.test(n)); } catch { return; }
    const stamps = new Map(names.map(n => [n, +quake.FS.stat(`${dir}/${n}`).mtime]));
    if (stamps.size === saved.size && [...stamps].every(([n, t]) => saved.get(n) === t)) return;
    const files = names.map(name => ({ name, data: quake.FS.readFile(`${dir}/${name}`) }));
    await putSaves({ key: current.key, files, updated: Date.now() }).catch(() => {});
    saved = stamps;
  });
  return persisting;
}

// Saves the game in progress and the settings, and keeps them
async function saveAll() {
  if (!quake) return;
  try { quake._web_autosave(); } catch {}
  try { quake._web_save_config(); } catch {}
  await persist();
}

// Back to the library: the engine can't restart, so the page reloads
async function leave() {
  cancelAnimationFrame(raf);
  music.pause();
  await persist();
  location.reload();
}

function failed(message) {
  cancelAnimationFrame(raf);
  music.pause();
  $('failedText').textContent = message || 'Something went wrong.';
  $('failed').hidden = false;
  $('loading').hidden = true;
  persist();
}
$('failedOk').onclick = () => location.reload();

async function boot(game, resume) {
  loading(game.title, 'Starting…', 0.95);
  const { default: createQuake } = await import('./engine/chocolate-quake.js');
  const log = [];
  const module = await createQuake({
    canvas: $('canvas'),
    SDL2: audio ? { audioContext: audio } : {},
    print: line => { log.push(line); if (log.length > 40) log.shift(); },
    printErr: line => { log.push(line); if (log.length > 40) log.shift(); },
    onQuit: () => leave(),
    onError: message => failed(`Quake stopped: ${message}`),
    onMusic: (track, loop) => playMusic(game, track, loop),
    onMusicPause: on => { musicPaused = !!on; updateMusic(); },
    onMusicVolume: v => { music.volume = Math.max(0, Math.min(1, v)); },
  });
  quake = module;
  current = game;
  const FS = module.FS;
  // The game's files, from IndexedDB (each written once, owned by the
  // file system so they aren't copied)
  for (const path of await gamePaths(game)) {
    const id = `${game.base}/${path}`;
    const file = memoryOnly.get(id) || (await getFile(id))?.data;
    if (!file) throw new Error('a game file is missing; add it again');
    FS.mkdirTree(`/quake/${path.slice(0, path.lastIndexOf('/'))}`);
    FS.writeFile(`/quake/${path}`, file, { canOwn: true });
  }
  FS.mkdirTree(`/quake/${game.dir}`);
  const saves = await getSaves(game.key);
  for (const f of saves?.files || []) FS.writeFile(`/quake/${game.dir}/${f.name}`, f.data);
  if (!exists(`/quake/${game.dir}/config.cfg`)) FS.writeFile(`/quake/${game.dir}/config.cfg`, DEFAULTS);
  saved = new Map((saves?.files || []).map(f => [f.name, +FS.stat(`/quake/${game.dir}/${f.name}`).mtime]));

  const mode = settings.get('sharp', false) ? '1' : '0';   // 640x480 or 320x240, windowed
  // The mouse is taken only when the game is clicked (see mouseLook)
  const args = ['-basedir', '/quake', '-nojoy', ...game.args, '+mlook', '+_windowed_mouse', '0', '+_vid_default_mode_win', mode, '+vid_mode', mode];
  if (resume && exists(`/quake/${game.dir}/auto.sav`)) args.push('+load', 'auto');
  else args.push('+map', 'start');

  $('title').textContent = titleOf(game, await fileSizes());
  $('library').hidden = true;
  $('player').hidden = false;
  $('loading').hidden = true;
  $('player').classList.toggle('mouse', !touchFirst);
  showSound();
  fit();
  try {
    module.callMain(args);
  } catch (e) {
    if (e !== 'unwind') throw e;
  }
  frames = 0;
  fpsSince = performance.now();
  raf = requestAnimationFrame(loop);
  setInterval(() => { if (!document.hidden) persist(); }, 10000);   // saves made from the game's menu
}

// Every file of a game: its paks (the base game's too, for mission packs)
async function gamePaths(game) {
  const ids = new Set(await fileIds());
  for (const id of memoryOnly.keys()) ids.add(id);
  return [...ids].filter(id => id.startsWith(`${game.base}/`) && id.endsWith('.pak')).map(id => id.slice(game.base.length + 1))
    .filter(path => path.startsWith('id1/') || path.startsWith(`${game.dir}/`));
}

let starting = false;

async function play(game, btn, resume) {
  if (starting || quake) return;
  starting = true;
  btn?.classList.add('busy');
  // Made inside the tap, so the browser lets it play
  try { audio = new AudioContext({ sampleRate: 44100 }); } catch { audio = null; }
  if (audio && !settings.get('sound', true)) audio.suspend();
  music.play().catch(() => {});   // unlocked inside the tap too; nothing to play yet
  music.pause();
  try {
    loading(game.title, 'Loading…', 0);
    if (game.free) await downloadFree(game);
    settings.set('last', game.key);
    await boot(game, resume);
  } catch (e) {
    // The engine is up and can't start again within this page, so the
    // library's buttons would do nothing: back to it by reloading
    if (quake) { failed(`Couldn't start ${game.title}: ${e && e.message ? e.message : 'something went wrong'}.`); return; }
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

// ---------- music ----------
// Quake asks for a CD track; the page plays trackNN.ogg: LibreQuake's from
// this site (kept in IndexedDB once fetched), the player's own from theirs.

const music = new Audio();
let musicTrack = 0, musicPaused = false, musicUrl = '';
// which track is sounding, for anyone checking
music.onplaying = () => { $('player').dataset.music = musicTrack; };
music.onpause = () => { delete $('player').dataset.music; };

async function trackData(game, track) {
  const path = `music/track${String(track).padStart(2, '0')}.ogg`;
  const id = `${game.base}/${path}`;
  const stored = await getFile(id).catch(() => null);
  if (stored) return stored.data;
  if (!game.free) return null;
  const res = await fetch(`librequake/${path}`);
  if (!res.ok) return null;
  const data = new Uint8Array(await res.arrayBuffer());
  putFile({ id, base: game.base, path, size: data.length, added: Date.now(), data }).catch(() => {});
  return data;
}

async function playMusic(game, track, loop) {
  musicTrack = track;
  musicPaused = false;
  music.pause();
  if (musicUrl) URL.revokeObjectURL(musicUrl);
  musicUrl = '';
  if (!track) return;
  const data = await trackData(game, track).catch(() => null);
  if (!data || musicTrack !== track) return;
  musicUrl = URL.createObjectURL(new Blob([data], { type: 'audio/ogg' }));
  music.src = musicUrl;
  music.loop = !!loop;
  updateMusic();
}

function updateMusic() {
  if (musicUrl && !musicPaused && settings.get('sound', true) && !document.hidden) music.play().catch(() => {});
  else music.pause();
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
  updateMusic();
};

// ---------- input ----------

const touchFirst = !matchMedia('(hover: hover) and (pointer: fine)').matches;
const touch = new Map();          // pointerId -> { stick: true, x, y } or { b, x, y } or { look: true, x, y }
// A quick tap can start and end between two of Quake's frames; keep each
// press down for a few frames so the game always sees it.
const sticky = new Map();         // button -> frames left
const press = b => sticky.set(b, 4);

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
    s.yaw += dead(ax[2] || 0);
    s.pitch += dead(ax[3] || 0);
  } else {
    s.yaw += lx;
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
      quake._web_key(K[k], 1);
      menuHeld.set(k, t + 400);
    } else if (t >= menuHeld.get(k) && ['up', 'down', 'left', 'right'].includes(k)) {
      quake._web_key(K[k], 1);
      menuHeld.set(k, t + 110);
    }
  }
  for (const k of menuHeld.keys()) {
    if (names.has(k)) continue;
    quake._web_key(K[k], 0);
    menuHeld.delete(k);
  }
}

const clamp = v => Math.max(-1, Math.min(1, v));
const fixed = v => Math.round(clamp(v) * 65536);
let mode = '';
let gameStart = false, gameTab = false;
let lastMode = '', swallow = new Set();
// degrees of turn per CSS pixel a finger moves
const LOOK = 0.3;

function loop(t) {
  raf = requestAnimationFrame(loop);
  if (document.hidden) return;
  const state = quake._web_state();
  const dest = state & 3;
  const now = dest === 1 || dest === 3 ? 'menu' : state & 4 ? 'game' : 'title';
  if (now !== mode) {
    mode = now;
    const p = $('player');
    p.classList.toggle('menu', mode === 'menu');
    p.classList.toggle('title', mode === 'title');
    p.dataset.mode = mode;
    hint(mode === 'title' ? 'Tap Menu, or wait for the game to start' : '');
  }

  const s = { held: new Set(), dirs: new Set(), stick: new Set(), forward: 0, side: 0, yaw: 0, pitch: 0 };
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
  if (s.held.size || s.dirs.size || s.forward || s.yaw || s.side || s.pitch) setPadMode(true);
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

  if (mode === 'menu') {
    const keys = new Set();
    for (const d of [...s.dirs, ...s.stick]) keys.add(d);
    if (s.held.has('a') || s.held.has('enter')) keys.add('enter');
    if (s.held.has('b') || s.held.has('start') || s.held.has('escape')) keys.add('escape');
    for (const k of ['up', 'down', 'left', 'right']) if (s.held.has(k)) keys.add(k);
    menuKeys(keys, t);
    quake._web_pad(0, 0, 0, 0, 0);
  } else {
    menuKeys(new Set(), t);
    if (s.dirs.has('up')) s.forward += 1;
    if (s.dirs.has('down')) s.forward -= 1;
    if (s.dirs.has('left')) s.yaw -= 1;
    if (s.dirs.has('right')) s.yaw += 1;
    if (s.held.has('l')) s.side -= 1;
    if (s.held.has('r')) s.side += 1;
    let buttons = 0;
    if (s.held.has('fire') || s.held.has('a') || s.held.has('rt')) buttons |= BIT.fire;
    if (s.held.has('jump') || s.held.has('b') || s.held.has('lt')) buttons |= BIT.jump;
    if (s.held.has('next') || s.held.has('y')) buttons |= BIT.next;
    if (s.held.has('prev') || s.held.has('x')) buttons |= BIT.prev;
    quake._web_pad(buttons, fixed(s.forward), fixed(s.side), fixed(s.yaw), fixed(s.pitch));
    // Start opens the menu; Select shows the scores while held
    const start = s.held.has('start');
    if (start && !gameStart) { quake._web_key(K.escape, 1); quake._web_key(K.escape, 0); }
    gameStart = start;
    const tab = s.held.has('select');
    if (tab !== gameTab) quake._web_key(K.tab, tab ? 1 : 0);
    gameTab = tab;
  }
  showTouch(s.held);

  if (t - fpsSince >= 1000) {
    const n = quake._web_frames();
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
  if (quake && mode === 'game') quake._web_look(Math.round(dx * LOOK * 1000), Math.round(dy * LOOK * 1000));
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

// A console command for Quake (a setting), run on its next frame
function command(text) {
  if (!quake) return;
  const p = quake.stringToNewUTF8(text);
  quake._web_cmd(p);
  quake._free(p);
}

// With a mouse: clicking the game takes the pointer for looking around
// (Quake's "mouse in a window" setting), until the browser lets it go
// (Escape). Touch screens never take it.
$('canvas').addEventListener('pointerdown', e => {
  if (!quake || e.pointerType === 'touch' || document.pointerLockElement) return;
  $('canvas').requestPointerLock?.()?.catch?.(() => {});
});
document.addEventListener('pointerlockchange', () => {
  command(`_windowed_mouse ${document.pointerLockElement === $('canvas') ? 1 : 0}`);
});

$('menuBtn').onclick = () => {
  if (!quake) return;
  quake._web_key(K.escape, 1);
  quake._web_key(K.escape, 0);
};

let hintTimer = 0;
function hint(text, ms = 4000) {
  clearTimeout(hintTimer);
  $('hint').textContent = text;
  $('hint').hidden = !text;
  if (text) hintTimer = setTimeout(() => { $('hint').hidden = true; }, ms);
}

// ---------- screen ----------

// The game is 4:3 and as big as fits under the bar. The on-screen controls
// sit inside its lower corners, just above the status bar (its bottom 48
// of 240 lines).
function fit() {
  if ($('player').hidden) return;
  const W = innerWidth, H = innerHeight - 60;
  const w = Math.floor(Math.max(160, Math.min(W, H * 4 / 3)));
  const h = Math.floor(w * 3 / 4);
  const c = $('canvas');
  c.style.setProperty('width', `${w}px`, 'important');
  c.style.setProperty('height', `${h}px`, 'important');
  const screen = document.querySelector('.screen').style;
  screen.setProperty('--above-status', `${Math.round((H - h) / 2 + h * 48 / 240 + 8)}px`);
  screen.setProperty('--inset', `${Math.round((W - w) / 2 + 10)}px`);
}
addEventListener('resize', fit);

// ---------- settings ----------

function showSharp() {
  const on = settings.get('sharp', false);
  $('sharpBtn').classList.toggle('on', on);
  $('sharpBtn').setAttribute('aria-pressed', String(on));
}
$('sharpBtn').onclick = () => {
  settings.set('sharp', !settings.get('sharp', false));
  showSharp();
};
showSharp();

// ---------- leaving ----------

// Save, and stop the sound, while the screen is off or another app is
// showing (the game itself stops with the page's refreshes)
document.addEventListener('visibilitychange', () => {
  if (!quake) return;
  if (document.hidden) {
    audio?.suspend();
    saveAll();
  } else if (audio && settings.get('sound', true)) {
    audio.resume();
  }
  updateMusic();
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
