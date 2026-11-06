// Rise of the Triad: The HUNT Begins, the 1995 shareware episode (v1.3) in
// DOSBox: the common DOS game page is ../_shared/dosgame.js. The game's
// folder (ROTT/) is as Apogee's 1rott13.zip installs it; what the game
// writes (its .ROT settings and scores, ROTTGAM?.ROT saved games) goes to
// the overlay drive in IndexedDB.
//
// The game won't start without SOUND.ROT, which its SETUP.EXE writes, so
// the page writes it the first time: what SETUP wrote here when asked for
// a Sound Blaster (220h, IRQ 7, DMA 1, DOSBox's) for the effects and its FM
// synth for the music, 4 voices, mono, 8 bit. CONFIG.ROT is seeded too, the
// game's own defaults with three changes: low detail and no automatic
// detail (with the CPU slowed 4.5x, turning runs at 27 frames a second at
// low detail, 18 at medium or high), no mouse (a finger on the picture
// would turn you), and the weapon swap on Q instead of Enter, so the bottom
// button can be OK in the menus and fire in the game at once. Both files
// are read a token at a time in this order, so no line may go missing.
//
// On start the game writes its own copy of VENDOR.DOC (kept in its WAD)
// over the folder's if they differ, as they do here (the zip's is a 1998
// update): that goes to the save drive, like anything else it writes.
//
// The game's keys: arrows walk and turn, Ctrl fires, Space opens and
// works switches, right Shift runs, Alt with left/right strafes (and comma
// and period do), Page Up and Page Down look up and down, 1 to 4 pick a
// weapon, Q swaps between your gun and the missile weapon you carry, Tab is
// the map, Esc the menu, Enter picks in it, F2 saves, F3 loads, F5 cycles
// the detail level, F6 quicksaves (after the first save), F9 quickloads.
import { dosGame } from '../_shared/dosgame.js';

const file = lines => new TextEncoder().encode(lines.join('\r\n') + '\r\n');

const SOUND = file([
  ';Rise of the Triad Sound File',
  'Version 13', 'MusicMode 2', 'FXMode 2', 'MusicVolume 196', 'FXVolume 196', 'NumVoices 4', 'NumChannels 1', 'NumBits 8',
  'MidiAddress $330', 'StereoReverse 0',
  'SBType 6', 'SBPort $220', 'SBIrq 7', 'SBDma8 1', 'SBDma16 5', 'SBMidi $ffffffff', 'SBEmu $ffffffff',
]);

const CONFIG = file([
  ';Rise of the Triad Configuration File',
  'Version 13', 'MouseEnabled 0', 'JoystickEnabled 0', 'JoypadEnabled 0', 'JoystickPort 0', 'ViewSize 7', 'MouseAdjustment 5',
  'Threshold 1', 'AutoDetail 0', 'LightDim 0', 'BobbingOn 1', 'DoubleClickSpeed 20', 'MenuFlipSpeed 15', 'DetailLevel 0',
  'FloorCeiling 1', 'Messages 1', 'AutoRun 0', 'GammaIndex 0', 'BlankTime 2',
  // DOS scancodes: Swap is 16 (Q) here, 28 (Enter) in the game's defaults
  'Fire 29', 'Strafe 56', 'Run 54', 'Use 57', 'LookUp 73', 'LookDn 81', 'Swap 16', 'Drop 83', 'TargetUp 71', 'TargetDn 79',
  'SelPistol 2', 'SelDualPistol 3', 'SelMP40 4', 'SelMissile 5', 'AutoRun 58', 'LiveRemRid 88', 'StrafeLeft 51', 'StrafeRight 52',
  'VolteFace 14', 'Aim 30', 'Forward 72', 'Right 77', 'Backward 80', 'Left 75', 'Map 15', 'SendMessage 20', 'DirectMessage 44',
  'MouseButton0 0', 'MouseButton1 1', 'MouseButton2 20', 'DblClickB0 -1', 'DblClickB1 3', 'DblClickB2 -1',
  'JoyButton0 0', 'JoyButton1 1', 'JoyButton2 2', 'JoyButton3 3', 'DblClickJB0 -1', 'DblClickJB1 -1', 'DblClickJB2 -1', 'DblClickJB3 -1',
  'JoyMaxX 0', 'JoyMaxY 0', 'JoyMinX 0', 'JoyMinY 0',
  'DefaultDifficulty 2', 'DefaultPlayerCharacter 0', 'DefaultPlayerColor 0',
  'SecretPassword 7d7e4a2d3b6a0319554654231c',
]);

dosGame({
  id: 'rott',
  title: 'Rise of the Triad',
  memsize: 16,
  dir: 'ROTT',
  exe: 'ROTT.EXE',
  seed: { 'ROTT/SOUND.ROT': SOUND, 'ROTT/CONFIG.ROT': CONFIG },
  pad: {
    a: ['lctrl', 'enter'],      // fire; OK in the menus
    b: ['space'],               // open, switches
    x: ['tab'],                 // the map
    y: ['q'],                   // swap weapons
    lb: ['comma'],              // strafe left
    rb: ['period'],             // strafe right
    lt: ['rshift'],             // run
    rt: ['lctrl'],              // fire
    rx: [['comma'], ['period']],      // the right stick strafes
    ry: [['pageup'], ['pagedown']],   // and looks up and down
    start: ['escape'],
    back: ['f6'],               // quicksave (the first time, the save menu)
  },
});
