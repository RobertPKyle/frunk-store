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
// Blasphemer's WADs, Adventure Games' free games, LibreQuake's paks and music,
// OpenTTD's base sets, OpenArena's pk3s, SuperTux's and Command & Conquer's
// data blocks, Duke Nukem 3D's shareware zip; and the engine sources, rarely
// fetched). A second copy here would only fill storage.
const SKIP = /^\/(cnc\/(data\/(td|ra)\/[0-9a-f]{12}\/\d+\.bin(\.gz)?|engine\/[^/]+\.tar\.gz)|doom\/freedoom\/[^/]+\.wad\.gz|heretic\/blasphemer\/[^/]+\.wad\.gz|adventure\/games\/[^/]+\.zip|quake\/librequake\/([^/]+\.pak\.gz|music\/[^/]+\.ogg)|duke3d\/(shareware\/[^/]+\.zip|engine\/[^/]+\.tar\.gz)|openttd\/data\/[^/]+\.tar\.gz|openarena\/data\/[^/]+\.pk3|supertux\/data\/[0-9a-f]{12}\/\d+\.bin(\.gz)?)$/;

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

// The files a page loaded before this worker ran (sw-register.js sends
// them on the first visit), fetched into the cache unless they're there
self.addEventListener('message', e => {
  if (e.data?.frunk !== 'cache' || !Array.isArray(e.data.urls)) return;
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const href of e.data.urls.slice(0, 200)) {
      const url = new URL(href, self.location.origin);
      url.hash = '';
      if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || SKIP.test(url.pathname)) continue;
      if (await cache.match(url.href)) continue;
      try {
        const res = await fetch(url.href);
        if (res.status === 200 && !res.redirected) await cache.put(url.href, res);   // a page may not be answered with a redirect
      } catch {}
    }
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || SKIP.test(url.pathname)) return;
  e.respondWith(respond(e, req));
});

// With a copy here, the server is asked whether the file changed since
// (If-None-Match), rather than going through the browser's own HTTP cache,
// which may have let go of a big engine this cache still holds: unchanged
// costs one round trip instead of the whole download again. Pages and range
// requests go as they are.
async function ask(req, cached) {
  const old = await cached;
  const tag = old?.headers.get('ETag');
  if (!tag || req.mode === 'navigate' || req.headers.has('Range')) return fetch(req);
  const headers = new Headers(req.headers);
  headers.set('If-None-Match', tag);
  // no-cors requests may only carry the simplest headers; these are all this origin's own files
  const res = await fetch(new Request(req, { mode: req.mode === 'no-cors' ? 'same-origin' : req.mode, headers }));
  return res.status === 304 ? old : res;
}

async function respond(e, req) {
  const cache = await caches.open(CACHE);
  const cached = cache.match(req);
  const page = req.mode === 'navigate';
  if (!page && fromCache.has(e.clientId)) {
    const hit = await cached;
    if (hit) return hit;
  }

  let saved = Promise.resolve();
  const network = ask(req, cached).then(async res => {
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
