// Planes Overhead: a live flight radar for wherever the car is parked. The
// base map is MapLibre; the planes are drawn on a canvas above it, labeled the
// way an air traffic control screen labels them, so moving them never makes
// the map redraw. Positions arrive every 12 seconds and are carried forward
// along each plane's heading in between.
import { Map as MapView } from './maplibre/maplibre-gl.mjs';
import { chartStyle } from './map-style.js';
import { flightName, typeName } from './names.js';
import { getPlace, herePlace, locationError, pickPlace, savePlace } from '../_shared/place.js';
import { setMiles, useMiles } from '../_shared/units.js';
import { keepAwake } from '../_shared/awake.js';

const POLL = 12_000, POLL_IDLE = 30_000, POLL_FAILED = 20_000;
const IDLE_AFTER = 10 * 60_000;   // no touch for this long: someone's just watching, so ask less
const STALE = 90_000;             // with no answers at all for this long, planes are dropped
const WAIT = 20_000;              // a request that hasn't answered by now has failed
const BASE_RETRY = 30_000;
const ZOOM_KEY = 'planes.zoom';
const BLEND = 1_500;              // a corrected position slides into place over this long
const LIST_MAX = 40;
const TRAIL_MAX = 60;
const DOTS = 5;                   // history dots behind each plane
const R = 6371_000, DEG = Math.PI / 180, NM = 1852;
// Circle sizes the server accepts, nautical miles -> its grid step in degrees
const TIERS = [[30, 0.1], [60, 0.2], [120, 0.5], [250, 1]];

const COLORS = { low: '#ff7cc0', mid: '#ffc65c', high: '#a5e6ff', alert: '#ff6a5e' };
const band = p => (p.emergency ? 'alert' : p.alt < 10_000 ? 'low' : p.alt < 25_000 ? 'mid' : 'high');

// Nose up, about 20 px across
const PLANE = new Path2D('M0-10c1 0 1.6 1.2 1.6 2.6V-3l8 5v2.2L1.6 1.8V6l2.4 1.8v1.6L0 8.4l-4 1V7.8L-1.6 6V1.8l-8 2.4V2l8-5v-4.4C-1.6-8.8-1-10 0-10z');
const ROTOR = new Path2D('M-9-1.2 9 1.2M-1.2 9 1.2-9');
const BODY = new Path2D('M0-5a3 3 0 0 1 3 3v4a3 3 0 0 1-6 0v-4a3 3 0 0 1 3-3z');
const sizeFor = cat => (cat === 'A5' || cat === 'A4' ? 1.15 : cat === 'A1' || cat === 'A2' || cat === 'B1' ? 0.8 : 0.95);

const $ = id => document.getElementById(id);
const canvas = $('air'), ctx = canvas.getContext('2d');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let miles = useMiles();
let place = null;
let map = null;
const planes = new Map();   // hex -> plane
let selected = null;        // a plane, kept even after it stops reporting
let inView = [];            // planes on screen at the last draw
let w = 0, h = 0, dpr = 1;
let dirty = true, lastDraw = 0;
let pollTimer = 0, asking = null, askedKey = '', lastGood = 0, failures = 0, lastTouch = Date.now(), everLoaded = false;
let touchingList = false;
let baseRetry = 0;

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

// ---------- geometry and wording ----------

