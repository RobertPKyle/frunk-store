// Wolfenstein 3D, the 1992 shareware episode (v1.4) in DOSBox: the common
// DOS game page is ../_shared/dosgame.js. The game's folder (WOLF3D/) is as
// Apogee's 1wolf14.zip installs it; what the game writes (CONFIG.WL1 with
// its settings and high scores, SAVEGAM?.WL1) goes to the overlay drive in
// IndexedDB. The game finds the Sound Blaster itself (DOSBox's BLASTER
// variable), so nothing is seeded.
//
// The game's keys: arrows walk and turn, Ctrl fires, Space opens, Shift
// runs, Alt with left/right strafes, 1 to 4 pick a weapon, Esc is the menu,
// Enter picks in it, Y confirms. A controller button can hold several keys
// at once: the bottom button is Enter and Ctrl together (Enter does nothing
// in the game, Ctrl nothing in the menus). The top button cycles the four
// weapons with the number keys; the game ignores one it doesn't have yet.
import { dosGame } from '../_shared/dosgame.js';

let weapon = 1;
const nextWeapon = () => [String(weapon = weapon % 4 + 1)];

const game = dosGame({
  id: 'wolf3d',
  title: 'Wolfenstein 3D',
  memsize: 16,
  dir: 'WOLF3D',
  exe: 'WOLF3D.EXE',
  pad: {
    a: ['enter', 'lctrl'],      // OK in menus; fire
    b: ['space'],               // open
    x: ['space'],
    y: nextWeapon,
    lb: ['lalt'],               // strafe with the stick or D-pad
    rb: ['lalt'],
    rt: ['lctrl'],              // fire
    lt: ['lshift'],             // run
    rx: [['lalt', 'left'], ['lalt', 'right']],   // the right stick strafes
    start: ['escape'],
    back: ['escape'],
  },
});

// the on-screen Weapon button, a press at a time
const weaponBtn = document.getElementById('tWeapon');
weaponBtn.addEventListener('pointerdown', e => { e.preventDefault(); game.tapKey(nextWeapon()[0]); });
