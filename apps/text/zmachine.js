// A Z-machine: the virtual computer Infocom's games (and Inform's since) run
// on. Plays story files of versions 1 to 5, 7 and 8, which is everything
// but the graphical version 6, after The Z-Machine Standards Document 1.1.
// No DOM in here, so the same code runs in the page and in Node tests.
//
//   const vm = new ZMachine(story, { print, status, save, restore });
//   let w = vm.run();          // runs until the game waits:
//                              // { type: 'line' | 'char' | 'quit' | 'busy' | 'error' }
//   vm.sendLine('open mailbox'); w = vm.run();
//
// print(text, style) gets the main window's text; style is a mix of STYLE
// bits. The upper window (status lines, quote boxes) is kept here as rows
// of characters for the page to draw (upperRows(), upperChanged). In
// versions 1 to 3 the status line comes through status({ room, right }).
// save(state) keeps a saved game and returns true when it could; restore()
// returns one (or null). States are plain objects of numbers and typed
// arrays, so they go into IndexedDB as they are. snapshot() takes one while
// the game waits for input; restoring it asks for that input again, which
// is what the page's undo and autosave use.

export const STYLE = { reverse: 1, bold: 2, italic: 4, fixed: 8, input: 16 };

export class ZError extends Error {}

// ZSCII 155 to 223 by default (Standard 3.8.5.3)
const UNICODE = 'äöüÄÖÜß»«ëïÿËÏáéíóúýÁÉÍÓÚÝàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛåÅøØãñõÃÑÕæÆçÇþðÞÐ£œŒ¡¿';
const A0 = 'abcdefghijklmnopqrstuvwxyz';
const A1 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
// The first two of A2 are the escape and new line, never printed from here
const A2 = ' \n0123456789.,!?_#\'"/\\-:()';
const A2_V1 = ' 0123456789.,!?_#\'"/\\<-:()';

const s16 = v => (v << 16) >> 16;

// Release, serial number and checksum: which story, and which edition of it
export function storyId(mem) {
  const serial = String.fromCharCode(...mem.subarray(0x12, 0x18)).replace(/[^\x20-\x7e]/g, '?');
  return `${(mem[2] << 8) | mem[3]}.${serial}.${(mem[0x1c] << 8) | mem[0x1d]}`;
}

export class ZMachine {
  constructor(story, io = {}, { cols = 80, rows = 25, seed } = {}) {
    const v = story[0];
    if (![1, 2, 3, 4, 5, 7, 8].includes(v)) throw new ZError(v === 6 ? 'graphical (version 6) games aren\'t supported' : 'not a story file');
    this.io = io;
    this.v = v;
    this.original = story.slice();
    this.mem = story.slice();
    this.id = storyId(story);
    this.cols = cols;
    this.rows = rows;
    this.ops = new Uint16Array(8);
    this.stack = new Uint16Array(32768);
    this.seed(seed ?? (Math.random() * 2 ** 32) >>> 0);

    const m = this.mem, rw = a => (m[a] << 8) | m[a + 1];
    this.dict = rw(0x08);
    this.objects = rw(0x0a);
    this.globals = rw(0x0c);
    this.staticBase = rw(0x0e);
    this.abbrevs = rw(0x18);
    this.objSize = v <= 3 ? 9 : 14;
    this.objBase = this.objects + (v <= 3 ? 62 : 126);
    this.pack = v <= 3 ? 2 : v <= 5 || v === 7 ? 4 : 8;
    this.routineOffset = v === 7 ? 8 * rw(0x28) : 0;
    this.stringOffset = v === 7 ? 8 * rw(0x2a) : 0;
    if (this.staticBase < 64 || this.staticBase > m.length || rw(0x06) >= m.length) throw new ZError('not a story file');

    // Alphabets as ZSCII codes; version 5 and up may bring their own
    const codes = s => [...s].map(c => c.charCodeAt(0));
    this.alpha = [codes(A0), codes(A1), codes(v === 1 ? A2_V1 : A2)];
    const table = v >= 5 ? rw(0x34) : 0;
    if (table) for (let a = 0; a < 3; a++) this.alpha[a] = [...m.subarray(table + 26 * a, table + 26 * a + 26)];
    // ZSCII 155 and up, from the header extension's table when there is one
    this.unicode = [...UNICODE].map(c => c.codePointAt(0));
    const ext = v >= 5 ? rw(0x36) : 0;
    if (ext && rw(ext) >= 3 && rw(ext + 6)) {
      const t = rw(ext + 6);
      this.unicode = [];
      for (let i = 0; i < m[t]; i++) this.unicode.push(rw(t + 1 + 2 * i));
    }
    this.restart(false);
  }

  // ---------- memory ----------

  rw(a) { return (this.mem[a] << 8) | this.mem[a + 1]; }
  wb(a, value) {
    if (a >= this.staticBase) throw new ZError(`the game wrote outside its memory (${a})`);
    this.mem[a] = value;
  }
  ww(a, value) {
    if (a + 1 >= this.staticBase) throw new ZError(`the game wrote outside its memory (${a})`);
    this.mem[a] = (value >> 8) & 255;
    this.mem[a + 1] = value & 255;
  }

