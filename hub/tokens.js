// The footer's token cards: live price, change, market numbers and a price
// line for each token, from the apps origin's /api/tokens. It starts only
// when the footer comes near the screen, and refreshes while it stays there.
// Running a finger or the pointer along a line shows the price at that time.

const REFRESH = 30000;     // ms between updates; the API's CDN keeps answers this long
const W = 300, H = 100;    // the line's own units; the SVG stretches them to the card

const box = document.querySelector('.token');
const cards = new Map([...box.querySelectorAll('.coin')].map(card => [card.dataset.mint, card]));
const rangeButtons = [...box.querySelectorAll('[data-range]')];

let origin, getLang, store;
let range;
let data = null;           // the last answer, for redrawing in another language
let timer = 0, inView = false, busy = false;

// ---------- numbers ----------

const decimalMark = lang => new Intl.NumberFormat(lang).formatToParts(1.5).find(p => p.type === 'decimal')?.value ?? '.';

// A price with four significant digits. Tiny ones count their zeros the way
// DEX sites do, 0.0₄1808 for 0.00001808, so they stay short.
function priceHtml(p, lang) {
  if (!(p > 0)) return '–';
  if (p >= 1) return '$' + p.toLocaleString(lang, { maximumFractionDigits: p >= 1000 ? 0 : 2, minimumFractionDigits: p >= 1000 ? 0 : 2 });
  if (p >= 0.001) return '$' + p.toLocaleString(lang, { maximumSignificantDigits: 4 });
  const zeros = -Math.floor(Math.log10(p)) - 1;
  const digits = String(Math.round(p * 10 ** (zeros + 4))).slice(0, 4).replace(/0+$/, '') || '0';
  return `$0${decimalMark(lang)}0<sub>${zeros}</sub>${digits}`;
}

