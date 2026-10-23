// Builds apps/tic80 (Tiny Games): TIC-80's players and the free games
// that come with the app.
//
// - The players: TIC-80 1.3.1's official web players (MIT License,
//   https://github.com/nesbox/TIC-80), one per language a cart can be
//   written in, from the release's players.tar.gz (checked against its
//   SHA-256), into apps/tic80/players/<language>/, with TIC-80's licence and
//   its third-party licences.
// - The games: freely licensed carts at fixed commits. Games that are kept
//   as text projects (code with the art and sound in comments) are turned
//   into carts with TIC-80's own prj2cart, compiled here from TIC-80's
//   source with tools/tic80/prj2cart-langs.c in place of the script
//   engines. Each lands in apps/tic80/games/<id>.tic with its licence and a
//   cover picture (<id>.png): the cart's saved screen, or else its screen a
//   few seconds after it starts, taken in Chrome from apps/tic80/play.html.
//   apps/tic80/games.json lists them.
//
//   node tools/build-tic80.mjs
//
// Needs git, gcc, tar and Chrome.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { extname } from 'node:path';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { COVER_H, COVER_W, PLAYERS, readCart } from '../apps/tic80/cart.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.tic80-build/`;
const app = `${root}apps/tic80/`;

const TIC80 = { url: 'https://github.com/nesbox/TIC-80', commit: '62c24e5c9271f1445f61120b7d204805ff9db912' };   // v1.3.1
const PLAYERS_URL = 'https://github.com/nesbox/TIC-80/releases/download/v1.3.1/tic80-v1.3-players.tar.gz';
const PLAYERS_SHA256 = '43664948e48229360187ab1410ef02eca16412b969d5138119951c90a694c154';

// In the order the app lists them. file: the cart or project in the repo;
// license: the repo's licence file; note: shown on the game's card. Names
// are the authors' own. Measured at 4.5x CPU slowdown (about an MCU2 car):
// Wolf-80 manages 25 frames a second and Outrun80 just keeps 60; the rest
// use under a fifth of the CPU.
const GAMES = [
  { id: 'wolf80', repo: 'https://github.com/wojciech-graj/Wolf-80', commit: 'db7d3f00f1be87a32df0fc90dd48096bd2ed6818', file: 'wolf-80.tic', license: 'LICENSE', spdx: 'MIT', note: 'Runs slowly on older cars (Intel Atom)' },
  { id: 'nibiruman', repo: 'https://github.com/tasogare66/nibiruman', commit: 'dc7ecaa9eaa7c33758d431ce4a4fcada5f238147', file: 'tictron.tic', license: 'LICENSE', spdx: 'MIT' },
  { id: 'outrun80', repo: 'https://github.com/uberto/outrun80', commit: 'eabb24ba173d51fe1ceb143b034e747c181d38b1', file: 'outrun.lua', license: 'LICENSE', spdx: 'GPL-3.0' },
  { id: 'dunkman', repo: 'https://github.com/cxong/Dunkman', commit: '32ab66630a8b2f290818e4392f4217a77f415ad9', file: 'dunkman.moon', license: 'LICENSE', spdx: 'MIT' },
  { id: 'quest', repo: TIC80.url, commit: TIC80.commit, file: 'demos/quest.lua', license: 'LICENSE', spdx: 'MIT' },
  { id: 'grow', repo: 'https://github.com/cxong/GrowQuickly', commit: 'ef2a370ece6d58339a8acd934eaa17dbcf209555', file: 'grow.lua', license: 'LICENSE', spdx: 'MIT' },
  { id: 'dotdash', repo: 'https://github.com/He4eT/DotDashPit', commit: '9c17884340058b7a72bafa2221ccd6df04c2c9e1', file: 'game.js', license: 'LICENSE', spdx: 'MIT' },
  { id: 'entropipes', repo: 'https://github.com/son-link/EntroPipes', commit: '30e265c1039010d20440991eeae094c04de86feb', file: 'entropipes.tic', license: 'COPYING', spdx: 'GPL-3.0' },
  { id: 'factory', repo: 'https://github.com/UnicornsOfDeath/continuous-factory', commit: 'cf7b40a6cc8c695d9f3d426a6d1fd36d71092d88', file: 'factory.wren', license: 'LICENSE', spdx: 'MIT' },
];

const SHOT_AFTER = 4000;   // ms after a game starts that its cover is taken

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

