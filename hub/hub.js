// Hub: lists apps from catalog.json and runs each one full screen in a
// sandboxed iframe on a separate origin, so an app cannot touch the hub's
// storage or navigate the top page.

const grid = document.getElementById('grid');
const runner = document.getElementById('runner');
const frame = document.getElementById('frame');
const loading = document.getElementById('loading');

let catalog;
let appsOrigin;
let pushedHistory = false; // true when the open app added a history entry

// Local dev (tools/dev.mjs) serves apps on the next port. 127.0.0.1 is a
// different site from localhost, which mirrors production isolation.
function resolveAppsOrigin(configured) {
  if (location.hostname === 'localhost') return `http://127.0.0.1:${Number(location.port) + 1}`;
  return configured;
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}

function renderGrid() {
  grid.replaceChildren(...catalog.apps.map(app => {
    const card = el('button', { class: 'card', type: 'button' },
      el('img', { src: appsOrigin + app.icon, alt: '', width: 64, height: 64 }),
      el('h2', {}, app.name),
      el('p', {}, app.tagline),
      el('div', { class: 'tags' }, ...app.tags.map(t => el('span', { class: 'tag' }, t))),
    );
    card.addEventListener('click', () => openApp(app.id, { push: true }));
    return card;
  }));
}

function openApp(id, { push }) {
  const app = catalog.apps.find(a => a.id === id);
  if (!app) return;
  if (push) {
    history.pushState({ app: id }, '', `/?app=${encodeURIComponent(id)}`);
    pushedHistory = true;
  }
  loading.hidden = false;
  frame.src = appsOrigin + app.path;
  runner.hidden = false;
  document.title = `${app.name} · frunk.store`;
}

function closeApp() {
  runner.hidden = true;
  frame.src = 'about:blank'; // unload the app so it stops using CPU and memory
  document.title = 'frunk.store';
}

frame.addEventListener('load', () => { loading.hidden = true; });

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
if (document.documentElement.requestFullscreen) {
  fsBtn.hidden = false;
  fsBtn.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => { fsBtn.textContent = 'Full screen blocked'; });
  });
  document.addEventListener('fullscreenchange', () => {
    fsBtn.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
  });
}

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
    err.textContent = `Could not load the app list (${e.message}). Check the connection and reload.`;
    return;
  }
  appsOrigin = resolveAppsOrigin(catalog.appsOrigin);
  renderGrid();

  const deepLink = new URLSearchParams(location.search).get('app');
  if (deepLink) {
    history.replaceState({ app: deepLink }, '', location.href);
    openApp(deepLink, { push: false });
  }
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
init();
