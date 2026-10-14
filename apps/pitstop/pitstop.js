// Pit Stop: restrooms, coffee, food, shops and parks within walking distance
// of where the car is parked, from OpenStreetMap. Shows what's open now, and
// a QR code that opens walking directions on a phone.
import { getPlace, pickPlace, savePlace } from '../_shared/place.js';
import { DAYS, openState, parseHours } from './hours.js';

const CACHE_KEY = 'pitstop.cache';
const SETTINGS_KEY = 'pitstop.settings';
const STALE = 86400_000;   // the server's copy is at most a day old too
const KEEP_CACHED = 6;     // spots kept for offline use
const STEP = 0.005;        // the server's location grid, degrees
const API_RADII = [500, 1000, 2000];
const DEG = Math.PI / 180;

const US = /-US$/.test(navigator.language);
const RADII = US
  ? [['¼ mi', 402], ['½ mi', 805], ['1 mi', 1609]]
  : [['500 m', 500], ['1 km', 1000], ['2 km', 2000]];

const ICON = {
  toilets: '<text x="12" y="16.5" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor" font-family="system-ui,sans-serif">WC</text>',
  cafe: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 3c-1 1.5 1 2 0 4M12 3c-1 1.5 1 2 0 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  food: '<path d="M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M17 21V3c-2.5 1-3.5 4-3.5 8h3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  shop: '<path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  outdoors: '<path d="M12 3l6 9h-3l4 6H5l4-6H6zM12 18v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>',
};
const GROUPS = {
  toilets: { label: 'Restrooms', color: '#6cb8ff' },
  cafe: { label: 'Coffee', color: '#d8a26a' },
  food: { label: 'Food', color: '#ff8a5c' },
  shop: { label: 'Shops', color: '#b98cff' },
  outdoors: { label: 'Outdoors', color: '#6fd08c' },
};
const KINDS = {
  toilets: ['toilets', 'Restroom'], cafe: ['cafe', 'Café'], restaurant: ['food', 'Restaurant'], fast_food: ['food', 'Fast food'],
  food_court: ['food', 'Food court'], ice_cream: ['food', 'Ice cream'], bakery: ['food', 'Bakery'],
  supermarket: ['shop', 'Grocery store'], convenience: ['shop', 'Convenience store'], pharmacy: ['shop', 'Pharmacy'], fuel: ['shop', 'Gas station'],
  park: ['outdoors', 'Park'], playground: ['outdoors', 'Playground'], dog_park: ['outdoors', 'Dog park'], water: ['outdoors', 'Drinking water'],
};
const group = p => KINDS[p.kind][0];

const $ = id => document.getElementById(id);
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
};

