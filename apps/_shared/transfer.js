// Encryption for sending games from a phone to the car. Big games go in
// pieces, because the server takes at most a couple of MB per upload. A
// sealed piece is
//   12-byte IV | AES-GCM( 2-byte info length | info JSON | piece bytes )
// with "<session id>/2" as additional data, so a piece can't be replayed into
// another session. The info is { name, id, part, parts }: pieces with the
// same id are joined in part order.
//
// Phone pages from before pieces sealed whole games as
//   12-byte IV | AES-GCM( 2-byte name length | file name | game bytes )
// with the bare session id as additional data; openPiece still reads those.

const enc = new TextEncoder(), dec = new TextDecoder();

export const PIECE = 2 * 1024 * 1024;

export const toBase64Url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function seal(key, aad, head, bytes) {
  const plain = new Uint8Array(2 + head.length + bytes.length);
  new DataView(plain.buffer).setUint16(0, head.length);
  plain.set(head, 2);
  plain.set(bytes, 2 + head.length);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(aad) }, key, plain));
  const out = new Uint8Array(12 + sealed.length);
  out.set(iv);
  out.set(sealed, 12);
  return out;
}

// Splits a file into sealed pieces of at most PIECE bytes each
export async function sealPieces(key, sid, name, bytes) {
  const id = toBase64Url(crypto.getRandomValues(new Uint8Array(9)));
  const parts = Math.max(1, Math.ceil(bytes.length / PIECE));
  const out = [];
  for (let part = 0; part < parts; part++) {
    const info = enc.encode(JSON.stringify({ name: name.slice(0, 200), id, part, parts }));
    out.push(await seal(key, `${sid}/2`, info, bytes.subarray(part * PIECE, (part + 1) * PIECE)));
  }
  return out;
}

async function open(key, aad, data) {
  const plain = new Uint8Array(await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: data.subarray(0, 12), additionalData: enc.encode(aad) }, key, data.subarray(12)));
  const len = new DataView(plain.buffer).getUint16(0);
  return { head: dec.decode(plain.subarray(2, 2 + len)), bytes: plain.slice(2 + len) };
}

// -> { name, id, part, parts, bytes }
export async function openPiece(key, sid, data) {
  try {
    const { head, bytes } = await open(key, `${sid}/2`, data);
    const { name, id, part, parts } = JSON.parse(head);
    if (typeof name !== 'string' || typeof id !== 'string' || !(part >= 0 && part < parts && parts <= 64)) throw new Error('bad piece');
    return { name, id, part, parts, bytes };
  } catch (e) {
    if (e.name !== 'OperationError') throw e;
    const { head, bytes } = await open(key, sid, data);
    return { name: head, id: '', part: 0, parts: 1, bytes };
  }
}
