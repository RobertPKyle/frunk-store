// Shared location for apps that need one (Star Map, Weather, Satellites,
// Sky Events, What's Around Me, Pit Stop, Planes Overhead, Beach Conditions).
// One saved place is used by every app on this origin, so picking it once is
// enough. The picker offers the car's location, a search for any town or park
// (Photon by komoot, over OpenStreetMap data), and a list of presets that
// works offline.
//
//   import { getPlace, pickPlace } from '../_shared/place.js';
//   const place = getPlace() || await pickPlace({ required: true });
//   // place = { lat, lon, name, tz? }

// [name, lat, lon, time zone]
export const CITIES = [
  ['Seattle', 47.61, -122.33, 'America/Los_Angeles'], ['Portland', 45.52, -122.68, 'America/Los_Angeles'], ['San Francisco', 37.77, -122.42, 'America/Los_Angeles'],
  ['Los Angeles', 34.05, -118.24, 'America/Los_Angeles'], ['San Diego', 32.72, -117.16, 'America/Los_Angeles'], ['Las Vegas', 36.17, -115.14, 'America/Los_Angeles'],
  ['Phoenix', 33.45, -112.07, 'America/Phoenix'], ['Salt Lake City', 40.76, -111.89, 'America/Denver'], ['Denver', 39.74, -104.99, 'America/Denver'],
  ['Austin', 30.27, -97.74, 'America/Chicago'], ['Dallas', 32.78, -96.8, 'America/Chicago'], ['Houston', 29.76, -95.37, 'America/Chicago'],
  ['Minneapolis', 44.98, -93.27, 'America/Chicago'], ['Chicago', 41.88, -87.63, 'America/Chicago'], ['Nashville', 36.16, -86.78, 'America/Chicago'],
  ['Atlanta', 33.75, -84.39, 'America/New_York'], ['Orlando', 28.54, -81.38, 'America/New_York'], ['Miami', 25.76, -80.19, 'America/New_York'],
  ['Washington DC', 38.91, -77.04, 'America/New_York'], ['New York', 40.71, -74.01, 'America/New_York'], ['Boston', 42.36, -71.06, 'America/New_York'],
  ['Yosemite', 37.87, -119.54, 'America/Los_Angeles'], ['Grand Canyon', 36.06, -112.14, 'America/Phoenix'], ['Zion', 37.3, -113.03, 'America/Denver'],
  ['Moab', 38.57, -109.55, 'America/Denver'], ['Yellowstone', 44.43, -110.59, 'America/Denver'],
  ['Vancouver', 49.28, -123.12, 'America/Vancouver'], ['Calgary', 51.05, -114.07, 'America/Edmonton'], ['Toronto', 43.65, -79.38, 'America/Toronto'], ['Montreal', 45.5, -73.57, 'America/Toronto'],
  ['London', 51.51, -0.13, 'Europe/London'], ['Paris', 48.86, 2.35, 'Europe/Paris'], ['Amsterdam', 52.37, 4.9, 'Europe/Amsterdam'], ['Berlin', 52.52, 13.4, 'Europe/Berlin'],
  ['Oslo', 59.91, 10.75, 'Europe/Oslo'], ['Stockholm', 59.33, 18.07, 'Europe/Stockholm'], ['Madrid', 40.42, -3.7, 'Europe/Madrid'], ['Rome', 41.9, 12.5, 'Europe/Rome'],
  ['Tokyo', 35.68, 139.69, 'Asia/Tokyo'], ['Shanghai', 31.23, 121.47, 'Asia/Shanghai'], ['Sydney', -33.87, 151.21, 'Australia/Sydney'],
  ['Melbourne', -37.81, 144.96, 'Australia/Melbourne'], ['Auckland', -36.85, 174.76, 'Pacific/Auckland'],
];

const KEY = 'frunk.place';
// Photon is made for search as you type (Nominatim's rules forbid that) and
// sends CORS headers. Its public server asks for fair use, so the search waits
// for a pause in typing and remembers answers for the session.
const GEOCODE = 'https://photon.komoot.io/api/';
// Streets and house numbers aren't places to pick for a forecast or a sky
const LAYERS = ['city', 'district', 'locality', 'county', 'state', 'country', 'other'];
// Of the rest, towns, regions, parks, peaks, lakes and campgrounds; not the
// hotels, shops and buildings that share a town's name
const isPlace = ({ osm_key: k, osm_value: v }) => k === 'place' || k === 'boundary' || k === 'natural' ||
  (k === 'leisure' && (v === 'park' || v === 'nature_reserve')) || (k === 'tourism' && v === 'camp_site');
