// Hocus Pocus, the 1994 shareware episode 1 (v1.1) by Moonlite Software,
// published by Apogee, in DOSBox: the common DOS game page is
// ../_shared/dosgame.js. The game's folder (HOCUS/) is as Apogee's 1hp11.zip
// installs it; what the game writes (HOCUS.SAV, its settings, saved games
// and high scores in one file) goes to the overlay drive in IndexedDB.
//
// The game won't start without HOCUS.SAV ("Please run SETUP"), so the first
// time it gets the one the game's own SETUP.EXE wrote with Sound Blaster
// music and sound effects (four voices, 16-bit mix) and the keyboard.
//
// The game's keys: left and right walk, Ctrl jumps, Alt fires, Up with Alt
// fires upwards, Up flips switches and talks to the wizard, Up and Down ride
// lifts, Esc is the playing menu, F2 saves, F3 restores, F1 is help. The
// menus take arrows and Enter (or an item's first letter); quitting asks Y/N.
//
// The game reads its menus as typed characters, and Ctrl with Enter types
// something else, so the bottom button presses its keys in this order: Y
// (Yes at a question; nothing in a menu), Backspace (rubbing the Y out
// again where the game asks for a saved game's name), Enter, then Ctrl
// (jump). Y and Backspace do nothing while playing.
//
// The game runs at about 18 frames a second however fast the CPU is, so
// DOSBox gets what a fast 386 had (the game asks for at least a 386SX)
// rather than all the car can give it.
import { dosGame } from '../_shared/dosgame.js';

const HOCUS_SAV = 'AQABAAAAAQAAAAAAAAAAAAAAAAAAAA8QAgMNDgsM////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPGVtcHR5PgAAAAAAAAAAAAAAAAAAAAAAAAA8ZW1wdHk+AAAAAAAAAAAAAAAAAAAAAAAAADxlbXB0eT4AAAAAAAAAAAAAAAAAAAAAAAAAPGVtcHR5PgAAAAAAAAAAAAAAAAAAAAAAAAA8ZW1wdHk+AAAAAAAAAAAAAAAAAAAAAAAAADxlbXB0eT4AAAAAAAAAAAAAAAAAAAAAAAAAPGVtcHR5PgAAAAAAAAAAAAAAAAAAAAAAAAA8ZW1wdHk+AAAAAAAAAAAAAAAAAAAAAAAAADxlbXB0eT4AAAAAAAAAAAAAAAAAAAAAAAAAAQEBAQEBAQEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEhvY3VzIFBvY3VzAAAAAAAAAAAAAAAAAAAAQW5kcmUgRm91Y2F1bHQAAAAAAAAAAAAAAABKYW1pZSBDb29rAAAAAAAAAAAAAAAAAAAAAEthcmltIFN1bHRhbgAAAAAAAAAAAAAAAAAAQ2hyaXMgdGVuRGVuAAAAAAAAAAAAAAAAAABIb2N1cyBQb2N1cwAAAAAAAAAAAAAAAAAAAEFuZHJlIEZvdWNhdWx0AAAAAAAAAAAAAAAASmFtaWUgQ29vawAAAAAAAAAAAAAAAAAAAABLYXJpbSBTdWx0YW4AAAAAAAAAAAAAAAAAAENocmlzIHRlbkRlbgAAAAAAAAAAAAAAAAAASG9jdXMgUG9jdXMAAAAAAAAAAAAAAAAAAABBbmRyZSBGb3VjYXVsdAAAAAAAAAAAAAAAAEphbWllIENvb2sAAAAAAAAAAAAAAAAAAAAAS2FyaW0gU3VsdGFuAAAAAAAAAAAAAAAAAABDaHJpcyB0ZW5EZW4AAAAAAAAAAAAAAAAAAEhvY3VzIFBvY3VzAAAAAAAAAAAAAAAAAAAAQW5kcmUgRm91Y2F1bHQAAAAAAAAAAAAAAABKYW1pZSBDb29rAAAAAAAAAAAAAAAAAAAAAEthcmltIFN1bHRhbgAAAAAAAAAAAAAAAAAAQ2hyaXMgdGVuRGVuAAAAAAAAAAAAAAAAAABAQg8AADUMAMAnCQCAGgYAQA0DAEBCDwAANQwAwCcJAIAaBgBADQMAQEIPAAA1DADAJwkAgBoGAEANAwBAQg8AADUMAMAnCQCAGgYAQA0DAAAABAAQAAAAAAAAAAMAAQADAAYA/wDAAAAA';

dosGame({
  id: 'hocus',
  title: 'Hocus Pocus',
  memsize: 16,
  cycles: 8000,
  dir: 'HOCUS',
  exe: 'HOCUS.EXE',
  tapKey: 'enter',
  seed: { 'HOCUS/HOCUS.SAV': Uint8Array.from(atob(HOCUS_SAV), c => c.charCodeAt(0)) },
  pad: {
    a: ['y', 'backspace', 'enter', 'lctrl'],   // jump; OK and Yes (see above)
    b: ['lalt'],                // fire
    x: ['lalt'],
    y: ['up', 'lalt'],          // fire upwards
    lb: ['lctrl'],
    rb: ['lalt'],
    lt: ['up', 'lalt'],
    rt: ['lalt'],
    start: ['escape'],          // the playing menu
    back: ['f2'],               // the save places
  },
});
