// Retro Console: an NES-compatible emulator (jsnes) with free homebrew games
// built in, plus games the player loads from their own files. Loaded files
// are kept in this screen's IndexedDB and never leave it.
//
// Input comes from up to two gamepads, the on-screen buttons and the
// keyboard; each frame they're merged and the changes sent to jsnes.

import { openGame, toBase64Url } from '../_shared/transfer.js';

const { NES, Controller } = window.jsnes;

const GAMES = [
  {
    id: 'thwaite', title: 'Thwaite', by: 'Damian Yerrick, 2011', file: 'games/thwaite.nes',
    about: 'Shoot down incoming missiles before they reach the town. D-pad aims, B and A fire from the left and right silos.',
    license: 'GNU GPL 3 or later', source: 'games/thwaite-0.03.zip',
  },
  {
    id: 'croom', title: 'Concentration Room', by: 'Damian Yerrick, 2010', file: 'games/croom.nes',
    about: 'Flip cards and find the matching pairs, alone, against the console or with a friend.',
    license: 'GNU GPL 3 or later (exact copies allowed without source)', source: 'games/ConcentrationRoom-0.02.zip',
  },
];

const MAX_ROM = 2 * 1024 * 1024;
const FRAME_MS = 1000 / 60.0988;   // NTSC frame rate
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

const isNes = bytes => bytes[0] === 0x4e && bytes[1] === 0x45 && bytes[2] === 0x53 && bytes[3] === 0x1a;
const cleanName = name => name.replace(/^.*\//, '').replace(/\.nes$/i, '').replace(/[_]+/g, ' ').trim();

// Checks and saves one game; returns false when it isn't an NES game
async function saveGame(name, data) {
  if (data.length > MAX_ROM || data.length < 16 || !isNes(data)) return false;
  const title = cleanName(name);
  await putRom({ id: `${title}|${data.length}`, title, size: data.length, added: Date.now(), data });
  return true;
}

async function addFiles(files) {
  const msg = $('addMsg');
  let added = 0, skipped = 0;
  msg.textContent = 'Adding…';
  for (const file of files) {
    if (!/\.nes$/i.test(file.name) || file.size > MAX_ROM) { skipped++; continue; }
    try {
      if (await saveGame(file.name, new Uint8Array(await file.arrayBuffer()))) added++;
      else skipped++;
    } catch { skipped++; }
  }
  msg.textContent = added
    ? `Added ${added} game${added === 1 ? '' : 's'}.${skipped ? ` Skipped ${skipped} file${skipped === 1 ? '' : 's'} that weren't NES games.` : ''}`
    : files.length ? 'No NES game files (.nes) found there.' : '';
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
// encrypted with that key; this screen polls, downloads, decrypts and saves.

// gen changes when the panel closes, so a code still being fetched is dropped
const transfer = { session: null, key: null, taken: 0, timer: 0, busy: false, gen: 0 };

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
      const item = document.createElement('li');
      try {
        const { name, bytes } = await openGame(transfer.key, sid, new Uint8Array(await file.arrayBuffer()));
        const ok = await saveGame(name, bytes);
        item.textContent = ok ? cleanName(name) : `${name}: not an NES game`;
        if (!ok) item.className = 'bad';
      } catch {
        item.textContent = 'A file that couldn\'t be opened';
        item.className = 'bad';
      }
      $('received').prepend(item);
      $('transferStatus').textContent = 'Got it. Send more, or tap Done.';
      renderMine();
    }
  } catch {
    // offline for a moment; the next poll retries
  } finally {
    transfer.busy = false;
  }
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
    ['small', g.by],
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
    wrap.append(card(r.title, [['small', `${Math.round(r.size / 1024)} KB · on this screen only`]], () => playStored(r.id)), del);
    return wrap;
  }));
}

// ---------- audio ----------

