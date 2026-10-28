// ASCII Quests: Scott Miller's Kroz games (Apogee, 1987-1990), built from
// the source Apogee released under the GPL in 2009. tools/kroz/pascal.mjs
// translates the Turbo Pascal into games/<id>.js; each runs in worker.js on
// runtime.js, a small PC with a text screen, keyboard and speaker. This
// page draws that screen, plays the speaker and turns taps, keys and
// controllers into key presses.

import { FONT } from './font.js';
import { CTRL, KEY_SLOTS } from './runtime.js';
import { keepAwake } from '../_shared/awake.js';

const GAMES = [
  { id: 'caverns', title: 'Caverns of Kroz II', year: 1990, levels: 40, goal: 'the Priceless Amulet',
    about: 'Where the Kroz Trilogy begins: forty levels of caverns, rebuilt in 1990 on the Kingdom of Kroz II engine.' },
  { id: 'dungeons', title: 'Dungeons of Kroz II', year: 1990, levels: 40, goal: 'the Priceless Amulet',
    about: 'The trilogy\'s second volume, deeper and meaner, with the same 1990 overhaul.' },
  { id: 'return', title: 'Return to Kroz', year: 1989, levels: 20, goal: 'the Crown',
    about: 'Volume I of the Super Kroz Trilogy: back in the kingdom after the Crown, with new creatures and traps.' },
  { id: 'temple', title: 'Temple of Kroz', year: 1990, levels: 20, goal: 'the Holy Grail',
    about: 'Volume II of the Super Kroz Trilogy, deep inside a temple that guards the Grail.' },
  { id: 'crusade', title: 'The Final Crusade of Kroz', year: 1990, levels: 25, goal: 'the Fountain of Youth',
    about: 'Volume III, written as the end of Kroz. It wasn\'t.' },
  { id: 'kingdom', title: 'Kingdom of Kroz II', year: 1990, levels: 25, goal: 'the Magical Amulet',
    about: 'The 1987 original that started Apogee, remade with the best levels of the earlier games.' },
  { id: 'lost', title: 'The Lost Adventures of Kroz', year: 1990, levels: 75, goal: 'the Tome of Kroz',
    about: 'The biggest Kroz of all: seventy-five new levels with ropes, lava, gravity and more.' },
];

// The labels for the title menu's letters
const MENU = { B: 'Begin', I: 'Instructions', M: 'Marketing', S: 'Story', O: 'Other games', A: 'Author' };
const SPEEDS = [['Slower', 140], ['Normal', 100], ['Faster', 70]];
// Directions as BIOS scan codes, by [dx + 1][dy + 1]
const SCAN = [[71, 75, 79], [72, 0, 80], [73, 77, 81]];
const PALETTE = ['#000000', '#0000aa', '#00aa00', '#00aaaa', '#aa0000', '#aa00aa', '#aa5500', '#aaaaaa',
  '#555555', '#5555ff', '#55ff55', '#55ffff', '#ff5555', '#ff55ff', '#ffff55', '#ffffff'];
const REPEAT_MS = 92;   // the BIOS repeated held keys about 11 times a second
const REPEAT_DELAY = 260;

const $ = id => document.getElementById(id);
const settings = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('ascii.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('ascii.' + key, JSON.stringify(value)); } catch {} },
};

// ---------- the games' files (IndexedDB): saves and high scores ----------

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ascii', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('files');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function files(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('files', mode);
    const req = fn(tx.objectStore('files'));
    tx.oncomplete = () => { d.close(); resolve(req && req.result); };
    tx.onerror = tx.onabort = () => { d.close(); reject(tx.error); };
  });
}
async function filesOf(game) {
  const out = {};
  try {
    const range = IDBKeyRange.bound(`${game}/`, `${game}/￿`);
    const [keysList, values] = await Promise.all([files('readonly', s => s.getAllKeys(range)), files('readonly', s => s.getAll(range))]);
    keysList.forEach((k, i) => { out[k.slice(game.length + 1)] = values[i]; });
  } catch {}
  return out;
}
const saveFile = (game, name, records) => files('readwrite', s => (records ? s.put(records, `${game}/${name}`) : s.delete(`${game}/${name}`))).catch(() => {});

// ---------- library ----------

function renderLibrary() {
  $('games').replaceChildren(...GAMES.map(g => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'game';
    b.append(
      Object.assign(document.createElement('b'), { textContent: g.title }),
      Object.assign(document.createElement('small'), { textContent: `${g.year} · ${g.levels} levels · find ${g.goal}` }),
      Object.assign(document.createElement('p'), { textContent: g.about }),
    );
    b.onclick = () => play(g, b);
    return b;
  }));
}

