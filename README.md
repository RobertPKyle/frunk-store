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
  COOP/COEP headers); both are vendored unmodified. Master System, Game
  Gear and SG-1000 games run on Gearsystem 3.9.22 (GPL-3.0-or-later,
  unmodified) compiled to WebAssembly by `npm run build:sms`
  (`tools/build-gearsystem.mjs` with `tools/gearsystem/web.cpp`, in Docker;
  the output in `apps/retro/sms/` is committed, with its source as
  `gearsystem-web-src.tar.gz`). PC Engine / TurboGrafx-16 HuCard games (in
  the holders edition only, see Holders below) run
  the same way on Geargrafx 1.8.4 (GPL-3.0-or-later, unmodified), built by
  `npm run build:pce` (`tools/build-geargrafx.mjs` with
  `tools/geargrafx/web.cpp`; output and source in `apps/retro/pce/`, with
  the bundled libraries' licenses in `THIRD-PARTY.txt`); CD games are left
  out, as they need Hudson's System Card. Both run in workers
  (`sms-worker.js`, `pce-worker.js`, sharing `gear-worker.js`) the way jsnes
  runs in its own (the page side is `worker-core.js`). Gearsystem takes
  about 0.5 ms a frame on a desktop (2.2 ms with the CPU slowed 4.5x),
  Geargrafx 1.5 ms (6.7 ms slowed). The console is picked from the file's
  header (Sega's and the PC Engine's by name, .sms, .gg, .sg or .pce, since
  SG-1000 games and HuCards carry no header; the "TMR SEGA" header settles
  Master System against Game Gear), and zipped games are unzipped in the
  browser (`apps/_shared/roms.js`). Every game keeps its battery save and a
  resume snapshot in IndexedDB (mGBA's files for Game Boy, databases "nes",
  "sms" and "pce" for the worker cores; a PC Engine game's battery save is
  its 2 KB of backup RAM),
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
- Holders (hub card `holders`): early access for wallets holding at least
  `VOTE_MIN_TOKENS` FrunkStore tokens, for now the PC Engine. It's Retro
  Console opened as `/retro/?edition=holders`, which shows only the consoles
  in `EARLY` (`retro.js`); the ordinary edition leaves those out, and each
  edition lists only its own consoles' games and continues its own last
  game. The car has no wallet, so it shows a QR code to
  `/vote/?link=<id>` (`op=link-open`, 15 minutes); the phone signs in there
  and links the car (`op=link`), and the car's poll (`op=link-poll`) gets a
  30-day pass, kept in localStorage. Each time Holders opens, the pass is
  checked (`op=pass`) against the wallet's balance then; a wallet that sold
  locks the screen again (after the game in progress), and without a
  connection the screen stays as it was. The car-side answers are always
  200, so the car's console stays clean. This gates the page, not the
  files: the emulator and games are ordinary static files, and the source
  is public.
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
npm run build:openarena                 # Quake III engine + OpenArena (needs Docker); run before deploying apps
npm run build:blocks                    # ClassiCube engine + its textures, font and sounds (needs Docker); run before deploying apps
npm run build:puzzles                   # Simon Tatham's Puzzles + their help and icons (needs Docker and Chrome); run before deploying apps
npm run build:sms                       # Gearsystem for Retro Console (needs Docker); output is committed, rerun only to update it
npm run build:pce                       # Geargrafx for Retro Console (needs Docker); output is committed, rerun only to update it
npm run dev                             # hub on localhost:5173, apps on 127.0.0.1:5174
npm run test:e2e                        # checks against the dev server
node tools/e2e.mjs https://frunk.store  # checks against production

# deploy (each folder is linked to its own Vercel project)
(cd apps && vercel deploy --prod)
(cd hub && vercel deploy --prod)
```

Deploy `apps` before `hub` when a hub change depends on a new app.
