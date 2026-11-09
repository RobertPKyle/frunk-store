// Builds apps/rocks/engine: Rocks'n'Diamonds by Holger Schemel / Artsoft
// (GPL-2.0-or-later, https://github.com/ArtsoftEntertainment/rocksndiamonds).
//
// - The source at a pinned commit, checked against its SHA-256, with
//   tools/rocks/rocks-web.patch, compiled with Emscripten in Docker
//   (tools/rocks/Dockerfile: emsdk 4.0.10) by upstream's own `emscripten`
//   Makefile target: engine/rocksndiamonds.{js,wasm,data,data.js}.
// - Only the data this site can ship goes into the build. What is removed here
//   reaches neither the data package nor the source tarball:
//     * levels/Classic_Games: other companies' games' level sets, and the
//       tutorial levels in DROP that teach those games or name them
//     * the three third-party .mod tunes, which carry no license
//     * the tile sheets in BLANK, each replaced by a plain sheet of the same
//       size so the engine still loads, and the sp_ tiles on RocksSP
//     * the level editor's and element list's documentation, unused here
//   The one element drawn as a well-known arcade character gets new tiles.
// - The source of what was built goes next to the engine as a tarball, with
//   the patch and the license, as the GPL asks.
//
//   node tools/build-rocks.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cpus } from 'node:os';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.rocks-build/`;
const app = `${root}apps/rocks/`;
const IMAGE = 'frunk-rocks-emsdk';
const COMMIT = 'b42509b0cc55e6eb6b48953be946c09ac24cf6a3';
const URL_ = `https://github.com/ArtsoftEntertainment/rocksndiamonds/archive/${COMMIT}.tar.gz`;
const SHA256 = '02e38ea88bf148ed72dacaff90e760d35521391818bd7be9745a685356381b45';

// Sheets that reproduce another commercial game's tiles. The Supaplex-style
// tiles are mixed with the game's own on RocksSP, so only their cells are
// painted out (see below).
const BLANK = ['RocksBD.png', 'RocksBD2.png', 'RocksDF.png'];
const SP = 'RocksSP.png';

// Tutorial levels to leave out: they teach another game's rules or name it in
// their text. Kept levels are renumbered so each set stays continuous.
const DROP = {
  rnd_tutorial_niko_boehm: [28, 29, 30, 31, 32],
  rnd_tutorial_aaron_davidson: [12, 13, 14, 15, 17, 22, 24, 25, 26],
  rnd_tutorial_ncrecc: [],
};
const FILL = '#20242c';

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const sha256 = async file => { const h = createHash('sha256'); await pipeline(createReadStream(file), h); return h.digest('hex'); };

mkdirSync(`${work}dl`, { recursive: true });
const tarball = `${work}dl/rocks-${COMMIT}.tar.gz`;
if (!existsSync(tarball)) {
  console.log(`downloading ${URL_}`);
  run('curl', ['-fL', '--retry', '3', '-o', tarball, URL_]);
}
const got = await sha256(tarball);
if (got !== SHA256) throw new Error(`${tarball}: checksum mismatch ${got}`);

// ---------- source ----------

const src = `${work}src/`;
rmSync(src, { recursive: true, force: true });
mkdirSync(src, { recursive: true });
run('tar', ['-xzf', tarball, '-C', src, '--strip-components=1']);
run('patch', ['-p1', '-s', '-i', `${root}tools/rocks/rocks-web.patch`], { cwd: src });

// ---------- data ----------

rmSync(`${src}levels/Classic_Games`, { recursive: true, force: true });
const mus = `${src}music/mus_classic/`;
for (const name of readdirSync(mus)) if (/^mod\./.test(name)) rmSync(`${mus}${name}`);
for (const dir of ['docs/editor', 'docs/elements', 'docs/credits', 'docs/program', 'build-projects']) rmSync(`${src}${dir}`, { recursive: true, force: true });

