// Duke Nukem II, the 1993 shareware episode 1 (v1.0) in DOSBox: the common
// DOS game page is ../_shared/dosgame.js. The game's folder (DUKE2/) is as
// Apogee's 4duke.zip installs it; what the game writes (saved games
// NUKEM2.-S1 to -S8 and their names NUKEM2.-NM, settings NUKEM2.-GT, high
// scores NUKEM2.-V1) goes to the overlay drive in IndexedDB. It finds the
// Sound Blaster and AdLib itself (DOSBox's BLASTER variable), so it starts
// with no setup step.
//
// The game's keys: arrows walk, look and use, Ctrl jumps, Alt fires, Esc asks
// whether to quit (Y says yes), F1 is the options, F2 saves, F3 restores, H
// is help, P pauses. Its menus take Enter or Space and Esc backs out.
//
// Saving asks for a name, and one that's left empty doesn't count. The page's
// keys are held a little while so the game sees them, and an Enter still down
// when the name prompt opens ends it at once, empty. So the bottom button and
// OK press Space, which picks in the menus without that; and Select (Save 1)
// opens the save menu, goes to place 1 (it opens on the last one used, and
// wraps around; the page finds the menu's arrow in the picture), picks it with
// Space, clears the name, types DUKE and presses Enter. Like Load 1 (F3 and
// Space), it only does that while the game is being played: the page reads
// the picture for the game's status bar first, and for the menu's frame
// before going on.
//
// The game keeps the eight names in NUKEM2.-NM (18 bytes each, ending in a
// zero), which it writes only when it's quit from its own menu, not when the
// page is left. So before the game starts, any saved game (NUKEM2.-S1 to -S8)
// without a name gets one, DUKE, or the game would say the place is empty.
import { dosGame } from '../_shared/dosgame.js';

// ---------- the picture ----------

