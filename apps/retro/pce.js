// PC Engine / TurboGrafx-16 core: Geargrafx compiled to WebAssembly (pce/,
// GPL-3.0-or-later; built by tools/build-geargrafx.mjs), run on its own
// thread by pce-worker.js (see worker-core.js), which also keeps the game's
// saves.

import { createWorkerCore } from './worker-core.js';

export const createPce = canvas => createWorkerCore(canvas, {
  system: 'pce', worker: new URL('./pce-worker.js', import.meta.url), module: true, width: 293, height: 224,
  // Geargrafx's key bits. The pad's buttons II and I sit where B and A are;
  // Run is Start.
  buttons: { up: 0, down: 1, left: 2, right: 3, a: 4, b: 5, select: 6, start: 7 },
  same: { x: 'a', y: 'b' },
  sampleRate: 44100,   // Geargrafx's own; the browser converts it for the speaker
});
