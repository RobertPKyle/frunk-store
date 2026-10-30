// Readers for the archives on EA's freeware Command & Conquer and Red Alert
// CDs, used by tools/build-cnc.mjs to take the game's files out unchanged:
//
// - InstallShield 3 archives (C&C's INSTALL/SETUP.Z), whose files are
//   compressed with PKWARE's Data Compression Library. The format is as
//   OpenRA reads it (InstallShieldPackage.cs) and the decompressor is a port
//   of Mark Adler's blast.c (zlib's contrib/blast).
// - Westwood MIX archives: C&C's plain ones and Red Alert's, whose index can
//   be encrypted with Blowfish under a key that Westwood's public RSA key
//   unlocks (as OpenRA's MixFile.cs and BlowfishKeyProvider.cs do it).
//   Blowfish's starting tables are read from Vanilla Conquer's own
//   common/blowfish.cpp rather than copied here.
import { readFileSync } from 'node:fs';

// ---------- PKWARE DCL "implode" streams (blast.c) ----------

const MAXBITS = 13;

function huffman(rep) {
  const length = [];
  for (const r of rep) for (let left = (r >> 4) + 1; left > 0; left--) length.push(r & 15);
  const count = new Int16Array(MAXBITS + 1);
  for (const len of length) count[len]++;
  const offs = new Int16Array(MAXBITS + 1);
  for (let len = 1; len < MAXBITS; len++) offs[len + 1] = offs[len] + count[len];
  const symbol = new Int16Array(length.length);
  length.forEach((len, sym) => { if (len) symbol[offs[len]++] = sym; });
  return { count, symbol };
}

const LITCODE = huffman([
  11, 124, 8, 7, 28, 7, 188, 13, 76, 4, 10, 8, 12, 10, 12, 10, 8, 23, 8,
  9, 7, 6, 7, 8, 7, 6, 55, 8, 23, 24, 12, 11, 7, 9, 11, 12, 6, 7, 22, 5,
  7, 24, 6, 11, 9, 6, 7, 22, 7, 11, 38, 7, 9, 8, 25, 11, 8, 11, 9, 12,
  8, 12, 5, 38, 5, 38, 5, 11, 7, 5, 6, 21, 6, 10, 53, 8, 7, 24, 10, 27,
  44, 253, 253, 253, 252, 252, 252, 13, 12, 45, 12, 45, 12, 61, 12, 45,
  44, 173]);
const LENCODE = huffman([2, 35, 36, 53, 38, 23]);
const DISTCODE = huffman([2, 20, 53, 230, 247, 151, 248]);
const LEN_BASE = [3, 2, 4, 5, 6, 7, 8, 9, 10, 12, 16, 24, 40, 72, 136, 264];
const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8];

// Decompresses one stream starting at buf[pos]
export function blast(buf, pos = 0) {
  let bitbuf = 0, bitcnt = 0;
  const byte = () => {
    if (pos >= buf.length) throw new Error('blast: out of input');
    return buf[pos++];
  };
  const bits = need => {
    let val = bitbuf;
    while (bitcnt < need) { val |= byte() << bitcnt; bitcnt += 8; }
    bitbuf = val >>> need;
    bitcnt -= need;
    return val & ((1 << need) - 1);
  };
  const decode = h => {
    let bb = bitbuf, left = bitcnt, code = 0, first = 0, index = 0, len = 1, next = 1;
    for (;;) {
      while (left--) {
        code |= (bb & 1) ^ 1;   // codes are stored inverted
        bb >>= 1;
        const count = h.count[next++];
        if (code < first + count) {
          bitbuf = bb;
          bitcnt = (bitcnt - len) & 7;
          return h.symbol[index + (code - first)];
        }
        index += count;
        first = (first + count) << 1;
        code <<= 1;
        len++;
      }
      left = MAXBITS + 1 - len;
      if (left === 0) throw new Error('blast: bad code');
      bb = byte();
      if (left > 8) left = 8;
    }
  };

  let out = new Uint8Array(1 << 16), n = 0;
  const room = more => {
    if (n + more <= out.length) return;
    let size = out.length * 2;
    while (size < n + more) size *= 2;
    const grown = new Uint8Array(size);
    grown.set(out.subarray(0, n));
    out = grown;
  };

  const lit = bits(8);
  if (lit > 1) throw new Error('blast: bad literal flag');
  const dict = bits(8);
  if (dict < 4 || dict > 6) throw new Error('blast: bad dictionary size');
  for (;;) {
    if (bits(1)) {
      const sym = decode(LENCODE);
      const len = LEN_BASE[sym] + bits(LEN_EXTRA[sym]);
      if (len === 519) break;   // end code
      const shift = len === 2 ? 2 : dict;
      const dist = (decode(DISTCODE) << shift) + bits(shift) + 1;
      if (dist > n) throw new Error('blast: distance too far back');
      room(len);
      for (let i = 0; i < len; i++, n++) out[n] = out[n - dist];
    } else {
      room(1);
      out[n++] = lit ? decode(LITCODE) : bits(8);
    }
  }
  return Buffer.from(out.buffer, 0, n);
}

