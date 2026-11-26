// The forecast for Weather and Road Trip Postcard, from MET Norway's
// Locationforecast (CC BY 4.0, worldwide), with rain chances, gusts and the
// time zone from the US National Weather Service (open data) for US places.
//
//   GET ?lat=38.57&lon=-109.55
//     -> { updated, tz, t: [unixSeconds, ...], span: [hours, ...],
//          temp, feels, rh, cloud, wind, dir, gust, uv, symbol, rain, pop, max, min }
//
// One entry per time step: hourly for the first two to three days, then every
// six hours. temp, feels, max and min are °C, wind and gust km/h, rain mm over
// the step, pop % over the step; a value the source doesn't give is null.
//
// Why a function and not the browser: MET Norway asks every request to carry
// an identifying User-Agent (a browser can't set one), asks for caching by its
// Expires header, and asks browsers not to call it directly. lat and lon must
// have two decimals (about 1 km), so cars near each other share one URL and the
// CDN answers them; MET only sees a cell again once its forecast has expired.

import { fail, json } from './_lib.js';

export const maxDuration = 15;

const AGENT = 'frunk.store Weather (https://frunk.store; frunkstore@protonmail.com)';
const MET = 'https://api.met.no/weatherapi/locationforecast/2.0/complete';
const NWS = 'https://api.weather.gov';
const PER_MINUTE = 300;     // MET allows 20 a second in total; stay well under that
const KEEP = 300;           // forecasts kept in memory between requests

const HOUR = 3600;
let minute = 0, asked = 0;
function overBudget() {
  const m = Math.floor(Date.now() / 60_000);
  if (m !== minute) { minute = m; asked = 0; }
  return ++asked > PER_MINUTE;
}

// A warm function keeps the last answer per cell, to send If-Modified-Since
// and to not ask at all before it expires, as MET's terms ask
const met = new Map();      // cell -> { expires, modified, body }
const grids = new Map();    // cell -> { at, url, tz } from NWS /points (null when outside NWS)

function remember(map, key, value) {
  map.delete(key);
  map.set(key, value);
  if (map.size > KEEP) map.delete(map.keys().next().value);
}

async function metForecast(lat, lon) {
  const cell = `${lat},${lon}`;
  const had = met.get(cell);
  if (had && had.expires > Date.now()) return had;
  const headers = { 'User-Agent': AGENT, Accept: 'application/json' };
  if (had?.modified) headers['If-Modified-Since'] = had.modified;
  const res = await fetch(`${MET}?lat=${lat}&lon=${lon}`, { headers, signal: AbortSignal.timeout(10_000) });
  const expires = Date.parse(res.headers.get('expires') || '') || Date.now() + 30 * 60_000;
  if (res.status === 304 && had) {
    const kept = { ...had, expires };
    remember(met, cell, kept);
    return kept;
  }
  if (!res.ok) throw new Error(`MET HTTP ${res.status}`);
  const kept = { expires, modified: res.headers.get('last-modified'), body: await res.json() };
  remember(met, cell, kept);
  return kept;
}

// The 50 states, Puerto Rico and the US islands of the Pacific, roughly. A
// place inside a box but outside NWS coverage just gets a 404 from /points.
const inUS = (lat, lon) =>
  (lat > 24 && lat < 50 && lon > -125 && lon < -66) ||   // lower 48
  (lat > 51 && lat < 72 && (lon < -129 || lon > 172)) ||  // Alaska
  (lat > 18 && lat < 23 && lon > -161 && lon < -154) ||   // Hawaii
  (lat > 17 && lat < 19 && lon > -68 && lon < -64) ||     // Puerto Rico
  (lat > 13 && lat < 21 && lon > 144 && lon < 147);       // Guam

