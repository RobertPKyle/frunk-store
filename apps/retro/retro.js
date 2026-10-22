// Retro Console: NES (jsnes), Game Boy / Color / Advance (mGBA), Master
// System / Game Gear / SG-1000 (Gearsystem), PC Engine / TurboGrafx-16
// (Geargrafx), Mega Drive / Genesis (clownmdemu) and Nintendo 64 (n64js)
// emulators with free
// homebrew games built in, plus games the player loads from their own files. Loaded files are kept in this screen's IndexedDB and never leave
// it.
//
// The Holders menu opens this page as ?edition=holders: early access for
// FrunkStore token holders, for now the Mega Drive / Genesis, the PC Engine
// and the Nintendo 64, which the ordinary edition leaves out. It waits behind the holders' wall
// (../_shared/holders.js) until a holder's phone unlocks the screen.
//
// Input comes from up to two gamepads, the on-screen buttons and the
// keyboard; each frame they're merged and handed to the running core
// (nes.js, gba.js, sms.js, pce.js, md.js or n64.js) as sets of button
// names, plus the players' analog sticks for the N64.

import { holdersGate } from '../_shared/holders.js';
import { phonePanel } from '../_shared/phone.js';
import { MAX_FILE, SYSTEMS, cleanName, findGame, isColor, maybeGame } from '../_shared/roms.js';
import { createNes } from './nes.js';
import { createGba } from './gba.js';
import { createSms } from './sms.js';
import { createPce } from './pce.js';
import { createMd } from './md.js';
import { createN64 } from './n64.js';

const GAMES = [
  {
    id: 'tobudx', title: 'Tobu Tobu Girl Deluxe', by: 'Tangram Games, 2019', file: 'games/tobudx.gb', system: 'gb',
    about: 'Your cat is floating away. Jump, dash and flap your arms to climb after it before time runs out. D-pad moves, A dashes, B flaps.',
    license: 'MIT (code), CC BY 4.0 (art and music)', source: 'games/tobutobugirl-dx-src.tar.gz',
  },
  {
    id: 'libbet', title: 'Libbet and the Magic Floor', by: 'Damian Yerrick, 2024', file: 'games/libbet.gb', system: 'gb',
    about: 'Roll Libbet across a floor of four shades and leave tracks on most of it before rolling out. Hold A with the D-pad to jump.',
    license: 'zlib', source: 'games/libbet-0.08-src.tar.gz',
  },
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
  {
    id: 'waternet', title: 'Waternet', by: 'Willems Davy, 2022', file: 'games/waternet.gg', system: 'gg',
    about: 'Turn and slide pipes until water flows through all of them, in three game modes. Button 1 turns or slides, 2 goes back.',
    license: 'MIT', source: 'games/waternet-1.0-src.tar.gz',
  },
  {
    id: 'subrescue', title: 'Sub Rescue', by: 'Haroldo de Oliveira Pinheiro, 2021', file: 'games/subrescue.sms', system: 'sms',
    about: 'Steer your submarine, pick up six divers and fight off sharks and enemy subs. Surface before the air runs out. Button 1 or 2 fires.',
    license: 'MIT', source: 'games/sub-rescue-0.3-src.tar.gz',
  },
  {
    id: 'cheril', title: 'Cheril Perils Classic', by: 'The Mojon Twins, 2018', file: 'games/cheril.sg', system: 'sg',
    about: 'Guide Cheril from screen to screen, jumping on the creatures in her way. Button 1 starts, 2 jumps.',
    license: 'GNU LGPL 3', source: 'games/cheril-perils-sg1000-src.tar.gz',
  },
  {
    id: 'blox', title: 'Blox', by: 'David Shadoff, 1999', file: 'games/blox.pce', system: 'pce',
    about: 'Steer the falling blocks into full rows to clear them. I and II turn the block, down drops it faster, Run pauses.',
    license: 'MIT', source: 'games/blox-src.tar.gz',
  },
  {
    id: 'kleleatoms', title: 'KłełeAtoms MD', by: 'Nightwolf-47, 2022', file: 'games/kleleatoms.gen', system: 'md',
    about: 'Place atoms in turn; a tile that gets too many explodes into its neighbours and takes their atoms, setting off chain reactions. Up to four players, against friends or the console.',
    license: 'MIT', source: 'games/kleleatoms-md-1.2.1-src.tar.gz',
  },
];

