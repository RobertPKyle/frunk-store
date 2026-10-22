// Mega Drive / Genesis core: clownmdemu compiled to WebAssembly (md/,
// AGPL-3.0-or-later; built by tools/build-clownmdemu.mjs), run on its own
// thread by md-worker.js (see worker-core.js), which also keeps the game's
// saves.

import { createWorkerCore } from './worker-core.js';

export const createMd = canvas => createWorkerCore(canvas, {
  system: 'md', worker: new URL('./md-worker.js', import.meta.url), module: true, width: 320, height: 224,
  // md-worker.js's bits. The pad's A, B and C sit where a controller's
  // left, bottom and right buttons are (Y, B and A in the names retro.js
  // uses); the six-button pad's X, Y and Z are L, the top button and R, and
  // Mode is Select.
  buttons: { up: 0, down: 1, left: 2, right: 3, y: 4, b: 5, a: 6, l: 7, x: 8, r: 9, start: 10, select: 11 },
  sampleRate: 44100,   // web.c's; the browser converts it for the speaker
});