// Samples go from the emulator to an AudioWorklet through a ring buffer of
// about 170 ms, posted in batches
const WORKLET = `
class NesOut extends AudioWorkletProcessor {
  constructor() {
    super();
    this.size = 8192; this.l = new Float32Array(this.size); this.r = new Float32Array(this.size);
    this.read = 0; this.write = 0; this.count = 0;
    this.port.onmessage = e => {
      const { l, r } = e.data;
      for (let i = 0; i < l.length; i++) {
        if (this.count === this.size) { this.read = (this.read + 1) % this.size; this.count--; }
        this.l[this.write] = l[i]; this.r[this.write] = r[i];
        this.write = (this.write + 1) % this.size; this.count++;
      }
    };
  }
  process(_, outputs) {
    const [L, R] = outputs[0];
    for (let i = 0; i < L.length; i++) {
      if (this.count) { L[i] = this.l[this.read]; R[i] = this.r[this.read]; this.read = (this.read + 1) % this.size; this.count--; }
      else { L[i] = R[i] = 0; }
    }
    return true;
  }
}
registerProcessor('nes-out', NesOut);
`;

const BATCH = 512;
const audio = { ctx: null, node: null, l: new Float32Array(BATCH), r: new Float32Array(BATCH), n: 0 };

async function startAudio() {
  try {
    audio.ctx = new AudioContext();
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
    await audio.ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    audio.node = new AudioWorkletNode(audio.ctx, 'nes-out', { outputChannelCount: [2] });
    audio.node.connect(audio.ctx.destination);
    if (!settings.get('sound', true)) await audio.ctx.suspend();
  } catch {
    audio.ctx = audio.node = null;
  }
}

function sample(l, r) {
  if (!audio.node) return;
  audio.l[audio.n] = l;
  audio.r[audio.n] = r;
  if (++audio.n === BATCH) {
    audio.node.port.postMessage({ l: audio.l.slice(), r: audio.r.slice() });
    audio.n = 0;
  }
}

function stopAudio() {
  if (audio.ctx) audio.ctx.close().catch(() => {});
  audio.ctx = audio.node = null;
  audio.n = 0;
}

function showSound() {
  $('soundBtn').textContent = settings.get('sound', true) ? 'Sound on' : 'Sound off';
}

// ---------- input ----------

