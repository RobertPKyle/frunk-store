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
