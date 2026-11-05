// Hub: lists apps from catalog.json and runs each one full screen in a
// sandboxed iframe on a separate origin, so an app cannot touch the hub's
// storage or navigate the top page.

import { LANGS, EN_UI } from './i18n.js';

const grid = document.getElementById('grid');
const recentRow = document.getElementById('recent');
const filterRow = document.getElementById('filters');
const toolbar = document.getElementById('toolbar');
const searchForm = document.getElementById('search');
const queryInput = document.getElementById('query');
const clearQuery = document.getElementById('clearQuery');
const runner = document.getElementById('runner');
let frame = document.getElementById('frame');
const loading = document.getElementById('loading');
const slowLoad = document.getElementById('slowLoad');
let slowTimer;

let catalog;
let appsOrigin;
let pushedHistory = false; // true when the open app added a history entry
// An app that keeps progress (Retro Console) posts { frunk: 'save-on-close' }
// when it loads. Closing it then posts { frunk: 'close' } and waits up to a
// second for { frunk: 'closed' } before unloading it, so it can save first.
let saveOnClose = false;
let opened = 0;            // counts openApp calls, so a late unload can't hit a newer app
let leaving = false;       // the Apps button went back; the page hasn't heard yet
let keysToApp = false;     // opened from the keyboard: the app gets the keys once it loads

const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem('hub.' + key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('hub.' + key, JSON.stringify(value)); } catch {} },
};

// Categories come from the apps' tags; an app can be in more than one.
// The second item is the label's string key.
const FILTERS = [['all', 'filterAll'], ['Game', 'filterGames'], ['Camp Mode', 'filterCamp'], ['Road Trip', 'filterRoad'], ['Tool', 'filterTools']];
let filter = store.get('filter', 'all');
const RECENT = 3;          // apps in the Recent row: as many as fit across the car's screen
const NEWS_DAYS = 14;      // how long an app's "added" or "updated" date in the catalog earns it a badge
const SLOW_LOAD = 8000;    // ms before the spinner says the app is still loading

// Local dev (tools/dev.mjs) serves apps on the next port. 127.0.0.1 is a
// different site from localhost, which mirrors production isolation.
function resolveAppsOrigin(configured) {
  if (location.hostname === 'localhost') return `http://127.0.0.1:${Number(location.port) + 1}`;
  return configured;
}

// Language. English is read from the page itself, so index.html stays the
// one place it's written; other languages come from /lang/<code>.json.
const root = document.documentElement;
const en = { ui: { ...EN_UI }, tags: {}, apps: {} };
for (const node of document.querySelectorAll('[data-i18n]')) en.ui[node.dataset.i18n] = node.innerHTML;
for (const node of document.querySelectorAll('[data-i18n-label]')) en.ui[node.dataset.i18nLabel] = node.getAttribute('aria-label');
for (const node of document.querySelectorAll('[data-i18n-title]')) en.ui[node.dataset.i18nTitle] = node.title;
// the inline script in the head already chose it, from the saved choice or the browser's
let lang = LANGS.some(([code]) => code === root.lang) ? root.lang : 'en';
let dict = en;

const t = key => dict.ui[key] ?? en.ui[key];
const appName = app => dict.apps[app.id]?.name ?? app.name;
const appTagline = app => dict.apps[app.id]?.tagline ?? app.tagline;
const tagName = tag => dict.tags[tag] ?? tag;

