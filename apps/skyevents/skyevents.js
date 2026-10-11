// Sky Events: what's coming up in the night sky over the next year (meteor
// showers, full moons, eclipses, planets) and what's up tonight. Everything
// except the solar eclipse table is computed here, so it works offline.
import { getPlace, pickPlace } from '../_shared/place.js';
import { findEvents, tonight, position, phaseName } from './events.js';

const DAY = 86400_000;
const $ = id => document.getElementById(id);
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
};

let place = getPlace();
let events = [];
let filter = store.get('skyevents.filter') || 'all';

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

// ---------- formatting ----------

const fmt = (t, opts) => new Intl.DateTimeFormat([], opts).format(t);
const time = t => fmt(t, { hour: 'numeric', minute: '2-digit' });
const day = t => fmt(t, { month: 'short', day: 'numeric' });
const weekday = t => fmt(t, { weekday: 'short' });
const compass = deg => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];

function nightLabel([n0, n1]) {
  const a = new Date(n0), b = new Date(n1);
  return a.getMonth() === b.getMonth() ? `${day(n0)}–${b.getDate()}` : `${day(n0)}–${day(n1)}`;
}

function relative(t) {
  const days = Math.round((startOfDay(t) - startOfDay(Date.now())) / DAY);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

function startOfDay(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }

// ---------- icons ----------

const NS = 'http://www.w3.org/2000/svg';
function svg(size, inner) {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('viewBox', `0 0 ${size} ${size}`);
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = inner; // fixed markup built from numbers below, no outside text
  return s;
}

// Moon as seen from this hemisphere: the lit side is on the right while
// waxing in the north, on the left in the south
function moonIcon(elong, size, south = place && place.lat < 0) {
  const c = size / 2, r = size / 2 - 1;
  const crescent = Math.cos(elong * Math.PI / 180) > 0;
  const rx = Math.abs(Math.cos(elong * Math.PI / 180)) * r;
  const right = (elong < 180) !== south;
  const outer = right ? 1 : 0;
  const term = right ? (crescent ? 0 : 1) : (crescent ? 1 : 0);
  const lit = `M${c} ${c - r}A${r} ${r} 0 0 ${outer} ${c} ${c + r}A${rx.toFixed(2)} ${r} 0 0 ${term} ${c} ${c - r}Z`;
  return svg(size, `<circle cx="${c}" cy="${c}" r="${r}" fill="#2a3144"/><path d="${lit}" fill="#e9e3cc"/>`);
}

const KIND_ICON = {
  meteor: '<path d="M3 3l11 11" stroke="#7fc8ff" stroke-width="2" stroke-linecap="round" opacity=".5"/><circle cx="15" cy="15" r="3" fill="#7fc8ff"/>',
  planet: '<circle cx="10" cy="10" r="5" fill="#ffc46b"/><ellipse cx="10" cy="10" rx="9" ry="3" fill="none" stroke="#ffc46b" stroke-width="1.5" transform="rotate(-20 10 10)"/>',
  eclipse: '<circle cx="10" cy="10" r="8" fill="#ff8a6b" opacity=".35"/><circle cx="10" cy="10" r="6" fill="#121a2e" stroke="#ff8a6b" stroke-width="1.5"/>',
  season: '<circle cx="10" cy="10" r="4" fill="#8fe0a0"/><path d="M10 1v3M10 16v3M1 10h3M16 10h3M3.6 3.6l2.1 2.1M14.3 14.3l2.1 2.1M3.6 16.4l2.1-2.1M14.3 5.7l2.1-2.1" stroke="#8fe0a0" stroke-width="1.6" stroke-linecap="round"/>',
};

function kindIcon(e) {
  if (e.kind === 'moon') return moonIcon(e.phase, 20);
  return svg(20, KIND_ICON[e.kind]);
}

// ---------- tonight ----------

const LOOKS = {
  Mercury: 'Low in the twilight', Venus: 'Brilliant white, the brightest planet', Mars: 'Orange-red',
  Jupiter: 'Bright and steady, cream colored', Saturn: 'Pale gold',
};

function renderTonight() {
  const now = Date.now();
  const m = position('Moon', now);
  const nextFull = events.find(e => e.kind === 'moon' && e.phase === 180 && e.t > now);
  const nextNew = events.find(e => e.kind === 'moon' && e.phase === 0 && e.t > now);
  const upcoming = [nextFull, nextNew].filter(Boolean).sort((a, b) => a.t - b.t)
    .map(e => `${e.phase === 180 ? 'Full' : 'New'} Moon ${relative(e.t)} (${weekday(e.t)}, ${day(e.t)})`);

  // Before dawn, "tonight" is the night that's still going
  const ref = new Date(now).getHours() < 6 ? now : now + 12 * 3600_000;
  const planets = tonight(ref, place.lat, place.lon);
  const order = ['Venus', 'Jupiter', 'Mars', 'Saturn', 'Mercury'];
  planets.sort((a, b) => (!a.from - !b.from) || order.indexOf(a.name) - order.indexOf(b.name));

  $('tonight').replaceChildren(
    el('h2', { textContent: 'Tonight' }),
    el('div', { className: 'moonbox' }, moonIcon(m.elong, 64),
      el('div', {},
        el('b', { textContent: phaseName(m.elong) }),
        el('span', { textContent: `${Math.round(m.illuminated * 100)}% lit` }),
        ...upcoming.map(text => el('span', { textContent: text })))),
    el('h2', { textContent: 'Planets after dark' }),
    ...planets.map(p => {
      if (p.from == null) {
        const why = p.elong < 15 ? 'Too close to the Sun to see' : 'Not up while it\'s dark';
        return el('div', { className: 'pl off' }, el('b', { textContent: p.name }), el('span', { textContent: why }));
      }
      return el('div', { className: 'pl' },
        el('b', { textContent: p.name }),
        el('span', { textContent: `${time(p.from)} – ${time(p.to)}` }),
        el('span', { textContent: `Highest ${Math.round(p.best.alt)}° in the ${compass(p.best.az)} at ${time(p.best.t)}` }),
        el('span', { textContent: LOOKS[p.name] }));
    }));
}

// ---------- the list ----------

function shown(e) {
  if (filter === 'eclipse') return e.kind === 'eclipse';
  // Eclipses are listed five years ahead, everything else one year
  if (e.t > events.end) return false;
  if (filter === 'meteor') return e.kind === 'meteor';
  if (filter === 'planet') return e.kind === 'planet';
  if (filter === 'moon') return e.kind === 'moon' || (e.kind === 'eclipse' && e.eclipse) || /^Moon near/.test(e.title);
  // Highlights: skip quarter moons, the Moon's monthly passes by planets,
  // and weak meteor showers
  if (e.kind === 'moon') return e.phase === 0 || e.phase === 180;
  if (/^Moon near/.test(e.title)) return false;
  if (e.kind === 'meteor') return e.rating && e.rating !== 'Poor';
  return true;
}

function whenLine(e) {
  if (e.kind === 'meteor') {
    return e.best ? `Night of ${nightLabel(e.night)} · best around ${time(e.best)}` : `Night of ${nightLabel(e.night)}`;
  }
  if (e.eclipse) {
    const ec = e.eclipse;
    if (!ec.visible) return `${weekday(e.t)}, ${time(e.t)} · the Moon is below your horizon`;
    const parts = [`Greatest at ${time(ec.t)}`];
    if (ec.totalStart) parts.push(`total ${time(ec.totalStart)}–${time(ec.totalEnd)}`);
    else if (ec.partialStart) parts.push(`partial ${time(ec.partialStart)}–${time(ec.partialEnd)}`);
    return `${weekday(e.t)} · ${parts.join(' · ')}`;
  }
  if (e.kind === 'eclipse') return `${weekday(e.t)} · greatest eclipse at ${time(e.t)} your time`;
  return `${weekday(e.t)}, ${time(e.t)}`;
}

const NEW_MOON = 'The darkest nights of the month, best for stargazing and the Milky Way.';

function card(e) {
  const d = new Date(e.t);
  const badge = e.badge ? el('span', { className: `badge${e.good ? ' good' : ''}${/Poor|Not visible/.test(e.badge) ? ' poor' : ''}`, textContent: e.badge }) : '';
  const text = e.text || (e.kind === 'moon' && e.phase === 0 ? NEW_MOON : '');
  const big = e.kind === 'eclipse' || (e.kind === 'meteor' && e.good) || /opposition/.test(e.title);
  return el('div', { className: `ev${big ? ' big' : ''}` },
    el('div', { className: 'date' }, el('small', { textContent: weekday(e.t) }), el('b', { textContent: d.getDate() }), kindIcon(e)),
    el('div', {},
      el('h3', {}, e.title, badge),
      el('div', { className: 'when', textContent: whenLine(e) }),
      ...(text ? [el('p', { textContent: text })] : [])));
}

function renderList() {
  const list = events.filter(e => e.t >= startOfDay(Date.now()) && shown(e));
  const out = [];
  let month = '';
  for (const e of list) {
    const m = fmt(e.t, { month: 'long', year: 'numeric' });
    if (m !== month) { out.push(el('div', { className: 'month', textContent: m })); month = m; }
    out.push(card(e));
  }
  $('list').replaceChildren(...out);
  $('msg').textContent = list.length ? '' : 'Nothing in this list for the next year.';
  $('range').textContent = filter === 'eclipse' ? '· next 5 years' : '· next 12 months';
}

// ---------- start ----------

function compute() {
  $('placeBtn').textContent = place.name;
  $('msg').textContent = 'Working out the sky…';
  // Let the message paint first; this takes a moment on the car's CPU
  setTimeout(() => {
    const t0 = startOfDay(Date.now());
    events = findEvents(t0, t0 + 365 * DAY, place.lat, place.lon, t0 + 5 * 365 * DAY);
    events.end = t0 + 365 * DAY;
    renderTonight();
    renderList();
  }, 30);
}

document.querySelectorAll('[data-filter]').forEach(b => {
  b.setAttribute('aria-pressed', String(b.dataset.filter === filter));
  b.onclick = () => {
    filter = b.dataset.filter;
    store.set('skyevents.filter', filter);
    document.querySelectorAll('[data-filter]').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
    renderList();
    $('list').scrollTop = 0;
  };
});

$('placeBtn').onclick = async () => {
  const p = await pickPlace();
  if (p) { place = p; compute(); }
};

// Keep "tonight" current when the app stays open
setInterval(() => { if (events.length) renderTonight(); }, 15 * 60_000);

(async () => {
  if (!place) place = await pickPlace({ required: true });
  compute();
})();
