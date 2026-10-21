// Runs Geargrafx (PC Engine / TurboGrafx-16) on its own thread; see
// gear-worker.js. Used by pce.js.

import { runCore } from './gear-worker.js';

runCore({
  db: 'pce', load: () => import('./pce/geargrafx.js'), prefix: 'gg',
  // Geargrafx's key for each bit pce.js sends
  keys: [0x10, 0x40, 0x80, 0x20, 0x01, 0x02, 0x04, 0x08],
  hz: { 1: 59.83 },   // 263 lines of 1365 master clocks
  // The console's pixels are wider than tall, more so in its wider modes
  aspect: fn => Math.round(fn.display_width() / 1000),
});