async function loadLang(code) {
  if (code === 'en') return en;
  const res = await fetch(`/lang/${code}.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const file = await res.json();
  return { ui: file.ui ?? {}, tags: file.tags ?? {}, apps: file.apps ?? {} };
}

// The referral offer is for the Americas and Europe. The browser's time zone says
// where the car is without asking a server, so it also works offline. A zone that
// says nothing (UTC, as a browser set up without one reports) falls back on the
// language, so an unset English browser keeps seeing it.
function referralHere() {
  let zone = '';
  try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''; } catch {}
  if (/^(America|Europe|US|Canada)\//.test(zone)) return true;
  if (/^(Pacific\/Honolulu|Atlantic\/(Reykjavik|Azores|Madeira|Canary|Faroe))$/.test(zone)) return true;
  if (zone && !/^(UTC|GMT|Etc\/.*)$/.test(zone)) return false;
  return !/^(zh|ja|ko)/.test(lang);
}

// The strings are the hub's own files, so they may carry markup (links, code)
function applyLang() {
  root.lang = lang;
  document.querySelector('.referral').hidden = !referralHere();
  // the community token isn't promoted to Chinese readers
  document.querySelector('.token').hidden = lang.startsWith('zh');
  for (const node of document.querySelectorAll('[data-i18n]')) node.innerHTML = t(node.dataset.i18n);
  for (const node of document.querySelectorAll('[data-i18n-label]')) node.setAttribute('aria-label', t(node.dataset.i18nLabel));
  for (const node of document.querySelectorAll('[data-i18n-title]')) node.title = t(node.dataset.i18nTitle);
  document.getElementById('langName').textContent = LANGS.find(([code]) => code === lang)[1];
  queryInput.placeholder = t('searchLabel');
  fsLabel();
  if (catalog) {
    renderRecent();
    renderFilters();
    renderGrid();
  }
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}

// Apps marked unlisted aren't on the grid: they open from elsewhere on the
// page (the token's chart, from the footer).
const listed = () => catalog.apps.filter(app => !app.unlisted);

// A "New" or "Updated" badge while the catalog's date for it is recent, until
// the app is opened after that date
function badge(app) {
  const [key, date] = app.updated ? ['badgeUpdated', app.updated] : app.added ? ['badgeNew', app.added] : [];
  if (!date) return [];
  const since = Date.parse(date + 'T00:00');
  if (!(Date.now() - since < NEWS_DAYS * 86400_000) || store.get('opened', {})[app.id] >= since) return [];
  return [el('span', { class: 'badge' }, t(key))];
}

// Search: every word typed must be in the app's name, tagline or tags, in
// the hub's language or in English, ignoring case and accents. While
// something is typed it covers every app, not only the chip's.
let query = '';
const fold = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function matches(app, words) {
  const hay = fold([app.id, app.name, app.tagline, appName(app), appTagline(app), ...app.tags, ...app.tags.map(tagName)].join('\n'));
  return words.every(w => hay.includes(w));
}

function renderGrid() {
  const words = fold(query.trim()).split(/\s+/).filter(Boolean);
  const shown = listed().filter(app => words.length ? matches(app, words) : filter === 'all' || app.tags.includes(filter));
  filterRow.toggleAttribute('data-off', words.length > 0);
  if (!shown.length) {
    grid.replaceChildren(el('p', { class: 'empty' }, t('searchNone').replace('{query}', query.trim())));
    return;
  }
  grid.replaceChildren(...shown.map(app => {
    const card = el('button', { class: 'card', type: 'button', 'data-app': app.id },
      ...badge(app),
      el('img', { src: appsOrigin + app.icon, alt: '', width: 64, height: 64 }),
      el('h2', {}, appName(app)),
      el('p', {}, appTagline(app)),
      el('div', { class: 'tags' }, ...app.tags.map(tag => el('span', { class: 'tag' }, tagName(tag)))),
    );
    card.addEventListener('click', e => launch(app.id, e.detail === 0));   // no clicks counted: a key or the controller
    return card;
  }));
}

function renderFilters() {
  if (!FILTERS.some(([tag]) => tag === filter)) filter = 'all';
  filterRow.replaceChildren(...FILTERS
    .filter(([tag]) => tag === 'all' || listed().some(app => app.tags.includes(tag)))
    .map(([tag, label]) => {
      const chip = el('button', { class: 'chip', type: 'button', 'aria-pressed': String(tag === filter) }, t(label));
      chip.addEventListener('click', () => {
        filter = tag;
        store.set('filter', tag);
        for (const c of filterRow.children) c.setAttribute('aria-pressed', String(c === chip));
        if (query) setQuery(''); else renderGrid();   // the chip takes over from a search
      });
      return chip;
    }));
  toolbar.hidden = false;
}

function setQuery(text) {
  if (text === query) return;
  query = queryInput.value = text;
  clearQuery.hidden = !text;
  searchForm.classList.toggle('typed', !!text);
  renderGrid();
}
queryInput.addEventListener('input', () => setQuery(queryInput.value));
clearQuery.addEventListener('click', () => { setQuery(''); queryInput.focus(); });
// Enter (the keyboard's Search key) opens the first app found, and puts the
// keyboard away either way
searchForm.addEventListener('submit', e => {
  e.preventDefault();
  queryInput.blur();
  if (query.trim()) grid.querySelector('.card')?.click();
});

// The last few apps opened, newest first, one tap away. Returning visitors
// know what the site is, so the row takes the place of the lede.
function renderRecent() {
  if (!catalog) return;
  const apps = store.get('recent', []).map(id => catalog.apps.find(a => a.id === id))
    .filter(app => app && !(app.id === 'token' && lang.startsWith('zh'))).slice(0, RECENT);   // as in the footer
  recentRow.replaceChildren(...apps.map(app => {
    const b = el('button', { class: 'recent-app', type: 'button' },
      el('img', { src: appsOrigin + app.icon, alt: '', width: 28, height: 28 }), el('span', {}, appName(app)));
    b.addEventListener('click', () => launch(app.id));
    return b;
  }));
  recentRow.hidden = !apps.length;
  document.getElementById('lede').hidden = apps.length > 0;
}

function remember(id) {
  store.set('recent', [id, ...store.get('recent', []).filter(r => r !== id)].slice(0, 12));
  store.set('opened', { ...store.get('opened', {}), [id]: Date.now() });
  grid.querySelector(`[data-app="${id}"] .badge`)?.remove();
}

// A game played with a controller never touches the screen, so the hub keeps
// the screen on while a game is open. The browser lets go of the lock
// whenever the page is hidden; it's asked for again when the page shows.
let awake = false, lock = null;
async function stayAwake(on) {
  awake = on;
  if (!on) { lock?.release().catch(() => {}); lock = null; return; }
  if (lock || document.hidden || !navigator.wakeLock) return;
  try {
    const next = await navigator.wakeLock.request('screen');
    if (!awake || lock) { next.release().catch(() => {}); return; }   // closed, or asked twice, meanwhile
    lock = next;
    next.addEventListener('release', () => { if (lock === next) lock = null; });
  } catch {}
}
document.addEventListener('visibilitychange', () => stayAwake(awake));

// A tap on an app. Someone who used full screen last time gets it again:
// it can only be asked for during a tap, so this is the first chance.
function launch(id, byKey = false) {
  if (!runner.hidden) return;   // a held Enter repeats its click
  keysToApp = byKey;
  if (store.get('fullscreen', false) && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  openApp(id, { push: true });
}

// Each app gets a fresh, empty frame, and closing one removes its frame.
// Navigating a single frame from app to app (or to about:blank) adds entries
// to the browser history, and then the Apps button's history.back() only
// moved the frame back a page instead of closing the app.
function freshFrame() {
  const next = frame.cloneNode(false);
  next.removeAttribute('src');
  next.addEventListener('load', () => {
    try { if (next.contentWindow.location.href === 'about:blank') return; } catch {}   // the app's origin can't be read
    loading.hidden = true;
    if (keysToApp) next.focus();
  });
  frame.replaceWith(next);
  frame = next;
}

function openApp(id, { push }) {
  const app = catalog.apps.find(a => a.id === id);
  if (!app) return;
  if (push) {
    history.pushState({ app: id }, '', `/app/${encodeURIComponent(id)}`);
    pushedHistory = true;
  }
  loading.hidden = false;
  slowLoad.hidden = true;
  clearTimeout(slowTimer);
  slowTimer = setTimeout(() => { slowLoad.hidden = false; }, SLOW_LOAD);
  opened++;
  saveOnClose = false;
  remember(id);
  stayAwake(app.tags.includes('Game'));
  // focus left on the card behind the app: Enter or Space meant for the game would open it again
  document.activeElement?.blur();
  freshFrame();
  // an app that has its own translations is told the hub's language
  frame.src = appsOrigin + app.path + (app.langs?.includes(lang) ? `#lang=${lang}` : '');
  runner.hidden = false;
  document.title = `${appName(app)} · frunk.store`;
}

function closeApp() {
  runner.hidden = true;
  document.title = 'frunk.store';
  clearTimeout(slowTimer);
  stayAwake(false);
  renderRecent();
  // unload the app so it stops using CPU and memory
  const unload = () => freshFrame();
  if (!saveOnClose) return unload();
  saveOnClose = false;
  const which = opened, app = frame.contentWindow;
  const done = e => {
    if (e && (e.source !== app || e.data?.frunk !== 'closed')) return;
    removeEventListener('message', done);
    clearTimeout(timer);
    if (which === opened) unload();
  };
  const timer = setTimeout(done, 1000);
  addEventListener('message', done);
  app.postMessage({ frunk: 'close' }, appsOrigin);
}

addEventListener('message', e => {
  if (e.source !== frame.contentWindow || e.origin !== appsOrigin) return;
  if (e.data?.frunk === 'save-on-close') saveOnClose = true;
  // Brain Test's score card, opened in place of the hub: the app's frame
  // can't open pages itself
  if (e.data?.frunk === 'share' && /^[\w-]{12}$/.test(e.data.id || '')) {
    location.href = `${appsOrigin}/brain/share.html#${e.data.id}`;
  }
});

document.getElementById('home').addEventListener('click', () => {
  if (pushedHistory) {
    // A second tap before the page hears of the first would go back past the
    // hub. The timer is for an app whose frame has its own page to go back to.
    if (leaving) return;
    leaving = true;
    setTimeout(() => { leaving = false; }, 1000);
    history.back(); // popstate closes the app, keeps the car's back button in sync
  } else {
    history.replaceState(null, '', '/');
    closeApp();
  }
});

addEventListener('popstate', e => {
  pushedHistory = leaving = false;
  if (e.state?.app && !catalog) return;   // no app list yet: init opens it from the address
  if (e.state?.app) openApp(e.state.app, { push: false });
  else closeApp();
});

// Full screen gains a lot of room on the car's small browser viewport.
const fsBtn = document.getElementById('fullscreen');
function fsLabel() {
  fsBtn.textContent = t(document.fullscreenElement ? 'fullscreenExit' : 'fullscreen');
}
if (document.documentElement.requestFullscreen) {
  fsBtn.hidden = false;
  fsBtn.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => { fsBtn.textContent = t('fullscreenBlocked'); });
  });
  // Leaving the page ends full screen without an event, so the choice is
  // kept until it's turned off
  document.addEventListener('fullscreenchange', () => {
    fsLabel();
    store.set('fullscreen', !!document.fullscreenElement);
  });
}