function haversine(lat1, lon1, lat2, lon2) {
  const p1 = lat1 * DEG, p2 = lat2 * DEG, dl = (lon2 - lon1) * DEG;
  const a = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function bearing(lat1, lon1, lat2, lon2) {
  const p1 = lat1 * DEG, p2 = lat2 * DEG, dl = (lon2 - lon1) * DEG;
  return (Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) / DEG + 360) % 360;
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const COMPASS_WORDS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
const octant = deg => Math.round(deg / 45) % 8;

const altitudeValue = ft => (miles ? Math.round(Math.max(0, ft) / 100) * 100 : Math.round(Math.max(0, ft) * 0.3048 / 50) * 50);
const altitude = ft => `${altitudeValue(ft).toLocaleString('en-US')} ${miles ? 'ft' : 'm'}`;
// In the fixed-width label a comma or space takes a whole cell, so it has neither
const altitudeTag = ft => `${altitudeValue(ft)}${miles ? 'ft' : 'm'}`;
const speed = kt => (kt == null ? 'Unknown' : miles ? `${Math.round(kt * 1.15078)} mph` : `${Math.round(kt * 1.852)} km/h`);
function distance(m) {
  const v = miles ? m / 1609.344 : m / 1000;
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${miles ? 'mi' : 'km'}`;
}
const trend = p => (p.rate == null || Math.abs(p.rate) < 250 ? '' : p.rate > 0 ? '▲' : '▼');

// Where the plane is now: last report, carried forward along its heading,
// plus whatever's left of the slide from where it was last drawn
function locate(p, now) {
  const dt = Math.max(0, Math.min(60, (now - p.at) / 1000));
  const d = (p.kt || 0) * 0.514444 * dt, t = (p.track ?? 0) * DEG;
  const left = Math.max(0, 1 - (now - p.landed) / BLEND);
  p.now.lat = p.lat + d * Math.cos(t) / 111_320 + p.slideLat * left;
  p.now.lon = p.lon + d * Math.sin(t) / (111_320 * Math.max(0.05, Math.cos(p.lat * DEG))) + p.slideLon * left;
  return p.now;
}

// ---------- flight data ----------

const snap = (v, step) => (Math.round(v / step) * step).toFixed(1);

// The smallest circle that covers the whole map from anywhere in its grid cell
function wanted() {
  const c = map.getCenter(), lon = ((c.lng + 540) % 360) - 180;
  const perPx = 40_075_016.7 * Math.cos(c.lat * DEG) / (512 * 2 ** map.getZoom());
  const need = Math.hypot(w, h) / 2 * perPx / NM;
  const [r, step] = TIERS.find(([r, step]) => r - step * 0.71 * 60 >= need) || TIERS[TIERS.length - 1];
  const lat = Math.max(-85, Math.min(85, c.lat));
  return `lat=${snap(lat, step)}&lon=${snap(lon, step)}&r=${r}`;
}

function ingest(data) {
  const now = Date.now();
  // A car's clock can be far off; then count from when the answer arrived
  const base = Math.abs(now - data.now) < 120_000 ? data.now : now;
  const seen = new Set();
  for (const [hex, callsign, lat, lon, alt, kt, track, rate, type, reg, cat, old, emergency] of data.ac) {
    seen.add(hex);
    let p = planes.get(hex);
    if (!p && selected?.hex === hex) {   // the chosen plane is back in range
      p = selected;
      p.lost = false;
      planes.set(hex, p);
    }
    if (!p) {
      p = { hex, trail: [], now: { lat, lon }, slideLat: 0, slideLon: 0, landed: 0, tag: -1, x: 0, y: 0 };
      planes.set(hex, p);
    } else {
      const was = locate(p, now), wasLat = was.lat, wasLon = was.lon;
      p.jumpFrom = [wasLat, wasLon];
    }
    Object.assign(p, { callsign, lat, lon, alt, kt, track, rate, type, reg, cat, emergency, at: base - old * 1000, heard: now });
    if (p.jumpFrom) {
      const next = locate({ ...p, slideLat: 0, slideLon: 0, landed: 0, now: { lat, lon } }, now);
      const dLat = p.jumpFrom[0] - next.lat, dLon = p.jumpFrom[1] - next.lon;
      // A big jump is a plane that was out of range, not one to slide across the map
      const smooth = !reduceMotion && Math.hypot(dLat, dLon) < 0.2;
      p.slideLat = smooth ? dLat : 0;
      p.slideLon = smooth ? dLon : 0;
      p.landed = now;
      p.jumpFrom = null;
    }
    const last = p.trail[p.trail.length - 1];
    if (!last || last[0] !== lat || last[1] !== lon) {
      p.trail.push([lat, lon]);
      if (p.trail.length > TRAIL_MAX) p.trail.shift();
    }
  }
  // The server keeps a plane for a minute after its last report, so one missing
  // from a good answer has landed or left the circle
  for (const hex of planes.keys()) if (!seen.has(hex)) planes.delete(hex);
}

function schedule(ms) {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(ask, ms);
}

async function ask() {
  clearTimeout(pollTimer);
  if (!map || document.hidden) return;   // showing the page again asks again
  asking?.abort();
  const stop = asking = new AbortController();
  const key = wanted();
  try {
    const res = await fetch(`/api/planes?${key}`, { signal: AbortSignal.any([stop.signal, AbortSignal.timeout(WAIT)]) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    askedKey = key;
    ingest(data);
    lastGood = Date.now();
    failures = 0;
    everLoaded = true;
    dirty = true;
    placeTags();
    renderPanel();
    if (selected?.info?.failed) lookUp(selected);   // the connection's back
  } catch (e) {
    if (stop.signal.aborted) return;
    failures++;
    if (Date.now() - lastGood > STALE) { planes.clear(); dirty = true; placeTags(); }
    renderPanel();
  }
  schedule(failures ? POLL_FAILED : Date.now() - lastTouch > IDLE_AFTER ? POLL_IDLE : POLL);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { asking?.abort(); clearTimeout(pollTimer); } else ask();
});
addEventListener('online', () => {
  if (failures) ask();
  if (baseRetry) retryBase();
});
addEventListener('pointerdown', () => {
  const wasIdle = Date.now() - lastTouch > IDLE_AFTER;
  lastTouch = Date.now();
  if (wasIdle) ask();
}, { passive: true });

// ---------- drawing ----------

function resize() {
  const box = canvas.parentElement.getBoundingClientRect();
  w = box.width; h = box.height;
  dpr = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  dirty = true;
}

function toScreen(lat, lon, centerLon) {
  // Keep the plane on the same copy of the world as the map's center
  const pt = map.project([lon + Math.round((centerLon - lon) / 360) * 360, lat]);
  return pt;
}

const RINGS = { mi: [2, 5, 10, 25, 50, 100, 250, 500], km: [5, 10, 25, 50, 100, 250, 500, 1000] };

// Range rings around the car, as on a radar screen, with the car at the center
function drawYou(lat, lon, centerLon, perPx) {
  const pt = toScreen(lat, lon, centerLon);
  const unit = miles ? 'mi' : 'km', meters = miles ? 1609.344 : 1000;
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(165, 230, 255, .34)';
  ctx.fillStyle = 'rgba(165, 230, 255, .62)';
  ctx.font = '11px "B612 Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const far = Math.hypot(w, h);
  for (const ring of RINGS[unit]) {
    const r = ring * meters / perPx;
    if (r < 56 || r > far + Math.hypot(pt.x - w / 2, pt.y - h / 2)) continue;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillText(`${ring} ${unit}`, pt.x, pt.y - r - 1);
  }
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
  ctx.moveTo(pt.x - 11, pt.y); ctx.lineTo(pt.x - 5, pt.y);
  ctx.moveTo(pt.x + 5, pt.y); ctx.lineTo(pt.x + 11, pt.y);
  ctx.moveTo(pt.x, pt.y - 11); ctx.lineTo(pt.x, pt.y - 5);
  ctx.moveTo(pt.x, pt.y + 5); ctx.lineTo(pt.x, pt.y + 11);
  ctx.stroke();
}

// Points along the shortest path over the globe
function greatCircle(a, b, n = 40) {
  const p1 = a.lat * DEG, l1 = a.lon * DEG, p2 = b.lat * DEG, l2 = b.lon * DEG;
  const d = haversine(a.lat, a.lon, b.lat, b.lon) / R;
  if (d < 1e-4) return [a, b];
  return Array.from({ length: n + 1 }, (_, i) => {
    const f = i / n, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
    const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
    const z = A * Math.sin(p1) + B * Math.sin(p2);
    return { lat: Math.atan2(z, Math.hypot(x, y)) / DEG, lon: Math.atan2(y, x) / DEG };
  });
}

function strokeGeo(points, centerLon) {
  ctx.beginPath();
  let lon = points[0].lon;
  points.forEach((g, i) => {
    lon += ((g.lon - lon + 540) % 360) - 180;   // stay continuous across the date line
    const pt = toScreen(g.lat, lon, centerLon);
    if (i) ctx.lineTo(pt.x, pt.y); else ctx.moveTo(pt.x, pt.y);
  });
  ctx.stroke();
}

function drawRoute(p, at, centerLon) {
  const route = p.info?.route;
  if (!route) return;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255, 255, 255, .34)';
  ctx.setLineDash([]);
  strokeGeo(greatCircle(route.from, at), centerLon);
  ctx.strokeStyle = 'rgba(255, 255, 255, .8)';
  ctx.setLineDash([6, 5]);
  strokeGeo(greatCircle(at, route.to), centerLon);
  ctx.setLineDash([]);
}

function drawTrail(p, centerLon) {
  if (p.trail.length < 2) return;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, .55)';
  ctx.beginPath();
  p.trail.forEach(([lat, lon], i) => {
    const pt = toScreen(lat, lon, centerLon);
    if (i) ctx.lineTo(pt.x, pt.y); else ctx.moveTo(pt.x, pt.y);
  });
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
}

const TAG_W = 74, TAG_H = 30, TAG_GAP = 14;
// Corners a label can sit at, offset from the plane: NE, NW, SE, SW
const SIDES = [[1, -1], [-1, -1], [1, 1], [-1, 1]];
const tagBox = (p, side) => {
  const [sx, sy] = SIDES[side];
  return { x: sx > 0 ? p.x + TAG_GAP : p.x - TAG_GAP - TAG_W, y: sy > 0 ? p.y + TAG_GAP - 8 : p.y - TAG_GAP - TAG_H + 8 };
};
const hits = (a, b) => a.x < b.x + (b.w ?? TAG_W) && b.x < a.x + (a.w ?? TAG_W) && a.y < b.y + (b.h ?? TAG_H) && b.y < a.y + (a.h ?? TAG_H);

// Labels go on the closest planes first, wherever they don't cover each other
// or the buttons. Planes keep their corner from one update to the next.
function placeTags() {
  if (!map) return;
  const now = Date.now(), center = map.getCenter();
  const ref = reference();
  const order = [];
  for (const p of planes.values()) {
    const g = locate(p, now), pt = toScreen(g.lat, g.lon, center.lng);
    p.x = pt.x; p.y = pt.y; p.tag = -1;
    if (pt.x < 0 || pt.y < 0 || pt.x > w || pt.y > h) continue;
    order.push(p);
    p.d = haversine(ref.lat, ref.lon, g.lat, g.lon);
  }
  order.sort((a, b) => (b === selected) - (a === selected) || a.d - b.d);
  // The hub's Apps button, the map's own buttons and the legend
  const taken = [{ x: 0, y: 0, w: 110, h: 60 }, { x: w - 64, y: 0, w: 64, h: 176 }, { x: 0, y: h - 72, w: 176, h: 72 }];
  const maxTags = Math.round(w * h / 20_000);
  let placed = 0;
  for (const p of order) {
    if (placed >= maxTags && p !== selected) break;
    const sides = p.lastTag >= 0 ? [p.lastTag, 0, 1, 2, 3] : [0, 1, 2, 3];
    for (const side of sides) {
      const box = tagBox(p, side);
      if (box.x < 2 || box.y < 2 || box.x + TAG_W > w - 2 || box.y + TAG_H > h - 2) continue;
      if (taken.some(t => hits(t, box))) continue;
      p.tag = side;
      p.lastTag = side;
      taken.push(box);
      placed++;
      break;
    }
  }
  dirty = true;
}

function drawTag(p, color) {
  const box = tagBox(p, p.tag);
  const [sx, sy] = SIDES[p.tag];
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(p.x + sx * 6, p.y + sy * 6);
  ctx.lineTo(sx > 0 ? box.x : box.x + TAG_W, sy > 0 ? box.y + 8 : box.y + TAG_H - 8);
  ctx.stroke();
  ctx.fillStyle = 'rgba(11, 26, 40, .78)';
  ctx.fillRect(box.x, box.y, TAG_W, TAG_H);
  const tx = box.x + 4;
  ctx.fillStyle = color;
  ctx.font = '700 12px "B612 Mono", monospace';
  ctx.fillText((p.callsign || p.reg || p.hex).slice(0, 10), tx, box.y + 2);
  ctx.fillStyle = '#dbe7ef';
  ctx.font = '11px "B612 Mono", monospace';
  ctx.fillText(`${altitudeTag(p.alt)}${trend(p)}`, tx, box.y + 16);
}

function draw(now) {
  lastDraw = now;
  dirty = false;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (!map) return;
  const center = map.getCenter(), zoom = map.getZoom();
  const perPx = 40_075_016.7 * Math.cos(center.lat * DEG) / (512 * 2 ** zoom);
  const clock = Date.now();

  if (place) drawYou(place.lat, place.lon, center.lng, perPx);

  inView = [];
  for (const p of planes.values()) {
    const g = locate(p, clock), pt = toScreen(g.lat, g.lon, center.lng);
    p.x = pt.x; p.y = pt.y;
    if (pt.x > -30 && pt.y > -30 && pt.x < w + 30 && pt.y < h + 30) inView.push(p);
  }

  if (selected) {
    if (!selected.lost) drawTrail(selected, center.lng);
    drawRoute(selected, selected.now, center.lng);
  }

  // History dots: where each plane was at its last few reports
  ctx.globalAlpha = 0.5;
  for (const p of inView) {
    if (p === selected) continue;
    ctx.fillStyle = COLORS[band(p)];
    for (let i = Math.max(0, p.trail.length - DOTS); i < p.trail.length; i++) {
      const pt = toScreen(p.trail[i][0], p.trail[i][1], center.lng);
      ctx.fillRect(pt.x - 1, pt.y - 1, 2, 2);
    }
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = 'rgba(8, 20, 32, .9)';
  ctx.lineWidth = 1.5;
  for (const p of inView) {
    const color = p === selected ? '#fff' : COLORS[band(p)];
    const s = sizeFor(p.cat) * dpr, t = (p.track ?? 0) * DEG, c = Math.cos(t) * s, n = Math.sin(t) * s;
    ctx.setTransform(c, n, -n, c, p.x * dpr, p.y * dpr);
    ctx.fillStyle = color;
    if (p.cat === 'A7') {
      ctx.stroke(BODY); ctx.fill(BODY);
      ctx.strokeStyle = color;
      ctx.stroke(ROTOR);
      ctx.strokeStyle = 'rgba(8, 20, 32, .9)';
    } else {
      ctx.stroke(PLANE); ctx.fill(PLANE);
    }
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (selected && inView.includes(selected)) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(selected.x, selected.y, 16, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (const p of inView) if (p.tag >= 0) drawTag(p, p === selected ? '#fff' : COLORS[band(p)]);
}

function frame(t) {
  requestAnimationFrame(frame);
  if (document.hidden) return;
  // Up close planes move several pixels a second; zoomed out, about one
  const every = map && map.getZoom() >= 10 ? 80 : 200;
  if (dirty || t - lastDraw >= every) draw(t);
}

// ---------- the list and one plane's details ----------

function reference() {
  if (place && map) {
    const pt = toScreen(place.lat, place.lon, map.getCenter().lng);
    if (pt.x >= 0 && pt.y >= 0 && pt.x <= w && pt.y <= h) return { lat: place.lat, lon: place.lon, you: true };
  }
  const c = map.getCenter();
  return { lat: c.lat, lon: c.lng, you: false };
}

const rows = [];
function row(i) {
  if (rows[i]) return rows[i];
  const parts = {
    name: el('b'), alt: el('span', { className: 'alt' }), type: el('span', { className: 'type' }), far: el('span', { className: 'far' }),
  };
  const button = el('button', { className: 'row', type: 'button', hidden: true }, parts.name, parts.alt, parts.type, parts.far);
  button.onclick = () => select(planes.get(button.dataset.hex));
  $('list').append(button);
  return (rows[i] = { button, ...parts });
}
$('list').addEventListener('pointerdown', () => { touchingList = true; }, { passive: true });
addEventListener('pointerup', () => { if (touchingList) { touchingList = false; renderList(); } }, { passive: true });
addEventListener('pointercancel', () => { if (touchingList) { touchingList = false; renderList(); } }, { passive: true });

function renderList() {
  if (touchingList || !map || selected) return;
  const ref = reference(), now = Date.now();
  const shown = [];
  for (const p of planes.values()) {
    const g = locate(p, now);
    p.d = haversine(ref.lat, ref.lon, g.lat, g.lon);
    p.dir = bearing(ref.lat, ref.lon, g.lat, g.lon);
    const pt = toScreen(g.lat, g.lon, map.getCenter().lng);
    if (pt.x >= 0 && pt.y >= 0 && pt.x <= w && pt.y <= h) shown.push(p);
  }
  shown.sort((a, b) => a.d - b.d);
  shown.slice(0, LIST_MAX).forEach((p, i) => {
    const r = row(i);
    r.button.hidden = false;
    r.button.dataset.hex = p.hex;
    r.button.style.setProperty('--band', COLORS[band(p)]);
    r.name.textContent = flightName(p.callsign, p.reg, p.hex);
    r.alt.textContent = `${altitude(p.alt)} ${trend(p)}`.trim();
    r.type.textContent = typeName(p.type, p.cat);
    r.far.textContent = `${distance(p.d)} ${COMPASS[octant(p.dir)]}`;
  });
  for (let i = Math.min(shown.length, LIST_MAX); i < rows.length; i++) rows[i].button.hidden = true;

  const n = shown.length;
  // With no answers, an empty map says nothing about the sky
  const blind = failures > 0 && !n;
  $('summary').textContent = blind ? 'No flight data right now' : !everLoaded ? 'Finding planes…'
    : n ? `${n} ${n === 1 ? 'plane' : 'planes'} on this map, closest to ${ref.you ? 'you' : 'the center'} first`
      : 'No planes on this map';
  $('empty').textContent = everLoaded && !n && !blind
    ? 'Zoom out to look farther. Volunteers run the receivers behind this data, so remote areas can look empty.' : '';
}

function renderStatus() {
  const s = $('status');
  const age = lastGood ? Date.now() - lastGood : 0;
  const bad = failures > 0;
  s.className = bad ? 'bad' : '';
  if (!bad) { if (s.textContent !== 'Finding this car…') s.textContent = ''; return; }
  s.textContent = lastGood && age < STALE ? `Can't reach flight data. Positions are estimates from ${Math.round(age / 1000)} s ago, until it's back.`
    : 'Can\'t reach flight data. Trying again.';
}

function renderPanel() {
  renderStatus();
  if (selected) renderDetail(); else renderList();
}

// Radio callsigns stay valid for years after a route changes, so a route is
// only believed when the plane is somewhere near the line between its airports.
function routeFits(from, to, p) {
  const total = haversine(from.lat, from.lon, to.lat, to.lon);
  const toPlane = haversine(from.lat, from.lon, p.lat, p.lon);
  const a = toPlane / R;
  const turn = (bearing(from.lat, from.lon, p.lat, p.lon) - bearing(from.lat, from.lon, to.lat, to.lon)) * DEG;
  const across = Math.abs(Math.asin(Math.sin(a) * Math.sin(turn))) * R;
  const along = Math.acos(Math.max(-1, Math.min(1, Math.cos(a) / Math.cos(across / R)))) * R;
  const ahead = Math.cos(turn) >= 0 && along <= total;
  const off = ahead ? across : Math.min(toPlane, haversine(to.lat, to.lon, p.lat, p.lon));
  return off < Math.max(150_000, total * 0.12);
}

const DETAILS = 'https://api.adsbdb.com/v0';
const looked = new Map();
async function adsbdb(path) {
  if (looked.has(path)) return looked.get(path);
  const answer = fetch(DETAILS + path, { signal: AbortSignal.timeout(WAIT) })
    .then(res => (res.ok ? res.json() : null))
    .then(j => j?.response ?? null)
    .catch(() => { looked.delete(path); throw new Error('no answer'); });   // not remembered, so it can be asked again
  looked.set(path, answer);
  return answer;
}

async function lookUp(p) {
  const hex = p.hex.replace(/^~/, '');
  let failed = false;
  const asked = path => adsbdb(path).catch(() => { failed = true; return null; });
  const [craft, flight] = await Promise.all([
    asked(`/aircraft/${encodeURIComponent(hex)}`),
    p.callsign ? asked(`/callsign/${encodeURIComponent(p.callsign)}`) : null,
  ]);
  const info = { failed, airline: flight?.flightroute?.airline?.name, owner: craft?.aircraft?.registered_owner };
  if (craft?.aircraft) info.type = [craft.aircraft.manufacturer, craft.aircraft.type].filter(Boolean).join(' ');
  const f = flight?.flightroute;
  if (f?.origin && f?.destination) {
    const from = { lat: f.origin.latitude, lon: f.origin.longitude, code: f.origin.iata_code || f.origin.icao_code, city: f.origin.municipality };
    const to = { lat: f.destination.latitude, lon: f.destination.longitude, code: f.destination.iata_code || f.destination.icao_code, city: f.destination.municipality };
    if ([from.lat, from.lon, to.lat, to.lon].every(Number.isFinite) && routeFits(from, to, p)) info.route = { from, to };
  }
  p.info = info;
  dirty = true;
  if (selected === p) renderDetail();
}

function skyDial(az, el_) {
  const radius = 36, r = (90 - Math.max(0, el_)) / 90 * radius;
  const x = 42 + r * Math.sin(az * DEG), y = 42 - r * Math.cos(az * DEG);
  return `<svg viewBox="0 0 84 84" role="img" aria-hidden="true">
    <circle cx="42" cy="42" r="${radius}" fill="#0c1c2b" stroke="#9ab2c4"/>
    <circle cx="42" cy="42" r="${radius * 2 / 3}" fill="none" stroke="#9ab2c4" stroke-opacity=".35"/>
    <circle cx="42" cy="42" r="${radius / 3}" fill="none" stroke="#9ab2c4" stroke-opacity=".35"/>
    <text x="42" y="12" text-anchor="middle" font-size="9" fill="#e9f2f8" font-family="B612, sans-serif">N</text>
    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${COLORS[band(selected)]}" stroke="#0c1c2b"/>
  </svg>`;
}

// Where to look, from the car's location. Altitude is above sea level and the
// ground's height isn't known, so the angle is rounded to the nearest 5°.
function lookLine(p, g) {
  const d = haversine(place.lat, place.lon, g.lat, g.lon);
  const dir = bearing(place.lat, place.lon, g.lat, g.lon);
  const meters = p.alt * 0.3048;
  const angle = Math.atan2(Math.max(0, meters), d) / DEG;
  const horizon = 3570 * Math.sqrt(Math.max(100, meters));   // metres; altitude is above sea level, so never less than a low hill
  const dirWord = COMPASS_WORDS[octant(dir)];
  let text;
  if (d > horizon) text = `Too far to see from here. It's over the horizon to the ${dirWord}.`;
  else if (angle >= 75) text = 'Look almost straight up.';
  else if (angle < 5) text = `Look ${dirWord}, low on the horizon.`;
  else text = `Look ${dirWord}, about ${Math.round(angle / 5) * 5}° above the horizon.`;
  return { text, dir, angle, d };
}

function renderDetail() {
  const p = selected, section = $('detail');
  if (!p) return;
  if (!planes.has(p.hex)) p.lost = true;
  const g = p.now, info = p.info;
  section.style.setProperty('--band', p.lost ? 'var(--muted)' : COLORS[band(p)]);
  const title = flightName(p.callsign, p.reg, p.hex);
  const parts = [el('h1', { textContent: title })];
  if (info?.airline && !title.startsWith(info.airline.split(' ')[0])) parts.push(el('p', { className: 'kind', textContent: info.airline }));
  parts.push(el('p', { className: 'kind', textContent: info?.type || typeName(p.type, p.cat) }));
  parts.push(el('p', { className: 'ids', textContent: [p.callsign, p.reg].filter(Boolean).join('  ') || p.hex.toUpperCase() }));
  if (p.emergency) parts.push(el('p', { className: 'alarm', textContent: 'This plane is reporting an emergency.' }));
  if (p.lost) parts.push(el('p', { className: 'gone', textContent: 'This plane stopped reporting. These are its last known details.' }));

  if (info?.route) {
    const stop = s => {
      const box = el('div');
      box.append(el('strong', { textContent: s.code || '?' }), el('small', { textContent: (s.city || '').split('/')[0] }));
      return box;
    };
    const arrow = el('div');
    arrow.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h16M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
    parts.push(el('div', { className: 'route' }, stop(info.route.from), arrow, stop(info.route.to)));
  } else {
    parts.push(el('p', { className: 'noroute', textContent: !info ? 'Looking up route…' : info.failed ? 'Can\'t look up the route right now.' : 'Route not known.' }));
  }

  if (place && !p.lost) {
    const look = lookLine(p, g);
    const box = el('div', { className: 'look' });
    box.innerHTML = skyDial(look.dir, look.angle);
    box.append(el('p', { textContent: look.text }));
    parts.push(box);
  }
  const dl = el('dl');
  const stat = (name, value) => dl.append(el('div', {}, el('dt', { textContent: name }), el('dd', { textContent: value })));
  stat('Altitude', `${altitude(p.alt)} ${trend(p)}`.trim());
  stat('Speed', speed(p.kt));
  stat('Heading', p.track == null ? 'Unknown' : `${COMPASS[octant(p.track)]} ${Math.round(p.track)}°`);
  if (place) stat('From you', distance(haversine(place.lat, place.lon, g.lat, g.lon)));
  parts.push(dl);
  if (info?.owner) parts.push(el('p', { className: 'fine', textContent: `Registered to ${info.owner}` }));
  if (info?.route) parts.push(el('p', { className: 'fine', textContent: 'Route comes from this flight number\'s records. It can be out of date.' }));
  section.replaceChildren(...parts);
}

function select(p) {
  selected = p || null;
  const showing = !!selected;
  for (const id of ['head', 'summary', 'list']) $(id).hidden = showing;
  for (const id of ['detailHead', 'detail']) $(id).hidden = !showing;
  if (selected) {
    locate(selected, Date.now());
    renderDetail();
    $('detail').scrollTop = 0;
    if (!selected.info) lookUp(selected);
  } else {
    renderList();
  }
  placeTags();
}

// A tap on the map: the plane or label under the finger, or nothing
function tapAt(x, y) {
  let best = null, bestD = 28;
  for (const p of inView) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestD) { best = p; bestD = d; }
  }
  if (!best) {
    best = inView.find(p => {
      if (p.tag < 0) return false;
      const b = tagBox(p, p.tag);
      return x >= b.x && x <= b.x + TAG_W && y >= b.y && y <= b.y + TAG_H;
    }) || null;
  }
  select(best);
}

