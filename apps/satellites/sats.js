// Satellite Tracker: when to see the ISS, Tiangong, Hubble, new Starlink
// trains and other bright satellites from where you are parked. Orbit data
// (CelesTrak, as OMM JSON) is cached for offline use; passes are predicted
// with SGP4 in a worker, and the sky dome shows what is overhead right now.
import { json2satrec, propagate, gstime, eciToEcf, ecfToLookAngles } from './satellite.js';
import { julianDay, localSiderealTime, toHorizon, sun } from '../_shared/astro.js';
import { followCar, getPlace, pickPlace } from '../_shared/place.js';

const CELESTRAK = group => `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=json`;
const GROUPS = ['stations', 'visual', 'last-30-days'];
const HOUR = 3600_000, DAY = 24 * HOUR;
const REFRESH = 8 * HOUR;     // orbit data age before we fetch again
const MIN_REFETCH = 2 * HOUR; // CelesTrak asks for no more than one download per 2 hours
const HOURS_AHEAD = 48;
const DEG = 180 / Math.PI;

const HIGHLIGHT = {
  25544: { name: 'ISS', kind: 'station', note: 'Space station. Brighter than any star.' },
  48274: { name: 'Tiangong', kind: 'station', note: 'Chinese space station. Bright.' },
  20580: { name: 'Hubble', kind: 'hubble', note: 'Hubble Space Telescope. Easy to see.' },
};

const $ = id => document.getElementById(id);
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } },
};
const settings = { red: false, filter: 'highlights', ...store.get('sats.settings') };
const saveSettings = () => store.set('sats.settings', settings);

let place = getPlace();
let sats = [];             // tracked objects: { id, name, kind, note, omm, rec }
let passes = new Map();    // id -> visible passes
let computedAt = 0, computing = false, worker = null;
let selected = null;       // { id, start }
let oldest = null;         // epoch of the stalest orbit data, ms
let fetchedAt = null;
let stars = [];
let dots = [];             // live dots drawn on the dome, for tap lookup

// ---------- formatting ----------

const time = ms => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const dir = az => COMPASS[Math.round(az / 22.5) % 16];

