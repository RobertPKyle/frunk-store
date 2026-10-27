// Translates the Turbo Pascal 5 subset that Scott Miller's Kroz games use
// into one JavaScript module per game, run by apps/kroz/runtime.js in a
// worker. It covers what those programs need and stops with a message on
// anything else: units, include files, constants, records, arrays, sets,
// shortstrings, typed files, nested procedures, var parameters, with, case,
// goto (as labelled blocks and loops), and the Crt, Dos and Turbo3 calls.
//
// Values: integers are numbers, wrapped to their type's size on assignment;
// chars are one-character strings and strings are strings, with code page
// 437 codes 0-255 as their characters; booleans are booleans; arrays of
// integers are typed arrays (flattened, so they wrap by themselves), other
// arrays plain arrays; records are objects; sets are immutable 32-byte
// arrays from the runtime; files are runtime objects.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const KEYWORDS = new Set(('and array begin case const div do downto else end file for function goto if ' +
  'implementation in interface label mod nil not of or packed procedure program record repeat set shl shr ' +
  'string then to type unit until uses var while with xor forward').split(' '));

class PascalError extends Error {}
const fail = (tok, msg) => { throw new PascalError(`${tok ? `${tok.f}:${tok.l}: ` : ''}${msg}`); };

// ---------- lexer ----------

// Reads files case-insensitively from one folder, as latin1 so each byte
// stays one character
function folder(dir) {
  const names = new Map(readdirSync(dir).map(n => [n.toLowerCase(), n]));
  return {
    has: name => names.has(name.toLowerCase()),
    read(name) {
      const real = names.get(name.toLowerCase());
      if (!real) throw new PascalError(`missing file ${name}`);
      return { name: real, text: readFileSync(join(dir, real), 'latin1') };
    },
    names: () => [...names.values()],
  };
}

function lex(name, files, out = []) {
  const { name: file, text: src } = files.read(name);
  let i = 0, line = 1;
  const n = src.length;
  const push = (k, v, extra) => out.push({ k, v, f: file, l: line, ...extra });
  const isId = c => /[A-Za-z0-9_]/.test(c);
  while (i < n) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c <= ' ' || c === '\x1a') { i++; continue; }
    if (c === '{' || (c === '(' && src[i + 1] === '*')) {
      const close = c === '{' ? '}' : '*)';
      const start = i + (c === '{' ? 1 : 2);
      const end = src.indexOf(close, start);
      if (end < 0) fail({ f: file, l: line }, 'unclosed comment');
      const body = src.slice(start, end);
      const startLine = line;
      for (const ch of body) if (ch === '\n') line++;
      i = end + close.length;
      // {$I name} includes a file; {$I-} and other switches don't matter
      const inc = /^\$I\s+([^\s}*]+)/i.exec(body);
      if (inc) {
        const target = inc[1].replace(/^[A-Za-z]:\\/, '');
        const saved = line;
        line = startLine;
        lex(target, files, out);
        line = saved;
      }
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < n && isId(src[j])) j++;
      const word = src.slice(i, j).toLowerCase();
      push(KEYWORDS.has(word) ? 'kw' : 'id', word);
      i = j;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < n && /[0-9]/.test(src[j])) j++;
      let real = false;
      if (src[j] === '.' && /[0-9]/.test(src[j + 1] || '')) {
        real = true; j++;
        while (j < n && /[0-9]/.test(src[j])) j++;
      }
      if (/[eE]/.test(src[j] || '') && /[-+0-9]/.test(src[j + 1] || '')) {
        real = true; j += 2;
        while (j < n && /[0-9]/.test(src[j])) j++;
      }
      push('num', Number(src.slice(i, j)), { real });
      i = j;
      continue;
    }
    if (c === '$') {
      let j = i + 1;
      while (j < n && /[0-9A-Fa-f]/.test(src[j])) j++;
      push('num', parseInt(src.slice(i + 1, j), 16));
      i = j;
      continue;
    }
    if (c === "'" || c === '#') {
      // A string is any run of quoted parts and #codes
      let s = '';
      while (src[i] === "'" || src[i] === '#') {
        if (src[i] === "'") {
          i++;
          for (;;) {
            if (i >= n) fail({ f: file, l: line }, 'unclosed string');
            if (src[i] === "'") {
              if (src[i + 1] === "'") { s += "'"; i += 2; continue; }
              i++;
              break;
            }
            if (src[i] === '\n') line++;
            s += src[i++];
          }
        } else {
          i++;
          let j = i;
          if (src[j] === '$') { j++; while (/[0-9A-Fa-f]/.test(src[j] || '')) j++; s += String.fromCharCode(parseInt(src.slice(i + 1, j), 16)); }
          else { while (/[0-9]/.test(src[j] || '')) j++; s += String.fromCharCode(Number(src.slice(i, j))); }
          i = j;
        }
      }
      push('str', s);
      continue;
    }
    const two = src.slice(i, i + 2);
    if ([':=', '<=', '>=', '<>', '..'].includes(two)) { push('sym', two); i += 2; continue; }
    if ('()[],;:.=<>+-*/^@'.includes(c)) { push('sym', c); i++; continue; }
    fail({ f: file, l: line }, `unexpected character ${JSON.stringify(c)}`);
  }
  return out;
}

// ---------- parser ----------

class Parser {
  constructor(tokens) { this.t = tokens; this.p = 0; }
  get tok() { return this.t[this.p] || { k: 'eof', v: '', f: '?', l: 0 }; }
  peek(o = 1) { return this.t[this.p + o] || { k: 'eof', v: '' }; }
  is(k, v) { const t = this.tok; return t.k === k && (v === undefined || t.v === v); }
  isSym(v) { return this.is('sym', v); }
  isKw(v) { return this.is('kw', v); }
  next() { return this.t[this.p++]; }
  accept(k, v) { if (this.is(k, v)) return this.next(); return null; }
  expect(k, v) {
    if (!this.is(k, v)) fail(this.tok, `expected ${v || k}, found ${this.tok.v || this.tok.k}`);
    return this.next();
  }
  ident() { return this.expect('id').v; }

  // program X; uses ...; block.   or   unit X; interface ... implementation ... end.
  module() {
    if (this.accept('kw', 'unit')) {
      const name = this.ident();
      this.expect('sym', ';');
      this.expect('kw', 'interface');
      const uses = this.uses();
      const intf = this.decls(true);
      this.expect('kw', 'implementation');
      uses.push(...this.uses());
      const impl = this.decls(false);
      let init = null;
      if (this.accept('kw', 'begin')) init = this.stmtList('end');
      else this.expect('kw', 'end');
      this.expect('sym', '.');
      return { kind: 'unit', name, uses, decls: [...intf, ...impl], init };
    }
    this.expect('kw', 'program');
    const name = this.ident();
    if (this.accept('sym', '(')) { while (!this.accept('sym', ')')) this.next(); }
    this.expect('sym', ';');
    const uses = this.uses();
    const decls = this.decls(false);
    this.expect('kw', 'begin');
    const body = this.stmtList('end');
    this.expect('sym', '.');
    return { kind: 'program', name, uses, decls, body };
  }

  uses() {
    const list = [];
    if (this.accept('kw', 'uses')) {
      do list.push(this.ident()); while (this.accept('sym', ','));
      this.expect('sym', ';');
    }
    return list;
  }

  // Declarations; headersOnly for a unit's interface
  decls(headersOnly) {
    const out = [];
    for (;;) {
      const at = this.tok;
      if (this.accept('kw', 'label')) {
        do { const t = this.next(); out.push({ d: 'label', name: String(t.v), at }); } while (this.accept('sym', ','));
        this.expect('sym', ';');
      } else if (this.accept('kw', 'const')) {
        while (this.is('id')) {
          const at2 = this.tok;
          const name = this.ident();
          let type = null;
          if (this.accept('sym', ':')) type = this.type();
          this.expect('sym', '=');
          const value = type ? this.typedConst() : this.expr();
          this.expect('sym', ';');
          out.push({ d: type ? 'var' : 'const', names: [name], name, type, value, at: at2 });
        }
      } else if (this.accept('kw', 'type')) {
        while (this.is('id')) {
          const at2 = this.tok;
          const name = this.ident();
          this.expect('sym', '=');
          const type = this.type();
          this.expect('sym', ';');
          out.push({ d: 'type', name, type, at: at2 });
        }
      } else if (this.accept('kw', 'var')) {
        while (this.is('id')) {
          const at2 = this.tok;
          const names = [this.ident()];
          while (this.accept('sym', ',')) names.push(this.ident());
          this.expect('sym', ':');
          const type = this.type();
          this.expect('sym', ';');
          out.push({ d: 'var', names, type, at: at2 });
        }
      } else if (this.is('kw', 'procedure') || this.is('kw', 'function')) {
        out.push(this.routine(headersOnly));
      } else return out;
    }
  }

