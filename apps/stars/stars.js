// Star Map: the sky overhead for a place and time, drawn as a planisphere
// (zenith in the center, horizon on the rim, north up, east left). Stars and
// constellations come from sky.json; the Sun, Moon and planets are computed.
import { julianDay, localSiderealTime, toHorizon, sun, moon, planet, PLANETS } from '../_shared/astro.js';
import { getPlace, pickPlace } from '../_shared/place.js';

const STORE_KEY = 'stars.settings';
const BAR = 72; // height reserved for the bottom bar, CSS px
const $ = id => document.getElementById(id);
const canvas = $('sky');
const ctx = canvas.getContext('2d');

const state = (() => {
  const fallback = { rot: 0, red: false };
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch {}
  const place = getPlace();
  return { rot: saved.rot ?? fallback.rot, red: saved.red ?? fallback.red, lat: place?.lat ?? null, lon: place?.lon ?? null, place: place?.name ?? '' };
})();
const save = () => {
  const { rot, red } = state;
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ rot, red })); } catch {}
};

let sky = null;            // sky.json
let zoom = 1, panX = 0, panY = 0, offsetMin = 0;
let hits = [];             // drawn objects for tap lookup
let dpr = 1;

// ---------- view geometry ----------

function layout() {
  dpr = devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
}
function view() {
  const w = canvas.clientWidth, h = canvas.clientHeight - BAR;
  return { cx: w / 2 + panX, cy: h / 2 + panY, R: Math.max(60, Math.min(w, h) / 2 - 26) * zoom };
}
// Stereographic projection from the zenith; the horizon lands on radius R
function project(alt, az, v) {
  const r = v.R * Math.tan(((90 - alt) * Math.PI) / 360);
  const th = ((az + state.rot) * Math.PI) / 180;
  return [v.cx - r * Math.sin(th), v.cy - r * Math.cos(th)];
}

// ---------- drawing ----------

function bvColor(bv) {
  if (bv < 0) return '#b9c9ff';
  if (bv < 0.4) return '#e6ecff';
  if (bv < 0.8) return '#fff6e6';
  if (bv < 1.3) return '#ffdcb0';
  return '#ffc08a';
}
const lerp = (a, b, t) => a + (b - a) * t;

