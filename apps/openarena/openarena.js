// OpenArena: the Quake III engine (ioquake3, compiled to WebAssembly in
// engine/ by tools/build-openarena.mjs) with OpenArena 0.8.8, a free game
// for it. The game is repacked into a core pk3 and one pk3 per arena
// (data/, listed in data/maps.json); they're downloaded when first played
// and kept in this screen's IndexedDB, so arenas played before start without
// a connection.
//
// The engine runs on this page's main thread, one frame per screen refresh,
// and draws to #canvas through SDL. The on-screen controls and controllers
// are merged here and handed to it (web_move, web_look, web_cmd and web_key
// in tools/openarena/ioq3-web.patch); in the game's menus, taps become its
// mouse pointer and clicks. A keyboard goes to the engine directly, a mouse
// through here.
//
// The game's settings (q3config.cfg) are copied to IndexedDB whenever the
// page is hidden or left. One match per page: leaving it reloads the page.

const $ = id => document.getElementById(id);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('openarena.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('openarena.' + key, JSON.stringify(value)); } catch {} },
};
const mb = bytes => `${(bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0)} MB`;

const SKILLS = ['I Can Win', 'Bring It On', 'Hurt Me Plenty', 'Hardcore', 'Nightmare!'];
// Quake 3's key numbers (keycodes.h)
const K = { tab: 9, enter: 13, escape: 27, up: 132, down: 133, left: 134, right: 135, mouse1: 178, mouse2: 179, mouse3: 180, wheelDown: 183, wheelUp: 184 };
// The engine's state (web_state): connection, key catchers, player
const CA_DISCONNECTED = 1, CA_ACTIVE = 8;
const PM_DEAD = 3;
const KEYCATCH_CONSOLE = 1, KEYCATCH_UI = 2;
// Settings the car's graphics can afford: the effects OpenArena wasn't made
// with (ioquake3's newer renderer) stay off
const GRAPHICS = {
  r_hdr: 0, r_postProcess: 0, r_toneMap: 0, r_autoExposure: 0, r_ssao: 0, r_sunlightMode: 0, r_sunShadows: 0, r_shadowBlur: 0,
  r_normalMapping: 0, r_specularMapping: 0, r_deluxeMapping: 0, r_cubeMapping: 0, r_pbr: 0, r_dlightMode: 0, r_drawSunRays: 0,
  r_pshadowDist: 0, r_ext_framebuffer_multisample: 0, r_fbo: 0,
};
const RATE = 44100;   // what LibreQuake asks for, which plays in the car

// ---------- storage (IndexedDB) ----------
// files: { name, hash, size, data }; config: { key: 'q3config', data }

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('openarena', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('files', { keyPath: 'name' });
      req.result.createObjectStore('config', { keyPath: 'key' });
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

const getFile = name => store('files', 'readonly', s => s.get(name)).catch(() => null);
const putFile = file => store('files', 'readwrite', s => s.put(file));
const getConfig = () => store('config', 'readonly', s => s.get('q3config')).catch(() => null);
const putConfig = data => store('config', 'readwrite', s => s.put({ key: 'q3config', data }));

// The stored files' hashes, by name, without reading them
async function storedHashes() {
  const out = new Map();
  await store('files', 'readonly', s => {
    const req = s.openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (!c) return;
      out.set(c.value.name, c.value.hash);
      c.continue();
    };
    return req;
  }).catch(() => {});
  return out;
}

// ---------- library ----------

let manifest = null;   // data/maps.json

function status(text) { $('status').textContent = text; }

async function renderLibrary() {
  if (!manifest) {
    try { manifest = await (await fetch('data/maps.json')).json(); } catch {
      status('Couldn\'t load the list of arenas. Check the connection and try again.');
      return;
    }
  }
  const have = await storedHashes();
  const ready = f => have.get(f.file) === f.hash;
  $('arenas').replaceChildren(...manifest.maps.map(m => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'arena';
    const img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    img.src = `data/${m.shot}`;
    const text = document.createElement('span');
    const t = document.createElement('b');
    t.textContent = m.title;
    const s = document.createElement('small');
    s.textContent = ready(m) && ready(manifest.core) ? 'Ready' : `${mb(m.bytes + (ready(manifest.core) ? 0 : manifest.core.bytes))} download`;
    text.append(t, s);
    b.append(img, text);
    b.onclick = () => play(m, b);
    return b;
  }));
  $('sizes').textContent = ready(manifest.core)
    ? 'The game is on this screen; each arena downloads once.'
    : `The first arena downloads the game too (${mb(manifest.core.bytes)}); each arena after that is a few MB. They stay on this screen.`;
  const last = manifest.maps.find(m => m.map === settings.get('last', null));
  $('again').hidden = !last;
  if (last) {
    $('again').textContent = `Play ${last.title}`;
    $('again').onclick = () => play(last, $('again'));
  }
}

