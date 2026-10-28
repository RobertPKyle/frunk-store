// Weather: current conditions, a 48-hour strip and a 7-day outlook from
// Open-Meteo, plus a "Tonight's sky" card for campers: sunset, true darkness,
// the Moon, a stargazing rating and the aurora chance (NOAA Kp forecast).
// Sun and Moon times are computed here with the Star Map's astronomy code.
import { julianDay, localSiderealTime, toHorizon, sun, moon } from '../_shared/astro.js';
import { followCar, getPlace, pickPlace } from '../_shared/place.js';
import { useMiles } from '../_shared/units.js';
import { weatherIcon, weatherName } from './icons.js';

const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const KP = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';
const CACHE_KEY = 'weather.cache';
const KP_KEY = 'weather.kp';
const UNITS_KEY = 'weather.units';
const STALE = 30 * 60_000;     // refetch the forecast after 30 minutes
const KP_STALE = 3 * 3600_000; // Kp forecast bins are 3 hours long
const HOUR = 3600_000;

const $ = id => document.getElementById(id);
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
};

let place = getPlace();
let units = store.get(UNITS_KEY) || (/-US$/.test(navigator.language) ? 'us' : 'metric');
let forecast = null;  // { key, fetched, data }
let kp = store.get(KP_KEY); // { fetched, data }
let loading = null;    // place key of the forecast being fetched
let reload = false;    // the place changed during that fetch

// ---------- units and formatting ----------

// °F/°C also picks inches or mm of rain; wind follows the mi/km choice of
// Pit Stop and What's Around Me
const temp = c => `${Math.round(units === 'us' ? c * 9 / 5 + 32 : c)}°`;
const speed = kmh => useMiles() ? `${Math.round(kmh * 0.621371)} mph` : `${Math.round(kmh)} km/h`;
const amount = mm => units === 'us' ? `${(mm / 25.4).toFixed(2)} in` : `${mm.toFixed(1)} mm`;
const compass = deg => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];

function fmt(ms, opts) {
  try { return new Intl.DateTimeFormat([], { ...opts, timeZone: forecast.data.timezone }).format(ms); }
  catch { return new Intl.DateTimeFormat([], opts).format(ms); }
}
const clock = ms => fmt(ms, { hour: 'numeric', minute: '2-digit' });
const hourLabel = ms => fmt(ms, { hour: 'numeric' }).replace(/\s?([AP])M$/i, (_, p) => p.toLowerCase());