  routine(headerOnly) {
    const at = this.tok;
    const isFunc = this.next().v === 'function';
    const name = this.ident();
    const params = [];
    if (this.accept('sym', '(')) {
      do {
        const isVar = !!this.accept('kw', 'var');
        if (this.accept('kw', 'const')) {}
        const names = [this.ident()];
        while (this.accept('sym', ',')) names.push(this.ident());
        this.expect('sym', ':');
        const type = this.type();
        for (const n of names) params.push({ name: n, type, isVar });
      } while (this.accept('sym', ';'));
      this.expect('sym', ')');
    }
    let result = null;
    if (isFunc && this.accept('sym', ':')) result = this.type();
    this.expect('sym', ';');
    if (headerOnly) return { d: 'routine', name, isFunc, params, result, header: true, at };
    if (this.accept('kw', 'forward')) { this.expect('sym', ';'); return { d: 'routine', name, isFunc, params, result, header: true, at }; }
    const decls = this.decls(false);
    this.expect('kw', 'begin');
    const body = this.stmtList('end');
    this.expect('sym', ';');
    return { d: 'routine', name, isFunc, params, result, decls, body, at };
  }

  // A typed constant's value: a plain value or (a, b, ...) for arrays
  typedConst() {
    if (this.isSym('(')) {
      this.next();
      const items = [];
      do items.push(this.typedConst()); while (this.accept('sym', ','));
      this.expect('sym', ')');
      return { e: 'list', items };
    }
    return this.expr();
  }

  type() {
    const at = this.tok;
    this.accept('kw', 'packed');
    if (this.accept('kw', 'string')) {
      if (this.accept('sym', '[')) { const len = this.expr(); this.expect('sym', ']'); return { t: 'string', len, at }; }
      return { t: 'string', len: null, at };
    }
    if (this.accept('kw', 'array')) {
      const ranges = [];
      this.expect('sym', '[');
      do ranges.push(this.type()); while (this.accept('sym', ','));
      this.expect('sym', ']');
      this.expect('kw', 'of');
      return { t: 'array', ranges, of: this.type(), at };
    }
    if (this.accept('kw', 'record')) {
      const fields = [];
      while (!this.isKw('end')) {
        if (this.isKw('case')) fail(this.tok, 'variant records are not supported');
        const names = [this.ident()];
        while (this.accept('sym', ',')) names.push(this.ident());
        this.expect('sym', ':');
        const type = this.type();
        for (const n of names) fields.push({ name: n, type });
        if (!this.accept('sym', ';')) break;
      }
      this.expect('kw', 'end');
      return { t: 'record', fields, at };
    }
    if (this.accept('kw', 'set')) { this.expect('kw', 'of'); return { t: 'set', of: this.type(), at }; }
    if (this.accept('kw', 'file')) {
      if (this.accept('kw', 'of')) return { t: 'file', of: this.type(), at };
      return { t: 'file', of: null, at };
    }
    if (this.isSym('(')) {
      this.next();
      const names = [this.ident()];
      while (this.accept('sym', ',')) names.push(this.ident());
      this.expect('sym', ')');
      return { t: 'enum', names, at };
    }
    if (this.isSym('^')) fail(at, 'pointers are not supported');
    // A named type, or a subrange lo..hi of constants
    if (this.is('id') && !(this.peek().k === 'sym' && this.peek().v === '..')) {
      return { t: 'named', name: this.ident(), at };
    }
    const lo = this.expr();
    this.expect('sym', '..');
    const hi = this.expr();
    return { t: 'range', lo, hi, at };
  }

  stmtList(end) {
    const list = [this.stmt()];
    while (this.accept('sym', ';')) list.push(this.stmt());
    this.expect('kw', end);
    return list;
  }

  stmt() {
    const at = this.tok;
    // label:
    if ((this.is('id') || this.is('num')) && this.peek().k === 'sym' && this.peek().v === ':') {
      const name = String(this.next().v);
      this.next();
      return { s: 'label', name, stmt: this.stmt(), at };
    }
    if (this.accept('kw', 'begin')) return { s: 'block', body: this.stmtList('end'), at };
    if (this.accept('kw', 'if')) {
      const cond = this.expr();
      this.expect('kw', 'then');
      const then = this.stmt();
      const els = this.accept('kw', 'else') ? this.stmt() : null;
      return { s: 'if', cond, then, else: els, at };
    }
    if (this.accept('kw', 'while')) {
      const cond = this.expr();
      this.expect('kw', 'do');
      return { s: 'while', cond, body: this.stmt(), at };
    }
    if (this.accept('kw', 'repeat')) {
      const body = [this.stmt()];
      while (this.accept('sym', ';')) body.push(this.stmt());
      this.expect('kw', 'until');
      return { s: 'repeat', body, cond: this.expr(), at };
    }
    if (this.accept('kw', 'for')) {
      const v = this.designator();
      this.expect('sym', ':=');
      const from = this.expr();
      const down = !!this.accept('kw', 'downto');
      if (!down) this.expect('kw', 'to');
      const to = this.expr();
      this.expect('kw', 'do');
      return { s: 'for', v, from, to, down, body: this.stmt(), at };
    }
    if (this.accept('kw', 'case')) {
      const sel = this.expr();
      this.expect('kw', 'of');
      const arms = [];
      let els = null;
      while (!this.isKw('end')) {
        if (this.accept('kw', 'else')) {
          els = [this.stmt()];
          while (this.accept('sym', ';')) { if (this.isKw('end')) break; els.push(this.stmt()); }
          break;
        }
        const labels = [];
        do {
          const lo = this.expr();
          const hi = this.accept('sym', '..') ? this.expr() : null;
          labels.push({ lo, hi });
        } while (this.accept('sym', ','));
        this.expect('sym', ':');
        const body = this.stmt();
        arms.push({ labels, body });
        if (!this.accept('sym', ';') && !this.isKw('else')) break;
      }
      this.expect('kw', 'end');
      return { s: 'case', sel, arms, else: els, at };
    }
    if (this.accept('kw', 'with')) {
      const recs = [this.designator()];
      while (this.accept('sym', ',')) recs.push(this.designator());
      this.expect('kw', 'do');
      return { s: 'with', recs, body: this.stmt(), at };
    }
    if (this.accept('kw', 'goto')) return { s: 'goto', name: String(this.next().v), at };
    if (this.is('id')) {
      const d = this.designator();
      if (this.accept('sym', ':=')) return { s: 'assign', target: d, value: this.expr(), at };
      return { s: 'call', d, at };
    }
    return { s: 'empty', at };
  }

  designator() {
    const at = this.tok;
    let d = { e: 'id', name: this.ident(), at };
    for (;;) {
      if (this.isSym('[')) {
        this.next();
        const idx = [this.expr()];
        while (this.accept('sym', ',')) idx.push(this.expr());
        this.expect('sym', ']');
        d = { e: 'index', base: d, idx, at };
      } else if (this.isSym('.') && this.peek().k === 'id') {
        this.next();
        d = { e: 'field', base: d, name: this.ident(), at };
      } else if (this.isSym('(')) {
        this.next();
        const args = [];
        if (!this.isSym(')')) {
          do {
            const a = this.expr();
            // write(x:5) and str(x:5, s) widths
            if (this.accept('sym', ':')) {
              a.width = this.expr();
              if (this.accept('sym', ':')) a.decimals = this.expr();
            }
            args.push(a);
          } while (this.accept('sym', ','));
        }
        this.expect('sym', ')');
        d = { e: 'call', base: d, args, at };
      } else return d;
    }
  }

  expr() {
    const l = this.simple();
    const t = this.tok;
    if (t.k === 'sym' && ['=', '<>', '<', '>', '<=', '>='].includes(t.v)) { this.next(); return { e: 'bin', op: t.v, l, r: this.simple(), at: t }; }
    if (t.k === 'kw' && t.v === 'in') { this.next(); return { e: 'bin', op: 'in', l, r: this.simple(), at: t }; }
    return l;
  }

  simple() {
    const at = this.tok;
    let l;
    if (this.isSym('-') || this.isSym('+')) { const op = this.next().v; l = { e: 'un', op, x: this.term(), at }; }
    else l = this.term();
    for (;;) {
      const t = this.tok;
      if ((t.k === 'sym' && (t.v === '+' || t.v === '-')) || (t.k === 'kw' && (t.v === 'or' || t.v === 'xor'))) {
        this.next();
        l = { e: 'bin', op: t.v, l, r: this.term(), at: t };
      } else return l;
    }
  }

