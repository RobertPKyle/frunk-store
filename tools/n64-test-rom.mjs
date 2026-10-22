// A tiny Nintendo 64 test cartridge for the e2e checks, made from scratch
// (there's no free N64 game that n64js boots: today's homebrew uses
// libdragon's boot code, which n64js doesn't get past). Its program sits
// where a cartridge's boot code goes, so n64js runs it straight from the
// RSP's memory after its simulated power-on. It turns on the video output
// at 320x240 and a 250 Hz tone, and, over and over, reads controller 1 and
// fills the picture with one colour: red while a button is held, green while
// the stick is pushed left or right, else blue; or magenta when a button
// was pressed on an earlier run, which it keeps in the cartridge's EEPROM
// (so magenta shows that the in-game save was kept).
//
//   import { n64TestRom } from './n64-test-rom.mjs'; n64TestRom() -> Buffer

const REG = { zero: 0, v0: 2, v1: 3, t0: 8, t1: 9, t2: 10, t3: 11, t4: 12, t5: 13, t6: 14, t7: 15, t9: 25 };
const r = (op, rs, rt, rd, sa, funct) => (op << 26 | rs << 21 | rt << 16 | rd << 11 | sa << 6 | funct) >>> 0;
const i = (op, rs, rt, imm) => (op << 26 | rs << 21 | rt << 16 | (imm & 0xffff)) >>> 0;

// Assembles the program; labels are resolved in a second pass
function assemble(lines, base) {
  const labels = {};
  let pc = base;
  for (const l of lines) typeof l === 'string' ? labels[l] = pc : pc += 4;
  const words = [];
  pc = base;
  for (const l of lines) {
    if (typeof l === 'string') continue;
    const [name, a, b, c] = l;
    const R = x => REG[x];
    const branch = target => ((labels[target] - (pc + 4)) >> 2);
    words.push({
      lui: () => i(0x0f, 0, R(a), b >>> 16),
      ori: () => i(0x0d, R(b), R(a), c),
      addiu: () => i(0x09, R(b), R(a), c),
      andi: () => i(0x0c, R(b), R(a), c),
      lw: () => i(0x23, R(c), R(a), b),
      sw: () => i(0x2b, R(c), R(a), b),
      sll: () => r(0, 0, R(b), R(a), c, 0x00),
      srl: () => r(0, 0, R(b), R(a), c, 0x02),
      or: () => r(0, R(b), R(c), R(a), 0, 0x25),
      beq: () => i(0x04, R(a), R(b), branch(c)),
      bne: () => i(0x05, R(a), R(b), branch(c)),
      bltz: () => i(0x01, R(a), 0, branch(b)),
      j: () => (2 << 26 | (labels[a] >>> 2 & 0x3ffffff)) >>> 0,
      nop: () => 0,
    }[name]());
    pc += 4;
  }
  return words;
}

// li: lui + ori
const li = (reg, v) => [['lui', reg, v >>> 0], ['ori', reg, reg, v & 0xffff]];

// The video interface for 320x240 16-bit NTSC, as libdragon sets it
const VI = [
  [0x00, 0x00003202],   // control: 16-bit colour, resampling
  [0x04, 0x00100000],   // picture at 1 MB
  [0x08, 320],          // width
  [0x0c, 2],            // interrupt line
  [0x14, 0x03e52239],   // burst
  [0x18, 0x0000020d],   // lines per field
  [0x1c, 0x00000c15],
  [0x20, 0x0c150c15],
  [0x24, 0x006c02ec],   // horizontal video
  [0x28, 0x002501ff],   // vertical video
  [0x2c, 0x000e0204],
  [0x30, 0x00000200],   // x scale: 320 of 640
  [0x34, 0x00000400],   // y scale: 240 of 240
];

// Two RGBA 5551 pixels each
const BLUE = 0x003f003f, RED = 0xf801f801, GREEN = 0x07c107c1, MAGENTA = 0xf83ff83f;

// Runs a block of commands for the PIF (64 bytes in RDRAM at block) as games
// do: the serial interface's DMA copies it to the PIF's RAM, then back to
// RDRAM at 2 MB, which runs it, with the answers in place
let exchanges = 0;
function exchange(block) {
  const w = `written${exchanges}`, r = `read${exchanges++}`;
  return [
    ...li('t0', 0xa4800000),
    ...li('t1', block), ['sw', 't1', 0x00, 't0'],         // SI_DRAM_ADDR
    ...li('t1', 0x1fc007c0), ['sw', 't1', 0x10, 't0'],    // SI_PIF_ADDR_WR64B
    w, ['lw', 't1', 0x18, 't0'], ['andi', 't1', 't1', 3],  // SI_STATUS: wait while busy
    ['bne', 't1', 'zero', w], ['nop'],
    ...li('t1', 0x00200000), ['sw', 't1', 0x00, 't0'],
    ...li('t1', 0x1fc007c0), ['sw', 't1', 0x04, 't0'],    // SI_PIF_ADDR_RD64B
    r, ['lw', 't1', 0x18, 't0'], ['andi', 't1', 't1', 3],
    ['bne', 't1', 'zero', r], ['nop'],
  ];
}

