// Beach Conditions: water temperature, waves, wind and tide near the car, drawn
// as a side view of a beach. The wave height and the tide are to scale with the
// person on the sand, the water's color follows its temperature, and the waves
// roll in at the period the buoy measured.
//
// Readings come through /api/beach, which hands every car the same whole list,
// so the car's location stays here. Tides and alerts come straight from NOAA
// and the National Weather Service, which allow browsers.
import { julianDay, localSiderealTime, sun, toHorizon } from '../_shared/astro.js';
import { ago as agoFrom, getPlace, herePlace, locationError, pickPlace, savePlace } from '../_shared/place.js';
import { setMiles, useMiles } from '../_shared/units.js';

const TIDE_API = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
const ALERT_API = 'https://api.weather.gov/alerts/active';
const UNITS_KEY = 'weather.units';      // the °F/°C choice Weather keeps
const REFRESH = 10 * 60_000;
const WAIT = 20_000;     // a request that hasn't answered by now has failed
const CACHE_KEY = 'beach.cache';
const CACHE_FOR = 48 * 3600_000;   // readings older than this say little about the water now
const CACHE_KM = 25;     // how far the car can move and still use them
const LIST_SIZE = 30;
const FAR_KM = 150;      // beyond this, the app says these readings aren't about here
const TIDE_KM = 60;      // tides change along a coast, so only a close station counts
const AFLOAT_KM = 40;
// NDBC's short names for some operators
const OPERATORS = { NOS: 'NOAA', NDBC: 'NOAA', 'NOAA NOS PORTS': 'NOAA', SCRIPPS: 'CDIP, Scripps' };
const BEACH_ALERT = /beach|rip current|surf|coastal|lakeshore|tsunami|seas|sneaker/i;

const $ = id => document.getElementById(id);
const scene = $('scene');

let miles = useMiles();
let useF = readUnits();
let place = null;
let stations = null;       // nearest first, for the current place
let pinned = null;         // a station picked from the list, or null for the nearest of each reading
let tide = null;           // { name, list: [{ at, v, high }] }
let tideNote = '';
let alerts = null;         // [] when checked and clear, null when there's no alert service here
let alertsFailed = false;  // the check for alerts didn't get through
let seaNote = '';          // says when these readings are a saved copy
let savedAt = 0;           // when that copy was saved
let rawSea = null;         // the latest readings, nearest first, as they'd be saved
let loadedAt = 0;
let loadToken = 0;
let tideStations = null;
let seaKey = '';

function readUnits() {
  try {
    const v = JSON.parse(localStorage.getItem(UNITS_KEY));
    if (v) return v === 'us';
  } catch {}
  return /-US$/.test(navigator.language);
}

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

