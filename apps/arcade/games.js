// The arcade games whose ROMs mamedev.org gives away for free, non-commercial
// use (https://www.mamedev.org/roms/), with the drivers built into
// engine/arcade.wasm (tools/build-mame.mjs). The ROMs may be downloaded only
// from mamedev.org, so players get each one there on their phone and send it
// to the car. Shared by the car's page and the phone's send page.
//
// set: MAME's name for the game, and its zip's name. stick: 'joy' (joystick),
// 'ana' (an analog control: dial, paddle, trackball or yoke, moved by the
// arrows), or null. buttons: how many action
// buttons. throttle: Star Fire's speed lever.

export const GAMES = [
  { set: 'robby', title: 'Robby Roto', maker: 'Bally/Midway, 1981', stick: 'joy', buttons: 1,
    about: 'Dig through a maze of monsters to free the prisoners, with one bit of magic per maze. Jamie Fenton, who wrote it, made it free.' },
  { set: 'gridlee', title: 'Gridlee', maker: 'Videa, 1982', stick: 'ana', buttons: 1,
    about: 'A trackball game that never reached the arcades, on Howard Delman\'s hardware. The pad rolls the trackball.' },
  { set: 'alienar', title: 'Alien Arena', maker: 'Duncan Brown, 1985', stick: 'joy', buttons: 2,
    about: 'Capture the flag, made by one programmer who worked out Williams\' hardware on his own, and even put on location.' },
  { set: 'supertnk', title: 'Super Tank', maker: 'Video Games GmbH, 1981', stick: 'joy', buttons: 1,
    about: 'Clear a field of mines and enemy tanks, then go after the Super Tank itself.' },
  { set: 'looping', title: 'Looping', maker: 'Video Games GmbH, 1982', stick: 'joy', buttons: 2,
    about: 'Fly through Adventure-Land past balloons and rockets, and loop the loop to reach The End.' },
  { set: 'targ', title: 'Targ', maker: 'Exidy, 1980', stick: 'joy', buttons: 1,
    about: 'Steer the Whummel around Crystal City\'s grid and run down the Targ riders before they get you.' },
  { set: 'spectar', title: 'Spectar', maker: 'Exidy, 1980', stick: 'joy', buttons: 1,
    about: 'Targ\'s sequel: the Targs are back as Rammers, and the Spectars shoot back.' },
  { set: 'sidetrac', title: 'Side Trak', maker: 'Exidy, 1979', stick: 'joy', buttons: 1,
    about: 'Pick up the waiting passengers with your train, switching tracks to dodge the killer engine.' },
  { set: 'crash', title: 'Crash', maker: 'Exidy, 1979', stick: 'joy', buttons: 1,
    about: 'Race a car with no brakes around a maze of dots while the computer\'s cars try to ram you.' },
  { set: 'hardhat', title: 'Hard Hat', maker: 'Exidy, 1982', stick: 'joy', buttons: 1,
    about: 'Billed as the first educational coin-op: a carpenter dodges hammers and whirlwinds while spelling out words.' },
  { set: 'victory', title: 'Victory', maker: 'Exidy, 1982', stick: 'ana', buttons: 4,
    about: 'Fly your Battlestar against the aliens who took your planet, with lasers, shields and a Doomsday Device.' },
  { set: 'starfire', title: 'Star Fire', maker: 'Exidy, 1979', stick: 'ana', buttons: 1, throttle: true,
    about: 'An early first-person space shooter: hunt down enemy craft and dodge their missiles.' },
  { set: 'fireone', title: 'Fire One!', maker: 'Exidy, 1979', stick: 'ana', buttons: 2,
    about: 'A submarine duel against the computer: find the enemy sub before its torpedoes find you.' },
  { set: 'topgunnr', title: 'Top Gunner', maker: 'Exidy, 1986', stick: 'ana', buttons: 2,
    about: 'Said to be the last vector-graphics arcade game: a flight simulator from a motion cockpit.' },
  { set: 'teetert', title: 'Teeter Torture', maker: 'Exidy, 1982', stick: 'ana', buttons: 1,
    about: 'A mystery prototype: only one cabinet has ever been found.' },
  { set: 'fax', title: 'FAX', maker: 'Exidy, 1983', stick: null, buttons: 4,
    about: 'Trivia on general knowledge, sports, history and entertainment, answered with four buttons.' },
  { set: 'circus', title: 'Circus', maker: 'Exidy, 1977', stick: 'ana', buttons: 0,
    about: 'Bounce acrobats off a seesaw to pop rows of balloons. One of Exidy\'s first games with a processor.' },
  { set: 'ripcord', title: 'Rip Cord', maker: 'Exidy, 1979', stick: 'ana', buttons: 2,
    about: 'Time your jump from the plane, then steer your parachute past the helicopters onto a target.' },
  { set: 'robotbwl', title: 'Robot Bowl', maker: 'Exidy, 1977', stick: 'joy', buttons: 2,
    about: 'Bowling with robots: line up, throw, then hook the ball into the pins.' },
  { set: 'carpolo', title: 'Car Polo', maker: 'Exidy, 1977', stick: 'ana', buttons: 3,
    about: 'Bump the ball into your team\'s goal with your car. Insert a coin to start.' },
];

export const BY_SET = new Map(GAMES.map(g => [g.set, g]));

// The biggest of these zips is under 200 KB
export const MAX_ROM_FILE = 8 * 1024 * 1024;

// MAME's name for a sent zip: the file name without ".zip", and without the
// " (1)" a phone adds to a second download of the same file
export function setName(fileName) {
  return fileName.replace(/^.*[\\/]/, '').replace(/\.zip$/i, '').replace(/\s*[-_ ]?\(\d+\)$/, '').trim().toLowerCase();
}

// For the phone page: a zip (by its first bytes), named like a MAME set
export const findRom = async (name, bytes) =>
  /\.zip$/i.test(name) && bytes[0] === 0x50 && bytes[1] === 0x4b && /^[a-z0-9_]{2,16}$/.test(setName(name)) ? { name } : null;