const compact = (v, lang) => v == null ? '–'
  : new Intl.NumberFormat(lang, { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(v);

const percent = (v, lang) => new Intl.NumberFormat(lang, {
  style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 1,
}).format(v / 100);

function timeLabel(t, lang) {
  const d = new Date(t * 1000);
  const time = d.toLocaleTimeString(lang, { hour: 'numeric', minute: '2-digit' });
  return range === '1w' ? `${d.toLocaleDateString(lang, { weekday: 'short' })} ${time}` : time;
}

// ---------- drawing ----------

// Points [time, close] to SVG coordinates, with a little room above and below
function layout(points) {
  let lo = Infinity, hi = -Infinity;
  for (const [, c] of points) { lo = Math.min(lo, c); hi = Math.max(hi, c); }
  if (hi === lo) { hi *= 1.02; lo *= 0.98; }
  const pad = (hi - lo) * 0.12;
  hi += pad; lo -= pad;
  const n = points.length;
  return points.map(([, c], i) => [n > 1 ? i / (n - 1) * W : W / 2, (hi - c) / (hi - lo) * H]);
}

function drawCard(card, token, lang) {
  card.classList.remove('coin-waiting');
  card._token = token;
  const ok = token && token.price > 0;
  card.querySelector('.coin-value').innerHTML = ok ? priceHtml(token.price, lang) : '–';
  card.querySelector('.coin-when').textContent = '';
  const change = card.querySelector('.coin-change');
  change.hidden = !(ok && token.change != null);
  if (!change.hidden) change.textContent = percent(token.change, lang);
  for (const dd of card.querySelectorAll('[data-k]')) dd.textContent = ok ? compact(token[dd.dataset.k], lang) : '–';

  const points = token?.points ?? [];
  const xy = points.length ? layout(points) : [];
  card._xy = xy;
  // the line's colour follows the range shown: up or down since its start
  const rising = points.length > 1 ? points.at(-1)[1] >= points[0][1] : (token?.change ?? 0) >= 0;
  card.classList.toggle('down', !rising);
  change.classList.toggle('down', (token?.change ?? 0) < 0);
  card.querySelector('.coin-empty').hidden = points.length > 1;
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  card.querySelector('.coin-line').setAttribute('d', points.length > 1 ? line : '');
  card.querySelector('.coin-area').setAttribute('d', points.length > 1 ? `${line}L${W} ${H}L0 ${H}Z` : '');
  const base = card.querySelector('.coin-base');
  base.style.display = points.length > 1 ? '' : 'none';
  if (points.length > 1) base.setAttribute('y1', xy[0][1].toFixed(1)), base.setAttribute('y2', xy[0][1].toFixed(1));
  hideScrub(card);
}

function render() {
  const lang = getLang();
  for (const [mint, card] of cards) drawCard(card, data?.tokens?.find(tk => tk.mint === mint), lang);
}

// ---------- scrubbing ----------

function showScrub(card, clientX) {
  const token = card._token, xy = card._xy;
  if (!token?.points || xy.length < 2) return;
  const chart = card.querySelector('.coin-chart');
  const rect = chart.getBoundingClientRect();
  const f = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  const i = Math.round(f * (xy.length - 1));
  const [x, y] = xy[i];
  const dot = card.querySelector('.coin-dot'), guide = card.querySelector('.coin-guide');
  dot.style.left = guide.style.left = `${x / W * 100}%`;
  dot.style.top = `${y / H * 100}%`;
  dot.hidden = guide.hidden = false;
  const lang = getLang(), [t, c] = token.points[i];
  card.querySelector('.coin-value').innerHTML = priceHtml(c, lang);
  card.querySelector('.coin-when').textContent = timeLabel(t, lang);
}

function hideScrub(card) {
  card.querySelector('.coin-dot').hidden = card.querySelector('.coin-guide').hidden = true;
  const token = card._token;
  if (token?.price > 0) card.querySelector('.coin-value').innerHTML = priceHtml(token.price, getLang());
  card.querySelector('.coin-when').textContent = '';
}

for (const card of cards.values()) {
  const chart = card.querySelector('.coin-chart');
  chart.addEventListener('pointerdown', e => showScrub(card, e.clientX));
  chart.addEventListener('pointermove', e => showScrub(card, e.clientX));
  chart.addEventListener('pointerleave', () => hideScrub(card));
  chart.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') hideScrub(card); });
  chart.addEventListener('pointercancel', () => hideScrub(card));
}

// ---------- loading ----------

async function update() {
  clearTimeout(timer);
  if (busy) return;
  if (box.hidden || !inView || document.hidden) return;
  busy = true;
  const asked = range;
  try {
    const res = await fetch(`${origin}/api/tokens?range=${asked}`, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const answer = await res.json();
    if (asked === range) { data = answer; render(); }
  } catch {
    // keep what's shown; a first failure shows dashes rather than a skeleton forever
    if (!data) render();
  } finally {
    busy = false;
    timer = setTimeout(update, asked === range ? REFRESH : 0);
  }
}

function setRange(next) {
  range = next;
  store.set('tokenRange', next);
  for (const b of rangeButtons) b.setAttribute('aria-pressed', String(b.dataset.range === next));
  for (const card of cards.values()) card.classList.add('coin-waiting');
  update();
}

for (const b of rangeButtons) b.addEventListener('click', () => { if (b.dataset.range !== range) setRange(b.dataset.range); });

// origin: the apps origin; lang: a function giving the hub's language now
export function startTokens(appsOrigin, lang, hubStore) {
  if (origin) return;
  origin = appsOrigin;
  getLang = lang;
  store = hubStore;
  range = rangeButtons.some(b => b.dataset.range === store.get('tokenRange')) ? store.get('tokenRange') : '1d';
  for (const b of rangeButtons) b.setAttribute('aria-pressed', String(b.dataset.range === range));
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) update();
  }, { rootMargin: '400px 0px' }).observe(box);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
}

// The hub switched language (or shows the footer again after a Chinese one)
export function tokensLangChanged() {
  if (!origin) return;
  if (data) render();
  update();
}
