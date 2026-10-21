// Master System, Game Gear and SG-1000 core: Gearsystem compiled to
// WebAssembly (sms/, GPL-3.0-or-later; built by tools/build-gearsystem.mjs),
// run on its own thread by sms-worker.js (see worker-core.js), which also
// keeps the game's saves.

import { createWorkerCore } from './worker-core.js';

export const createSms = canvas => createWorkerCore(canvas, {
  system: 'sms', worker: new URL('./sms-worker.js', import.meta.url), module: true, width: 256, height: 192,
  // Gearsystem's key bits. The pad's buttons 1 and 2 sit where B and A are;
  // Start is the Game Gear's Start and the Master System's Pause button.
  buttons: { up: 0, down: 1, left: 2, right: 3, b: 4, a: 5, start: 7 },
  same: { y: 'b', x: 'a' },
  sampleRate: 44100,   // Gearsystem's own; the browser converts it for the speaker
});