function segment(id, values, key, fallback, label) {
  const el = $(id);
  const show = () => {
    const v = settings.get(key, fallback);
    for (const b of el.children) b.setAttribute('aria-pressed', String(+b.dataset.v === v));
    if (label) label(v);
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
segment('botsSeg', [1, 2, 3, 4], 'bots', 3);
segment('skillSeg', [1, 2, 3, 4, 5], 'skill', 2, v => { $('skillName').textContent = SKILLS[v - 1]; });

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

// ---------- loading ----------

function loading(title, text, part) {
  $('loading').hidden = false;
  $('loadTitle').textContent = title;
  $('loadText').textContent = text;
  $('loadBar').style.width = `${Math.round(100 * part)}%`;
}

// The pk3s an arena needs, from IndexedDB or downloaded (and kept); a
// screen whose storage is full plays from memory and downloads next time
async function files(arena) {
  const want = [manifest.core, arena];
  const have = await storedHashes();
  const missing = want.filter(f => have.get(f.file) !== f.hash);
  const total = missing.reduce((n, f) => n + f.bytes, 0);
  let got = 0;
  const out = new Map();
  for (const f of missing) {
    const res = await fetch(`data/${f.file}`, { cache: 'no-store' });
    if (!res.ok || !res.body) throw new Error(`download failed (${res.status})`);
    const reader = res.body.getReader();
    const chunks = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      loading(arena.title, `Downloading ${mb(got)} of ${mb(total)}…`, 0.9 * got / total);
    }
    const data = new Uint8Array(await new Blob(chunks).arrayBuffer());
    if (data.length !== f.bytes) throw new Error('the download was damaged');
    out.set(f.file, data);
    navigator.storage?.persist?.().catch(() => {});
    await putFile({ name: f.file, hash: f.hash, size: f.bytes, data }).catch(() => {});
  }
  for (const f of want) {
    if (!out.has(f.file)) out.set(f.file, (await getFile(f.file))?.data);
    if (!out.get(f.file)) throw new Error('a game file is missing; try again');
  }
  return out;
}

// ---------- engine ----------

let q3 = null;            // the running engine (Emscripten module)
let audio = null;         // its AudioContext
let raf = 0;
const log = [];            // the engine's last lines, for errors (and checks: window.openarenaLog)
window.openarenaLog = log;

// A console command for the engine, run on its next frame
function command(text) {
  if (q3) q3.ccall('web_cmd', null, ['string'], [text]);
}
const key = (k, down) => q3?._web_key(k, down ? 1 : 0);

// Copies the game's settings to IndexedDB
async function saveConfig() {
  if (!q3) return;
  try {
    q3._web_writeconfig();
    await putConfig(q3.FS.readFile('/home/baseoa/q3config.cfg'));
  } catch {}
}

// Back to the arenas: the engine can't restart, so the page reloads
let leaving = false;
async function leave() {
  if (leaving) return;
  leaving = true;
  cancelAnimationFrame(raf);
  await saveConfig();
  location.reload();
}

function failed(message) {
  cancelAnimationFrame(raf);
  $('failedText').textContent = message || 'Something went wrong.';
  $('failed').hidden = false;
  $('loading').hidden = true;
}
$('failedOk').onclick = () => location.reload();

// The game's size in the screen's pixels: CSS pixels, or every device pixel
// with Sharp graphics
function gameSize() {
  const r = document.querySelector('.screen').getBoundingClientRect();
  const scale = settings.get('sharp', false) ? devicePixelRatio || 1 : 1;
  return [Math.round(r.width * scale) & ~1, Math.round(r.height * scale) & ~1];
}

function botsFor() {
  const names = [...manifest.bots];
  const picked = [];
  for (let n = settings.get('bots', 3); n > 0 && names.length; n--) picked.push(names.splice(Math.floor(Math.random() * names.length), 1)[0]);
  return picked;
}

let started = 0, everActive = false;

async function boot(arena, data) {
  loading(arena.title, 'Starting…', 0.95);
  $('title').textContent = arena.title;
  $('library').hidden = true;
  $('player').hidden = false;
  $('player').classList.add('wait');
  $('player').classList.toggle('mouse', !touchFirst);
  showSound();
  const [w, h] = gameSize();
  const config = (await getConfig())?.data;
  // The settings go in autoexec.cfg, which the engine runs before it starts
  // its graphics and sound (its command line holds only 1024 characters)
  const cvars = {
    sv_pure: 0, net_enabled: 0, cl_allowDownload: 0, com_introplayed: 1, in_mouse: 0, in_joystick: 0,
    // no microphone (voice chat): the browser would ask for it
    s_useOpenAL: 0, s_sdlCapture: 0, cl_voip: 0, s_sdlSpeed: audio?.sampleRate || RATE,
    r_mode: -1, r_customwidth: w, r_customheight: h, r_fullscreen: 0, ...GRAPHICS,
    g_gametype: 0, fraglimit: 15, timelimit: 10, sv_maxclients: 8, bot_enable: 1,
    // at the end of a match, the same arena again
    nextmap: 'map_restart 0',
    ...(config ? {} : { name: 'Player' }),
  };
  const autoexec = Object.entries(cvars).map(([k, v]) => `set ${k} "${v}"\n`).join('');
  const skill = settings.get('skill', 2);
  const args = ['+set', 'fs_homepath', '/home', '+set', 'com_basegame', 'baseoa', '+map', arena.map, ...botsFor().flatMap(name => ['+addbot', name, String(skill)])];
  const { default: createQ3 } = await import('./engine/ioquake3.js');
  const remember = line => { log.push(line); if (log.length > 200) log.shift(); };
  q3 = await createQ3({
    canvas: $('canvas'),
    arguments: args,
    SDL2: audio ? { audioContext: audio } : {},
    print: remember,
    printErr: remember,
    onExit: () => leave(),
    onAbort: what => failed(`The game stopped: ${what}`),
    preRun: [m => {
      m.FS.mkdirTree('/baseoa');
      m.FS.mkdirTree('/home/baseoa');
      for (const [name, bytes] of data) m.FS.writeFile(`/baseoa/${name}`, bytes, { canOwn: true });
      if (config) m.FS.writeFile('/home/baseoa/q3config.cfg', config);
      m.FS.writeFile('/home/baseoa/autoexec.cfg', autoexec);
    }],
  });
  audio = audio || q3.SDL2?.audioContext || null;
  started = performance.now();
  raf = requestAnimationFrame(loop);
}

let starting = false;

async function play(arena, btn) {
  if (starting || q3) return;
  starting = true;
  btn?.classList.add('busy');
  // Made inside the tap, so the browser lets it play
  try { audio = new AudioContext({ sampleRate: RATE }); } catch {
    try { audio = new AudioContext(); } catch { audio = null; }
  }
  if (audio && !settings.get('sound', true)) audio.suspend();
  try {
    loading(arena.title, 'Loading…', 0);
    const data = await files(arena);
    settings.set('last', arena.map);
    await boot(arena, data);
  } catch (e) {
    $('loading').hidden = true;
    $('player').hidden = true;
    $('library').hidden = false;
    status(`Couldn't start ${arena.title}: ${e && e.message ? e.message : 'check the connection and try again'}.`);
    audio?.close().catch(() => {});
    audio = null;
    renderLibrary();
  } finally {
    starting = false;
    btn?.classList.remove('busy');
  }
}

// ---------- sound ----------

// The browser may hold the sound back until a tap (the AudioContext stays
// suspended); any tap on the game then starts it, and the button says so
const soundBlocked = () => settings.get('sound', true) && audio && audio.state !== 'running' && !document.hidden;
function showSound() {
  $('soundBtn').textContent = !settings.get('sound', true) ? 'Sound off' : soundBlocked() ? 'Tap for sound' : 'Sound on';
}
function wakeSound() {
  if (soundBlocked()) audio.resume().then(showSound, () => {});
}
$('soundBtn').onclick = () => {
  if (soundBlocked()) { wakeSound(); return; }
  const on = !settings.get('sound', true);
  settings.set('sound', on);
  showSound();
  if (audio) on ? audio.resume() : audio.suspend();
};
for (const type of ['pointerdown', 'keydown']) addEventListener(type, wakeSound, true);

// ---------- input ----------

const touchFirst = !matchMedia('(hover: hover) and (pointer: fine)').matches;
const touch = new Map();          // pointerId -> { stick: true, x, y } or { b, x, y } or { look: true, x, y } or { ui: true }

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
      key(K[k], 1);
      menuHeld.set(k, t + 400);
    } else if (t >= menuHeld.get(k) && ['up', 'down', 'left', 'right'].includes(k)) {
      key(K[k], 1);
      menuHeld.set(k, t + 110);
    }
  }
  for (const k of menuHeld.keys()) {
    if (names.has(k)) continue;
    key(K[k], 0);
    menuHeld.delete(k);
  }
}

