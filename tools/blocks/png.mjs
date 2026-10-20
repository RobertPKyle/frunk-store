// A small PNG reader and writer for the texture pack: reads 8-bit
// grayscale, RGB, palette (1-8 bit), gray+alpha and RGBA images without
// interlacing, and writes RGBA. Images are { width, height, data } with
// data as RGBA bytes.
import { deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

export function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG');
  let width, height, depth, type, interlace, palette, trns;
  const idat = [];
  for (let at = 8; at < buf.length;) {
    const len = buf.readUInt32BE(at), kind = buf.toString('latin1', at + 4, at + 8), body = buf.subarray(at + 8, at + 8 + len);
    if (kind === 'IHDR') {
      width = body.readUInt32BE(0); height = body.readUInt32BE(4);
      depth = body[8]; type = body[9]; interlace = body[12];
    } else if (kind === 'PLTE') palette = body;
    else if (kind === 'tRNS') trns = body;
    else if (kind === 'IDAT') idat.push(body);
    else if (kind === 'IEND') break;
    at += 12 + len;
  }
  if (interlace) throw new Error('interlaced PNGs are not supported');
  if (depth !== 8 && !(type === 3 && depth < 8)) throw new Error(`PNG bit depth ${depth} (type ${type}) is not supported`);
  const channels = CHANNELS[type];
  const bpp = Math.max(1, channels * depth / 8);
  const stride = Math.ceil(width * channels * depth / 8);
  const raw = inflateSync(Buffer.concat(idat));
  const rows = Buffer.alloc(stride * height);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = rows.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? row[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let v = src[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      row[x] = v;
    }
    prev = row;
  }
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const row = rows.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (type === 3) {
        const i = (row[(x * depth) >> 3] >> (8 - depth - ((x * depth) & 7))) & ((1 << depth) - 1);
        data[o] = palette[i * 3]; data[o + 1] = palette[i * 3 + 1]; data[o + 2] = palette[i * 3 + 2];
        data[o + 3] = trns && i < trns.length ? trns[i] : 255;
      } else if (type === 0 || type === 4) {
        const g = row[x * channels];
        data[o] = data[o + 1] = data[o + 2] = g;
        data[o + 3] = type === 4 ? row[x * 2 + 1] : trns && trns.readUInt16BE(0) === g ? 0 : 255;
      } else {
        const p = x * channels;
        data[o] = row[p]; data[o + 1] = row[p + 1]; data[o + 2] = row[p + 2];
        data[o + 3] = type === 6 ? row[p + 3]
          : trns && trns.readUInt16BE(0) === row[p] && trns.readUInt16BE(2) === row[p + 1] && trns.readUInt16BE(4) === row[p + 2] ? 0 : 255;
      }
    }
  }
  return { width, height, data };
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(kind, body) {
  const out = Buffer.alloc(12 + body.length);
  out.writeUInt32BE(body.length, 0);
  out.write(kind, 4, 'latin1');
  body.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)), 8 + body.length);
  return out;
}

export function encodePng({ width, height, data }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) data.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

export const blank = (width, height) => ({ width, height, data: Buffer.alloc(width * height * 4) });

export function crop(img, x, y, width, height) {
  const out = blank(width, height);
  for (let j = 0; j < height; j++) img.data.copy(out.data, j * width * 4, ((y + j) * img.width + x) * 4, ((y + j) * img.width + x + width) * 4);
  return out;
}

// Draws src onto dst at (x, y), blending by src's alpha
export function draw(dst, src, x, y) {
  for (let j = 0; j < src.height; j++) {
    for (let i = 0; i < src.width; i++) {
      const s = (j * src.width + i) * 4, d = ((y + j) * dst.width + x + i) * 4, a = src.data[s + 3] / 255;
      if (a === 0) continue;
      for (let k = 0; k < 3; k++) dst.data[d + k] = Math.round(src.data[s + k] * a + dst.data[d + k] * (1 - a));
      dst.data[d + 3] = Math.max(dst.data[d + 3], src.data[s + 3]);
    }
  }
}

// Multiplies the colours by [r, g, b] (0-255), the way a game tints grass
export function tint(img, [r, g, b]) {
  const out = { ...img, data: Buffer.from(img.data) };
  for (let o = 0; o < out.data.length; o += 4) {
    out.data[o] = out.data[o] * r / 255; out.data[o + 1] = out.data[o + 1] * g / 255; out.data[o + 2] = out.data[o + 2] * b / 255;
  }
  return out;
}

// Nearest-neighbour scaling to a new size
export function scale(img, width, height) {
  const out = blank(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      img.data.copy(out.data, (y * width + x) * 4, (Math.floor(y * img.height / height) * img.width + Math.floor(x * img.width / width)) * 4,
        (Math.floor(y * img.height / height) * img.width + Math.floor(x * img.width / width)) * 4 + 4);
    }
  }
  return out;
}
