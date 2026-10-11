// Sleep Sounds: mix generated nature sounds, a dim night clock, and a sleep
// timer that fades everything out. Settings persist per browser.
import { Ambient, SOUNDS } from '/_shared/ambient.js';

const STORE_KEY = 'sleep.settings';
const TIMER_CHOICES = [0, 15, 30, 60, 90]; // minutes; 0 = off
const FADE_SECONDS = 60;
const AUTO_DIM_MS = 60_000;

const PRESETS = {
  'Rainy night': { rain: 0.75, wind: 0.3 },
  'Campfire': { fire: 0.75, crickets: 0.45 },
  'Beach': { ocean: 0.8, wind: 0.2 },
  'Forest night': { crickets: 0.6, wind: 0.35 },
  'Deep sleep': { brown: 0.7, fan: 0.35 },
};

const ICONS = {
  rain: '<path d="M7 15a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 17 8a3.5 3.5 0 0 1 .5 7"/><path d="M9 18l-1 2M13 18l-1 2M17 18l-1 2"/>',
  ocean: '<path d="M2 10c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/><path d="M2 15c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/>',
  fire: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5Z"/><path d="M5 21h14"/>',
  crickets: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/><path d="M17 3v2M16 4h2M20 8v1.5M19.25 8.75h1.5"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h16a3 3 0 1 1-3 3"/><path d="M3 16h7"/>',
  brown: '<path d="M2 12h2l2-6 3 12 3-9 2 6 2-3h6"/>',
  fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7s2 5-2.5 7.5M14 12.5c3.5 2 6 4 4.5 6.5s-5.5-.5-6-5M10.2 13c-3.5 2-7 2.5-7.5-.5S6 8 10.5 10.8"/>',
};

const $ = id => document.getElementById(id);
const amb = new Ambient();
const state = load();
let timerEnd = 0, fading = false, lastInput = Date.now(), wakeLock = null;

function load() {
  const fallback = { levels: {}, timer: 0, h24: false };
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(STORE_KEY)) }; } catch { return fallback; }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
}

// ---------- clock ----------

function fmtTime(d) {
  if (state.h24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?[AP]M$/i, '');
}
function tickClock() {
  const now = new Date();
  $('time').textContent = $('dimTime').textContent = fmtTime(now);
  $('date').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}
$('clockBtn').onclick = () => { state.h24 = !state.h24; save(); tickClock(); };

// ---------- sound tiles ----------

const tiles = {};
for (const [name, { label }] of Object.entries(SOUNDS)) {
  const tile = document.createElement('div');
  tile.className = 'tile';
  tile.innerHTML = `
    <button type="button" aria-pressed="false">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>
      <span>${label}</span>
    </button>
    <input type="range" min="0.05" max="1" step="0.01" aria-label="${label} volume">`;
  const btn = tile.querySelector('button'), range = tile.querySelector('input');
  range.value = state.levels[name] || 0.6;
  btn.onclick = () => setSound(name, amb.voices.has(name) ? 0 : Number(range.value));
  range.oninput = () => setSound(name, Number(range.value));
  tiles[name] = { tile, btn, range };
  $('grid').appendChild(tile);
}

async function ensureAudio() {
  await amb.start();
  if (fading) { // touched during the sleep fade: bring the sound back, restart the timer
    fading = false;
    amb.fadeTo(1, 0.5);
    startTimer();
  }
}

async function setSound(name, level) {
  await ensureAudio();
  amb.setLevel(name, level);
  if (level > 0) state.levels[name] = level; else delete state.levels[name];
  save();
  renderTiles();
  updateWakeLock();
}

function renderTiles() {
  for (const [name, t] of Object.entries(tiles)) {
    const on = !!state.levels[name] && amb.voices.has(name);
    t.tile.classList.toggle('on', on);
    t.btn.setAttribute('aria-pressed', String(on));
    if (state.levels[name]) t.range.value = state.levels[name];
  }
  $('resume').hidden = amb.playing || !Object.keys(state.levels).length;
  for (const chip of $('presets').querySelectorAll('[data-preset]')) {
    const p = PRESETS[chip.dataset.preset];
    const match = Object.keys(SOUNDS).every(n => (p[n] || 0) === (amb.voices.has(n) ? state.levels[n] || 0 : 0));
    chip.setAttribute('aria-pressed', String(match));
  }
}

// ---------- presets ----------

for (const name of Object.keys(PRESETS)) {
  const chip = document.createElement('button');
  chip.className = 'chip';
  chip.type = 'button';
  chip.textContent = name;
  chip.dataset.preset = name;
  chip.onclick = () => applyMix(PRESETS[name]);
  $('presets').appendChild(chip);
}

// Saved mix from last time; audio can only start after a tap
$('resume').onclick = () => applyMix({ ...state.levels });

async function applyMix(p) {
  await ensureAudio();
  for (const n of Object.keys(SOUNDS)) amb.setLevel(n, p[n] || 0);
  state.levels = { ...p };
  save();
  renderTiles();
  updateWakeLock();
}

$('stop').onclick = () => {
  amb.stopAll();
  state.levels = {};
  save();
  renderTiles();
  updateWakeLock();
};

// ---------- sleep timer ----------

for (const minutes of TIMER_CHOICES) {
  const chip = document.createElement('button');
  chip.className = 'chip';
  chip.type = 'button';
  chip.textContent = minutes ? `${minutes}m` : 'Off';
  chip.onclick = () => { state.timer = minutes; save(); startTimer(); };
  $('timers').appendChild(chip);
}

function startTimer() {
  timerEnd = state.timer ? Date.now() + state.timer * 60_000 : 0;
  [...$('timers').children].forEach((c, i) => c.setAttribute('aria-pressed', String(TIMER_CHOICES[i] === state.timer)));
  tickTimer();
}

async function tickTimer() {
  if (!timerEnd || !amb.playing) { $('countdown').textContent = ''; return; }
  const left = Math.max(0, timerEnd - Date.now());
  const m = Math.floor(left / 60_000), s = Math.floor(left / 1000) % 60;
  $('countdown').textContent = `${m}:${String(s).padStart(2, '0')}`;
  if (left <= FADE_SECONDS * 1000 && !fading) {
    fading = true;
    await amb.fadeTo(0, left / 1000);
    if (!fading) return; // the user tapped something during the fade
    amb.stopAll();
    await amb.fadeTo(1, 0.01);
    fading = false;
    timerEnd = 0;
    renderTiles();
    updateWakeLock();
    $('countdown').textContent = '';
  }
}

// ---------- dim mode, wake lock ----------

function setDim(on) {
  $('dim').hidden = !on;
}
$('dimBtn').onclick = () => setDim(true);
$('dim').onclick = () => { setDim(false); lastInput = Date.now(); };
addEventListener('pointerdown', () => { lastInput = Date.now(); }, true);

async function updateWakeLock() {
  try {
    if (amb.playing && !wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!amb.playing && wakeLock) {
      await wakeLock.release();
    }
  } catch { /* not allowed here; the car's own screen settings apply */ }
}

setInterval(() => {
  tickClock();
  tickTimer();
  if (amb.playing && $('dim').hidden && Date.now() - lastInput > AUTO_DIM_MS) setDim(true);
}, 1000);

tickClock();
startTimer();
renderTiles();