const settings = { radius: 1, group: 'all', ...store.get(SETTINGS_KEY) };
let place = getPlace();
let places = [];     // [{ id, kind, lat, lon, name?, hours?, ..., dist, bearing, week, state }]
let selected = null; // place id
let loading = false;
let reload = false;  // place or distance changed during a search: run it again
let fetchedAt = 0;

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function badge(g) {
  const b = el('span', { className: 'badge' });
  b.style.background = GROUPS[g].color + '2a';
  b.style.color = GROUPS[g].color;
  b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[g]}</svg>`;   // fixed markup from ICON above
  return b;
}

// ---------- geometry and formatting ----------

function distBearing(lat1, lon1, lat2, lon2) {
  const p1 = lat1 * DEG, p2 = lat2 * DEG, dl = (lon2 - lon1) * DEG;
  const a = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  const dist = 2 * 6371_000 * Math.asin(Math.sqrt(a));
  const y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return { dist, bearing: (Math.atan2(y, x) / DEG + 360) % 360 };
}

const compass = deg => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];

function distance(m) {
  if (US) {
    const mi = m / 1609.344;
    return mi < 0.1 ? `${Math.round(m * 3.28084 / 50) * 50 || 50} ft` : `${mi.toFixed(1)} mi`;
  }
  return m < 1000 ? `${Math.round(m / 10) * 10 || 10} m` : `${(m / 1000).toFixed(1)} km`;
}

// Streets don't run straight to the door: add a quarter, at 80 m a minute
const walk = m => `${Math.max(1, Math.round(m * 1.25 / 80))} min walk`;

function clock(min) {
  min = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(min / 60), m = min % 60;
  if (!US) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  if (min === 0) return 'midnight';
  if (min === 720) return 'noon';
  return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// The time where the car is parked: the place's time zone when the picker
// knows it, else this screen's clock (right for "Here"). Null when unknown.
function localNow() {
  const tz = place?.tz || (/^Here\b/.test(place?.name || '') ? undefined : null);
  if (tz === null) return null;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
  }).formatToParts(new Date()).map(p => [p.type, p.value]));
  return { day: DAY_NAMES.indexOf(parts.weekday), min: +parts.hour * 60 + +parts.minute };
}

// -> { text, cls } for "Open · closes 9 PM", or null when the hours are unknown
function stateText(s, now) {
  if (!s) return null;
  if (s.always) return { text: 'Open 24 hours', cls: 'open' };
  const when = at => (at.day === now.day ? clock(at.min) : `${DAY_NAMES[at.day]} ${clock(at.min)}`);
  if (s.open) return s.in <= 30 ? { text: `Closes soon · ${clock(s.at.min)}`, cls: 'soon' } : { text: `Open · closes ${when(s.at)}`, cls: 'open' };
  if (!s.at) return { text: 'Closed', cls: 'closed' };
  return s.in <= 60 ? { text: `Opens soon · ${clock(s.at.min)}`, cls: 'soon' } : { text: `Closed · opens ${when(s.at)}`, cls: 'closed' };
}

function title(p) {
  if (p.name) return p.name;
  if (p.kind === 'toilets') return p.access === 'customers' ? 'Restroom (customers)' : 'Public restroom';
  return p.brand || KINDS[p.kind][1];
}

const tidy = s => s.split(';').map(v => v.trim().replace(/_/g, ' ')).filter(Boolean).join(', ');

function describe(p) {
  const bits = [];
  if (p.kind === 'toilets') {
    if (p.fee === 'no') bits.push('Free');
    else if (p.fee === 'yes') bits.push('Paid');
    if (p.wheelchair === 'yes') bits.push('Wheelchair accessible');
    if (p.changing === 'yes') bits.push('Changing table');
    return bits.join(' · ') || ' ';
  }
  if (title(p) !== KINDS[p.kind][1]) bits.push(KINDS[p.kind][1]);
  if (p.cuisine) bits.push(tidy(p.cuisine));
  if (p.toilets === 'yes') bits.push('Restroom');
  return bits.join(' · ') || ' ';
}

// ---------- data ----------

const snap = v => (Math.round(v / STEP) * STEP).toFixed(3);
const apiRadius = m => API_RADII.find(r => r >= m) || API_RADII[API_RADII.length - 1];

async function fetchPlaces(lat, lon, r, force) {
  const url = `/api/places?lat=${snap(lat)}&lon=${snap(lon)}&r=${r}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { cache: force ? 'no-cache' : 'default' });
    if (res.ok) return (await res.json()).places;
    const error = (await res.json().catch(() => ({}))).error || `HTTP ${res.status}`;
    // OpenStreetMap's servers are often busy; one more try usually works
    if (res.status !== 503 || attempt) throw new Error(error);
    await new Promise(r => setTimeout(r, 3000));
  }
}

function measure() {
  const now = localNow();
  for (const p of places) {
    Object.assign(p, distBearing(place.lat, place.lon, p.lat, p.lon));
    p.week = parseHours(p.hours);
    p.state = p.week && now ? openState(p.week, now) : null;
  }
}

// ---------- list ----------

function visible() {
  const radius = RADII[settings.radius][1];
  return places.filter(p => p.dist <= radius && (settings.group === 'all' || group(p) === settings.group))
    .sort((a, b) => a.dist - b.dist);
}

function renderList() {
  const now = localNow();
  const list = visible();
  const items = list.slice(0, 150).map(p => {
    const st = stateText(p.state, now);
    const dist = el('span', { className: 'dist' }, el('b', { textContent: distance(p.dist) }), ` ${compass(p.bearing)} · ${walk(p.dist)}`);
    if (st) dist.append(' · ', el('span', { className: st.cls, textContent: st.text.split(' · ')[0] }));
    const b = el('button', { className: 'item', type: 'button' },
      badge(group(p)),
      el('span', {},
        el('span', { className: 'name', textContent: title(p) }),
        el('span', { className: 'desc', textContent: describe(p) }),
        dist));
    b.dataset.id = p.id;
    b.setAttribute('aria-pressed', String(p.id === selected));
    b.onclick = () => open(p.id);
    return b;
  });
  $('list').replaceChildren(...items);
  const where = RADII[settings.radius][0];
  const what = settings.group === 'all' ? 'places' : GROUPS[settings.group].label.toLowerCase();
  const openNow = list.filter(p => p.state?.open).length;
  $('summary').textContent = list.length
    ? `${list.length} ${what} within ${where}${openNow ? ` · ${openNow} open now` : ''}${list.length > 150 ? ' · closest 150 shown' : ''}`
    : '';
  if (places.length && !list.length) setMsg(`No ${what} found within ${where}. Try a wider distance.`);
  else if (places.length) setMsg('');
}

