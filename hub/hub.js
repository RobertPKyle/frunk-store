// Hub: lists apps from catalog.json and runs each one full screen in a
// sandboxed iframe on a separate origin, so an app cannot touch the hub's
// storage or navigate the top page.

import { LANGS, EN_UI } from './i18n.js';
import { startTokens, tokensLangChanged } from './tokens.js';

const grid = document.getElementById('grid');
const partnersBox = document.getElementById('partners');
const partnerList = document.getElementById('partnerList');
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
const partnerAbout = partner => dict.apps[partner.id]?.about ?? partner.about;
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
  // the tokens aren't promoted to Chinese readers
  document.querySelector('.token').hidden = lang.startsWith('zh');
  for (const node of document.querySelectorAll('[data-i18n]')) node.innerHTML = t(node.dataset.i18n);
  for (const node of document.querySelectorAll('[data-i18n-label]')) node.setAttribute('aria-label', t(node.dataset.i18nLabel));
  for (const node of document.querySelectorAll('[data-i18n-title]')) node.title = t(node.dataset.i18nTitle);
  document.getElementById('langName').textContent = LANGS.find(([code]) => code === lang)[1];
  tokensLangChanged();
  queryInput.placeholder = t('searchLabel');
  fsLabel();
  if (catalog) {
    renderPartners();
    renderFeatured();
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

// How an app plays best, from its catalog entry's "input": by touch, with a
// controller (touch may still work), or either one as well as the other.
// Apps that take both have a button on their own bar that swaps between them.
const INPUT = { touch: 'inputTouch', controller: 'inputController', both: 'inputBoth' };
const HAND = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-.5a1.5 1.5 0 0 1 3 0V11m0-.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.6a6 6 0 0 1-4.7-2.3L4.2 15.6a1.5 1.5 0 0 1 2.3-1.9L9 16"/></svg>';
const PAD = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 7h9a4.5 4.5 0 0 1 4.4 3.6l.9 4.6a2.6 2.6 0 0 1-4.6 2.1L15.5 15h-7l-1.7 2.3a2.6 2.6 0 0 1-4.6-2.1l.9-4.6A4.5 4.5 0 0 1 7.5 7z"/><path d="M8 10v3M6.5 11.5h3"/></svg>';
const INPUT_ICONS = { touch: HAND, controller: PAD, both: HAND + PAD };
// A partner game's grid card says whose it is, and that it opens elsewhere
function partnerChip(app) {
  if (!app.url) return [];
  const chip = el('span', { class: 'tag partner-tag' }, t('partnerTag'));
  chip.insertAdjacentHTML('beforeend', OUT);
  return [chip];
}
function inputChip(app) {
  if (!INPUT[app.input]) return [];
  const chip = el('span', { class: 'tag input', 'data-input': app.input }, t(INPUT[app.input]));
  chip.insertAdjacentHTML('afterbegin', INPUT_ICONS[app.input]);
  return [chip];
}

// Partners: sites the store has teamed up with, in their own section at the
// top of the page. They aren't apps run in the hub's frame: each card links
// out to the partner's site, in a new tab. The icon is a hub file. A
// language file translates a partner's tagline and "about" under "apps", by
// its id, the way it does an app's. A partner game has "action": "play", so
// its link says "Play on" rather than "Visit". The cards are small, in one
// row that scrolls sideways, so the banner and the apps below still show on
// the car's first screen: just the icon, the name and where it goes. The
// tagline is the card's tooltip, and a partner's "about" is shown where
// there is room for it, on its grid card.
const OUT ='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>';
// A partner with "hideLangs" isn't shown in those languages: HoodFellas,
// with real-money betting, stays out of the Chinese hubs, as the tokens do.
const partnersHere = () => (catalog.partners ?? []).filter(p => /^https:\/\//.test(p.url)
  && !(p.hideLangs ?? []).some(code => lang.startsWith(code)));
function renderPartners() {
  const partners = partnersHere();
  partnersBox.hidden = !partners.length;
  partnerList.replaceChildren(...partners.map(p => {
    const key = p.action === 'play' ? 'partnerPlay' : 'partnerVisit';
    // the words in a span of their own, so a long one ends in "…" before the arrow
    const go = el('span', { class: 'partner-go' }, el('span', {}, t(key).replace('{site}', new URL(p.url).host.replace(/^www\./, ''))));
    go.insertAdjacentHTML('beforeend', OUT);
    return el('a', { class: 'partner', href: p.url, target: '_blank', rel: 'noopener', 'data-partner': p.id, title: appTagline(p) ?? '' },
      el('img', { src: p.icon, alt: '', width: 44, height: 44 }),
      el('div', { class: 'partner-text' },
        // an age limit stays in sight now the tagline that said it is only a tooltip
        el('h3', {}, el('span', {}, appName(p)), ...(p.minAge ? [el('span', { class: 'partner-age' }, `${p.minAge}+`)] : [])),
        go));
  }));
}

// Featured: a few apps picked in catalog.json's "featured", each a wide
// slide with a screenshot behind its name, between the partners and the
// grid. A tap anywhere on a slide opens the app. The slides scroll sideways
// and snap, and move on by themselves every few seconds until the banner is
// first touched or reached with the keys; never under reduced motion, nor
// while the page is hidden or an app is open. The pictures are plain images
// under a fixed gradient, so the car's GPU draws them like any other image.
const featuredBox = document.getElementById('featured');
const featuredTrack = document.getElementById('featuredTrack');
const featuredDots = document.getElementById('featuredDots');
const ADVANCE = 7000;      // ms each slide shows before the next one
const PLAY = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>';
const quietMotion = matchMedia('(prefers-reduced-motion: reduce)');
let featuredAt = 0, featuredHeld = false, featuredTimer;

function renderFeatured() {
  const picks = (catalog.featured ?? []).map(f => [catalog.apps.find(a => a.id === f.app && !a.unlisted), f.image]).filter(([app]) => app);
  featuredBox.hidden = !picks.length;
  featuredBox.setAttribute('aria-label', t('featuredLabel'));
  featuredTrack.replaceChildren(...picks.map(([app, image], i) => {
    // "New" or "Updated" on the same dates as the grid's badge, else "Featured"
    const [fresh, date] = app.updated ? ['badgeUpdated', app.updated] : ['badgeNew', app.added];
    const kicker = date && Date.now() - Date.parse(date + 'T00:00') < NEWS_DAYS * 86400_000 ? fresh : 'featuredKicker';
    const play = el('span', { class: 'slide-play' }, t(app.tags.includes('Game') ? 'featuredPlay' : 'featuredOpen'));
    play.insertAdjacentHTML('afterbegin', PLAY);
    const slide = el('button', { class: 'slide', type: 'button', 'data-featured': app.id },
      // the first is on the first screen; the rest wait for the icons on a slow connection
      el('img', { class: 'slide-art', src: image, alt: '', width: 1200, height: 300, decoding: 'async', ...(i ? { fetchpriority: 'low' } : {}) }),
      el('span', { class: 'slide-text' },
        el('span', { class: 'slide-kicker' }, t(kicker)),
        el('span', { class: 'slide-name' }, appName(app)),
        el('span', { class: 'slide-tagline' }, appTagline(app))),
      play);
    slide.addEventListener('click', e => launch(app.id, e.detail === 0));   // no clicks counted: a key or the controller
    return slide;
  }));
  featuredDots.replaceChildren(...picks.map(() => el('span')));
  // drawn again for a new language: stay on the slide that was up
  featuredAt = Math.min(featuredAt, Math.max(picks.length - 1, 0));
  featuredTrack.scrollLeft = featuredAt * slideStep();
  showDot();
  advanceLater();
}

// one slide's width and the gap after it
const slideStep = () => {
  const [a, b] = featuredTrack.children;
  return b ? b.offsetLeft - a.offsetLeft : featuredTrack.clientWidth || 1;
};

function showDot() {
  featuredAt = Math.max(0, Math.min(featuredDots.children.length - 1, Math.round(featuredTrack.scrollLeft / slideStep())));
  [...featuredDots.children].forEach((dot, i) => dot.classList.toggle('on', i === featuredAt));
}
featuredTrack.addEventListener('scroll', showDot, { passive: true });

function advanceLater() {
  clearTimeout(featuredTimer);
  if (featuredHeld || quietMotion.matches || document.hidden || featuredTrack.children.length < 2) return;
  featuredTimer = setTimeout(() => {
    if (runner.hidden && !quietMotion.matches) {
      const next = (featuredAt + 1) % featuredTrack.children.length;
      featuredTrack.scrollTo({ left: next * slideStep(), behavior: 'smooth' });
    }
    advanceLater();
  }, ADVANCE);
}
// Once someone takes the banner in hand it stays where they leave it
function holdFeatured() {
  featuredHeld = true;
  clearTimeout(featuredTimer);
}
featuredBox.addEventListener('pointerdown', holdFeatured);
featuredBox.addEventListener('focusin', holdFeatured);
featuredTrack.addEventListener('wheel', holdFeatured, { passive: true });
document.addEventListener('visibilitychange', () => document.hidden ? clearTimeout(featuredTimer) : advanceLater());

// A partner entry with "tags" (and "input" and "added", like an app's) is
// on the grid too, among the apps: a card that links out to the same page,
// marked as a partner's. Its icon is a hub file, not one on the apps origin.
const partnerApps = () => partnersHere().filter(p => p.tags);
const iconSrc = app => app.url ? app.icon : appsOrigin + app.icon;

// Apps marked unlisted aren't on the grid
const listed = () => [...catalog.apps.filter(app => !app.unlisted), ...partnerApps()];
const findApp = id => catalog.apps.find(a => a.id === id) ?? partnerApps().find(p => p.id === id);

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
  const how = INPUT[app.input] ? [en.ui[INPUT[app.input]], t(INPUT[app.input])] : [];
  const about = app.about ? [app.about, partnerAbout(app)] : [];
  const hay = fold([app.id, app.name, app.tagline, appName(app), appTagline(app), ...about, ...app.tags, ...app.tags.map(tagName), ...how].join('\n'));
  return words.every(w => hay.includes(w));
}