  // The interpreter's part of the header, set at the start, on restart and
  // after a restore
  header() {
    const m = this.mem, v = this.v;
    if (v <= 3) {
      m[1] = (m[1] & ~0x10) | 0x20 | 0x40;   // status line yes, split screen yes, the usual font isn't fixed-pitch
    } else {
      m[1] = (m[1] & ~(0x01 | 0x02 | 0x20 | 0x80)) | 0x04 | 0x08 | 0x10;   // bold, italic, fixed; no colours, pictures, sound, timed input
      m[0x1e] = 6;           // IBM PC, which is what most games know best
      m[0x1f] = 'A'.charCodeAt(0);
      m[0x20] = Math.min(255, this.rows);
      m[0x21] = Math.min(255, this.cols);
    }
    if (v >= 5) {
      // no pictures, mouse, colours, sound or menus; undo yes
      m[0x11] &= ~(0x08 | 0x20 | 0x40 | 0x80);
      m[0x10] &= ~0x01;
      m[0x22] = 0; m[0x23] = Math.min(255, this.cols);
      m[0x24] = 0; m[0x25] = Math.min(255, this.rows);
      m[0x26] = 1; m[0x27] = 1;
      m[0x2c] = 2; m[0x2d] = 9;   // white on black, by number; the page picks the real colours
    }
    m[0x32] = 1; m[0x33] = 1;
  }

  // The page's text area, in characters of its fixed-width font
  setScreen(cols, rows) {
    this.cols = Math.max(20, cols);
    this.rows = Math.max(10, rows);
    this.header();
  }

  // Starts the game over. The header's transcript and fixed-pitch bits
  // survive it, as the Standard asks.
  restart(tell = true) {
    if (tell) this.flush();
    const keep = this.mem[0x11] & 0x03;
    this.mem.set(this.original);
    this.mem[0x11] = (this.mem[0x11] & ~0x03) | keep;
    this.header();
    this.sp = 0;
    this.frame = { ret: 0, store: -1, locals: new Uint16Array(15), nLocals: 0, nArgs: 0, base: 0 };
    this.frames = [this.frame];
    this.pc = this.rw(0x06);
    this.waiting = null;
    this.style = 0;
    this.font = 1;
    this.window = 0;
    this.screenOn = true;
    this.memStreams = [];
    this.upper = [];
    this.upperHeight = 0;
    this.cursor = { row: 1, col: 1 };
    this.upperChanged = true;
    this.undos = [];
    this.out = '';
    if (tell) this.io.restart?.();
  }

  // ---------- running ----------

  // Runs until the game waits for the player, ends, or has run `budget`
  // instructions (then { type: 'busy' }: call again to go on)
  run(budget = 1e6) {
    if (this.waiting && this.waiting.type !== 'busy') return this.waiting;
    this.waiting = null;
    try {
      for (let n = 0; n < budget && !this.waiting; n++) this.step();
      if (!this.waiting) this.waiting = { type: 'busy' };
    } catch (e) {
      this.waiting = { type: 'error', message: e instanceof ZError ? e.message : `${e.message || e} (at ${this.instr})` };
    }
    this.flush();
    return this.waiting;
  }

  // Finishes a read: the player's line, written into the game's buffers
  sendLine(text) {
    const w = this.waiting;
    if (!w || w.type !== 'line') throw new ZError('the game isn\'t waiting for a line');
    this.waiting = null;
    this.print(text, STYLE.input);
    this.print('\n');
    const codes = this.toZscii(text.toLowerCase()).slice(0, w.max);
    if (this.v <= 4) {
      codes.forEach((c, i) => this.wb(w.text + 1 + i, c));
      this.wb(w.text + 1 + codes.length, 0);
    } else {
      codes.forEach((c, i) => this.wb(w.text + 2 + i, c));
      this.wb(w.text + 1, codes.length);
    }
    if (w.parse) this.tokenise(w.text, w.parse, this.dict, 0);
    if (this.v >= 5) this.store(13);
  }

  // Finishes a read_char with a ZSCII code (13 Enter, 27 Escape, 8 delete,
  // 129 to 132 the arrows)
  sendChar(code) {
    if (!this.waiting || this.waiting.type !== 'char') throw new ZError('the game isn\'t waiting for a key');
    this.waiting = null;
    this.store(code);
  }

  step() {
    const m = this.mem, ops = this.ops;
    this.instr = this.pc;
    const op = m[this.pc++];
    if (op < 0x80) {
      // long form: two operands, each a small constant or a variable
      ops[0] = op & 0x40 ? this.readVar(m[this.pc++]) : m[this.pc++];
      ops[1] = op & 0x20 ? this.readVar(m[this.pc++]) : m[this.pc++];
      return this.op2(op & 0x1f, 2);
    }
    if (op < 0xc0) {
      const type = (op >> 4) & 3;
      if (type === 3) {
        if (op === 0xbe && this.v >= 5) {
          const ext = m[this.pc++];
          return this.opExt(ext, this.operands(m[this.pc++], 0));
        }
        return this.op0(op & 0x0f);
      }
      ops[0] = this.operand(type);
      return this.op1(op & 0x0f);
    }
    // variable form; call_vs2 and call_vn2 have two bytes of types
    let n;
    if (op === 0xec || op === 0xfa) {
      const t1 = m[this.pc++], t2 = m[this.pc++];
      n = this.operands(t1, 0);
      if (n === 4) n = this.operands(t2, 4);
    } else {
      n = this.operands(m[this.pc++], 0);
    }
    return op < 0xe0 ? this.op2(op & 0x1f, n) : this.opVar(op & 0x1f, n);
  }

  operand(type) {
    const m = this.mem;
    if (type === 0) { const w = (m[this.pc] << 8) | m[this.pc + 1]; this.pc += 2; return w; }
    if (type === 1) return m[this.pc++];
    return this.readVar(m[this.pc++]);
  }

