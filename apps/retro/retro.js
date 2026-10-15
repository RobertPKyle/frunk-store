// Retro Console: NES (jsnes), Game Boy / Color / Advance (mGBA) and SNES
// (LakeSnes) emulators
// with free homebrew games built in, plus games the player loads from their
// own files. Loaded files are kept in this screen's IndexedDB and never leave
// it.
//
// Input comes from up to two gamepads, the on-screen buttons and the
// keyboard; each frame they're merged and handed to the running core
// (nes.js, gba.js or snes.js) as sets of button names.

import { openPiece, toBase64Url } from '../_shared/transfer.js';
import { MAX_FILE, SYSTEMS, cleanName, findGame, isColor, maybeGame } from '../_shared/roms.js';
import { createNes } from './nes.js';
import { createGba } from './gba.js';
import { createSnes } from './snes.js';

const GAMES = [
  {
    id: 'voxelburg', title: 'Attack on Voxelburg', by: 'John Tsiombikas, 2022', file: 'games/voxelburg.gba', system: 'gba',
    about: 'Fly over a 3D city and destroy the enemy defense pods before they shoot you down. A flies forward, B shoots, D-pad turns, L and R strafe.',
    license: 'GNU GPL 3 or later', source: 'games/voxelburg-jam-src.tar.gz',
  },
  {
    id: 'thwaite', title: 'Thwaite', by: 'Damian Yerrick, 2011', file: 'games/thwaite.nes', system: 'nes',
    about: 'Shoot down incoming missiles before they reach the town. D-pad aims, B and A fire from the left and right silos.',
    license: 'GNU GPL 3 or later', source: 'games/thwaite-0.03.zip',
  },
  {
    id: 'croom', title: 'Concentration Room', by: 'Damian Yerrick, 2010', file: 'games/croom.nes', system: 'nes',
    about: 'Flip cards and find the matching pairs, alone, against the console or with a friend.',
    license: 'GNU GPL 3 or later (exact copies allowed without source)', source: 'games/ConcentrationRoom-0.02.zip',
  },
];

const $ = id => document.getElementById(id);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('retro.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('retro.' + key, JSON.stringify(value)); } catch {} },
};

// ---------- your games (IndexedDB) ----------

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('retro', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('roms', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('roms', mode);
    const req = fn(tx.objectStore('roms'));
    tx.oncomplete = () => { d.close(); resolve(req && req.result); };
    tx.onerror = tx.onabort = () => { d.close(); reject(tx.error); };
  });
}

const listRoms = () => store('readonly', s => s.getAll()).catch(() => []);
const getRom = id => store('readonly', s => s.get(id));
const putRom = rom => store('readwrite', s => s.put(rom));
const deleteRom = id => store('readwrite', s => s.delete(id));

// Checks and saves one game (unzipping it if needed); returns its title, or
// null when it isn't a game this app plays
async function saveGame(name, file) {
  const game = await findGame(name, file);
  if (!game) return null;
  const { system, bytes: data } = game;
  const title = cleanName(name);
  await putRom({ id: `${title}|${data.length}`, title, system, size: data.length, added: Date.now(), data });
  return title;
}