  term() {
    let l = this.factor();
    for (;;) {
      const t = this.tok;
      if ((t.k === 'sym' && (t.v === '*' || t.v === '/')) || (t.k === 'kw' && ['div', 'mod', 'and', 'shl', 'shr'].includes(t.v))) {
        this.next();
        l = { e: 'bin', op: t.v, l, r: this.factor(), at: t };
      } else return l;
    }
  }

  factor() {
    const t = this.tok;
    if (t.k === 'num') { this.next(); return { e: 'num', v: t.v, real: t.real, at: t }; }
    if (t.k === 'str') { this.next(); return { e: 'str', v: t.v, at: t }; }
    if (t.k === 'kw' && t.v === 'nil') { this.next(); return { e: 'nil', at: t }; }
    if (t.k === 'kw' && t.v === 'not') { this.next(); return { e: 'un', op: 'not', x: this.factor(), at: t }; }
    if (t.k === 'sym' && t.v === '(') { this.next(); const x = this.expr(); this.expect('sym', ')'); return x; }
    if (t.k === 'sym' && t.v === '[') {
      this.next();
      const elems = [];
      if (!this.isSym(']')) {
        do {
          const lo = this.expr();
          const hi = this.accept('sym', '..') ? this.expr() : null;
          elems.push({ lo, hi });
        } while (this.accept('sym', ','));
      }
      this.expect('sym', ']');
      return { e: 'set', elems, at: t };
    }
    if (t.k === 'kw' && t.v === 'string') { this.next(); return this.designatorFrom({ e: 'id', name: 'string', at: t }); }
    if (t.k === 'id') return this.designator();
    fail(t, `unexpected ${t.v || t.k}`);
  }

  designatorFrom(d) {
    if (this.isSym('(')) {
      this.next();
      const args = [this.expr()];
      this.expect('sym', ')');
      return { e: 'call', base: d, args, at: d.at };
    }
    return d;
  }
}

// ---------- types ----------

const INT_SIZES = {
  byte: { lo: 0, hi: 255, arr: 'Uint8Array', wrap: c => `(${c}) & 255` },
  shortint: { lo: -128, hi: 127, arr: 'Int8Array', wrap: c => `(${c}) << 24 >> 24` },
  integer: { lo: -32768, hi: 32767, arr: 'Int16Array', wrap: c => `(${c}) << 16 >> 16` },
  word: { lo: 0, hi: 65535, arr: 'Uint16Array', wrap: c => `(${c}) & 65535` },
  longint: { lo: -2147483648, hi: 2147483647, arr: 'Int32Array', wrap: c => `(${c}) | 0` },
};
const T = {
  int: size => ({ k: 'int', size }),
  bool: { k: 'bool' }, char: { k: 'char' }, real: { k: 'real' }, void: { k: 'void' },
  str: max => ({ k: 'str', max }),
};
const sizeFor = (lo, hi) => Object.keys(INT_SIZES).find(s => lo >= INT_SIZES[s].lo && hi <= INT_SIZES[s].hi) || 'longint';
const isInt = t => t && (t.k === 'int' || t.k === 'enum');
const isStrish = t => t && (t.k === 'str' || t.k === 'char');

// ---------- code generation ----------

const RESERVED = new Set(('break case catch class const continue debugger default delete do else enum export extends ' +
  'false finally for function if import in instanceof new null return super switch this throw true try typeof var void ' +
  'while with yield let static implements interface package private protected public await arguments eval R').split(' '));

function jsString(s) {
  let out = "'";
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (ch === "'" || ch === '\\') out += '\\' + ch;
    else if (c >= 32 && c < 127) out += ch;
    else out += '\\x' + c.toString(16).padStart(2, '0');
  }
  return out + "'";
}

class Scope {
  constructor(parent, kind, fn = null) { this.parent = parent; this.kind = kind; this.syms = new Map(); this.fn = fn; this.withs = []; }
  find(name) {
    for (let s = this; s; s = s.parent) {
      for (let w = s.withs.length - 1; w >= 0; w--) {
        const f = s.withs[w].type.fields.get(name);
        if (f) return { kind: 'field', type: f, js: `${s.withs[w].js}.${s.withs[w].type.js.get(name)}` };
      }
      const sym = s.syms.get(name);
      if (sym) return sym;
    }
    return null;
  }
}

class Gen {
  constructor() {
    this.out = [];
    this.used = new Set(['R', 'main', 'state']);
    this.tmp = 0;
    this.labelSeq = 0;
  }

  jsName(name) {
    let js = RESERVED.has(name) ? `${name}_` : name;
    if (this.used.has(js)) { let i = 2; while (this.used.has(`${js}$${i}`)) i++; js = `${js}$${i}`; }
    this.used.add(js);
    return js;
  }
  temp(fnCtx) {
    const name = `$${++this.tmp}`;
    fnCtx.temps.push(name);
    return name;
  }

  // ----- constants -----

  constValue(e, scope) {
    switch (e.e) {
      case 'num': return e.v;
      case 'str': return e.v;
      case 'id': {
        const s = scope.find(e.name);
        if (s && s.kind === 'const') return s.value;
        fail(e.at, `${e.name} is not a constant`);
      }
      case 'un': {
        const v = this.constValue(e.x, scope);
        return e.op === '-' ? -v : e.op === 'not' ? ~v : v;
      }
      case 'bin': {
        const l = this.constValue(e.l, scope), r = this.constValue(e.r, scope);
        switch (e.op) {
          case '+': return l + r;
          case '-': return l - r;
          case '*': return l * r;
          case 'div': return Math.trunc(l / r);
          case 'mod': return l % r;
          case '/': return l / r;
          case 'shl': return l << r;
          case 'shr': return l >>> r;
          case 'and': return l & r;
          case 'or': return l | r;
        }
        break;
      }
      case 'call': {
        const fn = e.base.e === 'id' && e.base.name;
        const v = this.constValue(e.args[0], scope);
        if (fn === 'chr') return String.fromCharCode(v);
        if (fn === 'ord') return typeof v === 'string' ? v.charCodeAt(0) : v;
        if (fn === 'length') return v.length;
        break;
      }
      case 'set': return { set: e.elems.map(x => [this.constValue(x.lo, scope), x.hi ? this.constValue(x.hi, scope) : null]) };
    }
    fail(e.at, 'not a constant expression');
  }
  ord(v) { return typeof v === 'string' ? v.charCodeAt(0) : v; }

  // ----- types -----

  resolveType(t, scope) {
    switch (t.t) {
      case 'named': {
        const builtin = { integer: T.int('integer'), byte: T.int('byte'), word: T.int('word'), shortint: T.int('shortint'),
          longint: T.int('longint'), char: T.char, boolean: T.bool, real: T.real, string: T.str(255), text: { k: 'file', of: null, text: true } };
        const s = scope.find(t.name);
        if (s && s.kind === 'type') return s.type;
        if (builtin[t.name]) return builtin[t.name];
        fail(t.at, `unknown type ${t.name}`);
      }
      case 'string': return T.str(t.len ? this.constValue(t.len, scope) : 255);
      case 'range': {
        const lo = this.constValue(t.lo, scope), hi = this.constValue(t.hi, scope);
        if (typeof lo === 'string') return { k: 'char', lo: lo.charCodeAt(0), hi: hi.charCodeAt(0) };
        return { k: 'int', size: sizeFor(lo, hi), lo, hi };
      }
      case 'enum': {
        const type = { k: 'int', size: 'byte', lo: 0, hi: t.names.length - 1 };
        t.names.forEach((n, i) => scope.syms.set(n, { kind: 'const', value: i, type }));
        return type;
      }
      case 'array': {
        const dims = t.ranges.map(r => {
          const rt = this.resolveType(r, scope);
          if (rt.k === 'char') return { lo: rt.lo ?? 0, hi: rt.hi ?? 255, char: true };
          if (rt.k === 'bool') return { lo: 0, hi: 1, bool: true };
          if (rt.lo === undefined) fail(t.at, 'array bounds must be a range');
          return { lo: rt.lo, hi: rt.hi };
        });
        let of = this.resolveType(t.of, scope);
        // array[a] of array[b] of x is array[a, b] of x
        if (of.k === 'array') { dims.push(...of.dims); of = of.of; }
        return { k: 'array', dims, of };
      }
      case 'record': {
        const fields = new Map(), js = new Map();
        for (const f of t.fields) { fields.set(f.name, this.resolveType(f.type, scope)); js.set(f.name, RESERVED.has(f.name) ? `${f.name}_` : f.name); }
        return { k: 'rec', fields, js };
      }
      case 'set': {
        const of = this.resolveType(t.of, scope);
        return { k: 'set', of };
      }
      case 'file': return { k: 'file', of: t.of ? this.resolveType(t.of, scope) : null };
    }
    fail(t.at, `unsupported type ${t.t}`);
  }

