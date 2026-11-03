// Aircraft in the air near a point, for Planes Overhead, from adsb.lol's open
// data (ODbL).
//
//   GET ?lat=34.0&lon=-118.2&r=60
//     -> { now, ac: [[hex, callsign, lat, lon, altFt, knots, track, feetPerMin,
//                     type, registration, category, secondsOld, emergency], ...] }
//
// The browser can't call adsb.lol itself, because it sends no CORS headers.
//
// lat and lon must already be snapped to the grid for r, and r must be one of
// the app's distances. Everyone in the same cell then shares one URL, so
// Vercel's CDN answers most requests and adsb.lol sees at most one query per
// cell every few seconds, however many cars are watching. The app asks for a
// circle big enough to cover its map from anywhere in the cell.

import { fail, json } from './_lib.js';

export const maxDuration = 15;

const STEPS = { 30: 0.1, 60: 0.2, 120: 0.5, 250: 1 };   // nautical miles -> degrees
const AGENT = 'frunk.store Planes Overhead (https://frunk.store; frunkstore@protonmail.com)';
const MAX_ROWS = 1500;      // closest kept; only the widest circle over busy skies gets near this
const MAX_SEEN = 60;        // seconds; older positions are no use on a live map
const PER_MINUTE = 120;     // adsb.lol's limits are unpublished; stay gentle if the cells are walked

// Surface vehicles and obstacles, by ADS-B category and by the type some of them report
const NOT_AIRCRAFT = /^C[1-7]$/;
const NOT_TYPE = new Set(['TWR', 'GND']);

const snap = (v, step) => (Math.round(v / step) * step).toFixed(1);

let minute = 0, asked = 0;
function overBudget() {
  const m = Math.floor(Date.now() / 60_000);
  if (m !== minute) { minute = m; asked = 0; }
  return ++asked > PER_MINUTE;
}

const round = (v, places = 0) => (typeof v === 'number' ? +v.toFixed(places) : null);

function row(a) {
  if (typeof a.lat !== 'number' || typeof a.lon !== 'number') return null;
  if (a.alt_baro === 'ground' || (a.seen_pos ?? 0) > MAX_SEEN) return null;
  if (NOT_AIRCRAFT.test(a.category || '') || NOT_TYPE.has(a.t)) return null;
  const alt = typeof a.alt_baro === 'number' ? a.alt_baro : a.alt_geom;
  if (typeof alt !== 'number') return null;
  return [
    a.hex, (a.flight || '').trim() || null, round(a.lat, 4), round(a.lon, 4), Math.round(alt),
    round(a.gs), round(a.track), round(a.baro_rate ?? a.geom_rate),
    a.t || null, a.r || null, a.category || null, round(a.seen_pos ?? 0, 1),
    a.emergency && a.emergency !== 'none' ? 1 : 0,
  ];
}

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const lat = q.get('lat') || '', lon = q.get('lon') || '', r = q.get('r') || '';
  const step = Object.hasOwn(STEPS, r) ? STEPS[r] : 0;
  const la = +lat, lo = +lon;
  if (!step || !Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 85 || Math.abs(lo) > 180 ||
      snap(la, step) !== lat || snap(lo, step) !== lon) {
    return fail(400, 'Bad location.');
  }
  if (overBudget()) return fail(503, 'Flight data is busy right now.');
  try {
    const res = await fetch(`https://api.adsb.lol/v2/point/${lat}/${lon}/${r}`, {
      headers: { 'User-Agent': AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`adsb.lol HTTP ${res.status}`);
    const data = await res.json();
    const ac = (data.ac || [])
      .slice()
      .sort((a, b) => (a.dst ?? 0) - (b.dst ?? 0))
      .map(row).filter(Boolean)
      .slice(0, MAX_ROWS);
    return json({ now: data.now || Date.now(), ac }, 200, {
      // Shared for a few seconds: the app asks every 12, so a cell stays fresh
      'Cache-Control': 'public, max-age=0, s-maxage=8, stale-while-revalidate=4',
    });
  } catch (e) {
    console.error('planes:', e.message);
    return fail(503, 'Flight data is busy right now.');
  }
}