function checkout(url, commit, dir) {
  if (existsSync(dir) && execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD']).toString().trim() === commit) return;
  rmSync(dir, { recursive: true, force: true });
  run('git', ['init', '--quiet', dir]);
  run('git', ['-C', dir, 'fetch', '--quiet', '--depth', '1', url, commit]);
  run('git', ['-C', dir, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);
}

// ---------- PNG, for the covers ----------

const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function png(rgba, width, height) {
  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, 'ascii');
    data.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6;   // 8-bit RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) Buffer.from(rgba.buffer, y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- players ----------

mkdirSync(work, { recursive: true });
const tic = `${work}tic80/`;
checkout(TIC80.url, TIC80.commit, tic);

const tarball = `${work}players.tar.gz`;
if (!existsSync(tarball) || createHash('sha256').update(readFileSync(tarball)).digest('hex') !== PLAYERS_SHA256) {
  run('curl', ['-fsSL', '-o', tarball, PLAYERS_URL]);
}
const sum = createHash('sha256').update(readFileSync(tarball)).digest('hex');
if (sum !== PLAYERS_SHA256) throw new Error(`players.tar.gz has SHA-256 ${sum}, expected ${PLAYERS_SHA256}`);
rmSync(`${work}players`, { recursive: true, force: true });
mkdirSync(`${work}players`);
run('tar', ['xzf', tarball, '-C', `${work}players`]);

rmSync(`${app}players`, { recursive: true, force: true });
for (const lang of PLAYERS) {
  const from = `${work}players/${lang}/`;
  mkdirSync(`${app}players/${lang}`, { recursive: true });
  for (const f of readdirSync(from)) copyFileSync(from + f, `${app}players/${lang}/${f}`);
}
copyFileSync(`${tic}LICENSE`, `${app}players/LICENSE.txt`);
copyFileSync(`${tic}THIRD_PARTY_LICENSES.md`, `${app}players/THIRD_PARTY_LICENSES.md`);
console.log(`players: ${PLAYERS.join(', ')}`);

// ---------- games ----------

const prj2cart = `${work}prj2cart`;
run('gcc', ['-O1', '-w', `-I${tic}src`, `-I${tic}include`, `-I${tic}vendor/libretro-common/include`, `-I${tic}src/studio`, '-o', prj2cart,
  `${tic}build/tools/prj2cart.c`, `${tic}src/studio/project.c`, `${tic}src/cart.c`, `${tic}src/tools.c`, `${root}tools/tic80/prj2cart-langs.c`]);

rmSync(`${app}games`, { recursive: true, force: true });
mkdirSync(`${app}games`);
const list = [];
for (const game of GAMES) {
  const src = game.repo === TIC80.url ? tic : `${work}${game.id}/`;
  if (src !== tic) checkout(game.repo, game.commit, src);
  const out = `${app}games/${game.id}.tic`;
  if (game.file.endsWith('.tic')) copyFileSync(src + game.file, out);
  else run(prj2cart, [src + game.file, out]);
  const info = await readCart(new Uint8Array(readFileSync(out)));
  if (!info) throw new Error(`${game.id}: not a cart`);
  copyFileSync(src + game.license, `${app}games/${game.id}.LICENSE.txt`);
  if (info.cover) writeFileSync(`${app}games/${game.id}.png`, png(info.cover, COVER_W, COVER_H));
  list.push({
    id: game.id, title: info.title || game.id, author: info.author, desc: info.desc, player: info.player,
    cover: !!info.cover, note: game.note, license: game.spdx, source: `${game.repo}/tree/${game.commit}`,
  });
  console.log(`${game.id}: ${info.title} by ${info.author} (${info.player}${info.cover ? ', cover' : ''})`);
}
// ---------- covers of carts without a saved screen ----------

// The apps folder as a plain web server; the player needs nothing more
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.tic': 'application/octet-stream' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.includes('..') || !existsSync(`${root}apps${path}`)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' });
  res.end(readFileSync(`${root}apps${path}`));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
// the player's whole screen at 1:1, 256x144 with the border; the picture is the 240x136 inside
const page = await browser.newPage({ viewport: { width: 256, height: 144 } });
for (const game of list.filter(g => !g.cover)) {
  await page.goto(`http://127.0.0.1:${server.address().port}/tic80/play.html?player=${game.player}&cart=games/${game.id}.tic`);
  await page.waitForTimeout(SHOT_AFTER);
  await page.screenshot({ path: `${app}games/${game.id}.png`, clip: { x: 8, y: 4, width: COVER_W, height: COVER_H } });
  game.cover = true;
  console.log(`${game.id}: cover from its screen`);
}
await browser.close();
server.close();

writeFileSync(`${app}games.json`, JSON.stringify({ games: list }, null, 1) + '\n');