  // Reads up to four operands by a types byte into ops[at...]; returns how
  // many operands there are in all
  operands(types, at) {
    let n = at;
    for (let shift = 6; shift >= 0; shift -= 2) {
      const t = (types >> shift) & 3;
      if (t === 3) break;
      this.ops[n++] = this.operand(t);
    }
    return n;
  }

  // ---------- variables ----------

  push(value) {
    if (this.sp >= this.stack.length) throw new ZError('the game\'s stack overflowed');
    this.stack[this.sp++] = value;
  }
  pop() {
    if (this.sp <= this.frame.base) throw new ZError('the game\'s stack underflowed');
    return this.stack[--this.sp];
  }
  readVar(n) {
    if (n === 0) return this.pop();
    if (n < 16) return this.frame.locals[n - 1];
    const a = this.globals + 2 * (n - 16);
    return (this.mem[a] << 8) | this.mem[a + 1];
  }
  writeVar(n, value) {
    value &= 0xffff;
    if (n === 0) this.push(value);
    else if (n < 16) this.frame.locals[n - 1] = value;
    else this.ww(this.globals + 2 * (n - 16), value);
  }
  // Opcodes that name a variable (inc, store, load...) use the top of the
  // stack in place rather than pushing or popping (Standard 6.3.4)
  peekVar(n) {
    if (n !== 0) return this.readVar(n);
    if (this.sp <= this.frame.base) throw new ZError('the game\'s stack underflowed');
    return this.stack[this.sp - 1];
  }
  pokeVar(n, value) {
    if (n !== 0) return this.writeVar(n, value);
    if (this.sp <= this.frame.base) throw new ZError('the game\'s stack underflowed');
    this.stack[this.sp - 1] = value & 0xffff;
  }

  store(value) { this.writeVar(this.mem[this.pc++], value); }

  branch(cond) {
    const m = this.mem;
    const b = m[this.pc++];
    let off;
    if (b & 0x40) off = b & 0x3f;
    else {
      off = ((b & 0x3f) << 8) | m[this.pc++];
      if (off & 0x2000) off -= 0x4000;
    }
    if (!(b & 0x80) !== !cond) return;   // bit 7: branch when the test is true
    if (off === 0 || off === 1) return this.ret(off);
    this.pc += off - 2;
  }

  // ---------- routines ----------

  call(packed, argsAt, nArgs, store) {
    if (packed === 0) { if (store >= 0) this.writeVar(store, 0); return; }
    const a = this.pack * packed + this.routineOffset;
    const m = this.mem;
    const nLocals = m[a];
    if (nLocals > 15 || a >= m.length) throw new ZError(`the game called a routine that isn't one (${a})`);
    const locals = new Uint16Array(15);
    let p = a + 1;
    if (this.v <= 4) for (let i = 0; i < nLocals; i++, p += 2) locals[i] = (m[p] << 8) | m[p + 1];
    for (let i = 0; i < nArgs && i < nLocals; i++) locals[i] = this.ops[argsAt + i];
    this.frame = { ret: this.pc, store, locals, nLocals, nArgs, base: this.sp };
    this.frames.push(this.frame);
    if (this.frames.length > 1024) throw new ZError('the game called too many routines inside each other');
    this.pc = p;
  }

  ret(value) {
    if (this.frames.length <= 1) throw new ZError('the game returned from its main routine');
    const f = this.frames.pop();
    this.frame = this.frames[this.frames.length - 1];
    this.sp = f.base;
    this.pc = f.ret;
    if (f.store >= 0) this.writeVar(f.store, value);
  }

  // ---------- opcodes ----------

  op2(code, n) {
    const o = this.ops;
    switch (code) {
      case 1: {   // je
        let eq = false;
        for (let i = 1; i < n; i++) if (o[i] === o[0]) eq = true;
        return this.branch(eq);
      }
      case 2: return this.branch(s16(o[0]) < s16(o[1]));   // jl
      case 3: return this.branch(s16(o[0]) > s16(o[1]));   // jg
      case 4: {   // dec_chk
        const value = s16(this.peekVar(o[0]) - 1);
        this.pokeVar(o[0], value);
        return this.branch(value < s16(o[1]));
      }
      case 5: {   // inc_chk
        const value = s16(this.peekVar(o[0]) + 1);
        this.pokeVar(o[0], value);
        return this.branch(value > s16(o[1]));
      }
      case 6: return this.branch(this.parent(o[0]) === o[1]);   // jin
      case 7: return this.branch((o[0] & o[1]) === o[1]);       // test
      case 8: return this.store(o[0] | o[1]);
      case 9: return this.store(o[0] & o[1]);
      case 10: return this.branch(this.attr(o[0], o[1]));
      case 11: return this.setAttr(o[0], o[1], true);
      case 12: return this.setAttr(o[0], o[1], false);
      case 13: return this.pokeVar(o[0], o[1]);                 // store
      case 14: return this.insertObj(o[0], o[1]);
      case 15: return this.store(this.rw((o[0] + 2 * o[1]) & 0xffff));   // loadw
      case 16: return this.store(this.mem[(o[0] + o[1]) & 0xffff]);      // loadb
      case 17: return this.store(this.getProp(o[0], o[1]));
      case 18: return this.store(this.findProp(o[0], o[1])[0]);
      case 19: return this.store(this.nextProp(o[0], o[1]));
      case 20: return this.store(o[0] + o[1]);
      case 21: return this.store(o[0] - o[1]);
      case 22: return this.store(Math.imul(s16(o[0]), s16(o[1])));
      case 23:
        if (!o[1]) throw new ZError('the game divided by zero');
        return this.store(Math.trunc(s16(o[0]) / s16(o[1])));
      case 24:
        if (!o[1]) throw new ZError('the game divided by zero');
        return this.store(s16(o[0]) % s16(o[1]));
      case 25: if (this.v >= 4) return this.call(o[0], 1, n - 1, this.mem[this.pc++]); break;   // call_2s
      case 26: if (this.v >= 5) return this.call(o[0], 1, n - 1, -1); break;                    // call_2n
      case 27: if (this.v >= 5) return; break;                                                  // set_colour
      case 28:   // throw
        if (this.v < 5) break;
        if (o[1] < 1 || o[1] > this.frames.length) throw new ZError('the game threw to a routine that had returned');
        this.frames.length = o[1];
        this.frame = this.frames[o[1] - 1];
        return this.ret(o[0]);
    }
    throw new ZError(`unknown instruction (2OP:${code}) at ${this.instr}`);
  }