  initValue(type) {
    switch (type.k) {
      case 'int': case 'real': return '0';
      case 'bool': return 'false';
      case 'char': return "'\\x00'";
      case 'str': return "''";
      case 'set': return 'R.EMPTY';
      case 'file': return 'R.file()';
      case 'rec': return `{ ${[...type.fields].map(([n, ft]) => `${type.js.get(n)}: ${this.initValue(ft)}`).join(', ')} }`;
      case 'array': {
        const count = type.dims.reduce((a, d) => a * (d.hi - d.lo + 1), 1);
        if (type.of.k === 'int') return `new ${INT_SIZES[type.of.size].arr}(${count})`;
        if (type.of.k === 'real') return `new Float64Array(${count})`;
        if (['bool', 'char', 'str'].includes(type.of.k)) return `new Array(${count}).fill(${this.initValue(type.of)})`;
        return `Array.from({ length: ${count} }, () => (${this.initValue(type.of)}))`;
      }
    }
    fail(null, `no initial value for ${type.k}`);
  }

  // Wraps a value for storing in a variable of this type
  store(type, code) {
    if (type.k === 'int') return INT_SIZES[type.size].wrap(code);
    if (type.k === 'str' && type.max < 255) return `R.trunc(${code}, ${type.max})`;
    if (type.k === 'rec' || type.k === 'array') return `R.clone(${code})`;
    return code;
  }

  // ----- program structure -----

  module(units, program) {
    const builtins = new Scope(null, 'global');
    this.builtins(builtins);
    let scope = builtins;
    const ctx = { temps: [], fn: null, labels: new Map() };
    const inits = [];
    for (const u of units) {
      scope = new Scope(scope, 'global');
      this.decls(u.decls, scope, ctx, 0);
      if (u.init) inits.push(this.stmts(u.init, scope, ctx, 1));
    }
    scope = new Scope(scope, 'global');
    this.decls(program.decls, scope, ctx, 0);
    const mainCtx = { temps: [], fn: null, labels: new Map() };
    this.collectLabels(program.decls, mainCtx);
    const body = this.stmts(program.body, scope, mainCtx, 1);
    if (ctx.temps.length) this.out.push(`let ${ctx.temps.join(', ')};`);
    this.out.push('', 'export function main() {');
    if (mainCtx.temps.length) this.out.push(`  let ${mainCtx.temps.join(', ')};`);
    for (const i of inits) this.out.push(i);
    this.out.push(body, '}');
    // The page reads the player's place to step toward a tap
    const px = scope.find('px'), py = scope.find('py');
    if (px?.kind === 'var' && py?.kind === 'var') this.out.push('', `export const state = () => [${px.js}, ${py.js}];`);
    return this.out.join('\n') + '\n';
  }

  collectLabels(decls, ctx) {
    for (const d of decls) if (d.d === 'label') ctx.labels.set(d.name, null);
  }

  decls(decls, scope, ctx, depth) {
    const pad = '  '.repeat(depth);
    const out = depth === 0 ? this.out : [];
    for (const d of decls) {
      if (d.d === 'label') continue;
      if (d.d === 'const') {
        const value = this.constValue(d.value, scope);
        const type = typeof value === 'string' ? (value.length === 1 ? T.char : T.str(255))
          : value && value.set ? { k: 'set', of: T.int('byte') }
          : Number.isInteger(value) ? T.int('longint') : T.real;
        scope.syms.set(d.name, { kind: 'const', value, type });
      } else if (d.d === 'type') {
        scope.syms.set(d.name, { kind: 'type', type: this.resolveType(d.type, scope) });
      } else if (d.d === 'var') {
        const type = this.resolveType(d.type, scope);
        for (const n of d.names) {
          const js = this.jsName(n);
          scope.syms.set(n, { kind: 'var', type, js });
          let init = this.initValue(type);
          if (d.value) init = this.typedConstInit(d.value, type, scope);
          out.push(`${pad}let ${js} = ${init};`);
        }
      } else if (d.d === 'routine') {
        out.push(...this.routine(d, scope, depth));
      }
    }
    return out;
  }

  typedConstInit(v, type, scope) {
    if (v.e === 'list') {
      if (type.k !== 'array') fail(v.items[0]?.at, 'structured constants must be arrays');
      const vals = v.items.map(i => this.constValue(i, scope));
      if (type.of.k === 'int') return `${INT_SIZES[type.of.size].arr}.from(${JSON.stringify(vals)})`;
      return `[${vals.map(x => typeof x === 'string' ? jsString(x) : String(x)).join(', ')}]`;
    }
    const val = this.constValue(v, scope);
    return typeof val === 'string' ? jsString(val) : String(val);
  }

  routine(d, scope, depth) {
    const pad = '  '.repeat(depth);
    let sym = scope.syms.get(d.name);
    if (!sym || sym.kind !== 'routine') {
      sym = { kind: 'routine', name: d.name, js: this.jsName(d.name), isFunc: d.isFunc, params: null, result: null };
      scope.syms.set(d.name, sym);
    }
    if (d.params.length || !sym.params) sym.params = d.params.map(p => ({ name: p.name, isVar: p.isVar, type: this.resolveType(p.type, scope) }));
    if (d.result) sym.result = this.resolveType(d.result, scope);
    if (d.header) return [];
    const inner = new Scope(scope, 'routine', sym);
    const ctx = { temps: [], fn: sym, labels: new Map() };
    this.collectLabels(d.decls, ctx);
    const params = sym.params.map(p => {
      const js = this.jsName(p.name);
      inner.syms.set(p.name, { kind: p.isVar ? 'ref' : 'var', type: p.type, js });
      return js;
    });
    if (sym.isFunc) inner.syms.set(d.name, { kind: 'result', type: sym.result, js: '$result', fn: sym });
    const lines = [`${pad}function ${sym.js}(${params.join(', ')}) {`];
    // Structured value parameters are the callee's own copies
    for (const p of sym.params) if (!p.isVar && (p.type.k === 'rec' || p.type.k === 'array')) lines.push(`${pad}  ${inner.syms.get(p.name).js} = R.clone(${inner.syms.get(p.name).js});`);
    if (sym.isFunc) lines.push(`${pad}  let $result = ${this.initValue(sym.result)};`);
    lines.push(...this.decls(d.decls, inner, ctx, depth + 1));
    const body = this.stmts(d.body, inner, ctx, depth + 1);
    if (ctx.temps.length) lines.push(`${pad}  let ${ctx.temps.join(', ')};`);
    lines.push(body);
    if (sym.isFunc) lines.push(`${pad}  return $result;`);
    lines.push(`${pad}}`);
    // The used-name set is global, so nested names stay distinct
    return lines;
  }

  // ----- statements -----

  // A statement list, with goto turned into labelled blocks and loops: a
  // forward goto breaks out of a block that ends at its label, a backward
  // one continues a loop that starts at its label. Each label's gotos must
  // sit between the previous label and the end of the list.
  stmts(list, scope, ctx, depth) {
    const pad = '  '.repeat(depth);
    const emit = part => part.map(s => this.stmt(s, scope, ctx, depth)).filter(Boolean).join('\n');
    const labelled = [];
    list.forEach((s, i) => { if (s.s === 'label') labelled.push(i); });
    if (!labelled.length) return emit(list);
    const json = part => JSON.stringify(part, (k, v) => (k === 'at' ? undefined : v));
    const hasGoto = (part, name) => json(part).includes(`"s":"goto","name":"${name}"`);
    const emitFrom = (start, labels) => {
      if (!labels.length) return emit(list.slice(start));
      const [i, ...rest] = labels;
      const { name, stmt } = list[i];
      const js = `L${++this.labelSeq}_${name.replace(/\W/g, '')}`;
      const fwd = hasGoto(list.slice(start, i), name);
      const back = hasGoto(list.slice(i), name);
      ctx.labels.set(name, { js, mode: 'fwd' });
      const before = emit(list.slice(start, i));
      ctx.labels.set(name, { js, mode: 'back' });
      const saved = list[i];
      list[i] = stmt;
      const after = emitFrom(i, rest);
      list[i] = saved;
      ctx.labels.delete(name);
      let code = fwd ? `${pad}${js}: {\n${before}\n${pad}}` : before;
      if (back) code += `${code ? '\n' : ''}${pad}${js}: for (;;) {\n${after}\n${pad}  break;\n${pad}}`;
      else if (after) code += `${code ? '\n' : ''}${after}`;
      return code;
    };
    return emitFrom(0, labelled);
  }

