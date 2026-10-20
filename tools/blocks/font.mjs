// Draws ClassiCube's bitmap font (default.png: code page 437, 16x16 cells)
// from Monocraft, a pixel font in the style of Minecraft's (SIL Open Font
// License 1.1), for tools/blocks/pack.mjs. Monocraft's glyphs are squares
// of 120 font units, so reading its TrueType outlines and filling the
// squares whose centres fall inside gives back its pixels exactly. Only
// what that needs is read: the cmap, loca and glyf tables, with straight
// outlines and simple composite glyphs.
import { blank } from './png.mjs';

const PIXEL = 120;
// Code page 437 as Unicode, from 0 to 255 (0-31 and 127 are its symbols)
const CP437 = '\0☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂'
  + 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';

function readFont(buf) {
  const tables = {};
  for (let i = 0, n = buf.readUInt16BE(4); i < n; i++) {
    const at = 12 + i * 16;
    tables[buf.toString('latin1', at, at + 4)] = buf.readUInt32BE(at + 8);
  }
  const head = tables.head, longLoca = buf.readInt16BE(head + 50) === 1;
  const numGlyphs = buf.readUInt16BE(tables.maxp + 4);
  const loca = i => (longLoca ? buf.readUInt32BE(tables.loca + i * 4) : buf.readUInt16BE(tables.loca + i * 2) * 2);

  // cmap: format 12 (full Unicode) if there is one, else format 4
  const cmap = new Map();
  const subtables = buf.readUInt16BE(tables.cmap + 2);
  let f4 = 0, f12 = 0;
  for (let i = 0; i < subtables; i++) {
    const at = tables.cmap + buf.readUInt32BE(tables.cmap + 8 + i * 8);
    const format = buf.readUInt16BE(at);
    if (format === 12) f12 = at;
    if (format === 4) f4 = at;
  }
  if (f12) {
    for (let i = 0, n = buf.readUInt32BE(f12 + 12); i < n; i++) {
      const g = f12 + 16 + i * 12, start = buf.readUInt32BE(g), end = buf.readUInt32BE(g + 4), glyph = buf.readUInt32BE(g + 8);
      for (let c = start; c <= end; c++) cmap.set(c, glyph + c - start);
    }
  } else if (f4) {
    const segs = buf.readUInt16BE(f4 + 6) / 2;
    const ends = f4 + 14, starts = ends + segs * 2 + 2, deltas = starts + segs * 2, offsets = deltas + segs * 2;
    for (let s = 0; s < segs; s++) {
      const end = buf.readUInt16BE(ends + s * 2), start = buf.readUInt16BE(starts + s * 2);
      const delta = buf.readInt16BE(deltas + s * 2), ro = buf.readUInt16BE(offsets + s * 2);
      for (let c = start; c <= end && c !== 0xffff; c++) {
        let g = ro ? buf.readUInt16BE(offsets + s * 2 + ro + (c - start) * 2) : c;
        if (ro && g) g += delta; else if (!ro) g += delta;
        cmap.set(c, g & 0xffff);
      }
    }
  }

  // A glyph's outline: contours of [x, y] points, in font units
  function outline(index, dx = 0, dy = 0, depth = 0) {
    if (index >= numGlyphs || depth > 4) return [];
    const at = tables.glyf + loca(index), len = loca(index + 1) - loca(index);
    if (!len) return [];
    const contours = buf.readInt16BE(at);
    if (contours < 0) {
      // composite: each component's glyph, moved by its offset
      const out = [];
      let p = at + 10, flags;
      do {
        flags = buf.readUInt16BE(p);
        const glyph = buf.readUInt16BE(p + 2);
        const words = flags & 1;
        const ax = words ? buf.readInt16BE(p + 4) : buf.readInt8(p + 4);
        const ay = words ? buf.readInt16BE(p + 6) : buf.readInt8(p + 5);
        p += words ? 8 : 6;
        if (flags & 8) p += 2; else if (flags & 0x40) p += 4; else if (flags & 0x80) p += 8;
        // ARGS_ARE_XY_VALUES; point matching isn't used by this font
        if (flags & 2) out.push(...outline(glyph, dx + ax, dy + ay, depth + 1));
      } while (flags & 0x20);
      return out;
    }
    const endPts = Array.from({ length: contours }, (_, i) => buf.readUInt16BE(at + 10 + i * 2));
    const count = contours ? endPts[contours - 1] + 1 : 0;
    let p = at + 10 + contours * 2;
    p += 2 + buf.readUInt16BE(p);   // instructions
    const flags = [];
    while (flags.length < count) {
      const f = buf[p++];
      flags.push(f);
      if (f & 8) for (let r = buf[p++]; r > 0; r--) flags.push(f);
    }
    const coords = (short, same) => {
      let v = 0;
      return flags.map(f => {
        if (f & short) { const d = buf[p++]; v += f & same ? d : -d; }
        else if (!(f & same)) { v += buf.readInt16BE(p); p += 2; }
        return v;
      });
    };
    const xs = coords(2, 16), ys = coords(4, 32);
    const out = [];
    let start = 0;
    for (const end of endPts) {
      out.push(xs.slice(start, end + 1).map((x, i) => [x + dx, ys[start + i] + dy]));
      start = end + 1;
    }
    return out;
  }
  return { cmap, outline };
}

// Whether (x, y) is inside the outline (even-odd)
function inside(contours, x, y) {
  let hit = false;
  for (const c of contours) {
    for (let i = 0, j = c.length - 1; i < c.length; j = i++) {
      const [xi, yi] = c[i], [xj, yj] = c[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
    }
  }
  return hit;
}

// default.png, 128x128: 8x8 cells, the baseline under the cell's 7th row
export function bitmapFont(ttf) {
  const font = readFont(ttf);
  const img = blank(128, 128);
  [...CP437].forEach((ch, code) => {
    const glyph = font.cmap.get(ch.codePointAt(0));
    if (!glyph || code === 0 || code === 32) return;
    const contours = font.outline(glyph);
    const cx = (code % 16) * 8, cy = Math.floor(code / 16) * 8;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        // pixel row 0 is the top: 7 pixels above the baseline
        if (!inside(contours, (col + 0.5) * PIXEL, (6.5 - row) * PIXEL)) continue;
        img.data.set([255, 255, 255, 255], ((cy + row) * 128 + cx + col) * 4);
      }
    }
  });
  return img;
}