  op1(code) {
    const a = this.ops[0];
    switch (code) {
      case 0: return this.branch(a === 0);   // jz
      case 1: { const s = this.sibling(a); this.store(s); return this.branch(s !== 0); }
      case 2: { const c = this.child(a); this.store(c); return this.branch(c !== 0); }
      case 3: return this.store(this.parent(a));
      case 4: return this.store(this.propLen(a));
      case 5: return this.pokeVar(a, this.peekVar(a) + 1);   // inc
      case 6: return this.pokeVar(a, this.peekVar(a) - 1);   // dec
      case 7: return this.print(this.decode(a).text);        // print_addr
      case 8: if (this.v >= 4) return this.call(a, 1, 0, this.mem[this.pc++]); break;   // call_1s
      case 9: return this.removeObj(a);
      case 10: return this.print(this.objName(a));
      case 11: return this.ret(a);
      case 12: this.pc += s16(a) - 2; return;                // jump
      case 13: return this.print(this.decode(this.pack * a + this.stringOffset).text);   // print_paddr
      case 14: return this.store(this.peekVar(a));           // load
      case 15:
        if (this.v <= 4) return this.store(~a);              // not
        return this.call(a, 1, 0, -1);                       // call_1n
    }
    throw new ZError(`unknown instruction (1OP:${code}) at ${this.instr}`);
  }

  op0(code) {
    const v = this.v;
    switch (code) {
      case 0: return this.ret(1);
      case 1: return this.ret(0);
      case 2: { const s = this.decode(this.pc); this.pc = s.end; return this.print(s.text); }   // print
      case 3: { const s = this.decode(this.pc); this.pc = s.end; this.print(s.text + '\n'); return this.ret(1); }   // print_ret
      case 4: return;   // nop
      case 5:   // save
        if (v <= 3) return this.branch(this.save());
        if (v === 4) return this.store(this.save() ? 1 : 0);
        break;
      case 6:   // restore
        if (v <= 3) { if (!this.restoreSaved()) this.branch(false); return; }
        if (v === 4) { if (!this.restoreSaved()) this.store(0); return; }
        break;
      case 7: return this.restart();
      case 8: return this.ret(this.pop());   // ret_popped
      case 9:
        if (v <= 4) { this.pop(); return; }  // pop
        return this.store(this.frames.length);   // catch
      case 10: this.waiting = { type: 'quit' }; return;
      case 11: return this.print('\n');
      case 12: if (v <= 3) this.showStatus(); return;   // show_status
      case 13: return this.branch(this.verify());
      case 15: return this.branch(true);   // piracy: genuine
    }
    throw new ZError(`unknown instruction (0OP:${code}) at ${this.instr}`);
  }

  opVar(code, n) {
    const o = this.ops, v = this.v;
    switch (code) {
      case 0: return this.call(o[0], 1, n - 1, this.mem[this.pc++]);   // call_vs
      case 1: return this.ww((o[0] + 2 * o[1]) & 0xffff, o[2]);        // storew
      case 2: return this.wb((o[0] + o[1]) & 0xffff, o[2] & 255);       // storeb
      case 3: return this.putProp(o[0], o[1], o[2]);
      case 4: return this.read(o[0], n > 1 ? o[1] : 0);
      case 5: return this.print(this.zsciiChar(o[0]));
      case 6: return this.print(String(s16(o[0])));
      case 7: return this.store(this.random(s16(o[0])));
      case 8: return this.push(o[0]);
      case 9: return this.pokeVar(o[0], this.pop());   // pull
      case 10: return this.splitWindow(o[0]);
      case 11: return this.setWindow(o[0]);
      case 12: if (v >= 4) return this.call(o[0], 1, n - 1, this.mem[this.pc++]); break;   // call_vs2
      case 13: return this.eraseWindow(s16(o[0]));
      case 14: if (o[0] === 1 && this.window === 1) this.eraseLine(); return;
      case 15:   // set_cursor
        if (this.window === 1 && s16(o[0]) > 0) {
          this.cursor.row = o[0];
          this.cursor.col = Math.max(1, n > 1 ? o[1] : 1);
        }
        return;
      case 16:   // get_cursor
        this.ww(o[0], this.window === 1 ? this.cursor.row : this.upperHeight + 1);
        return this.ww(o[0] + 2, this.window === 1 ? this.cursor.col : 1);
      case 17:   // set_text_style
        this.flush();
        this.style = o[0] === 0 ? 0 : this.style | (o[0] & 15);
        return;
      case 18: return;   // buffer_mode
      case 19: return this.outputStream(s16(o[0]), o[1]);
      case 20: return;   // input_stream
      case 21: if (n > 0 && (o[0] === 1 || o[0] === 2)) this.io.beep?.(o[0]); return;   // sound_effect: just the bleeps
      case 22: if (v >= 4) { this.flush(); this.waiting = { type: 'char' }; return; } break;   // read_char
      case 23: {   // scan_table
        if (v < 4) break;
        const form = n > 3 ? o[3] : 0x82, size = form & 0x7f, words = form & 0x80;
        for (let i = 0, a = o[1]; i < o[2]; i++, a += size) {
          if ((words ? this.rw(a) : this.mem[a]) === o[0]) { this.store(a); return this.branch(true); }
        }
        this.store(0);
        return this.branch(false);
      }
      case 24: if (v >= 5) return this.store(~o[0]); break;   // not
      case 25: case 26: if (v >= 5) return this.call(o[0], 1, n - 1, -1); break;   // call_vn, call_vn2
      case 27: if (v >= 5) return this.tokenise(o[0], o[1], n > 2 && o[2] ? o[2] : this.dict, n > 3 ? o[3] : 0); break;
      case 28: if (v >= 5) return this.encodeText(o[0], o[1], o[2], o[3]); break;
      case 29: if (v >= 5) return this.copyTable(o[0], o[1], s16(o[2])); break;
      case 30: if (v >= 5) return this.printTable(o[0], o[1], n > 2 ? o[2] : 1, n > 3 ? o[3] : 0); break;
      case 31: if (v >= 5) return this.branch(o[0] <= this.frame.nArgs); break;   // check_arg_count
    }
    throw new ZError(`unknown instruction (VAR:${code}) at ${this.instr}`);
  }

