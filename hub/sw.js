// Network-first cache for the hub shell, the catalog and the app icons, so
// the hub still opens when the car has a weak or no connection. A page that
// doesn't arrive within a few seconds comes from the cache, and so do the
// files it loads, so the shell and catalog stay from one version.
const CACHE = 'frunk-hub-v17';
const SHELL = ['/', '/hub.css', '/hub.js', '/i18n.js', '/catalog.json', '/icon.svg', '/brand/frunk-mark-on-dark.svg', '/fonts/unbounded-latin.woff2'];
const LANGS = ['zh-Hant', 'zh-Hans', 'de', 'nb', 'nl', 'ja', 'ko'];
const SLOW = 3000;        // ms to wait for the page before using the cached copy
const SLOW_FILE = 6000;   // the same for a file, once the page has come

// Pages shown from the cache: their files come from the cache first
const fromCache = new Set();

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(SHELL).then(() => Promise.race([Promise.all([icons(c), langs(c)]), new Promise(r => setTimeout(r, 10000))])))
    .then(() => self.skipWaiting()));
});

// The languages, as a first visit asks for its own before this worker runs,
// and the menu's others need the connection. Best effort too.
const langs = cache => Promise.allSettled(LANGS.map(code => cache.add(`/lang/${code}.json`)));

// The app icons too: on the first visit the grid asks for them before this
// worker runs, so they'd be missing offline until the next visit. Best
// effort, and given at most 10 seconds on a slow connection; the hub works
// without them.
async function icons(cache) {
  try {
    const catalog = await (await cache.match('/catalog.json')).json();
    // the dev server serves apps on the next port, as hub.js works out
    const origin = self.location.hostname === 'localhost' ? `http://127.0.0.1:${Number(self.location.port) + 1}` : catalog.appsOrigin;
    await Promise.all([...new Set(catalog.apps.map(app => app.icon))].map(async icon => {
      const url = origin + icon;
      if (await cache.match(url)) return;
      const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (res.ok) await cache.put(url, res);
    }));
  } catch {}
}

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

// The icons live on the apps origin. The page asks for them without CORS, but
// under the hub's COEP Chrome won't read an opaque copy back from the cache,
// so the worker asks with CORS (apps/vercel.json allows it for icons).
const isIcon = (req, url) => req.destination === 'image' && url.pathname.endsWith('/icon.svg');

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || (url.origin !== self.location.origin && !isIcon(req, url))) return;
  e.respondWith(respond(e, req));
});

async function respond(e, req) {
  const cache = await caches.open(CACHE).catch(() => null);
  if (!cache) return fetch(req);   // storage trouble shouldn't take the hub down
  const page = req.mode === 'navigate';
  // /app/x is the same file as / (vercel.json), so it's kept once: its own copy
  // would go stale, and be shown with newer files. Other paths fall back on it.
  const path = new URL(req.url).pathname;
  const key = page && (path === '/' || path.startsWith('/app/')) ? '/' : req;
  const cached = cache.match(key).then(hit => hit || (page ? cache.match('/') : undefined)).catch(() => undefined);
  if (!page && fromCache.has(e.clientId)) {
    const hit = await cached;
    if (hit) return hit;
  }

  let saved = Promise.resolve();
  const icon = new URL(req.url).origin !== self.location.origin;
  const network = (icon ? fetch(req.url, { mode: 'cors', credentials: 'omit' }).catch(() => fetch(req)) : fetch(req)).then(res => {
    if (res.ok) saved = cache.put(key, res.clone());
    return res;
  });
  e.waitUntil(network.then(() => saved).catch(() => {}));

  const hit = await cached;
  if (!hit) return network;
  return new Promise(resolve => {
    const useCache = () => {
      if (fromCache.size > 50) fromCache.clear();
      const client = page ? e.resultingClientId : e.clientId;
      if (client) fromCache.add(client);
      resolve(hit);
    };
    const timer = setTimeout(useCache, page ? SLOW : SLOW_FILE);
    network.then(res => { clearTimeout(timer); resolve(res); }, () => { clearTimeout(timer); useCache(); });
  });
}
