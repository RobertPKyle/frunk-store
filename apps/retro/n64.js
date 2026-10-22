// Nintendo 64 core: n64js (n64/, MIT; built by tools/build-n64js.mjs with
// tools/n64js/web.js), run on its own thread by n64-worker.js (see
// worker-core.js), which also keeps the game's in-game saves. n64js turns
// the game's code into JavaScript as it goes and draws with WebGL 2. It has
// no snapshots, so a game starts from power-on each time.

import { createWorkerCore } from './worker-core.js';

// The N64 pad's bits
const A = 0x8000, B = 0x4000, Z = 0x2000, START = 0x1000;
const D_UP = 0x0800, D_DOWN = 0x0400, D_LEFT = 0x0200, D_RIGHT = 0x0100;
const L = 0x0020, R = 0x0010, C_UP = 0x0008, C_DOWN = 0x0004, C_LEFT = 0x0002, C_RIGHT = 0x0001;
const STICK = 80;          // how far the stick reaches (about what a real one does)
const DEAD = 0.15;         // analog sticks: this much from the middle counts as the middle

// One player's pad: [buttons, stick x, stick y]. p: their Set of button
// names; s: their sticks, -1 to 1 with down and right positive.
//
// A controller's bottom and left buttons are A and B, as on the N64's pad;
// its triggers and Select are Z, the right stick the C buttons, and its
// right and top buttons C-down and C-left. The touch stick, a controller's
// left stick or the arrow keys move the stick; only a controller's D-pad
// is the D-pad.
function pad(p, s = {}) {
  const has = b => p.has(b);
  let bits = 0;
  if (has('b')) bits |= A;
  if (has('y')) bits |= B;
  if (has('select') || has('lt') || has('rt') || has('z')) bits |= Z;
  if (has('start')) bits |= START;
  if (has('lb') || (has('l') && !has('lt'))) bits |= L;
  if (has('rb') || (has('r') && !has('rt'))) bits |= R;
  if (has('dup')) bits |= D_UP;
  if (has('ddown')) bits |= D_DOWN;
  if (has('dleft')) bits |= D_LEFT;
  if (has('dright')) bits |= D_RIGHT;
  if (has('cu') || s.cy < -0.5) bits |= C_UP;
  if (has('cd') || has('a') || s.cy > 0.5) bits |= C_DOWN;
  if (has('cl') || has('x') || s.cx < -0.5) bits |= C_LEFT;
  if (has('cr') || s.cx > 0.5) bits |= C_RIGHT;
  let x = s.x || 0, y = s.y || 0;
  if (Math.hypot(x, y) < DEAD) {
    // arrow keys (and the touch stick's own directions), but not the D-pad
    x = (has('right') && !has('dright')) - (has('left') && !has('dleft'));
    y = (has('down') && !has('ddown')) - (has('up') && !has('dup'));
    if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
  }
  return [bits, Math.round(x * STICK), Math.round(-y * STICK)];
}

export const createN64 = canvas => createWorkerCore(canvas, {
  system: 'n64', worker: new URL('./n64-worker.js', import.meta.url), module: true, width: 320, height: 240,
  // n64-worker.js's input: each player's pad, then whether a second
  // controller is there to plug in as player 2
  encode: (players, { sticks = [], pads = 0 } = {}) => [...pad(players[0], sticks[0]), ...pad(players[1], sticks[1]), pads >= 2 ? 1 : 0],
});
