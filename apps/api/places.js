// Places within walking distance, for Pit Stop: restrooms, coffee, food,
// shops and parks from OpenStreetMap, through the Overpass API.
//
//   GET ?lat=38.575&lon=-109.550&r=1000   -> { places: [...], osm: date }
//
// The browser can't call Overpass itself: the main server turns away browser
// requests that don't carry a descriptive User-Agent, and the car can't set
// one. So this function asks on the car's behalf, with a User-Agent that
// names the site and how to reach us.
//
// lat and lon must already be snapped to a 0.005° grid (about 500 m), and r
// must be one of the app's distances. That keeps the number of distinct URLs
// small, so Vercel's CDN answers most requests from its cache and Overpass
// sees few queries. Each query reaches out 450 m further than r, which covers
// any point in the grid cell; the app measures from the car itself.

import { fail, json, limited, redis } from './_lib.js';

export const maxDuration = 60;

const STEP = 0.005;
const RADII = [500, 1000, 2000];
// Closest places kept per group, so a city's restaurants don't crowd out the restrooms
const KEEP = { toilets: 200, cafe: 100, food: 200, shop: 100, outdoors: 100 };
const PER_IP_PER_HOUR = 40;      // queries that miss the CDN cache
const PER_DAY = 3000;            // all users together, well under Overpass's guidance
const AGENT = 'frunk.store Pit Stop (https://frunk.store; frunkstore@protonmail.com)';
// The main server sheds load with a quick 504 and usually answers on a retry.
// The mirror is asked once, a little later, in case the main server is down.
const MAIN = 'https://overpass-api.de/api/interpreter';
const MIRROR = 'https://maps.mail.ru/osm/tools/overpass/api/interpreter';
const MIRROR_AFTER = 4_000;
const DEADLINE = 55_000;

const AMENITY = {
  toilets: 'toilets', cafe: 'cafe', restaurant: 'restaurant', fast_food: 'fast_food', food_court: 'food_court',
  ice_cream: 'ice_cream', pharmacy: 'pharmacy', drinking_water: 'water', fuel: 'fuel',
};
const SHOP = { supermarket: 'supermarket', convenience: 'convenience', bakery: 'bakery', coffee: 'cafe' };
const LEISURE = { park: 'park', playground: 'playground', dog_park: 'dog_park' };
const GROUP = {
  toilets: 'toilets', cafe: 'cafe', restaurant: 'food', fast_food: 'food', food_court: 'food', ice_cream: 'food', bakery: 'food',
  supermarket: 'shop', convenience: 'shop', pharmacy: 'shop', fuel: 'shop', park: 'outdoors', playground: 'outdoors', dog_park: 'outdoors', water: 'outdoors',
};
const re = map => `^(${Object.keys(map).join('|')})$`;

const snap = v => (Math.round(v / STEP) * STEP).toFixed(3);

function query(lat, lon, r) {
  const around = `(around:${r},${lat},${lon})`;
  return `[out:json][timeout:20];
(
  nwr${around}[amenity~"${re(AMENITY)}"];
  nwr${around}[shop~"${re(SHOP)}"];
  nwr${around}[leisure~"${re(LEISURE)}"];
);
out center tags;`;
}

async function ask(server, q, signal) {
  const res = await fetch(server, {
    method: 'POST',
    headers: { 'User-Agent': AGENT, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ data: q }),
    signal,
  });
  if (!res.ok) throw new Error(`${server} HTTP ${res.status}`);
  const data = await res.json();
  // A query that runs out of time or memory still answers 200, with a remark
  if (data.remark && /error/i.test(data.remark)) throw new Error(`${server}: ${data.remark}`);
  return data;
}

// Resolves after ms, or right away when the signal aborts
const wait = (ms, signal) => new Promise(r => {
  const t = setTimeout(r, ms);
  signal.addEventListener('abort', () => { clearTimeout(t); r(); }, { once: true });
});

