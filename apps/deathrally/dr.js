// Death Rally, the 1996 shareware episode (v1.1) in DOSBox: the common DOS
// game page is ../_shared/dosgame.js. The game's folder (RALLY/) is as
// Apogee's 1ral11.zip has it; what the game writes (DR.CFG with its settings
// and records, saved games) goes to the overlay drive in IndexedDB.
//
// DR.CFG is seeded the first time with the sound setup the game's SETUP.EXE
// would write for DOSBox's Sound Blaster 16 (220h, IRQ 7, DMA 1) and the
// keys set so the arrows do everything in a race: Up accelerates and Down
// brakes (the game's defaults are A and Z), left and right steer, Enter
// fires the machine gun (the game's default is Ctrl), Alt drops a mine,
// Shift is turbo and Space the horn. So a controller's stick or D-pad races
// and works the menus alike, and its bottom button is OK and the gun.
import { dosGame } from '../_shared/dosgame.js';
import { DR_CFG } from './drcfg.js';

dosGame({
  id: 'deathrally',
  title: 'Death Rally',
  memsize: 16,
  dir: 'RALLY',
  exe: 'RALLY.EXE',
  seed: { 'RALLY/DR.CFG': DR_CFG },
  pad: {
    a: ['enter'],               // OK in menus; the machine gun in a race (DR.CFG puts the gun on Enter)
    b: ['lalt'],                // mine
    x: ['space'],               // horn
    y: ['lshift'],              // turbo
    lb: ['lshift'],
    rb: ['lshift'],
    rt: ['up'],                 // accelerate
    lt: ['down'],               // brake
    start: ['escape'],
    back: ['escape'],
  },
});