// The game's buttons ("+attack" while held) and one-shot commands
const HOLD = { fire: '+attack', jump: '+moveup', zoom: '+zoom', scores: '+scores' };
const ONCE = { next: 'weapnext', prev: 'weapprev' };
const holding = new Set();
function gameButtons(held) {
  for (const [b, cmd] of Object.entries(HOLD)) {
    if (held.has(b) && !holding.has(b)) { command(cmd); holding.add(b); }
    else if (!held.has(b) && holding.has(b)) { command(cmd.replace('+', '-')); holding.delete(b); }
  }
  for (const [b, cmd] of Object.entries(ONCE)) {
    if (held.has(b) && !holding.has(b)) { command(cmd); holding.add(b); }
    else if (!held.has(b)) holding.delete(b);
  }
}

const clamp = v => Math.max(-1, Math.min(1, v));
// turning speed of a stick held all the way, in degrees per second
const TURN = 160, TILT = 110;
// degrees of turn per CSS pixel a finger moves
const LOOK = 0.3;
let mode = '', lastMode = '', swallow = new Set(), gameStart = false, fragged = false;
let frames = 0, fpsSince = 0;

function loop(t) {
  raf = requestAnimationFrame(loop);
  if (document.hidden || !q3) return;
  const state = q3._web_state();
  const conn = state & 0xff, catcher = state >> 8 & 0xff, pm = (state >> 16) - 1;
  const now = conn !== CA_ACTIVE ? 'wait' : catcher & (KEYCATCH_UI | KEYCATCH_CONSOLE) ? 'menu' : 'game';
  if (conn === CA_ACTIVE && !everActive) {
    everActive = true;
    $('loading').hidden = true;
    if (touchFirst) hint('Drag to look, use the stick to walk');
  }
  // Left the arena (the game's menu), or it never started
  if (everActive && conn <= CA_DISCONNECTED) return leave();
  if (!everActive && conn <= CA_DISCONNECTED && t - started > 8000) {
    const why = [...log].reverse().find(l => /error|couldn't|could not/i.test(l));
    return failed(`The arena didn't start${why ? `: ${why.replace(/\^\d/g, '')}` : '.'}`);
  }
  const isDead = mode === 'game' && pm === PM_DEAD;
  if (isDead !== fragged) {
    fragged = isDead;
    $('player').classList.toggle('dead', fragged);
    if (fragged && touchFirst && !padMode) hint('Tap FIRE to come back', 3000);
  }
  if (now !== mode) {
    mode = now;
    const p = $('player');
    p.classList.toggle('menu', mode === 'menu');
    p.classList.toggle('wait', mode === 'wait');
    p.dataset.mode = mode;
  }

  const s = { held: new Set(), dirs: new Set(), stick: new Set(), forward: 0, side: 0, yaw: 0, pitch: 0 };
  readPads(s);
  // A button that switched between the game and a menu (Start opens the
  // menu, A picks Resume) does nothing more until it's let go
  if (now !== lastMode) {
    lastMode = now;
    swallow = new Set([...s.held, ...s.dirs]);
  }
  for (const b of swallow) {
    if (s.held.has(b) || s.dirs.has(b)) { s.held.delete(b); s.dirs.delete(b); } else swallow.delete(b);
  }
  if (s.held.size || s.dirs.size || s.forward || s.yaw || s.side || s.pitch) setPadMode(true);
  for (const p of touch.values()) {
    if (p.b) s.held.add(p.b);
    else if (p.stick) {
      s.forward -= dead(p.y);
      s.side += dead(p.x);
    }
  }

  if (mode === 'menu') {
    const keys = new Set([...s.dirs, ...s.stick]);
    if (s.held.has('a')) keys.add('enter');
    if (s.held.has('b') || s.held.has('start')) keys.add('escape');
    menuKeys(keys, t);
    gameButtons(new Set());
    q3._web_move(0, 0, 0, 0);
  } else if (mode === 'game') {
    menuKeys(new Set(), t);
    if (s.dirs.has('up')) s.forward += 1;
    if (s.dirs.has('down')) s.forward -= 1;
    if (s.dirs.has('left')) s.yaw -= 1;
    if (s.dirs.has('right')) s.yaw += 1;
    if (s.held.has('l')) s.side -= 1;
    if (s.held.has('r')) s.side += 1;
    const held = new Set();
    if (s.held.has('fire') || s.held.has('a') || s.held.has('rt')) held.add('fire');
    if (s.held.has('jump') || s.held.has('b') || s.held.has('lt')) held.add('jump');
    if (s.held.has('zoom')) held.add('zoom');
    if (s.held.has('next') || s.held.has('y')) held.add('next');
    if (s.held.has('prev') || s.held.has('x')) held.add('prev');
    if (s.held.has('select')) held.add('scores');
    gameButtons(held);
    q3._web_move(clamp(s.forward), clamp(s.side), clamp(s.yaw) * TURN, clamp(s.pitch) * TILT);
    // Start opens the menu
    const start = s.held.has('start');
    if (start && !gameStart) { key(K.escape, 1); key(K.escape, 0); }
    gameStart = start;
  } else {
    menuKeys(new Set(), t);
    gameButtons(new Set());
    q3._web_move(0, 0, 0, 0);
  }
  showTouch(s.held);

  frames++;
  if (t - fpsSince >= 1000) {
    showSound();
    $('fps').textContent = mode === 'wait' ? '' : `${Math.round(frames * 1000 / (t - fpsSince))} fps`;
    frames = 0;
    fpsSince = t;
  }
}

// Lights the on-screen buttons that are held; touches the page only when
// that changes
const touchButtons = [...document.querySelectorAll('#touch [data-b]')];
let shownTouch = '';
function showTouch(set) {
  const k = [...set].sort().join() + (touch.size ? 's' : '');
  if (k === shownTouch) return;
  shownTouch = k;
  for (const el of touchButtons) el.classList.toggle('on', set.has(el.dataset.b));
  $('stick').classList.toggle('on', [...touch.values()].some(p => p.stick));
}

const STICK_RANGE = 50;   // px from the centre for full speed
function stickAt(p, e) {
  const r = $('stick').getBoundingClientRect();
  const x = (e.clientX - (r.left + r.width / 2)) / STICK_RANGE, y = (e.clientY - (r.top + r.height / 2)) / STICK_RANGE;
  const len = Math.hypot(x, y);
  p.x = len > 1 ? x / len : x;
  p.y = len > 1 ? y / len : y;
  $('stick').firstElementChild.style.transform = `translate(${p.x * 40}px, ${p.y * 40}px)`;
}

// A finger that moves turns and looks: FIRE's while it's held, or one
// anywhere else on the game
function look(p, e) {
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX;
  p.y = e.clientY;
  if (q3 && mode === 'game') q3._web_look(dx * LOOK, dy * LOOK);
}

// The menus' pointer, put where the finger (or mouse) is. The menus draw
// in a 640x480 space, centred and scaled to the screen's height on wider
// screens; web_pointer moves the pointer from the top left corner, which
// (as the game counts it) is minus the side margin in screen pixels.
function pointerAt(e) {
  const c = $('canvas'), r = c.getBoundingClientRect();
  const W = c.width, H = c.height;
  const x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
  const wide = W * 480 > H * 640;
  const scale = wide ? H / 480 : W / 640, bias = wide ? (W - H * 640 / 480) / 2 : 0;
  q3._web_pointer(Math.round((x - bias) / scale + bias), Math.round(y / (H / 480)));
}

function onPointer(e) {
  if (!q3) return;
  if (e.type === 'pointerdown' && e.pointerType === 'touch') {
    setPadMode(false);
    $('player').classList.remove('mouse');
  }
  if (e.type === 'pointerdown') {
    if (!e.target.closest('#touch')) return;
    const b = e.target.closest('#touch [data-b]');
    if (mode === 'menu') {
      touch.set(e.pointerId, { ui: true });
      pointerAt(e);
      key(K.mouse1, 1);
    } else if (e.target.closest('#stick')) {
      const p = { stick: true, x: 0, y: 0 };
      stickAt(p, e);
      touch.set(e.pointerId, p);
    } else if (b) {
      touch.set(e.pointerId, { b: b.dataset.b, x: e.clientX, y: e.clientY });
    } else {
      touch.set(e.pointerId, { look: true, x: e.clientX, y: e.clientY });
    }
    e.preventDefault();
    try { e.target.setPointerCapture(e.pointerId); } catch {}
  } else if (e.type === 'pointermove') {
    const p = touch.get(e.pointerId);
    if (p?.ui) pointerAt(e);
    else if (p?.stick) stickAt(p, e);
    else if (p?.look || p?.b === 'fire') look(p, e);
  } else if (touch.has(e.pointerId)) {
    const p = touch.get(e.pointerId);
    if (p.stick) $('stick').firstElementChild.style.transform = '';
    if (p.ui) key(K.mouse1, 0);
    touch.delete(e.pointerId);
  }
}
for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) $('player').addEventListener(type, onPointer);