  stmt(s, scope, ctx, depth) {
    const pad = '  '.repeat(depth);
    switch (s.s) {
      case 'empty': return '';
      case 'label': return this.stmts([s], scope, ctx, depth);
      case 'block': return this.stmts(s.body, scope, ctx, depth);
      case 'goto': {
        const l = ctx.labels.get(s.name);
        if (!l) fail(s.at, `goto ${s.name} jumps where this translator can't follow`);
        return l.mode === 'fwd' ? `${pad}break ${l.js};` : `${pad}continue ${l.js};`;
      }
      case 'assign': return `${pad}${this.assign(s.target, s.value, scope, ctx)};`;
      case 'call': return `${pad}${this.callStmt(s.d, scope, ctx)};`;
      case 'if': {
        const c = this.cond(s.cond, scope, ctx);
        let code = `${pad}if (${c}) {\n${this.stmt(s.then, scope, ctx, depth + 1)}\n${pad}}`;
        if (s.else) {
          if (s.else.s === 'if') code += ` else ${this.stmt(s.else, scope, ctx, depth).trimStart()}`;
          else code += ` else {\n${this.stmt(s.else, scope, ctx, depth + 1)}\n${pad}}`;
        }
        return code;
      }
      case 'while': return `${pad}while (${this.cond(s.cond, scope, ctx)}) {\n${this.stmt(s.body, scope, ctx, depth + 1)}\n${pad}}`;
      case 'repeat': return `${pad}do {\n${this.stmts(s.body, scope, ctx, depth + 1)}\n${pad}} while (!(${this.cond(s.cond, scope, ctx)}));`;
      case 'for': {
        // As Turbo Pascal compiles it: the counter is set even when the loop
        // doesn't run, stops at the last value (no wrap past a byte's 255),
        // and keeps that value after the loop
        const v = this.lvalue(s.v, scope, ctx);
        if (!v.simple) fail(s.at, 'for loops need a simple variable');
        const from = this.expr(s.from, scope, ctx), to = this.expr(s.to, scope, ctx);
        const lim = this.temp(ctx);
        const [cmp, last, step] = s.down ? ['>=', '<=', '--'] : ['<=', '>=', '++'];
        const inner = '  '.repeat(depth + 1);
        if (v.type.k === 'char') {
          const n = this.temp(ctx);
          return `${pad}${n} = ${this.toOrd(from)}; ${lim} = ${this.toOrd(to)};\n${pad}${v.get} = String.fromCharCode(${n});\n` +
            `${pad}if (${n} ${cmp} ${lim}) for (;;) {\n${this.stmt(s.body, scope, ctx, depth + 1)}\n${inner}if (${n} ${last} ${lim}) break;\n${inner}${n}${step}; ${v.get} = String.fromCharCode(${n});\n${pad}}`;
        }
        return `${pad}${v.get} = ${from.c}; ${lim} = ${to.c};\n` +
          `${pad}if (${v.get} ${cmp} ${lim}) for (;;) {\n${this.stmt(s.body, scope, ctx, depth + 1)}\n${inner}if (${v.get} ${last} ${lim}) break;\n${inner}${v.get}${step};\n${pad}}`;
      }
      case 'case': {
        this.caseGotos(s);
        const sel = this.expr(s.sel, scope, ctx);
        const t = this.temp(ctx);
        const test = l => {
          const lo = this.constValue(l.lo, scope);
          if (l.hi) {
            const hi = this.constValue(l.hi, scope);
            return `(${t} >= ${this.lit(lo, sel.t)} && ${t} <= ${this.lit(hi, sel.t)})`;
          }
          return `${t} === ${this.lit(lo, sel.t)}`;
        };
        let code = `${pad}${t} = ${sel.c};\n`;
        s.arms.forEach((arm, n) => {
          code += `${n ? ' else ' : pad}if (${arm.labels.map(test).join(' || ')}) {\n${this.stmt(arm.body, scope, ctx, depth + 1)}\n${pad}}`;
        });
        if (s.else) code += `${s.arms.length ? ' else ' : pad}{\n${this.stmts(s.else, scope, ctx, depth + 1)}\n${pad}}`;
        return code;
      }
      case 'with': {
        let code = '';
        const pushed = [];
        for (const r of s.recs) {
          const x = this.expr(r, scope, ctx);
          if (x.t.k !== 'rec') fail(s.at, 'with needs a record');
          const t = this.temp(ctx);
          code += `${pad}${t} = ${x.c};\n`;
          scope.withs.push({ js: t, type: x.t });
          pushed.push(1);
        }
        code += this.stmt(s.body, scope, ctx, depth);
        for (const _ of pushed) scope.withs.pop();
        return code;
      }
    }
    fail(s.at, `unsupported statement ${s.s}`);
  }

  // An arm that only jumps to a label at the start of another arm (Kroz's
  // title menu does "else goto DESCENT") runs that arm's statements instead
  caseGotos(s) {
    const strip = body => {
      if (body.s === 'label') return { name: body.name, body: body.stmt };
      if (body.s === 'block' && body.body[0]?.s === 'label') return { name: body.body[0].name, body: { ...body, body: [body.body[0].stmt, ...body.body.slice(1)] } };
      return null;
    };
    const targets = new Map();
    for (const arm of s.arms) {
      const t = strip(arm.body);
      if (t) targets.set(t.name, t.body);
    }
    if (!targets.size) return;
    const lone = list => list.length === 1 && list[0].s === 'goto' && targets.has(list[0].name) ? targets.get(list[0].name) : null;
    let used = false;
    for (const arm of s.arms) {
      const t = arm.body.s === 'goto' ? lone([arm.body]) : null;
      if (t) { arm.body = t; used = true; }
    }
    if (s.else) { const t = lone(s.else.filter(x => x.s !== 'empty')); if (t) { s.else = [t]; used = true; } }
    if (!used) return;
    for (const arm of s.arms) { const t = strip(arm.body); if (t) arm.body = t.body; }
  }

  lit(v, type) {
    if (typeof v === 'string') return type && isInt(type) ? String(v.charCodeAt(0)) : jsString(v);
    return String(v);
  }

  cond(e, scope, ctx) {
    const x = this.expr(e, scope, ctx);
    return x.c;
  }

  // ----- variables -----

  // An assignable place: get is its value, set(code) stores (wrapping)
  lvalue(d, scope, ctx) {
    d = this.mergeIndex(d, scope, ctx);
    if (d.e === 'id') {
      const sym = scope.find(d.name);
      if (!sym) fail(d.at, `unknown identifier ${d.name}`);
      if (sym.kind === 'var' || sym.kind === 'result' || sym.kind === 'field') {
        return { type: sym.type, get: sym.js, simple: true, set: (c, raw) => `${sym.js} = ${raw && sym.type.k === 'int' ? INT_SIZES[sym.type.size].wrap(c) : raw ? c : this.store(sym.type, c)}`, ref: () => sym.kind === 'var' && sym.type.k === 'file' ? sym.js : `{ get v() { return ${sym.js}; }, set v($v) { ${sym.js} = $v; } }` };
      }
      if (sym.kind === 'ref') {
        return { type: sym.type, get: `${sym.js}.v`, simple: true, set: c => `${sym.js}.v = ${this.store(sym.type, c)}`, ref: () => sym.js };
      }
      if (sym.kind === 'builtinVar') return { type: sym.type, get: sym.js, simple: true, set: c => `${sym.js} = ${this.store(sym.type, c)}`, ref: () => fail(d.at, 'cannot pass this by reference') };
      fail(d.at, `${d.name} cannot be assigned`);
    }
    if (d.e === 'field') {
      const base = this.expr(d.base, scope, ctx);
      if (base.t.k !== 'rec') fail(d.at, 'field of a non-record');
      const ft = base.t.fields.get(d.name);
      if (!ft) fail(d.at, `no field ${d.name}`);
      const get = `${base.c}.${base.t.js.get(d.name)}`;
      return { type: ft, get, set: c => `${get} = ${this.store(ft, c)}`, ref: () => `{ get v() { return ${get}; }, set v($v) { ${get} = $v; } }` };
    }
    if (d.e === 'index') {
      const base = this.expr(d.base, scope, ctx);
      if (base.t.k === 'str' || base.t.k === 'char') {
        // s[i] := c  rebuilds the string
        const place = this.lvalue(d.base, scope, ctx);
        const i = this.expr(d.idx[0], scope, ctx).c;
        return { type: T.char, get: `R.charAt(${place.get}, ${i})`, set: c => place.set(`R.setChar(${place.get}, ${i}, ${c})`), ref: () => fail(d.at, 'cannot pass a string character by reference') };
      }
      if (base.t.k !== 'array') fail(d.at, 'index of a non-array');
      const at = this.index(base.t, d.idx, scope, ctx, d.at);
      const elem = at.type;
      const get = `${base.c}[${at.c}]`;
      const typed = elem.k === 'int' || elem.k === 'real';
      return { type: elem, get, set: c => `${get} = ${typed ? c : this.store(elem, c)}`, ref: () => `{ get v() { return ${get}; }, set v($v) { ${get} = $v; } }` };
    }
    fail(d.at, 'not assignable');
  }

