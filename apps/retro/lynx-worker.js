// Runs Gearlynx (Atari Lynx) on its own thread; see gear-worker.js. Used
// by lynx.js.

import { runCore } from './gear-worker.js';

runCore({
  db: 'lynx', load: () => import('./lynx/gearlynx.js'), prefix: 'gl',
  // Gearlynx's key for each bit lynx.js sends
  keys: [0x80, 0x40, 0x20, 0x10, 0x01, 0x02, 0x08, 0x04, 0x100],
  hz: { 1: 60 },   // until the game sets the Lynx's refresh rate
  frameMs: fn => fn.frame_us() / 1000,
});