function until(ms) {
  const min = Math.max(1, Math.round((ms - Date.now()) / 60_000));
  if (min < 60) return `in ${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  if (h >= 24) return `in ${Math.floor(h / 24)} day${h >= 48 ? 's' : ''}, ${h % 24} h`;
  return `in ${h} h${m ? ` ${m} min` : ''}`;
}

// Passes happen around dusk or dawn, so label them "this evening",
// "tomorrow morning", "Monday evening" and so on
function nightLabel(ms) {
  const d = new Date(ms);
  const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / DAY);
  const part = d.getHours() < 12 ? 'morning' : 'evening';
  if (days === 0) return `This ${part}`;
  if (days === 1) return `Tomorrow ${part}`;
  return `${d.toLocaleDateString([], { weekday: 'long' })} ${part}`;
}

function prettyName(name) {
  const rb = name.match(/^(.*) R\/B$/);
  return rb ? `${rb[1]} rocket body` : name;
}

// ---------- orbit data ----------

async function loadGroup(group, force) {
  const cached = store.get(`sats.${group}`);
  const age = cached ? Date.now() - cached.fetched : Infinity;
  if (cached && age < (force ? MIN_REFETCH : REFRESH)) return cached;
  try {
    const res = await fetch(CELESTRAK(group));
    // CelesTrak answers with a plain-text note instead of JSON when asked too often
    const data = JSON.parse(await res.text());
    if (!res.ok || !Array.isArray(data)) throw new Error('bad response');
    const fresh = { fetched: Date.now(), data };
    store.set(`sats.${group}`, fresh);
    return fresh;
  } catch (e) {
    if (cached) return cached;
    throw e;
  }
}

function buildSats(groups) {
  const out = new Map();
  const add = (omm, info) => {
    if (out.has(omm.NORAD_CAT_ID)) return;
    try { out.set(omm.NORAD_CAT_ID, { id: String(omm.NORAD_CAT_ID), omm, rec: json2satrec(omm), ...info }); } catch {}
  };
  for (const omm of groups.stations) if (HIGHLIGHT[omm.NORAD_CAT_ID]) add(omm, HIGHLIGHT[omm.NORAD_CAT_ID]);
  for (const omm of groups.visual) {
    add(omm, HIGHLIGHT[omm.NORAD_CAT_ID] || { name: prettyName(omm.OBJECT_NAME), kind: 'bright', note: 'Bright satellite. Visible to the eye from a dark spot.' });
  }

  // New Starlink launches fly in a line ("train") for a few weeks. Track one
  // satellite from the middle of each launch to stand in for the whole train.
  const launches = new Map();
  for (const omm of groups['last-30-days']) {
    if (!/^STARLINK/.test(omm.OBJECT_NAME)) continue;
    const key = omm.OBJECT_ID.slice(0, 8);
    if (!launches.has(key)) launches.set(key, []);
    launches.get(key).push(omm);
  }
  for (const [key, list] of launches) {
    const u = o => (o.ARG_OF_PERICENTER + o.MEAN_ANOMALY) % 360;
    list.sort((a, b) => u(a) - u(b));
    const mid = list[Math.floor(list.length / 2)];
    const launched = Date.parse(mid.EPOCH + 'Z') - (mid.REV_AT_EPOCH / mid.MEAN_MOTION) * DAY;
    const date = new Date(launched).toLocaleDateString([], { month: 'short', day: 'numeric' });
    add(mid, {
      name: `Starlink (${date})`, kind: 'starlink', id: `train-${key}`,
      note: `Train of ${list.length} Starlink satellites launched about ${date}. Look for a line of dots over a few minutes.`,
    });
  }

  const order = { station: 0, hubble: 1, starlink: 2, bright: 3 };
  return [...out.values()].sort((a, b) => order[a.kind] - order[b.kind]);
}

async function loadData(force = false) {
  $('msg').textContent = '';
  try {
    const results = await Promise.all(GROUPS.map(g => loadGroup(g, force)));
    const groups = Object.fromEntries(GROUPS.map((g, i) => [g, results[i].data]));
    fetchedAt = Math.min(...results.map(r => r.fetched));
    sats = buildSats(groups);
    oldest = Math.min(...sats.map(s => Date.parse(s.omm.EPOCH + 'Z')));
    updateFooter();
    compute();
  } catch {
    $('hero').innerHTML = '<div class="k">No orbit data yet</div><div class="sub">The tracker needs a connection the first time. After that it works offline for days.</div>';
  }
}

function updateFooter() {
  const days = Math.floor((Date.now() - oldest) / DAY);
  const age = days >= 7 ? ` · Orbit data is ${days} days old, so times may be a few minutes off` : '';
  $('foot').textContent = `Orbit data from CelesTrak${age} · Times in this car's time zone`;
}

// ---------- pass prediction ----------

function compute() {
  if (!place || !sats.length) return;
  worker?.terminate();
  worker = new Worker('passes.worker.js', { type: 'module' });
  computing = true;
  passes = new Map();
  computedAt = Date.now();
  let done = 0;
  renderHero();
  worker.onmessage = ({ data }) => {
    if (data.type === 'passes') {
      passes.set(data.id, data.passes);
      done++;
      // Redraw the list after the highlights and then every 25 satellites
      if (done === sats.filter(s => s.kind !== 'bright').length || done % 25 === 0) renderList();
    } else if (data.type === 'done') {
      computing = false;
      worker.terminate();
      worker = null;
      renderList();
    }
  };
  worker.onerror = e => { computing = false; $('msg').textContent = `Pass prediction failed (${e.message}).`; };
  worker.postMessage({
    sats: sats.map(s => ({ id: s.id, omm: s.omm })),
    lat: place.lat, lon: place.lon, start: computedAt - 15 * 60_000, hours: HOURS_AHEAD,
  });
}

function listed() {
  const now = Date.now();
  const out = [];
  for (const s of sats) {
    if (settings.filter === 'highlights' && s.kind === 'bright') continue;
    for (const p of passes.get(s.id) || []) {
      if (p.end < now) continue;
      if (s.kind === 'bright' && p.maxAlt < 30) continue; // keep "All bright" readable
      out.push({ sat: s, p });
    }
  }
  return out.sort((a, b) => a.p.start - b.p.start);
}