  // a[i][j] is a[i, j] when a has two dimensions
  mergeIndex(d, scope, ctx) {
    if (d.e !== 'index' || d.base.e !== 'index') return d;
    const inner = this.mergeIndex(d.base, scope, ctx);
    const t = this.expr(inner.base, scope, { ...ctx, temps: [] }).t;
    if (t.k === 'array' && t.dims.length >= inner.idx.length + d.idx.length) return { ...d, base: inner.base, idx: [...inner.idx, ...d.idx] };
    return { ...d, base: inner };
  }

  // Flat index into a (multi-dimensional) array
  index(type, idx, scope, ctx, at) {
    if (idx.length !== type.dims.length) {
      if (idx.length < type.dims.length) fail(at, 'partial array indexing is not supported');
      // a[i][j] on a flattened array comes as nested index nodes, handled by expr
    }
    let stride = 1;
    const parts = [];
    let offset = 0;
    for (let k = type.dims.length - 1; k >= 0; k--) {
      const dim = type.dims[k];
      const x = this.expr(idx[k], scope, ctx);
      const v = dim.char || x.t.k === 'char' ? this.toOrd(x) : dim.bool ? `+(${x.c})` : x.c;
      parts.unshift(stride === 1 ? `(${v})` : `(${v}) * ${stride}`);
      offset += dim.lo * stride;
      stride *= dim.hi - dim.lo + 1;
    }
    const c = parts.join(' + ') + (offset ? ` - ${offset}` : '');
    return { c, type: type.of };
  }

  assign(target, value, scope, ctx) {
    const place = this.lvalue(target, scope, ctx);
    const v = this.expr(value, scope, ctx, place.type);
    return place.set(this.convert(v, place.type));
  }

  // Converts a value for a target type: chars from a char-typed string
  // literal, integer to real, etc.
  convert(v, type) {
    if (type.k === 'set' && v.t.k === 'set') return v.c;
    if (type.k === 'real' && v.t.k === 'int') return v.c;
    return v.c;
  }

  toOrd(x) {
    if (x.t.k === 'char' || x.t.k === 'str') {
      if (x.lit !== undefined) return String(x.lit.charCodeAt(0));
      return `${x.c}.charCodeAt(0)`;
    }
    if (x.t.k === 'bool') return `+(${x.c})`;
    return x.c;
  }

  // ----- expressions -----

  expr(e, scope, ctx, want) {
    switch (e.e) {
      case 'num': return { c: String(e.v), t: e.real ? T.real : T.int('longint'), lit: e.v };
      case 'str': return { c: jsString(e.v), t: e.v.length === 1 ? T.char : T.str(255), lit: e.v };
      case 'nil': return { c: 'null', t: T.void };
      case 'set': return this.setExpr(e, scope, ctx);
      case 'un': {
        const x = this.expr(e.x, scope, ctx);
        if (e.op === 'not') return x.t.k === 'bool' ? { c: `!(${x.c})`, t: T.bool } : { c: `~(${x.c})`, t: x.t };
        if (e.op === '-') return { c: `-(${x.c})`, t: x.t };
        return x;
      }
      case 'bin': return this.binary(e, scope, ctx);
      case 'id': case 'field': case 'index': case 'call': return this.designatorExpr(e, scope, ctx);
    }
    fail(e.at, `unsupported expression ${e.e}`);
  }

  setExpr(e, scope, ctx) {
    const parts = e.elems.map(x => {
      const lo = this.expr(x.lo, scope, ctx);
      if (x.hi) return `${this.toOrd(lo)}, ${this.toOrd(this.expr(x.hi, scope, ctx))}`;
      return `${this.toOrd(lo)}, ${this.toOrd(lo)}`;
    });
    return { c: parts.length ? `R.setOf(${parts.join(', ')})` : 'R.EMPTY', t: { k: 'set', of: T.int('byte') }, setLit: e };
  }

  binary(e, scope, ctx) {
    const op = e.op;
    if (op === 'in') {
      const l = this.expr(e.l, scope, ctx);
      const code = this.toOrd(l);
      if (e.r.e === 'set') {
        // Inline the tests against a literal set
        const t = /^[\w$.]+$/.test(code) ? code : this.temp(ctx);
        const tests = e.r.elems.map(x => {
          const lo = this.toOrd(this.expr(x.lo, scope, ctx));
          if (x.hi) return `(${t} >= ${lo} && ${t} <= ${this.toOrd(this.expr(x.hi, scope, ctx))})`;
          return `${t} === ${lo}`;
        });
        if (!tests.length) return { c: 'false', t: T.bool };
        return { c: t === code ? `(${tests.join(' || ')})` : `(${t} = ${code}, ${tests.join(' || ')})`, t: T.bool };
      }
      const r = this.expr(e.r, scope, ctx);
      return { c: `R.inSet(${r.c}, ${code})`, t: T.bool };
    }
    const l = this.expr(e.l, scope, ctx), r = this.expr(e.r, scope, ctx);
    const lt = l.t, rt = r.t;
    if (lt.k === 'set' || rt.k === 'set') {
      const fn = { '+': 'union', '-': 'diff', '*': 'inter', '=': 'setEq', '<>': 'setNe', '<=': 'subset', '>=': 'superset' }[op];
      if (!fn) fail(e.at, `set operator ${op}`);
      return { c: `R.${fn}(${l.c}, ${r.c})`, t: ['=', '<>', '<=', '>='].includes(op) ? T.bool : lt };
    }
    const cmp = { '=': '===', '<>': '!==', '<': '<', '>': '>', '<=': '<=', '>=': '>=' }[op];
    if (cmp) {
      // Comparing a char with a number never happens in Pascal; a string
      // literal of one character is a char
      return { c: `(${l.c} ${cmp} ${r.c})`, t: T.bool };
    }
    const bool = lt.k === 'bool' && rt.k === 'bool';
    switch (op) {
      case '+':
        if (isStrish(lt) || isStrish(rt)) return { c: `(${l.c} + ${r.c})`, t: T.str(255) };
        return { c: `(${l.c} + ${r.c})`, t: this.numType(lt, rt) };
      case '-': return { c: `(${l.c} - ${r.c})`, t: this.numType(lt, rt) };
      case '*': return { c: `(${l.c} * ${r.c})`, t: this.numType(lt, rt) };
      case '/': return { c: `(${l.c} / ${r.c})`, t: T.real };
      case 'div': return { c: `Math.trunc(${l.c} / ${r.c})`, t: this.numType(lt, rt) };
      case 'mod': return { c: `(${l.c} % ${r.c})`, t: this.numType(lt, rt) };
      case 'shl': return { c: `(${l.c} << ${r.c})`, t: lt };
      case 'shr': return { c: `(${l.c} >>> ${r.c})`, t: lt };
      case 'and': return bool ? { c: `(${l.c} && ${r.c})`, t: T.bool } : { c: `(${l.c} & ${r.c})`, t: this.numType(lt, rt) };
      case 'or': return bool ? { c: `(${l.c} || ${r.c})`, t: T.bool } : { c: `(${l.c} | ${r.c})`, t: this.numType(lt, rt) };
      case 'xor': return bool ? { c: `(${l.c} !== ${r.c})`, t: T.bool } : { c: `(${l.c} ^ ${r.c})`, t: this.numType(lt, rt) };
    }
    fail(e.at, `operator ${op}`);
  }

  numType(a, b) {
    if (a.k === 'real' || b.k === 'real') return T.real;
    return T.int('longint');
  }

