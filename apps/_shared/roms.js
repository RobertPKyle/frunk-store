// Game file checks shared by Retro Console, Freedoom, Adventure Games, Text
// Adventures, LibreQuake and the phone page: which console a file is for
// (from its header, not its name), Doom WADs, size limits, pulling the game
// out of a .zip, adventure game files, Z-machine story files and Quake
// paks.

const MB = 1024 * 1024;

export const SYSTEMS = {
  nes: { name: 'NES', exts: ['nes'], max: 2 * MB },
  gb: { name: 'Game Boy', exts: ['gb', 'gbc'], max: 8 * MB },
  gba: { name: 'Game Boy Advance', exts: ['gba'], max: 32 * MB },
  sms: { name: 'Master System', exts: ['sms'], max: 4 * MB },
  gg: { name: 'Game Gear', exts: ['gg'], max: 4 * MB },
  sg: { name: 'SG-1000', exts: ['sg'], max: MB },
  pce: { name: 'PC Engine', exts: ['pce'], max: 2560 * 1024 + 512 },   // Street Fighter II' is the biggest HuCard
  // clownmdemu has no bank switching, so the 5 MB Super Street Fighter II is out
  md: { name: 'Mega Drive / Genesis', exts: ['md', 'gen', 'bin', 'smd'], max: 4 * MB },
  n64: { name: 'Nintendo 64', exts: ['z64', 'n64', 'v64'], max: 64 * MB },
};

export const GAME_EXTS = Object.values(SYSTEMS).flatMap(s => s.exts);
export const MAX_GAME = Math.max(...Object.values(SYSTEMS).map(s => s.max));
// A zipped game is never bigger than the game itself, give or take headers
export const MAX_FILE = MAX_GAME + 64 * 1024;

const ext = name => (/\.([a-z0-9]+)$/i.exec(name) || [])[1]?.toLowerCase() || '';
const at = (b, offset, sig) => sig.every((v, i) => b[offset + i] === v);

export const isZip = bytes => at(bytes, 0, [0x50, 0x4b, 0x03, 0x04]);
// Worth opening: a game, or a zip that may hold one
export const maybeGame = name => GAME_EXTS.includes(ext(name)) || ext(name) === 'zip';

// Master System and Game Gear games carry "TMR SEGA" near the end of their
// first 8, 16 or 32 KB, and its region nibble says which of the two; returns
// 'sms', 'gg' or null when there's no header (SG-1000 games have none, nor
// do some Master System ones)
function segaHeader(bytes) {
  for (const at of [0x7ff0, 0x3ff0, 0x1ff0]) {
    if (bytes.length < at + 16 || String.fromCharCode(...bytes.subarray(at, at + 8)) !== 'TMR SEGA') continue;
    const region = bytes[at + 15] >> 4;
    return region >= 5 && region <= 7 ? 'gg' : region === 3 || region === 4 ? 'sms' : null;
  }
  return null;
}

// The console a game is for, or null. Sega and PC Engine games are known by
// their name (.sms, .gg, .sg, .pce), as those consoles don't mark every
// game (PC Engine HuCards carry no header at all); the header settles
// Master System against Game Gear when it's there. Mega Drive games need
// their header too, since .bin is a common name for any dump.
export function systemOf(bytes, name = '') {
  if (at(bytes, 0, [0x4e, 0x45, 0x53, 0x1a])) return 'nes';
  // GBA: start of the Nintendo logo at 0x04 and the fixed byte at 0xB2
  if (bytes.length >= 0xc0 && at(bytes, 4, [0x24, 0xff, 0xae, 0x51]) && bytes[0xb2] === 0x96) return 'gba';
  // Game Boy and Game Boy Color: start of the Nintendo logo at 0x104
  if (bytes.length >= 0x150 && at(bytes, 0x104, [0xce, 0xed, 0x66, 0x66])) return 'gb';
  // Sega cartridges are whole kilobytes, some dumps with a 512-byte header
  const sega = { sms: 'sms', gg: 'gg', sg: 'sg' }[ext(name)];
  if (sega && bytes.length >= 8192 && [0, 512].includes(bytes.length % 1024)) {
    return sega === 'sg' ? 'sg' : segaHeader(bytes.length % 1024 ? bytes.subarray(512) : bytes) || sega;
  }
  // HuCards are whole multiples of 8 KB, some dumps with a 512-byte header
  if (ext(name) === 'pce' && bytes.length >= 8192 && [0, 512].includes(bytes.length % 8192)) return 'pce';
  if (SYSTEMS.md.exts.includes(ext(name)) && mdHeader(unSmd(bytes))) return 'md';
  // N64 cartridges start with the same word, in one of three byte orders
  // (.z64 as on the cartridge, .v64 with byte pairs swapped, .n64 with each
  // four reversed); n64js puts them right
  if (bytes.length >= 0x1000 && [[0x80, 0x37, 0x12, 0x40], [0x37, 0x80, 0x40, 0x12], [0x40, 0x12, 0x37, 0x80]].some(sig => at(bytes, 0, sig))) return 'n64';
  return null;
}