async function addFiles(files) {
  const msg = $('addMsg');
  let added = 0, skipped = 0;
  msg.textContent = 'Adding…';
  for (const file of files) {
    if (!maybeGame(file.name) || file.size > MAX_FILE) { skipped++; continue; }
    try {
      if (await saveGame(file.name, new Uint8Array(await file.arrayBuffer()))) added++;
      else skipped++;
    } catch { skipped++; }
  }
  msg.textContent = added
    ? `Added ${added} game${added === 1 ? '' : 's'}.${skipped ? ` Skipped ${skipped} file${skipped === 1 ? '' : 's'} that weren't games.` : ''}`
    : files.length ? 'No game files (.nes, .gb, .gbc, .gba, .sfc, .smc or .zip) found there.' : '';
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

// ---------- get games from phone ----------
// The car opens a session on /api/transfer and shows a QR code with the
// session id and a fresh AES key in the #fragment. The phone uploads games
// encrypted with that key, big ones in pieces; this screen polls, downloads,
// decrypts, joins the pieces and saves.

// gen changes when the panel closes, so a code still being fetched is dropped.
// partial holds games still arriving: id -> { name, parts, got: [], item }
const transfer = { session: null, key: null, taken: 0, timer: 0, busy: false, gen: 0, partial: new Map() };

async function api(op, params = {}, method = 'GET') {
  const q = new URLSearchParams({ op, ...params });
  const res = await fetch(`/api/transfer?${q}`, { method, cache: 'no-store' });
  return res;
}

async function openTransfer() {
  const status = $('transferStatus');
  $('qr').replaceChildren();
  status.textContent = 'Getting a code…';
  const gen = transfer.gen;
  try {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    const res = await api('open', {}, 'POST');
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
    const session = await res.json();
    if (gen !== transfer.gen) {   // closed while waiting
      api('close', { sid: session.sid, token: session.token }, 'POST').catch(() => {});
      return;
    }
    transfer.session = session;
    transfer.key = key;
    transfer.taken = 0;
    transfer.partial.clear();
    const link = `${location.origin}/send/#${transfer.session.sid}.${toBase64Url(raw)}`;
    // The code is also a link, so the phone page can be tried on a computer;
    // the car's browser blocks new windows, so tapping it there does nothing
    const a = Object.assign(document.createElement('a'), { href: link, target: '_blank', rel: 'noopener' });
    $('qr').append(a);
    new QRCode(a, { text: link, width: 216, height: 216, correctLevel: QRCode.CorrectLevel.M });
    status.textContent = 'Waiting for your phone…';
    clearInterval(transfer.timer);
    transfer.timer = setInterval(pollTransfer, 2500);
  } catch (e) {
    if (gen !== transfer.gen) return;
    status.textContent = /\d{3}|unavailable/.test(String(e.message)) || e instanceof TypeError
      ? 'Sending from a phone isn\'t available right now. Check the connection and try again.'
      : String(e.message);
  }
}

async function pollTransfer() {
  if (transfer.busy || !transfer.session || document.hidden) return;
  transfer.busy = true;
  const { sid, token } = transfer.session;
  try {
    const res = await api('poll', { sid });
    if (sid !== transfer.session?.sid) return;                 // closed while waiting
    if (res.status === 410) { await openTransfer(); return; }   // expired: show a fresh code
    if (!res.ok) return;
    const { n } = await res.json();
    while (transfer.taken < n && sid === transfer.session?.sid) {
      const i = transfer.taken + 1;
      const file = await api('take', { sid, token, i });
      // A missing file was rejected or already taken; other errors retry
      if (file.ok || file.status === 404) transfer.taken = i;
      if (file.status === 404) continue;
      if (!file.ok) break;
      await receive(new Uint8Array(await file.arrayBuffer()));
    }
  } catch {
    // offline for a moment; the next poll retries
  } finally {
    transfer.busy = false;
  }
}

function received(text, bad) {
  const item = document.createElement('li');
  item.textContent = text;
  if (bad) item.className = 'bad';
  $('received').prepend(item);
  return item;
}

async function receive(data) {
  let piece;
  try {
    piece = await openPiece(transfer.key, transfer.session.sid, data);
  } catch {
    received('A file that couldn\'t be opened', true);
    return;
  }
  const { name, id, part, parts, bytes } = piece;
  let game = { name, parts, got: [bytes] };
  if (parts > 1) {
    game = transfer.partial.get(id) || { name, parts, got: [], item: received('') };
    game.got[part] = bytes;
    transfer.partial.set(id, game);
    const have = game.got.filter(Boolean).length;
    game.item.textContent = `${cleanName(name)}: receiving ${Math.round(100 * have / parts)}%`;
    game.item.className = 'busy';
    $('transferStatus').textContent = 'Receiving…';
    if (have < parts) return;
    transfer.partial.delete(id);
  }
  const whole = new Uint8Array(game.got.reduce((n, b) => n + b.length, 0));
  game.got.reduce((at, b) => (whole.set(b, at), at + b.length), 0);
  const item = game.item || received('');
  item.textContent = `${cleanName(name)}: saving…`;
  item.className = 'busy';
  try {
    const title = await saveGame(name, whole);
    item.textContent = title || `${name}: not a game this plays`;
    item.className = title ? '' : 'bad';
  } catch {
    item.textContent = `${name}: couldn't be saved`;
    item.className = 'bad';
  }
  $('transferStatus').textContent = 'Got it. Send more, or tap Done.';
  renderMine();
}

function showTransfer() {
  $('received').replaceChildren();
  $('transfer').hidden = false;
  openTransfer();
}

function closeTransfer() {
  transfer.gen++;
  clearInterval(transfer.timer);
  const s = transfer.session;
  transfer.session = transfer.key = null;
  transfer.partial.clear();
  if (s) api('close', { sid: s.sid, token: s.token }, 'POST').catch(() => {});
  $('transfer').hidden = true;
}

function pick(inputId) {
  const input = $(inputId);
  input.value = '';
  input.onchange = () => addFiles([...input.files]);
  input.click();
}

// ---------- library ----------

function card(title, lines, onPlay) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'game';
  const t = document.createElement('b');
  t.textContent = title;
  b.append(t, ...lines.map(([tag, text]) => Object.assign(document.createElement(tag), { textContent: text })));
  b.onclick = onPlay;
  return b;
}

