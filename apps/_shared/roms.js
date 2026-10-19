// Game file checks shared by Retro Console, Freedoom, Adventure Games, Text
// Adventures and the phone page: which console a file is for (from its
// header, not its name), Doom WADs, size limits, pulling the game out of a
// .zip, adventure game files and Z-machine story files.

const MB = 1024 * 1024;

export const SYSTEMS = {
  nes: { name: 'NES', exts: ['nes'], max: 2 * MB },
  gb: { name: 'Game Boy', exts: ['gb', 'gbc'], max: 8 * MB },
  gba: { name: 'Game Boy Advance', exts: ['gba'], max: 32 * MB },
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

// The console a game is for, or null
export function systemOf(bytes, name = '') {
  if (at(bytes, 0, [0x4e, 0x45, 0x53, 0x1a])) return 'nes';
  // GBA: start of the Nintendo logo at 0x04 and the fixed byte at 0xB2
  if (bytes.length >= 0xc0 && at(bytes, 4, [0x24, 0xff, 0xae, 0x51]) && bytes[0xb2] === 0x96) return 'gba';
  // Game Boy and Game Boy Color: start of the Nintendo logo at 0x104
  if (bytes.length >= 0x150 && at(bytes, 0x104, [0xce, 0xed, 0x66, 0x66])) return 'gb';
  return null;
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