  designatorExpr(e, scope, ctx) {
    if (e.e === 'id') {
      // with-fields shadow everything
      const sym = scope.find(e.name);
      if (!sym) fail(e.at, `unknown identifier ${e.name}`);
      switch (sym.kind) {
        case 'var': case 'field': case 'builtinVar': return { c: sym.js, t: sym.type };
        case 'ref': return { c: `${sym.js}.v`, t: sym.type };
        case 'const': {
          const v = sym.value;
          if (v && v.set) return { c: `R.setOf(${v.set.map(([lo, hi]) => `${this.ord(lo)}, ${this.ord(hi ?? lo)}`).join(', ')})`, t: sym.type };
          return { c: typeof v === 'string' ? jsString(v) : String(v), t: sym.type, lit: v };
        }
        case 'result':
          // Inside a function its name is the result when assigned, a call when read
          return { c: `${sym.fn.js}()`, t: sym.type };
        case 'routine': return this.call(sym, [], e, scope, ctx);
        case 'builtin': return sym.fn([], e, scope, ctx);
      }
      fail(e.at, `${e.name} is not a value`);
    }
    if (e.e === 'call') {
      if (e.base.e !== 'id') fail(e.at, 'only named routines can be called');
      const sym = scope.find(e.base.name);
      if (!sym) fail(e.at, `unknown routine ${e.base.name}`);
      if (sym.kind === 'routine') return this.call(sym, e.args, e, scope, ctx);
      if (sym.kind === 'builtin') return sym.fn(e.args, e, scope, ctx);
      if (sym.kind === 'type') return this.cast(sym.type, e.args[0], scope, ctx);
      if (sym.kind === 'result') return this.call(sym.fn, e.args, e, scope, ctx);
      fail(e.at, `${e.base.name} is not a routine`);
    }
    if (e.e === 'field') {
      const base = this.expr(e.base, scope, ctx);
      if (base.t.k !== 'rec') fail(e.at, 'field of a non-record');
      const ft = base.t.fields.get(e.name);
      if (!ft) fail(e.at, `no field ${e.name}`);
      return { c: `${base.c}.${base.t.js.get(e.name)}`, t: ft };
    }
    if (e.e === 'index') {
      e = this.mergeIndex(e, scope, ctx);
      if (e.e !== 'index') return this.designatorExpr(e, scope, ctx);
      const base = this.expr(e.base, scope, ctx);
      if (base.t.k === 'str' || base.t.k === 'char') {
        return { c: `R.charAt(${base.c}, ${this.expr(e.idx[0], scope, ctx).c})`, t: T.char };
      }
      if (base.t.k !== 'array') fail(e.at, 'index of a non-array');
      const at = this.index(base.t, e.idx, scope, ctx, e.at);
      // Turbo Pascal doesn't check bounds, and the games sometimes read or
      // write just past an array (the high scores write entry 99 of 15 when
      // a score doesn't place): such a record or string reads as empty, and
      // what's written to it goes nowhere
      const k = at.type.k;
      if (k === 'rec') return { c: `(${base.c}[${at.c}] || ${this.initValue(at.type)})`, t: at.type };
      if (k === 'str' || k === 'char') return { c: `(${base.c}[${at.c}] ?? ${this.initValue(at.type)})`, t: at.type };
      return { c: `${base.c}[${at.c}]`, t: at.type };
    }
    fail(e.at, 'bad designator');
  }

  cast(type, arg, scope, ctx) {
    const x = this.expr(arg, scope, ctx);
    if (type.k === 'char') return isInt(x.t) ? { c: `String.fromCharCode(${x.c})`, t: T.char } : { c: x.c, t: T.char };
    if (type.k === 'int') return { c: INT_SIZES[type.size].wrap(this.toOrd(x)), t: type };
    if (type.k === 'bool') return { c: `!!(${x.c})`, t: T.bool };
    return { c: x.c, t: type };
  }

  call(sym, args, e, scope, ctx) {
    if (args.length !== sym.params.length) fail(e.at, `${sym.name} takes ${sym.params.length} arguments`);
    const code = args.map((a, i) => {
      const p = sym.params[i];
      if (p.isVar) return this.lvalue(a, scope, ctx).ref();
      const x = this.expr(a, scope, ctx);
      return this.convert(x, p.type);
    });
    return { c: `${sym.js}(${code.join(', ')})`, t: sym.isFunc ? sym.result : T.void };
  }

  callStmt(d, scope, ctx) {
    // A bare function name being assigned is handled by assign; here a
    // call, with or without arguments
    const x = this.expr(d.e === 'id' || d.e === 'call' ? d : d, scope, ctx);
    return x.c;
  }

  // ----- the runtime library -----