function renderFree() {
  $('free').replaceChildren(...GAMES.map(g => card(g.title, [
    ['small', `${SYSTEMS[g.system].name} · ${g.by}`],
    ['p', g.about],
    ['small', `License: ${g.license}. Source: frunk-apps.vercel.app/retro/${g.source}`],
  ], () => playUrl(g))));
}

async function renderMine() {
  const roms = (await listRoms()).sort((a, b) => a.title.localeCompare(b.title));
  $('mine').replaceChildren(...roms.map(r => {
    const wrap = document.createElement('div');
    wrap.className = 'wrap';
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del';
    del.textContent = 'Remove';
    del.setAttribute('aria-label', `Remove ${r.title}`);
    del.onclick = async () => {
      await deleteRom(r.id);
      renderMine();
    };
    const system = SYSTEMS[r.system || 'nes'].name;
    wrap.append(card(r.title, [['small', `${system} · ${Math.round(r.size / 1024)} KB · on this screen only`]], () => playStored(r.id)), del);
    return wrap;
  }));
}

// ---------- sound ----------

function showSound() {
  $('soundBtn').textContent = settings.get('sound', true) ? 'Sound on' : 'Sound off';
}

// ---------- input ----------

// Buttons have their SNES-style names: a, b, x, y, l, r, start, select and
// the four directions. Each core uses the ones its console has.
const KEYS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  KeyX: 'a', KeyK: 'a', KeyZ: 'b', KeyJ: 'b', KeyS: 'x', KeyI: 'x', KeyA: 'y', KeyU: 'y', KeyQ: 'l', KeyW: 'r',
  Enter: 'start', ShiftLeft: 'select', ShiftRight: 'select', Space: 'select',
};
const keyboard = new Set();
const touch = new Map();          // pointerId -> { dpad: true } or { b: name }
// A quick tap or key press can start and end between two frames. Keep each
// press down for a few frames so the game always sees it.
const sticky = new Map();         // button -> frames left
function press(b) { sticky.set(b, 3); }

// The car adds a "Tesla Virtual Gamepad" (standard layout) for a controller
// it recognises, next to the controller's own raw device, and both report
// every press under different numbers: an 8BitDo Zero 2's A is raw button 0
// but standard button 1. So when any standard pad is present, buttons come
// only from standard pads; raw pads add only D-pad directions from their
// axes, which agree with the standard pad. Without a standard pad, raw pads
// are read with the usual raw layout (A 0, B 1, X 3, Y 4, L 6, R 7,
// Select 10, Start 11).
function padsToPlayers(pads) {
  const players = [new Set(), new Set()];
  const standard = pads.filter(p => p.mapping === 'standard');
  const raw = pads.filter(p => p.mapping !== 'standard');
  (standard.length ? standard : raw).slice(0, 2).forEach((p, i) => readPad(p, players[i]));
  if (standard.length) for (const p of raw) padAxes(p, players[0]);
  return players;
}

function padAxes(p, out) {
  const ax = p.axes;
  if (ax[1] < -0.5) out.add('up');
  if (ax[1] > 0.5) out.add('down');
  if (ax[0] < -0.5) out.add('left');
  if (ax[0] > 0.5) out.add('right');
}

