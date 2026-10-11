// Shared location for apps that need one (Star Map, Weather, Satellites).
// One saved place is used by every app on this origin, so picking it once is
// enough. The picker offers the car's location, a search for any town or park
// (Open-Meteo geocoding), and a list of presets that works offline.
//
//   import { getPlace, pickPlace } from '../_shared/place.js';
//   const place = getPlace() || await pickPlace({ required: true });
//   // place = { lat, lon, name, tz? }

export const CITIES = [
  ['Seattle', 47.61, -122.33], ['Portland', 45.52, -122.68], ['San Francisco', 37.77, -122.42],
  ['Los Angeles', 34.05, -118.24], ['San Diego', 32.72, -117.16], ['Las Vegas', 36.17, -115.14],
  ['Phoenix', 33.45, -112.07], ['Salt Lake City', 40.76, -111.89], ['Denver', 39.74, -104.99],
  ['Austin', 30.27, -97.74], ['Dallas', 32.78, -96.8], ['Houston', 29.76, -95.37],
  ['Minneapolis', 44.98, -93.27], ['Chicago', 41.88, -87.63], ['Nashville', 36.16, -86.78],
  ['Atlanta', 33.75, -84.39], ['Orlando', 28.54, -81.38], ['Miami', 25.76, -80.19],
  ['Washington DC', 38.91, -77.04], ['New York', 40.71, -74.01], ['Boston', 42.36, -71.06],
  ['Yosemite', 37.87, -119.54], ['Grand Canyon', 36.06, -112.14], ['Zion', 37.3, -113.03],
  ['Moab', 38.57, -109.55], ['Yellowstone', 44.43, -110.59],
  ['Vancouver', 49.28, -123.12], ['Calgary', 51.05, -114.07], ['Toronto', 43.65, -79.38], ['Montreal', 45.5, -73.57],
  ['London', 51.51, -0.13], ['Paris', 48.86, 2.35], ['Amsterdam', 52.37, 4.9], ['Berlin', 52.52, 13.4],
  ['Oslo', 59.91, 10.75], ['Stockholm', 59.33, 18.07], ['Madrid', 40.42, -3.7], ['Rome', 41.9, 12.5],
  ['Tokyo', 35.68, 139.69], ['Shanghai', 31.23, 121.47], ['Sydney', -33.87, 151.21],
  ['Melbourne', -37.81, 144.96], ['Auckland', -36.85, 174.76],
];

const KEY = 'frunk.place';
const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';

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

const CSS = `
.fp-picker { position: fixed; inset: 0; z-index: 9; display: flex; flex-direction: column; gap: 12px; padding: 20px; background: rgba(2, 4, 10, .95); color: #d6deee; font: 16px/1.4 system-ui, sans-serif; }
.fp-picker h2 { margin: 0; font-size: 20px; flex: 1; }
.fp-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.fp-btn { min-height: 44px; padding: 8px 14px; border-radius: 12px; background: #0d1322; border: 1px solid rgba(140, 170, 230, .25); color: inherit; font: inherit; cursor: pointer; }
.fp-search { flex: 1; min-width: 200px; min-height: 44px; padding: 8px 14px; border-radius: 12px; background: #0d1322; border: 1px solid rgba(140, 170, 230, .35); color: inherit; font: inherit; }
.fp-status { color: #8590a6; font-size: 14px; }
.fp-list { flex: 1; overflow: auto; display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); align-content: start; }
.fp-list button { min-height: 48px; padding: 8px 12px; border-radius: 12px; background: #0d1322; border: 1px solid rgba(140, 170, 230, .18); color: inherit; font: inherit; text-align: left; cursor: pointer; }
.fp-list small { display: block; color: #8590a6; font-size: 13px; }
`;

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

// Shows the picker and resolves with the chosen place (also saved), or with
// null if the user closes it. With required, there is no close button.
export function pickPlace({ required = false } = {}) {
  if (!document.getElementById('fp-style')) document.head.append(el('style', { id: 'fp-style', textContent: CSS }));

  return new Promise(resolve => {
    const status = el('span', { className: 'fp-status' });
    const list = el('div', { className: 'fp-list' });
    const search = el('input', { className: 'fp-search', type: 'search', placeholder: 'Search any town or park', enterKeyHint: 'search' });
    const geoBtn = el('button', { className: 'fp-btn', type: 'button', textContent: "Use this car's location" });
    const closeBtn = el('button', { className: 'fp-btn', type: 'button', textContent: 'Close', hidden: required });
    const root = el('div', { className: 'fp-picker', role: 'dialog', ariaLabel: 'Choose a location' },
      el('div', { className: 'fp-row' }, el('h2', { textContent: 'Where are you?' }), closeBtn),
      el('div', { className: 'fp-row' }, geoBtn, status),
      el('div', { className: 'fp-row' }, search),
      list,
    );

    function finish(place) {
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
      list.replaceChildren(...CITIES.map(([name, lat, lon]) => option(name, '', { lat, lon, name })));
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
          const res = await fetch(`${GEOCODE}?name=${encodeURIComponent(q)}&count=12&language=en&format=json`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const { results = [] } = await res.json();
          if (mine !== seq) return;
          status.textContent = results.length ? '' : 'No matches. Try a nearby town.';
          list.replaceChildren(...results.map(r => option(r.name, [r.admin1, r.country].filter(Boolean).join(', '),
            { lat: r.latitude, lon: r.longitude, name: r.name, tz: r.timezone })));
        } catch {
          if (mine === seq) status.textContent = 'Search needs a connection. Pick from the list instead.';
          showPresets();
        }
      }, 400);
    };

    geoBtn.onclick = () => {
      if (!navigator.geolocation) { status.textContent = 'Location is not available. Search or pick a place below.'; return; }
      status.textContent = 'Finding location…';
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { latitude: lat, longitude: lon } = pos.coords;
          finish({ lat, lon, name: `Here (${lat.toFixed(1)}°, ${lon.toFixed(1)}°)` });
        },
        err => { status.textContent = `Couldn't get location (${err.message || 'denied'}). Search or pick a place below.`; },
        { timeout: 12000, maximumAge: 600_000 },
      );
    };

    closeBtn.onclick = () => finish(null);
    showPresets();
    document.body.append(root);
  });
}
