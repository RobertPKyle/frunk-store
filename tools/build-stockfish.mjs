// Fetches apps/stockfish/engine: the lite single-threaded Stockfish 19 from
// the stockfish.js release (GPL-3.0, https://github.com/nmrugg/stockfish.js),
// its license and its source, each checked against its SHA-256. Nothing is
// compiled here. The engine isn't in git, so run this before deploying `apps`.
//
//   node tools/build-stockfish.mjs
import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const TAG = 'v19.0.1';
const RELEASE = `https://github.com/nmrugg/stockfish.js/releases/download/${TAG}/`;
const REPO = `https://raw.githubusercontent.com/nmrugg/stockfish.js/${TAG}/`;

const FILES = [
  ['stockfish-19-lite-single.js', `${RELEASE}stockfish-19-lite-single.js`, 'ccb130d7ff29408531c47d859a49f91d59d4f482d05a53eb1a3231a4f624c91a'],
  ['stockfish-19-lite-single.wasm', `${RELEASE}stockfish-19-lite-single.wasm`, 'ee4f115bdb2d32cadf96cada104a05b5ec257d7ad6f57582190b49bc71f096de'],
  ['COPYING.txt', `${REPO}Copying.txt`, '0b383d5a63da644f628d99c33976ea6487ed89aaa59f0b3257992deac1171e6b'],
  ['stockfish.js-19.0.1-src.tar.gz', `https://github.com/nmrugg/stockfish.js/archive/refs/tags/${TAG}.tar.gz`, 'a18aa8a871f5265014b110b3e07804ff3637899d2e189be6ded2b99e2c17a10e'],
];

const out = fileURLToPath(new URL('../apps/stockfish/engine/', import.meta.url));
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const [name, url, sha256] of FILES) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const body = Buffer.from(await res.arrayBuffer());
  const got = createHash('sha256').update(body).digest('hex');
  if (got !== sha256) throw new Error(`${name}: SHA-256 is ${got}, expected ${sha256}`);
  writeFileSync(out + name, body);
  console.log(`${name}: ${body.length} bytes`);
}