// ---------- side panel ----------

function renderHero() {
  const hero = $('hero');
  if (!place) { hero.innerHTML = '<div class="k">Pick a location to see passes</div>'; return; }
  const now = Date.now();
  const items = listed();
  const live = items.find(({ p }) => p.start <= now && p.end >= now);
  if (live) {
    const at = position(live.sat, now);
    hero.innerHTML = `<div class="k">Overhead now</div><div class="big">${live.sat.name}</div>
      <div class="sub">${at ? `Look ${dir(at.az)}, ${Math.round(at.alt)}° up` : ''} · until ${time(live.p.end)}</div>`;
    return;
  }
  const next = items.find(({ sat }) => sat.id === '25544') || items.find(({ sat }) => sat.kind !== 'bright');
  if (next) {
    hero.innerHTML = `<div class="k">Next ${next.sat.name} pass</div><div class="big">${until(next.p.start)}</div>
      <div class="sub">${nightLabel(next.p.start)}, ${time(next.p.start)} · ${Math.round(next.p.maxAlt)}° high · ${dir(next.p.startAz)} to ${dir(next.p.endAz)}</div>`;
  } else if (computing) {
    hero.innerHTML = '<div class="k">Working out passes…</div><div class="sub">This takes a few seconds.</div>';
  } else {
    hero.innerHTML = `<div class="k">No visible passes of the highlights in the next ${HOURS_AHEAD} hours</div>
      <div class="sub">Satellites show only in twilight and dark hours while sunlit, so some weeks have none. Try "All bright".</div>`;
  }
}

function renderList() {
  renderHero();
  const items = listed();
  const now = Date.now();
  if (!selected || !items.some(({ sat, p }) => sat.id === selected.id && p.start === selected.start)) {
    const first = items[0];
    selected = first ? { id: first.sat.id, start: first.p.start } : null;
  }
  const list = $('list');
  const frag = document.createDocumentFragment();
  let night = '';
  for (const { sat, p } of items) {
    const label = nightLabel(p.start);
    if (label !== night) { night = label; frag.append(Object.assign(document.createElement('h3'), { textContent: label })); }
    const b = document.createElement('button');
    const active = p.start <= now && p.end >= now;
    b.type = 'button';
    b.className = `pass${active ? ' now' : ''}`;
    b.setAttribute('aria-pressed', String(selected?.id === sat.id && selected?.start === p.start));
    const mins = Math.max(1, Math.round((p.end - p.start) / 60_000));
    b.innerHTML = `<span class="when">${active ? 'Now' : time(p.start)}</span><span class="name"></span><span class="alt">${Math.round(p.maxAlt)}°</span>
      <span class="how">${dir(p.startAz)} → ${dir(p.endAz)} · ${mins} min${p.intoShadow ? ' · fades out mid-sky' : ''}</span>`;
    b.querySelector('.name').textContent = sat.name;
    b.title = sat.note;
    b.onclick = () => { selected = { id: sat.id, start: p.start }; renderList(); draw(); };
    frag.append(b);
  }
  const scroll = list.scrollTop;
  list.replaceChildren(frag);
  list.scrollTop = scroll;
  $('msg').textContent = computing && !items.length ? 'Working out passes…' : (!computing && !items.length && sats.length ? 'No visible passes in the next 2 nights.' : '');
  draw();
}

// ---------- sky dome ----------

const canvas = $('sky');
const ctx = canvas.getContext('2d');
let dpr = 1;

function layout() {
  dpr = devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
}
function view() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  return { cx: w / 2, cy: h / 2 + 8, R: Math.max(60, Math.min(w, h - 40) / 2 - 22) };
}
// Same planisphere as the Star Map: zenith in the center, north up, east left
function project(alt, az, v) {
  const r = v.R * Math.tan(((90 - alt) * Math.PI) / 360);
  const th = (az * Math.PI) / 180;
  return [v.cx - r * Math.sin(th), v.cy - r * Math.cos(th)];
}