function markSelected() {
  for (const b of $('list').children) b.setAttribute('aria-pressed', String(b.dataset.id === selected));
}

// ---------- map ----------

const canvas = $('map');
const ctx = canvas.getContext('2d');
let dots = [];

function draw() {
  const dpr = devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (!place) return;
  // Room for the hub's Apps button above and labels around the edge
  const cx = w / 2, cy = (h + 40) / 2, R = Math.max(40, Math.min(w / 2 - 30, (h - 40) / 2 - 26));
  const radius = RADII[settings.radius][1];

  ctx.lineWidth = 1;
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of [1 / 2, 1]) {
    ctx.strokeStyle = 'rgba(150, 175, 220, .18)';
    ctx.beginPath(); ctx.arc(cx, cy, R * f, 0, 2 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#6c7689';
    ctx.fillText(`${walk(radius * f)}`, cx + R * f * Math.SQRT1_2 + 4, cy + R * f * Math.SQRT1_2 + 10);
  }
  ctx.strokeStyle = 'rgba(150, 175, 220, .1)';
  ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.fillStyle = '#9aa6bc';
  [['N', 0, -1], ['E', 1, 0], ['S', 0, 1], ['W', -1, 0]].forEach(([t, x, y]) => ctx.fillText(t, cx + x * (R + 14), cy + y * (R + 14)));

  const list = visible();
  dots = list.map(p => {
    const r = Math.min(1, p.dist / radius) * R;
    return { p, x: cx + r * Math.sin(p.bearing * DEG), y: cy - r * Math.cos(p.bearing * DEG) };
  });
  const sel = dots.find(d => d.p.id === selected);

  if (sel) {
    ctx.strokeStyle = 'rgba(255, 255, 255, .5)';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(sel.x, sel.y); ctx.stroke();
    ctx.setLineDash([]);
  }

  // Closed places are drawn dim, under the open ones
  for (const d of [...dots].sort((a, b) => !!a.p.state?.open - !!b.p.state?.open)) {
    if (d === sel) continue;
    ctx.globalAlpha = d.p.state && !d.p.state.open ? 0.35 : 1;
    ctx.fillStyle = GROUPS[group(d.p)].color;
    ctx.beginPath(); ctx.arc(d.x, d.y, d.p.kind === 'toilets' ? 6 : 4.5, 0, 2 * Math.PI); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Name the closest places that have room for a label
  ctx.font = '13px system-ui, sans-serif';
  const boxes = [];
  const label = (d, color, force) => {
    const name = title(d.p);
    const text = name.length > 26 ? name.slice(0, 25) + '…' : name;
    const tw = ctx.measureText(text).width;
    const box = { x: d.x - tw / 2 - 3, y: d.y - 25, w: tw + 6, h: 17 };
    if (!force && boxes.some(b => box.x < b.x + b.w && b.x < box.x + box.w && box.y < b.y + b.h && b.y < box.y + box.h)) return;
    boxes.push(box);
    ctx.fillStyle = 'rgba(11, 16, 24, .8)';
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = color;
    ctx.fillText(text, d.x, d.y - 16);
  };
  if (sel) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(sel.x, sel.y, 9, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = GROUPS[group(sel.p)].color;
    ctx.beginPath(); ctx.arc(sel.x, sel.y, 6, 0, 2 * Math.PI); ctx.fill();
    label(sel, '#fff', true);
  }
  dots.filter(d => d !== sel && d.p.name).slice(0, 12).forEach(d => label(d, '#d4dbe7'));

  // The car
  ctx.fillStyle = '#e4e8f0';
  ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 2 * Math.PI); ctx.fill();
  ctx.strokeStyle = 'rgba(228, 232, 240, .35)';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(cx, cy, 11, 0, 2 * Math.PI); ctx.stroke();
}

canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  let best = null, bestD = 24;
  for (const d of dots) {
    const dd = Math.hypot(d.x - x, d.y - y);
    if (dd < bestD) { best = d; bestD = dd; }
  }
  if (best) open(best.p.id);
});

new ResizeObserver(draw).observe(canvas);

// ---------- details ----------

function hoursTable(week, now) {
  const rows = week.map((day, d) => {
    const text = day.length ? day.map(([a, b]) => (b - a >= 1440 ? '24 hours' : `${clock(a)} – ${clock(b)}`)).join(', ') : 'Closed';
    const tr = el('tr', {}, el('td', { textContent: DAY_NAMES[d] }), el('td', { textContent: text }));
    if (now && d === now.day) tr.className = 'today';
    return tr;
  });
  return el('table', { className: 'hours' }, el('tbody', {}, ...rows));
}

function facts(p) {
  const out = [];
  if (p.kind === 'toilets') {
    if (p.fee === 'no') out.push('Free to use');
    if (p.fee === 'yes') out.push('Costs a fee');
    if (p.access === 'customers') out.push('For customers only');
  } else if (p.toilets === 'yes') out.push('Has a restroom');
  else if (p.toilets === 'no') out.push('No restroom');
  if (p.wheelchair === 'yes') out.push('Wheelchair accessible');
  if (p.wheelchair === 'limited') out.push('Partly wheelchair accessible');
  if (p.changing === 'yes') out.push('Baby changing table');
  if (p.cuisine) out.push(`Serves ${tidy(p.cuisine)}`);
  if (p.seats === 'yes') out.push('Indoor seating');
  if (p.drive === 'yes') out.push('Drive-through');
  if (p.brand && p.brand !== p.name) out.push(p.brand);
  return out;
}

