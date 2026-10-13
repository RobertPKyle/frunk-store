// What's Around Me: Wikipedia articles about places near the car (towns,
// landmarks, trails, historic sites), on a north-up map and a list. Tap one
// to read the article. Text is rendered as plain text, never as HTML.
import { getPlace, pickPlace, savePlace } from '../_shared/place.js';

const API = 'https://en.wikipedia.org/w/api.php';
const CACHE_KEY = 'nearby.cache';
const ARTICLES_KEY = 'nearby.articles';
const SETTINGS_KEY = 'nearby.settings';
const STALE = 7 * 86400_000; // places don't move; refetch weekly
const KEEP_ARTICLES = 15;    // read before, readable offline
const MAX_TEXT = 60_000;     // characters kept per cached article
const GEO_MAX = 10_000;      // geosearch radius limit, m
const DEG = Math.PI / 180;

const US = /-US$/.test(navigator.language);
const RADII = US
  ? [['1 mi', 1609], ['6 mi', 9656], ['12 mi', 19312]]
  : [['2 km', 2000], ['10 km', 10_000], ['20 km', 20_000]];

// Sections that are lists of links or sources, not reading material
const SKIP = /^(see also|references|external links|notes|further reading|sources|bibliography|gallery|footnotes|citations|works cited|notes and references|references and notes)$/i;
const SETTLEMENT = /\b(city|town|village|hamlet|community|census-designated|borough|municipality|suburb|neighbou?rhood|settlement)\b/i;

const $ = id => document.getElementById(id);
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
};

const settings = { radius: 1, sort: 'near', ...store.get(SETTINGS_KEY) };
let place = getPlace();
let pages = [];      // [{ id, title, desc, lat, lon, thumb, length, dist, bearing }]
let selected = null; // page id
let loading = false;
let reload = false;  // place or distance changed during a search: run it again

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

// ---------- geometry and formatting ----------

function distBearing(lat1, lon1, lat2, lon2) {
  const p1 = lat1 * DEG, p2 = lat2 * DEG, dl = (lon2 - lon1) * DEG;
  const a = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  const dist = 2 * 6371_000 * Math.asin(Math.sqrt(a));
  const y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return { dist, bearing: (Math.atan2(y, x) / DEG + 360) % 360 };
}

// Point at a distance and bearing from a start point
function offset(lat, lon, dist, bearing) {
  const d = dist / 6371_000, b = bearing * DEG, p1 = lat * DEG;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
  const l2 = lon * DEG + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [p2 / DEG, ((l2 / DEG + 540) % 360) - 180];
}

const compass = deg => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];

function distance(m) {
  if (US) {
    const mi = m / 1609.344;
    return mi < 0.1 ? `${Math.round(m * 3.28084 / 50) * 50 || 50} ft` : `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`;
  }
  return m < 1000 ? `${Math.round(m / 10) * 10 || 10} m` : `${m < 10_000 ? (m / 1000).toFixed(1) : Math.round(m / 1000)} km`;
}

const away = p => `${distance(p.dist)} ${compass(p.bearing)}`;

// ---------- Wikipedia ----------