// First good answer wins; the other request is cancelled
async function overpass(q) {
  const stop = new AbortController();
  const signal = AbortSignal.any([stop.signal, AbortSignal.timeout(DEADLINE)]);
  const end = Date.now() + DEADLINE;
  const errors = [];
  const main = (async () => {
    for (let n = 1; ; n++) {
      try { return await ask(MAIN, q, signal); }
      catch (e) {
        errors.push(e.message);
        if (signal.aborted || Date.now() + 5_000 > end) throw e;
      }
      await wait(Math.min(1_500 * n, 5_000), signal);
    }
  })();
  const mirror = (async () => {
    await wait(MIRROR_AFTER, signal);
    if (signal.aborted) throw new Error('not needed');
    try { return await ask(MIRROR, q, signal); }
    catch (e) { errors.push(e.message); throw e; }
  })();
  try {
    return await Promise.any([main, mirror]);
  } catch {
    throw new Error(errors.join('; '));
  } finally {
    stop.abort();
  }
}

const DEG = Math.PI / 180;
function dist(lat1, lon1, lat2, lon2) {
  const x = (lon2 - lon1) * DEG * Math.cos((lat1 + lat2) / 2 * DEG), y = (lat2 - lat1) * DEG;
  return 6371_000 * Math.hypot(x, y);
}

function place(e, lat, lon) {
  const t = e.tags || {};
  const kind = AMENITY[t.amenity] || SHOP[t.shop] || LEISURE[t.leisure];
  const at = e.type === 'node' ? e : e.center;
  if (!kind || !at) return null;
  if (t.access === 'private' || t.access === 'no') return null;
  if (kind === 'park' && !t.name) return null;   // unnamed parks are mostly lawns and verges
  const p = { id: e.type[0] + e.id, kind, lat: +at.lat.toFixed(6), lon: +at.lon.toFixed(6), d: Math.round(dist(lat, lon, at.lat, at.lon)) };
  const keep = {
    name: t.name, brand: t.brand, hours: t.opening_hours, fee: t.fee, access: t.access,
    wheelchair: t.wheelchair, changing: t.changing_table, cuisine: t.cuisine,
    toilets: kind === 'toilets' ? undefined : t.toilets, seats: t.indoor_seating, drive: t.drive_through,
  };
  for (const [k, v] of Object.entries(keep)) if (v) p[k] = String(v).slice(0, 200);
  return p;
}

async function overLimit(request) {
  try {
    if (await limited('places', request, PER_IP_PER_HOUR, 3600)) return 'Too many searches from here. Try again in a while.';
    const key = `places:day:${new Date().toISOString().slice(0, 10)}`;
    const [n] = await redis(['INCR', key], ['EXPIRE', key, 86400 * 2, 'NX']);
    if (n > PER_DAY) return 'Pit Stop is very busy today. Try again tomorrow.';
  } catch (e) {
    // The limits protect Overpass; if storage is down, keep serving
    console.error('places: limit check failed:', e.message);
  }
  return '';
}

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const lat = q.get('lat') || '', lon = q.get('lon') || '', r = +q.get('r');
  const la = +lat, lo = +lon;
  if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 85 || Math.abs(lo) > 180 ||
      snap(la) !== lat || snap(lo) !== lon || !RADII.includes(r)) {
    return fail(400, 'Bad location.');
  }
  const busy = await overLimit(request);
  if (busy) return fail(429, busy);
  try {
    const data = await overpass(query(lat, lon, r + 450));
    const count = {};
    const places = (data.elements || []).map(e => place(e, la, lo)).filter(Boolean)
      .sort((a, b) => a.d - b.d)
      .filter(p => (count[GROUP[p.kind]] = (count[GROUP[p.kind]] || 0) + 1) <= KEEP[GROUP[p.kind]]);
    return json({ places, osm: data.osm3s?.timestamp_osm_base || '' }, 200, {
      // Shops and hours change slowly; the CDN keeps a copy for a day
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    });
  } catch (e) {
    console.error('places:', e.message);
    return fail(503, 'OpenStreetMap is busy right now. Try again in a minute.');
  }
}