function draw() {
  if (!sky || state.lat == null) return;
  const date = new Date(Date.now() + offsetMin * 60_000);
  const jd = julianDay(date);
  const lst = localSiderealTime(jd, state.lon);
  const hz = (ra, dec) => toHorizon(ra, dec, state.lat, lst);
  const v = view();
  const W = canvas.clientWidth, H = canvas.clientHeight;
  hits = [];

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#02040a';
  ctx.fillRect(0, 0, W, H);

  // Twilight: brighten the sky and hide faint stars while the Sun is up
  const s = sun(jd), sH = hz(s.ra, s.dec);
  const day = Math.min(1, Math.max(0, (sH.alt + 18) / 18));
  const magLimit = 5.5 - day * 5.2;
  const g = ctx.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, v.R);
  g.addColorStop(0, `rgb(${lerp(6, 40, day)},${lerp(10, 80, day)},${lerp(24, 150, day)})`);
  g.addColorStop(1, `rgb(${lerp(14, 90, day)},${lerp(22, 130, day)},${lerp(44, 190, day)})`);
  ctx.save();
  ctx.beginPath();
  ctx.arc(v.cx, v.cy, v.R, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();

  // Altitude rings at 30° and 60°
  ctx.strokeStyle = 'rgba(140,170,230,.10)';
  ctx.lineWidth = 1;
  for (const alt of [30, 60]) {
    ctx.beginPath();
    ctx.arc(v.cx, v.cy, v.R * Math.tan(((90 - alt) * Math.PI) / 360), 0, Math.PI * 2);
    ctx.stroke();
  }

  // Constellation lines
  ctx.strokeStyle = `rgba(120,150,220,${0.4 * (1 - day)})`;
  ctx.beginPath();
  for (const line of sky.lines) {
    let prev = null;
    for (const [ra, dec] of line) {
      const p = hz(ra, dec);
      const xy = project(p.alt, p.az, v);
      if (prev && (prev.alt > -5 || p.alt > -5)) { ctx.moveTo(prev.xy[0], prev.xy[1]); ctx.lineTo(xy[0], xy[1]); }
      prev = { alt: p.alt, xy };
    }
  }
  ctx.stroke();

  // Stars, faintest first so bright ones sit on top
  const sizeK = Math.pow(zoom, 0.35);
  for (let i = sky.stars.length - 1; i >= 0; i--) {
    const [ra, dec, mag, bv] = sky.stars[i];
    if (mag > magLimit) continue;
    const p = hz(ra, dec);
    if (p.alt < 0) continue;
    const [x, y] = project(p.alt, p.az, v);
    if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue;
    const r = Math.max(0.55, (6 - mag) * 0.62) * sizeK;
    ctx.fillStyle = bvColor(bv);
    if (r < 1.2) {
      ctx.globalAlpha = Math.min(1, 0.35 + (5.6 - mag) * 0.25);
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    } else {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (mag < 4.5) hits.push({ x, y, label: `Star · magnitude ${mag.toFixed(1)}`, alt: p.alt, az: p.az, weight: 0 });
  }

  // Named stars
  const nameLimit = zoom >= 2 ? 2.6 : 1.6;
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const [ra, dec, name, mag] of sky.names) {
    const p = hz(ra, dec);
    if (p.alt < 0) continue;
    const [x, y] = project(p.alt, p.az, v);
    hits.push({ x, y, label: `${name} · magnitude ${mag.toFixed(1)}`, alt: p.alt, az: p.az, weight: 1 });
    if (mag > nameLimit) continue;
    ctx.fillStyle = `rgba(210,222,245,${0.75 * (1 - day * 0.8)})`;
    ctx.fillText(name, x + 7, y - 1);
  }

  // Constellation names
  const rankLimit = zoom >= 2.5 ? 3 : zoom >= 1.6 ? 2 : 1;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(140,170,230,${0.55 * (1 - day)})`;
  for (const [ra, dec, name, rank] of sky.cons) {
    if (rank > rankLimit) continue;
    const p = hz(ra, dec);
    if (p.alt < 5) continue;
    const [x, y] = project(p.alt, p.az, v);
    ctx.fillText(name.toUpperCase(), x, y);
  }

  // Planets
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  for (const name of PLANETS) {
    const pl = planet(name, jd), p = hz(pl.ra, pl.dec);
    if (p.alt < 0) continue;
    const [x, y] = project(p.alt, p.az, v);
    const r = (name === 'Venus' || name === 'Jupiter' ? 4 : 3) * sizeK;
    ctx.fillStyle = '#ffe2b0';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd08a';
    ctx.fillText(name, x + r + 5, y);
    hits.push({ x, y, label: `${name} (planet)`, alt: p.alt, az: p.az, weight: 2 });
  }

  // Moon, with its lit side turned toward the Sun
  const m = moon(jd), mH = hz(m.ra, m.dec);
  if (mH.alt > -1) {
    const [x, y] = project(mH.alt, mH.az, v);
    const [sx, sy] = project(Math.max(sH.alt, -89), sH.az, v);
    drawMoon(x, y, 10 * sizeK, m.illuminated, Math.atan2(sy - y, sx - x));
    hits.push({ x, y, label: `Moon · ${Math.round(m.illuminated * 100)}% lit, ${m.waxing ? 'waxing' : 'waning'}`, alt: mH.alt, az: mH.az, weight: 3 });
  }

  // Sun, when it is up
  if (sH.alt > -1) {
    const [x, y] = project(sH.alt, sH.az, v);
    ctx.fillStyle = '#fff1b8';
    ctx.beginPath();
    ctx.arc(x, y, 12 * sizeK, 0, Math.PI * 2);
    ctx.fill();
    hits.push({ x, y, label: 'Sun', alt: sH.alt, az: sH.az, weight: 3 });
  }
  ctx.restore();

  // Horizon ring and compass points
  ctx.strokeStyle = 'rgba(160,185,235,.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(v.cx, v.cy, v.R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [label, az] of [['N', 0], ['E', 90], ['S', 180], ['W', 270]]) {
    const th = ((az + state.rot) * Math.PI) / 180, r = v.R + 14;
    ctx.fillStyle = label === 'N' ? '#ff8a7a' : 'rgba(200,215,240,.8)';
    ctx.fillText(label, v.cx - r * Math.sin(th), v.cy - r * Math.cos(th));
  }

  if (sH.alt > -6) {
    ctx.fillStyle = 'rgba(255,230,180,.85)';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(sH.alt > 0 ? 'The Sun is up. Slide time forward to see tonight.' : 'Twilight: stars are just coming out.', 16, 70);
  }
  updateWhen(date);
}

function drawMoon(x, y, r, k, sunAngle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sunAngle); // +x now points at the Sun
  ctx.fillStyle = '#2a2d36';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  // Lit part: the sunward half disc plus or minus an ellipse for the terminator
  ctx.fillStyle = '#f2ecd8';
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
  const ex = r * Math.abs(1 - 2 * k);
  ctx.ellipse(0, 0, ex, r, 0, Math.PI / 2, -Math.PI / 2, k < 0.5);
  ctx.fill();
  ctx.restore();
}

function updateWhen(date) {
  const t = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (!offsetMin) { $('when').textContent = `Now · ${t}`; return; }
  const h = Math.floor(offsetMin / 60), m = offsetMin % 60;
  $('when').textContent = `+${[h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ')} · ${t}`;
}

let pending = false;
function redraw() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; draw(); });
}