function readPad(p, out) {
  const on = i => p.buttons[i] && p.buttons[i].pressed;
  padAxes(p, out);
  if (p.mapping === 'standard') {
    if (on(12)) out.add('up');
    if (on(13)) out.add('down');
    if (on(14)) out.add('left');
    if (on(15)) out.add('right');
    // Nintendo layout: bottom face button is B, right A, left Y, top X
    if (on(1)) out.add('a');
    if (on(0)) out.add('b');
    if (on(3)) out.add('x');
    if (on(2)) out.add('y');
    if (on(4) || on(6)) out.add('l');
    if (on(5) || on(7)) out.add('r');
    if (on(8)) out.add('select');
    if (on(9)) out.add('start');
  } else {
    if (on(0)) out.add('a');
    if (on(1)) out.add('b');
    if (on(3)) out.add('x');
    if (on(4)) out.add('y');
    if (on(6)) out.add('l');
    if (on(7)) out.add('r');
    if (on(10)) out.add('select');
    if (on(11)) out.add('start');
  }
}

let usingPad = false;
function readInput() {
  const now = [new Set(keyboard), new Set()];
  for (const [b, left] of sticky) {
    now[0].add(b);
    if (left <= 1) sticky.delete(b); else sticky.set(b, left - 1);
  }
  for (const t of touch.values()) for (const b of t.held || []) now[0].add(b);
  const pads = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean);
  padsToPlayers(pads).forEach((set, i) => { for (const b of set) now[i].add(b); });
  if (pads.length && !usingPad) { usingPad = true; $('player').classList.add('pad'); }
  core.input(now);
  showTouch(now[0]);
}

function showTouch(set) {
  const d = $('dpad');
  for (const dir of ['up', 'down', 'left', 'right']) d.classList.toggle(dir, set.has(dir));
  for (const el of document.querySelectorAll('#player [data-b]')) el.classList.toggle('on', set.has(el.dataset.b));
}

function dpadDirs(e) {
  const r = $('dpad').getBoundingClientRect();
  const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
  const out = [];
  if (Math.hypot(x, y) < 14) return out;
  const a = Math.atan2(y, x) * 180 / Math.PI;   // 0 = right, 90 = down
  if (a > -67.5 && a < 67.5) out.push('right');
  if (a > 112.5 || a < -112.5) out.push('left');
  if (a > 22.5 && a < 157.5) out.push('down');
  if (a < -22.5 && a > -157.5) out.push('up');
  return out;
}

function buttonAt(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const b = el && el.closest('#player [data-b]');
  return b ? [b.dataset.b] : [];
}

function onPointer(e) {
  if (e.type === 'pointerdown') {
    if (e.target.closest('#dpad')) touch.set(e.pointerId, { dpad: true, held: dpadDirs(e) });
    else if (e.target.closest('#player [data-b]')) touch.set(e.pointerId, { held: buttonAt(e) });
    else return;
    touch.get(e.pointerId).held.forEach(press);
    e.preventDefault();
    try { e.target.setPointerCapture(e.pointerId); } catch {}
  } else if (e.type === 'pointermove') {
    const t = touch.get(e.pointerId);
    if (!t) return;
    t.held = t.dpad ? dpadDirs(e) : buttonAt(e);   // slide between A and B
  } else {
    touch.delete(e.pointerId);
  }
}

for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) $('player').addEventListener(type, onPointer);
addEventListener('keydown', e => {
  if ($('player').hidden || !KEYS[e.code]) return;
  if (!e.repeat) press(KEYS[e.code]);
  keyboard.add(KEYS[e.code]);
  e.preventDefault();
});
addEventListener('keyup', e => { keyboard.delete(KEYS[e.code]); });
addEventListener('blur', () => keyboard.clear());

// ---------- running ----------

const cores = { nes: createNes($('screen')), gba: createGba($('gbaScreen')), snes: createSnes($('snesScreen')) };
const CORE = { nes: 'nes', gb: 'gba', gba: 'gba', snes: 'snes' };
let core = null, raf = 0, paused = false, frames = 0, fpsSince = 0;

function loop(t) {
  raf = requestAnimationFrame(loop);
  if (paused || document.hidden) return;
  readInput();
  core.tick(t);
  if (t - fpsSince >= 1000) {
    $('fps').textContent = `${Math.round((core.frames - frames) * 1000 / (t - fpsSince))} fps`;
    frames = core.frames;
    fpsSince = t;
  }
}

