# frunk.store

A hub of web apps built for the Tesla in-car browser (Chromium). The minimum
hardware target is the Intel Atom (MCU2) infotainment unit, with a browser
viewport of about 773x601 CSS px.

## Layout

| Folder   | Vercel project | URL                           | What it is                         |
|----------|----------------|-------------------------------|------------------------------------|
| `hub/`   | `frunk-store`  | https://frunk.store           | Catalog page that launches apps    |
| `apps/`  | `frunk-apps`   | https://frunk-apps.vercel.app | App files, one folder per app      |
| `tools/` | -              | -                             | Dev server, WASM build, e2e checks |

The hub runs each app in a sandboxed iframe on the apps origin, so apps cannot
read the hub's storage or navigate the top page. Both origins send COOP/COEP
headers, so apps are cross-origin isolated and can use `SharedArrayBuffer` and
threaded WebAssembly. The apps origin also sends CORP `cross-origin` and a CSP
`frame-ancestors` rule that allows only the hub to embed it.

The app list lives in `hub/catalog.json`. `appsOrigin` in that file sets where
the apps are served from.

## Sample apps

- `apps/breakout`: WebGL2 game with touch, keyboard, and gamepad input.
- `apps/fractal`: Mandelbrot explorer in hand-written WebAssembly
  (`fractal.wat`, f64x2 SIMD). It renders on a pool of workers that share one
  memory, and falls back to the main thread when the page is not isolated.
- `apps/probe`: browser capability probe and benchmark.
- `apps/sleep`, `apps/fireplace`, `apps/stars`: Camp Mode apps (Sleep Sounds,
  Campfire, Star Map). Sounds come from `apps/_shared/ambient.js`, which
  generates everything with Web Audio. Star data is built by
  `node tools/build-stars.mjs` from d3-celestial (BSD-3-Clause), and the
  planet and Moon math in `apps/_shared/astro.js` was checked against JPL
  Horizons to within about 0.1°.
- `apps/weather`: Open-Meteo forecast plus a "Tonight's sky" card (sunset,
  darkness, Moon, stargazing rating, aurora chance from the NOAA Kp
  forecast). Needs a connection; the last forecast is cached.
- `apps/satellites`: visible passes of the ISS, Tiangong, Hubble, new
  Starlink trains and about 150 bright satellites, from CelesTrak orbit data
  (cached, refreshed at most every 8 hours). SGP4 comes from satellite.js
  (MIT), bundled into `apps/satellites/satellite.js` by
  `node tools/build-satellite.mjs`. Pass times matched Skyfield to within
  about 10 seconds.
- `apps/skyevents`: Sky Events. Moon phases, named and super full moons,
  lunar eclipses, meteor shower peaks rated for the viewer's latitude and
  moonlight, planet oppositions, elongations and pairings, equinoxes and
  solstices, all computed in `apps/skyevents/events.js`. Solar eclipses come
  from NASA's table (Espenak) through 2035. Checked against Skyfield and
  NASA: phases within 3 minutes, seasons within 6, lunar eclipse times within
  about a minute and umbral magnitudes within 0.02.
- `apps/nearby`: What's Around Me. Wikipedia articles near the car (geosearch
  API, up to 20 km), on a north-up map and a list, with an in-app reader.
  Article text is shown as plain text only. The last 15 articles read are
  cached for offline use.
- `apps/speedtest`: Speed Test. Download, upload, ping, jitter and ping under
  load, measured against Cloudflare's public speed test servers
  (speed.cloudflare.com). Each direction runs for a fixed time on several
  connections and reports the average after a 2 second warm-up. Data use is
  capped at about 350 MB per test. The last 30 results are kept on the device.
- `apps/chess`: the Lichess daily chess puzzle, playable on the board. Tap a
  piece, then a highlighted square; the opponent's reply is played
  automatically and only the best move is accepted. The last puzzle is cached
  for offline use. Rules come from chess.js (BSD-2-Clause); the piece art is
  the cburnett set (CC BY-SA 3.0).
- `apps/_shared/place.js`: the location picker. Star Map, Weather,
  Satellites, Sky Events and What's Around Me share one saved place (`frunk.place` in
  localStorage).

## Commands

```sh
npm install
npm run build:wasm                      # after editing apps/fractal/fractal.wat
npm run dev                             # hub on localhost:5173, apps on 127.0.0.1:5174
npm run test:e2e                        # checks against the dev server
node tools/e2e.mjs https://frunk.store  # checks against production

# deploy (each folder is linked to its own Vercel project)
(cd apps && vercel deploy --prod)
(cd hub && vercel deploy --prod)
```

Deploy `apps` before `hub` when a hub change depends on a new app.
