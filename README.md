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
the apps are served from. The hub shows the last three apps opened in place of
its lede, and chips that filter the grid by tag (Game, Camp Mode, Road Trip,
Tool); both are kept in the hub's localStorage, along with whether full
screen was on, so the next tap on an app turns it back on.

An app's catalog entry can carry `"added"` or `"updated"` with a date
(`YYYY-MM-DD`). For 14 days after it, the app's card shows a New or Updated
badge, until it's opened after that date. Set `added` on a new app and
`updated` when an app gains something worth a second look (new games, a new
console). While an app tagged Game is open, the hub keeps the screen on with
a wake lock, since play with a controller never touches the screen.

The hub's own text comes in English, Traditional and Simplified Chinese,
German, Norwegian, Dutch, Japanese and Korean (the apps stay in English). The
language button in the header switches it; until someone picks one, the hub
follows the browser's language. English is written once, in `hub/index.html`
(elements marked `data-i18n`) and `hub/i18n.js`; each other language is one
file in `hub/lang/` with the page text, tag names and app names and taglines
by app id. To add a language, add its file, then its code to `LANGS` in
`hub/i18n.js` and to the list in the inline script in `index.html`'s head.
The e2e check "every language has every string" fails on a missing string,
app or tag, or on a string whose links or markup differ from the English.

Both origins have a network-first service worker (`hub/sw.js`, `apps/sw.js`;
the hub's also keeps the app icons). When a page doesn't arrive within 3
seconds, as on a weak connection, the cached copy is shown and the files that
page loads come from the cache too, so its code stays from one version.
Freedoom's and Blasphemer's WADs, Adventure Games' free games,
LibreQuake's paks and music, OpenTTD's base sets and OpenArena's pk3s are left out, because those apps keep them in IndexedDB, and an unchanged file (same ETag) isn't written
to the cache again.

The apps' worker asks the server about a file it already holds with that
ETag (`If-None-Match`), so an unchanged engine costs a 304 even after
Chrome's own HTTP cache has dropped it. On a browser's very first visit the
page loads before the worker runs; `apps/sw-register.js` then hands the
worker the files the page loaded, so even the first app opened works offline
afterwards. `npm run dev` answers with ETags, 304s and byte ranges as Vercel
does.

Engines big enough to look stuck while they download (Adventure Games,
Arcade, OpenTTD) load their wasm through `apps/_shared/engine.js`, which
counts what has arrived and shows it ("Loading the arcade… 12 of 39 MB").
Vercel sends the wasm compressed and without its length, so a one-byte range
request asks for the real size.

Apps that keep a player's own files (games sent from the phone, carts,
worlds) ask for persistent storage when one is added, so the browser doesn't
clear them to make room.

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
- `apps/tic80`: Tiny Games. TIC-80 1.3.1's official web players (MIT), one
  per cart language, and nine freely licensed games (MIT or GPL-3, listed
  with their sources in the app), all built by `node tools/build-tic80.mjs`
  (needs gcc and Chrome; outputs are not committed). Games kept as text
  projects are turned into carts with TIC-80's own prj2cart, compiled
  without the script engines (`tools/tic80/prj2cart-langs.c`); its output
  matched TIC-80's prebuilt demo carts byte for byte. Covers are the cart's
  saved screen, or the game's screen a few seconds in. `cart.js` reads a
  cart's language, title and cover; `play.html` runs one game in a frame
  of its own, serves added carts from IndexedDB, shows the player only
  standard-layout controllers (the car doubles each one), and turns the
  player's CRT effect off unless the app's setting asks for it, by writing
  its options file into the player's own IndexedDB before it starts. Carts
  come from the phone (`/send/?app=tic80`) or a USB drive.
- `apps/brain` and `apps/api/brain.js`: Brain Test ("Can your Tesla brain?").
  A 20-second benchmark: a mixed JavaScript kernel on one core and on every
  core (`worker.js`), then a ray-marched brain drawn at a fixed 480x270 as
  many times as the GPU can (`gpu.js`). Points and leaderboard groups come
  from `score.js`, which the server uses too. A car is told apart by its
  graphics chip (Intel HD Graphics 505 in MCU2, AMD in MCU3) and only counts
  as a Tesla once its owner picks a model. The server keeps a histogram per
  group in Redis, shows each group's median and returns the result's
  percentile; results are kept a year for the share page
  (`share.html`), which a QR code opens on the phone. It draws a score card
  for the share sheet, to save, or with a post on X. The point constants in
  `score.js` are estimates until a car has run the test; changing them
  needs a `VERSION` bump, which starts the board over.
