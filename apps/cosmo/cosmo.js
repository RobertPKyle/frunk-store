// Cosmo's Cosmic Adventure, the 1992 shareware episode 1 "Forbidden Planet"
// (v1.2) in DOSBox: the common DOS game page is ../_shared/dosgame.js. The
// game's folder (COSMO/) is as Apogee's 1cosmo.zip installs it; what the game
// writes (COSMO1.CFG with its settings and high scores, COSMO1.SV? saved
// games) goes to the overlay drive in IndexedDB. Its music is AdLib (the
// Sound Blaster's FM synth at 388h), its sound effects the PC speaker.
//
// The game's keys: arrows walk, look up and down; Ctrl jumps (and Cosmo
// clings to walls by himself), Alt drops a bomb. Esc (or Q) asks whether to
// quit, which Y answers and any other key doesn't; F1 is the help menu, whose
// S saves and R restores, each asking for a number 1 to 9. The main menu
// takes letters only (B begins a new game, R restores) and any key gets past
// a "press any key".
//
// A controller has no letters or numbers, so the buttons press them with the
// game's own keys, each harmless where it isn't wanted (B, R, Y, 1 and Enter
// do nothing while playing): the bottom button is B and Ctrl together (begin
// a new game in the main menu, which takes no key while Ctrl is down, so B
// goes first; jump), the left button Y and Enter (yes to the quit question;
// OK). Select and the on-screen Save 1 press F1, S, 1, Enter in turn (saving
// in place 1 while playing; the game keeps the start of the level); the top
// button and Load 1 press R, 1, Enter (loading place 1 from the main menu).
// The game's boxes open slowly and drop a key pressed before they're drawn,
// so the keys go 900 ms apart. A score in the high scores asks for a name,
// which Esc (Start) skips.
//
// Below about 7,000 cycles the title and menus stop answering keys, and the
// game runs no faster above that, so DOSBox gets 10,000 (with room to spare)
// rather than all the car can give it.
import { dosGame } from '../_shared/dosgame.js';

// Each key a while after the one before, once the game has drawn its box.
// The page asks for a held button's keys every frame, so only a new press
// (nothing asked for 300 ms) starts the keys again.
let asked = 0, busy = 0;
const keys = list => () => {
  const now = performance.now(), fresh = now - asked > 300;
  asked = now;
  if (!fresh || now < busy) return [];
  list.forEach((key, i) => setTimeout(() => game.tapKey(key), i * 900));
  busy = now + list.length * 900;
  return [];
};
const save1 = keys(['f1', 's', '1', 'enter']);
const load1 = keys(['r', '1', 'enter']);

const game = dosGame({
  id: 'cosmo',
  title: "Cosmo's Cosmic Adventure",
  memsize: 4,
  cycles: 10000,
  dir: 'COSMO',
  exe: 'COSMO1.EXE',
  pcSpeaker: true,
  tapKey: 'enter',
  pad: {
    a: ['b', 'lctrl'],          // Begin in the main menu (first: Ctrl first hides it); jump
    b: ['lalt'],                // bomb
    x: ['y', 'enter'],          // yes to the quit question; OK
    y: load1,
    lb: ['lalt'],
    rb: ['lctrl'],
    lt: ['lalt'],
    rt: ['lctrl'],
    start: ['escape'],
    back: save1,
  },
});

for (const [id, fn] of [['tSave', save1], ['tLoad', load1]]) {
  document.getElementById(id).addEventListener('pointerdown', e => { e.preventDefault(); fn(); });
}
