// Builds apps/quake's engine and free game:
//
// - Chocolate Quake 2.1.0 (GPL-3.0, https://github.com/Henrique194/chocolate-quake),
//   a faithful port of Quake 1.09's software renderer, with
//   tools/quake/chocolate-web.patch, compiled with Emscripten in Docker (by
//   the patch's web/build.sh) to apps/quake/engine/chocolate-quake.{js,wasm}.
//   The patched source the build came from goes next to it as
//   chocolate-quake-2.1.0-web-src.tar.gz, as the GPL asks.
// - LibreQuake 0.09-beta, the "lite" release (art BSD-3-Clause, game code
//   GPL-2.0, https://github.com/lavenderdotpet/LibreQuake), checked against
//   its SHA-256: both paks gzipped to apps/quake/librequake/ (50 MB down to
//   about 25 MB; the page unpacks them), its music tracks as they are, its
//   license files, and the QuakeC source of its game code (progs.dat, GPL)
//   at the release's tag, as librequake-0.09-beta-qcsrc.tar.gz.
//
//   node tools/build-quake.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { createGzip, constants } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.quake-build/`;
const app = `${root}apps/quake/`;

const CHOCOLATE_TAG = 'chocolate-quake-2.1.0';
const CHOCOLATE_COMMIT = '8ee22175e3a5613e94ad2f9776aadc428b948cf3';
const LIBREQUAKE = '0.09-beta';
const LIBREQUAKE_SHA256 = '428e736b2f01d953e09a08c60bee975bdc4a0ac2219e97fa095c8af41754da83';
const LIBREQUAKE_COMMIT = 'd1515ca9bc01e590f2d54dc496f55c9a4ed72369';   // tag v0.09-beta

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

mkdirSync(work, { recursive: true });
mkdirSync(`${app}engine`, { recursive: true });
mkdirSync(`${app}librequake/music`, { recursive: true });

// ---------- engine ----------

const src = `${work}chocolate-quake/`;
rmSync(src, { recursive: true, force: true });
run('git', ['-c', 'advice.detachedHead=false', 'clone', '--quiet', '--depth', '1', '--branch', CHOCOLATE_TAG, 'https://github.com/Henrique194/chocolate-quake.git', src]);
const head = execFileSync('git', ['-C', src, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (head !== CHOCOLATE_COMMIT) throw new Error(`${CHOCOLATE_TAG} is ${head}, expected ${CHOCOLATE_COMMIT}`);
run('git', ['-C', src, 'apply', `${root}tools/quake/chocolate-web.patch`]);

run('docker', [
  'run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`,
  '-v', `${src}:/src`, '-w', '/src',
  'emscripten/emsdk:4.0.10',
  'sh', 'web/build.sh',
]);
for (const ext of ['js', 'wasm']) copyFileSync(`${src}build-web/chocolate-quake.${ext}`, `${app}engine/chocolate-quake.${ext}`);
rmSync(`${src}build-web`, { recursive: true, force: true });
run('tar', ['-czf', `${app}engine/${CHOCOLATE_TAG}-web-src.tar.gz`, '--exclude=.git', '-C', work, 'chocolate-quake']);
copyFileSync(`${src}LICENSE`, `${app}engine/LICENSE`);
copyFileSync(`${root}tools/quake/chocolate-web.patch`, `${app}engine/chocolate-web.patch`);
console.log('built apps/quake/engine/chocolate-quake.{js,wasm}');

// ---------- LibreQuake ----------

const zip = `${work}librequake-${LIBREQUAKE}-lite.zip`;
if (!existsSync(zip)) {
  const res = await fetch(`https://github.com/lavenderdotpet/LibreQuake/releases/download/v${LIBREQUAKE}/lite.zip`);
  if (!res.ok) throw new Error(`LibreQuake download: ${res.status}`);
  writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
}
const sha = createHash('sha256');
await pipeline(createReadStream(zip), sha);
if (sha.digest('hex') !== LIBREQUAKE_SHA256) throw new Error('LibreQuake zip checksum mismatch');
const lq = `${work}librequake/`;
rmSync(lq, { recursive: true, force: true });
run('unzip', ['-q', zip, '-d', lq]);
const id1 = `${lq}lite/id1/`;
for (const pak of ['pak0', 'pak1']) {
  await pipeline(createReadStream(`${id1}${pak}.pak`),
    createGzip({ level: constants.Z_BEST_COMPRESSION }),
    createWriteStream(`${app}librequake/${pak}.pak.gz`));
}
for (const f of readdirSync(`${id1}music`)) copyFileSync(`${id1}music/${f}`, `${app}librequake/music/${f}`);
for (const [from, to] of [['COPYING', 'COPYING'], ['CREDITS', 'CREDITS'], ['README-IMPORTANT-LICENCE-INFO', 'README-IMPORTANT-LICENCE-INFO'], ['misc-docs/COPYING', 'COPYING-GPL2']]) {
  copyFileSync(`${id1}docs/${from}`, `${app}librequake/${to}`);
}

// The game code's source: just qcsrc/ from the repository (all of it is
// 1.5 GB of art)
const qc = `${work}librequake-src/`;
rmSync(qc, { recursive: true, force: true });
run('git', ['-c', 'advice.detachedHead=false', 'clone', '--quiet', '--depth', '1', '--filter=blob:none', '--sparse', '--branch', `v${LIBREQUAKE}`, 'https://github.com/lavenderdotpet/LibreQuake.git', qc]);
const qcHead = execFileSync('git', ['-C', qc, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (qcHead !== LIBREQUAKE_COMMIT) throw new Error(`LibreQuake v${LIBREQUAKE} is ${qcHead}, expected ${LIBREQUAKE_COMMIT}`);
run('git', ['-C', qc, 'sparse-checkout', 'set', 'qcsrc']);
run('tar', ['-czf', `${app}librequake/librequake-${LIBREQUAKE}-qcsrc.tar.gz`, '--exclude=.git', '-C', qc, 'qcsrc']);
console.log(`built apps/quake/librequake/ (LibreQuake ${LIBREQUAKE} lite)`);