// With a mouse: in the game, clicking takes the pointer for looking around
// until the browser lets it go (Escape); in menus it's the menus' pointer.
// The keyboard goes to the game while it has the focus.
const canvas = $('canvas');
const MOUSE_KEYS = [K.mouse1, K.mouse3, K.mouse2];
canvas.addEventListener('pointerdown', e => {
  if (!q3 || e.pointerType === 'touch') return;
  canvas.focus();
  if (mode === 'game' && document.pointerLockElement !== canvas) { canvas.requestPointerLock?.()?.catch?.(() => {}); return; }
  if (mode === 'menu') pointerAt(e);
  key(MOUSE_KEYS[e.button] ?? K.mouse1, 1);
});
canvas.addEventListener('pointerup', e => { if (q3 && e.pointerType !== 'touch') key(MOUSE_KEYS[e.button] ?? K.mouse1, 0); });
canvas.addEventListener('pointermove', e => {
  if (!q3 || e.pointerType === 'touch') return;
  if (document.pointerLockElement === canvas) q3._web_mouse(e.movementX, e.movementY);
  else if (mode === 'menu') pointerAt(e);
});
canvas.addEventListener('wheel', e => {
  if (!q3) return;
  e.preventDefault();
  const k = e.deltaY > 0 ? K.wheelDown : K.wheelUp;
  key(k, 1);
  key(k, 0);
}, { passive: false });

$('menuBtn').onclick = () => {
  if (!q3 || mode === 'wait') return;
  key(K.escape, 1);
  key(K.escape, 0);
};

let hintTimer = 0;
function hint(text, ms = 4000) {
  clearTimeout(hintTimer);
  $('hint').textContent = text;
  $('hint').hidden = !text;
  if (text) hintTimer = setTimeout(() => { $('hint').hidden = true; }, ms);
}

// ---------- leaving ----------

// Keep the settings, and stop the sound, while the screen is off or another
// app is showing (the game itself stops with the page's refreshes)
document.addEventListener('visibilitychange', () => {
  if (!q3) return;
  if (document.hidden) {
    audio?.suspend();
    saveConfig();
  } else if (audio && settings.get('sound', true)) {
    audio.resume();
  }
});

// The hub's Apps button (or the car's back button) unloads this page. The
// hub asks first, so the settings can be kept; it waits up to a second.
addEventListener('message', async e => {
  if (e.source !== parent || e.data?.frunk !== 'close') return;
  await saveConfig();
  e.source.postMessage({ frunk: 'closed' }, e.origin);
});
if (parent !== window) parent.postMessage({ frunk: 'save-on-close' }, '*');

$('quitBtn').onclick = () => leave();

renderLibrary();