function ago(ms) {
  const min = Math.round((Date.now() - ms) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

// ---------- Sun and Moon ----------

function altitude(body, ms) {
  const jd = julianDay(new Date(ms));
  const b = body(jd);
  return toHorizon(b.ra, b.dec, place.lat, localSiderealTime(jd, place.lon)).alt;
}

// Times in [t0, t1] when a body's altitude crosses h0, found on a 5-minute
// scan and refined by bisection to about a second.
function crossings(body, t0, t1, h0) {
  const out = [];
  const step = 5 * 60_000;
  let pt = t0, pa = altitude(body, t0) - h0;
  for (let t = t0 + step; t <= t1; t += step) {
    const a = altitude(body, t) - h0;
    if ((pa < 0) !== (a < 0)) {
      let lo = pt, hi = t, alo = pa;
      while (hi - lo > 1000) {
        const mid = (lo + hi) / 2, am = altitude(body, mid) - h0;
        if ((am < 0) === (alo < 0)) { lo = mid; alo = am; } else hi = mid;
      }
      out.push({ t: (lo + hi) / 2, rising: a > 0 });
    }
    pt = t; pa = a;
  }
  return out;
}
const first = (list, rising) => list.find(e => e.rising === rising)?.t ?? null;

function moonPhaseName(k, waxing) {
  if (k < 0.03) return 'New Moon';
  if (k > 0.97) return 'Full Moon';
  if (k > 0.47 && k < 0.53) return waxing ? 'First quarter' : 'Last quarter';
  return `${waxing ? 'Waxing' : 'Waning'} ${k < 0.5 ? 'crescent' : 'gibbous'}`;
}

// Geomagnetic latitude from a centered dipole (north pole near 80.8°N 72.6°W)
function geomagneticLat(lat, lon) {
  const r = Math.PI / 180, pl = 80.8 * r, plon = -72.6 * r;
  return Math.asin(Math.sin(lat * r) * Math.sin(pl) + Math.cos(lat * r) * Math.cos(pl) * Math.cos(lon * r - plon)) / r;
}

// Everything for the "Tonight's sky" card. Before noon, "tonight" is the
// night that just ended or is still going; after noon it is the coming one.
function tonight(d) {
  const midnight = d.daily.time[0] * 1000;
  const now = Date.now();
  const start = now < midnight + 12 * HOUR ? midnight - 12 * HOUR : midnight + 12 * HOUR;
  const end = start + 24 * HOUR;

  const sunAt = h0 => crossings(sun, start, end, h0);
  const horizon = sunAt(-0.833);
  const set = first(horizon, false), rise = first(horizon, true);
  const golden = first(sunAt(6), false);
  const astro = sunAt(-18);
  const dark = first(astro, false), dawn = first(astro, true);
  const minAlt = Math.min(...Array.from({ length: 49 }, (_, i) => altitude(sun, start + i * 30 * 60_000)));

  const moonEvents = crossings(moon, start, end, 0.125);
  const mid = (dark && dawn) ? (dark + dawn) / 2 : start + 12 * HOUR;
  const m = moon(julianDay(new Date(mid)));

  const out = { set, rise, golden, dark, dawn, noDark: minAlt > -18, moon: m, moonRise: first(moonEvents, true), moonSet: first(moonEvents, false) };

  // Stargazing: clouds and Moon during true darkness (or nautical twilight
  // in summer at high latitude, when it never gets fully dark)
  const nautical = dark && dawn ? null : sunAt(-12);
  const from = dark ?? first(nautical, false), to = dawn ?? first(nautical, true);
  if (from && to && to > from) {
    const hourly = d.hourly.time.map((t, i) => ({ t: t * 1000, cloud: d.hourly.cloud_cover[i], rain: d.hourly.precipitation_probability[i] ?? 0 }))
      .filter(h => h.t >= from - HOUR / 2 && h.t <= to);
    const cloud = hourly.length ? hourly.reduce((s, h) => s + h.cloud, 0) / hourly.length : null;
    const rain = Math.max(0, ...hourly.map(h => h.rain));
    let up = 0, n = 0;
    for (let t = from; t <= to; t += 15 * 60_000, n++) if (altitude(moon, t) > 0) up++;
    out.stars = { from, to, cloud, rain, moonUp: up / n };
  }

  // Aurora: highest Kp forecast for the dark hours, against the Kp needed to
  // see it on the horizon at this geomagnetic latitude (rule of thumb)
  if (kp?.data && from && to) {
    const bins = kp.data.filter(b => {
      const t = Date.parse(b.time_tag + 'Z');
      return t + 3 * HOUR > from && t < to;
    });
    if (bins.length) {
      const gm = Math.abs(geomagneticLat(place.lat, place.lon));
      out.aurora = { kp: Math.max(...bins.map(b => b.kp)), need: Math.min(9.5, Math.max(1, (66.5 - gm) / 2)), south: place.lat < 0 };
    }
  }
  return out;
}

// ---------- rendering ----------

function setStatus(text) { $('status').textContent = text; }

function render() {
  $('unitBtn').textContent = units === 'us' ? '°F' : '°C';
  $('placeBtn').textContent = place ? place.name : 'Set location';
  if (!forecast) return;
  const d = forecast.data;
  $('error').hidden = true;
  document.querySelector('main').hidden = false;

  // Now
  const c = d.current;
  $('nowIcon').innerHTML = weatherIcon(c.weather_code, !!c.is_day);
  $('temp').textContent = temp(c.temperature_2m);
  $('desc').textContent = weatherName(c.weather_code);
  $('facts').innerHTML = [
    `Feels like <b>${temp(c.apparent_temperature)}</b> · Humidity <b>${c.relative_humidity_2m}%</b>`,
    `Wind <b>${speed(c.wind_speed_10m)} ${compass(c.wind_direction_10m)}</b>, gusts <b>${speed(c.wind_gusts_10m)}</b>`,
    `Today <b>${temp(d.daily.temperature_2m_max[0])}</b> / <b>${temp(d.daily.temperature_2m_min[0])}</b> · UV <b>${Math.round(d.daily.uv_index_max[0] ?? 0)}</b>`,
    d.daily.precipitation_sum[0] > 0 ? `Rain or snow today <b>${amount(d.daily.precipitation_sum[0])}</b>` : '',
  ].filter(Boolean).map(s => `<span>${s}</span>`).join('');

  renderSky(d);
  renderHours(d);
  renderDays(d);
  setStatus(navigator.onLine === false ? `Offline · updated ${ago(forecast.fetched)}` : `Updated ${ago(forecast.fetched)}`);
}

function renderSky(d) {
  const n = tonight(d);
  const rows = [];
  const add = (k, v) => rows.push(`<dt>${k}</dt><dd>${v}</dd>`);

  if (n.set) add('Sunset', `${clock(n.set)}${n.golden ? ` · golden hour from ${clock(n.golden)}` : ''}`);
  if (n.noDark) add('Dark sky', 'Not fully dark tonight (summer twilight)');
  else if (n.dark && n.dawn) add('Dark sky', `${clock(n.dark)} to ${clock(n.dawn)}`);
  if (n.rise) add('Sunrise', clock(n.rise));

  const m = n.moon;
  const moonTimes = [[n.moonRise, 'rises'], [n.moonSet, 'sets']].filter(([t]) => t).sort((a, b) => a[0] - b[0])
    .map(([t, what]) => `${what} ${clock(t)}`).join(', ');
  add('Moon', `${moonPhaseName(m.illuminated, m.waxing)}, ${Math.round(m.illuminated * 100)}% lit${moonTimes ? ` · ${moonTimes}` : ''}`);

  if (n.stars && n.stars.cloud != null) {
    const s = n.stars;
    const bright = m.illuminated > 0.5 && s.moonUp > 0.5;
    let grade, why;
    if (s.cloud >= 75 || s.rain >= 60) [grade, why] = ['Poor', 'cloudy'];
    else if (s.cloud >= 40) [grade, why] = ['Fair', `about ${Math.round(s.cloud)}% cloud`];
    else if (bright) [grade, why] = ['Good', 'clear, but the bright Moon hides faint stars'];
    else [grade, why] = ['Great', s.cloud < 15 ? 'clear and dark' : 'mostly clear and dark'];
    // Point at the moonless part of the night when the Moon is up for only some of it
    if (grade !== 'Poor' && m.illuminated > 0.3 && s.moonUp > 0.05 && s.moonUp < 0.95) {
      if (n.moonSet && n.moonSet > s.from && n.moonSet < s.to) why += `; darkest after ${clock(n.moonSet)}`;
      else if (n.moonRise && n.moonRise > s.from && n.moonRise < s.to) why += `; darkest before ${clock(n.moonRise)}`;
    }
    add('Stargazing', `<span class="rating ${grade.toLowerCase()}">${grade}</span>: ${why}`);
  }

  if (n.aurora) {
    const { kp: k, need, south } = n.aurora;
    const dir = south ? 'south' : 'north';
    let text;
    if (k >= need) text = `<b>Possible!</b> Kp ${k.toFixed(1)} forecast. Look ${dir}, away from lights.`;
    else if (k >= need - 1.5) text = `Small chance, mostly in phone photos (Kp ${k.toFixed(1)}, about ${Math.ceil(need)} needed here)`;
    else text = need > 9 ? `Very unlikely this far from the pole (Kp ${k.toFixed(1)})` : `Unlikely (Kp ${k.toFixed(1)}, about ${Math.ceil(need)} needed here)`;
    add('Aurora', text);
  }

  // Overnight low from the hourly data between sunset and sunrise
  if (n.set && n.rise) {
    const lows = d.hourly.time.flatMap((t, i) => (t * 1000 >= n.set && t * 1000 <= n.rise ? [d.hourly.temperature_2m[i]] : []));
    if (lows.length) add('Low tonight', temp(Math.min(...lows)));
  }
  $('sky').innerHTML = rows.join('');
}

function renderHours(d) {
  const now = Date.now();
  const startIdx = Math.max(0, d.hourly.time.findIndex(t => t * 1000 > now - HOUR));
  const cells = [];
  let lastDay = fmt(now, { weekday: 'short' });
  for (let i = startIdx; i < Math.min(d.hourly.time.length, startIdx + 48); i++) {
    const t = d.hourly.time[i] * 1000;
    const day = fmt(t, { weekday: 'short' });
    const newDay = day !== lastDay;
    lastDay = day;
    const p = d.hourly.precipitation_probability[i] ?? 0;
    cells.push(`<div class="hr${newDay ? ' day0' : ''}">
      <span class="t">${i === startIdx ? 'Now' : newDay ? day : hourLabel(t)}</span>
      ${weatherIcon(d.hourly.weather_code[i], !!d.hourly.is_day[i])}
      <span>${temp(d.hourly.temperature_2m[i])}</span>
      <span class="p">${p >= 10 ? `${p}%` : ''}</span>
      <span class="bar" style="height:${Math.round(p * 0.3)}px"></span>
    </div>`);
  }
  $('hours').innerHTML = cells.join('');
}

function renderDays(d) {
  $('days').innerHTML = d.daily.time.map((t, i) => {
    const p = d.daily.precipitation_probability_max[i] ?? 0;
    return `<div class="day">
      <span class="d">${i === 0 ? 'Today' : fmt(t * 1000 + 12 * HOUR, { weekday: 'short' })}</span>
      ${weatherIcon(d.daily.weather_code[i], true)}
      <span>${temp(d.daily.temperature_2m_max[i])}</span>
      <span class="lo">${temp(d.daily.temperature_2m_min[i])}</span>
      <span class="p">${p >= 10 ? `${p}%` : ''}</span>
    </div>`;
  }).join('');
}

function showError(text) {
  $('error').textContent = text;
  $('error').hidden = false;
  document.querySelector('main').hidden = true;
}

// ---------- data ----------

const placeKey = () => `${place.lat.toFixed(3)},${place.lon.toFixed(3)}`;

function forecastUrl() {
  const q = new URLSearchParams({
    latitude: place.lat.toFixed(4), longitude: place.lon.toFixed(4),
    timezone: 'auto', timeformat: 'unixtime', forecast_days: '7',
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    hourly: 'temperature_2m,precipitation_probability,weather_code,cloud_cover,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max',
  });
  return `${FORECAST}?${q}`;
}

async function loadKp() {
  if (kp && Date.now() - kp.fetched < KP_STALE) return;
  try {
    const res = await fetch(KP);
    if (!res.ok) return;
    kp = { fetched: Date.now(), data: (await res.json()).filter(b => typeof b.kp === 'number') };
    store.set(KP_KEY, kp);
  } catch {}
}

async function load(force = false) {
  if (!place) return;
  const key = placeKey();
  if (loading) { reload ||= key !== loading; return; }
  if (!forecast || forecast.key !== key) {
    const cached = store.get(CACHE_KEY);
    forecast = cached?.key === key ? cached : null;
  }
  render();
  if (!force && forecast && Date.now() - forecast.fetched < STALE) { await loadKp(); render(); return; }

  loading = key;
  setStatus('Updating…');
  try {
    const [res] = await Promise.all([fetch(forecastUrl()), loadKp()]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (placeKey() !== key) return; // place changed while loading
    forecast = { key, fetched: Date.now(), data };
    store.set(CACHE_KEY, forecast);
    render();
  } catch (e) {
    if (forecast) setStatus(`Offline · updated ${ago(forecast.fetched)}`);
    else showError(`Couldn't load the forecast (${e.message}). Weather needs a connection the first time.`);
  } finally {
    loading = null;
    if (reload) { reload = false; load(true); }
  }
}

// ---------- controls ----------

function setPlace(p) {
  if (!p) return;
  place = p;
  forecast = null;
  load(true);
}
$('placeBtn').onclick = () => pickPlace().then(setPlace);
$('unitBtn').onclick = () => {
  units = units === 'us' ? 'metric' : 'us';
  store.set(UNITS_KEY, units);
  render();
};
$('refreshBtn').onclick = () => load(true);
addEventListener('online', () => load());

// Refresh when stale, and keep "Now" and "updated" current
setInterval(() => { if (forecast && Date.now() - forecast.fetched >= STALE) load(); else render(); }, 60_000);

if (place) { load(); followCar(setPlace); }
else pickPlace({ required: true }).then(setPlace);