// the tutorial sets: dropped levels, no solution tapes (their numbers would no
// longer match) and no readmes, whose text goes into the NOTICE
for (const [set, dropped] of Object.entries(DROP)) {
  const dir = `${src}levels/Tutorials/${set}/`;
  rmSync(`${dir}tapes`, { recursive: true, force: true });
  for (const name of readdirSync(dir)) if (/\.orig$|^README/.test(name) || name === 'unused.level') rmSync(`${dir}${name}`, { force: true });
  const files = readdirSync(dir).filter(n => /^\d+\.level$/.test(n)).sort();
  const firstNr = +files[0].slice(0, 3);
  const declared = +/^levels:\s*(\d+)/m.exec(readFileSync(`${dir}levelinfo.conf`, 'latin1'))[1];
  let nr = firstNr;
  for (const name of files) {
    const n = +name.slice(0, 3);
    // (one set carries a level past its declared count)
    if (dropped.includes(n) || n >= firstNr + declared) { rmSync(`${dir}${name}`); continue; }
    if (n !== nr) renameSync(`${dir}${name}`, `${dir}${String(nr).padStart(3, '0')}.level`);
    nr++;
  }
  const conf = readFileSync(`${dir}levelinfo.conf`, 'latin1').replace(/^# levels:.*\n/m, '').replace(/^levels:\s*\d+/m, `levels:                         ${nr - firstNr}`);
  writeFileSync(`${dir}levelinfo.conf`, conf, 'latin1');
}

run('docker', ['build', '--quiet', '-t', IMAGE, `${root}tools/rocks`], { stdio: ['ignore', 'ignore', 'inherit'] });
const inDocker = (...args) => run('docker', ['run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`, '-e', 'HOME=/tmp', '-v', `${src}:/w`, '-w', '/w', IMAGE, ...args]);

const gfx = 'graphics/gfx_classic/';
for (const sheet of BLANK) {
  const out = execFileSync('docker', ['run', '--rm', '-v', `${src}:/w`, '-w', '/w', IMAGE, 'identify', '-format', '%wx%h', `${gfx}${sheet}`]).toString().trim();
  inDocker('convert', '-size', out, `xc:${FILL}`, '-strip', `PNG24:${gfx}${sheet}`);
}

// RocksSP.png: paint out the cells of every sp_ graphic in conf_gfx.c, keeping
// cells another (non-sp_) graphic also uses.
const conf = new Map();
for (const m of readFileSync(`${src}src/conf_gfx.c`, 'latin1').matchAll(/\{\s*"([^"]+)",\s*"([^"]*)"\s*\}/g)) conf.set(m[1], m[2]);
const cells = (token, tile = 32) => {
  const num = (attr, d) => { const v = conf.get(`${token}.${attr}`); return v === undefined ? d : parseInt(v, 10); };
  const x0 = num('xpos', 0), y0 = num('ypos', 0), frames = Math.max(1, num('frames', 1));
  const w = num('width', tile), h = num('height', tile), offset = num('offset', w);
  const vertical = conf.get(`${token}.vertical`) === 'true' || conf.get(`${token}.vertical`) === '1';
  const res = [];
  for (let f = 0; f < frames; f++) {
    const px = x0 * tile + (vertical ? 0 : f * offset), py = y0 * tile + (vertical ? f * offset : 0);
    res.push([px, py, w, h]);
  }
  return res;
};
const spCells = [], keep = new Set();
for (const [token, value] of conf) {
  if (value !== SP) continue;
  for (const [x, y, w, h] of cells(token)) {
    if (/^sp_/.test(token)) spCells.push([x, y, w, h]);
    else keep.add(`${x},${y}`);
  }
}
const spDraw = [];
for (const [x, y, w, h] of spCells) if (!keep.has(`${x},${y}`)) spDraw.push('-draw', `rectangle ${x},${y} ${x + w - 1},${y + h - 1}`);
inDocker('convert', `${gfx}${SP}`, '-fill', FILL, ...spDraw, `PNG32:${gfx}${SP}`);
console.log(`${SP}: ${spDraw.length / 2} cells painted out`);

// The creature that looked like a certain arcade character: eight new tiles at
// columns 8 to 15, row 5 of the main sheet. It stays a round biter that chases
// along corridors, now with six legs and a shell.
const T = 32, RY = 5 * T;
function beetle(col, dx, dy, spread) {
  const x = col * T + T / 2, y = RY + T / 2, draw = [];
  draw.push('fill #000000 rectangle ' + `${col * T},${RY} ${col * T + T - 1},${RY + T - 1}`);
  draw.push('stroke #6a3a10 stroke-width 2 fill none');
  for (const a of [-1, 0, 1]) for (const side of [-1, 1]) {
    // legs either side of the way it faces
    const px = dx ? a * 7 : side * 12, py = dx ? side * 12 : a * 7;
    const qx = dx ? a * (7 + spread) : side * 15, qy = dx ? side * 15 : a * (7 + spread);
    draw.push(`line ${x + px},${y + py} ${x + qx},${y + qy}`);
  }
  draw.push('stroke none fill #b4581a');
  draw.push(`circle ${x},${y} ${x + 11},${y}`);
  draw.push('fill #e08a3a');
  draw.push(`circle ${x - 2},${y - 2} ${x + 6},${y - 2}`);
  draw.push('fill #fff6df');
  const ex = dx * 6, ey = dy * 6, sx = dy ? 4 : 0, sy = dx ? 4 : 0;
  draw.push(`circle ${x + ex + sx},${y + ey + sy} ${x + ex + sx + 3},${y + ey + sy}`);
  draw.push(`circle ${x + ex - sx},${y + ey - sy} ${x + ex - sx + 3},${y + ey - sy}`);
  draw.push('fill #16181c');
  draw.push(`circle ${x + ex + sx + dx},${y + ey + sy + dy} ${x + ex + sx + dx + 1},${y + ey + sy + dy}`);
  draw.push(`circle ${x + ex - sx + dx},${y + ey - sy + dy} ${x + ex - sx + dx + 1},${y + ey - sy + dy}`);
  return draw.join(' ');
}
const dirs = [[1, 0], [0, -1], [-1, 0], [0, 1]];
const beetleArgs = [`${gfx}RocksElements.png`];
dirs.forEach(([dx, dy], i) => {
  beetleArgs.push('-draw', beetle(8 + i, dx, dy, 3));
  beetleArgs.push('-draw', beetle(12 + i, dx, dy, -2));
});
inDocker('convert', ...beetleArgs, `${gfx}RocksElements.png`);

// ---------- engine ----------

const jobs = String(Math.max(2, cpus().length - 1));
inDocker('make', `-j${jobs}`, 'BUILD_DIST=TRUE', 'FILE_PACKAGER=/emsdk/upstream/emscripten/tools/file_packager', 'emscripten');

rmSync(`${app}engine`, { recursive: true, force: true });
mkdirSync(`${app}engine`, { recursive: true });
for (const name of ['rocksndiamonds.js', 'rocksndiamonds.wasm', 'rocksndiamonds.data', 'rocksndiamonds.data.js']) copyFileSync(`${src}${name}`, `${app}engine/${name}`);

// the source that goes with it
const short = COMMIT.slice(0, 12);
run('tar', ['-czf', `${app}engine/rocksndiamonds-${short}-web-src.tar.gz`,
  '--exclude=*.o', '--exclude=*.a', '--exclude=.depend',
  '--exclude=rocksndiamonds/rocksndiamonds.js', '--exclude=rocksndiamonds/rocksndiamonds.wasm', '--exclude=rocksndiamonds/rocksndiamonds.data', '--exclude=rocksndiamonds/rocksndiamonds.data.js',
  '--transform', 's,^src,rocksndiamonds,', '-C', work, 'src']);
copyFileSync(`${src}COPYING`, `${app}engine/COPYING`);
copyFileSync(`${root}tools/rocks/rocks-web.patch`, `${app}engine/rocks-web.patch`);
for (const f of readdirSync(`${app}engine`)) console.log(`${f}  ${(statSync(`${app}engine/${f}`).size / 1048576).toFixed(1)} MB`);
console.log('built apps/rocks/engine');