const fetchJson = async url => {
  const res = await fetch(url, { signal: AbortSignal.timeout(WAIT) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// ---------- numbers and words ----------

const RAD = Math.PI / 180;

function kmBetween(a, b) {
  const dLat = (b.lat - a.lat) * RAD, dLon = (b.lon - a.lon) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

function bearing(a, b) {
  const y = Math.sin((b.lon - a.lon) * RAD) * Math.cos(b.lat * RAD);
  const x = Math.cos(a.lat * RAD) * Math.sin(b.lat * RAD) - Math.sin(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.cos((b.lon - a.lon) * RAD);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

const compass = deg => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];

const temp = c => `${Math.round(useF ? c * 9 / 5 + 32 : c)}°${useF ? 'F' : 'C'}`;
const height = m => (miles ? `${(m * 3.28084).toFixed(1)} ft` : `${m.toFixed(1)} m`);
const speed = ms => (miles ? `${Math.round(ms * 2.23694)} mph` : `${Math.round(ms * 3.6)} km/h`);

function distance(km) {
  const n = miles ? km * 0.621371 : km;
  const unit = miles ? 'mi' : 'km';
  return n < 1 ? `under 1 ${unit}` : `${Math.round(n).toLocaleString('en-US')} ${unit}`;
}

function ago(seconds) {
  const min = Math.round((Date.now() / 1000 - seconds) / 60);
  if (min < 2) return 'just now';
  return min < 90 ? `${min} min ago` : `${Math.round(min / 60)} hr ago`;
}

const isHere = () => /^Here\b/.test(place?.name || '');

function clock(ms, zone = false) {
  const options = { hour: 'numeric', minute: '2-digit' };
  if (place?.tz) options.timeZone = place.tz;
  if (zone) options.timeZoneName = 'short';
  return new Date(ms).toLocaleTimeString(undefined, options);
}

// "CST", for saying which clock the times are on when away from the car
const zoneName = ms => clock(ms, true).split(' ').pop();

// General guidance, written for this app. Not a judgement that the water is safe.
function waterWords(c) {
  if (c < 12) return 'Very cold. Thick wetsuit water.';
  if (c < 18) return 'Cold. Most people want a wetsuit.';
  if (c < 22) return 'Cool. Refreshing once you are in.';
  if (c < 27) return 'Comfortable for most swimmers.';
  return 'Warm, like a bath.';
}

function waveWords(m, seconds, from) {
  const size = m < 0.3 ? 'Nearly flat' : m < 1 ? 'Small' : m < 2 ? 'Moderate' : m < 3.5 ? 'Big' : 'Very big';
  const direction = from === null ? '' : ` from the ${compass(from)}`;
  if (seconds === null) return `${size} waves${direction}.`;
  const kind = seconds < 7 ? 'choppy wind waves' : seconds < 11 ? 'waves' : 'long swell';
  return `${size} ${kind}${direction}, every ${Math.round(seconds)}\u00a0s.`;
}

const label = s => (s.name ? s.name.split(' - ')[0] : `Station ${s.id}`);
const fromLine = s => `${label(s)}, ${distance(s.km)} ${compass(s.bearing)}, ${ago(s.at)}`;

// ---------- which station gives which number ----------

function picks() {
  if (pinned) return { water: pinned, wave: pinned, wind: pinned, air: pinned };
  // Each number from the closest station that has it, unless that's much further
  const reach = Math.max(FAR_KM, stations[0].km * 1.5);
  const closest = field => stations.find(s => s[field] !== null && s.km <= reach) || null;
  // A harbor gauge says little about the open beach, so a buoy not much further wins
  const sea = field => {
    const near = closest(field);
    return (near && stations.find(s => s.floats && s[field] !== null && s.km <= near.km + AFLOAT_KM)) || near;
  };
  // Air and wind only count close by
  const local = field => { const near = closest(field); return near && near.km <= FAR_KM ? near : null; };
  return { water: sea('water'), wave: sea('wave'), wind: local('wind'), air: local('air') };
}

// ---------- tide ----------

function tideNow(now = Date.now()) {
  if (!tide) return null;
  const list = tide.list;
  const i = list.findIndex(p => p.at > now);
  if (i < 1) return null;
  const prev = list[i - 1], next = list[i];
  const f = (now - prev.at) / (next.at - prev.at);
  const around = list.slice(i - 1, i + 2);
  return {
    level: prev.v + (next.v - prev.v) * (1 - Math.cos(Math.PI * f)) / 2,
    rising: next.high,
    hi: Math.max(...around.map(p => p.v)),
    lo: Math.min(...around.map(p => p.v)),
    nextHigh: list.slice(i).find(p => p.high),
    nextLow: list.slice(i).find(p => !p.high),
  };
}

// ---------- the Sun, for the sky and the next sunset ----------

function sunAltitude(ms) {
  const jd = julianDay(new Date(ms));
  const s = sun(jd);
  return toHorizon(s.ra, s.dec, place.lat, localSiderealTime(jd, place.lon)).alt;
}

const HORIZON = -0.833;

function nextSunEvent(now) {
  const up = sunAltitude(now) > HORIZON;
  const step = 15 * 60_000;
  for (let t = now + step; t < now + 30 * 3600_000; t += step) {
    if (sunAltitude(t) > HORIZON === up) continue;
    let a = t - step, b = t;
    for (let i = 0; i < 6; i++) {
      const m = (a + b) / 2;
      if (sunAltitude(m) > HORIZON === up) a = m; else b = m;
    }
    return { name: up ? 'Sunset' : 'Sunrise', at: b };
  }
  return null;
}

// ---------- drawing ----------

const hex = rgb => `#${rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);

// Slate when it's cold, through blue-green, to shallow-tropics turquoise
function seaColor(c) {
  const stops = [[4, [58, 104, 124]], [14, [34, 120, 146]], [22, [22, 142, 158]], [29, [18, 170, 170]]];
  if (c === null) return stops[1][1];
  if (c <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (c <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (c - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
  }
  return stops[stops.length - 1][1];
}

function lightAt(alt) {
  if (alt > 8) return { sky: ['#6fc4e6', '#d9f2f4'], sand: [239, 217, 167], wet: '#cdb07a', dim: 1, skyInk: '#10303c', sandInk: '#3a2f17', person: '#10303c' };
  if (alt > -1) return { sky: ['#6ea4cc', '#f8cd9c'], sand: [226, 193, 141], wet: '#b8935f', dim: 0.9, skyInk: '#10303c', sandInk: '#33280f', person: '#10303c' };
  if (alt > -7) return { sky: ['#20365f', '#a97890'], sand: [136, 118, 104], wet: '#6f5f55', dim: 0.65, skyInk: '#f6fbf8', sandInk: '#f6f1e2', person: '#e9f1f2' };
  return { sky: ['#071726', '#16334b'], sand: [86, 80, 66], wet: '#463f33', dim: 0.48, skyInk: '#e6f0f2', sandInk: '#ece5d2', person: '#dfeaec' };
}

const dark = (rgb, f) => mix(rgb, [4, 28, 38], f);

function waveTile(L, A, tileH, color) {
  const pts = [];
  for (let i = 0; i <= 32; i++) {
    const th = i / 32 * 2 * Math.PI;
    // Crests a little sharper than troughs. Crest to trough is exactly 2A.
    pts.push(`${(i / 32 * L).toFixed(1)} ${(tileH / 2 - A * (Math.cos(th) + 0.16 * Math.cos(2 * th))).toFixed(1)}`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${tileH}"><path fill="${color}" d="M${pts.join('L')}L${L} ${tileH}L0 ${tileH}Z"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const BUOY = `<svg width="38" height="60" viewBox="0 0 38 60"><path d="M19 2v20" stroke="#10303c" stroke-width="3"/><circle cx="19" cy="4" r="3.500" fill="#ff5a3c"/><path d="M11 22h16l5 20H6z" fill="#f6c516"/><path d="M8.500 32h21" stroke="#10303c" stroke-width="2.500"/><path d="M2 42h34v6a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z" fill="#d9a808"/></svg>`;
const PIER = `<svg width="54" height="400" viewBox="0 0 54 400"><g fill="#5b4a38"><rect x="6" y="14" width="8" height="386"/><rect x="40" y="14" width="8" height="386"/></g><rect y="4" width="54" height="11" fill="#7a6549"/><path d="M14 40l26 44M40 40L14 84" stroke="#5b4a38" stroke-width="3"/></svg>`;

function person(x, feet, h, color) {
  const w = h * 0.1, r = h * 0.085;
  const hip = feet - h * 0.47, neck = feet - h * 0.8, hand = feet - h * 0.47;
  return `<circle cx="${x}" cy="${feet - h + r}" r="${r}" fill="${color}"/>
    <path d="M${x} ${neck}V${hip}M${x} ${hip}L${x - h * 0.09} ${feet - w / 2}M${x} ${hip}L${x + h * 0.09} ${feet - w / 2}M${x - h * 0.15} ${hand}L${x} ${neck}L${x + h * 0.15} ${hand}"
      fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function drawScene(p) {
  const W = scene.clientWidth, H = scene.clientHeight;
  if (!W || !H) return;
  const unit = Math.min(1.2, H / 565);
  const now = Date.now();
  const t = tideNow(now);
  const light = lightAt(sunAltitude(now));
  scene.style.background = `linear-gradient(${light.sky[0]}, ${light.sky[1]} ${Math.round(H * 0.5)}px)`;
  document.documentElement.style.setProperty('--sky-ink', light.skyInk);
  document.documentElement.style.setProperty('--sand-ink', light.sandInk);

  const waveM = p?.wave?.wave ?? null;
  const seconds = p?.wave?.period ?? 8;
  const range = t ? t.hi - t.lo : 0;
  // One scale for the person, the wave and the tide. A huge sea shrinks the person.
  const scale = Math.max(8 * unit, Math.min(58 * unit, 140 * unit / Math.max(waveM ?? 0, 0.01), 100 * unit / Math.max(range, 0.01)));
  const A = waveM === null ? 2 : Math.max(1.5, waveM / 2 * scale);
  const L = Math.round((90 + 16 * seconds) * unit);
  const tile = Math.ceil(A * 2.6 + 8);
  const mid = Math.round(H * 0.47);
  const waterY = Math.round(mid - (t ? t.level - (t.hi + t.lo) / 2 : 0) * scale);

  const color = seaColor(p?.water?.water ?? null).map(v => v * light.dim);
  const front = hex(color), back = hex(dark(color, 0.22));

  // Rebuilt only when the waves change: this restarts their motion. The buoy and
  // the wave start together, which keeps it riding the swell it measures.
  const key = [W, H, L, A.toFixed(1), seconds, front, (p?.station || p?.wave || p?.water)?.floats ?? 1].join();
  if (key !== seaKey) {
    seaKey = key;
    scene.querySelectorAll('.wave, #marker').forEach(n => n.remove());
    scene.style.setProperty('--L', `${L}px`);
    scene.style.setProperty('--T', `${seconds}s`);
    scene.style.setProperty('--tile', `${tile}px`);
    scene.style.setProperty('--A', `${A.toFixed(1)}px`);
    const x0 = Math.round(W * 0.2);
    const backWave = el('div', { className: 'wave', id: 'waveBack' });
    backWave.style.cssText = `background-image:${waveTile(L, A * 0.8, tile, back)};background-position-x:${Math.round(L * 0.37)}px;z-index:1`;
    const frontWave = el('div', { className: 'wave', id: 'waveFront' });
    frontWave.style.cssText = `background-image:${waveTile(L, A, tile, front)};z-index:3`;
    const floats = (p?.station || p?.wave || p?.water)?.floats ?? 1;
    const marker = el('div', { className: floats ? 'float' : '', id: 'marker', innerHTML: floats ? BUOY : PIER });
    if (floats) {
      // Crest here at t = x0 / L * T, and the bob starts at its crest
      const crestAt = (x0 % L) / L * seconds;
      marker.style.animationDelay = `${-(seconds - crestAt).toFixed(3)}s`;
    } else {
      marker.style.cssText = 'position:absolute;z-index:2';
    }
    marker.style.left = `${x0}px`;
    scene.prepend(backWave, marker, frontWave);
  }
  const backWave = $('waveBack'), frontWave = $('waveFront'), marker = $('marker');
  backWave.style.top = `${waterY - tile / 2 - Math.round(A * 0.3 + 3)}px`;
  frontWave.style.top = `${waterY - tile / 2}px`;
  marker.style.top = marker.classList.contains('float') ? `${waterY - 46}px` : `${waterY - 92 * unit}px`;

  // Deep water darkens early enough to carry the text on it
  const deepTop = waterY + tile / 2 - 1;
  const textTop = H - $('waterText').offsetHeight - 16;
  const deep = $('deep');
  deep.style.top = `${deepTop}px`;
  deep.style.background = `linear-gradient(${front}, ${hex(dark(color, 0.62))} ${Math.max(10, textTop - deepTop)}px, ${hex(dark(color, 0.78))})`;

  // The beach: a slope up to a dry berm
  const x0 = W * 0.66, xB = W * 0.87, yB = mid - 74 * unit;
  const slopeX = y => x0 + (H - y) / (H - yB) * (xB - x0);
  const sand = `M${x0} ${H}L${xB} ${yB}L${W} ${yB - 5 * unit}V${H}Z`;
  let marks = '';
  if (t) {
    const y = v => mid - (v - (t.hi + t.lo) / 2) * scale;
    const yHi = y(t.hi), yLo = y(t.lo);
    marks = `<path d="M${slopeX(yHi)} ${yHi}L${slopeX(yLo)} ${yLo}" stroke="${light.wet}" stroke-width="7"/>`;
    if (yLo - yHi >= 18) {
      marks += `<g fill="${light.sandInk}"><text x="${slopeX(yHi) + 8}" y="${yHi + 4}">High</text><text x="${slopeX(yLo) + 8}" y="${yLo + 4}">Low</text></g>`;
    }
  }
  const px = xB + (W - xB) * 0.45;
  const py = yB - 2.5 * unit;
  $('shore').setAttribute('viewBox', `0 0 ${W} ${H}`);
  $('shore').innerHTML = `<path d="${sand}" fill="${hex(light.sand)}"/>${marks}${person(px, py, 1.75 * scale, light.person)}`;

  // The text keeps clear of the slope
  $('waterText').style.width = `${Math.max(150, slopeX(H - 8) - 26)}px`;
  const box = $('sandText');
  box.style.left = `${slopeX(H - 100) + 10}px`;
  box.style.left = `${slopeX(H - box.offsetHeight - 10) + 10}px`;
}

function setReading(bigId, value) {
  $(bigId).textContent = value ?? 'No reading';
  $(bigId).classList.toggle('none', value === null);
}

function render() {
  if (!place || !stations) { drawScene(null); return; }
  $('status').textContent = '';
  $('savedNote').textContent = seaNote;
  const p = picks();
  const now = Date.now();
  const nearest = stations[0];
  const here = isHere();

  $('title').textContent = pinned ? label(pinned) : here ? 'Near you' : `Near ${place.name}`;
  if (pinned) {
    const detail = pinned.name?.split(' - ')[1];
    $('where').textContent = `${distance(pinned.km)} ${compass(pinned.bearing)} of ${here ? 'you' : place.name}${detail ? `, ${detail}` : ''}. Run by ${OPERATORS[pinned.owner] || pinned.owner}.`;
  } else if (nearest.km > FAR_KM) {
    $('where').textContent = `The nearest reading is ${distance(nearest.km)} away, so this isn't your local water.`;
  } else {
    const source = p.wind || p.air;
    $('where').textContent = source ? `Air and wind from ${label(source)}, ${distance(source.km)} ${compass(source.bearing)}.` : '';
  }
  $('pickBeach').hidden = pinned !== null || nearest.km <= FAR_KM;

  const air = [];
  const addAir = (value, word) => air.push(el('span', {}, el('b', { textContent: value }), ` ${word}`));
  if (p.air?.air != null) addAir(temp(p.air.air), 'air');
  if (p.wind?.wind != null) {
    const gust = p.wind.gust != null ? `, gusts ${speed(p.wind.gust)}` : '';
    addAir(speed(p.wind.wind), `wind${p.wind.windFrom != null ? ` from the ${compass(p.wind.windFrom)}` : ''}${gust}`);
  }
  const sunNext = nextSunEvent(now);
  if (sunNext) addAir(clock(sunNext.at, !here), sunNext.name.toLowerCase());
  $('air').replaceChildren(...air);

  $('waterText').hidden = false;
  const hasWater = p.water && p.water.water !== null;
  setReading('waterBig', hasWater ? temp(p.water.water) : null);
  $('waterWords').textContent = hasWater ? waterWords(p.water.water) : `No water temperature ${pinned ? 'from this station' : 'close by'}.`;
  const hasWave = p.wave && p.wave.wave !== null;
  // One source line when both numbers share a station
  $('waterFrom').textContent = hasWater && !(hasWave && p.wave === p.water) ? fromLine(p.water) : '';
  setReading('waveBig', hasWave ? height(p.wave.wave) : null);
  $('waveWords').textContent = hasWave ? waveWords(p.wave.wave, p.wave.period, p.wave.waveFrom) : `No wave reading ${pinned ? 'from this station' : 'close by'}.`;
  $('waveFrom').textContent = hasWave ? fromLine(p.wave) : '';

  renderTide();
  renderAlerts();
  drawScene({ water: hasWater ? p.water : null, wave: hasWave ? p.wave : null, station: pinned });
}

function renderTide() {
  const t = tideNow();
  const box = $('sandText');
  if (!t) { box.replaceChildren(el('small', { textContent: tideNote })); return; }
  const line = e => (e ? `${e.high ? 'High' : 'Low'} ${height(e.v)}, ${clock(e.at)}` : '');
  const order = t.nextHigh && t.nextLow && t.nextHigh.at < t.nextLow.at ? [t.nextHigh, t.nextLow] : [t.nextLow, t.nextHigh];
  box.replaceChildren(
    el('b', { textContent: t.rising ? 'Tide rising' : 'Tide falling' }),
    ...order.map(e => el('div', { textContent: line(e) })),
    el('small', { textContent: `${tide.name}${isHere() ? '' : `, ${zoneName(Date.now())}`}` }),
  );
}

function renderAlerts() {
  const list = alerts || [];
  $('alertBtn').hidden = !list.length;
  if (list.length) {
    $('alertWords').textContent = list.length > 1 ? `${list[0].event} and ${list.length - 1} more` : list[0].event;
  } else {
    $('alertBox').hidden = true;
  }
  // Only by the water: an all-clear means nothing a long way inland
  const byWater = stations[0].km <= FAR_KM;
  $('alertNote').textContent = !byWater ? ''
    : alerts && !list.length ? 'No National Weather Service beach alerts for this spot right now.'
      : alertsFailed && !list.length ? 'Couldn\'t check for beach alerts just now.' : '';
}

function renderList() {
  const rows = [];
  const row = (title, left, right, station) => {
    const b = el('button', { className: 'row', type: 'button' },
      el('b', { textContent: title }),
      el('span', {}, el('i', { textContent: left }), el('i', { textContent: right })));
    b.setAttribute('aria-pressed', String(pinned === station));
    b.onclick = () => { pinned = station; renderList(); render(); };
    return b;
  };
  rows.push(row('Nearest readings', 'Each from the closest station', '', null));
  for (const s of stations.slice(0, LIST_SIZE)) {
    const values = [s.water !== null ? temp(s.water) : '', s.wave !== null ? height(s.wave) : ''].filter(Boolean).join(', ');
    rows.push(row(label(s), `${distance(s.km)} ${compass(s.bearing)}`, values, s));
  }
  $('rows').replaceChildren(...rows);
}

function showStatus(message, retry) {
  $('status').replaceChildren(message);
  if (retry) {
    const b = el('button', { type: 'button', textContent: 'Try again' });
    b.onclick = load;
    $('status').append(b);
  }
}

// ---------- loading ----------

// NOAA's tide predictions and the National Weather Service's alerts are for US
// waters, so nothing is asked from elsewhere.
const inUS = ({ lat, lon }) =>
  (lat > 15 && lat < 72 && lon > -180 && lon < -60) ||        // the 50 states, Puerto Rico
  (lat > 10 && lat < 21 && lon > 140 && lon < 150) ||         // Guam, the Marianas
  (lat > -16 && lat < -10 && lon > -175 && lon < -165);       // American Samoa

async function loadTide(p) {
  if (!inUS(p)) return { note: 'Tide times cover US coasts only.' };
  try {
    tideStations ||= await fetchJson('tides.json');
    let best = null, bestKm = TIDE_KM;
    for (const [id, name, lat, lon] of tideStations) {
      // Quick reject: a degree of latitude is 111 km
      if (Math.abs(lat - p.lat) > 1) continue;
      const km = kmBetween(p, { lat, lon });
      if (km < bestKm) { best = { id, name }; bestKm = km; }
    }
    if (!best) return { note: 'No tide station near this spot.' };
    const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10).replace(/-/g, '');
    const data = await fetchJson(`${TIDE_API}?product=predictions&application=frunk.store&station=${best.id}&begin_date=${yesterday}&range=96&datum=MLLW&time_zone=gmt&units=metric&interval=hilo&format=json`);
    if (!data.predictions?.length) throw new Error('no predictions');
    return {
      tide: {
        name: best.name,
        list: data.predictions.map(e => ({ at: Date.parse(`${e.t.replace(' ', 'T')}Z`), v: +e.v, high: e.type === 'H' })),
      },
    };
  } catch {
    return { note: 'Tide times are out of reach right now.' };
  }
}

async function loadAlerts(p) {
  alertsFailed = false;
  if (!inUS(p)) return null;
  try {
    const data = await fetchJson(`${ALERT_API}?point=${p.lat.toFixed(2)},${p.lon.toFixed(2)}`);
    const seen = new Set();
    return data.features.map(f => f.properties)
      .filter(a => BEACH_ALERT.test(a.event || '') && !seen.has(a.event) && seen.add(a.event));
  } catch { alertsFailed = true; return null; }
}

function withPlace(raw) {
  const list = raw.rows.map(r => {
    const s = {
      id: r[0], name: r[1], owner: raw.owners[r[2]], floats: r[3], lat: r[4], lon: r[5], at: r[6],
      windFrom: r[7], wind: r[8], gust: r[9], wave: r[10], period: r[11], waveFrom: r[12], air: r[13], water: r[14],
    };
    s.km = kmBetween(place, s);
    s.bearing = bearing(place, s);
    return s;
  });
  return list.sort((a, b) => a.km - b.km);
}

// The closest stations and the tide table, so the last readings show at once
// next time, and with no signal at all
function savedSea() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY));
    return c && Date.now() - c.saved < CACHE_FOR && kmBetween(place, c) < CACHE_KM ? c : null;
  } catch { return null; }
}

