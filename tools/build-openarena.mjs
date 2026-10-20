// Builds apps/openarena's engine and game:
//
// - ioquake3 (GPL-2.0-or-later, https://github.com/ioquake/ioq3) at a fixed
//   commit, with tools/openarena/ioq3-web.patch, compiled with Emscripten in
//   Docker (tools/openarena/Dockerfile: emsdk 4.0.10 plus a newer CMake) to
//   apps/openarena/engine/ioquake3.{js,wasm}. The patched source the build
//   came from goes next to it as ioq3-<commit>-web-src.tar.gz, as the GPL
//   asks.
// - OpenArena 0.8.8 (GPL-2.0-or-later, https://openarena.ws), the release
//   zip checked against its SHA-256, repacked by tools/openarena/pack.mjs
//   into apps/openarena/data/oa-core.pk3 and one oa-map-<map>.pk3 per map
//   (the page downloads the core and the map being played), with each map's
//   level shot as a PNG or JPEG for the page, maps.json listing them, the
//   game's license and credits files, and the source of its game code (the
//   qvms in the core pk3): Debian's openarena_0.8.8+dfsg.orig.tar.xz,
//   checked against its SHA-256, which is OpenArena's 0.8.8 game code
//   release.
//
//   node tools/build-openarena.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, createReadStream, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';
import { openBaseoa, pack } from './openarena/pack.mjs';
import { tgaToPng } from './openarena/tga.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.openarena-build/`;
const app = `${root}apps/openarena/`;

const IOQ3_COMMIT = '87a99d18206e878a20289f05ac3c16005dcae5c3';
const IMAGE = 'frunk-ioq3-emsdk';
const OA_ZIP = 'https://download.tuxfamily.org/openarena/rel/088/openarena-0.8.8.zip';
const OA_SHA256 = '5a8faf7f5b51f351b0a1618c06b6b98a5f1a6758f1d39818de2c87df2a0bac4a';
const OA_SRC = 'https://deb.debian.org/debian/pool/main/o/openarena/openarena_0.8.8+dfsg.orig.tar.xz';
const OA_SRC_SHA256 = '321c7811d78ffbec66dd7e2d61ce885d4199658c68a6b00c921d30a8cbef311e';

// Free-for-all arenas with bot navigation, small enough to download in the
// car, in the order the page lists them
const MAPS = ['oa_dm1', 'oa_dm7', 'oa_rpg3dm2', 'slimefac', 'aggressor', 'pxlfan', 'am_lavaarena', 'sleekgrinder', 'dm6ish', 'oa_shine'];
// The player models in the core pk3 (and so the bots there are)
const ROSTER = ['sarge', 'tony', 'major', 'penguin', 'liz', 'beret'];

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const sha256 = async file => { const h = createHash('sha256'); await pipeline(createReadStream(file), h); return h.digest('hex'); };

async function fetchChecked(url, file, sum) {
  if (!existsSync(file) || await sha256(file) !== sum) {
    console.log(`downloading ${url}`);
    run('curl', ['-fL', '--retry', '3', '-o', file, url]);
  }
  if (await sha256(file) !== sum) throw new Error(`${file}: checksum mismatch`);
}

mkdirSync(work, { recursive: true });
for (const d of ['engine', 'data', 'data/levelshots']) mkdirSync(`${app}${d}`, { recursive: true });

// ---------- engine ----------