const searched = new Map();

async function geocode(q) {
  const key = q.toLowerCase();
  if (searched.has(key)) return searched.get(key);
  const url = `${GEOCODE}?${new URLSearchParams([['q', q], ['limit', '25'], ['lang', 'en'], ...LAYERS.map(l => ['layer', l])])}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { features = [] } = await res.json();
  const { zoneFor } = await import('./timezones.js');
  const seen = new Set(), results = [];
  for (const f of features) {
    const p = f.properties || {}, [lon, lat] = f.geometry?.coordinates || [];
    if (!p.name || !isPlace(p) || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    // The same town often comes back as its boundary and as its center point
    const detail = [p.state, p.country].filter(v => v && v !== p.name).join(', ');
    const id = `${p.name}|${detail}`;
    if (seen.has(id)) continue;
    seen.add(id);
    results.push({ name: p.name, detail, lat, lon, tz: zoneFor(lat, lon, p.countrycode, p.state) });
    if (results.length === 12) break;
  }
  searched.set(key, results);
  return results;
}

export function getPlace() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY));
    if (p && Number.isFinite(p.lat) && Number.isFinite(p.lon)) return p;
  } catch {}
  // Star Map saved its own place before this module existed
  try {
    const s = JSON.parse(localStorage.getItem('stars.settings'));
    if (s && Number.isFinite(s.lat) && Number.isFinite(s.lon)) return { lat: s.lat, lon: s.lon, name: s.place || 'Saved place' };
  } catch {}
  return null;
}

export function savePlace(place) {
  try { localStorage.setItem(KEY, JSON.stringify(place)); } catch {}
}

// How long ago something was fetched, for a saved copy's label
export function ago(ms) {
  const min = Math.round((Date.now() - ms) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

// What to tell someone when the browser couldn't give the car's location
export function locationError(err) {
  if (err?.code === 1) return 'This site isn\'t allowed to use the car\'s location. Search or pick a place below.';
  return 'Couldn\'t get the car\'s location just now. Search or pick a place below.';
}

// A place from the car's location, named the same way by every app
export const herePlace = (lat, lon) => ({ lat, lon, name: `Here (${lat.toFixed(1)}°, ${lon.toFixed(1)}°)` });

const FOLLOW_KM = 5;

function km(a, b) {
  const rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// A saved place that came from the car's location follows the car: when the
// browser already shares the location, it is checked again and moved (and
// onMove called) once the car is more than a few km away, so Weather doesn't
// show yesterday's campsite. Places picked by name stay put.
export async function followCar(onMove) {
  const was = getPlace();
  if (!was || !/^Here\b/.test(was.name) || !navigator.geolocation) return;
  try { if ((await navigator.permissions.query({ name: 'geolocation' })).state !== 'granted') return; } catch { return; }
  navigator.geolocation.getCurrentPosition(pos => {
    const now = getPlace();
    if (!now || now.lat !== was.lat || now.lon !== was.lon) return;   // another place was picked meanwhile
    const p = herePlace(pos.coords.latitude, pos.coords.longitude);
    if (km(was, p) < FOLLOW_KM) return;
    savePlace(p);
    onMove(p);
  }, () => {}, { timeout: 15000, maximumAge: 600_000 });
}

const CSS = `
.fp-picker { position: fixed; inset: 0; z-index: 9; display: flex; flex-direction: column; gap: 12px; padding: 20px; background: rgba(2, 4, 10, .95); color: #d6deee; font: 16px/1.4 system-ui, sans-serif; }
.fp-picker h2 { margin: 0; font-size: 20px; flex: 1; }
/* clear of the hub's Apps button in the top-left corner */
.fp-head { min-height: 44px; padding-left: 96px; }
.fp-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.fp-btn { min-height: 44px; padding: 8px 14px; border-radius: 12px; background: #0d1322; border: 1px solid rgba(140, 170, 230, .25); color: inherit; font: inherit; cursor: pointer; }
.fp-search { flex: 1; min-width: 200px; min-height: 44px; padding: 8px 14px; border-radius: 12px; background: #0d1322; border: 1px solid rgba(140, 170, 230, .35); color: inherit; font: inherit; }
.fp-status { color: #8590a6; font-size: 14px; }
.fp-list { flex: 1; overflow: auto; display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); align-content: start; }
.fp-list button { min-height: 48px; padding: 8px 12px; border-radius: 12px; background: #0d1322; border: 1px solid rgba(140, 170, 230, .18); color: inherit; font: inherit; text-align: left; cursor: pointer; }
.fp-list small { display: block; color: #8590a6; font-size: 13px; }
.fp-credit { margin: 0; color: #6b7590; font-size: 12px; }
`;

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

// Shows the picker and resolves with the chosen place (also saved), or with
// null if the user closes it. With required, there is no close button. A note
// shows beside the location button, to say why the picker opened.
export function pickPlace({ required = false, note = '' } = {}) {
  if (!document.getElementById('fp-style')) document.head.append(el('style', { id: 'fp-style', textContent: CSS }));

  return new Promise(resolve => {
    const status = el('span', { className: 'fp-status', textContent: note });
    const list = el('div', { className: 'fp-list' });
    const search = el('input', { className: 'fp-search', type: 'search', placeholder: 'Search any town or park', enterKeyHint: 'search' });
    const geoBtn = el('button', { className: 'fp-btn', type: 'button', textContent: "Use this car's location" });
    const closeBtn = el('button', { className: 'fp-btn', type: 'button', textContent: 'Close', hidden: required });
    const root = el('div', { className: 'fp-picker', role: 'dialog', ariaLabel: 'Choose a location' },
      el('div', { className: 'fp-row fp-head' }, el('h2', { textContent: 'Where are you?' }), closeBtn),
      el('div', { className: 'fp-row' }, geoBtn, status),
      el('div', { className: 'fp-row' }, search),
      list,
      el('p', { className: 'fp-credit', textContent: 'Search by Photon (komoot) · place data © OpenStreetMap contributors' }),
    );

    let done = false;
    function finish(place) {
      if (done) return;   // a location that arrives after another choice must not replace it
      done = true;
      if (place) savePlace(place);
      root.remove();
      resolve(place);
    }

    function option(name, detail, place) {
      const b = el('button', { type: 'button' }, name);
      if (detail) b.append(el('small', { textContent: detail }));
      b.onclick = () => finish(place);
      return b;
    }

    function showPresets() {
      list.replaceChildren(...CITIES.map(([name, lat, lon, tz]) => option(name, '', { lat, lon, name, tz })));
    }

    let seq = 0, timer;
    search.oninput = () => {
      clearTimeout(timer);
      const q = search.value.trim();
      if (q.length < 2) { status.textContent = ''; showPresets(); return; }
      timer = setTimeout(async () => {
        const mine = ++seq;
        status.textContent = 'Searching…';
        try {
          const results = await geocode(q);
          if (mine !== seq) return;
          status.textContent = results.length ? '' : 'No matches. Try a nearby town.';
          list.replaceChildren(...results.map(r => option(r.name, r.detail,
            { lat: +r.lat.toFixed(4), lon: +r.lon.toFixed(4), name: r.name, ...(r.tz && { tz: r.tz }) })));
        } catch {
          if (mine !== seq) return;
          status.textContent = 'Search needs a connection. Pick from the list instead.';
          showPresets();
          // The list works without one, so narrow it down to what was typed
          const hits = CITIES.filter(([name]) => name.toLowerCase().includes(q.toLowerCase()));
          if (hits.length) list.replaceChildren(...hits.map(([name, lat, lon, tz]) => option(name, '', { lat, lon, name, tz })));
        }
      }, 400);
    };

    geoBtn.onclick = () => {
      if (!navigator.geolocation) { status.textContent = 'Location is not available. Search or pick a place below.'; return; }
      status.textContent = 'Finding location…';
      navigator.geolocation.getCurrentPosition(
        pos => {
          finish(herePlace(pos.coords.latitude, pos.coords.longitude));
        },
        err => { status.textContent = locationError(err); },
        { timeout: 12000, maximumAge: 600_000 },
      );
    };

    closeBtn.onclick = () => finish(null);
    showPresets();
    document.body.append(root);
  });
}
