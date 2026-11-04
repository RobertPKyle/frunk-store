// The latest sea readings for Beach Conditions, from NOAA's National Data Buoy
// Center (NDBC), which also carries readings from partners.
//
//   GET -> { at, owners: [name, ...],
//            rows: [[id, name, ownerIndex, floats, lat, lon, readAtSeconds,
//                    windFromDeg, windMs, gustMs, waveM, periodS, waveFromDeg,
//                    airC, waterC], ...] }
//
// The browser can't call NDBC itself, because it sends no CORS headers.
//
// Every car gets the same whole list and picks the closest stations itself, so
// there is one URL for the CDN to answer and a car's location never reaches
// this function. NDBC asks for retrievals to be kept low; this asks at most
// about once every ten minutes per CDN region, and most stations report hourly.

import { fail, json } from './_lib.js';

export const maxDuration = 15;

const READINGS = 'https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt';
const STATIONS = 'https://www.ndbc.noaa.gov/activestations.xml';
const AGENT = 'frunk.store Beach Conditions (https://frunk.store; frunkstore@protonmail.com)';
const NAMES_FOR = 86400_000;     // the station list hardly changes
const MAX_AGE = 6 * 3600;        // seconds; older than this says nothing about the water now

async function text(url) {
  const res = await fetch(url, { headers: { 'User-Agent': AGENT }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`NDBC HTTP ${res.status}`);
  return res.text();
}

const unescape = s => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#39;/g, "'").replace(/&amp;/g, '&');

// "LONG ISLAND - 30 NM South of Islip, NY" -> "Long Island - 30 NM South of Islip, NY"
// "8461490 - New London, CT" -> "New London, CT"; "Santa Monica Bay, CA (028)" -> "Santa Monica Bay, CA"
function cleanName(raw) {
  const name = unescape(raw).trim().replace(/\s+/g, ' ').replace(/^\d{5,} - /, '').replace(/ \(\d+\)$/, '');
  return name.replace(/^[^a-z]+?(?= - |$)/, part =>
    /[A-Z]{3}/.test(part) ? part.toLowerCase().replace(/(^|[\s.'-])([a-z])/g, (m, a, b) => a + b.toUpperCase()) : part)
    .replace(/\b[A-Z]{5,}\b/g, word => word[0] + word.slice(1).toLowerCase())
    .replace(/, ([A-Z][a-z])$/, (m, state) => `, ${state.toUpperCase()}`);
}

function parseStations(xml) {
  const stations = new Map();
  for (const [, attrs] of xml.matchAll(/<station ([^>]*?)\/?>/g)) {
    const a = Object.fromEntries([...attrs.matchAll(/(\w+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    if (a.id) stations.set(a.id.toUpperCase(), { name: cleanName(a.name || ''), owner: unescape(a.owner || ''), type: a.type || '' });
  }
  return stations;
}

// A number within what the sea can do, or null. NDBC writes MM for missing, and
// a stuck sensor can report anything.
function reading(v, min, max) {
  const n = Number(v);
  return v === 'MM' || v === undefined || !Number.isFinite(n) || n < min || n > max ? null : n;
}

function parseReadings(txt, stations, now = Date.now()) {
  const lines = txt.split('\n');
  const header = lines[0].replace(/^#/, '').trim().split(/\s+/);
  const at = name => header.indexOf(name);
  const c = {
    id: at('STN'), lat: at('LAT'), lon: at('LON'), y: at('YYYY'), mo: at('MM'), d: at('DD'), h: at('hh'), mi: at('mm'),
    wdir: at('WDIR'), wspd: at('WSPD'), gst: at('GST'), wvht: at('WVHT'), dpd: at('DPD'), apd: at('APD'), mwd: at('MWD'),
    atmp: at('ATMP'), wtmp: at('WTMP'),
  };
  if (Object.values(c).some(i => i < 0)) throw new Error('NDBC columns changed');

  const owners = [], ownerIndex = new Map(), rows = [];
  for (const line of lines) {
    if (!line || line[0] === '#') continue;
    const f = line.trim().split(/\s+/);
    if (f.length < header.length) continue;
    const id = f[c.id].toUpperCase();
    const station = stations.get(id);
    // Uncrewed boats move around, so a distance to one means little
    if (station?.type === 'usv') continue;

    const lat = reading(f[c.lat], -90, 90), lon = reading(f[c.lon], -180, 180);
    if (lat === null || lon === null) continue;
    const when = Date.UTC(+f[c.y], +f[c.mo] - 1, +f[c.d], +f[c.h], +f[c.mi]) / 1000;
    if (!Number.isFinite(when) || now / 1000 - when > MAX_AGE) continue;

    const water = reading(f[c.wtmp], -3, 40);
    // A period of 0 is how some partners write missing; waves of 0 with no period are no reading at all
    const period = reading(f[c.dpd], 1, 30) ?? reading(f[c.apd], 1, 30);
    let wave = reading(f[c.wvht], 0, 25);
    if (wave === 0 && period === null) wave = null;
    if (water === null && wave === null) continue;     // a beach app has nothing to say about it

    const owner = station?.owner || 'NDBC';
    if (!ownerIndex.has(owner)) { ownerIndex.set(owner, owners.length); owners.push(owner); }
    rows.push([
      id, station?.name || null, ownerIndex.get(owner), station?.type === 'buoy' ? 1 : 0, lat, lon, when,
      reading(f[c.wdir], 0, 360), reading(f[c.wspd], 0, 100), reading(f[c.gst], 0, 120),
      wave, period, reading(f[c.mwd], 0, 360), reading(f[c.atmp], -60, 60), water,
    ]);
  }
  return { owners, rows };
}

let names = null, namesAt = 0;

export async function GET() {
  const stale = !names || Date.now() - namesAt > NAMES_FOR;
  const [obs, list] = await Promise.allSettled([text(READINGS), stale ? text(STATIONS) : null]);
  if (list.status === 'fulfilled' && list.value) {
    const parsed = parseStations(list.value);
    if (parsed.size) { names = parsed; namesAt = Date.now(); }
  }
  try {
    if (obs.status === 'rejected') throw obs.reason;
    // Without the station list the readings still work, under station numbers
    const { owners, rows } = parseReadings(obs.value, names || new Map());
    if (!rows.length) throw new Error('no readings');
    return json({ at: Math.floor(Date.now() / 1000), owners, rows }, 200, {
      'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=1800',
    });
  } catch (e) {
    console.error('beach:', e.message);
    return fail(503, 'Buoy data is out of reach right now.');
  }
}
