// The tile faces, drawn as SVG and used as background images, so a tile on the
// table costs one decoded picture however often it's redrawn. Dots and bamboo
// are drawn here; characters come as outlines from glyphs.js, since an image
// can't use the page's fonts and a car may have no Chinese font.
import { GLYPHS } from './glyphs.js';

const W = 60, H = 80;
const RED = '#c4262e', GREEN = '#127350', BLUE = '#1c3c8c', INK = '#16202a';

function glyph(ch, x, y, size, fill, weight = 2) {
  const k = size / 100;
  return `<path transform="translate(${x - size / 2} ${y - size / 2}) scale(${k})" fill="${fill}" stroke="${fill}" stroke-width="${weight}" d="${GLYPHS[ch]}"/>`;
}

// ---------- dots ----------

function dot(x, y, r, color, inner = '#f7f0dd') {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`
    + `<circle cx="${x}" cy="${y}" r="${r * 0.62}" fill="${inner}"/>`
    + `<circle cx="${x}" cy="${y}" r="${r * 0.34}" fill="${color}"/>`;
}

function bigDot() {
  const c = [30, 40];
  let petals = '';
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    petals += `<circle cx="${(c[0] + 21 * Math.cos(a)).toFixed(1)}" cy="${(c[1] + 21 * Math.sin(a)).toFixed(1)}" r="3.4" fill="${i % 2 ? RED : GREEN}"/>`;
  }
  return `<circle cx="30" cy="40" r="25" fill="none" stroke="${BLUE}" stroke-width="2.4"/>${petals}`
    + `<circle cx="30" cy="40" r="15.5" fill="${BLUE}"/><circle cx="30" cy="40" r="10.5" fill="#f7f0dd"/><circle cx="30" cy="40" r="6" fill="${RED}"/>`;
}

const DOTS = {
  2: [[30, 22, 12, GREEN], [30, 58, 12, BLUE]],
  3: [[14, 16, 9.5, BLUE], [30, 40, 9.5, RED], [46, 64, 9.5, GREEN]],
  4: [[17, 22, 10.5, BLUE], [43, 22, 10.5, GREEN], [17, 58, 10.5, GREEN], [43, 58, 10.5, BLUE]],
  5: [[15, 17, 9, BLUE], [45, 17, 9, GREEN], [30, 40, 9, RED], [15, 63, 9, GREEN], [45, 63, 9, BLUE]],
  6: [[17, 16, 9, GREEN], [43, 16, 9, GREEN], [17, 42, 9, RED], [43, 42, 9, RED], [17, 65, 9, RED], [43, 65, 9, RED]],
  7: [[12, 13, 6.6, GREEN], [30, 21, 6.6, GREEN], [48, 29, 6.6, GREEN], [18, 49, 7.6, RED], [42, 49, 7.6, RED], [18, 67, 7.6, RED], [42, 67, 7.6, RED]],
  8: [[18, 12, 7.8, BLUE], [42, 12, 7.8, BLUE], [18, 30, 7.8, BLUE], [42, 30, 7.8, BLUE], [18, 49, 7.8, BLUE], [42, 49, 7.8, BLUE], [18, 68, 7.8, BLUE], [42, 68, 7.8, BLUE]],
  9: [[13, 15, 7.6, GREEN], [30, 15, 7.6, GREEN], [47, 15, 7.6, GREEN], [13, 40, 7.6, RED], [30, 40, 7.6, RED], [47, 40, 7.6, RED], [13, 65, 7.6, BLUE], [30, 65, 7.6, BLUE], [47, 65, 7.6, BLUE]],
};

// ---------- bamboo ----------

function stick(x, y, color, h = 20, angle = 0) {
  const w = 6.2;
  const top = -h / 2;
  return `<g transform="translate(${x} ${y}) rotate(${angle})" fill="${color}">`
    + `<rect x="${-w / 2}" y="${top}" width="${w}" height="${h}" rx="2.2"/>`
    + `<rect x="${-w / 2 - 1.3}" y="${top - 0.6}" width="${w + 2.6}" height="3.2" rx="1.5"/>`
    + `<rect x="${-w / 2 - 1.3}" y="${-1.6}" width="${w + 2.6}" height="3.2" rx="1.5"/>`
    + `<rect x="${-w / 2 - 1.3}" y="${h / 2 - 2.6}" width="${w + 2.6}" height="3.2" rx="1.5"/>`
    + `<rect x="-0.7" y="${top + 3}" width="1.4" height="${h - 6}" fill="#f7f0dd" opacity=".55"/></g>`;
}

const BAMBOO = {
  2: [[30, 24, BLUE, 25], [30, 56, GREEN, 25]],
  3: [[30, 23, BLUE, 25], [17, 56, GREEN, 25], [43, 56, GREEN, 25]],
  4: [[17, 24, BLUE, 25], [43, 24, GREEN, 25], [17, 56, GREEN, 25], [43, 56, BLUE, 25]],
  5: [[14, 24, GREEN, 25], [46, 24, BLUE, 25], [30, 40, RED, 25], [14, 56, BLUE, 25], [46, 56, GREEN, 25]],
  6: [[13, 24, GREEN, 25], [30, 24, GREEN, 25], [47, 24, GREEN, 25], [13, 56, BLUE, 25], [30, 56, BLUE, 25], [47, 56, BLUE, 25]],
  7: [[30, 15, RED, 19], [13, 40, GREEN, 19], [30, 40, BLUE, 19], [47, 40, GREEN, 19], [13, 65, GREEN, 19], [30, 65, BLUE, 19], [47, 65, GREEN, 19]],
  8: [[12, 20, GREEN, 25], [48, 20, GREEN, 25], [23, 20, BLUE, 25, 26], [37, 20, BLUE, 25, -26], [12, 60, BLUE, 25], [48, 60, BLUE, 25], [23, 60, GREEN, 25, -26], [37, 60, GREEN, 25, 26]],
  9: [[13, 15, GREEN, 19], [30, 15, RED, 19], [47, 15, BLUE, 19], [13, 40, GREEN, 19], [30, 40, RED, 19], [47, 40, BLUE, 19], [13, 65, GREEN, 19], [30, 65, RED, 19], [47, 65, BLUE, 19]],
};

// The one-bamboo: a sparrow on a stalk
function sparrow() {
  return `<path fill="${GREEN}" d="M23 46c-7-3-10-11-7-18 2-6 8-10 14-10 3-5 11-6 15-1 2 2 2 5 1 7l5 3-6 1c-1 10-7 20-16 21l-2 9h-5l1-9c-3 0-6-2-8-4z"/>`
    + `<path fill="${RED}" d="M20 38c3-7 10-10 17-8-1 8-7 16-15 16-2-2-3-5-2-8z"/>`
    + `<path fill="${BLUE}" d="M21 58l-7 14 5-1 2 5 5-16zM26 59l1 14 4-3 4 3-4-15z"/>`
    + `<circle cx="38" cy="21" r="2.6" fill="#f7f0dd"/><circle cx="38.6" cy="21" r="1.3" fill="${INK}"/>`
    + `<path fill="${RED}" d="M45 22l8 1-7 3z"/>`;
}

// ---------- the faces ----------

const NUMERALS = '一二三四五六七八九';
const WINDS = '東南西北';
const SEASONS = '春夏秋冬';
const BLOOMS = '梅蘭菊竹';

function whiteDragon() {
  return `<rect x="9" y="11" width="42" height="58" rx="3" fill="none" stroke="${BLUE}" stroke-width="3.4"/>`
    + `<rect x="15" y="17" width="30" height="46" rx="1.5" fill="none" stroke="${BLUE}" stroke-width="1.5"/>`;
}

function flowerCorner(n, color) {
  return `<circle cx="49" cy="11" r="7.5" fill="${color}"/>${glyph(NUMERALS[n], 49, 11, 12, '#f7f0dd', 1)}`;
}

export function faceSvg(t) {
  let body = '';
  if (t < 9) {
    body = glyph(NUMERALS[t], 30, 20, 32, INK, 3) + glyph('萬', 30, 56, 42, RED, 2);
  } else if (t < 18) {
    const n = t - 8;
    body = n === 1 ? bigDot() : DOTS[n].map(([x, y, r, c]) => dot(x, y, r, c)).join('');
  } else if (t < 27) {
    const n = t - 17;
    body = n === 1 ? sparrow() : BAMBOO[n].map(([x, y, c, h, a]) => stick(x, y, c, h, a ?? 0)).join('');
  } else if (t < 31) {
    body = glyph(WINDS[t - 27], 30, 40, 54, BLUE, 3);
  } else if (t === 31) {
    body = glyph('中', 30, 40, 58, RED, 3);
  } else if (t === 32) {
    body = glyph('發', 30, 40, 54, GREEN, 2.5);
  } else if (t === 33) {
    body = whiteDragon();
  } else if (t < 38) {
    body = glyph(SEASONS[t - 34], 28, 44, 46, GREEN, 2.5) + flowerCorner(t - 34, GREEN);
  } else {
    body = glyph(BLOOMS[t - 38], 28, 44, 46, RED, 2.5) + flowerCorner(t - 38, RED);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${body}</svg>`;
}

// A big character for a tile-shaped button or the title
export const glyphSvg = (ch, color) => `<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="${color}" stroke="${color}" stroke-width="2" d="${GLYPHS[ch]}"/></svg>`;

// One rule per tile, so markup only names a class. The picture stays the same
// wherever a tile lies; the box and its depth come from the page's stylesheet.
export function installTiles() {
  const css = [];
  for (let t = 0; t < 42; t++) {
    css.push(`.f${t}{background-image:url("data:image/svg+xml,${encodeURIComponent(faceSvg(t))}")}`);
  }
  const style = document.createElement('style');
  style.textContent = css.join('\n');
  document.head.append(style);
}

// The corner index for players who don't read the characters yet
export function tileIndex(t) {
  if (t < 27) return String(t % 9 + 1);
  if (t < 31) return 'ESWN'[t - 27];
  if (t < 34) return ['R', 'G', 'Wh'][t - 31];
  return String((t - 34) % 4 + 1);
}