async function api(params) {
  const q = new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params });
  const res = await fetch(`${API}?${q}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.info || data.error.code);
  return data;
}

function geosearch(lat, lon, radius) {
  return api({
    action: 'query', generator: 'geosearch', ggscoord: `${lat}|${lon}`, ggsradius: Math.round(radius), ggslimit: '50',
    prop: 'coordinates|pageimages|description|info', piprop: 'thumbnail', pithumbsize: '160', pilimit: '50', colimit: '50',
  });
}

// Geosearch stops at 10 km. Wider searches add six circles around the first
// one, which together cover 20 km in every direction.
async function search(lat, lon, radius) {
  const centers = [[lat, lon, Math.min(radius, GEO_MAX)]];
  if (radius > GEO_MAX) for (let b = 0; b < 360; b += 60) centers.push([...offset(lat, lon, 17_000, b), GEO_MAX]);
  const found = new Map();
  // One request at a time, as Wikimedia asks of API clients
  for (const [la, lo, r] of centers) {
    const data = await geosearch(la, lo, r);
    for (const p of data.query?.pages || []) {
      const c = p.coordinates?.[0];
      if (!c || found.has(p.pageid)) continue;
      found.set(p.pageid, {
        id: p.pageid, title: p.title, desc: p.description || '', lat: c.lat, lon: c.lon,
        thumb: p.thumbnail?.source || '', length: p.length || 0,
      });
    }
  }
  return [...found.values()];
}

async function fetchArticle(title) {
  const data = await api({
    action: 'query', titles: title, redirects: '1', prop: 'extracts|pageimages|description',
    explaintext: '1', exsectionformat: 'wiki', piprop: 'thumbnail', pithumbsize: '800',
  });
  const p = data.query?.pages?.[0];
  if (!p || p.missing) throw new Error('Article not found');
  return { title: p.title, text: (p.extract || '').slice(0, MAX_TEXT), image: p.thumbnail?.source || '', desc: p.description || '' };
}

async function article(title) {
  const cached = store.get(ARTICLES_KEY) || [];
  const hit = cached.find(a => a.title === title);
  if (hit) return hit;
  const a = await fetchArticle(title);
  a.title = title;
  // Keep the most recently read articles; drop old ones if storage is full
  const list = [a, ...cached.filter(c => c.title !== title)].slice(0, KEEP_ARTICLES);
  for (let n = list.length; n > 0; n--) {
    try { localStorage.setItem(ARTICLES_KEY, JSON.stringify(list.slice(0, n))); break; } catch {}
  }
  return a;
}

// Plain-text extract with "== Heading ==" lines into headings and paragraphs
function blocks(text) {
  const out = [];
  let skipping = 0;
  for (const line of text.split('\n')) {
    const h = line.match(/^(={2,6})\s*(.*?)\s*\1$/);
    if (h) {
      const level = h[1].length;
      if (skipping && level > skipping) continue;
      skipping = SKIP.test(h[2]) ? level : 0;
      if (!skipping) out.push({ level, text: h[2] });
    } else if (!skipping && line.trim()) {
      // Pronunciations are removed from plain-text extracts, leaving "( )" or "(; ...)"
      const text = line.replace(/\s*\(\s*[;,]?\s*\)/g, '').replace(/\(\s*[;,]\s*/g, '(').trim();
      if (text) out.push({ text });
    }
  }
  // Drop headings with nothing under them
  return out.filter((b, i) => {
    if (!b.level) return true;
    const next = out[i + 1];
    return next && !(next.level && next.level <= b.level);
  });
}

// ---------- list ----------

function sorted() {
  const list = [...pages];
  if (settings.sort === 'known') list.sort((a, b) => b.length - a.length);
  else list.sort((a, b) => a.dist - b.dist);
  return list;
}

function thumb(src) {
  const box = el('span', { className: 'thumb' });
  // The apps origin requires CORS for cross-origin images; Wikimedia allows it
  if (src) box.append(el('img', { src, alt: '', loading: 'lazy', crossOrigin: 'anonymous', referrerPolicy: 'no-referrer' }));
  return box;
}

function renderList() {
  const list = sorted();
  const items = list.map(p => {
    const b = el('button', { className: 'item', type: 'button' },
      thumb(p.thumb),
      el('span', {},
        el('span', { className: 'name', textContent: p.title }),
        el('span', { className: 'desc', textContent: p.desc }),
        el('span', { className: 'dist', textContent: away(p) })));
    b.dataset.id = p.id;
    b.setAttribute('aria-pressed', String(p.id === selected));
    b.onclick = () => open(p.id);
    return b;
  });
  $('list').replaceChildren(...items);
  const where = RADII[settings.radius][0];
  $('summary').textContent = pages.length ? `${pages.length} places within ${where}` : '';
}

function markSelected() {
  for (const b of $('list').children) b.setAttribute('aria-pressed', String(+b.dataset.id === selected));
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
  // Room for the hub's Apps button above and labels around the edge
  const cx = w / 2, cy = (h + 40) / 2, R = Math.max(40, Math.min(w / 2 - 30, (h - 40) / 2 - 26));
  const radius = RADII[settings.radius][1];

  ctx.lineWidth = 1;
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of [1 / 3, 2 / 3, 1]) {
    ctx.strokeStyle = 'rgba(150, 175, 220, .18)';
    ctx.beginPath(); ctx.arc(cx, cy, R * f, 0, 2 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#6c7689';
    ctx.fillText(distance(radius * f).replace('.0 ', ' '), cx + R * f * Math.SQRT1_2 + 4, cy + R * f * Math.SQRT1_2 + 8);
  }
  ctx.strokeStyle = 'rgba(150, 175, 220, .1)';
  ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.fillStyle = '#9aa6bc';
  [['N', 0, -1], ['E', 1, 0], ['S', 0, 1], ['W', -1, 0]].forEach(([t, x, y]) => ctx.fillText(t, cx + x * (R + 14), cy + y * (R + 14)));

  dots = pages.map(p => {
    const r = Math.min(1, p.dist / radius) * R;
    return { p, x: cx + r * Math.sin(p.bearing * DEG), y: cy - r * Math.cos(p.bearing * DEG) };
  });

  for (const d of dots) {
    if (d.p.id === selected) continue;
    ctx.fillStyle = d.p.thumb ? '#7fd1b9' : '#5b8f82';
    ctx.beginPath(); ctx.arc(d.x, d.y, 4, 0, 2 * Math.PI); ctx.fill();
  }

  // Name the best-known places that have room for a label
  ctx.font = '13px system-ui, sans-serif';
  const boxes = [];
  const label = (d, color, force) => {
    const text = d.p.title.length > 28 ? d.p.title.slice(0, 27) + '…' : d.p.title;
    const tw = ctx.measureText(text).width;
    const box = { x: d.x - tw / 2 - 3, y: d.y - 25, w: tw + 6, h: 17 };
    if (!force && boxes.some(b => box.x < b.x + b.w && b.x < box.x + box.w && box.y < b.y + b.h && b.y < box.y + box.h)) return;
    boxes.push(box);
    ctx.fillStyle = 'rgba(10, 15, 25, .75)';
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = color;
    ctx.fillText(text, d.x, d.y - 16);
  };
  const sel = dots.find(d => d.p.id === selected);
  if (sel) {
    ctx.fillStyle = '#ffd36e';
    ctx.beginPath(); ctx.arc(sel.x, sel.y, 7, 0, 2 * Math.PI); ctx.fill();
    label(sel, '#ffd36e', true);
  }
  [...dots].sort((a, b) => b.p.length - a.p.length).slice(0, 14).forEach(d => d !== sel && label(d, '#d4dbe7'));

  // You are here
  ctx.fillStyle = '#e2e7f0';
  ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 2 * Math.PI); ctx.fill();
  ctx.strokeStyle = 'rgba(226, 231, 240, .35)';
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

// ---------- article ----------

let openSeq = 0;

async function open(id) {
  const p = pages.find(q => q.id === id);
  if (!p) return;
  selected = id;
  markSelected();
  stopSpeaking();
  current = null;   // Read aloud waits for this article's text
  const mine = ++openSeq;
  const pane = $('article');
  pane.hidden = false;
  $('articleTools').hidden = false;
  pane.scrollTop = 0;
  pane.replaceChildren(
    el('h1', { textContent: p.title }),
    el('div', { className: 'sub' }, el('b', { textContent: away(p) }), p.desc ? ` · ${p.desc}` : ''),
    el('p', { textContent: 'Loading article…' }));
  try {
    const a = await article(p.title);
    if (mine !== openSeq) return;
    const body = blocks(a.text).map(b => b.level ? el(b.level === 2 ? 'h2' : 'h3', { textContent: b.text }) : el('p', { textContent: b.text }));
    const url = `en.wikipedia.org/wiki/${a.title.replace(/ /g, '_')}`;
    pane.replaceChildren(
      el('h1', { textContent: p.title }),
      el('div', { className: 'sub' }, el('b', { textContent: away(p) }), p.desc ? ` · ${p.desc}` : ''),
      ...(a.image ? [el('figure', {}, el('img', { src: a.image, alt: '', crossOrigin: 'anonymous', referrerPolicy: 'no-referrer' }))] : []),
      ...(body.length ? body : [el('p', { textContent: 'This article has no text yet.' })]),
      el('div', { className: 'credit', textContent: `Text from the Wikipedia article "${a.title}", available under CC BY-SA 4.0. Read the full article and its photo credits at ${url}` }));
    current = { title: p.title, blocks: blocks(a.text) };
  } catch {
    if (mine !== openSeq) return;
    pane.lastChild.textContent = 'Couldn\'t load this article. It needs a connection the first time you open it.';
  }
  draw();
}

function closeArticle() {
  stopSpeaking();
  $('article').hidden = true;
  $('articleTools').hidden = true;
  draw();
}
$('mapBtn').onclick = closeArticle;

// ---------- read aloud (only where the browser has voices) ----------

let current = null; // { title, blocks } of the open article
const synth = window.speechSynthesis;

function updateSpeakButton() {
  $('speakBtn').hidden = !(synth && synth.getVoices().length);
}
if (synth) {
  updateSpeakButton();
  synth.addEventListener?.('voiceschanged', updateSpeakButton);
}

function stopSpeaking() {
  if (synth) synth.cancel();
  $('speakBtn').textContent = 'Read aloud';
}

$('speakBtn').onclick = () => {
  if (!synth || !current) return;
  if (synth.speaking) { stopSpeaking(); return; }
  // One utterance per paragraph: some voices stop on long texts
  const parts = [current.title, ...current.blocks.map(b => b.text)];
  parts.forEach((text, i) => {
    const u = new SpeechSynthesisUtterance(text);
    if (i === parts.length - 1) u.onend = () => { $('speakBtn').textContent = 'Read aloud'; };
    synth.speak(u);
  });
  $('speakBtn').textContent = 'Stop reading';
};

// ---------- loading ----------

function setMsg(text) { $('msg').textContent = text; }

function nearestTown() {
  const towns = pages.filter(p => SETTLEMENT.test(p.desc)).sort((a, b) => a.dist - b.dist);
  return towns[0];
}

function showPlace() {
  let name = place ? place.name : 'Set location';
  // "Here (38.6°, -109.5°)" from the car's location reads better as a town name
  if (place && /^Here\b/.test(place.name)) {
    const town = nearestTown();
    if (town) name = `Near ${town.title.replace(/,.*$/, '')}`;
  }
  $('placeBtn').textContent = name;
  $('mapNote').textContent = place ? 'North is up · Tap a dot or a place in the list' : '';
}

function measure() {
  for (const p of pages) Object.assign(p, distBearing(place.lat, place.lon, p.lat, p.lon));
}

async function load(force = false) {
  if (!place) return;
  if (loading) { reload = true; return; }
  loading = true;
  try { await findAndShow(force); } finally { loading = false; }
  if (reload) { reload = false; load(); }
}

async function findAndShow(force) {
  const radius = RADII[settings.radius][1];
  const key = `${place.lat.toFixed(3)},${place.lon.toFixed(3)}`;
  const cached = store.get(CACHE_KEY);
  const usable = cached && cached.key === key && cached.radius >= radius;
  selected = null;
  closeArticle();
  // A wider search already covers a closer one. Refresh at most once a minute.
  if (usable && (!force || Date.now() - cached.fetched < 60_000) && Date.now() - cached.fetched < STALE) {
    pages = cached.pages;
  } else {
    setMsg('Looking for places nearby…');
    $('list').replaceChildren();
    $('summary').textContent = '';
    try {
      const found = await search(place.lat, place.lon, radius);
      store.set(CACHE_KEY, { key, radius, fetched: Date.now(), pages: found });
      if (reload) return;   // these results are for the old place or distance
      pages = found;
    } catch {
      if (reload) return;
      if (usable) pages = cached.pages;
      else { pages = []; setMsg('Couldn\'t reach Wikipedia. Check the connection and tap ↻.'); draw(); return; }
    }
  }
  measure();
  pages = pages.filter(p => p.dist <= radius);
  setMsg(pages.length ? '' : 'No Wikipedia articles this close. Try a wider distance.');
  showPlace();
  renderList();
  draw();
}

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

document.querySelectorAll('[data-sort]').forEach(b => {
  b.setAttribute('aria-pressed', String(b.dataset.sort === settings.sort));
  b.onclick = () => {
    settings.sort = b.dataset.sort;
    store.set(SETTINGS_KEY, settings);
    document.querySelectorAll('[data-sort]').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
    renderList();
    $('list').scrollTop = 0;
  };
});

$('placeBtn').onclick = () => pickPlace().then(setPlace);
$('hereBtn').onclick = locate;
$('refreshBtn').onclick = () => load(true);

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
