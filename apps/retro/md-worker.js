// Runs clownmdemu (Mega Drive / Genesis) on its own thread; see
// gear-worker.js, whose front end shape tools/clownmdemu/web.c copies. Used
// by md.js.

import { runCore } from './gear-worker.js';

runCore({
  db: 'md', load: () => import('./md/clownmdemu.js'), prefix: 'md',
  // clownmdemu's key for each bit md.js sends: the directions, A, B, C,
  // X, Y, Z, Start and Mode
  keys: [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x100, 0x200, 0x400, 0x800],
  hz: { 1: 60 / 1.001, 2: 50 },   // 60 Hz consoles, and Europe's 50 Hz ones
  // The 256-pixel mode fills the same width as the 320-pixel one
  aspect: fn => fn.display_width(),
});
