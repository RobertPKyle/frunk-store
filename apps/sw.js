// Network-first cache for app files. Fresh code when online, last good copy
// when offline. Only same-origin GET requests are handled, and never /api/:
// those answers are live, and phone transfers must not linger in a cache.
//
// A weak connection (a campsite, a parking garage) can keep a request
// waiting for a long time before it fails. So when an app's page doesn't
// arrive within a few seconds, the cached copy is shown, and the files that
// page loads come from the cache too, keeping its code all from one version.
const CACHE = 'frunk-apps-v2';
const SLOW = 3000;   // ms to wait for a page before using the cached copy

// Big downloads the apps keep in IndexedDB themselves (Freedoom's and
// Blasphemer's WADs, Adventure Games' free games, LibreQuake's paks and music). A second copy
// here would only fill storage.
const SKIP = /^\/(doom\/freedoom\/[^/]+\.wad\.gz|heretic\/blasphemer\/[^/]+\.wad\.gz|adventure\/games\/[^/]+\.zip|quake\/librequake\/([^/]+\.pak\.gz|music\/[^/]+\.ogg))$/;

// Pages shown from the cache: their files come from the cache first. Lost
// when the worker stops, which only means going back to network-first.
const fromCache = new Set();

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // v1 cached /api/transfer downloads; drop it
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    // copies of the big downloads made before they were skipped
    const cache = await caches.open(CACHE);
    for (const req of await cache.keys()) if (SKIP.test(new URL(req.url).pathname)) await cache.delete(req);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || SKIP.test(url.pathname)) return;
  e.respondWith(respond(e, req));
});

async function respond(e, req) {
  const cache = await caches.open(CACHE);
  const cached = cache.match(req);
  const page = req.mode === 'navigate';
  if (!page && fromCache.has(e.clientId)) {
    const hit = await cached;
    if (hit) return hit;
  }

  let saved = Promise.resolve();
  const network = fetch(req).then(async res => {
    // Engines are tens of MB; skip writing them again when they haven't changed
    const tag = res.headers.get('ETag'), old = await cached;
    if (res.status === 200 && !(tag && old && old.headers.get('ETag') === tag)) saved = cache.put(req, res.clone());
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