// ---------- the screen ----------

const canvas = $('screen');
const ctx = canvas.getContext('2d');
let atlas = null;

// Every glyph in every colour, twice the font's size, so the screen can be
// drawn with whole copies
function buildAtlas() {
  const bits = Uint8Array.from(atob(FONT), c => c.charCodeAt(0));
  const c = document.createElement('canvas');
  c.width = 256 * 16; c.height = 16 * 32;
  const g = c.getContext('2d');
  const img = g.createImageData(c.width, c.height);
  for (let color = 0; color < 16; color++) {
    const rgb = [1, 3, 5].map(i => parseInt(PALETTE[color].slice(i, i + 2), 16));
    for (let ch = 0; ch < 256; ch++) {
      for (let row = 0; row < 16; row++) {
        const line = bits[ch * 16 + row];
        for (let col = 0; col < 8; col++) {
          if (!(line & (0x80 >> col))) continue;
          for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
            const p = ((color * 32 + row * 2 + dy) * c.width + ch * 16 + col * 2 + dx) * 4;
            img.data[p] = rgb[0]; img.data[p + 1] = rgb[1]; img.data[p + 2] = rgb[2]; img.data[p + 3] = 255;
          }
        }
      }
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

let run = null;   // the game being played

function draw(force) {
  const { screen, ctrl, drawn } = run;
  const t = performance.now();
  const blinkOn = Math.floor(t / 267) % 2 === 0;
  const cursorOn = Math.floor(t / 133) % 2 === 0;
  const blinkChanged = blinkOn !== run.blinkOn;
  run.blinkOn = blinkOn;
  const curShape = ctrl[CTRL.CURSOR], curAt = (ctrl[CTRL.CURY] - 1) * 80 + ctrl[CTRL.CURX] - 1;
  const cursorCell = curShape && cursorOn ? curAt : -1;
  for (let i = 0; i < 2000; i++) {
    const v = screen[i];
    const blinks = v & 0x8000;
    if (!force && v === drawn[i] && !(blinks && blinkChanged) && i !== cursorCell && i !== run.cursorCell) continue;
    drawn[i] = v;
    const x = (i % 80) * 16, y = Math.floor(i / 80) * 32;
    const attr = v >> 8;
    ctx.fillStyle = PALETTE[(attr >> 4) & 7];
    ctx.fillRect(x, y, 16, 32);
    if (!blinks || blinkOn) ctx.drawImage(atlas, (v & 255) * 16, (attr & 15) * 32, 16, 32, x, y, 16, 32);
    if (i === cursorCell) {
      ctx.fillStyle = PALETTE[attr & 15];
      if (curShape === 2) ctx.fillRect(x, y, 16, 32);
      else ctx.fillRect(x, y + 26, 16, 4);
    }
  }
  run.cursorCell = cursorCell;
  const border = PALETTE[ctrl[CTRL.BORDER] & 15];
  if (border !== run.border) { run.border = border; $('frame').style.background = border; }
}

// The screen's text, to find the question being asked
function screenText() {
  let s = '';
  for (let i = 0; i < 2000; i++) {
    s += String.fromCharCode(run.screen[i] & 255);
    if (i % 80 === 79) s += '\n';
  }
  return s;
}

// The biggest 640:400 screen that fits next to the buttons
function fit() {
  const main = $('main');
  const under = $('under');
  const room = main.clientHeight - 12 - (under.offsetHeight ? under.offsetHeight + 8 : 0) - 12;
  const scale = Math.max(0.3, Math.min((main.clientWidth - 24) / 640, room / 400));
  canvas.style.width = `${Math.floor(640 * scale)}px`;
  canvas.style.height = `${Math.floor(400 * scale)}px`;
}
new ResizeObserver(() => { if (run) fit(); }).observe($('main'));

// ---------- keys ----------

function sendKey(ascii, scan = 0) {
  if (!run) return;
  const k = run.keys;
  const w = Atomics.load(k, 0), r = Atomics.load(k, 1);
  if (w - r >= 15) return;   // the BIOS buffer is full
  k[2 + (w % KEY_SLOTS)] = (ascii & 255) | (scan << 8);
  Atomics.store(k, 0, w + 1);
  Atomics.notify(k, 0);
}
const sendChar = ch => sendKey(ch.charCodeAt(0), 0);
const sendDir = (dx, dy) => { const scan = SCAN[dx + 1][dy + 1]; if (scan) sendKey(0, scan); };

const SPECIAL = {
  ArrowUp: [0, 72], ArrowDown: [0, 80], ArrowLeft: [0, 75], ArrowRight: [0, 77], Home: [0, 71], End: [0, 79], PageUp: [0, 73], PageDown: [0, 81],
  Enter: [13, 28], Escape: [27, 1], Backspace: [8, 14], Tab: [9, 15], ' ': [32, 57],
};
const NUMPAD = { Numpad7: 71, Numpad8: 72, Numpad9: 73, Numpad4: 75, Numpad6: 77, Numpad1: 79, Numpad2: 80, Numpad3: 81 };

// Held keys repeat at the BIOS's pace rather than the operating system's
let held = null;
function hold(fire) {
  release();
  fire();
  held = { fire, timer: setTimeout(function again() { held.fire(); held.timer = setTimeout(again, REPEAT_MS); }, REPEAT_DELAY) };
}
function release() { if (held) { clearTimeout(held.timer); held = null; } }

addEventListener('keydown', e => {
  if (!run || e.target === $('lineText')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  let fire = null;
  if (NUMPAD[e.code] && !e.getModifierState('NumLock')) fire = () => sendKey(0, NUMPAD[e.code]);
  else if (SPECIAL[e.key]) fire = () => sendKey(...SPECIAL[e.key]);
  else if (e.key.length === 1 && e.key.charCodeAt(0) < 256) fire = () => sendChar(e.key);
  if (!fire) return;
  e.preventDefault();
  if (e.repeat) return;
  run.heldKey = e.code;
  hold(fire);
});
addEventListener('keyup', e => { if (run && run.heldKey === e.code) { run.heldKey = null; release(); } });
addEventListener('blur', release);

// ---------- touch: step toward the tap ----------

// The cell under a point of the canvas
function cellAt(e) {
  const r = canvas.getBoundingClientRect();
  return [Math.floor((e.clientX - r.left) / r.width * 80) + 1, Math.floor((e.clientY - r.top) / r.height * 25) + 1];
}

// One step from the player toward a cell, in one of eight directions
// (cells are twice as tall as wide, so the angle is taken in pixels)
function stepToward([tx, ty]) {
  const px = run.ctrl[CTRL.PX], py = run.ctrl[CTRL.PY];
  if (!px || !py) return false;
  const dx = tx - px, dy = ty - py;
  if (!dx && !dy) return false;
  const angle = Math.atan2(dy * 2, dx);
  const sector = Math.round(angle / (Math.PI / 4));
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0]];
  const [sx, sy] = dirs[(sector + 8) % 8];
  sendDir(sx, sy);
  return true;
}

$('frame').addEventListener('pointerdown', e => {
  if (!run) return;
  e.preventDefault();
  $('frame').setPointerCapture(e.pointerId);
  if (run.prompt) return;   // answers are buttons
  // Before the first level there's no player to walk: any key will do
  if (!run.ctrl[CTRL.PX]) return sendKey(32, 57);
  run.target = cellAt(e);
  hold(() => { if (!run?.target || !stepToward(run.target)) release(); });
});
$('frame').addEventListener('pointermove', e => { if (run?.target && e.buttons) run.target = cellAt(e); });
for (const type of ['pointerup', 'pointercancel']) $('frame').addEventListener(type, () => { if (run) run.target = null; release(); });

// ---------- buttons ----------

$('side').addEventListener('click', e => {
  const key = e.target.closest('button')?.dataset.key;
  if (key) sendChar(key);
});

function toggleKeys() {
  const k = $('keys');
  k.hidden = !k.hidden;
  $('keysBtn').classList.toggle('on', !k.hidden);
  if (!k.hidden && !k.firstChild) {
    const keys = [...'1234567890-=', 'Bksp', ...'QWERTYUIOP[]', 'Enter', ...'ASDFGHJKL;\'', 'Esc', 'Space', ...'ZXCVBNM,./', '↑', '↓', '←', '→'];
    const codes = { Bksp: [8, 14], Enter: [13, 28], Esc: [27, 1], Space: [32, 57], '↑': [0, 72], '↓': [0, 80], '←': [0, 75], '→': [0, 77] };
    k.replaceChildren(...keys.map(label => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      if (label.length > 1) b.className = 'wide';
      b.onclick = () => (codes[label] ? sendKey(...codes[label]) : sendChar(label));
      return b;
    }));
  }
  fit();
}
$('keysBtn').onclick = toggleKeys;

