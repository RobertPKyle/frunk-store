# frunk.store

A hub of web apps built for the Tesla in-car browser (Chromium). The minimum
hardware target is the Intel Atom (MCU2) infotainment unit, with a browser
viewport of about 773x601 CSS px.

## Layout

| Folder   | Vercel project | URL                           | What it is                         |
|----------|----------------|-------------------------------|------------------------------------|
| `hub/`   | `frunk-store`  | https://frunk.store           | Catalog page that launches apps    |
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
- `apps/pitstop` and `apps/api/places.js`: Pit Stop. Restrooms, coffee,
  food, shops and parks within walking distance (up to 2 km), from
  OpenStreetMap (ODbL), with open-now status from `opening_hours`
  (`apps/pitstop/hours.js` reads the common forms and shows anything else as
  written) and a QR code for walking directions on a phone. The browser can't
  query Overpass directly (the main server turns away requests without a
  descriptive User-Agent), so the function asks on its behalf, trying
  overpass-api.de and then two mirrors with staggered starts. The app snaps
  the location to a 0.005° grid and the function rejects anything else, so
  Vercel's CDN caches each spot for a day. Uncached queries are limited to 40
  per IP per hour and 3000 a day overall. The last 6 spots are kept on the
  device for offline use.
- `apps/speedtest`: Speed Test. Download, upload, ping, jitter and ping under
  load, measured against Cloudflare's public speed test servers
  (speed.cloudflare.com). Each direction runs for a fixed time on several
  connections and reports the average after a 2 second warm-up. Data use is
  capped at about 350 MB per test. The last 30 results are kept on the device.
- `apps/retro`: Retro Console. NES games run on jsnes 2.1.0 (Apache-2.0,
  `nes.js`), in a worker (`nes-worker.js`) that draws through an
  OffscreenCanvas and sends sound straight to an AudioWorklet, so the
  page's main thread stays free (about 5 ms of it a second on a desktop,
  down from 90); Game Boy, Game Boy Color and Game Boy Advance games run on mGBA
  2.5.1 compiled to WebAssembly (MPL-2.0, `gba.js`, threaded, so it needs the
  COOP/COEP headers); both are vendored unmodified. The console is picked
  from the file's header, and zipped games are unzipped in the browser
  (`apps/_shared/roms.js`). Every game keeps its battery save and a resume
  snapshot in IndexedDB (mGBA's files for Game Boy, database "nes" for NES),
  so it picks up where it left off; Reset starts over and keeps the battery
  save. Snapshots are taken on pause, when the page is hidden, and when the
  hub closes the app: the hub posts `{ frunk: 'close' }` to apps that
  announced `{ frunk: 'save-on-close' }`, and waits up to a second for
  `{ frunk: 'closed' }`. With a controller in use, the on-screen buttons
  hide and the game gets their room. mGBA's per-frame callback is not used: it makes the emulator thread
  wait for the page's main thread on every frame, which dropped frames when
  the CPU was slowed to car speed. mGBA resamples sound on the main thread,
  so its AudioContext runs at the consoles' own 32768 Hz (a third less work
  than 48000) with a 2048-sample buffer (62 ms; the default 21 ms crackled
  in the car). When the browser can't refresh the
  screen about 60 times a second for 3 seconds (often the case in the car),
  steady mode draws every other refresh (the NES worker measures its own
  refreshes, which keep going when the main thread is slow), so frame rates stop bouncing; games
  keep full speed. Tapping the frame rate shows the refresh rate and whether
  steady mode is on. SNES support (LakeSnes) was removed on 2026-10-15
  because it ran at about 15 fps in the car; it is in git history (commit
  3dfae87). Ships only homebrew games whose licenses allow redistribution
  (Attack on Voxelburg by John Tsiombikas, Thwaite and Concentration Room by
  Damian Yerrick, GPL; Libbet and the Magic Floor by Damian Yerrick, zlib;
  Tobu Tobu Girl Deluxe by Tangram Games, MIT and CC BY 4.0), with their
  source next to them; see `apps/retro/NOTICE`.
  Players add games they own with "Get games from phone" (or from files on a
  computer); those are stored in the screen's IndexedDB only. A one-time
  confirmation asks players to load only games they legally own. Never add
  commercial ROMs to this repo or the site.