// Browsing with a controller, or arrow keys: the D-pad or left stick moves
// between the chips, recent apps and cards, A opens the one in focus. The
// controller is read only while the hub itself is showing, never while an
// app runs, so a game's input stays its own. The focused card is lit by
// the .padnav class, since a ring from focus() alone isn't shown after a tap.
const NAV = '#filters .chip, #recent .recent-app, #grid .card';
const DEAD = 0.5;          // stick travel before it counts as a direction
const REPEAT = [400, 130]; // ms held before the first and the next repeats
let padNav = false, lastNav = null;
let padDir = null, padRepeat = 0, padA = false;

function navItems() {
  return [...document.querySelectorAll(NAV)].filter(n => n.offsetParent !== null);
}

function setPadNav(on) {
  padNav = on;
  document.body.classList.toggle('padnav', on);
}

// The nearest element in that direction, measured from the focused one's
// edge, with sideways offset counted against it, so down from a chip lands
// on the card below it
function move(dir) {
  const items = navItems();
  if (!items.length) return;
  const cur = document.activeElement;
  let next;
  if (!items.includes(cur)) {
    next = items.includes(lastNav) ? lastNav : items.find(n => n.matches('.card')) ?? items[0];
  } else {
    const r = cur.getBoundingClientRect();
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    let best = Infinity;
    for (const n of items) {
      if (n === cur) continue;
      const b = n.getBoundingClientRect();
      const bx = (b.left + b.right) / 2, by = (b.top + b.bottom) / 2;
      let ahead, aside;
      if (dir === 'down') { ahead = b.top - r.bottom; aside = Math.abs(bx - cx); }
      else if (dir === 'up') { ahead = r.top - b.bottom; aside = Math.abs(bx - cx); }
      else if (dir === 'right') { ahead = b.left - r.right; aside = Math.abs(by - cy); }
      else { ahead = r.left - b.right; aside = Math.abs(by - cy); }
      if (ahead < -1) continue;
      const score = ahead + aside * 1.5;
      if (score < best) { best = score; next = n; }
    }
  }
  if (!next) return;
  setPadNav(true);
  lastNav = next;
  next.focus({ preventScroll: true });
  next.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function pollPads() {
  // while an app runs, only a look now and then for when the hub is back
  if (!runner.hidden || document.hidden) { padDir = null; setTimeout(pollPads, 500); return; }
  requestAnimationFrame(pollPads);
  if (!langMenu.hidden) { padDir = null; return; }
  // The car lists a controller twice, raw and as a "Tesla Virtual Gamepad"
  // with the standard layout: read the standard one. Its A and B are
  // swapped from the usual numbering there, so either face button opens.
  const pads = [...navigator.getGamepads()].filter(Boolean);
  const pad = pads.find(p => p.mapping === 'standard') || pads[0];
  let dir = null, a = false;
  if (pad) {
    const [x = 0, y = 0] = pad.axes;
    const on = i => pad.mapping === 'standard' && !!pad.buttons[i]?.pressed;
    if (on(12) || y < -DEAD) dir = 'up';
    else if (on(13) || y > DEAD) dir = 'down';
    else if (on(14) || x < -DEAD) dir = 'left';
    else if (on(15) || x > DEAD) dir = 'right';
    a = !!(pad.buttons[0]?.pressed || pad.buttons[1]?.pressed);
  }
  const now = performance.now();
  if (dir && (dir !== padDir || now >= padRepeat)) {
    padRepeat = now + REPEAT[dir === padDir ? 1 : 0];
    move(dir);
  }
  padDir = dir;
  if (a && !padA && padNav && navItems().includes(document.activeElement)) document.activeElement.click();
  padA = a;
}

// Chrome tells of a controller once a button on it is pressed
let padsSeen = false;
addEventListener('gamepadconnected', () => {
  if (padsSeen) return;
  padsSeen = true;
  pollPads();
});

document.addEventListener('keydown', e => {
  const dir = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
  if (!dir || !runner.hidden || !langMenu.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
  // left and right in the search box move its caret; up and down leave it
  if (e.target === queryInput && (dir === 'left' || dir === 'right')) return;
  if (e.target === queryInput) queryInput.blur();
  e.preventDefault();
  move(dir);
});
// a tap takes over: no ring on what the controller had picked
document.addEventListener('pointerdown', () => setPadNav(false));

// The language menu: each language listed in its own name
const langBtn = document.getElementById('langBtn');
const langMenu = document.getElementById('langMenu');
let picking = 0;           // counts picks, so a slow file can't undo a newer pick

function showLangMenu(open) {
  langMenu.hidden = !open;
  langBtn.setAttribute('aria-expanded', String(open));
  if (!open) return;
  langMenu.replaceChildren(...LANGS.map(([code, name]) => {
    const item = el('button', { type: 'button', role: 'menuitemradio', 'aria-checked': String(code === lang), lang: code }, name);
    item.addEventListener('click', () => pickLang(code));
    return item;
  }));
  langMenu.querySelector('[aria-checked="true"]').focus();
}

async function pickLang(code) {
  showLangMenu(false);
  const which = ++picking;
  let next;
  try { next = await loadLang(code); } catch { return; }   // offline and never loaded: stay as is
  if (which !== picking) return;
  store.set('lang', code);
  lang = code;
  dict = next;
  applyLang();
}

langBtn.addEventListener('click', () => showLangMenu(langMenu.hidden));
document.addEventListener('pointerdown', e => {
  if (!langMenu.hidden && !e.target.closest('.lang')) showLangMenu(false);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !langMenu.hidden) { showLangMenu(false); langBtn.focus(); }
});

// With no app list (no connection on the first visit), it tries again every
// few seconds and as soon as the browser says it's back online
let retry, fetching = false;
async function init() {
  if (catalog || fetching) return;
  fetching = true;
  const err = document.getElementById('catalogError');
  clearTimeout(retry);
  if (err.hidden) grid.replaceChildren(...Array.from({ length: 3 }, () => el('div', { class: 'skeleton' })));
  try {
    const res = await fetch('/catalog.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    catalog = await res.json();
  } catch (e) {
    grid.replaceChildren();
    err.hidden = false;
    err.textContent = t('catalogError').replace('{error}', e.message);
    retry = setTimeout(init, 10000);
    return;
  } finally {
    fetching = false;
  }
  err.hidden = true;
  removeEventListener('online', init);
  appsOrigin = resolveAppsOrigin(catalog.appsOrigin);
  renderRecent();
  renderFilters();
  renderGrid();

  // /app/<id> deep links; ?app=<id> is the older form, still accepted.
  // Paths (not query strings) let analytics count each app separately.
  const deepLink = location.pathname.match(/^\/app\/([\w-]+)\/?$/)?.[1]
    ?? new URLSearchParams(location.search).get('app');
  if (deepLink && catalog.apps.some(a => a.id === deepLink)) {
    history.replaceState({ app: deepLink }, '', `/app/${deepLink}`);
    openApp(deepLink, { push: false });
  } else if (deepLink) {
    history.replaceState(null, '', '/');
  }
}

// Copies the community token's address; selects it when the clipboard is
// off limits, so it can still be copied by hand
document.getElementById('copyToken').addEventListener('click', async e => {
  const btn = e.currentTarget;
  const code = document.getElementById('tokenAddress');
  try {
    await navigator.clipboard.writeText(code.textContent);
    btn.textContent = t('copied');
  } catch {
    getSelection().selectAllChildren(code);
    btn.textContent = t('selected');
  }
  setTimeout(() => { btn.textContent = t('copy'); }, 2000);
});

document.getElementById('openToken').addEventListener('click', () => launch('token'));

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
// The page stays hidden (the head's i18n-wait) until its language is in
loadLang(lang)
  .then(next => { dict = next; }, () => { lang = 'en'; })
  .finally(() => { applyLang(); root.classList.remove('i18n-wait'); });
addEventListener('online', init);
init();
