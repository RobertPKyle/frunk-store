// Reads TIC-80 cartridges (.tic): which language the game is written in
// (each language has its own player), its title, author and description,
// and its cover picture. Used by the app, the phone page and
// tools/build-tic80.mjs.
//
// A cart is a list of chunks, each with a 4-byte header: the type in the low
// 5 bits of the first byte and the memory bank in the top 3, then a 16-bit
// little-endian size and a reserved byte (src/cart.c in TIC-80).

const CODE = 5, PALETTE = 12, CODE_ZIP = 16, SCREEN = 18, BINARY = 19, LANG = 20;
const KNOWN = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
export const MAX_CART = 1 << 20;
export const COVER_W = 240, COVER_H = 136;

// Language ids and names as TIC-80 1.3 knows them (src/api/*), and the
// player folder for each
const LANGS = [
  [10, 'lua', 'lua'], [11, 'ruby', 'ruby'], [12, 'js', 'js'], [13, 'moon', 'moon'], [14, 'fennel', 'fennel'],
  [15, 'squirrel', 'squirrel'], [16, 'wren', 'wren'], [17, 'wasm', 'wasm'], [18, 'janet', 'janet'],
  [19, 'scheme', 'scheme'], [20, 'python', 'python'], [21, 'yue', 'yue'], [22, 'forth', 'forth'], [0x55, 'miniscript', 'miniscript'],
];
export const PLAYERS = LANGS.map(l => l[2]);

function chunks(bytes) {
  const out = [];
  for (let i = 0; i + 4 <= bytes.length;) {
    const type = bytes[i] & 31, bank = bytes[i] >> 5;
    let size = bytes[i + 1] | bytes[i + 2] << 8;
    if (size === 0 && (type === CODE || type === BINARY)) size = 65536;
    if (!KNOWN.has(type) || i + 4 + size > bytes.length) return null;
    out.push({ type, bank, data: bytes.subarray(i + 4, i + 4 + size) });
    i += 4 + size;
  }
  return out;
}

// A .tic file whose chunks all fit; anything else isn't a cart
export function isCart(name, bytes) {
  return /\.tic$/i.test(name) && bytes.length > 4 && bytes.length <= MAX_CART && !!chunks(bytes)?.length;
}

async function inflate(data) {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// "-- title: Dunkman" -> Dunkman, from the code's header comments
function tag(code, name) {
  const m = new RegExp(`^\\s*(?:--|//|;;|#|\\\\)\\s*${name}\\s*:\\s*(.*?)\\s*$`, 'mi').exec(code);
  return m ? m[1].slice(0, 120) : '';
}

// { player, title, author, desc, cover } where cover is RGBA pixels
// (COVER_W x COVER_H) or null; null when the cart can't be read
export async function readCart(bytes) {
  const list = chunks(bytes);
  if (!list) return null;
  let code = '', lang = 0, screen = null, palette = null;
  const decoder = new TextDecoder();
  for (const c of list) {
    if (c.type === CODE) code += decoder.decode(c.data);
    else if (c.type === CODE_ZIP) { try { code += decoder.decode(await inflate(c.data)); } catch {} }
    else if (c.type === LANG && c.data.length) lang = c.data[0];
    else if (c.type === SCREEN && c.bank === 0) screen = c.data;
    else if (c.type === PALETTE && c.bank === 0) palette = c.data;
  }
  if (list.some(c => c.type === BINARY) && !lang) lang = 17;
  // the same order of tests as the player: the cart's language id, then its script tag, then Lua
  const script = tag(code, 'script').toLowerCase();
  const found = LANGS.find(l => l[0] === lang) || LANGS.find(l => l[1] === script) || LANGS[0];
  return {
    player: found[2],
    title: tag(code, 'title'),
    author: tag(code, 'author'),
    desc: tag(code, 'desc'),
    cover: screen && screen.length >= COVER_W * COVER_H / 2 ? cover(screen, palette) : null,
  };
}

// TIC-80's default palette (SWEETIE-16), for carts that don't save one
const SWEETIE = '1a1c2c5d275db13e53ef7d57ffcd75a7f07038b76425717929366f3b5dc941a6f673eff7f4f4f494b0c2566c86333c57';

function cover(screen, palette) {
  const pal = palette && palette.length >= 48 ? palette : Uint8Array.from(SWEETIE.match(/../g), h => parseInt(h, 16));
  const px = new Uint8ClampedArray(COVER_W * COVER_H * 4);
  for (let i = 0; i < COVER_W * COVER_H; i++) {
    const c = (screen[i >> 1] >> ((i & 1) * 4)) & 15;
    px.set([pal[c * 3], pal[c * 3 + 1], pal[c * 3 + 2], 255], i * 4);
  }
  // a blank screen isn't a cover
  for (let i = 4; i < px.length; i += 4) if (px[i] !== px[0] || px[i + 1] !== px[1] || px[i + 2] !== px[2]) return px;
  return null;
}
