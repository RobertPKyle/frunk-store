// Blake Stone: Aliens of Gold, the shareware episode 1 (v3.0, 1994) by JAM
// Productions in DOSBox: the common DOS game page is ../_shared/dosgame.js.
// The game's folder (BSTONE/) is as Apogee's 1bs30.zip installs it; what the
// game writes (its settings, high scores and saved games) goes to the
// overlay drive in IndexedDB. The game finds the Sound Blaster itself
// (DOSBox's BLASTER variable).
//
// The game's keys are Wolfenstein 3D's: arrows walk and turn, Ctrl fires,
// Space opens and uses (and talks to informants), Shift runs, Alt with
// left/right strafes, 1 to 5 pick a weapon, Esc is the menu, Enter picks in
// it, Y answers yes. The bottom button is Enter and Ctrl together (Enter
// does nothing in the game, Ctrl nothing in the menus). The top button
// cycles the five weapons; the game ignores one it doesn't have yet.
import { dosGame } from '../_shared/dosgame.js';

let weapon = 1;
const nextWeapon = () => [String(weapon = weapon % 5 + 1)];

const game = dosGame({
  id: 'blake',
  title: 'Blake Stone',
  memsize: 16,
  dir: 'BSTONE',
  exe: 'BS_AOG.EXE',
  pad: {
    a: ['enter', 'lctrl'],      // OK in menus; fire
    b: ['space'],               // open, use
    x: ['space'],
    y: nextWeapon,
    lb: ['lalt'],               // strafe with the stick or D-pad
    rb: ['lalt'],
    rt: ['lctrl'],              // fire
    lt: ['lshift'],             // run
    rx: [['lalt', 'left'], ['lalt', 'right']],   // the right stick strafes
    start: ['escape'],
    back: ['y'],                // yes at the game's questions
  },
});

// the on-screen Weapon button, a press at a time
document.getElementById('tWeapon').addEventListener('pointerdown', e => { e.preventDefault(); game.tapKey(nextWeapon()[0]); });
