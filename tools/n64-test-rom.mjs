// A tiny Nintendo 64 test cartridge for the e2e checks, made from scratch
// (there's no free N64 game that n64js boots: today's homebrew uses
// libdragon's boot code, which n64js doesn't get past). Its program sits
// where a cartridge's boot code goes, so n64js runs it straight from the
// RSP's memory after its simulated power-on. It turns on the video output
// at 320x240 and a 250 Hz tone, and, at each vertical blank, reads
// controller 1 and has the RSP draw a display list, as games do, into one
// of two pictures while the other is shown, then shows it: the picture
// filled with one colour (red while a button is held, green while
// the stick is pushed left or right, else blue; or magenta when a button
// was pressed on an earlier run, which it keeps in the cartridge's EEPROM,
// so magenta shows that the in-game save was kept), then small shaded
// triangles in the top left corner, each drawn on its own as a game's
// models are.
//
// The display list is in the first microcode's commands (Fast3D's, which
// n64js uses for tasks it doesn't recognise; no microcode is included).
//
//   import { n64TestRom } from './n64-test-rom.mjs';
//   n64TestRom() -> Buffer; n64TestRom({ triangles: 400 }) for more drawing;
//   n64TestRom({ work: { code, count } }) also runs code (a MIPS function
//   work(frame, count), built to run at 0x80380000, with its data after it
//   below 3.75 MB, where its stack starts) once a frame, for benchmarking

const REG = {
  zero: 0, a0: 4, a1: 5, t0: 8, t1: 9, t2: 10, t3: 11, t4: 12, t5: 13, t6: 14, t7: 15,
  s0: 16, s1: 17, s2: 18, s3: 19, t9: 25, sp: 29, ra: 31,
};
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
      xor: () => r(0, R(b), R(c), R(a), 0, 0x26),
      jalr: () => r(0, R(a), 0, 31, 0, 0x09),
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
  [0x04, 0x00100000],   // picture at 1 MB (and the other at 1.25 MB)
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

// The graphics data goes from the cartridge, after the boot code, to RDRAM
// at 2.5 MB; the task's description goes at the end of the RSP's memory,
// where libultra puts it
const DATA_ROM = 0x1000, DATA = 0x00280000, TASK = 0xa4000fc0;
const NO_UCODE = 0x002c0000;   // (zeros: no microcode)

// The display list's commands (Fast3D)
const G = {
  MTX: 0x01, MOVEMEM: 0x03, VTX: 0x04, SETGEOMETRYMODE: 0xb7, ENDDL: 0xb8, SETOTHERMODE_H: 0xba, TRI1: 0xbf,
  RDPFULLSYNC: 0xe9, RDPPIPESYNC: 0xe7, SETSCISSOR: 0xed, FILLRECT: 0xf6, SETFILLCOLOR: 0xf7, SETCOMBINE: 0xfc, SETCIMG: 0xff,
};

