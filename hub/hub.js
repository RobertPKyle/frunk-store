// Hub: lists apps from catalog.json and runs each one full screen in a
// sandboxed iframe on a separate origin, so an app cannot touch the hub's
// storage or navigate the top page.

import { LANGS, EN_UI } from './i18n.js';

const grid = document.getElementById('grid');
const recentRow = document.getElementById('recent');
const filterRow = document.getElementById('filters');
const runner = document.getElementById('runner');
let frame = document.getElementById('frame');
const loading = document.getElementById('loading');

let catalog;
let appsOrigin;
let pushedHistory = false; // true when the open app added a history entry
// An app that keeps progress (Retro Console) posts { frunk: 'save-on-close' }
// when it loads. Closing it then posts { frunk: 'close' } and waits up to a
// second for { frunk: 'closed' } before unloading it, so it can save first.
let saveOnClose = false;
let opened = 0;            // counts openApp calls, so a late unload can't hit a newer app

const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem('hub.' + key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('hub.' + key, JSON.stringify(value)); } catch {} },
};

// Categories come from the apps' tags; an app can be in more than one.
// The second item is the label's string key.
const FILTERS = [['all', 'filterAll'], ['Game', 'filterGames'], ['Camp Mode', 'filterCamp'], ['Road Trip', 'filterRoad'], ['Tool', 'filterTools']];
let filter = store.get('filter', 'all');
const RECENT = 3;          // apps in the Recent row: as many as fit across the car's screen

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

// The strings are the hub's own files, so they may carry markup (links, code)
function applyLang() {
  root.lang = lang;
  for (const node of document.querySelectorAll('[data-i18n]')) node.innerHTML = t(node.dataset.i18n);
  for (const node of document.querySelectorAll('[data-i18n-label]')) node.setAttribute('aria-label', t(node.dataset.i18nLabel));
  for (const node of document.querySelectorAll('[data-i18n-title]')) node.title = t(node.dataset.i18nTitle);
  document.getElementById('langName').textContent = LANGS.find(([code]) => code === lang)[1];
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

// Apps marked holders (early access for FrunkStore token holders) aren't on
// the grid: the Holders app lists them and asks the hub to open one
const listed = () => catalog.apps.filter(app => !app.holders);

function renderGrid() {
  const shown = listed().filter(app => filter === 'all' || app.tags.includes(filter));
  grid.replaceChildren(...shown.map(app => {
    const card = el('button', { class: 'card', type: 'button' },
      el('img', { src: appsOrigin + app.icon, alt: '', width: 64, height: 64 }),
      el('h2', {}, appName(app)),
      el('p', {}, appTagline(app)),
      el('div', { class: 'tags' }, ...app.tags.map(tag => el('span', { class: 'tag' }, tagName(tag)))),
    );
    card.addEventListener('click', () => launch(app.id));
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
        renderGrid();
      });
      return chip;
    }));
  filterRow.hidden = false;
}

// The last few apps opened, newest first, one tap away. Returning visitors
// know what the site is, so the row takes the place of the lede.
function renderRecent() {
  if (!catalog) return;
  const apps = store.get('recent', []).map(id => catalog.apps.find(a => a.id === id)).filter(Boolean).slice(0, RECENT);
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
}

// A tap on an app. Someone who used full screen last time gets it again:
// it can only be asked for during a tap, so this is the first chance.
function launch(id) {
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
  opened++;
  saveOnClose = false;
  remember(id);
  freshFrame();
  frame.src = appsOrigin + app.path;
  runner.hidden = false;
  document.title = `${appName(app)} · frunk.store`;
}

function closeApp() {
  runner.hidden = true;
  document.title = 'frunk.store';
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
  // The Holders app opens an early-access app in its place, so the Apps
  // button goes back to the grid and closes that app the usual way
  if (e.data?.frunk === 'open' && catalog.apps.find(a => a.id === e.data.app)?.holders) {
    history.replaceState({ app: e.data.app }, '', `/app/${encodeURIComponent(e.data.app)}`);
    openApp(e.data.app, { push: false });
  }
});

document.getElementById('home').addEventListener('click', () => {
  if (pushedHistory) {
    history.back(); // popstate closes the app, keeps the car's back button in sync
  } else {
    history.replaceState(null, '', '/');
    closeApp();
  }
});

addEventListener('popstate', e => {
  pushedHistory = false;
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

async function init() {
  grid.replaceChildren(...Array.from({ length: 3 }, () => el('div', { class: 'skeleton' })));
  try {
    const res = await fetch('/catalog.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    catalog = await res.json();
  } catch (e) {
    grid.replaceChildren();
    const err = document.getElementById('catalogError');
    err.hidden = false;
    err.textContent = t('catalogError').replace('{error}', e.message);
    return;
  }
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

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
// The page stays hidden (the head's i18n-wait) until its language is in
loadLang(lang)
  .then(next => { dict = next; }, () => { lang = 'en'; })
  .finally(() => { applyLang(); root.classList.remove('i18n-wait'); });
init();