// ---------- map and place ----------

function retryBase() {
  clearTimeout(baseRetry);
  baseRetry = 0;
  map?.setStyle(chartStyle, { diff: false });
}

function savedZoom() {
  try {
    const z = +localStorage.getItem(ZOOM_KEY);
    if (z >= 6 && z <= 12) return z;
  } catch {}
  return 8;
}

function startMap() {
  try {
    map = new MapView({
      container: 'map',
      style: chartStyle,
      center: [place.lon, place.lat],
      zoom: savedZoom(),
      minZoom: 6,
      maxZoom: 12,
      attributionControl: false,   // credited at the bottom of the side panel
      dragRotate: false,
      touchPitch: false,
      pitchWithRotate: false,
      maxPitch: 0,
      fadeDuration: 0,
      pixelRatio: Math.min(devicePixelRatio || 1, 1.5),
      canvasContextAttributes: { antialias: false, powerPreference: 'low-power' },
    });
  } catch (e) {
    map = null;
    $('summary').textContent = 'This browser can\'t draw the map.';
    return;
  }
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  map.on('move', () => { dirty = true; });
  map.on('click', e => tapAt(e.point.x, e.point.y));
  let settle = 0;
  map.on('moveend', () => {
    placeTags();
    renderList();
    try { localStorage.setItem(ZOOM_KEY, map.getZoom().toFixed(2)); } catch {}
    clearTimeout(settle);
    // A pan or zoom that leaves the circle asks right away; others wait their turn
    settle = setTimeout(() => { if (wanted() !== askedKey) ask(); }, 250);
  });
  map.on('resize', () => { resize(); placeTags(); });
  // The base map's index not arriving would leave it blank for good, so ask again
  map.on('error', e => {
    if (baseRetry || !/openfreemap\.org\/planet/.test(e.error?.url || e.error?.message || '')) return;
    baseRetry = setTimeout(retryBase, BASE_RETRY);
  });
  document.fonts.load('700 12px "B612 Mono"').then(() => { dirty = true; }).catch(() => {});
  ask();
}