// ---------- InstallShield 3 (.Z) ----------

// { 'DIR\\NAME': { offset, size } } with offsets into the archive
export function installShieldIndex(buf) {
  if (buf.readUInt32LE(0) !== 0x8C655D13) throw new Error('not an InstallShield 3 archive');
  const toc = buf.readInt32LE(41);
  const dirCount = buf.readUInt16LE(49);
  const dirs = [];
  let p = toc;
  for (let i = 0; i < dirCount; i++) {
    const files = buf.readUInt16LE(p), chunk = buf.readUInt16LE(p + 2), nameLen = buf.readUInt16LE(p + 4);
    dirs.push([buf.toString('latin1', p + 6, p + 6 + nameLen), files]);
    p += chunk;
  }
  const index = {};
  let data = 255;
  for (const [dir, files] of dirs) {
    for (let i = 0; i < files; i++) {
      const size = buf.readUInt32LE(p + 7), chunk = buf.readUInt16LE(p + 23), nameLen = buf[p + 29];
      index[`${dir}\\${buf.toString('latin1', p + 30, p + 30 + nameLen)}`] = { offset: data, size };
      data += size;
      p += chunk;
    }
  }
  return index;
}

export function installShieldFile(buf, index, name) {
  const entry = index[name];
  if (!entry) throw new Error(`${name} isn't in the InstallShield archive`);
  return blast(buf, entry.offset);
}

// ---------- Westwood MIX ----------

// The ID a MIX index files a name under (C&C and Red Alert)
export function mixId(name) {
  const bytes = Buffer.alloc((name.length + 3) & ~3);
  bytes.write(name.toUpperCase(), 'latin1');
  let id = 0;
  for (let i = 0; i < bytes.length; i += 4) id = (((id << 1) | (id >>> 31)) + bytes.readUInt32LE(i)) >>> 0;
  return id;
}

const PUBLIC_KEY = 'AihRvNoIbTn85FZRYNZRcT+i6KpU+maCsEqr3Q5q+LDB5tH7Tz2qQ38V';

const leBig = bytes => BigInt(`0x${Buffer.from(bytes).reverse().toString('hex') || '0'}`);
function bigLe(n, len) {
  const hex = n.toString(16).padStart(len * 2, '0').slice(-len * 2);
  return Buffer.from(hex, 'hex').reverse();
}
function modPow(base, exp, mod) {
  let result = 1n;
  base %= mod;
  for (; exp > 0n; exp >>= 1n) {
    if (exp & 1n) result = result * base % mod;
    base = base * base % mod;
  }
  return result;
}

// The 56-byte Blowfish key from the 80 bytes after a Red Alert MIX's flags
function mixBlowfishKey(keyBlock) {
  const der = Buffer.from(PUBLIC_KEY, 'base64');   // 02 <len> <modulus, big-endian>
  const modulus = BigInt(`0x${der.subarray(2, 2 + der[1]).toString('hex')}`);
  const block = Math.floor((modulus.toString(2).length - 2) / 8);
  const out = [];
  for (let p = 0; p + block + 1 <= keyBlock.length; p += block + 1)
    out.push(bigLe(modPow(leBig(keyBlock.subarray(p, p + block + 1)), 0x10001n, modulus), block));
  return Buffer.concat(out).subarray(0, 56);
}

