// Turns a TGA image (Quake 3's level shots) into a PNG for a web page.
import { crc32, deflateSync } from 'node:zlib';

export function tgaToPng(tga) {
  const idLen = tga[0], type = tga[2], w = tga.readUInt16LE(12), h = tga.readUInt16LE(14), bpp = tga[16], topDown = tga[17] & 0x20;
  if (tga[1] !== 0 || ![2, 3, 10, 11].includes(type)) throw new Error(`unsupported TGA type ${type}`);
  const bytes = bpp / 8;
  const pixels = Buffer.alloc(w * h * bytes);
  let p = 18 + idLen;
  if (type < 9) tga.copy(pixels, 0, p, p + pixels.length);
  else {
    for (let o = 0; o < pixels.length;) {
      const head = tga[p++], n = (head & 0x7f) + 1;
      if (head & 0x80) { for (let i = 0; i < n; i++, o += bytes) tga.copy(pixels, o, p, p + bytes); p += bytes; }
      else { tga.copy(pixels, o, p, p + n * bytes); p += n * bytes; o += n * bytes; }
    }
  }
  // PNG rows, top first, RGB(A), each with filter type 0
  const grey = type === 3 || type === 11, alpha = bytes === 4, outBytes = grey ? 1 : alpha ? 4 : 3;
  const rows = Buffer.alloc(h * (1 + w * outBytes));
  for (let y = 0; y < h; y++) {
    const src = (topDown ? y : h - 1 - y) * w * bytes, dst = y * (1 + w * outBytes) + 1;
    for (let x = 0; x < w; x++) {
      const s = src + x * bytes, d = dst + x * outBytes;
      if (grey) { rows[d] = pixels[s]; continue; }
      rows[d] = pixels[s + 2]; rows[d + 1] = pixels[s + 1]; rows[d + 2] = pixels[s];
      if (alpha) rows[d + 3] = pixels[s + 3];
    }
  }
  const chunk = (kind, body) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(body.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(kind), body])));
    return Buffer.concat([len, Buffer.from(kind), body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = grey ? 0 : alpha ? 6 : 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