// Mega Drive dumps from Super Magic Drive copiers (.smd) have a 512-byte
// header, then the game in 16 KB blocks, each with its odd bytes first and
// its even bytes after; returns the plain game, or the bytes as they are
function unSmd(bytes) {
  if (bytes.length % 16384 !== 512 || bytes[8] !== 0xaa || bytes[9] !== 0xbb) return bytes;
  const out = new Uint8Array(bytes.length - 512);
  for (let block = 0; block < out.length; block += 16384) {
    const from = 512 + block;
    for (let i = 0; i < 8192; i++) {
      out[block + i * 2 + 1] = bytes[from + i];
      out[block + i * 2] = bytes[from + 8192 + i];
    }
  }
  return out;
}

// Mega Drive games carry "SEGA" at the start of their header at 0x100 (the
// console's TMSS chip checks it); the 32X's carry "SEGA 32X"
function mdHeader(bytes) {
  if (bytes.length < 0x200) return false;
  const name = String.fromCharCode(...bytes.subarray(0x100, 0x110));
  return name.includes('SEGA') && !name.includes('32X');
}

export const isColor = bytes => (bytes[0x143] & 0x80) !== 0;

// The entries of a zip's central directory, in order; stops at the first
// damaged one
function* zipEntries(zip) {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let end = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) return;
  let p = v.getUint32(end + 16, true);
  for (let n = v.getUint16(end + 10, true); n > 0 && p + 46 <= zip.length; n--) {
    if (v.getUint32(p, true) !== 0x02014b50) return;
    const method = v.getUint16(p + 10, true), packed = v.getUint32(p + 20, true), size = v.getUint32(p + 24, true);
    const nameLen = v.getUint16(p + 28, true), extra = v.getUint16(p + 30, true), comment = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extra + comment;
    yield { name, method, packed, size, local };
  }
}

// An entry's bytes, or null when its local header or data is damaged.
// Handles stored and deflated entries, which is what zip tools write.
async function inflate(zip, { method, packed, size, local }) {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  if (local + 30 > zip.length || v.getUint32(local, true) !== 0x04034b50) return null;
  const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
  const data = zip.subarray(start, start + packed);
  if (method === 0) return data.length === size ? data.slice() : null;
  const out = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  return out.length === size ? out : null;
}

// The first file in a zip with one of these extensions and at most max bytes,
// as { name, bytes }, or null
async function unzip(zip, exts = GAME_EXTS, max = MAX_GAME) {
  for (const e of zipEntries(zip)) {
    if (!exts.includes(ext(e.name)) || e.size > max || (e.method !== 0 && e.method !== 8)) continue;
    const bytes = await inflate(zip, e);
    return bytes ? { name: e.name, bytes } : null;
  }
  return null;
}

// Every file in a zip (folders are left out), as [{ name, bytes }], or null
// when one can't be read or they come to more than max bytes
export async function unzipAll(zip, max) {
  const entries = [...zipEntries(zip)].filter(e => !e.name.endsWith('/'));
  if (!entries.length || entries.reduce((n, e) => n + e.size, 0) > max) return null;
  const files = [];
  for (const e of entries) {
    const bytes = (e.method === 0 || e.method === 8) && await inflate(zip, e);
    if (!bytes) return null;
    files.push({ name: e.name, bytes });
  }
  return files;
}

// Finds the game in a file the player picked: { name, system, bytes }, or
// null when it isn't a game this app plays (or is too big for its console)
export async function findGame(name, bytes) {
  if (isZip(bytes)) {
    const inner = await unzip(bytes).catch(() => null);
    if (!inner) return null;
    ({ name, bytes } = inner);
  }
  const system = systemOf(bytes, name);
  if (system === 'md') bytes = unSmd(bytes);
  if (!system || bytes.length > SYSTEMS[system].max) return null;
  return { name, system, bytes };
}

// ---------- Doom ----------

// Doom's game data: an IWAD is a whole game (doom.wad, doom2.wad, tnt.wad,
// freedoom1.wad...); a PWAD adds levels or changes to one
export const MAX_WAD = 64 * MB;
export const MAX_WAD_FILE = MAX_WAD + 64 * 1024;
export const maybeWad = name => ['wad', 'zip'].includes(ext(name));

// 'IWAD', 'PWAD' or null, from the header and lump directory
export function wadKind(bytes) {
  if (bytes.length < 12) return null;
  const kind = String.fromCharCode(...bytes.subarray(0, 4));
  if (kind !== 'IWAD' && kind !== 'PWAD') return null;
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const lumps = v.getInt32(4, true), dir = v.getInt32(8, true);
  return lumps > 0 && dir >= 12 && dir + lumps * 16 <= bytes.length ? kind : null;
}