// ---------- interaction ----------

const pointers = new Map();
let tipTimer;

function angleAt(x, y) {
  const v = view();
  return (Math.atan2(-(x - v.cx), -(y - v.cy)) * 180) / Math.PI;
}

canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY, x0: e.offsetX, y0: e.offsetY, t0: performance.now() });
});

canvas.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  if (pointers.size === 1) {
    let d = angleAt(e.offsetX, e.offsetY) - angleAt(p.x, p.y);
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    state.rot = (state.rot + d + 360) % 360;
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const before = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    p.x = e.offsetX; p.y = e.offsetY;
    const after = Math.hypot(a.x - b.x, a.y - b.y), nx = (a.x + b.x) / 2, ny = (a.y + b.y) / 2;
    panX += nx - mx; panY += ny - my;
    if (before > 0) zoomAt(nx, ny, after / before);
    redraw();
    return;
  }
  p.x = e.offsetX; p.y = e.offsetY;
  redraw();
});

function endPointer(e) {
  const p = pointers.get(e.pointerId);
  pointers.delete(e.pointerId);
  if (!p) return;
  save();
  const tap = Math.hypot(e.offsetX - p.x0, e.offsetY - p.y0) < 10 && performance.now() - p.t0 < 350;
  if (tap && !pointers.size) showTip(e.offsetX, e.offsetY);
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', e => pointers.delete(e.pointerId));

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  zoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.0015));
  redraw();
}, { passive: false });

function zoomAt(x, y, factor) {
  const next = Math.min(6, Math.max(1, zoom * factor));
  const w = canvas.clientWidth, h = canvas.clientHeight - BAR;
  // keep the sky point under (x, y) in place
  const vx = (x - w / 2 - panX) / zoom, vy = (y - h / 2 - panY) / zoom;
  zoom = next;
  panX = zoom === 1 ? 0 : x - w / 2 - vx * zoom;
  panY = zoom === 1 ? 0 : y - h / 2 - vy * zoom;
}

function showTip(x, y) {
  let best = null, bestD = 30;
  for (const h of hits) {
    const d = Math.hypot(h.x - x, h.y - y) - h.weight * 6; // prefer planets and named stars
    if (d < bestD) { best = h; bestD = d; }
  }
  const tip = $('tip');
  clearTimeout(tipTimer);
  if (!best) { tip.hidden = true; return; }
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  tip.textContent = `${best.label} · ${Math.round(best.alt)}° up, ${dirs[Math.round(best.az / 45) % 8]}`;
  tip.style.left = `${best.x}px`;
  tip.style.top = `${best.y}px`;
  tip.hidden = false;
  tipTimer = setTimeout(() => { tip.hidden = true; }, 4000);
}

$('zoomIn').onclick = () => { const v = view(); zoomAt(v.cx, v.cy, 1.5); redraw(); };
$('zoomOut').onclick = () => { const v = view(); zoomAt(v.cx, v.cy, 1 / 1.5); redraw(); };
$('hours').oninput = e => { offsetMin = Number(e.target.value); redraw(); };
$('nowBtn').onclick = () => { offsetMin = 0; $('hours').value = 0; redraw(); };

function setRed(on) {
  state.red = on;
  $('red').hidden = !on;
  $('redBtn').setAttribute('aria-pressed', String(on));
  save();
}
$('redBtn').onclick = () => setRed(!state.red);

// ---------- location ----------

function setPlace(place) {
  if (!place) return;
  Object.assign(state, { lat: place.lat, lon: place.lon, place: place.name });
  $('placeBtn').textContent = place.name;
  redraw();
}
$('placeBtn').onclick = () => pickPlace().then(setPlace);

// ---------- start ----------

addEventListener('resize', () => { layout(); redraw(); });
setInterval(() => { if (!offsetMin && !pointers.size) redraw(); }, 30_000);

layout();
setRed(state.red);
if (state.lat == null) pickPlace({ required: true }).then(setPlace);
else $('placeBtn').textContent = state.place;

fetch('sky.json')
  .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
  .then(data => {
    // attach each named star's magnitude once, instead of looking it up per frame
    const mags = new Map(data.stars.map(([ra, dec, mag]) => [`${ra},${dec}`, mag]));
    data.names = data.names.map(([ra, dec, name]) => [ra, dec, name, mags.get(`${ra},${dec}`) ?? 9]);
    sky = data;
    redraw();
  })
  .catch(e => { $('when').textContent = `Star data failed to load (${e.message})`; });