// Writes a PIF command block: its words from the start, then the "take
// these" flag in its last byte
const block = (at, words) => [
  ...li('t2', 0xa0000000 + at),
  ...words.flatMap((v, n) => v ? [...li('t1', v), ['sw', 't1', n * 4, 't2']] : [['sw', 'zero', n * 4, 't2']]),
  ...li('t1', 1), ['sw', 't1', 0x3c, 't2'],
];

const program = [
  ...li('t0', 0xa4400000),
  ...VI.flatMap(([off, v]) => [...li('t1', v), ['sw', 't1', off, 't0']]),

  // Sound: 16-bit stereo at 32 kHz (the video clock, 48681812 Hz, / 1521)
  ...li('v1', 0xa4500000),
  ...li('t1', 1520), ['sw', 't1', 0x10, 'v1'],             // AI_DACRATE
  ...li('t1', 15), ['sw', 't1', 0x14, 'v1'],               // AI_BITRATE
  ...li('t1', 1), ['sw', 't1', 0x08, 'v1'],                // AI_CONTROL: DMA on
  // a quiet 250 Hz square wave, 1024 samples at 3 MB
  ...li('t5', 0xa0300000), ...li('t6', 0), ['addiu', 't9', 'zero', 1024],
  'tone',
  ['andi', 't1', 't6', 64],
  ...li('t7', 0x08000800),
  ['bne', 't1', 'zero', 'high'], ['nop'],
  ...li('t7', 0xf800f800),
  'high',
  ['sw', 't7', 0, 't5'], ['addiu', 't5', 't5', 4], ['addiu', 't6', 't6', 1],
  ['bne', 't6', 't9', 'tone'], ['nop'],

  // Controller 1: "read buttons" (1 byte out, 4 back), then the end mark
  ...block(0x200040, [0x01040100, 0x000000fe]),
  // The EEPROM (the fifth channel, after four skipped): read block 0 (2
  // bytes out, 8 back), and write 0x5a to it (10 out, 1 back)
  ...block(0x200080, [0, 0x02080400, 0, 0, 0xfe000000]),
  ...block(0x2000c0, [0, 0x0a010500, 0x5a000000, 0, 0x00fe0000]),

  // v0: the colour shown when nothing's held: magenta when the EEPROM says
  // a button was pressed on an earlier run, else blue
  ...exchange(0x00200080),
  ...li('t2', 0xa0200000), ['lw', 't3', 8, 't2'], ['srl', 't3', 't3', 24],
  ['addiu', 't9', 'zero', 0x5a],
  ...li('v0', BLUE),
  ['bne', 't3', 't9', 'main'], ['nop'],
  ...li('v0', MAGENTA),

  'main',
  ...exchange(0x00200040),
  ...li('t2', 0xa0200000),
  ['lw', 't3', 0, 't2'],
  ['lw', 't4', 4, 't2'],
  ['andi', 't3', 't3', 0xff], ['sll', 't3', 't3', 8],
  ['srl', 't5', 't4', 24], ['or', 't3', 't3', 't5'],    // t3: buttons
  ['srl', 't4', 't4', 16], ['andi', 't4', 't4', 0xff],  // t4: stick x
  // queue the tone whenever the audio interface has room (AI_STATUS's top
  // bit: both its buffers are taken)
  ['lw', 't1', 0x0c, 'v1'],
  ['bltz', 't1', 'queued'], ['nop'],
  ...li('t1', 0x00300000), ['sw', 't1', 0x00, 'v1'],   // AI_DRAM_ADDR
  ...li('t1', 4096), ['sw', 't1', 0x04, 'v1'],         // AI_LEN
  'queued',
  ['or', 't7', 'v0', 'zero'],
  ['beq', 't4', 'zero', 'buttons'], ['nop'],
  ...li('t7', GREEN),
  'buttons',
  ['beq', 't3', 'zero', 'fill'], ['nop'],
  ...li('t7', RED),
  ...exchange(0x002000c0),
  'fill',
  ...li('t5', 0xa0100000),
  ...li('t6', 320 * 240 / 2),
  'pixel',
  ['sw', 't7', 0, 't5'],
  ['addiu', 't5', 't5', 4],
  ['addiu', 't6', 't6', -1],
  ['bne', 't6', 'zero', 'pixel'], ['nop'],
  ['j', 'main'], ['nop'],
];

export function n64TestRom() {
  const rom = Buffer.alloc(0x101000);
  rom.writeUInt32BE(0x80371240, 0);   // cartridge settings, as every game has
  rom.writeUInt32BE(0x0000000f, 4);   // clock rate
  rom.writeUInt32BE(0x80000400, 8);   // boot address
  rom.writeUInt32BE(0x0000144b, 12);
  rom.write('FRNKTEST', 16, 'latin1');  // checksum words; n64js names saves after them
  rom.write('FRUNK N64 TEST'.padEnd(20), 32, 'latin1');
  rom.write('NFTE', 59, 'latin1');    // cartridge, id "FT", North America
  const code = assemble(program, 0xa4000040);
  if (code.length > (0x1000 - 0x40) / 4) throw new Error('the test program is bigger than the boot code\'s room');
  code.forEach((w, n) => rom.writeUInt32BE(w, 0x40 + n * 4));
  return rom;
}
