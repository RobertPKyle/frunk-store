// Road Trip Postcard: turns where the car is into a vintage postcard. The QR
// code holds the card's details, and the phone page draws its own copy, so no
// server stores anything. See card.js.
import { PALETTES, STYLES, drawCard, encode, loadFonts, loadMap, loadRidges } from './card.js';
import { qr } from '../_shared/qr.js';
import { getPlace, herePlace, pickPlace, savePlace } from '../_shared/place.js';

const SETTINGS_KEY = 'postcard.settings';
const LINES = ['Wish you were here', 'Made it!', 'Charging up', 'Camping tonight', 'Road trip!', 'Having a great time', 'Greetings from the road'];
const MAX_NAME = 28, MAX_LINE = 42;

const $ = id => document.getElementById(id);
const card = $('card');
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
};

const saved = { style: 'g', line: LINES[0], ...store.get(SETTINGS_KEY) };
const spec = {
  lat: 0, lon: 0, name: '', area: '', line: saved.line, style: Object.hasOwn(STYLES, saved.style) ? saved.style : 'g',
  palette: 'day', temp: '', weather: null, date: '',
};
let place = null;
let names = [];          // what this spot could be called
let customName = false, customLine = !LINES.includes(saved.line) && !!saved.line, paletteChosen = false;
let mapImage = null, mapKey = '', ridges = null, ridgesKey = '';
let token = 0;

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function save() { store.set(SETTINGS_KEY, { style: spec.style, line: spec.line }); }
function setStatus(text) { $('status').textContent = text; }

// ---------- drawing and the QR code ----------

let drawQueued = false;
function redraw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => {
    drawQueued = false;
    if (!spec.name) return;
    drawCard(card, spec, { mapImage, ridges });
  });
}

let qrTimer = 0;
function updateCode() {
  clearTimeout(qrTimer);
  qrTimer = setTimeout(() => {
    if (!spec.name) return;
    qr($('qr'), `${location.origin}/postcard/view.html#${encode(spec)}`, 152).catch(() => setStatus('Can\'t make the QR code. Check the connection.'));
  }, 150);
}

function changed() {
  redraw();
  updateCode();
  loadAssets();
}

// The Greetings look needs the map and the poster needs the skyline. Each is
// fetched only when that look is showing.
async function loadAssets() {
  const key = `${spec.lat.toFixed(2)},${spec.lon.toFixed(2)}`, mine = token;
  if (spec.style === 'g' && mapKey !== key) {
    mapKey = key;
    mapImage = null;
    setStatus('Drawing the map…');
    try {
      const image = await loadMap(+spec.lat.toFixed(2), +spec.lon.toFixed(2));
      if (mine !== token) return;
      mapImage = image;
      setStatus('');
      redraw();
    } catch (e) {
      if (mine !== token) return;
      mapKey = '';
      setStatus('Can\'t load the map. The card still works without it.');
    }
  } else if (spec.style === 'p' && ridgesKey !== key) {
    ridgesKey = key;
    ridges = null;
    try {
      const rows = await loadRidges(+spec.lat.toFixed(2), +spec.lon.toFixed(2));
      if (mine !== token) return;
      ridges = rows;
      redraw();
    } catch (e) {
      if (mine !== token) return;
      ridgesKey = '';
    }
  }
}

// ---------- about this spot ----------