function open(id) {
  const p = places.find(q => q.id === id);
  if (!p) return;
  selected = id;
  markSelected();
  const now = localNow();
  const st = stateText(p.state, now);
  const side = [];
  if (p.week) side.push(el('h2', { textContent: 'Hours' }), hoursTable(p.week, now));
  else if (p.hours) side.push(el('h2', { textContent: 'Hours' }), el('p', { className: 'raw', textContent: p.hours }));
  const list = facts(p);
  if (list.length) side.push(el('h2', { textContent: 'Details' }), el('ul', { className: 'facts' }, ...list.map(t => el('li', { textContent: t }))));

  // Google Maps links open walking directions on iPhone and Android, in the
  // app or the browser
  const link = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}&travelmode=walking`;
  const qr = el('div', { className: 'qr' });
  new QRCode(qr, { text: link, width: 114, height: 114, correctLevel: QRCode.CorrectLevel.M });
  const type = { n: 'node', w: 'way', r: 'relation' }[p.id[0]];

  $('detail').replaceChildren(
    el('div', { className: 'top' },
      el('div', {},
        el('h1', { textContent: title(p) }),
        el('div', { className: 'sub' }, el('b', { textContent: `${distance(p.dist)} ${compass(p.bearing)}` }), ` · ${walk(p.dist)} · ${KINDS[p.kind][1]}`),
        ...(st ? [el('p', { className: `state ${st.cls}`, textContent: st.text })] : [])),
      el('div', { className: 'phone' }, qr, el('p', { textContent: 'Scan for walking directions on your phone' }))),
    el('div', { className: 'cols' },
      el('div', {}, ...(side.length ? side : [el('p', { className: 'raw', textContent: 'No hours or details listed.' })]))),
    el('div', { className: 'credit', textContent: `From OpenStreetMap. Something wrong or missing? Anyone can fix it at openstreetmap.org/${type}/${p.id.slice(1)}` }));
  $('detail').hidden = false;
  $('detail').scrollTop = 0;
  $('detailTools').hidden = false;
  draw();
}

function closeDetail() {
  $('detail').hidden = true;
  $('detailTools').hidden = true;
  draw();
}
$('mapBtn').onclick = closeDetail;

// ---------- loading ----------

function setMsg(text) { $('msg').textContent = text; }

function showPlace() {
  $('placeBtn').textContent = place ? place.name : 'Set location';
  $('mapNote').textContent = place ? 'North is up · Tap a dot or a place in the list' : '';
}

async function load(force = false) {
  if (!place) return;
  if (loading) { reload = true; return; }
  loading = true;
  try { await findAndShow(force); } finally { loading = false; }
  if (reload) { reload = false; load(); }
}

async function findAndShow(force) {
  const r = apiRadius(RADII[settings.radius][1]);
  const key = `${snap(place.lat)},${snap(place.lon)}`;
  const cache = store.get(CACHE_KEY) || [];
  const hit = cache.find(c => c.key === key && c.r >= r);
  selected = null;
  closeDetail();
  if (hit && !force && Date.now() - hit.fetched < STALE) {
    places = hit.places;
    fetchedAt = hit.fetched;
  } else {
    setMsg('Asking OpenStreetMap what\'s nearby… The first look at a new spot can take a minute or two.');
    $('list').replaceChildren();
    $('summary').textContent = '';
    try {
      const found = await fetchPlaces(place.lat, place.lon, r, force);
      const entry = { key, r, fetched: Date.now(), places: found };
      // Newest first; drop old spots if storage is full
      const list = [entry, ...cache.filter(c => c.key !== key)].slice(0, KEEP_CACHED);
      for (let n = list.length; n > 0; n--) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(list.slice(0, n))); break; } catch {}
      }
      if (reload) return;   // these results are for the old place or distance
      places = found;
      fetchedAt = entry.fetched;
    } catch (e) {
      if (reload) return;
      if (hit) { places = hit.places; fetchedAt = hit.fetched; }
      else { places = []; setMsg(`${navigator.onLine === false ? 'No connection.' : e.message} Tap ↻ to try again.`); draw(); return; }
    }
  }
  measure();
  setMsg(places.length ? '' : 'Nothing listed on OpenStreetMap near here yet. Try a wider distance.');
  showPlace();
  renderList();
  draw();
}

// Open and closed change with the clock
setInterval(() => {
  if (!places.length) return;
  measure();
  renderList();
  draw();
  if (selected && !$('detail').hidden) open(selected);
}, 60_000);

function setPlace(p) {
  if (!p) return;
  place = p;
  showPlace();
  load();
}

function locate() {
  if (!navigator.geolocation) { pickPlace().then(setPlace); return; }
  setMsg('Finding this car\'s location…');
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      const p = { lat, lon, name: `Here (${lat.toFixed(1)}°, ${lon.toFixed(1)}°)` };
      savePlace(p);
      setPlace(p);
    },
    () => { setMsg('Couldn\'t get this car\'s location. Pick a place instead.'); pickPlace().then(setPlace); },
    { timeout: 12000, maximumAge: 60_000 },
  );
}

// ---------- controls ----------

function groupChip(id, label, color) {
  const b = el('button', { className: 'chip', type: 'button' });
  if (color) { const dot = el('i'); dot.style.background = color; b.append(dot); }
  b.append(label);
  b.dataset.group = id;
  b.setAttribute('aria-pressed', String(id === settings.group));
  b.onclick = () => {
    settings.group = id;
    store.set(SETTINGS_KEY, settings);
    document.querySelectorAll('[data-group]').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
    renderList();
    $('list').scrollTop = 0;
    draw();
  };
  return b;
}
$('groupsA').append(...['toilets', 'cafe', 'food'].map(g => groupChip(g, GROUPS[g].label, GROUPS[g].color)));
$('groupsB').append(...['shop', 'outdoors'].map(g => groupChip(g, GROUPS[g].label, GROUPS[g].color)), groupChip('all', 'All'));

$('radii').append(...RADII.map(([label], i) => {
  const b = el('button', { className: 'chip', type: 'button', textContent: label });
  b.setAttribute('aria-pressed', String(i === settings.radius));
  b.onclick = () => {
    settings.radius = i;
    store.set(SETTINGS_KEY, settings);
    for (const c of $('radii').children) c.setAttribute('aria-pressed', String(c === b));
    load();
  };
  return b;
}));

$('placeBtn').onclick = () => pickPlace().then(setPlace);
$('hereBtn').onclick = locate;
// A minute after the last look, ↻ asks again; before that the copy is fresh
$('refreshBtn').onclick = () => load(Date.now() - fetchedAt > 60_000);

// ---------- start ----------

// This app is about where the car is now, so use the car's location
// whenever the browser has already been allowed to share it.
(async () => {
  let granted = false;
  try { granted = (await navigator.permissions.query({ name: 'geolocation' })).state === 'granted'; } catch {}
  if (granted) { locate(); return; }
  if (place) { showPlace(); load(); return; }
  setPlace(await pickPlace({ required: true }));
})();