const $ = id => document.getElementById(id);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('retro.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('retro.' + key, JSON.stringify(value)); } catch {} },
};

const HOLDERS = document.documentElement.dataset.edition === 'holders';
const EARLY = new Set(['pce', 'md', 'n64']);           // consoles only in the holders edition
const inEdition = system => EARLY.has(system) === HOLDERS;
const LAST = HOLDERS ? 'holdersLast' : 'last';  // each edition continues its own game

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
// null when it isn't a game this edition plays
async function saveGame(name, file) {
  const game = await findGame(name, file);
  if (!game || !inEdition(game.system)) return null;
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
    : files.length ? `No game files (${HOLDERS ? '.md, .gen, .bin, .smd, .pce, .z64, .n64, .v64' : '.nes, .gb, .gbc, .gba, .sms, .gg, .sg'} or .zip) found there.` : '';
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

const phone = phonePanel({
  app: 'retro', save: saveGame, onSaved: renderMine,
  notPlayable: () => HOLDERS ? 'only Mega Drive / Genesis, PC Engine and Nintendo 64 games play here'
    : 'not a game this plays (Mega Drive / Genesis and PC Engine games play on the Holders card)',
});

function pick(inputId) {
  const input = $(inputId);
  input.value = '';
  input.onchange = () => addFiles([...input.files]);
  input.click();
}

// ---------- library ----------

// Shows how starting a game went, at the top of the library
function status(text) { $('status').textContent = text; }

// Buttons that lose progress or games ask for a second tap within 3 seconds
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

function renderFree() {
  $('free').replaceChildren(...GAMES.filter(g => inEdition(g.system)).map(g => card(g.title, [
    ['small', `${SYSTEMS[g.system].name} · ${g.by}`],
    ['p', g.about],
    ['small', `License: ${g.license}. Source: frunk-apps.vercel.app/retro/${g.source}`],
  ], b => playUrl(g, b))));
}

async function renderMine() {
  const roms = (await listRoms()).filter(r => inEdition(r.system || 'nes')).sort((a, b) => a.title.localeCompare(b.title));
  $('mine').replaceChildren(...roms.map(r => {
    const wrap = document.createElement('div');
    wrap.className = 'wrap';
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del';
    del.textContent = 'Remove';
    del.setAttribute('aria-label', `Remove ${r.title}`);
    del.onclick = () => confirmTap(del, async () => {
      await deleteRom(r.id);
      renderMine();
      renderContinue();
    });
    // Games for a console this app no longer plays (SNES, for now) can only be removed
    const system = SYSTEMS[r.system || 'nes'];
    const label = system ? system.name : `${r.system.toUpperCase()}, can't be played here for now`;
    wrap.append(card(r.title, [['small', `${label} · ${Math.round(r.size / 1024)} KB · on this screen only`]], b => system && playStored(r.id, b, r.title)), del);
    return wrap;
  }));
}

// The last game played, to pick up from the top of the library
async function renderContinue() {
  const last = settings.get(LAST, null);
  const btn = $('continue');
  btn.hidden = true;
  if (!last) return;
  const free = last.free && GAMES.find(g => g.id === last.free && inEdition(g.system));
  const found = last.mine && await getRom(last.mine).catch(() => null);
  const mine = found && inEdition(found.system || 'nes') ? found : null;
  if (!free && !mine) return;
  btn.textContent = `Continue ${free ? free.title : mine.title}`;
  btn.onclick = () => free ? playUrl(free, btn) : playStored(mine.id, btn, mine.title);
  btn.hidden = false;
}

// ---------- sound ----------

function showSound() {
  $('soundBtn').textContent = settings.get('sound', true) ? 'Sound on' : 'Sound off';
}

// ---------- input ----------

// Buttons have their SNES-style names: a, b, x, y, l, r, start, select and
// the four directions. Each core uses the ones its console has. Controllers
// also report lb, rb (shoulder buttons), lt, rt (triggers) and dup, ddown,
// dleft, dright (the D-pad alone), and the N64's on-screen buttons z and
// cu, cd, cl, cr (C buttons), which only the N64 uses.
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
// Also returns each player's sticks (players.sticks): { x, y, cx, cy } from
// -1 to 1, down and right positive (the left stick, and a standard pad's
// right stick); and how many players have a controller (players.pads).
function padsToPlayers(pads) {
  const players = [new Set(), new Set()];
  const standard = pads.filter(p => p.mapping === 'standard');
  const raw = pads.filter(p => p.mapping !== 'standard');
  const first = (standard.length ? standard : raw).slice(0, 2);
  first.forEach((p, i) => readPad(p, players[i]));
  if (standard.length) for (const p of raw) padAxes(p, players[0]);
  players.sticks = [0, 1].map(i => {
    const ax = first[i] ? first[i].axes : [], right = first[i]?.mapping === 'standard';
    return { x: ax[0] || 0, y: ax[1] || 0, cx: right && ax[2] || 0, cy: right && ax[3] || 0 };
  });
  players.pads = first.length;
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
    if (on(12)) out.add('up').add('dup');
    if (on(13)) out.add('down').add('ddown');
    if (on(14)) out.add('left').add('dleft');
    if (on(15)) out.add('right').add('dright');
    // Nintendo layout: bottom face button is B, right A, left Y, top X
    if (on(1)) out.add('a');
    if (on(0)) out.add('b');
    if (on(3)) out.add('x');
    if (on(2)) out.add('y');
    if (on(4) || on(6)) out.add('l');
    if (on(5) || on(7)) out.add('r');
    if (on(4)) out.add('lb');
    if (on(5)) out.add('rb');
    if (on(6)) out.add('lt');
    if (on(7)) out.add('rt');
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

// While a controller is in use, the on-screen buttons are hidden and the
// game gets their room; touching the screen brings them back
let padMode = false;
function setPadMode(on) {
  if (on === padMode) return;
  padMode = on;
  $('player').classList.toggle('pad', on);
  fit();
}

const readPads = () => padsToPlayers([...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean));

// Start that resumed a paused game stays away from the game until released,
// so it doesn't also open the game's own pause menu
let swallowStart = false;

function readInput() {
  const now = [new Set(keyboard), new Set()];
  for (const [b, left] of sticky) {
    now[0].add(b);
    if (left <= 1) sticky.delete(b); else sticky.set(b, left - 1);
  }
  const pads = readPads();
  const sticks = pads.sticks;
  let knob = null;
  for (const t of touch.values()) {
    for (const b of t.held || []) now[0].add(b);
    // the N64's touch stick: the D-pad, read for how far it's pushed
    if (t.vec) {
      knob = t.vec;
      if (Math.hypot(...t.vec) > Math.hypot(sticks[0].x, sticks[0].y)) sticks[0] = { ...sticks[0], x: t.vec[0], y: t.vec[1] };
    }
  }
  pads.forEach((set, i) => { for (const b of set) now[i].add(b); });
  if (pads.some(set => set.size)) setPadMode(true);
  if (swallowStart) {
    if (now[0].has('start')) now[0].delete('start');
    else swallowStart = false;
  }
  core.input(now, { sticks, pads: pads.pads });
  showTouch(now[0]);
  if (core.system === 'n64') moveKnob(knob);
}

// Lights the on-screen buttons that are held; touches the page only when
// that changes, and not at all while they're hidden for a controller
const touchButtons = [...document.querySelectorAll('#player [data-b]')];
let shownTouch = '';
function showTouch(set) {
  const key = padMode ? '' : [...set].sort().join();
  if (key === shownTouch) return;
  shownTouch = key;
  const d = $('dpad');
  for (const dir of ['up', 'down', 'left', 'right']) d.classList.toggle(dir, set.has(dir));
  for (const el of touchButtons) el.classList.toggle('on', set.has(el.dataset.b));
}

// The N64's touch stick shows where it's pushed (vec, or the middle)
let knobAt = '';
function moveKnob(vec) {
  const at = vec ? `translate(${Math.round(vec[0] * 34)}px, ${Math.round(vec[1] * 34)}px)` : '';
  if (at === knobAt) return;
  knobAt = at;
  $('knob').style.transform = at;
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

// How far from its middle the D-pad is touched, as x and y from -1 to 1
function dpadVec(e) {
  const r = $('dpad').getBoundingClientRect();
  let x = (e.clientX - (r.left + r.width / 2)) / (r.width * 0.4), y = (e.clientY - (r.top + r.height / 2)) / (r.height * 0.4);
  const d = Math.hypot(x, y);
  if (d > 1) { x /= d; y /= d; }
  return [x, y];
}

function buttonAt(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const b = el && el.closest('#player [data-b]');
  return b ? [b.dataset.b] : [];
}

function onPointer(e) {
  if (e.type === 'pointerdown' && !e.target.closest('.bar')) setPadMode(false);
  if (e.type === 'pointerdown') {
    if (e.target.closest('#dpad')) touch.set(e.pointerId, { dpad: true, held: dpadDirs(e), vec: dpadVec(e) });
    else if (e.target.closest('#player [data-b]')) touch.set(e.pointerId, { held: buttonAt(e) });
    else return;
    touch.get(e.pointerId).held.forEach(press);
    e.preventDefault();
    try { e.target.setPointerCapture(e.pointerId); } catch {}
  } else if (e.type === 'pointermove') {
    const t = touch.get(e.pointerId);
    if (!t) return;
    t.held = t.dpad ? dpadDirs(e) : buttonAt(e);   // slide between A and B
    if (t.dpad) t.vec = dpadVec(e);
  } else {
    touch.delete(e.pointerId);
  }
}

for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) $('player').addEventListener(type, onPointer);
addEventListener('keydown', e => {
  if ($('player').hidden || !KEYS[e.code]) return;
  if (paused) {
    if (KEYS[e.code] === 'start' && !e.repeat) setPaused(false);
    e.preventDefault();
    return;
  }
  if (!e.repeat) press(KEYS[e.code]);
  keyboard.add(KEYS[e.code]);
  e.preventDefault();
});
addEventListener('keyup', e => { keyboard.delete(KEYS[e.code]); });
addEventListener('blur', () => keyboard.clear());

// ---------- running ----------

const cores = {
  nes: createNes($('screen')), gba: createGba($('gbaScreen')), sms: createSms($('smsScreen')), pce: createPce($('pceScreen')),
  md: createMd($('mdScreen')), n64: createN64($('display')),
};
const CORE = { nes: 'nes', gb: 'gba', gba: 'gba', sms: 'sms', gg: 'sms', sg: 'sms', pce: 'pce', md: 'md', n64: 'n64' };

// Sega's pads have buttons 1 and 2 where B and A are, and Start is the
// Master System's Pause button; the PC Engine's have II and I there, and
// Run. The Mega Drive's A, B and C take Y (shown only for it), B and A.
// The N64's A and B take B and Y, with its own C buttons, Z and the
// D-pad as its stick (see n64.js).
const LABELS = { sms: ['1', '2', 'Pause'], gg: ['1', '2', 'Start'], sg: ['1', '2', 'Pause'], pce: ['II', 'I', 'Run'], md: ['B', 'C', 'Start', 'A'], n64: ['A', 'A', 'Start', 'B', 'Z'] };
function labelButtons(system) {
  const [b, a, start, y = 'Y', select = 'Select'] = LABELS[system] || ['B', 'A', 'Start'];
  document.querySelector('#player [data-b=select]').textContent = select;
  document.querySelector('#player [data-b=b]').textContent = b;
  document.querySelector('#player [data-b=a]').textContent = a;
  document.querySelector('#player [data-b=y]').textContent = y;
  document.querySelector('#player [data-b=start]').textContent = start;
}
let core = null, raf = 0, paused = false, frames = 0, fpsSince = 0, refreshes = 0;

// Steady mode: when the browser can't refresh the screen about 60 times a
// second (the car's often can't), frame rates bounce between 40 and 60 and
// games judder. After three such seconds, show every other frame instead, a
// steady 30 fps; the games still run at full speed. It stays on until the
// next game starts.
const SLOW_HZ = 54;
let steady = false, slowSeconds = 0, startedAt = 0;

// Tapping the frame rate shows details for checking speed in the car: how
// often the screen refreshed (60 when the page keeps up) and, for the N64,
// how much of the time its emulator is busy (near 100 when it can't keep up)
let details = settings.get('details', false);
$('fps').onclick = () => { details = !details; settings.set('details', details); };

function loop(t) {
  raf = requestAnimationFrame(loop);
  if (paused || document.hidden) {
    // start counting afresh when the game comes back
    frames = core.frames; fpsSince = t; refreshes = 0;
    // Start on a controller resumes (once it has been let go since pausing)
    const start = readPads()[0].has('start');
    if (paused && start && !swallowStart) { swallowStart = true; setPaused(false); }
    else if (paused) swallowStart = start;
    return;
  }
  refreshes++;
  // The cores run on their own threads and pace themselves; this page
  // passes on input and watches the refresh rate
  readInput();
  if (t - fpsSince >= 1000) {
    let hz = Math.round(refreshes * 1000 / (t - fpsSince));
    // the first two seconds don't count: starting a game can stall the page
    slowSeconds = hz < SLOW_HZ && t - startedAt > 2000 ? slowSeconds + 1 : 0;
    if (!steady && slowSeconds >= 3 && core.steady) {
      steady = true;
      core.steady(true);
    }
    // A core with its own refresh rate (NES, in a worker) decides for itself
    if ('refresh' in core) { hz = core.refresh; steady = core.isSteady; }
    // Master System, PC Engine and Mega Drive games can change their picture's size while they run
    if (core.width !== fitted.width || core.height !== fitted.height) fit();
    $('fps').textContent = core.failed || `${Math.round((core.frames - frames) * 1000 / (t - fpsSince))} fps` +
      (details ? ` · ${hz} Hz${steady ? ' · steady' : ''}${core.busy ? ` · ${core.busy}% busy` : ''}` : '');
    frames = core.frames;
    fpsSince = t;
    refreshes = 0;
  }
}

let fitted = {};
function fit() {
  if (!core) return;
  const { width: w, height: h } = core;
  fitted = { width: w, height: h };
  const wide = innerWidth > 640;
  const sides = wide && !padMode ? 2 * 128 : 0;
  const room = innerHeight - 60 - (wide || padMode ? 8 : 230);
  let s = Math.min((innerWidth - sides) / w, room / h);
  if (s >= 1) s = Math.max(1, Math.floor(s * 4) / 4);   // keep pixels close to even
  core.canvas.style.width = `${Math.round(w * s)}px`;
  core.canvas.style.height = `${Math.round(h * s)}px`;
}
addEventListener('resize', fit);

// Pausing saves the game's progress; returns when it's saved
function setPaused(p) {
  paused = p;
  swallowStart = true;   // Start must be let go, then pressed, to resume
  $('paused').hidden = !p;
  $('pauseBtn').textContent = p ? 'Resume' : 'Pause';
  if (!core) return Promise.resolve();
  core.pause(p || document.hidden);
  return p ? core.save() : Promise.resolve();
}

// Stop emulating, and save, while the screen is off or another app is showing
document.addEventListener('visibilitychange', () => {
  if (!core || paused) return;
  core.pause(document.hidden);
  if (document.hidden) core.save();
});

// A controller switched off or out of range pauses the game
addEventListener('gamepaddisconnected', () => {
  if (core && padMode && !paused) setPaused(true);
});

// The hub's Apps button (or the car's back button) unloads this page. The
// hub asks first, so the game can be saved; it waits up to a second.
addEventListener('message', async e => {
  if (e.source !== parent || e.data?.frunk !== 'close') return;
  if (core && !paused) await setPaused(true);
  else if (core) await core.save();
  e.source.postMessage({ frunk: 'closed' }, e.origin);
});
if (parent !== window) parent.postMessage({ frunk: 'save-on-close' }, '*');

let starting = false;   // a game is loading; ignore more taps until it runs
let quitting = null;    // the last game still saving after Games was tapped

// fileName stays the same for a game; mGBA names its saves after it
async function play(title, system, bytes, fileName) {
  cancelAnimationFrame(raf);
  if (core) await core.quit();
  await quitting;
  core = cores[CORE[system]];
  try {
    await core.start(bytes, settings.get('sound', true), fileName);
  } catch (e) {
    core = null;
    status(`Couldn't start "${title}": ${e && e.message && /\.$/.test(e.message) ? e.message : 'the emulator didn\'t load. Check the connection and try again.'}`);
    return false;
  }
  status('');
  keyboard.clear(); touch.clear(); sticky.clear();
  $('title').textContent = title;
  for (const c of Object.values(cores)) c.canvas.hidden = c !== core;
  $('player').dataset.system = system;
  labelButtons(system);
  $('library').hidden = true;
  $('player').hidden = false;
  showSound();
  fit();
  setPaused(false);
  frames = core.frames; fpsSince = startedAt = performance.now(); refreshes = 0;
  steady = false; slowSeconds = 0;
  raf = requestAnimationFrame(loop);
  return true;
}

// Marks the tapped card (or Continue button) while its game loads
async function startGame(btn, title, run) {
  if (starting) return;
  starting = true;
  btn?.classList.add('busy');
  status(`Starting ${title}…`);
  try {
    await run();
  } finally {
    starting = false;
    btn?.classList.remove('busy');
  }
}

// A file name for mGBA's saves: the same for the same game every time
function saveName(id, system, bytes) {
  // Gearsystem tells the Game Gear and SG-1000 apart from the name, too
  const ext = system === 'gba' ? 'gba' : system === 'gb' ? (isColor(bytes) ? 'gbc' : 'gb') : system;
  return `${id.replace(/[^\w .|-]/g, '').replace('|', '-').slice(0, 80)}.${ext}`;
}

function playUrl(game, btn) {
  return startGame(btn, game.title, async () => {
    let bytes;
    try {
      const res = await fetch(game.file);
      if (!res.ok) throw new Error(res.status);
      bytes = new Uint8Array(await res.arrayBuffer());
    } catch {
      status(`Couldn't load ${game.title}. Check the connection and try again.`);
      return;
    }
    if (await play(game.title, game.system, bytes, saveName(`free-${game.id}`, game.system, bytes))) {
      settings.set(LAST, { free: game.id });
    }
  });
}

function playStored(id, btn, title) {
  return startGame(btn, title, async () => {
    const rom = await getRom(id).catch(() => null);
    const system = rom && (rom.system || 'nes');
    if (!rom || !SYSTEMS[system] || !inEdition(system)) {
      status('');
      renderMine();
      renderContinue();
      return;
    }
    if (await play(rom.title, system, rom.data, saveName(rom.id, system, rom.data))) {
      settings.set(LAST, { mine: rom.id });
    }
  });
}

function quit() {
  cancelAnimationFrame(raf);
  if (core) quitting = core.quit().catch(() => {});
  core = null;
  $('player').hidden = true;
  $('library').hidden = false;
  renderContinue();
}

$('pauseBtn').onclick = () => setPaused(!paused);
$('paused').onclick = () => setPaused(false);
$('resetBtn').onclick = () => confirmTap($('resetBtn'), () => { if (core) { core.reset(); setPaused(false); } });
$('quitBtn').onclick = quit;
$('soundBtn').onclick = () => {
  const on = !settings.get('sound', true);
  settings.set('sound', on);
  showSound();
  if (core) core.sound(on);
};
$('addFiles').onclick = () => ownGames(() => pick('fileInput'));
$('fromPhone').onclick = () => ownGames(phone.show);
$('addFolder').onclick = () => ownGames(() => pick('folderInput'));

// ---------- holders ----------

function showShelf() {
  renderFree();
  renderMine();
  renderContinue();
}

$('fileInput').accept = HOLDERS ? '.md,.gen,.bin,.smd,.pce,.z64,.n64,.v64,.zip' : '.nes,.gb,.gbc,.gba,.sms,.gg,.sg,.zip';
if (HOLDERS) {
  document.title = 'Genesis, PC Engine & N64 · frunk.store';
  holdersGate('Mega Drive / Genesis and PC Engine games').then(showShelf);   // (the N64, in testing, isn't named before unlocking)
} else showShelf();
