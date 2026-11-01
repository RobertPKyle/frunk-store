// Apogee's installer archives (.SHR, as 1wolf14.zip's W3DSW14.SHR): a
// 58-byte header, then for each file a 168-byte entry (the name at 0, the
// compressed size as a u32 at 0x88, the DOS date at 0x8c and time at 0x90)
// followed by its PKWARE Data Compression Library "implode" stream, the
// same compression as Westwood's and Daggerfall's archives (blast).
//
//   import { unshr } from './dos/apogee.mjs';
//   for (const { name, data, date } of unshr(buffer)) ...
import { blast } from '../cnc/westwood.mjs';

const HEADER = 0x3a, ENTRY = 0xa8;

export function unshr(buf) {
  const files = [];
  for (let p = HEADER; p + ENTRY <= buf.length;) {
    const name = buf.toString('latin1', p, p + 13).replace(/\0.*$/s, '');
    if (!/^[\w$~!#%&'()@^`{}-]{1,8}(\.[\w$~!#%&'()@^`{}-]{1,3})?$/.test(name)) throw new Error(`.SHR: bad entry at ${p}`);
    const size = buf.readUInt32LE(p + 0x88);
    const date = buf.readUInt16LE(p + 0x8c), time = buf.readUInt16LE(p + 0x90);
    const when = new Date(1980 + (date >> 9), ((date >> 5) & 15) - 1, date & 31, time >> 11, (time >> 5) & 63, (time & 31) * 2);
    files.push({ name, data: blast(buf.subarray(p + ENTRY, p + ENTRY + size)), date: when });
    p += ENTRY + size;
  }
  return files;
}
