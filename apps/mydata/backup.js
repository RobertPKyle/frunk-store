// The save backup file, shared by My Data (which writes and restores it), its
// phone page (which hands it over) and the /send page (which checks a file
// before sending it back to the car). No DOM here.
//
// A backup is gzip-compressed JSON:
//   { frunk: 'saves', v: 1, made: <ISO time>, apps: { <app id>: {
//       local: { <localStorage key>: <string> },
//       idb: [ { name, version, stores: [ { name, keyPath, autoIncrement,
//                indexes: [ { name, keyPath, unique, multiEntry } ],
//                records: [ [ <key>, <value> ], … ] } ] } ] } } }
// IndexedDB values are what the apps stored: often plain objects holding
// bytes (an emscripten save file is { timestamp: Date, mode, contents:
// Uint8Array }). JSON can't hold those, so they're written as tagged objects
// (see pack below) and turned back into the same types on restore.

export const KIND = 'saves';
export const VERSION = 1;
// Saves are small: a few hundred KB for most players. This leaves room for
// big ones while keeping the trip through the phone a minute or two on LTE.
export const MAX_BACKUP = 40 * 1024 * 1024;
export const EXT = '.frunkbackup';

const enc = new TextEncoder(), dec = new TextDecoder();

export function base64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export const unbase64 = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));

const TYPED = ['Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array'];
const TAG = '$frunk';

// A value from IndexedDB as something JSON can hold. Blobs must be read
// first, so this is async.
export async function pack(v) {
  if (v === null || typeof v !== 'object') {
    if (typeof v === 'number' && !Number.isFinite(v)) return { [TAG]: 'num', v: String(v) };
    if (typeof v === 'bigint') return { [TAG]: 'big', v: String(v) };
    return v === undefined ? { [TAG]: 'undef' } : v;
  }
  if (v instanceof Date) return { [TAG]: 'date', v: v.getTime() };
  if (v instanceof ArrayBuffer) return { [TAG]: 'buf', v: base64(new Uint8Array(v)) };
  if (ArrayBuffer.isView(v)) return { [TAG]: v.constructor.name, v: base64(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)) };
  if (v instanceof Blob) return { [TAG]: 'blob', type: v.type, v: base64(new Uint8Array(await v.arrayBuffer())) };
  if (Array.isArray(v)) return Promise.all(v.map(pack));
  if (v instanceof Map) return { [TAG]: 'map', v: await Promise.all([...v].map(async ([k, x]) => [await pack(k), await pack(x)])) };
  if (v instanceof Set) return { [TAG]: 'set', v: await Promise.all([...v].map(pack)) };
  const out = {};
  for (const [k, x] of Object.entries(v)) out[k] = await pack(x);
  // an app's own object that happens to use the tag's name is kept apart
  return TAG in v ? { [TAG]: 'obj', v: out } : out;
}

export function unpack(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(unpack);
  const tag = v[TAG];
  if (tag === undefined) {
    const out = {};
    for (const [k, x] of Object.entries(v)) out[k] = unpack(x);
    return out;
  }
  switch (tag) {
    case 'undef': return undefined;
    case 'num': return Number(v.v);
    case 'big': return BigInt(v.v);
    case 'date': return new Date(v.v);
    case 'buf': return unbase64(v.v).buffer;
    case 'blob': return new Blob([unbase64(v.v)], { type: v.type });
    case 'map': return new Map(v.v.map(([k, x]) => [unpack(k), unpack(x)]));
    case 'set': return new Set(v.v.map(unpack));
    case 'obj': return unpack(v.v);
  }
  if (TYPED.includes(tag)) {
    const bytes = unbase64(v.v);
    const T = globalThis[tag];
    return new T(bytes.buffer, 0, bytes.byteLength / T.BYTES_PER_ELEMENT);
  }
  throw new Error(`unknown value in backup: ${tag}`);
}

async function gzip(bytes, how) {
  const stream = new Blob([bytes]).stream().pipeThrough(how === 'in' ? new CompressionStream('gzip') : new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// backup: { made, apps } -> the file's bytes
export async function writeBackup(apps) {
  const doc = { frunk: KIND, v: VERSION, made: new Date().toISOString(), apps };
  return gzip(enc.encode(JSON.stringify(doc)), 'in');
}

// The file's bytes -> the backup, or null when it isn't one this reads
export async function readBackup(bytes) {
  if (!(bytes?.length > 18 && bytes[0] === 0x1f && bytes[1] === 0x8b)) return null;
  try {
    const doc = JSON.parse(dec.decode(await gzip(bytes, 'out')));
    if (doc?.frunk !== KIND || !(doc.v <= VERSION) || typeof doc.apps !== 'object' || !doc.apps) return null;
    return doc;
  } catch {
    return null;
  }
}

// For the /send page: whether a file is worth sending to My Data
export async function isBackup(name, bytes) {
  return (await readBackup(bytes)) !== null;
}

export const backupName = (date = new Date()) => `frunk-saves-${date.toISOString().slice(0, 10)}${EXT}`;