function remember(p) {
  if (!rawSea) return;
  const entry = { lat: p.lat, lon: p.lon, saved: loadedAt, ...rawSea, tide };
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(entry)); } catch {}
}

async function load() {
  if (!place) return;
  const mine = ++loadToken;
  const p = place;
  const saved = stations ? null : savedSea();
  if (saved) {
    stations = withPlace(saved);
    tide = saved.tide;
    savedAt = saved.saved;
    seaNote = `Saved readings from ${agoFrom(savedAt)}. Checking for new ones…`;
    renderList();
    render();
  } else if (!stations) { drawScene(null); showStatus('Reading the buoys…'); }

  // The tide and the alerts fill in as they arrive, so the slowest doesn't hold up the sea
  loadTide(p).then(result => {
    if (mine !== loadToken) return;
    // Tide predictions hold for days, so a failed refresh keeps the ones on hand
    if (result.tide || !tide) {
      tide = result.tide || null;
      tideNote = result.note || '';
    }
    remember(p);
    if (stations) render();
  });
  loadAlerts(p).then(result => {
    if (mine !== loadToken) return;
    alerts = result;
    if (stations) render();
  });
  try {
    const sea = await fetchJson('/api/beach');
    if (mine !== loadToken) return;      // another place was picked meanwhile
    loadedAt = Date.now();
    savedAt = 0;
    seaNote = '';
    const pinnedId = pinned?.id;
    stations = withPlace(sea);
    pinned = stations.find(s => s.id === pinnedId) || null;
    const keep = new Set(stations.slice(0, LIST_SIZE).map(s => s.id));
    rawSea = { owners: sea.owners, rows: sea.rows.filter(r => keep.has(r[0])) };
    remember(p);
    renderList();
    render();
  } catch {
    if (mine !== loadToken) return;
    if (stations) {
      // The readings on screen stay, with their age showing
      if (savedAt) seaNote = `Can't reach the buoys. Saved readings from ${agoFrom(savedAt)}.`;
      render();
    } else {
      drawScene(null);
      showStatus("Can't reach the buoy readings. Check the connection.", true);
    }
  }
}