let blowfishTables;
function blowfishInit(vcSource) {
  if (!blowfishTables) {
    const src = readFileSync(`${vcSource}/common/blowfish.cpp`, 'utf8');
    const words = [...src.slice(src.indexOf('BlowfishEngine::P_Init[')).matchAll(/0x([0-9A-Fa-f]{8})U/g)].map(m => parseInt(m[1], 16) >>> 0);
    if (words.length < 18 + 1024) throw new Error('Blowfish tables not found in blowfish.cpp');
    blowfishTables = { P: words.slice(0, 18), S: words.slice(18, 18 + 1024) };
  }
  return { P: Uint32Array.from(blowfishTables.P), S: Uint32Array.from(blowfishTables.S) };
}

function blowfish(key, vcSource) {
  const { P, S } = blowfishInit(vcSource);
  const F = x => ((((S[x >>> 24] + S[256 + ((x >>> 16) & 255)]) >>> 0) ^ S[512 + ((x >>> 8) & 255)]) + S[768 + (x & 255)]) >>> 0;
  const encrypt = (l, r) => {
    for (let i = 0; i < 16; i++) {
      l = (l ^ P[i]) >>> 0;
      r = (r ^ F(l)) >>> 0;
      [l, r] = [r, l];
    }
    [l, r] = [r, l];
    return [(l ^ P[17]) >>> 0, (r ^ P[16]) >>> 0];
  };
  for (let i = 0, j = 0; i < 18; i++) {
    let w = 0;
    for (let k = 0; k < 4; k++) w = (w << 8) | key[j++ % key.length];
    P[i] = (P[i] ^ w) >>> 0;
  }
  let l = 0, r = 0;
  for (let i = 0; i < 18; i += 2) { [l, r] = encrypt(l, r); P[i] = l; P[i + 1] = r; }
  for (let i = 0; i < 1024; i += 2) { [l, r] = encrypt(l, r); S[i] = l; S[i + 1] = r; }
  return function decrypt(buf) {
    const out = Buffer.alloc(buf.length);
    for (let p = 0; p + 8 <= buf.length; p += 8) {
      let L = buf.readUInt32BE(p), R = buf.readUInt32BE(p + 4);
      for (let i = 17; i > 1; i--) {
        L = (L ^ P[i]) >>> 0;
        R = (R ^ F(L)) >>> 0;
        [L, R] = [R, L];
      }
      [L, R] = [R, L];
      out.writeUInt32BE((L ^ P[0]) >>> 0, p);
      out.writeUInt32BE((R ^ P[1]) >>> 0, p + 4);
    }
    return out;
  };
}

// { entries: Map(id -> { offset, size }), dataStart }; offsets are into buf
export function mixIndex(buf, vcSource) {
  let header, dataStart;
  if (buf.readUInt16LE(0) === 0 && buf.readUInt16LE(2) & 2) {
    // Red Alert, encrypted: the index is padded to whole Blowfish blocks
    const decrypt = blowfish(mixBlowfishKey(buf.subarray(4, 84)), vcSource);
    const count = decrypt(buf.subarray(84, 92)).readUInt16LE(0);
    const blocks = Math.floor((13 + count * 12) / 8);
    header = decrypt(buf.subarray(84, 84 + blocks * 8));
    dataStart = 84 + blocks * 8;
  } else {
    // C&C has no flags; Red Alert's plain ones have 4 bytes of them
    header = buf.readUInt16LE(0) === 0 ? buf.subarray(4) : buf;
    dataStart = header.byteOffset - buf.byteOffset + 6 + header.readUInt16LE(0) * 12;
  }
  const count = header.readUInt16LE(0);
  const entries = new Map();
  for (let i = 0; i < count; i++) {
    const p = 6 + i * 12;
    entries.set(header.readUInt32LE(p), { offset: dataStart + header.readUInt32LE(p + 4), size: header.readUInt32LE(p + 8) });
  }
  return { entries, dataStart };
}

export function mixFile(buf, index, name) {
  const entry = index.entries.get(mixId(name));
  return entry && buf.subarray(entry.offset, entry.offset + entry.size);
}