const BUTTON = {
  a: Controller.BUTTON_A, b: Controller.BUTTON_B, select: Controller.BUTTON_SELECT, start: Controller.BUTTON_START,
  up: Controller.BUTTON_UP, down: Controller.BUTTON_DOWN, left: Controller.BUTTON_LEFT, right: Controller.BUTTON_RIGHT,
};
const KEYS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  KeyX: 'a', KeyK: 'a', KeyZ: 'b', KeyJ: 'b', Enter: 'start', ShiftLeft: 'select', ShiftRight: 'select', Space: 'select',
};
const keyboard = new Set();
const touch = new Map();          // pointerId -> { dpad: true } or { b: name }
const held = [new Set(), new Set()];
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
// are read with the usual raw layout (A 0, B 1, Select 10, Start 11).
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
    // Bottom face button is NES B, right face button is NES A
    if (on(1) || on(3)) out.add('a');
    if (on(0) || on(2)) out.add('b');
    if (on(8)) out.add('select');
    if (on(9)) out.add('start');
  } else {
    if (on(0)) out.add('a');
    if (on(1)) out.add('b');
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
  for (let player = 0; player < 2; player++) {
    for (const b of now[player]) if (!held[player].has(b)) nes.buttonDown(player + 1, BUTTON[b]);
    for (const b of held[player]) if (!now[player].has(b)) nes.buttonUp(player + 1, BUTTON[b]);
    held[player] = now[player];
  }
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

const canvas = $('screen');
const ctx = canvas.getContext('2d');
const image = ctx.createImageData(256, 240);
const pixels = new Uint32Array(image.data.buffer);
let nes = null, raf = 0, paused = false, last = 0, due = 0, drawn = true;
let frames = 0, fpsSince = 0;

function onFrame(buffer) {
  // jsnes gives 0xBBGGRR; the canvas wants 0xAABBGGRR on little-endian
  for (let i = 0; i < 61440; i++) pixels[i] = 0xff000000 | buffer[i];
  drawn = false;
}

function loop(t) {
  raf = requestAnimationFrame(loop);
  if (paused || document.hidden) { last = t; return; }
  due += Math.min(t - last, 100);
  last = t;
  // Catch up at most two frames per screen refresh; drop the rest when the
  // CPU can't keep up, so the game slows down instead of stuttering
  if (due > FRAME_MS * 2) due = FRAME_MS * 2;
  readInput();
  while (due >= FRAME_MS) {
    nes.frame();
    due -= FRAME_MS;
    frames++;
  }
  if (!drawn) { ctx.putImageData(image, 0, 0); drawn = true; }
  if (t - fpsSince >= 1000) {
    $('fps').textContent = `${Math.round(frames * 1000 / (t - fpsSince))} fps`;
    frames = 0;
    fpsSince = t;
  }
}

function fit() {
  const sides = innerWidth > 640 ? 2 * 128 : 0;
  const h = innerHeight - 60 - (innerWidth > 640 ? 8 : 230);
  let s = Math.min((innerWidth - sides) / 256, h / 240);
  if (s >= 1) s = Math.max(1, Math.floor(s * 4) / 4);   // keep pixels close to even
  canvas.style.width = `${Math.round(256 * s)}px`;
  canvas.style.height = `${Math.round(240 * s)}px`;
}
addEventListener('resize', fit);

function setPaused(p) {
  paused = p;
  $('paused').hidden = !p;
  $('pauseBtn').textContent = p ? 'Resume' : 'Pause';
  if (audio.ctx && settings.get('sound', true)) (p ? audio.ctx.suspend() : audio.ctx.resume()).catch(() => {});
}

let starting = false;   // a game is loading; ignore more taps until it runs

async function play(title, bytes) {
  cancelAnimationFrame(raf);
  stopAudio();
  await startAudio();
  try {
    nes = new NES({
      onFrame,
      onAudioSample: sample,
      emulateSound: !!audio.node,
      sampleRate: audio.ctx ? audio.ctx.sampleRate : 48000,
    });
    // jsnes reads ROMs as a binary string
    let s = '';
    for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    nes.loadROM(s);
  } catch (e) {
    stopAudio();
    nes = null;
    $('addMsg').textContent = `Couldn't start "${title}": ${/mapper/i.test(String(e && e.message)) ? 'this game uses a cartridge type the emulator doesn\'t support yet.' : 'the file may be damaged.'}`;
    return;
  }
  held[0].clear(); held[1].clear(); keyboard.clear(); touch.clear(); sticky.clear();
  $('title').textContent = title;
  $('library').hidden = true;
  $('player').hidden = false;
  showSound();
  fit();
  setPaused(false);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 256, 240);
  last = performance.now(); due = 0; frames = 0; fpsSince = last;
  raf = requestAnimationFrame(loop);
}

async function playUrl(game) {
  if (starting) return;
  starting = true;
  try {
    const res = await fetch(game.file);
    if (!res.ok) throw new Error(res.status);
    await play(game.title, new Uint8Array(await res.arrayBuffer()));
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
    if (rom) await play(rom.title, rom.data);
    else renderMine();
  } finally {
    starting = false;
  }
}

function quit() {
  cancelAnimationFrame(raf);
  nes = null;
  stopAudio();
  $('player').hidden = true;
  $('library').hidden = false;
}

$('pauseBtn').onclick = () => setPaused(!paused);
$('resetBtn').onclick = () => { if (nes) { nes.reset(); setPaused(false); } };
$('quitBtn').onclick = quit;
$('soundBtn').onclick = () => {
  const on = !settings.get('sound', true);
  settings.set('sound', on);
  showSound();
  if (audio.ctx && !paused) (on ? audio.ctx.resume() : audio.ctx.suspend()).catch(() => {});
};
$('addFiles').onclick = () => ownGames(() => pick('fileInput'));
$('fromPhone').onclick = () => ownGames(showTransfer);
$('transferDone').onclick = closeTransfer;
$('addFolder').onclick = () => ownGames(() => pick('folderInput'));
addEventListener('gamepadconnected', () => { if (!$('player').hidden) { usingPad = true; $('player').classList.add('pad'); } });

renderFree();
renderMine();