function showPlace() {
  $('placeBtn').textContent = place ? place.name : 'Set location';
}

function setPlace(p) {
  if (!p) return;
  place = p;
  showPlace();
  if (map) {
    map.jumpTo({ center: [p.lon, p.lat] });
    ask();
  } else {
    startMap();
  }
  dirty = true;
}

// At start, a car with no fix yet stays on the saved place. A tap on Here asks.
function useCar(quiet) {
  if (!navigator.geolocation) { pickPlace().then(setPlace); return; }
  $('status').textContent = 'Finding this car…';
  navigator.geolocation.getCurrentPosition(
    pos => {
      $('status').textContent = '';
      const p = herePlace(pos.coords.latitude, pos.coords.longitude);
      savePlace(p);
      setPlace(p);
    },
    err => {
      $('status').textContent = '';
      if (quiet !== true || !place) pickPlace({ required: !place, note: locationError(err) }).then(setPlace);
    },
    { timeout: 12000, maximumAge: 60_000 },
  );
}

function showUnits() {
  $('unitsBtn').textContent = miles ? 'mi' : 'km';
  $('unitsBtn').setAttribute('aria-label', miles ? 'Distances in miles. Switch to kilometres' : 'Distances in kilometres. Switch to miles');
  const [a, b] = miles ? ['10,000 ft', '25,000 ft'] : ['3,000 m', '7,600 m'];
  $('legend').replaceChildren(...[['low', `Under ${a}`], ['mid', `${a.split(' ')[0]} to ${b}`], ['high', `Over ${b}`]].map(([k, text]) => {
    const key = el('i');
    key.style.setProperty('--band', COLORS[k]);
    return el('span', {}, key, text);
  }));
}

$('unitsBtn').onclick = () => {
  miles = !miles;
  setMiles(miles);
  showUnits();
  dirty = true;
  renderPanel();
};
$('placeBtn').onclick = () => pickPlace().then(setPlace);
$('hereBtn').onclick = () => useCar();
$('backBtn').onclick = () => select(null);
$('inBtn').onclick = () => map?.zoomIn({ duration: reduceMotion ? 0 : 250 });
$('outBtn').onclick = () => map?.zoomOut({ duration: reduceMotion ? 0 : 250 });
$('youBtn').onclick = () => { if (map && place) map.jumpTo({ center: [place.lon, place.lat] }); };

// ---------- start ----------

resize();
showUnits();
keepAwake(true);
requestAnimationFrame(frame);
new ResizeObserver(() => { resize(); placeTags(); }).observe(canvas.parentElement);

// This app is about where the car is now, so use the car's location whenever
// the browser has already been allowed to share it.
(async () => {
  let granted = false;
  try { granted = (await navigator.permissions.query({ name: 'geolocation' })).state === 'granted'; } catch {}
  const saved = getPlace();
  if (saved) setPlace(saved);
  if (granted) useCar(true);
  else if (!saved) setPlace(await pickPlace({ required: true }));
})();
