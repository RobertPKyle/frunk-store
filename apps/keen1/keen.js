// Commander Keen: Marooned on Mars, the 1990 shareware episode (v1.31) in
// DOSBox: the common DOS game page is ../_shared/dosgame.js. The game's folder
// (KEEN1/) is as Apogee's 1keen.zip installs it; what the game writes
// (CONFIG.CK1, SAVED?.CK1) goes to the overlay drive in IndexedDB. Its only
// sound is the PC speaker.
//
// The game's keys: arrows move, Ctrl jumps (and enters a city on the map), Alt
// starts and stops the pogo, Ctrl and Alt together fire, Space is the status
// screen, Esc asks whether to quit to DOS or the title, F5 asks which of 9
// places to save in (on the map only), Enter picks in the menu.
//
// A controller and the on-screen buttons have no number keys, so Select and
// Save 1 press them in turn, each harmless where it isn't wanted: T (to the
// title, if the quit question is up), F5, 1 (saving there, or loading from
// there if the menu's Continue Game is asking), then Y (overwriting, or closing
// the "press a key" that follows).
//
// The game's speed doesn't depend on the CPU, so DOSBox gets what a fast 386
// had rather than all the car can give it.
import { dosGame } from '../_shared/dosgame.js';

const saveSlot1 = () => {
  ['t', 'f5', '1', 'y', 'y'].forEach((key, i) => setTimeout(() => game.tapKey(key), i * 500));
  return [];
};

const game = dosGame({
  id: 'keen1',
  title: 'Commander Keen',
  memsize: 4,
  cycles: 5000,
  dir: 'KEEN1',
  exe: 'KEEN1.EXE',
  pcSpeaker: true,
  tapKey: 'enter',
  pad: {
    a: ['lctrl', 'enter'],      // jump; OK in the menu (last, as the key it reads)
    b: ['lalt'],                // pogo
    x: ['lctrl', 'lalt'],       // fire
    y: ['space'],               // status
    lb: ['lalt'],
    rb: ['lctrl', 'lalt'],
    lt: ['lalt'],
    rt: ['lctrl', 'lalt'],
    start: ['escape'],
    back: saveSlot1,
  },
});

document.getElementById('tSave').addEventListener('pointerdown', e => { e.preventDefault(); saveSlot1(); });
