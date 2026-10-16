// Builds apps/doom's engine and games:
//
// - Crispy Doom 7.2 (GPL-2.0-or-later, https://github.com/fabiangreffrath/crispy-doom)
//   with tools/doom/crispy-web.patch, compiled with Emscripten in Docker to
//   apps/doom/engine/crispy-doom.{js,wasm}. The patched source the build
//   came from goes next to it as crispy-doom-7.2-web-src.tar.gz, as the GPL
//   asks.
// - Freedoom 0.13.0 (BSD-3-Clause, https://freedoom.github.io), from its
//   GitHub release, checked against the release's SHA-256, with each IWAD
//   gzipped to apps/doom/freedoom/ (29 MB down to about 10 MB; the page
//   unpacks them).
//
//   node tools/build-doom.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, createReadStream, createWriteStream, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { createGzip, constants } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.doom-build/`;
const app = `${root}apps/doom/`;

const CRISPY_TAG = 'crispy-doom-7.2';
const CRISPY_COMMIT = 'fdeabe4c23a833534b70aa84a22f1685aae7125d';
const FREEDOOM = '0.13.0';
const FREEDOOM_SHA256 = '3f9b264f3e3ce503b4fb7f6bdcb1f419d93c7b546f4df3e874dd878db9688f59';

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

mkdirSync(work, { recursive: true });
mkdirSync(`${app}engine`, { recursive: true });
mkdirSync(`${app}freedoom`, { recursive: true });

// ---------- engine ----------

const src = `${work}crispy-doom/`;
rmSync(src, { recursive: true, force: true });
run('git', ['clone', '--quiet', '--depth', '1', '--branch', CRISPY_TAG, 'https://github.com/fabiangreffrath/crispy-doom.git', src]);
const head = execFileSync('git', ['-C', src, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (head !== CRISPY_COMMIT) throw new Error(`${CRISPY_TAG} is ${head}, expected ${CRISPY_COMMIT}`);
run('git', ['-C', src, 'apply', `${root}tools/doom/crispy-web.patch`]);

const link = [
  '-sASYNCIFY',                 // startup still sleeps in places; the game loop itself never does
  '-sALLOW_MEMORY_GROWTH', '-sINITIAL_MEMORY=67108864',
  '-sMODULARIZE', '-sEXPORT_ES6', '-sEXPORT_NAME=createDoom', '-sENVIRONMENT=web',
  '-sINVOKE_RUN=0', '-sEXIT_RUNTIME=0',
  '-sSDL2_MIXER_FORMATS=[]',    // music is played by Doom's own OPL synth
  '-lidbfs.js',
  '-sEXPORTED_RUNTIME_METHODS=FS,IDBFS,callMain,UTF8ToString',
  '-sEXPORTED_FUNCTIONS=_main,_web_pad,_web_state,_web_frames,_web_autosave,_web_save_config',
].join(' ');

run('docker', [
  'run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`,
  '-v', `${src}:/src`, '-w', '/src',
  'emscripten/emsdk:4.0.10',
  'bash', '-c',
  `emcmake cmake -S . -B build-web -DCMAKE_BUILD_TYPE=Release -DENABLE_SDL2_NET=OFF "-DWEB_LINK_FLAGS=${link}" > /dev/null && cmake --build build-web --target crispy-doom -j8`,
]);
for (const ext of ['js', 'wasm']) copyFileSync(`${src}build-web/src/crispy-doom.${ext}`, `${app}engine/crispy-doom.${ext}`);
rmSync(`${src}build-web`, { recursive: true, force: true });
run('tar', ['-czf', `${app}engine/${CRISPY_TAG}-web-src.tar.gz`, '--exclude=.git', '-C', work, 'crispy-doom']);
copyFileSync(`${src}COPYING.md`, `${app}engine/COPYING.md`);
console.log('built apps/doom/engine/crispy-doom.{js,wasm}');

// ---------- Freedoom ----------

const zip = `${work}freedoom-${FREEDOOM}.zip`;
if (!existsSync(zip)) {
  const res = await fetch(`https://github.com/freedoom/freedoom/releases/download/v${FREEDOOM}/freedoom-${FREEDOOM}.zip`);
  if (!res.ok) throw new Error(`Freedoom download: ${res.status}`);
  writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
}
const sha = createHash('sha256');
await pipeline(createReadStream(zip), sha);
if (sha.digest('hex') !== FREEDOOM_SHA256) throw new Error('freedoom zip checksum mismatch');
rmSync(`${work}freedoom-${FREEDOOM}`, { recursive: true, force: true });
run('unzip', ['-q', zip, '-d', work]);
for (const n of [1, 2]) {
  await pipeline(createReadStream(`${work}freedoom-${FREEDOOM}/freedoom${n}.wad`),
    createGzip({ level: constants.Z_BEST_COMPRESSION }),
    createWriteStream(`${app}freedoom/freedoom${n}-${FREEDOOM}.wad.gz`));
}
for (const f of ['COPYING.txt', 'CREDITS.txt', 'CREDITS-MUSIC.txt']) copyFileSync(`${work}freedoom-${FREEDOOM}/${f}`, `${app}freedoom/${f}`);
console.log(`built apps/doom/freedoom/freedoom{1,2}-${FREEDOOM}.wad.gz`);
