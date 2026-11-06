// Network-first cache for app files. Fresh code when online, last good copy
// when offline. Only same-origin GET requests are handled, and never /api/:
// those answers are live, and phone transfers must not linger in a cache.
//
// A weak connection (a campsite, a parking garage) can keep a request
// waiting for a long time before it fails. So when an app's page doesn't
// arrive within a few seconds, the cached copy is shown, and the files that
// page loads come from the cache too, keeping its code all from one version.
// A file that stalls after its page came does the same, a little later.
const CACHE = 'frunk-apps-v2';
const SLOW = 3000;        // ms to wait for a page before using the cached copy
const SLOW_FILE = 6000;   // the same for a file: a stall, as the time ends when its headers come

// Big downloads the apps keep in IndexedDB themselves (Freedoom's and
// Blasphemer's WADs, Adventure Games' free games, LibreQuake's paks and music,
// OpenTTD's base sets, OpenArena's pk3s, SuperTux's, Command & Conquer's and
// The Elder Scrolls', Death Rally's, Wolfenstein 3D's and Commander Keen's data blocks, Duke
// Nukem 3D's and the DOS games' shareware zips; and the
// engine sources, rarely fetched). A second copy here would only fill storage.
const SKIP = /^\/(cnc\/(data\/(td|ra)\/[0-9a-f]{12}\/\d+\.bin(\.gz)?|engine\/[^/]+\.tar\.gz)|elderscrolls\/(data\/(arena|daggerfall)\/[0-9a-f]{12}\/\d+\.bin(\.gz)?|engine\/[^/]+\.tar\.gz)|(deathrally|wolf3d|keen1|keen4|cosmo|hocus|rott|blake|duke2)\/(data\/([0-9a-f]{12}\/\d+\.bin(\.gz)?|[^/]+\.zip)|engine\/[^/]+\.tar\.gz)|doom\/freedoom\/[^/]+\.wad\.gz|heretic\/blasphemer\/[^/]+\.wad\.gz|adventure\/games\/[^/]+\.zip|quake\/librequake\/([^/]+\.pak\.gz|music\/[^/]+\.ogg)|duke3d\/(shareware\/[^/]+\.zip|engine\/[^/]+\.tar\.gz)|openttd\/data\/[^/]+\.tar\.gz|openarena\/data\/[^/]+\.pk3|supertux\/data\/[0-9a-f]{12}\/\d+\.bin(\.gz)?|(stockfish|neverputt|neverball)\/engine\/[^/]+\.tar\.gz)$/;

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

// An app opened with no connection and no copy here. In place of the browser's
// error page, which looks broken and has no way to try again. The headers are
// the ones vercel.json gives every page: the hub's frame won't show one without.
function offlinePage() {
  return new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>No connection</title>
<style>
  html, body { height: 100%; margin: 0; background: #0b0d10; color: #eef1f5; font: 17px/1.45 system-ui, sans-serif; }
  body { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 64px 24px 24px; box-sizing: border-box; text-align: center; }
  h1 { margin: 0; font-size: 24px; } p { margin: 0; max-width: 28em; color: #8d96a5; }
  button { min-height: 48px; margin-top: 8px; padding: 10px 22px; border: 0; border-radius: 12px; background: #ffb547; color: #111418; font: inherit; font-weight: 700; }
</style></head><body>
<h1>No connection</h1>
<p>This app isn't saved on this browser yet, so it needs the internet the first time. It opens by itself when the connection comes back.</p>
<button type="button" onclick="location.reload()">Try again</button>
<script>addEventListener('online', () => location.reload());</script>
</body></html>`, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  });
}

async function respond(e, req) {
  const cache = await caches.open(CACHE).catch(() => null);
  if (!cache) return fetch(req);   // storage trouble shouldn't take the apps down
  const cached = cache.match(req).catch(() => undefined);
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

  const hit = await cached;
  if (!hit) return page ? network.catch(offlinePage) : network;
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
