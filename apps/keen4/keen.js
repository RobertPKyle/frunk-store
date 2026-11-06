// Commander Keen 4: Secret of the Oracle, the shareware episode of "Goodbye
// Galaxy!" (v1.4) in DOSBox: the common DOS game page is
// ../_shared/dosgame.js. The game's folder (KEEN4/) is as Apogee's 4keen.zip
// installs it; what the game writes (CONFIG.CK4, SAVEGAM?.CK4) goes to the
// overlay drive in IndexedDB. It finds the AdLib (the Sound Blaster's FM
// synth) itself and plays its music and sound there.
//
// The game's keys: arrows move, Ctrl jumps (and enters a level on the map),
// Alt starts and stops the pogo, Space fires, Enter shows the status window,
// Esc opens the menu. In the menu arrows move, Enter or Ctrl picks and Esc
// goes back; Save Game asks for a name, which Enter accepts ("Untitled" if
// none is typed). The menu's letters jump to an item (S Save Game, L Load
// Game) and the save places to 1 to 6.
//
// Select and the on-screen Save 1 save in the first place with a run of
// keys: F3 opens the menu (and does nothing if it's open already), S and
// Enter open Save Game, 1 and Enter pick the first place, Enter keeps its
// name, then Esc, R and Enter go back to the game. (The letters only move the
// cursor; Esc in the main menu would ask about quitting.) It needs the menu
// to move its cursor by keys alone, so the game runs without a mouse.
import { dosGame } from '../_shared/dosgame.js';

// The game reads the keyboard from its own interrupt, so it sees a key the
// moment it goes down; DOSBox repeats a key held for half a second, and a
// repeated Esc or Enter shuts the menu it has just opened. dosgame.js lets a
// key go after two of DOSBox's frames, which it counts only when the picture
// changes, so in the menu (still, but for a blinking cursor) a short press
// could last 600 ms. Counting a frame every 50 ms as well lets it go after
// about 100 ms. keenFrames() is the real count, for tests.
const realStreaming = WebAssembly.instantiateStreaming;
WebAssembly.instantiateStreaming = async (...args) => {
  const r = await realStreaming.apply(WebAssembly, args);
  const exports = { ...r.instance.exports };
  if (exports.web_frames) {
    const frames = exports.web_frames;
    window.keenFrames = () => frames();
    exports.web_frames = () => frames() + Math.floor(performance.now() / 50);
  }
  return { instance: { exports }, module: r.module };
};

// Whether the game's menu is up: its teal border at the picture's top corners
const probe = document.createElement('canvas');
function menuUp() {
  const c = document.getElementById('canvas');
  if (c.width < 320) return false;
  probe.width = c.width; probe.height = c.height;
  const x = probe.getContext('2d', { willReadFrequently: true });
  x.drawImage(c, 0, 0);
  return [[2, 2], [c.width - 3, 2]].every(([px, py]) => {
    const [r, g, b] = x.getImageData(px, py, 1, 1).data;
    return r < 60 && g > 140 && b > 140;
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// The menu takes a while to open the first time in a level (the game reads
// its pictures and sounds), so the run waits for it; if it doesn't come (a
// status window was up, say, and F3 closed it), nothing else is pressed.
// (dosgame.js asks a pad button's function for its keys on every frame the
// button is down, so a run already under way is left to finish.)
let saving = false;
async function save() {
  saving = true;
  try {
    game.tapKey('f3');
    for (const t = performance.now(); !menuUp(); await sleep(100)) if (performance.now() - t > 6000) return;
    await sleep(300);
    for (const key of ['s', 'enter', '1', 'enter', 'enter']) { game.tapKey(key); await sleep(500); }
    // "Saving", then back to Save Game
    await sleep(1500);
    for (const key of ['escape', 'r', 'enter']) { game.tapKey(key); await sleep(500); }
  } finally { saving = false; }
}
const saveSlot1 = () => {
  if (!saving) save();
  return [];
};

const game = dosGame({
  id: 'keen4',
  title: 'Commander Keen 4',
  memsize: 8,
  cycles: 6000,
  dir: 'KEEN4',
  // no mouse: the game's menu moves its cursor with the mouse, and a tap on
  // the screen moves DOSBox's mouse pointer
  exe: 'KEEN4E.EXE /NOMOUSE',
  pcSpeaker: true,
  tapKey: 'enter',
  pad: {
    a: ['lctrl'],               // jump; picks in the menu
    b: ['lalt'],                // pogo
    x: ['space'],               // fire
    y: ['enter'],               // status; picks in the menu, accepts a name
    lb: ['lalt'],
    rb: ['space'],
    lt: ['lalt'],
    rt: ['space'],
    start: ['escape'],
    back: saveSlot1,
  },
});

document.getElementById('tSave').addEventListener('pointerdown', e => { e.preventDefault(); saveSlot1(); });
