// Network-first cache for the hub shell and catalog, so the hub still opens
// when the car has a weak or no connection.
const CACHE = 'frunk-hub-v8';
const SHELL = ['/', '/hub.css', '/hub.js', '/catalog.json', '/icon.svg', '/brand/frunk-mark-on-dark.svg', '/fonts/unbounded-latin.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      // Deep links like /?app=x fall back to the cached shell
      const hit = await cache.match(req) || (req.mode === 'navigate' && await cache.match('/'));
      if (hit) return hit;
      throw err;
    }
  })());
});