const canvas = document.getElementById('canvas');
const probe = document.createElement('canvas');
probe.width = 320; probe.height = 200;
const probeCtx = probe.getContext('2d', { willReadFrequently: true });
// the game's 320x200 picture, or null in another video mode
function picture() {
  if (canvas.width !== 320 || canvas.height !== 200) return null;
  probeCtx.drawImage(canvas, 0, 0);
  return probeCtx.getImageData(0, 0, 320, 200).data;
}
// how many pixels in a box match
function count(d, x0, y0, x1, y1, test) {
  let n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * 320 + x) * 4; if (test(d[i], d[i + 1], d[i + 2])) n++; }
  return n;
}
const grey = level => (r, g, b) => r === level && g === level && b === level;
// the status bar under the game (dark grey) or a menu's metal frame (light grey)
const bottom = level => { const d = picture(); return d ? count(d, 0, 170, 320, 200, grey(level)) : 0; };
const playing = () => bottom(60) > 1500;
const inMenu = () => bottom(146) > 1500;
// the main menu, by its one yellow line (Ordering Information)
const mainMenu = () => { const d = picture(); return !!d && count(d, 85, 90, 250, 103, (r, g, b) => r > 200 && g > 150 && b < 90) > 150; };
// the game's question box over the play area (quit?): a long unbroken grey
// line (its frame) with long unbroken black rows under it (its inside)
function run(d, y, test) {
  let best = 0, cur = 0;
  for (let x = 0; x < 320; x++) {
    const i = (y * 320 + x) * 4;
    cur = test(d[i], d[i + 1], d[i + 2]) ? cur + 1 : 0;
    if (cur > best) best = cur;
  }
  return best;
}
const question = () => {
  const d = picture();
  if (!d) return false;
  for (let y = 20; y < 100; y++) {
    if (run(d, y, (r, g, b) => r === g && g === b && r >= 109) < 140) continue;
    let inside = true;
    for (let k = 3; k < 10 && inside; k++) inside = run(d, y + k, (r, g, b) => !(r | g | b)) >= 120;
    if (inside) return true;
  }
  return false;
};
// which of the save or restore menu's eight places the arrow is on (1-8), or 0
function slot() {
  const d = picture();
  if (!d) return 0;
  let best = 0, most = 10;
  for (let n = 1; n <= 8; n++) {
    const y = 42 + (n - 1) * 16;
    const lit = count(d, 64, y, 81, y + 12, (r, g, b) => r + g + b > 300);
    if (lit > most) { most = lit; best = n; }
  }
  return best;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(test, ms) {
  for (const t = performance.now(); performance.now() - t < ms; await sleep(100)) if (test()) return true;
  return false;
}

// Opens the save (F2) or restore (F3) menu while the game is being played,
// goes to place 1 and presses the keys in then
let busy = false;
async function macro(fnKey, then) {
  if (busy || !playing()) return;
  busy = true;
  try {
    game.tapKey(fnKey);
    if (!(await until(inMenu, 3000))) return;
    await sleep(400);
    // up to place 1, a step at a time (up from 1 goes round to 8); the arrow
    // blinks, so a look that doesn't find it is tried again
    let at = 0;
    for (let tries = 0; tries < 20 && at !== 1; tries++) {
      at = slot();
      if (at > 1) game.tapKey('up');
      if (at !== 1) await sleep(at ? 250 : 80);
    }
    if (at !== 1) return;
    for (const [key, wait] of then) { game.tapKey(key); await sleep(wait); }
  } finally { busy = false; }
}
// Save in place 1: the name it had is cleared first
const save1 = () => { macro('f2', [['space', 500], ...Array(12).fill(['backspace', 120]), ['d', 150], ['u', 150], ['k', 150], ['e', 150], ['enter', 300]]); return []; };
const load1 = () => { macro('f3', [['space', 300]]); return []; };

// dosgame.js calls a controller button's function on every frame while the
// button is down, so these act once per press: a call that follows another
// within 150 ms is the same press
function perPress(fn) {
  let last = -1e9;
  return () => {
    const now = performance.now();
    if (now - last > 150) fn();
    last = now;
    return [];
  };
}
// Start taps Esc, the page's shortest press, however long it's held (as the
// Menu button does): the quit question takes Esc being let go a moment after
// it opened as its answer, and a held key often lands there
const escape = perPress(() => game.tapKey('escape'));

// Names for the saved games that have none (see above), in NUKEM2.-NM in the
// save overlay; called by dosgame.js once the overlay is loaded, before DOSBox
// starts, as it reads the seed files
const NAMES = 'DUKE2/NUKEM2.-NM', SLOT = 18;
function names() {
  const FS = window.dosFS();
  const dir = '/save/duke2/';
  const exists = path => FS.analyzePath(dir + path).exists;
  const had = exists(NAMES);
  const bytes = new Uint8Array(8 * SLOT);
  if (had) bytes.set(FS.readFile(dir + NAMES).subarray(0, 8 * SLOT));
  let changed = false;
  for (let n = 1; n <= 8; n++) {
    if (!exists(`DUKE2/NUKEM2.-S${n}`) || bytes[(n - 1) * SLOT]) continue;
    bytes.set([...'duke'].map(c => c.charCodeAt(0)), (n - 1) * SLOT);
    changed = true;
  }
  if (had && changed) FS.writeFile(dir + NAMES, bytes);
  return bytes;
}

const game = dosGame({
  id: 'duke2',
  title: 'Duke Nukem II',
  memsize: 16,
  // DOSBox's cycles: as many as the car gives (the default, max). The game
  // draws 17.5 frames a second from about 18,000 cycles up and 15.5 below; with
  // the CPU slowed 4.5x, max reaches 17-18,000 and 16.7-17.2 frames a second.
  dir: 'DUKE2',
  exe: 'NUKEM2.EXE',
  tapKey: 'space',
  seed: { get [NAMES]() { return names(); } },
  pad: {
    a: ['lctrl', 'space'],      // jump; OK in the menus
    b: ['lalt'],                // fire
    x: ['lalt'],
    y: ['y'],                   // yes, at the quit question
    lb: perPress(load1),
    rb: ['lalt'],
    lt: ['lctrl'],
    rt: ['lalt'],
    start: escape,
    back: perPress(save1),
  },
});

document.getElementById('tSave').addEventListener('pointerdown', e => { e.preventDefault(); save1(); });
document.getElementById('tLoad').addEventListener('pointerdown', e => { e.preventDefault(); load1(); });
// for tests
window.duke2 = { game, playing, inMenu, mainMenu, question, slot, save1, load1 };