  builtins(scope) {
    const g = this;
    const def = (name, fn) => scope.syms.set(name, { kind: 'builtin', fn });
    const v = (name, type, js) => scope.syms.set(name, { kind: 'builtinVar', type, js });
    const c = (name, value) => scope.syms.set(name, { kind: 'const', value, type: T.int('longint') });
    const ex = (a, s, ctx) => g.expr(a, s, ctx);
    const simple = (name, js, type = T.void) => def(name, (args, e, s, ctx) => ({ c: `${js}(${args.map(a => ex(a, s, ctx).c).join(', ')})`, t: type }));

    ['black', 'blue', 'green', 'cyan', 'red', 'magenta', 'brown', 'lightgray', 'darkgray', 'lightblue', 'lightgreen',
      'lightcyan', 'lightred', 'lightmagenta', 'yellow', 'white'].forEach((n, i) => c(n, i));
    c('blink', 128); c('bw40', 0); c('co40', 1); c('c40', 1); c('bw80', 2); c('co80', 3); c('c80', 3); c('mono', 7);
    c('maxint', 32767); c('maxlongint', 2147483647);
    scope.syms.set('true', { kind: 'const', value: true, type: T.bool });
    scope.syms.set('false', { kind: 'const', value: false, type: T.bool });
    v('textattr', T.int('byte'), 'R.crt.textattr');
    v('lastmode', T.int('word'), 'R.crt.lastmode');
    v('checkbreak', T.bool, 'R.crt.checkbreak');
    v('directvideo', T.bool, 'R.crt.directvideo');
    v('checksnow', T.bool, 'R.crt.checksnow');
    v('kbd', { k: 'file', of: null, text: true, kbd: true }, 'R.KBD');
    v('lst', { k: 'file', of: null, text: true, lst: true }, 'R.LST');
    v('output', { k: 'file', of: null, text: true, out: true }, 'R.OUTPUT');
    v('input', { k: 'file', of: null, text: true, inp: true }, 'R.INPUT');
    for (const [n, t] of Object.entries({ integer: T.int('integer'), byte: T.int('byte'), word: T.int('word'),
      shortint: T.int('shortint'), longint: T.int('longint'), char: T.char, boolean: T.bool, real: T.real, string: T.str(255) })) {
      scope.syms.set(n, { kind: 'type', type: t });
    }
    const regs = { k: 'rec', fields: new Map(), js: new Map() };
    for (const r of ['ax', 'bx', 'cx', 'dx', 'bp', 'si', 'di', 'ds', 'es', 'flags']) { regs.fields.set(r, T.int('word')); regs.js.set(r, r); }
    scope.syms.set('registers', { kind: 'type', type: regs });

    simple('gotoxy', 'R.gotoxy'); simple('textcolor', 'R.textcolor'); simple('textbackground', 'R.textbackground');
    simple('clrscr', 'R.clrscr'); simple('clreol', 'R.clreol'); simple('insline', 'R.insline'); simple('delline', 'R.delline');
    simple('window', 'R.window'); simple('textmode', 'R.textmode'); simple('lowvideo', 'R.lowvideo');
    simple('highvideo', 'R.highvideo'); simple('normvideo', 'R.normvideo'); simple('delay', 'R.delay');
    simple('sound', 'R.sound'); simple('nosound', 'R.nosound'); simple('randomize', 'R.randomize');
    simple('halt', 'R.halt'); simple('intr', 'R.intr'); simple('crtinit', 'R.noop'); simple('crtexit', 'R.noop');
    simple('wherex', 'R.wherex', T.int('byte')); simple('wherey', 'R.wherey', T.int('byte'));
    simple('keypressed', 'R.keypressed', T.bool); simple('readkey', 'R.readkey', T.char);
    simple('ioresult', 'R.ioresult', T.int('integer'));
    simple('assign', 'R.assign'); simple('reset', 'R.reset'); simple('rewrite', 'R.rewrite'); simple('close', 'R.close');
    simple('erase', 'R.erase'); simple('seek', 'R.seek'); simple('eof', 'R.eof', T.bool); simple('filesize', 'R.filesize', T.int('longint'));
    def('exit', (args, e, s, ctx) => ({ c: ctx.fn ? (ctx.fn.isFunc ? 'return $result' : 'return') : 'R.halt()', t: T.void }));

    def('random', (args, e, s, ctx) => args.length ? { c: `R.random(${ex(args[0], s, ctx).c})`, t: T.int('word') } : { c: 'R.randomReal()', t: T.real });
    def('ord', (args, e, s, ctx) => ({ c: g.toOrd(ex(args[0], s, ctx)), t: T.int('longint') }));
    def('chr', (args, e, s, ctx) => {
      const x = ex(args[0], s, ctx);
      return x.lit !== undefined ? { c: jsString(String.fromCharCode(x.lit)), t: T.char, lit: String.fromCharCode(x.lit) } : { c: `String.fromCharCode((${x.c}) & 255)`, t: T.char };
    });
    def('upcase', (args, e, s, ctx) => ({ c: `R.upcase(${ex(args[0], s, ctx).c})`, t: T.char }));
    def('length', (args, e, s, ctx) => ({ c: `${ex(args[0], s, ctx).c}.length`, t: T.int('byte') }));
    def('copy', (args, e, s, ctx) => ({ c: `R.copy(${args.map(a => ex(a, s, ctx).c).join(', ')})`, t: T.str(255) }));
    def('concat', (args, e, s, ctx) => ({ c: `(${args.map(a => ex(a, s, ctx).c).join(' + ')})`, t: T.str(255) }));
    def('pos', (args, e, s, ctx) => ({ c: `(${ex(args[1], s, ctx).c}.indexOf(${ex(args[0], s, ctx).c}) + 1)`, t: T.int('byte') }));
    def('odd', (args, e, s, ctx) => ({ c: `((${ex(args[0], s, ctx).c} & 1) !== 0)`, t: T.bool }));
    def('abs', (args, e, s, ctx) => { const x = ex(args[0], s, ctx); return { c: `Math.abs(${x.c})`, t: x.t }; });
    def('sqr', (args, e, s, ctx) => { const x = ex(args[0], s, ctx); return { c: `((${x.c}) ** 2)`, t: x.t }; });
    def('sqrt', (args, e, s, ctx) => ({ c: `Math.sqrt(${ex(args[0], s, ctx).c})`, t: T.real }));
    def('trunc', (args, e, s, ctx) => ({ c: `Math.trunc(${ex(args[0], s, ctx).c})`, t: T.int('longint') }));
    def('round', (args, e, s, ctx) => ({ c: `R.round(${ex(args[0], s, ctx).c})`, t: T.int('longint') }));
    def('hi', (args, e, s, ctx) => ({ c: `((${ex(args[0], s, ctx).c} >> 8) & 255)`, t: T.int('byte') }));
    def('lo', (args, e, s, ctx) => ({ c: `(${ex(args[0], s, ctx).c} & 255)`, t: T.int('byte') }));
    const step = sign => (args, e, s, ctx) => {
      const x = ex(args[0], s, ctx);
      const n = args[1] ? ex(args[1], s, ctx).c : '1';
      if (x.t.k === 'char') return { c: `String.fromCharCode((${g.toOrd(x)} ${sign} ${n}) & 255)`, t: T.char };
      return { c: `(${x.c} ${sign} ${n})`, t: x.t };
    };
    def('succ', step('+')); def('pred', step('-'));
    const incdec = sign => (args, e, s, ctx) => {
      const place = g.lvalue(args[0], s, ctx);
      const n = args[1] ? ex(args[1], s, ctx).c : '1';
      if (place.type.k === 'char') return { c: place.set(`String.fromCharCode((${place.get}.charCodeAt(0) ${sign} ${n}) & 255)`), t: T.void };
      return { c: place.set(`${place.get} ${sign} ${n}`), t: T.void };
    };
    def('inc', incdec('+')); def('dec', incdec('-'));
    def('str', (args, e, s, ctx) => {
      const x = ex(args[0], s, ctx);
      const w = args[0].width ? ex(args[0].width, s, ctx).c : '0';
      return { c: g.lvalue(args[1], s, ctx).set(`R.fmt(${x.c}, ${w})`), t: T.void };
    });
    def('val', (args, e, s, ctx) => {
      const t = g.temp(ctx);
      const a = g.lvalue(args[1], s, ctx), b = g.lvalue(args[2], s, ctx);
      return { c: `(${t} = R.val(${ex(args[0], s, ctx).c}), ${a.set(`${t}[0]`)}, ${b.set(`${t}[1]`)})`, t: T.void };
    });
    def('delete', (args, e, s, ctx) => {
      const p = g.lvalue(args[0], s, ctx);
      return { c: p.set(`R.del(${p.get}, ${ex(args[1], s, ctx).c}, ${ex(args[2], s, ctx).c})`), t: T.void };
    });
    def('insert', (args, e, s, ctx) => {
      const p = g.lvalue(args[1], s, ctx);
      return { c: p.set(`R.ins(${ex(args[0], s, ctx).c}, ${p.get}, ${ex(args[2], s, ctx).c})`), t: T.void };
    });
    def('fillchar', (args, e, s, ctx) => ({ c: `R.fill(${ex(args[0], s, ctx).c}, ${ex(args[2], s, ctx).c})`, t: T.void }));

    // write/writeln to the screen or a file; widths pad numbers and strings
    const piece = (a, s, ctx) => {
      const x = ex(a, s, ctx);
      const w = a.width ? ex(a.width, s, ctx).c : null;
      if (x.t.k === 'bool') return w ? `R.fmt(${x.c} ? 'TRUE' : 'FALSE', ${w})` : `(${x.c} ? 'TRUE' : 'FALSE')`;
      if (w) return `R.fmt(${x.c}, ${w})`;
      if (isInt(x.t) || x.t.k === 'real') return `String(${x.c})`;
      return x.c;
    };
    const fileArg = (args, s, ctx) => {
      if (!args.length || args[0].e !== 'id') return null;
      const sym = s.find(args[0].name);
      if (sym && (sym.kind === 'var' || sym.kind === 'builtinVar' || sym.kind === 'ref') && sym.type.k === 'file') return { sym, x: ex(args[0], s, ctx) };
      return null;
    };
    const write = ln => (args, e, s, ctx) => {
      const f = fileArg(args, s, ctx);
      const rest = f ? args.slice(1) : args;
      if (f && f.sym.type.lst) return { c: 'R.noop()', t: T.void };
      if (f && !f.sym.type.out) {
        // Typed files: one record per argument
        return { c: rest.map(a => `R.fwrite(${f.x.c}, ${ex(a, s, ctx).c})`).join(', ') || 'R.noop()', t: T.void };
      }
      const text = rest.map(a => piece(a, s, ctx)).join(' + ') || "''";
      return { c: `R.write(${ln ? `${text} + '\\r\\n'` : text})`, t: T.void };
    };
    def('write', write(false)); def('writeln', write(true));
    const read = ln => (args, e, s, ctx) => {
      const f = fileArg(args, s, ctx);
      const rest = f ? args.slice(1) : args;
      if (f && f.sym.type.kbd) return { c: rest.map(a => g.lvalue(a, s, ctx).set('R.readKbd()')).join(', ') || 'R.readKbd()', t: T.void };
      if (f && !f.sym.type.inp) return { c: rest.map(a => g.lvalue(a, s, ctx).set(`R.fread(${f.x.c})`)).join(', ') || 'R.noop()', t: T.void };
      // From the keyboard with echo: a line for strings, else a number
      if (!rest.length) return { c: 'R.readLine(0)', t: T.void };
      return { c: rest.map(a => {
        const p = g.lvalue(a, s, ctx);
        if (p.type.k === 'str') return p.set(`R.readLine(${p.type.max})`);
        if (p.type.k === 'char') return p.set('R.readChar()');
        return p.set('R.val(R.readLine(10))[0]');
      }).join(', '), t: T.void };
    };
    def('read', read(false)); def('readln', read(true));
  }
}

// Lexes, parses and translates one program and the units it uses from dir
export function translate(dir, programFile) {
  const files = folder(dir);
  const program = new Parser(lex(programFile, files)).module();
  if (program.kind !== 'program') throw new PascalError(`${programFile} is not a program`);
  // Find each used unit's file by its "unit Name;" line
  const unitFiles = new Map();
  for (const name of files.names()) {
    const m = /^\s*unit\s+(\w+)\s*;/im.exec(files.read(name).text);
    if (m) unitFiles.set(m[1].toLowerCase(), name);
  }
  const builtinUnits = new Set(['crt', 'dos', 'turbo3', 'printer']);
  const units = [], seen = new Set();
  const load = list => {
    for (const u of list) {
      if (builtinUnits.has(u) || seen.has(u)) continue;
      seen.add(u);
      const file = unitFiles.get(u);
      if (!file) throw new PascalError(`no file declares unit ${u}`);
      const ast = new Parser(lex(file, files)).module();
      load(ast.uses);
      units.push(ast);
    }
  };
  load(program.uses);
  const g = new Gen();
  const header = `// Translated from Turbo Pascal by tools/kroz/pascal.mjs; do not edit.\nimport * as R from '../runtime.js';\n`;
  return header + g.module(units, program);
}

export { PascalError };
