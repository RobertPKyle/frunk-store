// The forecast for a place, through /api/forecast (MET Norway, plus NWS in
// the US), turned into the shape Weather and Road Trip Postcard were built on:
// current, hourly and daily fields named as before, with WMO weather codes, so
// their icons, words and saved copies carry on unchanged.
//
//   import { loadForecast } from '../_shared/forecast.js';
//   const data = await loadForecast(place, { signal });
//   // data.current.temperature_2m, data.hourly.time[...], data.daily.weather_code[...]

import { julianDay, localSiderealTime, sun, toHorizon } from './astro.js';

const HOUR = 3600;

// MET Norway's symbols (https://github.com/metno/weathericons) as WMO codes.
// Sleet has its own codes, 68/69 and 83/84 for showers, as WMO 4677 has them.
const SYMBOLS = {
  clearsky: 0, fair: 1, partlycloudy: 2, cloudy: 3, fog: 45,
  lightrain: 61, rain: 63, heavyrain: 65,
  lightrainshowers: 80, rainshowers: 81, heavyrainshowers: 82,
  lightsleet: 68, sleet: 69, heavysleet: 69,
  lightsleetshowers: 83, sleetshowers: 84, heavysleetshowers: 84,
  lightsnow: 71, snow: 73, heavysnow: 75,
  lightsnowshowers: 85, snowshowers: 85, heavysnowshowers: 86,
};

// -> { code, day } from "lightrainshowersandthunder_night" and the like. day
// is null for symbols that look the same by day and night (cloudy, fog, rain).
export function fromSymbol(symbol) {
  const [name = '', when = ''] = String(symbol || '').split('_');
  // polar twilight counts as day, as the sun is just below the horizon
  const day = when ? when !== 'night' : null;
  if (name.endsWith('andthunder')) return { code: 95, day };
  return { code: SYMBOLS[name] ?? null, day };
}

// Whether the sun is up there and then, for the symbols that don't say
function sunUp(seconds, lat, lon) {
  const jd = julianDay(new Date(seconds * 1000));
  const s = sun(jd);
  return toHorizon(s.ra, s.dec, lat, localSiderealTime(jd, lon)).alt > -0.833;
}

// "2026-11-26" and the hour, on the place's clock (one formatter per zone, as
// a forecast asks this a few hundred times)
const formatters = new Map();
function wall(seconds, tz) {
  if (!formatters.has(tz)) formatters.set(tz, new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }));
  const parts = Object.fromEntries(formatters.get(tz).formatToParts(seconds * 1000).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: +parts.hour, minute: +parts.minute };
}

// Unix seconds of local midnight starting a date, on the place's clock
function midnight(date, tz) {
  const guess = Date.parse(`${date}T00:00:00Z`) / 1000;
  const w = wall(guess, tz);
  const shown = Date.parse(`${w.date}T${String(w.hour).padStart(2, '0')}:${String(w.minute).padStart(2, '0')}:00Z`) / 1000;
  return guess - (shown - guess);
}

const validZone = tz => {
  if (!tz) return undefined;
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return tz; } catch { return undefined; }
};

// place: { lat, lon, tz? }. The API's zone (US places) wins over the place's,
// and with neither, this screen's clock is used, which is right for the car's
// own location.
export function shape(raw, place, days = 7) {
  const tz = validZone(raw.tz) || validZone(place.tz);
  const n = raw.t.length;
  const now = Date.now() / 1000;
  const steps = Array.from({ length: n }, (_, i) => {
    const s = fromSymbol(raw.symbol[i]);
    return {
      t: raw.t[i], span: raw.span[i], code: s.code,
      day: s.day ?? sunUp(raw.t[i] + raw.span[i] * HOUR / 2, place.lat, place.lon),
      temp: raw.temp[i], feels: raw.feels[i],
      rh: raw.rh[i], cloud: raw.cloud[i], wind: raw.wind[i], dir: raw.dir[i], gust: raw.gust[i], uv: raw.uv[i],
      rain: raw.rain[i], pop: raw.pop[i], max: raw.max[i], min: raw.min[i],
    };
  });

  // Now: the hour under way, else the first step there is
  const c = steps.find(s => s.span === 1 && s.t <= now && now < s.t + HOUR) || steps[0];
  const cw = wall(c.t > now ? c.t : now, tz);
  const current = {
    time: `${cw.date}T${String(cw.hour).padStart(2, '0')}:${String(cw.minute).padStart(2, '0')}`,
    temperature_2m: c.temp, apparent_temperature: c.feels ?? c.temp, relative_humidity_2m: c.rh,
    weather_code: c.code, is_day: c.day ? 1 : 0,
    wind_speed_10m: c.wind, wind_direction_10m: c.dir, wind_gusts_10m: c.gust,
  };

  const hours = steps.filter(s => s.span === 1);
  const hourly = {
    time: hours.map(s => s.t), temperature_2m: hours.map(s => s.temp), precipitation_probability: hours.map(s => s.pop),
    weather_code: hours.map(s => s.code), cloud_cover: hours.map(s => s.cloud), is_day: hours.map(s => (s.day ? 1 : 0)),
  };

  // Days on the place's clock. A step belongs to the day its middle falls in.
  // Today starts now, so its high and low are for the hours left of it.
  const byDay = new Map();
  for (const s of steps) {
    const w = wall(s.t + s.span * HOUR / 2, tz);
    if (!byDay.has(w.date)) byDay.set(w.date, []);
    byDay.get(w.date).push({ ...s, hour: w.hour });
  }
  const today = wall(now, tz).date;
  const dates = [...byDay.keys()].filter(d => d >= today).sort().slice(0, days);
  const max = list => (list.length ? Math.max(...list) : null);
  const daily = { time: [], weather_code: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_sum: [], precipitation_probability_max: [], uv_index_max: [] };
  for (const date of dates) {
    const list = byDay.get(date);
    const temps = list.flatMap(s => [s.temp, s.max, s.min]).filter(Number.isFinite);
    // The day's icon is its worst weather while it's light (the old forecast
    // took the whole day), so a foggy night doesn't make the day foggy
    const light = list.filter(s => s.hour >= 6 && s.hour < 20 && s.code !== null);
    const codes = (light.length ? light : list).map(s => s.code).filter(v => v !== null);
    const rain = list.map(s => s.rain).filter(Number.isFinite);
    daily.time.push(midnight(date, tz));
    daily.weather_code.push(codes.length ? Math.max(...codes) : null);
    daily.temperature_2m_max.push(temps.length ? Math.max(...temps) : null);
    daily.temperature_2m_min.push(temps.length ? Math.min(...temps) : null);
    daily.precipitation_sum.push(rain.length ? +rain.reduce((a, b) => a + b, 0).toFixed(1) : 0);
    daily.precipitation_probability_max.push(max(list.map(s => s.pop).filter(Number.isFinite)));
    daily.uv_index_max.push(max(list.map(s => s.uv).filter(Number.isFinite)));
  }

  return { timezone: tz, source: 'met', current, hourly, daily };
}

// Two decimals, about 1 km: what the API asks for, so nearby cars share a copy
export async function loadForecast(place, { signal } = {}) {
  const res = await fetch(`/api/forecast?lat=${place.lat.toFixed(2)}&lon=${place.lon.toFixed(2)}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return shape(await res.json(), place);
}
