// Encryption for sending games from a phone to the car. A sealed game is
//   12-byte IV | AES-GCM( 2-byte name length | file name | game bytes )
// with the session id as additional data, so a file can't be replayed into
// another session.

const enc = new TextEncoder(), dec = new TextDecoder();

export const toBase64Url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function sealGame(key, sid, name, bytes) {
  const n = enc.encode(name.slice(0, 200));
  const plain = new Uint8Array(2 + n.length + bytes.length);
  new DataView(plain.buffer).setUint16(0, n.length);
  plain.set(n, 2);
  plain.set(bytes, 2 + n.length);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(sid) }, key, plain));
  const out = new Uint8Array(12 + sealed.length);
  out.set(iv);
  out.set(sealed, 12);
  return out;
}

export async function openGame(key, sid, data) {
  const plain = new Uint8Array(await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: data.subarray(0, 12), additionalData: enc.encode(sid) }, key, data.subarray(12)));
  const len = new DataView(plain.buffer).getUint16(0);
  return { name: dec.decode(plain.subarray(2, 2 + len)), bytes: plain.slice(2 + len) };
}