- `apps/retro`: Retro Console. NES games run on jsnes 2.1.0 (Apache-2.0,
  `nes.js`), in a worker (`nes-worker.js`) that draws through an
  OffscreenCanvas and sends sound straight to an AudioWorklet, so the
  page's main thread stays free (about 5 ms of it a second on a desktop,
  down from 90); Game Boy, Game Boy Color and Game Boy Advance games run on mGBA
  2.5.1 compiled to WebAssembly (MPL-2.0, `gba.js`, threaded, so it needs the
  COOP/COEP headers); both are vendored unmodified. Master System, Game
  Gear and SG-1000 games run on Gearsystem 3.9.22 (GPL-3.0-or-later,
  unmodified) compiled to WebAssembly by `npm run build:sms`
  (`tools/build-gearsystem.mjs` with `tools/gearsystem/web.cpp`, in Docker;
  the output in `apps/retro/sms/` is committed, with its source as
  `gearsystem-web-src.tar.gz`). Atari Lynx games run the same way on
  Gearlynx 1.2.36 (GPL-3.0-or-later), built by `npm run build:lynx`
  (`tools/build-gearlynx.mjs` with `tools/gearlynx/web.cpp` and
  `tools/gearlynx/gearlynx-web.patch`; output and source in
  `apps/retro/lynx/`). The Lynx starts every cartridge from Atari's
  512-byte boot ROM, which isn't free to ship, so `web.cpp` loads a
  stand-in of its own: each routine is a write to the unused Mikey register
  $FD97, which the patch hands to C code that selects cartridge blocks and
  decrypts and runs the cartridge's loader, modeled on Handy's high-level
  boot ROM (K. Wilkins, zlib). The free Lynx games are TreeJumper (GPL-3,
  the cartridge from its repo) and Town Patrol (MIT code, 0x72's CC0 art),
  which `npm run build:townpatrol` compiles from source with cc65 and
  sprpck. PC Engine / TurboGrafx-16 HuCard games (in
  the holders edition only, see Holders below) run
  the same way on Geargrafx 1.8.4 (GPL-3.0-or-later, unmodified), built by
  `npm run build:pce` (`tools/build-geargrafx.mjs` with
  `tools/geargrafx/web.cpp`; output and source in `apps/retro/pce/`, with
  the bundled libraries' licenses in `THIRD-PARTY.txt`); CD games are left
  out, as they need Hudson's System Card. Mega Drive / Genesis cartridges
  (holders edition only, too) run on clownmdemu's emulation core
  (AGPL-3.0-or-later, unmodified, commit 88ef45a6), built by `npm run
  build:md` (`tools/build-clownmdemu.mjs` with `tools/clownmdemu/web.c`,
  which turns the core's palette-index lines into RGBA and mixes its FM and
  PSG sound into one 44100 Hz stream; output and source in
  `apps/retro/md/`). Genesis Plus GX and PicoDrive were ruled out: their
  licenses forbid use in a commercial activity, which a token-gated section
  is. clownmdemu has no EEPROM saves and no bank switching (so nothing over
  4 MB), and leaves out the Mega CD here. All four run in workers
  (`sms-worker.js`, `lynx-worker.js`, `pce-worker.js`, `md-worker.js`, sharing
  `gear-worker.js`) the way jsnes runs in its own (the page side is
  `worker-core.js`). The Nintendo 64 is switched off (2026-10-22, after
  two car tests at about a sixth of full speed): `OFF` in `retro.js` keeps
  its games from being added, listed or continued in either edition, and
  no text names it (it was tested in the holders edition as "Genesis, PC
  Engine & N64", commit ac6afec). Its code stays: Nintendo 64 cartridges run on n64js (MIT, pure JavaScript, commit
  1eb54aa, with `tools/n64js/patches/*.patch` applied), bundled by `npm run build:n64` (`tools/build-n64js.mjs` runs
  Bun's bundler through npx on n64js's sources plus `tools/n64js/web.js`,
  which stands in for n64js's own page and debugger, and
  `tools/n64js/shims.js`, stand-ins for the page globals it expects; output
  in `apps/retro/n64/`, committed). It runs in `n64-worker.js` like the other
  cores (it compiles the game's code to JavaScript and draws with WebGL 2 to
  the OffscreenCanvas). Its sound is resampled to the speaker's rate and
  paced by a shared count of the samples the AudioWorklet has taken (about
  50 ms queued, frames skipped past 100 ms, as n64js does with Web Audio).
  In-game saves go to IndexedDB ("n64"); there are no snapshots. When a
  frame takes longer than 20 ms, the worker runs one frame at a time, each
  straight after the last (not waiting for the screen's next refresh), so
  every frame worked out is shown; catching up three at a time showed only
  one in three, a picture every third of a second in the car. While the
  emulator is busy over 80% of the time, frames are overdue and WebGL
  drawing takes over a fifth of a drawn frame's time, up to two in three
  frames are worked out but not drawn (and not shown), and with sound off
  the game's audio tasks are skipped. Tapping the frame rate also shows how
  busy the emulator is, and how much of that is the game's code, its
  display lists, WebGL drawing and sound, the frames drawn and skipped, and
  the RSP tasks n64js can't do itself (their kind, and how much of the time
  its RSP emulator, which steps along with the game's code, was running
  them), measured only while shown. A first car test (2026-10-22) ran at
  about 10 fps (a sixth of full speed), 98% busy; the second, with the
  readout (Super Smash Bros.' menus), read 9 fps · 2 Hz · 97% busy · game
  89% · lists 4% · gl 2% · sound 0% · 2 drawn, 5 skipped · rsp 7: the
  game's code is the cost, so moving drawing to another thread would gain
  little. Today's free N64
  homebrew uses libdragon's boot code, which n64js doesn't boot, so there's
  no free N64 game; the e2e check played a tiny test cartridge made by
  `tools/n64-test-rom.mjs` (double-buffered display lists drawn by n64js's
  Fast3D emulation, controller, tone and EEPROM save; `n64TestRom({
  triangles: 9000 })` makes it heavy, and `work: { code, count }` runs a
  compiled MIPS function each frame; it now checks the holders edition
  turns that cartridge away). Dropping WebGL calls that change
  nothing was tried and saved under 10% of the drawing time, so it was left
  out. The patches (each with tests, run with n64js's own suite, `bun
  test`) speed up n64js for the car: its recompiler compiles single-precision
  ADD/SUB/MUL/DIV, NEG/ABS/MOV, compares and float/int conversions inline for
  the common case (round to nearest, no FPU exceptions enabled, ordinary
  numbers; anything else runs n64js's exact helpers, checked against them
  with random operands), and lone float, byte and halfword loads and stores
  inline with a cheap RAM guard (lone word accesses keep their helpers, which
  also serve MMIO polling); and its HLE display lists draw triangles from
  batches separated only by vertex loads, matrices and the like together (up
  to 512, `graphicsOptions.batchTriangles`, which web.js turns on). On a
  desktop, game-like float code compiled from C (skeletal animation, 64
  characters) took 33% of the time before and 9% after, with RDRAM identical
  after 300 frames; 9000 triangles a frame went from 43% drawing to 2%,
  pixel-identical. The second patch keeps the registers a compiled block
  uses (GPRs, singles, FCSR) in JavaScript locals, written through to n64js's
  arrays and read back after helpers, which V8 can hold in machine
  registers (checked with random programs run compiled and interpreted);
  with the CPU fully loaded, integer game logic ran about 20% faster and
  the animation code 13% (`count` takes integer rounds in bits 8 to 15 and
  animation passes from bit 16, see `tools/n64js/bench/work.c`). On
  the N64 the touch D-pad is an analog stick with a knob, and a second
  controller plays as player 2. Moving n64js off the page's main thread
  took the test cartridge's page load from 812 to 5 ms a second with the
  CPU slowed 4.5x. Gearsystem takes about 0.5 ms a frame on a desktop
  (2.2 ms with the CPU slowed 4.5x), Gearlynx 1.4 ms, Geargrafx 1.5 ms (6.7 ms slowed),
  clownmdemu 1.4 ms (7.7 ms slowed). The console is picked from the file's
  header (Sega's 8-bit consoles' and the PC Engine's by name, .sms, .gg, .sg
  or .pce, since SG-1000 games and HuCards carry no header; the "TMR SEGA"
  header settles Master System against Game Gear; Mega Drive games need
  "SEGA" at 0x100 and a .md, .gen, .bin or .smd name, and .smd copier dumps
  are unscrambled; Lynx games by their "LYNX" or homebrew "BS93" header, or
  a .lyx name for bare cartridges), and zipped games are unzipped in the browser
  (`apps/_shared/roms.js`). Every game keeps its battery save and a
  resume snapshot in IndexedDB (mGBA's files for Game Boy, databases "nes",
  "sms", "lynx", "pce" and "md" for the worker cores; a PC Engine game's battery save is
  its 2 KB of backup RAM, and a Mega Drive snapshot is about 1.1 MB, as the
  core's state includes the Mega CD's memory),
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
  Tobu Tobu Girl Deluxe by Tangram Games, MIT and CC BY 4.0; Waternet by
  Willems Davy and Sub Rescue by Haroldo de Oliveira Pinheiro, MIT; Cheril
  Perils Classic by the Mojon Twins, LGPL-3; Blox by David Shadoff, MIT), with their
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
- `apps/heretic`: Blasphemer. Crispy Heretic, the Heretic engine from the
  same Crispy Doom source, built by the same `npm run build:doom` with the
  same patch and the same `web_*` calls (Heretic's actions all take three
  arguments, so it needs no call fix), into `apps/heretic/engine/`. The
  script also fetches Blasphemer 0.1.8 (BSD-3-Clause, a free IWAD for the
  Heretic engine with five episodes and MIDI music), checks it and gzips it
  (20 MB to 7.7 MB, not in git). `heretic.js` is `doom.js` made over for
  Heretic: an inventory (‹ Item › on screen; left trigger, or Select held
  with L, R or the fire button, on a controller), fly buttons that show only
  while the Wings of Wrath are on (`web_state` +16), Heretic's 42-line status
  bar, `/heretic` saves with the autosave in slot 47 (last slot of the last
  save page; the patch lets `-loadgame` take any slot). Players add Heretic
  IWADs they own (heretic.wad, heretic1.wad), told apart from Doom ones by
  the BARBACK lump. For both engines the patch also opens Heretic's menu
  from the title with Fire or Use (as any key does in Doom), holds pad
  states back while a menu's `joywait` runs, and makes buttons act once per
  press in menus, so a tap no longer races through several menus. Measured
  with the CPU slowed 4.5x: 60 fps and about 220 ms of script per second.
  Not yet tried in the car.
- `apps/quake`: LibreQuake. The Quake engine Chocolate Quake 2.1.0 (GPL-3.0,
  a faithful port of Quake 1.09's software renderer) compiled to WebAssembly
  by `npm run build:quake` (`tools/build-quake.mjs`: the
  chocolate-quake-2.1.0 tag plus `tools/quake/chocolate-web.patch`, whose
  `web/build.sh` builds it with Emscripten 4.0.10 in Docker; the patched
  source ships next to the engine in `apps/quake/engine/`). The same script
  fetches LibreQuake 0.09-beta's lite release (art BSD-3-Clause, game code
  GPL-2.0; checked against its SHA-256), gzips its two paks (50 MB to about
  25 MB) and copies its music, licenses and the game code's QuakeC source
  to `apps/quake/librequake/`; the paks and music aren't in git, so run it
  before deploying `apps`. The page downloads the paks the first time and
  keeps them in IndexedDB (database `quake`), writes them to the engine's
  memory file system and starts the start map (`+map start`), or the
  autosave (`+load auto`) for Continue. Players add Quake files they own
  from their phone or from files: PAK0.PAK and PAK1.PAK, the mission packs'
  PAK0.PAK (Scourge of Armagon, `-hipnotic`; Dissolution of Eternity,
  `-rogue`) and trackNN.ogg music, told apart by what's in them
  (`quakePath` in `apps/_shared/roms.js`). The patch makes Quake run one
  frame per refresh; takes the page's controls through `web_pad` (walk,
  step, turn, look, fire, jump, weapons), `web_look` (a dragged finger, in
  degrees) and `web_key` (menus); saves from the page (`web_autosave`, as
  "auto"); hands music to the page (it plays the .ogg files, so the
  browser decodes them away from the game); leaves out sockets and
  full-screen modes, and doesn't take the mouse until the page asks (on a
  computer, clicking the game locks the pointer for mouse look). It also
  builds with `-fwrapv -fno-strict-aliasing -mno-nontrapping-fptoint` and a
  4 MB stack: with Emscripten's 64 KB default the edge renderer's span
  buffer overran it and the first frames hung or crashed. And it fixes an
  upstream bug that LibreQuake's long episode texts set off: saving copied
  strings into a 256-byte buffer. Saves and config.cfg (first written with
  always-run and the usual screen size) are copied from the game folder
  to IndexedDB when they change, every 10 seconds and on leaving; the game
  is saved as "auto" when the page is hidden, when the hub's close
  handshake asks (synchronously, like Freedoom) and when the player leaves
  with Games. On the screen: a stick to walk, a finger anywhere else (or on
  FIRE) to turn and look, FIRE, JUMP and weapon buttons, and an arrows pad
  with OK and Back in menus; a button held while the game switches to or
  from a menu does nothing more until it's let go. Controllers as in
  Freedoom (the car's two copies of each, D-pad-only pads turn with left
  and right). 320x240 by default, or 640x480 with Sharp graphics. Measured
  with the CPU slowed 4.5x: 60 fps either way, with 110 to 200 ms of script
  a second at 320x240 and 340 to 500 at 640x480 (the start map, then a busy
  demo; drawing spans is most of it).
  Mission packs and players' own paks are untested beyond the file checks
  (no copies here). Not yet tried in the car.
- `apps/openttd`: OpenTTD 15.3 (GPL-2.0), compiled to WebAssembly by
  `npm run build:openttd` (`tools/build-openttd.mjs`: the 15.3 tag plus
  `tools/openttd/openttd-web.patch`, built with upstream's own Emscripten
  Docker image from `os/emscripten`; the patched source ships next to the
  engine in `apps/openttd/engine/`). The same script fetches the free base
  sets from cdn.openttd.org, checked against their SHA-256: OpenGFX 8.0
  (GPL-2.0), OpenSFX 1.0.3 (CC BY-SA 3.0) and OpenMSX 0.4.2 (GPL-2.0), each
  tar gzipped to `apps/openttd/data/` (15 MB in all) with its readme,
  license and source. The engine's wasm and data file, its source tarball
  and the sets aren't in git, so run it before deploying `apps`. The page
  downloads the sets the first time and keeps them in IndexedDB (database
  `openttd`), unpacks them to `/baseset/` in the engine's memory, and starts
  OpenTTD's own title screen, or `-g autosave/exit.sav` for Continue. The
  game's folder (`/home/web_user/.openttd`: settings, saves, online content)
  is Emscripten's IDBFS, copied to IndexedDB whenever the game saves
  something; the first openttd.cfg turns on saving on exit and, on touch
  screens, 150% interface size, dragging the map with the left button,
  tooltips on the right button and the game's own on-screen keyboard
  (private.cfg turns off the survey question; this build can't send it
  anyway). The patch builds an ES module the page starts itself
  (`createOpenTTD`, `callMain`) and adds `web_*` calls: `web_mouse` (SDL
  mouse events from the page), `web_scroll` (moves the main view),
  `web_modifiers` (the page's Ctrl button), `web_resize`, `web_autosave`
  (`DoExitSave`), `web_state`, `web_view` and `web_frames` for the page and
  checks; and a `web` music driver that hands each song's MIDI file to the
  page, where `midi.js` plays it with Web Audio oscillators and noise (a
  sound per General MIDI family, not a sound font). Touch is read by the
  page over the canvas: a tap clicks when the finger lifts, a finger that
  moves drags (the map, or a building tool's line), a long press holds the
  right button (tooltips), and two fingers move the map (or scroll the list
  under them) and pinch to zoom. The game is drawn at one game pixel per
  CSS pixel. The game is saved when the page is hidden, when the hub's close
  handshake asks and with Quit. Online Content works over OpenTTD's
  WebSocket proxy. Measured with the CPU slowed 4.5x: 60 fps, about 180 ms of
  main-thread work a second in a new game and 270 while dragging the map,
  with sound and music on. Not yet tried in the car.
- `apps/fheroes2`: fheroes2 1.1.17 (GPL-2.0-or-later), the open-source
  engine for Heroes of Might and Magic II, in the Holders section. `npm run
  build:fheroes2` (`tools/build-fheroes2.mjs`) compiles it unmodified with
  its own `Makefile.emscripten` (SDL2, Asyncify, IDBFS) in Docker
  (`tools/fheroes2/Dockerfile`: emsdk 4.0.10 plus gettext) to
  `apps/fheroes2/engine/` (10 MB wasm, 12 MB data package with the engine's
  own files, and the source as `fheroes2-1.1.17-src.tar.gz`); none of it is
  in git, so run it before deploying `apps`. The game's files aren't free,
  so players bring their own from the phone (`?app=fheroes2`) or the file
  picker: HEROES2.AGG (needed), HEROES2X.AGG (The Price of Loyalty), maps
  (.mp2, .mx2) and music, sorted by `heroesPath` in `apps/_shared/roms.js`
  and kept in IndexedDB (database `fheroes2`). The free demo (h2demo.zip)
  lets anyone share it but not sell it, so it isn't offered here; archive.org
  sends no CORS headers, so the car couldn't fetch it there anyway. The
  build has no module wrapper: the page sets a global `Module` (canvas,
  `locateFile` for the data package, a `preRun` that writes the game's files
  to `/h2`, mounts IDBFS at `/fheroes2` as `HOME`, and writes a first
  fheroes2.cfg with the intro off and an autosave at the start of each
  turn) and adds the script. fheroes2 handles touch itself (one finger is
  the left button, a second finger the right one) and syncs IDBFS whenever
  it writes a file; the page syncs again when hidden, on the hub's close
  handshake and on Quit, and goes back to the library when the game's own
  Quit leaves the canvas at 0×0. The canvas gets whole CSS pixels: in a
  cross-origin frame at a 1.53 pixel ratio its box came out fractional and
  SDL missed every tap. Measured with the CPU slowed 4.5x: about 100 ms of
  main-thread work a second on the adventure map and 150 during the
  computer's turn. The e2e check needs the demo's HEROES2.AGG and
  BROKENA.MP2 in `roms/h2demo/` (not in git) and skips without them. Not yet
  tried in the car.
- `apps/openarena`: OpenArena. The Quake III engine ioquake3 (GPL-2.0-or-later)
  compiled to WebAssembly by `npm run build:openarena`
  (`tools/build-openarena.mjs`: a fixed ioq3 commit plus
  `tools/openarena/ioq3-web.patch`, built with ioq3's own Emscripten CMake
  support in Docker, emsdk 4.0.10 with a newer CMake from
  `tools/openarena/Dockerfile`; the patched source ships next to the engine
  in `apps/openarena/engine/`). The same script fetches OpenArena 0.8.8
  (GPL-2.0-or-later, checked against its SHA-256, 425 MB) and
  `tools/openarena/pack.mjs` repacks it into `apps/openarena/data/`: a
  54 MB `oa-core.pk3` (menus, weapons, items, effects, sounds, the game
  code's qvms and six player models, with `scripts/bots.txt` cut down to
  their ten bots) and one `oa-map-<map>.pk3` of 1 to 6 MB for each of ten
  free-for-all arenas. Which files a map or model needs is worked out the
  way the engine looks them up (bsp shader and fog lumps, md3 surfaces,
  skins, shader stages, entity sounds, models and music, and paths in the
  qvms and the engine); each arena was checked against the full game, with
  the same warnings (OpenArena's own missing files). The "mature" player
  models and the mission pack are left out. It also writes `maps.json`
  (titles, sizes, hashes), the level shots (TGA turned into PNG by
  `tools/openarena/tga.mjs`), the license and credits files, and the game
  code's source (Debian's `openarena_0.8.8+dfsg.orig.tar.xz`, checked
  against its SHA-256). None of the data, the wasm or the source tarball is
  in git, so run it before deploying `apps`. The page downloads the core
  and the chosen arena the first time and keeps them in IndexedDB
  (database `openarena`; a new hash downloads again), writes them to
  `/baseoa` in the engine's memory, and starts `+map <arena>` with
  `+addbot` for 1 to 4 bots at the chosen skill. Everything else goes in an
  `autoexec.cfg` the page writes, because the engine's command line holds
  only 1024 characters: free for all to 15 frags or 10 minutes (then the
  arena starts over), the newer renderer's effects off (HDR, post-process,
  SSAO, sun shadows, normal and specular maps), sound through SDL at
  44.1 kHz with the page's AudioContext (made in the tap; any later tap
  resumes it if the browser held it back, and the Sound button says so), and voice chat and its microphone
  capture off (the browser would ask for the microphone). The patch adds
  `web_move` (walk, step, turn and look rates), `web_look` (a dragged
  finger, in degrees), `web_cmd` (`+attack`, `weapnext`...), `web_key`,
  `web_mouse`, `web_pointer` (puts the menus' pointer where a finger is; it
  calls the menus directly, because the engine adds queued mouse moves
  together), `web_state` and `web_writeconfig`; keeps SDL's keyboard to the
  canvas; and builds the SSAO, depth blur and sun shadow shaders only when
  those effects are on: in Chrome on ANGLE's Vulkan backend the GPU process
  crashed right after linking them (on SwiftShader it still crashes at
  random points, so check it with a real GPU). The game's q3config.cfg is
  copied to IndexedDB when the page is hidden, when the hub's close
  handshake asks and on leaving; leaving the arena from the game's menu
  goes back to the list. On the screen: a stick, a finger anywhere else (or
  on FIRE) to turn and look, FIRE, JUMP, ZOOM and weapon buttons, and taps
  on the game's own menus; controllers as in LibreQuake. Drawn at CSS
  pixels, or every device pixel with Sharp graphics. Measured with the CPU
  slowed 4.5x: 60 fps with 3 bots and about 235 ms of script a second
  (the bots' game code runs in the qvm interpreter: 5 bots took 550, so the
  page offers up to 4), starting in about 8 seconds. Not yet tried in the
  car.
- `apps/arcade`: Arcade. MAME 0.289 (GPL-2.0-or-later) compiled to
  WebAssembly by `npm run build:mame` (`tools/build-mame.mjs`: tag
  mame0289 at a fixed commit plus `tools/mame/mame-web.patch`, MAME's own
  Emscripten build in Docker `emscripten/emsdk:6.0.11`, because MAME's
  SDL3 front end needs Emscripten's SDL3_ttf port; about 4 minutes; 39 MB of
  wasm, 6.6 MB gzipped) with only the 11 drivers of the 20 games in
  `apps/arcade/games.js`: the ones mamedev.org gives away for free,
  non-commercial use. Their terms let only mamedev.org distribute them, so
  none is hosted here: the phone page (`/send/?app=arcade`) links each
  game's page on mamedev.org, the player downloads the zip there and sends
  it, and the car keeps it in IndexedDB (`arcade`, store `roms`) under
  MAME's set name (a phone's "robby (1).zip" becomes `robby`). Left out:
  the Video Klein poker machines (gambling, with a casino button panel)
  and two clone sets whose parents mamedev.org doesn't offer. MAME runs
  with `-video accel` (its default OpenGL renderer calls functions WebGL
  doesn't have), `-nothrottle` (MAME's own throttle spun the main thread at
  100%; the page's frames pace it) and `-joystickprovider none`: the page
  reads the touch pad, buttons and controllers (the car's duplicate pads
  filtered) and sends MAME's default keys (arrows, Ctrl, Alt, Space, Shift,
  5 coin, 1 start, A/Z for Star Fire's lever). The patch steps each frame
  by real time instead of a fixed 1/60 s, saves NVRAM and settings on the
  web (MAME's exit path never runs there) and adds `web_save()`, which the
  page calls on Games, when hidden and on the hub's close handshake; they
  live in IDBFS at `/mame`. The build also packs every file the compiler
  read (from the build's dependency files) plus the build scripts into
  `engine/mame-0.289-web-src.tar.xz` (9 MB) for the GPL. All 20 games
  start; FAX and Top Gunner show their own power-on self-tests first.
  Measured with the CPU slowed 4.5x: 250-390 ms/s of main-thread work.
  The engine isn't in git, so run the build before deploying `apps`. Not
  yet tried in the car.
- `apps/supertux`: SuperTux 0.7.0 (GPL-3.0-or-later), in Holders, compiled to
  WebAssembly by `npm run build:supertux` (`tools/build-supertux.mjs`: the
  release's source tarball checked against its SHA-256, plus
  `tools/supertux/supertux-web.patch`, CMake in Docker from
  `tools/supertux/Dockerfile`, emsdk 4.0.10 with the game's Emscripten ports
  built into the image; PhysicsFS 3.2.0, {fmt} 11.2.0 and GLM 1.0.1 are
  built from their release tarballs first; about 50 s; 6.5 MB of wasm, 2 MB
  gzipped). Built with the phone menus (no level editor) and without
  networking; the patch drops the Add-ons, Manage Assets and Donate entries.
  The data is 326 MB, more than the car's tab can hold (it dies at about
  500 MB), so `tools/supertux/pack.mjs` packs every file into one stream of
  1 MB blocks (`data/<version>/<n>.bin`, gzipped where that saves a tenth:
  287 MB stored) with `data/index.json` listing the files and sizes. The
  page mounts every file at `/data` with its size and no contents, and
  wraps the engine's `fd_read` import in `WebAssembly.Suspending` (JSPI): a
  read whose blocks aren't in memory suspends the game's wasm stack while
  they come from IndexedDB (`supertux`, every block ever fetched) or the
  network, and 48 blocks stay in memory. That needs the whole game on one
  suspendable stack, so the patch runs the main loop inside `main()` and
  waits for each animation frame through an `EM_ASYNC_JS` import
  (`Module.nextFrame`) instead of `emscripten_set_main_loop`, and the build
  uses WebAssembly exceptions (Emscripten's JavaScript exceptions put JS
  frames on the stack, which JSPI can't suspend). Calls from the page into
  the game (resizing, saving the options) don't wait. `tools/supertux/boot.txt`
  lists the files the game reads in the browser (`?trace=1`,
  `window.supertuxTrace()`), in order: `[start]` (to the title screen,
  25 MB, downloaded six blocks at a time before the game runs) and
  `[next]` (the intro, the first world map and its first level, 15 MB,
  downloaded two at a time in the background); they go first in the
  stream, so a fresh start reaches the first level without waiting on a
  read. Rerun a trace when the data changes. Saves and options live in
  IDBFS at `/home/web_user/.local/share/supertux2` (synced at most every
  2 s, and when the page is hidden or the hub's close handshake asks).
  The page filters the car's duplicate controllers like the Half-Life
  port does, and tells the game to show its own touch controls on touch
  screens (`?touch=1`/`?touch=0` overrides). "Download everything" fills
  IndexedDB for offline play; "Remove" empties it. The data blocks get an
  immutable cache header and the service worker skips them. Measured with
  the CPU slowed 4.5x: 60 fps in the first level, about 550 ms/s of
  main-thread work (the title screen about 740). The engine and data
  aren't in git, so run it before deploying `apps`. Not yet tried in the
  car.
- `apps/blocks`: Block Builder. ClassiCube 1.3.8 (BSD-3-Clause), a
  clean-room Minecraft Classic compatible game, compiled to WebAssembly by
  `npm run build:blocks` (`tools/build-blocks.mjs`: a fixed ClassiCube
  commit plus `tools/blocks/classicube-web.patch`, its own `make web` in
  Docker, emsdk 4.0.10; 0.5 MB of wasm). The game ships no art of its own
  that's free to use, so `tools/blocks/pack.mjs` makes a texture pack from
  Mineclonia's textures (based on the Pixel Perfection packs, CC BY-SA 4.0,
  at a fixed Mineclonia commit): the block tiles laid out in ClassiCube's
  terrain atlas (grass and leaves tinted, missing wool colours tinted from
  white wool), the water, lava, fire and magma animations, the hotbar and
  the player; it draws the buttons, crosshair, clouds and touch stick
  itself, and `tools/blocks/font.mjs` draws the font from Monocraft (OFL,
  checked against its SHA-256) by reading its TrueType outlines, whose
  squares are its pixels. Dig and step sounds are Mineclonia's (CC BY,
  CC BY-SA, CC0), copied under the names the game asks for; the page makes
  the game's `window.AUDIO` itself in the tap that starts a world and
  decodes them all then, because the game skips a sound the first time it
  asks for it (that's when it downloads it). The wasm, the
  texture pack and the sounds aren't in git, so run it before deploying
  `apps`. The game keeps its options and worlds in its own IndexedDB
  database (`/classicube`, store `FILE_DATA`, keys like
  `/classicube/maps/World 1.cw`); the page lists and deletes the worlds
  there and starts the game with a world's path, or with `Module.newWorld`
  (size, height, flat) for a new one. The patch adds `web_save()` (saves
  the world as `maps/<name>.cw`; the page saves it every minute, when it's
  hidden, when the hub's close handshake asks and on Worlds, and waits for
  the write by queueing a write transaction behind it) and `web_escape()`
  (the Menu button), and takes the texture pack's and sounds' URLs, the
  touch controls (on screens without a fine pointer) and the canvas scale
  from the page. The game's own touch controls are used: a four-arrow
  stick, jump, Fly and Speed, tap to place and hold to break, and the
  hotbar. It sizes its buttons and text by the canvas scale, so they keep
  their size when the canvas is drawn at CSS pixels (the default) or at
  every device pixel (Sharp). Also patched: a controller the car lists
  twice is read once (standard mapping only), no skin downloads in single
  player, no frame rate on screen, and no "unsaved changes" prompt. A
  world made in the game's own menu gets a fresh name from the page when
  it's first saved. Measured with the CPU slowed 4.5x: a small world starts
  in under a second, 60 fps and about 30 to 60 ms of script a second. Not
  yet tried in the car.
- `apps/craft4k`: Craft 4K (holders only). Minecraft4k-CPP by TheSunCat
  (GPL-3.0), a C++ remake of Notch's 2010 Minecraft4k that ray-marches a
  512x64x512 block world on the GPU, compiled to WebAssembly by
  `npm run build:craft4k` (`tools/build-craft4k.mjs`: the commit that
  added the license, cfb537a, the last before the code was squeezed into a
  4 KB binary, plus `tools/craft4k/craft4k-web.patch`, emsdk 4.0.10 in
  Docker; 160 KB of wasm). The original needs OpenGL 4.3 compute shaders,
  which WebGL 2 lacks, so `tools/craft4k/web.cpp` replaces its main file
  and draws `res/raytrace.comp` as a fragment shader over a canvas of
  Detail's rows (120, 240 or 480; as many columns as the screen's shape
  needs), which CSS scales up with sharp pixels. The world is an R8UI 3D
  texture read with `texelFetch`, and a changed block is sent to it alone.
  Also added: a step limit (facing mirrors would reflect forever and lose
  the GPU), the pointed-at block's outline, breaking and placing blocks
  (the original never finished them) and the day starting at sunrise. The
  page has a walk stick, Jump, Break and Place (held, they repeat), drag to
  look, and the seven blocks, mirrors among them; a controller and
  keyboard and mouse (pointer lock) work too. The world is made from a
  seed, so only the seed and the changed blocks are saved, with the player
  and the time of day (IndexedDB `craft4k`): 20 seconds after a change,
  when hidden and on the hub's close handshake. Until Detail is picked, it
  steps down by itself after two seconds under 24 fps. The engine's output
  is committed. 60 fps on a desktop GPU; not yet tried in the car.
- `apps/adventure`: Adventure Games. ScummVM 2026.4.0 (GPL-3.0-or-later)
  compiled to WebAssembly by `npm run build:scummvm`
  (`tools/build-scummvm.mjs`: the v2026.4.0 tag plus
  `tools/scummvm/scummvm-web.patch`, Emscripten 4.0.10 in Docker with
  pkg-config added by `tools/scummvm/Dockerfile`, libmad for MP3, libmikmod
  for SLUDGE games' tracker music and libvpx for their WebM movies; each
  library's source tarball goes next to the engine). One
  static build with 25 engines (the free games' plus LucasArts SCUMM and
  Humongous, Sierra AGI and SCI, Revolution, Westwood, Coktel, Adventure
  Soft and others); 31 MB of wasm, about 9 MB compressed. Static rather
  than ScummVM's plugin build: the same speed, but one file the browser
  caches compiled, against side modules compiled on every start. The script
  also copies the engine data (themes, engine tables) to `data/` with the
  `index.json` ScummVM's web file system reads, and fetches twelve free
  games from downloads.scummvm.org, checked against SHA-256, unmodified into
  `games/` (Beneath a Steel Sky and Flight of the Amazon Queen floppy
  versions, Lure of the Temptress, Drascula with its music pack, Sołtys,
  Sfinx, Nippon Safes; each zip carries its license, which allows free
  distribution; the SLUDGE games The Secret of Tremendous Corporation,
  LGPL-3.0 code and CC BY-SA 4.0 art, and Out Of Order, Frasse and the Peas
  of Kejick and Nathan's Second Chance, freeware whose terms allow sharing
  them whole and free; and Mystery House, public domain, typed commands).
  Left out: Mandy (forbids any profit), the SLUDGE games whose packages state
  no terms, God of Thunder, The Griffon Legend, DreamWeb (mature) and the big
  CD versions. The wasm and the games aren't in git, so run it before
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
- `apps/text`: Text Adventures. Zork I, II and III (Infocom; source code
  and story files released by Microsoft under the MIT License in November
  2025, from github.com/historicalsource; the story files are in
  `apps/text/games/`, unmodified, with their licenses) on this site's own
  Z-machine, `apps/text/zmachine.js`. It plays versions 1 to 5, 7 and 8
  (everything but version 6, which has pictures) after the Z-Machine
  Standards Document 1.1, and has no DOM, so it also runs in Node. It was
  checked against CZECH 0.8 (406 of 406 passed), Praxix (all passed) and
  TerpEtude, and Zork I to III matched Frotz word for word apart from
  random events; those test files aren't in this repo. Made for the car's
  touchscreen: a verb button starts a command, tapping a word in the story
  adds it (only words in the game's dictionary; others show a hint), the
  compass and "now" buttons send a command at once, and Go sends what's
  made. A real or on-screen keyboard works too (arrow keys recall earlier
  commands), and "press a key" moments get a row of keys. In versions 1 to
  3 the status line goes in the top bar, and the line that matches the
  room's name is drawn as a heading; later games draw their own status
  line, which is shown in the upper window's fixed-width font. After every
  move the game's state (a snapshot of its memory and stack, taken while it
  waits, so restoring it asks for the move again) and the last 60,000
  characters of the story are kept in IndexedDB (database `text`), so
  leaving loses nothing and Continue picks up there; Undo goes back up to
  50 moves using the same snapshots, in any game, and the game's own SAVE
  and RESTORE use one more slot per game. Players add .z1-.z8 and .zblorb
  files (zipped or not) from their phone or from files. A move takes about
  15 ms with the CPU slowed 4.5x. Not yet tried in the car.
- `apps/ascii`: ASCII Quests. Scott Miller's Kroz games (Apogee,
  1987-1990): Caverns of Kroz II, Dungeons of Kroz II, Return to Kroz,
  Temple of Kroz, The Final Crusade of Kroz, Kingdom of Kroz II and The Lost
  Adventures of Kroz, built from the Turbo Pascal source Apogee released
  under the GPL (version 2 or later) in 2009. Apogee's compiled games are
  freeware with all rights reserved, so they're never used. `npm run
  build:kroz` (`tools/build-kroz.mjs`) fetches the source at a fixed commit
  of github.com/tangentforks/kroz (an unchanged import of Apogee's
  krozfree.zip) and translates each game, unchanged, to
  `apps/ascii/games/<id>.js` with `tools/kroz/pascal.mjs`, this site's own
  translator for the Turbo Pascal 5 the games use (units, include files,
  records, sets, shortstrings, typed files, var parameters, `with`, `goto`,
  and Turbo Pascal's habits: integers wrap to their size, `for` counters
  keep their last value, arrays aren't bounds-checked). It also writes
  `apps/ascii/kroz-src.tar.gz`, the source that goes with the games, and
  `apps/ascii/font.js` from the Linux kernel's 8x16 VGA font (GPL-2.0). The
  output is committed. Each game runs in a worker on `apps/ascii/runtime.js`:
  an 80x25 text screen with Turbo Pascal's Crt behaviour (windows,
  scrolling, blinking), the BIOS keyboard, the PC speaker (an AudioWorklet,
  `speaker.js`) and files for saves and high scores (IndexedDB `ascii`). The
  games pace themselves by CPU speed (the main loop counts to 800 between
  monster moves), so every runtime call costs time on a made-up clock set
  to roughly a PC AT, and the worker sleeps (Atomics.wait on shared memory)
  when that clock runs ahead; Speed scales it. The two questions every game
  asks first (colour or monochrome, slow or fast PC) are answered by the
  runtime. The page draws the screen from shared memory, turns each
  question on screen into answer buttons, takes the name for the high
  scores in a text box, and walks the player one step toward a tap (held
  taps keep walking, repeating at the BIOS's 11 keys a second); keyboard
  and controller work too. Kroz saves the state at the start of the level,
  as it always did. Measured with the CPU slowed 4.5x: 60 fps and about 30
  ms of main-thread work a second. Not yet tried in the car.
- `apps/send` and `apps/api/transfer.js`: "Get games from phone", for Retro
  Console, Freedoom, Blasphemer, Adventure Games, Text Adventures and
  LibreQuake (the car side is `apps/_shared/phone.js`; Freedoom adds
  `?app=doom` so the phone page checks for WADs, Blasphemer `?app=heretic`,
  Adventure Games `?app=adventure`, Text Adventures
  `?app=text` for story files, LibreQuake `?app=quake` for paks and music). The car
  opens a session and shows a QR code with the session id and an AES-GCM key
  in the URL fragment, which never reaches the server. The phone page
  encrypts each game before upload; the function relays ciphertext through
  Upstash Redis (Vercel Marketplace, free plan, env `KV_REST_API_URL` and
  `KV_REST_API_TOKEN`) for at most 15 minutes and deletes each file when the
  car takes it. Games over 2 MB are split into 2 MB pieces on the phone and
  joined on the car. The phone tries each piece up to three times when the
  connection drops or the server has a problem, and the car ignores a piece
  it has already used. Limits: 2 MB per piece, 200 pieces and 80 MB per
  session, rate limits per IP. `npm run dev` serves `/api/*` locally with an in-memory store.
- `apps/vote` and `apps/api/vote.js`: the holders' vote, a phone page
  (frunk-apps.vercel.app/vote/) where holders of the FrunkStore token
  (Solana mint `9T1DbbiKfhfubEabDj5SWSMzBuyU4tJHkpSgR51Tpump`, Token-2022)
  pick up to three of the ideas in `apps/vote/ideas.json` and can send a
  suggestion. Wallets are found through the Wallet Standard (Phantom,
  Solflare, Backpack, as extensions or inside their apps' browsers); an
  ordinary phone browser gets links that open the page in Phantom or
  Solflare. Signing in is a Sign In With Solana message: no transaction.
  The function checks the ed25519 signature against a one-time nonce
  (10 minutes), reads the wallet's balance with `getTokenAccountsByOwner`
  from `SOLANA_RPC_URL` (default: Solana's public RPC, which rate-limits, so
  set a Helius or similar URL in production), and gives out a 24-hour
  session. Balances are checked again on every vote, and voting needs
  `VOTE_MIN_TOKENS` tokens (default 100,000). Ballots are one Redis hash, wallet to
  picks, so results are always counted fresh; suggestions are a list that
  only the owner reads, with `node tools/votes.mjs` (after
  `vercel env pull` in `apps/`), which also shows the tokens behind each
  idea. On the dev server without `SOLANA_RPC_URL`, balances are made up
  (`op=dev-balance`) so the e2e check can vote with a test wallet.
- `apps/holders` and `apps/_shared/holders.js`: Holders, early access for
  wallets holding at least `VOTE_MIN_TOKENS` FrunkStore tokens: SuperTux, Craft 4K,
  fheroes2, Freedoom, LibreQuake, OpenArena, OpenTTD, and the Mega Drive / Genesis and PC Engine (Retro Console opened as
  `/retro/?edition=holders`, which shows only the consoles in `EARLY` in
  `retro.js`; the ordinary edition leaves those out, and each edition lists
  only its own consoles' games and continues its own last game). Those
  apps are marked `"holders": true` in the hub's catalog, so they're off
  the grid; the Holders menu lists them and posts `{ frunk: 'open', app }`,
  and the hub opens the app in the menu's place, so its Apps button and
  save-on-close work as usual. Each app awaits `holdersGate()` before it
  starts, so a direct link is locked too. The car has no wallet, so the gate
  shows a QR code to `/vote/?link=<id>` (`op=link-open`, 15 minutes); the
  phone signs in there and links the car (`op=link`), and the car's poll
  (`op=link-poll`) gets a 30-day pass, kept in localStorage and shared by
  every app. With a pass, an app starts at once and the pass is checked in
  the background (`op=pass`, at most every 10 minutes per tab); a wallet that
  sold reloads into the locked screen, and without a connection the screen
  stays unlocked. The car-side answers are always 200, so the car's console
  stays clean. This gates the pages, not the files: the engines and games
  are ordinary static files, and the source is public.
- `apps/token` and `apps/api/token.js`: FrunkStore Token, opened from the
  "Live chart, wallet & buy" button under the token's address in the hub's
  footer (catalog `"unlisted": true`, so it's off the grid). It shows the
  price, the day's numbers and a candle chart (1H to All, a finger on the
  chart reads a candle), refreshed every 30 seconds. `op=market` takes the
  price and numbers from DexScreener's deepest pool and the candles from
  GeckoTerminal, fills hours without trades with flat candles, and is cached
  on Vercel's CDN for 30 seconds; longer ranges' candles are reused for a
  few minutes, and when a source is busy, the instance's last answer is used.
  GeckoTerminal's free API allows about 30 requests a minute per IP, shared
  by everything on Vercel's IPs; set `COINGECKO_API_KEY` (a free CoinGecko
  demo key) on frunk-apps to fetch the same candles from CoinGecko's
  on-chain API on the key's own quota. Connecting a wallet works like the holders' unlock: the car
  shows a code to `/token/phone/?c=<id>`, where the phone signs a Sign In With
  Solana message (no transaction) or pastes an address to watch, view only,
  for a pump.fun account or any wallet that can't sign there. A signed-in
  wallet holding `VOTE_MIN_TOKENS` also gets the car a holders' pass. The
  car keeps the address and checks its balance every minute
  (`op=wallet`). Buying never happens on the car or through frunk.store: the
  car shows the risks (`apps/token/terms.js`, also on the phone) and a code
  to `/token/phone/?buy`, which, after the risks are accepted there too,
  links to Phantom's swap screen (`phantom.app/ul/v1/swap`, token prefilled)
  and the token's pump.fun page, and shows the address to copy for other
  wallets. The site never builds or asks for a transaction. Shared Solana
  helpers are in `apps/api/_solana.js`, wallet discovery for phone pages in
  `apps/_shared/wallets.js`.
- `apps/chess`: the Lichess daily chess puzzle, playable on the board. Tap a
  piece, then a highlighted square; the opponent's reply is played
  automatically and only the best move is accepted. Next puzzle fetches a
  random one from Lichess. The last puzzle is cached for offline use. Rules
  come from chess.js (BSD-2-Clause); the piece art is the cburnett set
  (CC BY-SA 3.0).
- `apps/puzzles`: Logic Puzzles. Simon Tatham's Portable Puzzle Collection
  (MIT), all 40 puzzles, built by `npm run build:puzzles`
  (`tools/build-puzzles.mjs`: a fixed upstream commit plus
  `tools/puzzles/puzzles-web.patch`, compiled with upstream's own CMake
  Emscripten build in Docker, `tools/puzzles/Dockerfile` = emsdk 4.0.10 plus
  Halibut). Each puzzle is its own small `engine/<name>.{js,wasm}` (about
  130 KB of wasm), so only the one being played downloads. The build also
  makes each puzzle's chapter of the manual into `help/<name>.html` and draws
  the icons from upstream's icon saves in Chrome, cropped as upstream crops
  them. The engine, help, icons and `puzzles.json` are gitignored, so run the
  build before deploying `apps`.
  The puzzle runs upstream's web front end, which finds the page's elements
  by id; `puzzles.js` adds the list, touch (tap = left click, long press =
  right click, Right-click swaps them, two-finger tap = middle click), keys
  at the side from the puzzle's own key list, a controller (D-pad = arrow
  keys, A and B select, X undo, Y redo), Help, and the game kept after every
  move as the puzzle's save file in localStorage (`puzzles.<id>.save`), so
  Continue picks up where it was. The patch tells the page after each move,
  adds `web_keys`, `web_key`, `web_cursor` and `web_status`, gives each
  puzzle its own preferences key, and fixes a Guess redraw that left a trail
  behind a dragged peg.
- `apps/terrarium`: Terrarium, by Jason Goldfeder (jasongoldfeder.com). An
  artificial-life aquarium on Canvas 2D whose fish carry genomes, breed and
  evolve. It saves to localStorage and, when reopened, catches up on the time
  it was away. Ported from https://github.com/jasongold/tesla-demo, where it
  lives at `games/terrarium/`; the shared helpers it needs are copied into
  `apps/terrarium/engine/`.
- `apps/_shared/place.js`: the location picker. Star Map, Weather,
  Satellites, Sky Events, What's Around Me and Pit Stop share one saved place
  (`frunk.place` in localStorage). A place picked as the car's location
  follows the car: when the browser already shares the location, each app
  checks it on start and moves the place once the car is more than 5 km
  away. What's Around Me and Pit Stop always use the car's location when
  they're allowed to.
- `apps/_shared/awake.js`: keeps the screen on (Screen Wake Lock) while Sleep
  Sounds plays, while Campfire shows, and on the phone page while it sends
  games. The browser drops the lock when the page is hidden, so it's taken
  again when the page shows.

## Commands

```sh
npm install
npm run build:wasm                      # after editing apps/fractal/fractal.wat
npm run build:doom                      # Doom and Heretic engines + Freedoom and Blasphemer (needs Docker); run before deploying apps
npm run build:scummvm                   # ScummVM engine + free adventures (needs Docker); run before deploying apps
npm run build:quake                     # Quake engine + LibreQuake (needs Docker); run before deploying apps
npm run build:openttd                   # OpenTTD engine + its free base sets (needs Docker); run before deploying apps
npm run build:fheroes2                  # fheroes2 engine for Heroes II (needs Docker); run before deploying apps
npm run build:openarena                 # Quake III engine + OpenArena (needs Docker); run before deploying apps
npm run build:blocks                    # ClassiCube engine + its textures, font and sounds (needs Docker); run before deploying apps
npm run build:supertux                  # SuperTux engine + its data as streaming blocks (needs Docker); run before deploying apps
npm run build:mame                      # MAME with Arcade's drivers + its source tarball (needs Docker); run before deploying apps
npm run build:craft4k                   # Minecraft4k-CPP for Craft 4K (needs Docker); output is committed, rerun only to update it
npm run build:puzzles                   # Simon Tatham's Puzzles + their help and icons (needs Docker and Chrome); run before deploying apps
npm run build:sms                       # Gearsystem for Retro Console (needs Docker); output is committed, rerun only to update it
npm run build:pce                       # Geargrafx for Retro Console (needs Docker); output is committed, rerun only to update it
npm run build:lynx                      # Gearlynx for Retro Console (needs Docker); output is committed, rerun only to update it
npm run build:townpatrol                # Town Patrol's Lynx cartridge from source (needs Docker); output is committed
npm run build:kroz                      # ASCII Quests' Kroz games from Apogee's GPL source; output is committed
npm run build:md                        # clownmdemu for Retro Console (needs Docker); output is committed, rerun only to update it
npm run build:n64                       # n64js for Retro Console (needs npx to fetch Bun); output is committed, rerun only to update it
npm run dev                             # hub on localhost:5173, apps on 127.0.0.1:5174
npm run test:e2e                        # checks against the dev server
node tools/e2e.mjs https://frunk.store  # checks against production

# deploy (each folder is linked to its own Vercel project)
(cd apps && vercel deploy --prod)
(cd hub && vercel deploy --prod)
```

Deploy `apps` before `hub` when a hub change depends on a new app.