function position(sat, t) {
  const date = new Date(t);
  const pv = propagate(sat.rec, date);
  if (!pv || !pv.position) return null;
  const la = ecfToLookAngles({ latitude: place.lat / DEG, longitude: place.lon / DEG, height: 0 }, eciToEcf(pv.position, gstime(date)));
  return { alt: la.elevation * DEG, az: ((la.azimuth * DEG) % 360 + 360) % 360, pos: pv.position };
}

function sunAltNow(t) {
  const jd = julianDay(new Date(t));
  const s = sun(jd);
  return { alt: toHorizon(s.ra, s.dec, place.lat, localSiderealTime(jd, place.lon)).alt, s };
}

function draw() {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#02040a';
  ctx.fillRect(0, 0, W, H);
  if (!place) return;
  const v = view();
  const now = Date.now();
  const { alt: sunAlt, s } = sunAltNow(now);
  const day = Math.min(1, Math.max(0, (sunAlt + 12) / 12));

  ctx.save();
  ctx.beginPath();
  ctx.arc(v.cx, v.cy, v.R, 0, Math.PI * 2);
  ctx.fillStyle = `rgb(${8 + 30 * day},${12 + 60 * day},${28 + 110 * day})`;
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(140,170,230,.12)';
  ctx.lineWidth = 1;
  for (const alt of [30, 60]) {
    ctx.beginPath();
    ctx.arc(v.cx, v.cy, v.R * Math.tan(((90 - alt) * Math.PI) / 360), 0, Math.PI * 2);
    ctx.stroke();
  }

  // A few bright stars for orientation
  if (stars.length && day < 1) {
    const jd = julianDay(new Date(now)), lst = localSiderealTime(jd, place.lon);
    ctx.fillStyle = `rgba(220,230,255,${0.7 * (1 - day)})`;
    for (const [ra, dec, mag] of stars) {
      const p = toHorizon(ra, dec, place.lat, lst);
      if (p.alt < 0) continue;
      const [x, y] = project(p.alt, p.az, v);
      const r = Math.max(0.6, (4 - mag) * 0.55);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawSelected(v);
  const counts = drawLive(v, now, sunAlt, s);
  ctx.restore();

  ctx.strokeStyle = 'rgba(160,185,235,.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(v.cx, v.cy, v.R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [label, az] of [['N', 0], ['E', 90], ['S', 180], ['W', 270]]) {
    const th = (az * Math.PI) / 180, r = v.R + 13;
    const x = v.cx - r * Math.sin(th), y = v.cy - r * Math.cos(th);
    ctx.fillStyle = label === 'N' ? '#ff8a7a' : 'rgba(200,215,240,.8)';
    ctx.fillText(label, x, y);
  }
  $('live').textContent = `${counts.up} tracked satellites above the horizon now${counts.visible ? `, ${counts.visible} visible` : ''}`;
}

function drawSelected(v) {
  if (!selected) return;
  const p = (passes.get(selected.id) || []).find(x => x.start === selected.start);
  if (!p) return;
  ctx.lineCap = 'round';
  for (let i = 1; i < p.path.length; i++) {
    const a = p.path[i - 1], b = p.path[i];
    const lit = a[3] && b[3];
    ctx.strokeStyle = lit ? 'rgba(255,224,138,.95)' : 'rgba(150,160,180,.5)';
    ctx.lineWidth = lit ? 3 : 1.5;
    ctx.setLineDash(lit ? [] : [4, 5]);
    const [x0, y0] = project(a[1], a[2], v), [x1, y1] = project(b[1], b[2], v);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.font = '13px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  const mark = (alt, az, text, fill) => {
    const [x, y] = project(alt, az, v);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = x > v.cx ? 'right' : 'left';
    ctx.fillStyle = '#fff3c4';
    ctx.fillText(text, x + (x > v.cx ? -9 : 9), y);
  };
  const near = (a, b) => Math.hypot(...[0, 1].map(i => project(...a, v)[i] - project(...b, v)[i])) < 40;
  const top = [p.maxAlt, p.topAz];
  mark(p.startAlt, p.startAz, `${time(p.start)} appears`, '#7ee2a8');
  if (!near(top, [p.startAlt, p.startAz]) && !near(top, [p.endAlt, p.endAz])) mark(...top, `${time(p.top)} · ${Math.round(p.maxAlt)}° high`, '#ffe08a');
  mark(p.endAlt, p.endAz, `${time(p.end)} ${p.intoShadow ? 'fades out' : 'sets'}`, '#ff8f7a');
}

function drawLive(v, now, sunAlt, s) {
  // Sun direction for the shadow test, as in the worker
  const ra = s.ra / DEG, dec = s.dec / DEG;
  const sv = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
  const counts = { up: 0, visible: 0 };
  dots = [];
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  for (const sat of sats) {
    const at = position(sat, now);
    if (!at || at.alt < 0) continue;
    counts.up++;
    const p = at.pos, d = p.x * sv[0] + p.y * sv[1] + p.z * sv[2];
    const lit = d > 0 || Math.hypot(p.x - d * sv[0], p.y - d * sv[1], p.z - d * sv[2]) > 6378.137;
    const visible = lit && sunAlt < -6;
    if (visible) counts.visible++;
    const [x, y] = project(at.alt, at.az, v);
    dots.push({ x, y, sat, at, visible });
    const big = sat.kind !== 'bright';
    ctx.fillStyle = visible ? '#ffe08a' : 'rgba(150,160,180,.55)';
    ctx.beginPath();
    ctx.arc(x, y, big ? 4 : 2.2, 0, Math.PI * 2);
    ctx.fill();
    if (big) {
      ctx.fillStyle = visible ? '#fff3c4' : 'rgba(190,200,220,.7)';
      ctx.fillText(sat.name, x + 7, y);
    }
  }
  return counts;
}

// ---------- controls ----------

let tipTimer;
canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  let best = null, bestD = 28;
  for (const d of dots) {
    const dist = Math.hypot(d.x - x, d.y - y);
    if (dist < bestD) { best = d; bestD = dist; }
  }
  const tip = $('tip');
  clearTimeout(tipTimer);
  if (!best) { tip.hidden = true; return; }
  tip.textContent = `${best.sat.name} · ${Math.round(best.at.alt)}° up ${dir(best.at.az)} · ${best.visible ? 'visible now' : 'in shadow or daylight'}. ${best.sat.note}`;
  tip.style.left = `${Math.min(Math.max(best.x, 150), canvas.clientWidth - 150)}px`;
  tip.style.top = `${best.y}px`;
  tip.hidden = false;
  tipTimer = setTimeout(() => { tip.hidden = true; }, 5000);
});

