// Reads and writes pk3 files (plain zip archives) for tools/openarena/pack.mjs.
import { closeSync, fstatSync, openSync, readSync, writeFileSync } from 'node:fs';
import { crc32, deflateRawSync, inflateRawSync, constants } from 'node:zlib';

// The archive's files: [{ name, size, read() }]
export function readZip(path) {
  const fd = openSync(path, 'r');
  const at = (pos, len) => { const b = Buffer.alloc(len); readSync(fd, b, 0, len, pos); return b; };
  const { size } = fstatSync(fd);
  const tail = at(Math.max(0, size - 65558), Math.min(size, 65558));
  const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error(`${path}: not a zip file`);
  const count = tail.readUInt16LE(eocd + 10), dirSize = tail.readUInt32LE(eocd + 12), dirAt = tail.readUInt32LE(eocd + 16);
  const dir = at(dirAt, dirSize);
  const files = [];
  for (let p = 0, i = 0; i < count; i++) {
    if (dir.readUInt32LE(p) !== 0x02014b50) throw new Error(`${path}: bad central directory`);
    const method = dir.readUInt16LE(p + 10), csize = dir.readUInt32LE(p + 20), usize = dir.readUInt32LE(p + 24);
    const nlen = dir.readUInt16LE(p + 28), xlen = dir.readUInt16LE(p + 30), clen = dir.readUInt16LE(p + 32);
    const local = dir.readUInt32LE(p + 42);
    const name = dir.toString('latin1', p + 46, p + 46 + nlen);
    p += 46 + nlen + xlen + clen;
    if (name.endsWith('/')) continue;
    files.push({
      name, size: usize,
      read() {
        const h = at(local, 30);
        const data = at(local + 30 + h.readUInt16LE(26) + h.readUInt16LE(28), csize);
        if (method === 0) return data;
        if (method === 8) return inflateRawSync(data);
        throw new Error(`${path}: ${name} uses compression method ${method}`);
      },
    });
  }
  files.close = () => closeSync(fd);
  return files;
}

// Writes [{ name, data }] as a zip, in the order given, with a fixed date so
// the same files always make the same archive
export function writeZip(path, files) {
  const parts = [], dir = [];
  let offset = 0;
  const DOS_TIME = 0, DOS_DATE = (2012 - 1980) << 9 | 1 << 5 | 23;   // 2012-01-23, OpenArena 0.8.8's date
  for (const { name, data } of files) {
    const crc = crc32(data);
    let body = deflateRawSync(data, { level: constants.Z_BEST_COMPRESSION });
    let method = 8;
    if (body.length >= data.length) { body = data; method = 0; }
    const n = Buffer.from(name, 'latin1');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_TIME, 10); local.writeUInt16LE(DOS_DATE, 12); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(n.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(method, 10);
    central.writeUInt16LE(DOS_TIME, 12); central.writeUInt16LE(DOS_DATE, 14); central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(n.length, 28);
    central.writeUInt32LE(offset, 42);
    parts.push(local, n, body);
    dir.push(central, n);
    offset += 30 + n.length + body.length;
  }
  const dirSize = dir.reduce((s, b) => s + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(dirSize, 12); end.writeUInt32LE(offset, 16);
  writeFileSync(path, Buffer.concat([...parts, ...dir, end]));
}