  opExt(code, n) {
    const o = this.ops;
    switch (code) {
      case 0: return this.store(n > 0 ? 0 : this.save() ? 1 : 0);   // save; saving part of memory to a file isn't offered
      case 1:   // restore
        if (n > 0 || !this.restoreSaved()) this.store(0);
        return;
      case 2: { const p = s16(o[1]); return this.store(p >= 0 ? o[0] << p : o[0] >>> -p); }        // log_shift
      case 3: { const p = s16(o[1]); return this.store(p >= 0 ? o[0] << p : s16(o[0]) >> -p); }    // art_shift
      case 4: {   // set_font: normal and fixed-pitch only
        const was = this.font;
        if (o[0] === 0) return this.store(was);
        if (o[0] !== 1 && o[0] !== 4) return this.store(0);
        this.flush();
        this.font = o[0];
        return this.store(was);
      }
      case 9:   // save_undo; a few turns are kept
        this.undos.push(this.state('undo'));
        if (this.undos.length > 10) this.undos.shift();
        return this.store(1);
      case 10:   // restore_undo
        if (!this.undos.length) return this.store(0);
        this.load(this.undos.pop());
        return this.store(2);
      case 11: return this.print(String.fromCodePoint(o[0]));   // print_unicode
      case 12: return this.store(o[0] >= 32 && o[0] < 0xd800 ? 3 : 0);   // check_unicode: printable and typeable
      case 13: return;   // set_true_colour
    }
    throw new ZError(`unknown instruction (EXT:${code}) at ${this.instr}`);
  }

  // ---------- objects ----------

  objAddr(o) { return this.objBase + (o - 1) * this.objSize; }
  parent(o) { if (!o) return 0; const a = this.objAddr(o); return this.v <= 3 ? this.mem[a + 4] : this.rw(a + 6); }
  sibling(o) { if (!o) return 0; const a = this.objAddr(o); return this.v <= 3 ? this.mem[a + 5] : this.rw(a + 8); }
  child(o) { if (!o) return 0; const a = this.objAddr(o); return this.v <= 3 ? this.mem[a + 6] : this.rw(a + 10); }
  link(o, which, value) {   // which: 0 parent, 1 sibling, 2 child
    const a = this.objAddr(o);
    if (this.v <= 3) this.wb(a + 4 + which, value);
    else this.ww(a + 6 + 2 * which, value);
  }
  propTable(o) { return this.rw(this.objAddr(o) + (this.v <= 3 ? 7 : 12)); }

  attr(o, n) { return o !== 0 && (this.mem[this.objAddr(o) + (n >> 3)] & (0x80 >> (n & 7))) !== 0; }
  setAttr(o, n, on) {
    if (!o) return;
    const a = this.objAddr(o) + (n >> 3), bit = 0x80 >> (n & 7);
    this.wb(a, on ? this.mem[a] | bit : this.mem[a] & ~bit);
  }

  removeObj(o) {
    const p = this.parent(o);
    if (!o || !p) return;
    const next = this.sibling(o);
    if (this.child(p) === o) this.link(p, 2, next);
    else {
      for (let c = this.child(p); c; c = this.sibling(c)) {
        if (this.sibling(c) === o) { this.link(c, 1, next); break; }
      }
    }
    this.link(o, 0, 0);
    this.link(o, 1, 0);
  }

  insertObj(o, dest) {
    if (!o || !dest) return;
    this.removeObj(o);
    this.link(o, 1, this.child(dest));
    this.link(dest, 2, o);
    this.link(o, 0, dest);
  }

  objName(o) {
    if (!o) return '';
    const t = this.propTable(o);
    return this.mem[t] ? this.decode(t + 1).text : '';
  }