// The name people would use, then wider ones. The street address isn't asked
// for: a town is all a postcard needs.
async function lookUpNames(p) {
  const list = [];
  if (!/^Here\b/.test(p.name)) list.push(p.name);
  let area = '';
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${p.lat.toFixed(2)}&lon=${p.lon.toFixed(2)}&zoom=12&accept-language=en`);
    if (res.ok) {
      const a = (await res.json()).address || {};
      const local = a.city || a.town || a.village || a.hamlet || a.municipality || a.suburb;
      for (const n of [local, a.county, a.state, a.country]) if (n && !list.includes(n)) list.push(n);
      area = a.state || a.country || '';
    }
  } catch {}
  return { list: list.filter(n => n.length <= MAX_NAME), area };
}

async function lookUpWeather(p) {
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat.toFixed(2)}&longitude=${p.lon.toFixed(2)}&current=temperature_2m,weather_code,is_day&temperature_unit=${useFahrenheit() ? 'fahrenheit' : 'celsius'}&timezone=auto`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Follows Weather's °F/°C choice; until then, the US uses °F
function useFahrenheit() {
  const units = store.get('weather.units');
  return units ? units === 'us' : /-US$/.test(navigator.language);
}

// A palette to suit the hour where the car is
function paletteFor(hour, isDay) {
  if (!isDay) return 'night';
  if (hour < 9) return 'dawn';
  if (hour >= 17) return 'sunset';
  return 'day';
}

function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function setPlace(p) {
  if (!p) return;
  place = p;
  const mine = ++token;
  $('placeBtn').textContent = p.name;
  spec.lat = p.lat;
  spec.lon = p.lon;
  spec.date = localDate();
  customName = false;
  names = /^Here\b/.test(p.name) ? [] : [p.name];
  spec.name = names[0] || 'The Open Road';
  spec.area = '';
  renderNames();
  changed();
  const [found, weather] = await Promise.all([lookUpNames(p), lookUpWeather(p).catch(() => null)]);
  if (mine !== token) return;
  names = found.list;
  if (names[0] && !customName) spec.name = names[0];
  spec.area = found.area && found.area !== spec.name ? found.area : '';
  if (weather?.current) {
    const c = weather.current;
    spec.temp = `${Math.round(c.temperature_2m)}°${useFahrenheit() ? 'F' : 'C'}`;
    spec.weather = c.weather_code;
    // Its time string is local to the spot, which matters for a picked place far away
    spec.date = (c.time || '').slice(0, 10) || spec.date;
    if (!paletteChosen) spec.palette = paletteFor(+(c.time || '').slice(11, 13), !!c.is_day);
  }
  renderNames();
  renderLooks();
  changed();
}

function useCar() {
  if (!navigator.geolocation) { pickPlace().then(setPlace); return; }
  $('placeBtn').textContent = 'Finding this car…';
  navigator.geolocation.getCurrentPosition(
    pos => {
      const p = herePlace(pos.coords.latitude, pos.coords.longitude);
      savePlace(p);
      setPlace(p);
    },
    () => {
      $('placeBtn').textContent = place?.name || 'Set location';
      pickPlace().then(setPlace);
    },
    { timeout: 12000, maximumAge: 60_000 },
  );
}

// ---------- choices ----------

function chip(text, pressed, onclick) {
  const b = el('button', { className: 'chip', type: 'button', textContent: text });
  b.setAttribute('aria-pressed', String(pressed));
  b.onclick = onclick;
  return b;
}

// Picking "Type your own" swaps the chip for a text box
function typeBox(value, max, label, onInput) {
  const input = el('input', { className: 'type', type: 'text', value, maxLength: max, enterKeyHint: 'done' });
  input.setAttribute('aria-label', label);
  input.addEventListener('input', () => onInput(input.value));
  return input;
}

function renderNames() {
  const box = $('names');
  const parts = names.map(n => chip(n, !customName && spec.name === n, () => {
    customName = false;
    spec.name = n;
    renderNames();
    changed();
  }));
  if (customName) {
    const input = typeBox(spec.name, MAX_NAME, 'Name on the card', value => {
      if (!value.trim()) return;
      spec.name = value;
      changed();
    });
    parts.push(input);
    box.replaceChildren(...parts);
    input.focus();
    return;
  }
  parts.push(chip('Type your own', false, () => { customName = true; renderNames(); }));
  box.replaceChildren(...parts);
}

function renderLines() {
  const box = $('lines');
  const parts = LINES.map(line => chip(line, !customLine && spec.line === line, () => {
    customLine = false;
    spec.line = line;
    save();
    renderLines();
    changed();
  }));
  parts.push(chip('No message', !customLine && !spec.line, () => {
    customLine = false;
    spec.line = '';
    save();
    renderLines();
    changed();
  }));
  if (customLine) {
    const input = typeBox(spec.line, MAX_LINE, 'Message on the card', value => {
      spec.line = value;
      save();
      changed();
    });
    box.replaceChildren(input, ...parts);
    box.scrollLeft = 0;
    return;
  }
  parts.unshift(chip('Type your own', false, () => { customLine = true; spec.line = ''; renderLines(); box.querySelector('input').focus(); }));
  box.replaceChildren(...parts);
}

function renderLooks() {
  const parts = [];
  for (const [key, name] of Object.entries(STYLES)) {
    parts.push(chip(name, spec.style === key, () => {
      spec.style = key;
      save();
      renderLooks();
      changed();
    }));
  }
  parts.push(el('i', { className: 'gap' }));
  for (const [key, pal] of Object.entries(PALETTES)) {
    parts.push(chip(pal.name, spec.palette === key, () => {
      spec.palette = key;
      paletteChosen = true;
      renderLooks();
      changed();
    }));
  }
  $('looks').replaceChildren(...parts);
}

$('placeBtn').onclick = () => pickPlace().then(setPlace);
$('hereBtn').onclick = useCar;

// ---------- start ----------

renderLines();
renderLooks();

(async () => {
  await loadFonts();
  // This app is about where the car is now, so use the car's location whenever
  // the browser has already been allowed to share it.
  let granted = false;
  try { granted = (await navigator.permissions.query({ name: 'geolocation' })).state === 'granted'; } catch {}
  const had = getPlace();
  if (granted) useCar();
  else if (had) setPlace(had);
  else setPlace(await pickPlace({ required: true }));
})();