function setPlace(p) {
  if (!p) return;
  const moved = !place || kmBetween(place, p) > 1;
  place = p;
  $('placeBtn').textContent = p.name;
  if (moved) {
    pinned = null;
    stations = null;
    rawSea = null;
    savedAt = 0;
    seaNote = '';
    tide = null;
    tideNote = '';
    alerts = null;
    alertsFailed = false;
    $('waterText').hidden = true;
    $('title').textContent = '';
    $('where').textContent = '';
    $('air').replaceChildren();
    $('rows').replaceChildren();
    $('sandText').replaceChildren();
    $('alertBtn').hidden = true;
    $('alertBox').hidden = true;
    $('alertNote').textContent = '';
    $('savedNote').textContent = '';
    $('pickBeach').hidden = true;
    load();
  } else if (stations) {
    render();      // same spot under a new name
  }
}

// At start, a car with no fix yet stays on the saved place. A tap on Here asks.
function useCar(quiet) {
  if (!navigator.geolocation) { pickPlace().then(setPlace); return; }
  $('placeBtn').textContent = 'Finding this car…';
  navigator.geolocation.getCurrentPosition(
    pos => {
      const p = herePlace(pos.coords.latitude, pos.coords.longitude);
      savePlace(p);
      setPlace(p);
      $('placeBtn').textContent = p.name;
    },
    err => {
      $('placeBtn').textContent = place?.name || 'Set location';
      if (quiet !== true || !place) pickPlace({ required: !place, note: locationError(err) }).then(setPlace);
    },
    { timeout: 12000, maximumAge: 60_000 },
  );
}