  // [number, length, data address] of the property at a, or null at the end
  prop(a) {
    const b = this.mem[a];
    if (b === 0) return null;
    if (this.v <= 3) return [b & 31, (b >> 5) + 1, a + 1];
    if (b & 0x80) return [b & 63, (this.mem[a + 1] & 63) || 64, a + 2];
    return [b & 63, b & 0x40 ? 2 : 1, a + 1];
  }
  firstProp(o) { const t = this.propTable(o); return t + 1 + 2 * this.mem[t]; }
  // [data address, length] of object o's property p, or [0, 0]
  findProp(o, p) {
    if (!o) return [0, 0];
    for (let a = this.firstProp(o), q; (q = this.prop(a)); a = q[2] + q[1]) {
      if (q[0] === p) return [q[2], q[1]];
      if (q[0] < p) break;   // they're in descending order
    }
    return [0, 0];
  }
  getProp(o, p) {
    const [a, len] = this.findProp(o, p);
    if (!a) return this.rw(this.objects + 2 * (p - 1));
    return len === 1 ? this.mem[a] : this.rw(a);
  }
  putProp(o, p, value) {
    const [a, len] = this.findProp(o, p);
    if (!a) throw new ZError(`the game set property ${p}, which object ${o} doesn't have`);
    if (len === 1) this.wb(a, value & 255);
    else this.ww(a, value);
  }
  nextProp(o, p) {
    if (!o) return 0;
    let a = this.firstProp(o), q = this.prop(a);
    if (p !== 0) {
      while (q && q[0] !== p) { a = q[2] + q[1]; q = this.prop(a); }
      if (!q) return 0;
      a = q[2] + q[1];
      q = this.prop(a);
    }
    return q ? q[0] : 0;
  }
  propLen(a) {
    if (!a) return 0;
    const b = this.mem[a - 1];
    if (this.v <= 3) return (b >> 5) + 1;
    if (b & 0x80) return (b & 63) || 64;
    return b & 0x40 ? 2 : 1;
  }

  // ---------- text ----------

  // The Z-string at a: { text, end } with end the address after it
  decode(a, nested = false) {
    const m = this.mem, v = this.v;
    let text = '', alphabet = 0, lock = 0, abbrev = -1, esc = -1, hi = 0;
    for (;;) {
      const w = (m[a] << 8) | m[a + 1];
      a += 2;
      for (let shift = 10; shift >= 0; shift -= 5) {
        const z = (w >> shift) & 31;
        if (abbrev >= 0) {
          const at = 2 * this.rw(this.abbrevs + 2 * (32 * abbrev + z));
          if (!nested) text += this.decode(at, true).text;
          abbrev = -1;
          continue;
        }
        if (esc === 0) { hi = z; esc = 1; continue; }
        if (esc === 1) { text += this.zsciiChar((hi << 5) | z); esc = -1; continue; }
        if (z === 0) { text += ' '; alphabet = lock; continue; }
        if (z === 1 && v === 1) { text += '\n'; alphabet = lock; continue; }
        if (z < 4 && (v >= 3 || (v === 2 && z === 1))) { abbrev = z - 1; continue; }
        if (z < 6) {
          if (v >= 3) alphabet = z === 4 ? 1 : 2;
          else if (z === 2 || z === 3) alphabet = (lock + z - 1) % 3;   // shift up or down, once
          else lock = alphabet = (lock + z - 3) % 3;                    // 4, 5: shift lock
          continue;
        }
        if (alphabet === 2 && z === 6) { esc = 0; alphabet = lock; continue; }
        if (alphabet === 2 && z === 7 && v >= 2) text += '\n';
        else text += this.zsciiChar(this.alpha[alphabet][z - 6]);
        alphabet = lock;
      }
      if (w & 0x8000 || a >= m.length) break;
    }
    return { text, end: a };
  }

  zsciiChar(c) {
    if (c === 13 || c === 10) return '\n';
    if (c >= 32 && c <= 126) return String.fromCharCode(c);
    if (c === 11) return ' ';
    if (c === 9) return '\t';
    if (c >= 155 && c - 155 < this.unicode.length) return String.fromCodePoint(this.unicode[c - 155]);
    return '';
  }

  // Text the player typed, as ZSCII codes; characters the game can't take
  // are left out
  toZscii(text) {
    const out = [];
    for (const ch of text) {
      const c = ch.codePointAt(0);
      if (c >= 32 && c <= 126) out.push(c);
      else {
        const i = this.unicode.indexOf(c);
        if (i >= 0) out.push(155 + i);
      }
    }
    return out;
  }

  // ZSCII codes to the dictionary's form: 2 words (6 z-chars) in versions
  // 1 to 3, 3 words (9 z-chars) after
  encode(codes) {
    const res = this.v <= 3 ? 6 : 9;
    const z = [];
    const up = this.v <= 2 ? 2 : 4, down = this.v <= 2 ? 3 : 5;
    for (const c of codes) {
      if (z.length >= res) break;
      let i;
      if ((i = this.alpha[0].indexOf(c)) >= 0) z.push(i + 6);
      else if ((i = this.alpha[1].indexOf(c)) >= 0) z.push(up, i + 6);
      else if ((i = this.alpha[2].indexOf(c, this.v === 1 ? 1 : 2)) >= 0) z.push(down, i + 6);
      else z.push(down, 6, (c >> 5) & 31, c & 31);
    }
    while (z.length < res) z.push(5);
    const words = [];
    for (let i = 0; i < res; i += 3) words.push((z[i] << 10) | (z[i + 1] << 5) | z[i + 2]);
    words[words.length - 1] |= 0x8000;
    return words;
  }