$('soundBtn').onclick = () => {
  settings.set('sound', !settings.get('sound', true));
  applySound();
};
function applySound() {
  const on = settings.get('sound', true);
  $('soundBtn').textContent = on ? 'Sound on' : 'Sound off';
  $('soundBtn').classList.toggle('on', on);
  if (run?.gain) run.gain.gain.value = on ? 1 : 0;
  if (on && run?.audio?.state === 'suspended') run.audio.resume().catch(() => {});
}

$('speedBtn').onclick = () => {
  const i = (settings.get('speed', 1) + 1) % SPEEDS.length;
  settings.set('speed', i);
  applySpeed();
};
function applySpeed() {
  const [label, value] = SPEEDS[settings.get('speed', 1)] || SPEEDS[1];
  $('speedBtn').textContent = label;
  if (run) run.ctrl[CTRL.SPEED] = value;
}

$('quitBtn').onclick = () => stop();

// The question on screen, with an answer button for each choice
function promptKeys(text) {
  if (/\(Y\/N\)\?/.test(text)) return [['Yes', 'Y'], ['No', 'N']];
  if (/Novice, an Experienced or an Advanced/.test(text)) return [['Novice', 'N'], ['Experienced', 'E'], ['Advanced', 'A']];
  const menu = /Your choice \(([A-Z/]+)\)\?/.exec(text);
  if (menu) return menu[1].split('/').map(k => [MENU[k] || k, k]);
  if (/: A, B or C\?/.test(text)) return [['A', 'A'], ['B', 'B'], ['C', 'C'], ['Cancel', '\x1b']];
  if (/press any key/i.test(text) && !/begin this level/i.test(text)) return [['Continue', ' ']];
  return null;
}