async function nws(path) {
  const res = await fetch(path.startsWith('http') ? path : NWS + path, {
    headers: { 'User-Agent': AGENT, Accept: 'application/geo+json' },
    signal: AbortSignal.timeout(6_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`NWS HTTP ${res.status}`);
  return res.json();
}

// Interval values from NWS's grid ("2026-11-26T12:00:00+00:00/PT3H") as
// [startSeconds, endSeconds, value]
function intervals(layer) {
  return (layer?.values || []).flatMap(({ validTime, value }) => {
    const [start, len] = String(validTime).split('/');
    const t = Date.parse(start) / 1000;
    const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?)?$/.exec(len || '');
    if (!Number.isFinite(t) || !m || value === null) return [];
    return [[t, t + (+(m[1] || 0) * 24 + +(m[2] || 0)) * HOUR, value]];
  });
}

// NWS's extras for a US cell, or null. The grid point for a cell hardly ever
// changes, so it is looked up once a day.
async function usExtras(lat, lon) {
  if (!inUS(+lat, +lon)) return null;
  const cell = `${lat},${lon}`;
  let point = grids.get(cell);
  if (!point || Date.now() - point.at > 86400_000) {
    const p = (await nws(`/points/${lat},${lon}`))?.properties;
    point = { at: Date.now(), url: p?.forecastGridData || null, tz: p?.timeZone || null };
    remember(grids, cell, point);
  }
  if (!point.url) return null;
  const grid = (await nws(point.url))?.properties;
  return { tz: point.tz, pop: intervals(grid?.probabilityOfPrecipitation), gust: intervals(grid?.windGust) };
}

const at = (list, t) => list?.find(([a, b]) => t >= a && t < b)?.[2] ?? null;
// The highest value over a step, for a rain chance over six hours
const most = (list, t0, t1) => {
  const hits = (list || []).filter(([a, b]) => a < t1 && b > t0).map(v => v[2]);
  return hits.length ? Math.max(...hits) : null;
};
const num = (v, places = 1) => (typeof v === 'number' && Number.isFinite(v) ? +v.toFixed(places) : null);

function slim(body, us) {
  const out = { t: [], span: [], temp: [], feels: [], rh: [], cloud: [], wind: [], dir: [], gust: [], uv: [], symbol: [], rain: [], pop: [], max: [], min: [] };
  for (const step of body?.properties?.timeseries || []) {
    const t = Date.parse(step.time) / 1000;
    const now = step.data?.instant?.details || {};
    // The step's own period: the hour ahead while hourly, else six (or, at the very end, twelve) hours
    const [span, next] = step.data.next_1_hours ? [1, step.data.next_1_hours]
      : step.data.next_6_hours ? [6, step.data.next_6_hours]
        : step.data.next_12_hours ? [12, step.data.next_12_hours] : [0, null];
    if (!Number.isFinite(t) || !span) continue;
    const d = next.details || {};
    const six = step.data.next_6_hours?.details || {};
    out.t.push(t);
    out.span.push(span);
    out.temp.push(num(now.air_temperature));
    out.feels.push(num(now.apparent_air_temperature));
    out.rh.push(num(now.relative_humidity, 0));
    out.cloud.push(num(now.cloud_area_fraction, 0));
    out.wind.push(num(now.wind_speed * 3.6));
    out.dir.push(num(now.wind_from_direction, 0));
    out.gust.push(num(now.wind_speed_of_gust * 3.6) ?? num(at(us?.gust, t)));
    out.uv.push(num(now.ultraviolet_index_clear_sky));
    out.symbol.push(next.summary?.symbol_code || null);
    out.rain.push(span === 12 ? null : num(d.precipitation_amount));
    out.pop.push(num(d.probability_of_precipitation, 0) ?? num(most(us?.pop, t, t + span * HOUR), 0));
    out.max.push(span === 6 ? num(six.air_temperature_max) : null);
    out.min.push(span === 6 ? num(six.air_temperature_min) : null);
  }
  return out;
}

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const lat = q.get('lat') || '', lon = q.get('lon') || '';
  const la = +lat, lo = +lon;
  if (!/^-?\d{1,2}\.\d\d$/.test(lat) || !/^-?\d{1,3}\.\d\d$/.test(lon) || Math.abs(la) > 85 || Math.abs(lo) > 180) {
    return fail(400, 'Bad location.');
  }
  if (overBudget()) return fail(503, 'The forecast service is busy right now.');
  // NWS is a bonus: without it, US places still get MET's forecast
  const [forecast, extras] = await Promise.allSettled([metForecast(lat, lon), usExtras(lat, lon)]);
  if (extras.status === 'rejected') console.error('forecast: NWS', extras.reason?.message);
  if (forecast.status === 'rejected') {
    console.error('forecast:', forecast.reason?.message);
    return fail(503, 'The forecast service is out of reach right now.');
  }
  const us = extras.status === 'fulfilled' ? extras.value : null;
  const { expires, body } = forecast.value;
  const series = slim(body, us);
  if (!series.t.length) return fail(503, 'The forecast service sent an empty forecast.');
  // Shared until MET's copy expires (usually under an hour), then served
  // stale for a while as the CDN fetches the new one
  const fresh = Math.max(60, Math.min(3600, Math.round((expires - Date.now()) / 1000)));
  return json({
    updated: Math.round(Date.parse(body.properties?.meta?.updated_at || '') / 1000) || null,
    tz: us?.tz || null,
    ...series,
  }, 200, { 'Cache-Control': `public, max-age=300, s-maxage=${fresh}, stale-while-revalidate=1800` });
}