// The graphics data: matrices, viewport, vertices and the display list.
// Returns the bytes and where the picture's address, the fill colour and
// the list are in RDRAM.
function graphicsData(triangles) {
  const buf = Buffer.alloc(0x100 + triangles * 48 + 0x100 + triangles * 16);
  // A matrix (s15.16, rows of integer parts, then of fractions)
  const matrix = (at, m) => m.forEach((v, n) => {
    const f = Math.round(v * 65536);
    buf.writeInt16BE(f >> 16, at + n * 2);
    buf.writeUInt16BE(f & 0xffff, at + 32 + n * 2);
  });
  // Pixels to the screen: x right, y down, from the top left
  matrix(0x00, [1 / 160, 0, 0, 0, 0, -1 / 120, 0, 0, 0, 0, 1, 0, -1, 1, 0, 1]);
  matrix(0x40, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  // The viewport: half the screen's size and its middle, in quarter pixels
  [640, 480, 511, 0, 640, 480, 511, 0].forEach((v, n) => buf.writeInt16BE(v, 0x80 + n * 2));
  // Triangles in a grid of 7-pixel cells, 20 to a row
  for (let t = 0; t < triangles; t++) {
    const x = 4 + (t % 20) * 7, y = 4 + Math.floor(t / 20) * 7;
    [[x, y], [x + 6, y], [x, y + 6]].forEach(([vx, vy], n) => {
      const at = 0x100 + t * 48 + n * 16;
      buf.writeInt16BE(vx, at);
      buf.writeInt16BE(vy, at + 2);
      buf.writeUInt32BE([0xff4000ff, 0x40ff00ff, 0x0040ffff][(t + n) % 3], at + 12);   // r g b a
    });
  }
  const list = 0x100 + triangles * 48;
  let at = list;
  const cmd = (w0, w1) => { buf.writeUInt32BE(w0 >>> 0, at); buf.writeUInt32BE(w1 >>> 0, at + 4); at += 8; };
  const picture = at + 4;
  cmd(G.SETCIMG << 24 | 2 << 19 | 319, 0x00100000);                 // RGBA 16-bit, 320 wide (where: the program says)
  cmd(G.SETSCISSOR << 24, 320 * 4 << 12 | 240 * 4);
  cmd(G.RDPPIPESYNC << 24, 0);
  cmd(G.SETOTHERMODE_H << 24 | 20 << 8 | 2, 3 << 20);               // fill
  const fill = at + 4;
  cmd(G.SETFILLCOLOR << 24, BLUE);                                  // (the program sets the colour)
  cmd(G.FILLRECT << 24 | 319 << 14 | 239 << 2, 0);
  cmd(G.RDPPIPESYNC << 24, 0);
  cmd(G.SETOTHERMODE_H << 24 | 20 << 8 | 2, 0);                     // one cycle
  // the shade colour, for colour and alpha
  cmd(G.SETCOMBINE << 24 | 15 << 20 | 31 << 15 | 7 << 12 | 7 << 9 | 15 << 5 | 31,
    15 << 28 | 15 << 24 | 7 << 21 | 7 << 18 | 4 << 15 | 7 << 12 | 4 << 9 | 4 << 6 | 7 << 3 | 4);
  cmd(G.MOVEMEM << 24 | 0x80 << 16 | 16, DATA + 0x80);              // the viewport
  cmd(G.MTX << 24 | 3 << 16 | 64, DATA);                            // projection, loaded
  cmd(G.MTX << 24 | 2 << 16 | 64, DATA + 0x40);                     // model view, loaded
  cmd(G.SETGEOMETRYMODE << 24, 0x204);                              // smooth shading
  for (let t = 0; t < triangles; t++) {
    cmd(G.VTX << 24 | 2 << 20 | 48, DATA + 0x100 + t * 48);
    cmd(G.TRI1 << 24, 0 << 16 | 10 << 8 | 20);
  }
  cmd(G.RDPFULLSYNC << 24, 0);
  cmd(G.ENDDL << 24, 0);
  return { bytes: buf.subarray(0, at), picture: DATA + picture, fill: DATA + fill, list: DATA + list, size: at - list };
}

// Writes words to memory from address at
const store = (at, words) => [
  ...li('t2', at),
  ...words.flatMap((v, n) => v ? [...li('t1', v), ['sw', 't1', n * 4, 't2']] : [['sw', 'zero', n * 4, 't2']]),
];

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

// work: the function run each frame (see n64TestRom), or none
const WORK = 0x00380000, STACK = 0x803c0000;
const program = ({ picture, fill, list, size, length, work }) => [
  ...li('t0', 0xa4400000),
  ...VI.flatMap(([off, v]) => [...li('t1', v), ['sw', 't1', off, 't0']]),

  // Sound: 16-bit stereo at 32 kHz (the video clock, 48681812 Hz, / 1521)
  ...li('s1', 0xa4500000),
  ...li('t1', 1520), ['sw', 't1', 0x10, 's1'],             // AI_DACRATE
  ...li('t1', 15), ['sw', 't1', 0x14, 's1'],               // AI_BITRATE
  ...li('t1', 1), ['sw', 't1', 0x08, 's1'],                // AI_CONTROL: DMA on
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

  // The graphics data, by the cartridge's DMA
  ...li('t0', 0xa4600000),
  ...li('t1', DATA), ['sw', 't1', 0x00, 't0'],                 // PI_DRAM_ADDR
  ...li('t1', 0x10000000 + DATA_ROM), ['sw', 't1', 0x04, 't0'],  // PI_CART_ADDR
  ...li('t1', length - 1), ['sw', 't1', 0x0c, 't0'],          // PI_WR_LEN: from the cartridge
  'pi', ['lw', 't1', 0x10, 't0'], ['andi', 't1', 't1', 3],     // PI_STATUS: wait while busy
  ['bne', 't1', 'zero', 'pi'], ['nop'],
  // The task: graphics (type 1), its display list
  ...store(TASK, [1, 0, 0, 0, NO_UCODE, 0, NO_UCODE, 0, 0, 0, 0, 0, list, size, 0, 0]),
  // s2: the picture drawn into, the one not shown
  ...li('s2', 0x00140000),
  // the work function, by the cartridge's DMA; s3 counts frames for it
  ...(work ? [
    ...li('t0', 0xa4600000),
    ...li('t1', WORK), ['sw', 't1', 0x00, 't0'],
    ...li('t1', 0x10000000 + work.rom), ['sw', 't1', 0x04, 't0'],
    ...li('t1', work.code.length - 1), ['sw', 't1', 0x0c, 't0'],
    'workpi', ['lw', 't1', 0x10, 't0'], ['andi', 't1', 't1', 3],
    ['bne', 't1', 'zero', 'workpi'], ['nop'],
    ...li('sp', STACK), ...li('s3', 0),
  ] : []),

  // Controller 1: "read buttons" (1 byte out, 4 back), then the end mark
  ...block(0x200040, [0x01040100, 0x000000fe]),
  // The EEPROM (the fifth channel, after four skipped): read block 0 (2
  // bytes out, 8 back), and write 0x5a to it (10 out, 1 back)
  ...block(0x200080, [0, 0x02080400, 0, 0, 0xfe000000]),
  ...block(0x2000c0, [0, 0x0a010500, 0x5a000000, 0, 0x00fe0000]),

  // s0: the colour shown when nothing's held: magenta when the EEPROM says
  // a button was pressed on an earlier run, else blue
  ...exchange(0x00200080),
  ...li('t2', 0xa0200000), ['lw', 't3', 8, 't2'], ['srl', 't3', 't3', 24],
  ['addiu', 't9', 'zero', 0x5a],
  ...li('s0', BLUE),
  ['bne', 't3', 't9', 'main'], ['nop'],
  ...li('s0', MAGENTA),

  'main',
  // wait for a vertical blank (MI_INTR's VI bit), and clear it
  ...li('t0', 0xa4300000),
  'vblank', ['lw', 't1', 0x08, 't0'], ['andi', 't1', 't1', 8],
  ['beq', 't1', 'zero', 'vblank'], ['nop'],
  ...li('t0', 0xa4400000), ['sw', 'zero', 0x10, 't0'],
  ...exchange(0x00200040),
  ...li('t2', 0xa0200000),
  ['lw', 't3', 0, 't2'],
  ['lw', 't4', 4, 't2'],
  ['andi', 't3', 't3', 0xff], ['sll', 't3', 't3', 8],
  ['srl', 't5', 't4', 24], ['or', 't3', 't3', 't5'],    // t3: buttons
  ['srl', 't4', 't4', 16], ['andi', 't4', 't4', 0xff],  // t4: stick x
  // queue the tone whenever the audio interface has room (AI_STATUS's top
  // bit: both its buffers are taken)
  ['lw', 't1', 0x0c, 's1'],
  ['bltz', 't1', 'queued'], ['nop'],
  ...li('t1', 0x00300000), ['sw', 't1', 0x00, 's1'],   // AI_DRAM_ADDR
  ...li('t1', 4096), ['sw', 't1', 0x04, 's1'],         // AI_LEN
  'queued',
  ['or', 't7', 's0', 'zero'],
  ['beq', 't4', 'zero', 'buttons'], ['nop'],
  ...li('t7', GREEN),
  'buttons',
  ['beq', 't3', 'zero', 'fill'], ['nop'],
  ...li('t7', RED),
  ...exchange(0x002000c0),
  'fill',
  ...(work ? [
    ['or', 'a0', 's3', 'zero'], ...li('a1', work.count),
    ...li('t9', 0x80000000 + WORK), ['jalr', 't9'], ['nop'],
    ['addiu', 's3', 's3', 1],
  ] : []),
  // the picture and colour into the display list, then the RSP started
  // (SP_STATUS: clear halt and broke) and waited for (halted again)
  ...li('t5', 0xa0000000 + picture), ['sw', 's2', 0, 't5'],
  ...li('t5', 0xa0000000 + fill), ['sw', 't7', 0, 't5'],
  ...li('t0', 0xa4040000),
  ...li('t1', 5), ['sw', 't1', 0x10, 't0'],
  'rsp', ['lw', 't1', 0x10, 't0'], ['andi', 't1', 't1', 1],
  ['beq', 't1', 'zero', 'rsp'], ['nop'],
  // show it (VI_ORIGIN), and draw into the other next time
  ...li('t0', 0xa4400000), ['sw', 's2', 0x04, 't0'],
  ...li('t1', 0x00100000 ^ 0x00140000), ['xor', 's2', 's2', 't1'],
  ['j', 'main'], ['nop'],
];

export function n64TestRom({ triangles = 16, work = null } = {}) {
  const rom = Buffer.alloc(0x101000);
  rom.writeUInt32BE(0x80371240, 0);   // cartridge settings, as every game has
  rom.writeUInt32BE(0x0000000f, 4);   // clock rate
  rom.writeUInt32BE(0x80000400, 8);   // boot address
  rom.writeUInt32BE(0x0000144b, 12);
  rom.write('FRNKTEST', 16, 'latin1');  // checksum words; n64js names saves after them
  rom.write('FRUNK N64 TEST'.padEnd(20), 32, 'latin1');
  rom.write('NFTE', 59, 'latin1');    // cartridge, id "FT", North America
  const data = graphicsData(triangles);
  if (DATA_ROM + data.bytes.length > rom.length) throw new Error('too many triangles for the test cartridge');
  data.bytes.copy(rom, DATA_ROM);
  if (work) {
    work = { ...work, rom: (DATA_ROM + data.bytes.length + 15) & ~15 };
    if (work.rom + work.code.length > rom.length) throw new Error('the work function doesn\'t fit');
    work.code.copy(rom, work.rom);
  }
  const code = assemble(program({ ...data, length: data.bytes.length, work }), 0xa4000040);
  // (the task's description follows it)
  if (code.length > (TASK - 0xa4000040) / 4) throw new Error('the test program is bigger than the boot code\'s room');
  code.forEach((w, n) => rom.writeUInt32BE(w, 0x40 + n * 4));
  return rom;
}
