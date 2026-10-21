// NES core: jsnes, run on its own thread by nes-worker.js (see
// worker-core.js), which also keeps the game's saves.

import { createWorkerCore } from './worker-core.js';

export const createNes = canvas => createWorkerCore(canvas, {
  system: 'nes', worker: new URL('./nes-worker.js', import.meta.url), width: 256, height: 240,
  // jsnes button numbers; NES has two face buttons, so X and Y work as A and B
  buttons: { a: 0, b: 1, select: 2, start: 3, up: 4, down: 5, left: 6, right: 7 },
  same: { x: 'a', y: 'b' },
});