function setRed(on) {
  settings.red = on;
  $('red').hidden = !on;
  $('redBtn').setAttribute('aria-pressed', String(on));
  saveSettings();
}
$('redBtn').onclick = () => setRed(!settings.red);

for (const chip of document.querySelectorAll('.chip')) {
  chip.onclick = () => {
    settings.filter = chip.dataset.filter;
    saveSettings();
    for (const c of document.querySelectorAll('.chip')) c.setAttribute('aria-pressed', String(c === chip));
    selected = null;
    renderList();
  };
  chip.setAttribute('aria-pressed', String(chip.dataset.filter === settings.filter));
}

function setPlace(p) {
  if (!p) return;
  place = p;
  $('placeBtn').textContent = p.name;
  selected = null;
  compute();
  draw();
}
$('placeBtn').onclick = () => pickPlace().then(setPlace);
$('refreshBtn').onclick = () => loadData(true);

addEventListener('resize', () => { layout(); draw(); });

// Live dots every 2 seconds; the list and hero every 30 seconds
setInterval(() => { if (place && sats.length) draw(); }, 2000);
setInterval(() => {
  if (!place || !sats.length) return;
  if (!computing && Date.now() - computedAt > 6 * HOUR) compute();
  else renderList();
}, 30_000);

layout();
setRed(settings.red);
if (place) { $('placeBtn').textContent = place.name; followCar(setPlace); }
else pickPlace({ required: true }).then(setPlace);

fetch('../stars/sky.json')
  .then(r => r.json())
  .then(sky => { stars = sky.stars.filter(st => st[2] < 3.5); draw(); })
  .catch(() => {});
loadData();
