// Network-first cache for the hub shell, the catalog and the app icons, so
// the hub still opens when the car has a weak or no connection. A page that
// doesn't arrive within a few seconds comes from the cache, and so do the
// files it loads, so the shell and catalog stay from one version.
const CACHE = 'frunk-hub-v13';
const SHELL = ['/', '/hub.css', '/hub.js', '/catalog.json', '/icon.svg', '/brand/frunk-mark-on-dark.svg', '/fonts/unbounded-latin.woff2'];
const SLOW = 3000;   // ms to wait for the page before using the cached copy

// Pages shown from the cache: their files come from the cache first
const fromCache = new Set();

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

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
  const cache = await caches.open(CACHE);
  const page = req.mode === 'navigate';
  // Deep links like /app/x fall back to the cached shell
  const cached = cache.match(req).then(hit => hit || (page ? cache.match('/') : undefined)).catch(() => undefined);
  if (!page && fromCache.has(e.clientId)) {
    const hit = await cached;
    if (hit) return hit;
  }

  let saved = Promise.resolve();
  const icon = new URL(req.url).origin !== self.location.origin;
  const network = (icon ? fetch(req.url, { mode: 'cors', credentials: 'omit' }).catch(() => fetch(req)) : fetch(req)).then(res => {
    if (res.ok) saved = cache.put(req, res.clone());
    return res;
  });
  e.waitUntil(network.then(() => saved).catch(() => {}));

  if (!page) return network.catch(async err => (await cached) || Promise.reject(err));

  const hit = await cached;
  if (!hit) return network;
  return new Promise(resolve => {
    const useCache = () => {
      if (fromCache.size > 50) fromCache.clear();
      if (e.resultingClientId) fromCache.add(e.resultingClientId);
      resolve(hit);
    };
    const timer = setTimeout(useCache, SLOW);
    network.then(res => { clearTimeout(timer); resolve(res); }, () => { clearTimeout(timer); useCache(); });
  });
}
