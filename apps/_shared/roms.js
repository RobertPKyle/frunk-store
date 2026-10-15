// Game file checks shared by Retro Console and the phone page: which console
// a file is for (from its header, not its name), size limits, and pulling the
// game out of a .zip.

const MB = 1024 * 1024;

export const SYSTEMS = {
  nes: { name: 'NES', exts: ['nes'], max: 2 * MB },
  gb: { name: 'Game Boy', exts: ['gb', 'gbc'], max: 8 * MB },
  gba: { name: 'Game Boy Advance', exts: ['gba'], max: 32 * MB },
  snes: { name: 'SNES', exts: ['sfc', 'smc'], max: 6 * MB + 512 },
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

// SNES games have no magic number. Accept a .sfc or .smc file when one of
// the places a header can be (LoROM, HiROM, ExHiROM, each with or without a
// 512-byte copier header) has a plausible map mode and reset vector.
function looksSnes(bytes) {
  if (bytes.length < 0x8000) return false;
  for (const base of [0x7fc0, 0xffc0, 0x40ffc0]) {
    for (const h of [base, base + 0x200]) {
      if (h + 0x40 > bytes.length) continue;
      const map = bytes[h + 0x15], reset = bytes[h + 0x3c] | (bytes[h + 0x3d] << 8);
      if ((map & 0xe0) === 0x20 && reset >= 0x8000) return true;
    }
  }
  return false;
}

// The console a game is for, or null
export function systemOf(bytes, name = '') {
  if (at(bytes, 0, [0x4e, 0x45, 0x53, 0x1a])) return 'nes';
  // GBA: start of the Nintendo logo at 0x04 and the fixed byte at 0xB2
  if (bytes.length >= 0xc0 && at(bytes, 4, [0x24, 0xff, 0xae, 0x51]) && bytes[0xb2] === 0x96) return 'gba';
  // Game Boy and Game Boy Color: start of the Nintendo logo at 0x104
  if (bytes.length >= 0x150 && at(bytes, 0x104, [0xce, 0xed, 0x66, 0x66])) return 'gb';
  if (SYSTEMS.snes.exts.includes(ext(name)) && looksSnes(bytes)) return 'snes';
  return null;
}

export const isColor = bytes => (bytes[0x143] & 0x80) !== 0;

// The first file in a zip with a game's extension, as { name, bytes }, or null.
// Handles stored and deflated entries, which is what zip tools write.
async function unzip(zip) {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let end = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) return null;
  let p = v.getUint32(end + 16, true);
  for (let n = v.getUint16(end + 10, true); n > 0 && p + 46 <= zip.length; n--) {
    if (v.getUint32(p, true) !== 0x02014b50) return null;
    const method = v.getUint16(p + 10, true), packed = v.getUint32(p + 20, true), size = v.getUint32(p + 24, true);
    const nameLen = v.getUint16(p + 28, true), extra = v.getUint16(p + 30, true), comment = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extra + comment;
    if (!GAME_EXTS.includes(ext(name)) || size > MAX_GAME || (method !== 0 && method !== 8)) continue;
    if (local + 30 > zip.length || v.getUint32(local, true) !== 0x04034b50) return null;
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const data = zip.subarray(start, start + packed);
    if (method === 0) return { name, bytes: data.slice() };
    const out = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    return out.length === size ? { name, bytes: out } : null;
  }
  return null;
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

export const cleanName = name => name.replace(/^.*\//, '').replace(/\.[a-z0-9]{1,4}$/i, '').replace(/[_]+/g, ' ').trim() || 'Game';
