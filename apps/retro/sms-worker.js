// Runs Gearsystem (Master System, Game Gear and SG-1000) on its own thread;
// see gear-worker.js. Used by sms.js.

import { runCore } from './gear-worker.js';

runCore({
  db: 'sms', load: () => import('./sms/gearsystem.js'), prefix: 'gs',
  // Gearsystem's key for each bit sms.js sends
  keys: [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0, 0x80],
  hz: { 1: 59.92, 2: 49.7 },   // NTSC and PAL games
});