function fit() {
  if (!core) return;
  const { width: w, height: h } = core;
  const sides = innerWidth > 640 ? 2 * 128 : 0;
  const room = innerHeight - 60 - (innerWidth > 640 ? 8 : 230);
  let s = Math.min((innerWidth - sides) / w, room / h);
  if (s >= 1) s = Math.max(1, Math.floor(s * 4) / 4);   // keep pixels close to even
  core.canvas.style.width = `${Math.round(w * s)}px`;
  core.canvas.style.height = `${Math.round(h * s)}px`;
}
addEventListener('resize', fit);

function setPaused(p) {
  paused = p;
  $('paused').hidden = !p;
  $('pauseBtn').textContent = p ? 'Resume' : 'Pause';
  if (core) core.pause(p || document.hidden);
}

// Stop emulating while the screen is off or another app is showing
document.addEventListener('visibilitychange', () => {
  if (core && !paused) core.pause(document.hidden);
});

let starting = false;   // a game is loading; ignore more taps until it runs

// fileName stays the same for a game; mGBA names its saves after it
async function play(title, system, bytes, fileName) {
  cancelAnimationFrame(raf);
  if (core) await core.quit();
  core = cores[CORE[system]];
  try {
    await core.start(bytes, settings.get('sound', true), fileName);
  } catch (e) {
    core = null;
    $('addMsg').textContent = `Couldn't start "${title}": ${e && e.message && /\.$/.test(e.message) ? e.message : 'the emulator didn\'t load. Check the connection and try again.'}`;
    return;
  }
  keyboard.clear(); touch.clear(); sticky.clear();
  $('title').textContent = title;
  for (const c of Object.values(cores)) c.canvas.hidden = c !== core;
  $('player').dataset.system = system;
  $('library').hidden = true;
  $('player').hidden = false;
  showSound();
  fit();
  setPaused(false);
  frames = core.frames; fpsSince = performance.now();
  raf = requestAnimationFrame(loop);
}

// A file name for mGBA's saves: the same for the same game every time
function saveName(id, system, bytes) {
  const ext = system === 'gba' ? 'gba' : system === 'gb' ? (isColor(bytes) ? 'gbc' : 'gb') : system;
  return `${id.replace(/[^\w .|-]/g, '').replace('|', '-').slice(0, 80)}.${ext}`;
}

async function playUrl(game) {
  if (starting) return;
  starting = true;
  try {
    const res = await fetch(game.file);
    if (!res.ok) throw new Error(res.status);
    const bytes = new Uint8Array(await res.arrayBuffer());
    await play(game.title, game.system, bytes, saveName(`free-${game.id}`, game.system, bytes));
  } catch {
    $('addMsg').textContent = `Couldn't load ${game.title}. Check the connection and try again.`;
  } finally {
    starting = false;
  }
}

async function playStored(id) {
  if (starting) return;
  starting = true;
  try {
    const rom = await getRom(id).catch(() => null);
    const system = rom && (rom.system || 'nes');
    if (rom) await play(rom.title, system, rom.data, saveName(rom.id, system, rom.data));
    else renderMine();
  } finally {
    starting = false;
  }
}

function quit() {
  cancelAnimationFrame(raf);
  if (core) core.quit();
  core = null;
  $('player').hidden = true;
  $('library').hidden = false;
}

$('pauseBtn').onclick = () => setPaused(!paused);
$('resetBtn').onclick = () => { if (core) { core.reset(); setPaused(false); } };
$('quitBtn').onclick = quit;
$('soundBtn').onclick = () => {
  const on = !settings.get('sound', true);
  settings.set('sound', on);
  showSound();
  if (core) core.sound(on);
};
$('addFiles').onclick = () => ownGames(() => pick('fileInput'));
$('fromPhone').onclick = () => ownGames(showTransfer);
$('transferDone').onclick = closeTransfer;
$('addFolder').onclick = () => ownGames(() => pick('folderInput'));
addEventListener('gamepadconnected', () => { if (!$('player').hidden) { usingPad = true; $('player').classList.add('pad'); } });

renderFree();
renderMine();