// With "All" picked and nothing typed, the apps are on shelves: the newest
// first, then the catalog's "shelves" in its order, each a row of cards that
// scrolls sideways. A chip or a search shows one flat grid instead, since
// that is a single list to look through. An app can be on two shelves, so
// it can have two cards.
function renderGrid() {
  const words = fold(query.trim()).split(/\s+/).filter(Boolean);
  filterRow.toggleAttribute('data-off', words.length > 0);
  if (!words.length && filter === 'all' && catalog.shelves) {
    grid.dataset.view = 'shelves';
    grid.replaceChildren(...shelves().map(([id, title, apps]) => el('section', { class: 'shelf', 'data-shelf': id },
      el('h2', { class: 'shelf-title' }, title),
      el('div', { class: 'shelf-row' }, ...apps.map(appCard)))));
    return;
  }
  grid.dataset.view = 'grid';
  const shown = listed().filter(app => words.length ? matches(app, words) : filter === 'all' || app.tags.includes(filter));
  if (!shown.length) {
    grid.replaceChildren(el('p', { class: 'empty' }, t('searchNone').replace('{query}', query.trim())));
    return;
  }
  grid.replaceChildren(...shown.map(appCard));
}

// The tags a card shows beside how the app plays and whose it is. The others
// (Game, Camp Mode, WebGL and so on) repeat the filter chips or mean little
// to a driver, so they're left to the filters and the search.
const CARD_TAGS = ['Offline'];
// A name with a long word, as German, Dutch and Norwegian make them
// ("Hemelverschijnselen"), is set smaller, so the word fits beside the icon
// more often instead of breaking in two
const LONG_WORD = /[\p{Script=Latin}'’]{12,}/u;

function appCard(app) {
  const card = app.url
    ? el('a', { class: 'card', href: app.url, target: '_blank', rel: 'noopener', 'data-app': app.id })
    : el('button', { class: 'card', type: 'button', 'data-app': app.id });
  const name = appName(app);
  card.append(
    el('img', { src: iconSrc(app), alt: '', width: 52, height: 52 }),
    // the badge goes above the title, where it can't cover it in any language
    el('div', { class: 'card-title' }, ...badge(app), el('h2', LONG_WORD.test(name) ? { class: 'long' } : {}, name)),
    el('p', {}, app.url ? partnerAbout(app) : appTagline(app)),
    el('div', { class: 'tags' }, ...inputChip(app), ...partnerChip(app),
      ...app.tags.filter(tag => CARD_TAGS.includes(tag)).map(tag => el('span', { class: 'tag' }, tagName(tag)))),
  );
  // a partner's card opens its page itself, being a link
  card.addEventListener('click', e => app.url ? openedPartner(app.id) : launch(app.id, e.detail === 0));   // no clicks counted: a key or the controller
  // The star sits beside the card, not in it: a button inside a button (or
  // a link) isn't allowed, and a tap on it mustn't open the app
  const fav = favorites().includes(app.id);
  const star = el('button', { class: 'star', type: 'button', 'aria-pressed': String(fav), 'aria-label': t('favorite'), title: t('favorite') });
  star.innerHTML = STAR;
  star.addEventListener('click', () => toggleFavorite(app.id, star));
  return el('div', { class: 'card-wrap' }, card, star);
}

// Favorites: a star on each card puts the app on a shelf of its own, first
// on the shelves. A long press isn't used, as the car's screen doesn't
// report one reliably; the star is a plain button, and a controller's X or
// Y stars the card in focus. The ids are kept newest first.
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 3.2 2.7 5.5 6 .9-4.35 4.2 1 6-5.35-2.8-5.35 2.8 1-6L3.3 9.6l6-.9z"/></svg>';
const favorites = () => store.get('favorites', []);

function toggleFavorite(id, from) {
  const favs = favorites();
  store.set('favorites', favs.includes(id) ? favs.filter(f => f !== id) : [id, ...favs]);
  // Drawn again, as the Favorites shelf grows, shrinks or comes and goes
  // above the others. The page is kept where it was: the shelf the star was
  // on stays at the same height on the screen, each row stays scrolled as
  // it was, and focus goes back to the same card, or its neighbour when
  // the card has left the Favorites shelf.
  const wrap = from.closest('.card-wrap');
  const shelf = wrap.closest('.shelf');
  const shelfId = shelf?.dataset.shelf;
  const index = shelf ? [...shelf.querySelectorAll('.card-wrap')].indexOf(wrap) : -1;
  const focus = document.activeElement === from ? 'star' : document.activeElement === wrap.firstChild ? 'card' : null;
  const top = (shelf ?? wrap).getBoundingClientRect().top;
  const scrolled = new Map([...grid.querySelectorAll('.shelf')].map(s => [s.dataset.shelf, s.querySelector('.shelf-row').scrollLeft]));
  const shelfIds = [...scrolled.keys()];
  renderGrid();
  for (const s of grid.querySelectorAll('.shelf')) s.querySelector('.shelf-row').scrollLeft = scrolled.get(s.dataset.shelf) ?? 0;
  // the shelf, or what took its place when the last favorite left it
  const anchor = shelf
    ? grid.querySelector(`.shelf[data-shelf="${shelfId}"]`) ?? grid.querySelector(`.shelf[data-shelf="${shelfIds[shelfIds.indexOf(shelfId) + 1]}"]`)
    : grid.querySelector(`.card[data-app="${id}"]`)?.parentElement;
  if (anchor) scrollBy(0, anchor.getBoundingClientRect().top - top);
  if (!focus || !anchor) return;
  const wraps = anchor.matches('.card-wrap') ? [anchor] : [...anchor.querySelectorAll('.card-wrap')];
  const next = wraps.find(w => w.firstChild.dataset.app === id) ?? wraps[Math.min(index, wraps.length - 1)] ?? wraps[0];
  if (!next) return;
  const target = focus === 'star' ? next.lastChild : next.firstChild;
  if (focus === 'card') lastNav = target;
  target.focus({ preventScroll: true });
}

const NEW_SHELF = 10;      // apps on the first shelf, the newest
// the later of an app's "added" and "updated" dates; they're ISO dates, so they sort as text
const newsDate = app => [app.added ?? '', app.updated ?? ''].sort()[1];

// Each shelf as [id, title, apps], leaving out apps not listed here (a
// partner game hidden in this language) and shelves left empty, as
// Favorites is until something is starred
function shelves() {
  const apps = listed();
  const byId = new Map(apps.map(app => [app.id, app]));
  // partner games are left off it: they already sit in the partners row at the top
  const newest = apps.filter(app => !app.url && newsDate(app)).sort((a, b) => newsDate(b).localeCompare(newsDate(a))).slice(0, NEW_SHELF);
  const rows = [['favorites', t('shelfFavorites'), favorites().map(id => byId.get(id)).filter(Boolean)], ['new', t('shelfNew'), newest]];
  const placed = new Set();
  for (const shelf of catalog.shelves) {
    const row = shelf.apps.map(id => byId.get(id)).filter(Boolean);
    for (const app of row) placed.add(app.id);
    rows.push([shelf.id, t('shelf_' + shelf.id) ?? shelf.id, row]);
  }
  // an app added to the catalog but to no shelf still shows, at the end
  rows.push(['more', t('shelfMore'), apps.filter(app => !placed.has(app.id))]);
  return rows.filter(([, , row]) => row.length);
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

// The last few apps opened, newest first, one tap away
function renderRecent() {
  if (!catalog) return;
  const apps = store.get('recent', []).map(findApp).filter(Boolean).slice(0, RECENT);
  recentRow.replaceChildren(...apps.map(app => {
    const b = el('button', { class: 'recent-app', type: 'button' },
      el('img', { src: iconSrc(app), alt: '', width: 28, height: 28 }), el('span', {}, appName(app)));
    b.addEventListener('click', () => launch(app.id));
    return b;
  }));
  recentRow.hidden = !apps.length;
}

function remember(id) {
  store.set('recent', [id, ...store.get('recent', []).filter(r => r !== id)].slice(0, 12));
  store.set('opened', { ...store.get('opened', {}), [id]: Date.now() });
  // on the shelves an app can have more than one card
  for (const b of grid.querySelectorAll(`[data-app="${id}"] .badge`)) b.remove();
}

// A partner game left for in a new tab: in the Recent row now, since no
// app closing will refresh it
function openedPartner(id) {
  remember(id);
  renderRecent();
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
  const partner = partnerApps().find(p => p.id === id);
  if (partner) {
    window.open(partner.url, '_blank', 'noopener');
    openedPartner(id);
    return;
  }
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
  if (!app) return;   // a partner game isn't run here, so it has no /app/ link either
  if (push) {
    history.pushState({ app: id }, '', `/app/${encodeURIComponent(id)}`);
    pushedHistory = true;
  }
  // The splash shows which app is coming while its frame loads. The icon is
  // a new element each time: an img given a new src keeps showing the last
  // app's icon until the new one arrives, which on a weak signal can be a while.
  loading.querySelector('.splash-icon').replaceWith(el('img', { class: 'splash-icon', src: iconSrc(app), alt: '', width: 96, height: 96 }));
  loading.querySelector('.splash-name').textContent = appName(app);
  loading.querySelector('.splash-tagline').textContent = appTagline(app);
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
// between the chips, recent apps and cards, A opens the one in focus, and X
// or Y stars a card as a favorite (the stars aren't stops of their own). The
// controller is read only while the hub itself is showing, never while an
// app runs, so a game's input stays its own. The focused card is lit by
// the .padnav class, since a ring from focus() alone isn't shown after a tap.
const NAV = '#partners .partner, #featured .slide, #filters .chip, #recent .recent-app, #grid .card';
const DEAD = 0.5;          // stick travel before it counts as a direction
const REPEAT = [400, 130]; // ms held before the first and the next repeats
let padNav = false, lastNav = null;
let padDir = null, padRepeat = 0, padA = false, padY = false;

function navItems() {
  return [...document.querySelectorAll(NAV)].filter(n => n.offsetParent !== null);
}

function setPadNav(on) {
  padNav = on;
  document.body.classList.toggle('padnav', on);
}

// The nearest element in that direction, measured from the focused one's
// edge, with sideways offset counted against it, so down from a chip lands
// on the card below it. The offset runs from the focused one's middle to
// the other's nearer side, so the wide banner counts as right above or
// below whatever is under or over it, and isn't passed over.
function move(dir) {
  const items = navItems();
  if (!items.length) return;
  const cur = document.activeElement;
  let next;
  if (!items.includes(cur)) {
    next = items.includes(lastNav) ? lastNav : items.find(n => n.matches('.card')) ?? items[0];
  } else {
    // left and right stay on the shelf: past its end there's nothing, rather
    // than a card scrolled out of sight on the shelf above or below
    const row = (dir === 'left' || dir === 'right') && cur.closest('.shelf-row');
    const r = cur.getBoundingClientRect();
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    let best = Infinity;
    for (const n of items) {
      if (n === cur || (row && !row.contains(n))) continue;
      const b = n.getBoundingClientRect();
      const dx = Math.max(0, b.left - cx, cx - b.right), dy = Math.max(0, b.top - cy, cy - b.bottom);
      let ahead, aside;
      if (dir === 'down') { ahead = b.top - r.bottom; aside = dx; }
      else if (dir === 'up') { ahead = r.top - b.bottom; aside = dx; }
      else if (dir === 'right') { ahead = b.left - r.right; aside = dy; }
      else { ahead = r.left - b.right; aside = dy; }
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
  let dir = null, a = false, star = false;
  if (pad) {
    const [x = 0, y = 0] = pad.axes;
    const on = i => pad.mapping === 'standard' && !!pad.buttons[i]?.pressed;
    if (on(12) || y < -DEAD) dir = 'up';
    else if (on(13) || y > DEAD) dir = 'down';
    else if (on(14) || x < -DEAD) dir = 'left';
    else if (on(15) || x > DEAD) dir = 'right';
    a = !!(pad.buttons[0]?.pressed || pad.buttons[1]?.pressed);
    // X or Y stars the card in focus; either, as the car may swap them as it does A and B
    star = !!(pad.buttons[2]?.pressed || pad.buttons[3]?.pressed);
  }
  const now = performance.now();
  if (dir && (dir !== padDir || now >= padRepeat)) {
    padRepeat = now + REPEAT[dir === padDir ? 1 : 0];
    move(dir);
  }
  padDir = dir;
  if (a && !padA && padNav && navItems().includes(document.activeElement)) document.activeElement.click();
  padA = a;
  const card = document.activeElement;
  if (star && !padY && padNav && card?.matches('#grid .card')) card.nextElementSibling.click();
  padY = star;
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
    partnersBox.hidden = featuredBox.hidden = true;
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
  startTokens(appsOrigin, () => lang, store);
  renderPartners();
  renderFeatured();
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

// Copies a token's address; selects it when the clipboard is off limits, so
// it can still be copied by hand
for (const btn of document.querySelectorAll('.token-copy')) {
  btn.addEventListener('click', async () => {
    const code = btn.parentElement.querySelector('code');
    try {
      await navigator.clipboard.writeText(code.textContent);
      btn.textContent = t('copied');
    } catch {
      getSelection().selectAllChildren(code);
      btn.textContent = t('selected');
    }
    setTimeout(() => { btn.textContent = t('copy'); }, 2000);
  });
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
// The page stays hidden (the head's i18n-wait) until its language is in
loadLang(lang)
  .then(next => { dict = next; }, () => { lang = 'en'; })
  .finally(() => { applyLang(); root.classList.remove('i18n-wait'); });
addEventListener('online', init);
init();