function updatePrompt() {
  const line = run.ctrl[CTRL.LINE] > 0;
  const keys = line ? null : promptKeys(screenText());
  const sig = keys ? keys.map(k => k[1]).join('') : '';
  if (sig !== run.promptSig) {
    run.promptSig = sig;
    run.prompt = keys;
    run.focus = 0;
    $('prompt').hidden = !keys;
    $('prompt').replaceChildren(...(keys || []).map(([label, key], i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.onclick = () => (key === ' ' ? sendKey(32, 57) : key === '\x1b' ? sendKey(27, 1) : sendChar(key));
      if (i === 0) b.classList.add('focus');
      return b;
    }));
    fit();
  }
  if (line !== !$('line').hidden) {
    $('line').hidden = !line;
    if (line) {
      $('lineText').value = '';
      $('lineText').maxLength = run.ctrl[CTRL.LINE];
      $('lineText').focus();
    }
    fit();
  }
}

// The name for the high scores goes in a text box (so the car's keyboard
// comes up), then to the game as keys
$('line').onsubmit = e => {
  e.preventDefault();
  for (const ch of $('lineText').value) if (ch.charCodeAt(0) < 256) sendChar(ch);
  sendKey(13, 28);
  $('lineText').blur();
};

// ---------- controllers ----------

// Buttons come only from standard-mapped pads when there are any (the car
// shows each controller twice, raw and standard); see retro.js
function readPad() {
  const pads = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean);
  const std = pads.filter(p => p.mapping === 'standard');
  const p = (std.length ? std : pads)[0];
  if (!p) return null;
  const on = i => !!p.buttons[i]?.pressed;
  const ax = p.axes;
  const s = { x: 0, y: 0 };
  if (ax[0] < -0.5) s.x = -1; else if (ax[0] > 0.5) s.x = 1;
  if (ax[1] < -0.5) s.y = -1; else if (ax[1] > 0.5) s.y = 1;
  if (p.mapping === 'standard') {
    if (on(12)) s.y = -1; if (on(13)) s.y = 1; if (on(14)) s.x = -1; if (on(15)) s.x = 1;
    s.a = on(1); s.b = on(0); s.start = on(9); s.select = on(8);
  } else {
    s.a = on(0); s.b = on(1); s.start = on(11); s.select = on(10);
  }
  return s;
}

function pollPad() {
  const s = readPad();
  const was = run.pad || {};
  run.pad = s || {};
  if (!s) return;
  const pressed = k => s[k] && !was[k];
  if (run.prompt) {
    // Left and right pick an answer, A gives it
    const buttons = [...$('prompt').children];
    if (s.x && s.x !== was.x) {
      run.focus = (run.focus + s.x + buttons.length) % buttons.length;
      buttons.forEach((b, i) => b.classList.toggle('focus', i === run.focus));
    }
    if (pressed('a') || pressed('start')) buttons[run.focus]?.click();
    if (pressed('b')) sendKey(27, 1);
    return;
  }
  const dir = `${s.x},${s.y}`;
  if (dir !== run.padDir) {
    run.padDir = dir;
    if (s.x || s.y) hold(() => sendDir(s.x, s.y));
    else release();
  }
  if (pressed('a')) sendChar('W');
  if (pressed('b')) sendChar('T');
  if (pressed('start')) sendChar('P');
}