  // The dictionary entry for a word (ZSCII codes), or 0
  lookup(codes, dict = this.dict) {
    const m = this.mem;
    const words = this.encode(codes);
    const seps = m[dict];
    const entryLen = m[dict + 1 + seps];
    let count = s16(this.rw(dict + 2 + seps));
    const start = dict + 4 + seps;
    const cmp = a => {
      for (let i = 0; i < words.length; i++) {
        const d = words[i] - this.rw(a + 2 * i);
        if (d) return d;
      }
      return 0;
    };
    if (count < 0) {   // unsorted
      for (let i = 0; i < -count; i++) if (cmp(start + i * entryLen) === 0) return start + i * entryLen;
      return 0;
    }
    let lo = 0, hi = count - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1, d = cmp(start + mid * entryLen);
      if (d === 0) return start + mid * entryLen;
      if (d > 0) lo = mid + 1; else hi = mid - 1;
    }
    return 0;
  }

  // Whether the game knows a word the player tapped
  knows(word) { return this.lookup(this.toZscii(word.toLowerCase())) !== 0; }

  // Splits the text buffer into words and looks each up (Standard 13.6)
  tokenise(text, parse, dict, skipUnknown) {
    const m = this.mem;
    const first = this.v <= 4 ? text + 1 : text + 2;
    const end = this.v <= 4 ? (() => { let e = first; while (m[e]) e++; return e; })() : first + m[text + 1];
    const seps = new Set(m.subarray(dict + 1, dict + 1 + m[dict]));
    const words = [];
    let start = -1;
    for (let a = first; a <= end; a++) {
      const c = a < end ? m[a] : 32;
      if (c === 32 || seps.has(c)) {
        if (start >= 0) words.push([start, a - start]);
        start = -1;
        if (c !== 32) words.push([a, 1]);
      } else if (start < 0) start = a;
    }
    const max = m[parse];
    const count = Math.min(max, words.length);
    this.wb(parse + 1, count);
    for (let i = 0; i < count; i++) {
      const [a, len] = words[i];
      const entry = this.lookup([...m.subarray(a, a + len)], dict);
      if (skipUnknown && !entry) continue;
      const at = parse + 2 + 4 * i;
      this.ww(at, entry);
      this.wb(at + 2, len);
      this.wb(at + 3, a - text);
    }
  }

  encodeText(text, length, from, coded) {
    const words = this.encode([...this.mem.subarray(text + from, text + from + length)]);
    words.forEach((w, i) => this.ww(coded + 2 * i, w));
  }

  copyTable(first, second, size) {
    const n = Math.abs(size);
    if (second === 0) { for (let i = 0; i < n; i++) this.wb(first + i, 0); return; }
    // copying forwards into an overlapping later spot would smear the
    // source, unless the game asked for that (a negative size)
    if (size > 0 && second > first && second < first + n) {
      for (let i = n - 1; i >= 0; i--) this.wb(second + i, this.mem[first + i]);
    } else {
      for (let i = 0; i < n; i++) this.wb(second + i, this.mem[first + i]);
    }
  }

  printTable(text, width, height, skip) {
    const startCol = this.cursor.col;
    for (let r = 0, a = text; r < height; r++, a += width + skip) {
      if (r > 0) {
        if (this.window === 1) { this.cursor.row++; this.cursor.col = startCol; }
        else this.print('\n');
      }
      let line = '';
      for (let i = 0; i < width; i++) line += this.zsciiChar(this.mem[a + i]);
      this.print(line);
    }
  }

  // ---------- output ----------

  print(text, extra = 0) {
    if (!text) return;
    if (this.memStreams.length) {   // stream 3 takes everything while it's open
      const s = this.memStreams[this.memStreams.length - 1];
      for (const c of this.toZsciiOut(text)) { this.wb(s.table + 2 + s.count, c); s.count++; }
      return;
    }
    if (!this.screenOn) return;
    if (this.window === 1) return this.printUpper(text);
    // the header's fixed-pitch bit asks for it everywhere
    const style = this.style | (this.font === 4 || this.mem[0x11] & 2 ? STYLE.fixed : 0) | extra;
    if (style !== this.outStyle) { this.flush(); this.outStyle = style; }
    this.out += text;
  }

  toZsciiOut(text) {
    const out = [];
    for (const ch of text) {
      if (ch === '\n') { out.push(13); continue; }
      const c = ch.codePointAt(0);
      if (c >= 32 && c <= 126) out.push(c);
      else { const i = this.unicode.indexOf(c); out.push(i >= 0 ? 155 + i : 63); }
    }
    return out;
  }

  flush() {
    if (!this.out) return;
    this.io.print?.(this.out, this.outStyle || 0);
    this.out = '';
  }

  outputStream(n, table) {
    if (n === 1 || n === -1) this.screenOn = n > 0;
    else if (n === 2 || n === -2) this.mem[0x11] = n > 0 ? this.mem[0x11] | 1 : this.mem[0x11] & ~1;
    else if (n === 3) {
      if (this.memStreams.length >= 16) throw new ZError('the game nested too many output streams');
      this.flush();
      this.memStreams.push({ table, count: 0 });
    } else if (n === -3) {
      const s = this.memStreams.pop();
      if (s) this.ww(s.table, s.count);
    }
  }

  // ---------- windows ----------
  // The upper window is rows of [character, style] cells, cols wide

  splitWindow(lines) {
    this.flush();
    this.upperHeight = lines;
    while (this.upper.length < lines) this.upper.push([]);
    this.upper.length = lines;
    if (this.v === 3) this.upper = this.upper.map(() => []);
    if (this.cursor.row > lines) this.cursor = { row: 1, col: 1 };
    this.upperChanged = true;
  }

  setWindow(w) {
    this.flush();
    this.window = w === 1 ? 1 : 0;
    if (this.window === 1 && this.v >= 4) this.cursor = { row: 1, col: 1 };
  }

  eraseWindow(w) {
    this.flush();
    if (w === -1) { this.splitWindow(0); this.window = 0; }
    if (w === -1 || w === -2 || w === 0) this.io.clear?.();
    if (w === -1 || w === -2 || w === 1) {
      this.upper = this.upper.map(() => []);
      this.cursor = { row: 1, col: 1 };
      this.upperChanged = true;
    }
  }

  eraseLine() {
    const row = this.upper[this.cursor.row - 1];
    if (row) row.length = Math.min(row.length, this.cursor.col - 1);
    this.upperChanged = true;
  }

  printUpper(text) {
    const style = this.style | (this.font === 4 ? STYLE.fixed : 0);
    for (const ch of text) {
      if (ch === '\n') { this.cursor.row++; this.cursor.col = 1; continue; }
      const row = this.upper[this.cursor.row - 1];
      if (row && this.cursor.col <= this.cols) {
        while (row.length < this.cursor.col - 1) row.push([' ', 0]);
        row[this.cursor.col - 1] = [ch, style];
      }
      this.cursor.col++;
    }
    this.upperChanged = true;
  }

  // The upper window as rows of [text, style] runs
  upperRows() {
    this.upperChanged = false;
    return this.upper.map(row => {
      const runs = [];
      for (const [ch, style] of row) {
        const last = runs[runs.length - 1];
        if (last && last[1] === style) last[0] += ch;
        else runs.push([ch, style]);
      }
      return runs;
    });
  }

  // Versions 1 to 3: the room, and the score and moves or the time
  showStatus() {
    this.flush();
    const room = this.objName(this.readVar(16));
    const a = s16(this.readVar(17)), b = this.readVar(18);
    let right;
    if (this.v === 3 && this.mem[1] & 0x02) {
      right = `${(a + 11) % 12 + 1}:${String(b).padStart(2, '0')} ${a < 12 ? 'AM' : 'PM'}`;
    } else {
      right = `Score: ${a}  Moves: ${b}`;
    }
    this.io.status?.({ room, right, score: a, moves: b });
  }

  // ---------- input ----------

  read(text, parse) {
    if (this.v <= 3) this.showStatus();
    this.flush();
    const m = this.mem;
    let max = m[text];
    if (this.v <= 4) max--;
    const preload = this.v >= 5 ? String.fromCharCode(...m.subarray(text + 2, text + 2 + m[text + 1])) : '';
    this.waiting = { type: 'line', text, parse, max: Math.max(0, max), preload };
  }

  // ---------- saving ----------

  // A copy of everything that changes as the game runs
  state(kind) {
    return {
      id: this.id, kind, pc: this.pc,
      mem: this.mem.slice(0, this.staticBase),
      stack: this.stack.slice(0, this.sp),
      frames: this.frames.map(f => ({ ...f, locals: f.locals.slice() })),
    };
  }

  load(s) {
    const keep = this.mem[0x11] & 0x03;
    this.mem.set(s.mem);
    this.mem[0x11] = (this.mem[0x11] & ~0x03) | keep;
    this.header();
    this.stack.set(s.stack);
    this.sp = s.stack.length;
    this.frames = s.frames.map(f => ({ ...f, locals: Uint16Array.from(f.locals) }));
    this.frame = this.frames[this.frames.length - 1];
    this.pc = s.pc;
    this.waiting = null;
  }

  // While the game waits for input: a state that, restored, asks again.
  // It carries the upper window too, since games draw their status line
  // before they ask, not as they ask.
  snapshot() {
    if (!this.waiting || (this.waiting.type !== 'line' && this.waiting.type !== 'char')) return null;
    const s = this.state('input');
    s.pc = this.instr;
    s.upper = this.upper.map(row => row.map(cell => [...cell]));
    return s;
  }

  // Restores a snapshot or a saved game; false when it's from another story
  // file (or another release of this one)
  restoreState(s) {
    if (!s || s.id !== this.id || s.mem.length !== this.staticBase) return false;
    this.load(s);
    if (s.upper) {
      this.upper = s.upper.map(row => row.map(cell => [...cell]));
      this.upperHeight = this.upper.length;
    }
    this.upperChanged = true;
    if (s.kind === 'save') {
      // carry on from the save instruction, which now says it succeeded
      if (this.v <= 3) this.branch(true);
      else this.store(2);
    }
    return true;
  }

  save() {
    this.flush();
    try { return !!this.io.save?.(this.state('save')); } catch { return false; }
  }

  restoreSaved() {
    this.flush();
    let s = null;
    try { s = this.io.restore?.(); } catch {}
    return this.restoreState(s);
  }

  verify() {
    const m = this.original;
    let len = this.rw(0x1a) * (this.v <= 3 ? 2 : this.v <= 5 ? 4 : 8);
    if (!len || len > m.length) len = m.length;
    let sum = 0;
    for (let i = 0x40; i < len; i++) sum += m[i];
    return (sum & 0xffff) === ((m[0x1c] << 8) | m[0x1d]);
  }

  // ---------- random ----------

  seed(n) {
    this.rand = n >>> 0 || 1;
    this.interval = 0;
    this.counter = 0;
  }

  random(range) {
    if (range <= 0) {
      // negative: predictable from here on; 0: unpredictable again
      if (range === 0) this.seed((Math.random() * 2 ** 32) >>> 0);
      else if (-range < 1000) { this.interval = -range; this.counter = 0; }
      else this.seed(-range);
      return 0;
    }
    let r;
    if (this.interval) {
      r = this.counter++;
      if (this.counter === this.interval) this.counter = 0;
    } else {
      // mulberry32
      let t = (this.rand = (this.rand + 0x6d2b79f5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      r = (t ^ (t >>> 14)) >>> 0;
    }
    return (r % range) + 1;
  }
}