// Finds the WAD in a file the player picked (or in a zip): { name, kind,
// bytes }, or null
export async function findWad(name, bytes) {
  if (isZip(bytes)) {
    const inner = await unzip(bytes, ['wad'], MAX_WAD).catch(() => null);
    if (!inner) return null;
    ({ name, bytes } = inner);
  }
  const kind = bytes.length <= MAX_WAD && wadKind(bytes);
  return kind ? { name: name.replace(/^.*\//, ''), kind, bytes } : null;
}

export const cleanName = name => name.replace(/^.*\//, '').replace(/\.[a-z0-9]{1,4}$/i, '').replace(/[_]+/g, ' ').trim() || 'Game';

// ---------- adventure games (ScummVM) ----------
// A game is a folder of files, sent as a .zip of the folder or as its files.
// Any file may belong to one; ScummVM recognises the game on the car.
export const MAX_ADVENTURE_FILE = 80e6;   // what one phone code carries
export const findAdventureFile = async (name, bytes) => bytes.length ? { name } : null;

// ---------- text adventures (Z-machine) ----------
// A story file (.z3, .z5, .z8...) or a Blorb (.zblorb) with one inside.
// Version 6 games draw pictures, which Text Adventures doesn't do.
export const MAX_STORY = 512 * 1024;          // the biggest a version 8 story can be
export const MAX_STORY_FILE = 64 * MB;        // a Blorb with pictures and sounds
const STORY_EXTS = ['z1', 'z2', 'z3', 'z4', 'z5', 'z7', 'z8', 'dat', 'zblorb', 'zlb', 'blorb', 'blb'];

// The story file in a Blorb (its ZCOD chunk), or null
export function unblorb(bytes) {
  if (!at(bytes, 0, [0x46, 0x4f, 0x52, 0x4d]) || !at(bytes, 8, [0x49, 0x46, 0x52, 0x53])) return null;   // FORM ... IFRS
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let p = 12; p + 8 <= bytes.length;) {
    const type = String.fromCharCode(...bytes.subarray(p, p + 4)), len = v.getUint32(p + 4);
    if (type === 'ZCOD') return bytes.subarray(p + 8, p + 8 + len);
    p += 8 + len + (len & 1);
  }
  return null;
}

// Whether bytes look like a story this plays: a known version, and header
// addresses inside the file
export function isStory(bytes) {
  if (bytes.length < 64 || bytes.length > MAX_STORY || ![1, 2, 3, 4, 5, 7, 8].includes(bytes[0])) return false;
  const w = a => (bytes[a] << 8) | bytes[a + 1];
  const staticBase = w(0x0e);
  return staticBase >= 64 && staticBase <= bytes.length && w(0x06) < bytes.length && w(0x08) < bytes.length && w(0x0a) < bytes.length;
}

// Finds the story in a file the player picked: { name, bytes } with bytes
// the bare story file, or null
export async function findStory(name, bytes) {
  if (isZip(bytes)) {
    const inner = await unzip(bytes, STORY_EXTS, MAX_STORY_FILE).catch(() => null);
    if (!inner) return null;
    ({ name, bytes } = inner);
  }
  const story = unblorb(bytes) || bytes;
  return isStory(story) ? { name: name.replace(/^.*\//, ''), bytes: story.slice() } : null;
}

// ---------- Quake ----------
// A Quake game is pak files in game folders: id1/pak0.pak (shareware and
// full game), id1/pak1.pak (full game), and the mission packs'
// hipnotic/pak0.pak and rogue/pak0.pak; plus music as trackNN.ogg. Files
// are told apart by what's inside, since a phone may rename them.
export const MAX_QUAKE_FILE = 80e6;   // what one phone code carries

// The names of the files in a pak, or null when it isn't one
export function pakFiles(bytes) {
  if (bytes.length < 12 || !at(bytes, 0, [0x50, 0x41, 0x43, 0x4b])) return null;   // PACK
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dir = v.getInt32(4, true), len = v.getInt32(8, true);
  if (dir < 12 || len < 0 || len % 64 || dir + len > bytes.length) return null;
  const names = [];
  for (let p = dir; p < dir + len; p += 64) {
    const raw = bytes.subarray(p, p + 56);
    const end = raw.indexOf(0);
    names.push(String.fromCharCode(...raw.subarray(0, end < 0 ? 56 : end)).toLowerCase());
  }
  return names;
}

// Where a file goes in the game ('id1/pak0.pak', 'hipnotic/pak0.pak',
// 'music/track02.ogg'...), or null when it isn't one this knows
export function quakePath(name, bytes) {
  const file = name.replace(/^.*\//, '').toLowerCase();
  const track = /track(\d\d)\.ogg$/.exec(file);
  if (track && at(bytes, 0, [0x4f, 0x67, 0x67, 0x53])) return `music/track${track[1]}.ogg`;   // OggS
  const names = pakFiles(bytes);
  if (!names) return null;
  const has = n => names.includes(n);
  if (has('maps/hip1m1.bsp')) return 'hipnotic/pak0.pak';
  if (has('maps/r1m1.bsp')) return 'rogue/pak0.pak';
  if (has('gfx/palette.lmp') && has('progs.dat')) return 'id1/pak0.pak';
  if (has('maps/e2m1.bsp') || file === 'pak1.pak') return 'id1/pak1.pak';
  return null;
}

// Checks a file the player picked (zips are checked on the car):
// { name } when it may be part of a Quake game, or null
export async function findQuakeFile(name, bytes) {
  if (isZip(bytes)) return { name };
  return quakePath(name, bytes) ? { name } : null;
}