// ---------- alerts box ----------

$('alertBtn').onclick = () => {
  const body = $('alertBody');
  body.replaceChildren();
  for (const a of alerts || []) {
    body.append(el('h2', { textContent: a.event }));
    if (a.headline) body.append(el('p', { textContent: a.headline }));
    if (a.description) body.append(el('p', { textContent: `\n${a.description}` }));
    if (a.instruction) body.append(el('p', { textContent: `\n${a.instruction}` }));
  }
  body.append(el('p', { textContent: '\nFrom the National Weather Service.' }));
  $('alertBox').hidden = false;
  $('alertClose').focus();
};
$('alertClose').onclick = () => { $('alertBox').hidden = true; };

// ---------- buttons and start ----------

function showUnits() {
  $('unitsBtn').textContent = miles ? 'mi' : 'km';
  $('unitsBtn').setAttribute('aria-label', miles ? 'Distances in miles and feet. Switch to metric' : 'Distances in metric. Switch to miles and feet');
  $('tempBtn').textContent = useF ? '°F' : '°C';
  $('tempBtn').setAttribute('aria-label', useF ? 'Temperatures in Fahrenheit. Switch to Celsius' : 'Temperatures in Celsius. Switch to Fahrenheit');
}
function unitsChanged() {
  showUnits();
  if (stations) { renderList(); render(); }
}
$('unitsBtn').onclick = () => { miles = !miles; setMiles(miles); unitsChanged(); };
$('tempBtn').onclick = () => {
  useF = !useF;
  try { localStorage.setItem(UNITS_KEY, JSON.stringify(useF ? 'us' : 'metric')); } catch {}
  unitsChanged();
};
$('placeBtn').onclick = () => pickPlace().then(setPlace);
$('pickBeach').onclick = () => pickPlace().then(setPlace);
$('hereBtn').onclick = () => useCar();

showUnits();

// The text's height decides where the sea has to darken, so draw after it settles
new ResizeObserver(() => { if (place) render(); }).observe(scene);

// Ages and the tide move on; the readings themselves refresh less often
setInterval(() => { if (!document.hidden && stations) render(); }, 60_000);
setInterval(() => { if (!document.hidden) load(); }, REFRESH);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && place && Date.now() - loadedAt > REFRESH) load();
});
addEventListener('online', () => { if (place && Date.now() - loadedAt > REFRESH) load(); });

(async () => {
  let granted = false;
  try { granted = (await navigator.permissions.query({ name: 'geolocation' })).state === 'granted'; } catch {}
  const saved = getPlace();
  if (saved) setPlace(saved);
  if (granted) useCar(true);
  else if (!saved) setPlace(await pickPlace({ required: true }));
})();