- `apps/doom`: Freedoom. The Doom engine Crispy Doom 7.2 (GPL-2.0-or-later)
  compiled to WebAssembly by `npm run build:doom` (`tools/build-doom.mjs`:
  the crispy-doom-7.2 tag plus `tools/doom/crispy-web.patch`, Emscripten
  4.0.10 in Docker; the patched source ships next to the engine in
  `apps/doom/engine/`). The same script fetches Freedoom 0.13.0 (BSD-3-Clause),
  checks the release's SHA-256 and gzips both IWADs (29 MB to about 10 MB;
  they're not in git, so run it before deploying `apps`);
  the page downloads one the first time it's played, unpacks it with
  `DecompressionStream` and keeps it in IndexedDB. Players add Doom IWADs
  they own (doom.wad, doom2.wad, tnt.wad, plutonia.wad...) from their phone
  or from files; add-ons (PWADs) aren't supported yet. The patch makes the
  game loop run on `requestAnimationFrame`, calls the one-argument monster
  actions with one argument (WebAssembly traps on Doom's mismatched
  function-pointer calls, which crashed the first demo), and adds `web_*`
  calls for the page: one gamepad state per frame (controllers and the
  on-screen stick and buttons are merged in `doom.js`; the car's two copies
  of each controller are handled as in Retro Console), autosave to slot 77,
  settings, frame count and game state. Settings and saves live in the
  engine's `/doom` folder, kept in IndexedDB (IDBFS), with a save folder per
  WAD; leaving the app (hidden page or the hub's close handshake) saves the
  game, and Continue loads it with `-loadgame 77`. Defaults: classic
  320x200 at 4:3, frames interpolated on every refresh, always run, sound
  at 44100 Hz in 46 ms slices. Measured with the CPU slowed 4.5x: drawing a
  frame takes about 3 ms (6 ms at Crispy's 640x400), and the OPL music synth
  is the biggest cost, about 100 ms per second. The engine can't restart
  within a page, so leaving a game reloads the page. Not yet tried in the
  car.
- `apps/adventure`: Adventure Games. ScummVM 2026.4.0 (GPL-3.0-or-later)
  compiled to WebAssembly by `npm run build:scummvm`
  (`tools/build-scummvm.mjs`: the v2026.4.0 tag plus
  `tools/scummvm/scummvm-web.patch`, Emscripten 4.0.10 in Docker with
  pkg-config added by `tools/scummvm/Dockerfile`, libmad for MP3). One
  static build with 23 engines (the free games' plus LucasArts SCUMM and
  Humongous, Sierra AGI and SCI, Revolution, Westwood, Coktel, Adventure
  Soft and others); 31 MB of wasm, about 9 MB compressed. Static rather
  than ScummVM's plugin build: the same speed, but one file the browser
  caches compiled, against side modules compiled on every start. The script
  also copies the engine data (themes, engine tables) to `data/` with the
  `index.json` ScummVM's web file system reads, and fetches seven freeware
  games from downloads.scummvm.org, checked against SHA-256, unmodified into
  `games/` (Beneath a Steel Sky and Flight of the Amazon Queen floppy
  versions, Lure of the Temptress, Drascula with its music pack, Sołtys,
  Sfinx, Nippon Safes; each zip carries its license, which allows free
  distribution). The wasm and the games aren't in git, so run it before
  deploying `apps`. The GPL source offer points at ScummVM's tag plus the
  patch (copied next to the engine) and this repo, under GPLv3 section
  6(d); `apps/adventure/NOTICE` has the details. Games are unzipped in the
  browser, kept in IndexedDB (database `adventure`) and written to the
  engine's memory file system before it starts, then ScummVM is run with
  `--path=... --auto-detect`. Players send a game as a .zip of its folder,
  or its files all at once (loose files sent together become one game when
  the phone panel's Done is tapped). ScummVM's settings
  (`apps/adventure/scummvm.ini` is the default: autosave every 2 minutes,
  subtitles, 2048-sample sound buffer, its own joystick handling off) and
  saves live in `/home/web_user`, which ScummVM keeps in IndexedDB itself.
  The patch adds `web_request_save`, `web_saves_done` and `web_last_save`
  (an autosave from the event loop, never over the player's own save in the
  autosave slot), calls `Module.onLauncher` where ScummVM would show its
  launcher (the game ended, or nothing was recognised), reads data files
  next to the page, drops the Web MIDI permission prompt, and works around
  SDL 3.2.4 adding its keyboard listeners again every time ScummVM recreates
  its window (each key arrived six times). Touch is ScummVM's own (tap
  clicks, a second finger right-clicks); the page adds a Right-click mode
  that holds the right button while the finger is down (Lure's action menu
  needs that), Skip (Esc), Menu (Ctrl+F5), Type (a hidden input brings up
  the car's keyboard; what's typed is sent as key events, held across
  frames because ScummVM reads modifiers late), and a controller-driven
  pointer. The page asks for an autosave every minute, when it's hidden and
  when the player leaves with Games; the hub's close handshake is tried as
  well, but it can't be counted on here: the hub's Apps button goes back in
  history, which stops the app frame's timers, and the save runs in
  ScummVM's loop, which needs them (Freedoom saves synchronously, so it
  doesn't mind). Like Freedoom, leaving a game reloads the page. Measured with
  the CPU slowed 4.5x: about 50 ms of script per second during Beneath a
  Steel Sky's intro. Not yet tried in the car.
- `apps/send` and `apps/api/transfer.js`: "Get games from phone", for Retro
  Console, Freedoom and Adventure Games (the car side is
  `apps/_shared/phone.js`; Freedoom adds `?app=doom` so the phone page
  checks for WADs, Adventure Games `?app=adventure`). The car
  opens a session and shows a QR code with the session id and an AES-GCM key
  in the URL fragment, which never reaches the server. The phone page
  encrypts each game before upload; the function relays ciphertext through
  Upstash Redis (Vercel Marketplace, free plan, env `KV_REST_API_URL` and
  `KV_REST_API_TOKEN`) for at most 15 minutes and deletes each file when the
  car takes it. Games over 2 MB are split into 2 MB pieces on the phone and
  joined on the car. Limits: 2 MB per piece, 200 pieces and 80 MB per
  session, rate limits per IP. `npm run dev` serves `/api/*` locally with an in-memory store.
- `apps/chess`: the Lichess daily chess puzzle, playable on the board. Tap a
  piece, then a highlighted square; the opponent's reply is played
  automatically and only the best move is accepted. The last puzzle is cached
  for offline use. Rules come from chess.js (BSD-2-Clause); the piece art is
  the cburnett set (CC BY-SA 3.0).
- `apps/terrarium`: Terrarium, by Jason Goldfeder (jasongoldfeder.com). An
  artificial-life aquarium on Canvas 2D whose fish carry genomes, breed and
  evolve. It saves to localStorage and, when reopened, catches up on the time
  it was away. Ported from https://github.com/jasongold/tesla-demo, where it
  lives at `games/terrarium/`; the shared helpers it needs are copied into
  `apps/terrarium/engine/`.
- `apps/_shared/place.js`: the location picker. Star Map, Weather,
  Satellites, Sky Events, What's Around Me and Pit Stop share one saved place
  (`frunk.place` in localStorage).

## Commands

```sh
npm install
npm run build:wasm                      # after editing apps/fractal/fractal.wat
npm run build:doom                      # Doom engine + Freedoom (needs Docker); run before deploying apps
npm run build:scummvm                   # ScummVM engine + free adventures (needs Docker); run before deploying apps
npm run dev                             # hub on localhost:5173, apps on 127.0.0.1:5174
npm run test:e2e                        # checks against the dev server
node tools/e2e.mjs https://frunk.store  # checks against production

# deploy (each folder is linked to its own Vercel project)
(cd apps && vercel deploy --prod)
(cd hub && vercel deploy --prod)
```

Deploy `apps` before `hub` when a hub change depends on a new app.