// ---------- playing ----------

function frame() {
  if (!run) return;
  run.raf = requestAnimationFrame(frame);
  draw(false);
  pollPad();
  const t = performance.now();
  if (t - run.checked > 150) { run.checked = t; updatePrompt(); }
}

async function play(game, button) {
  if (run) return;
  button?.classList.add('busy');
  // Sound has to start inside the tap
  let audio = null;
  try { audio = new AudioContext(); } catch {}
  const saved = await filesOf(game.id);
  const screen = new SharedArrayBuffer(4000), ctrl = new SharedArrayBuffer(16 * 4), keys = new SharedArrayBuffer((2 + KEY_SLOTS) * 4);
  run = {
    game, screen: new Uint16Array(screen), ctrl: new Int32Array(ctrl), keys: new Int32Array(keys),
    drawn: new Uint16Array(2000).fill(0xffff), checked: 0, promptSig: null, audio,
  };
  run.screen.fill(32 | 7 << 8);
  applySpeed();
  let port = null;
  if (audio) {
    try {
      await audio.audioWorklet.addModule('speaker.js');
      const node = new AudioWorkletNode(audio, 'speaker', { numberOfInputs: 0, outputChannelCount: [1] });
      const soft = new BiquadFilterNode(audio, { type: 'lowpass', frequency: 7000 });
      run.gain = new GainNode(audio, { gain: 1 });
      node.connect(soft).connect(run.gain).connect(audio.destination);
      port = node.port;
    } catch { port = null; }
  }
  applySound();
  if (!atlas) atlas = buildAtlas();
  const worker = new Worker('worker.js', { type: 'module' });
  run.worker = worker;
  const current = run;
  worker.onmessage = ({ data }) => {
    if (run !== current) return;
    if (data.type === 'file') saveFile(game.id, data.name, data.records);
    else if (data.type === 'exit') stop();
    else if (data.type === 'error') failed(data.message);
  };
  worker.onerror = e => { if (run === current) failed(e.message || 'the game stopped working'); };
  worker.postMessage({ type: 'start', game: game.id, screen, ctrl, keys, audio: port, files: saved, seed: window.krozSeed }, port ? [port] : []);
  $('library').hidden = true;
  $('player').hidden = false;
  button?.classList.remove('busy');
  document.title = `${game.title} · ASCII Quests`;
  keepAwake(true);
  fit();
  draw(true);
  run.raf = requestAnimationFrame(frame);
}

function stop() {
  if (!run) return;
  const r = run;
  run = null;
  cancelAnimationFrame(r.raf);
  release();
  r.worker.terminate();
  r.audio?.close().catch(() => {});
  keepAwake(false);
  $('player').hidden = true;
  $('prompt').hidden = true;
  $('line').hidden = true;
  $('library').hidden = false;
  document.title = 'ASCII Quests';
}

function failed(message) {
  stop();
  $('failedText').textContent = `Something went wrong inside the game: ${String(message).split('\n')[0]}`;
  $('failed').hidden = false;
}
$('failedOk').onclick = () => { $('failed').hidden = true; };

// A hidden screen holds the game, so monsters don't move while nobody's
// watching, and its sound, so a note can't drone on
document.addEventListener('visibilitychange', () => {
  if (!run) return;
  Atomics.store(run.ctrl, CTRL.HOLD, document.hidden ? 1 : 0);
  Atomics.notify(run.ctrl, CTRL.HOLD);
  if (document.hidden) run.audio?.suspend().catch(() => {});
  else applySound();
});

// The hub closes apps at once; nothing here waits to be saved (the games
// write their files as they go)
addEventListener('message', e => {
  if (e.source !== parent || e.data?.frunk !== 'close') return;
  e.source.postMessage({ frunk: 'closed' }, e.origin);
});

if (!crossOriginIsolated) {
  $('games').before(Object.assign(document.createElement('p'), { className: 'howto', textContent: 'This browser can\'t run these games here (shared memory is off).' }));
}
// For tools/e2e.mjs: the screen's text and the player's place
window.asciiState = () => run && { text: screenText(), px: run.ctrl[CTRL.PX], py: run.ctrl[CTRL.PY], line: run.ctrl[CTRL.LINE] };

renderLibrary();
applySound();
applySpeed();
