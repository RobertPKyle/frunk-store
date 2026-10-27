// Atari Lynx core: Gearlynx compiled to WebAssembly (lynx/,
// GPL-3.0-or-later; built by tools/build-gearlynx.mjs), run on its own
// thread by lynx-worker.js (see worker-core.js), which also keeps the game's
// saves.

import { createWorkerCore } from './worker-core.js';

export const createLynx = canvas => createWorkerCore(canvas, {
  system: 'lynx', worker: new URL('./lynx-worker.js', import.meta.url), module: true, width: 160, height: 102,
  // Gearlynx's key bits. Select is Option 1 and Y Option 2 (a controller's
  // L and R too); Start is Pause.
  buttons: { up: 0, down: 1, left: 2, right: 3, a: 4, b: 5, select: 6, y: 7, start: 8 },
  same: { x: 'y', l: 'select', r: 'y' },
  sampleRate: 44100,   // Gearlynx's own; the browser converts it for the speaker
});