const src = `${work}ioq3/`;
rmSync(src, { recursive: true, force: true });
run('git', ['-c', 'advice.detachedHead=false', 'clone', '--quiet', '--filter=blob:none', 'https://github.com/ioquake/ioq3.git', src]);
run('git', ['-C', src, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', IOQ3_COMMIT]);
run('git', ['-C', src, 'apply', `${root}tools/openarena/ioq3-web.patch`]);

run('docker', ['build', '--quiet', '-t', IMAGE, `${root}tools/openarena`], { stdio: ['ignore', 'ignore', 'inherit'] });
const jobs = String(availableParallelism());
const docker = (...cmd) => run('docker', ['run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`, '-v', `${src}:/src`, '-w', '/src', IMAGE, ...cmd]);
docker('emcmake', 'cmake', '-S', '.', '-B', 'build-web', '-DCMAKE_BUILD_TYPE=Release');
docker('cmake', '--build', 'build-web', '-j', jobs, '--target', 'ioquake3');
for (const ext of ['js', 'wasm']) copyFileSync(`${src}build-web/Release/ioquake3.${ext}`, `${app}engine/ioquake3.${ext}`);
const engineWasm = `${work}ioquake3.wasm`;
copyFileSync(`${src}build-web/Release/ioquake3.wasm`, engineWasm);
rmSync(`${src}build-web`, { recursive: true, force: true });
const srcName = `ioq3-${IOQ3_COMMIT.slice(0, 12)}-web-src.tar.gz`;
for (const f of readdirSync(`${app}engine`)) if (f.endsWith('-web-src.tar.gz')) rmSync(`${app}engine/${f}`);
run('tar', ['-czf', `${app}engine/${srcName}`, '--exclude=.git', '-C', work, 'ioq3']);
copyFileSync(`${src}COPYING.txt`, `${app}engine/COPYING.txt`);
copyFileSync(`${root}tools/openarena/ioq3-web.patch`, `${app}engine/ioq3-web.patch`);
console.log('built apps/openarena/engine/ioquake3.{js,wasm}');

// ---------- OpenArena ----------

const zip = `${work}openarena-0.8.8.zip`;
await fetchChecked(OA_ZIP, zip, OA_SHA256);
const oa = `${work}oa/`;
if (!existsSync(`${oa}openarena-0.8.8/baseoa/pak0.pk3`)) {
  rmSync(oa, { recursive: true, force: true });
  run('unzip', ['-q', zip, 'openarena-0.8.8/baseoa/*', 'openarena-0.8.8/COPYING', 'openarena-0.8.8/README', 'openarena-0.8.8/readme_085.txt', 'openarena-0.8.8/readme_088.txt', 'openarena-0.8.8/CHANGES', '-d', oa]);
}
const baseoa = `${oa}openarena-0.8.8/baseoa`;
const data = `${app}data/`;
for (const f of readdirSync(data)) if (f.endsWith('.pk3')) rmSync(`${data}${f}`);
const packed = pack({ baseoa, engineWasm, out: data, maps: MAPS, roster: ROSTER });

// Each map's title (from the arena scripts) and level shot
const { index, close } = openBaseoa(baseoa);
const titles = {};
for (const [name, f] of index) {
  if (!/^scripts\/.*\.(arena|txt)$/.test(name) || !/arena/.test(name)) continue;
  for (const block of f.read().toString('latin1').match(/\{[^{}]*\}/g) || []) {
    const map = (block.match(/\bmap\s+"([^"]+)"/i) || [])[1], title = (block.match(/\blongname\s+"([^"]+)"/i) || [])[1];
    if (map && title && !titles[map.toLowerCase()]) titles[map.toLowerCase()] = title;
  }
}
rmSync(`${data}levelshots`, { recursive: true, force: true });
mkdirSync(`${data}levelshots`);
async function pk3Info(name) {
  return { file: name, bytes: statSync(`${data}${name}`).size, hash: (await sha256(`${data}${name}`)).slice(0, 16) };
}
const maps = await Promise.all(MAPS.map(async map => {
  let shot = null;
  for (const ext of ['jpg', 'tga']) {
    const f = index.get(`levelshots/${map}.${ext}`);
    if (!f || shot) continue;
    shot = `levelshots/${map}.${ext === 'tga' ? 'png' : 'jpg'}`;
    writeFileSync(`${data}${shot}`, ext === 'tga' ? tgaToPng(f.read()) : f.read());
  }
  return { map, title: titles[map] || map, ...await pk3Info(`oa-map-${map}.pk3`), shot };
}));
close();
// The page keeps the pk3s; a new hash means a new build to download again
writeFileSync(`${data}maps.json`, JSON.stringify({ core: await pk3Info('oa-core.pk3'), bots: packed.bots, maps }, null, 1) + '\n');
for (const f of ['COPYING', 'README', 'readme_085.txt', 'readme_088.txt', 'CHANGES']) copyFileSync(`${oa}openarena-0.8.8/${f}`, `${data}${f}`);
// The credits are inside pak0.pk3
writeFileSync(`${data}CREDITS`, execFileSync('unzip', ['-p', `${baseoa}/pak0.pk3`, 'CREDITS']));

const gamecode = `${data}openarena-0.8.8-gamecode-src.tar.xz`;
await fetchChecked(OA_SRC, gamecode, OA_SRC_SHA256);
console.log(`built apps/openarena/data/ (OpenArena 0.8.8: core and ${MAPS.length} maps)`);
if (Object.values(packed.maps).some(m => !m.bytes)) throw new Error('a map pk3 came out empty');
