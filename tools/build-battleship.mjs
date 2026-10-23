// Builds apps/battleship/engine/: BattleShip, JRickey's port of Super Smash
// Bros. (N64) built on the ssb-decomp-re decompilation
// (https://github.com/JRickey/BattleShip, MIT for the port's own code), with
// its libultraship and Torch forks (MIT), compiled with Emscripten in Docker
// (tools/battleship/Dockerfile: emsdk 4.0.10 plus a newer CMake).
//
// - BattleShip.{js,wasm}: the game. tools/battleship/battleship-web.patch and
//   the libultraship and decomp patches next to it make it build for the web:
//   N64 threads become Emscripten fibers (Asyncify), the frame loop waits for
//   the browser's frames, and calls whose WebAssembly signatures differ from
//   their definitions are fixed.
// - torch.{js,wasm}: Torch, the asset extractor, as a command-line program
//   (tools/battleship/torch-web.patch). The page runs it on the player's own
//   ROM to make BattleShip.o2r; no Nintendo data is built or shipped here.
// - recipe.json: Torch's config.yml and the US ROM's asset recipe
//   (yamls/us), which it reads; f3d.o2r: the renderer's shaders; the menu
//   fonts and the licenses.
//
//   node tools/build-battleship.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.battleship-build/`;
const out = `${root}apps/battleship/engine/`;

const COMMIT = 'f85b8922b20e3948d369682dbede5651824abcbb';   // 2026-10-22, v1.6-144
const VERSION = 'v1.6-144-gf85b892';
const IMAGE = 'frunk-battleship-emsdk';
const SUBMODULES = ['libultraship', 'torch', 'decomp'];

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const jobs = String(availableParallelism());

const src = `${work}BattleShip/`;
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
run('git', ['init', '--quiet', src]);
run('git', ['-C', src, 'fetch', '--quiet', '--depth', '1', 'https://github.com/JRickey/BattleShip.git', COMMIT]);
run('git', ['-C', src, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);
run('git', ['-C', src, 'submodule', 'update', '--quiet', '--init', '--depth', '1']);
run('git', ['-C', src, 'apply', `${root}tools/battleship/battleship-web.patch`]);
for (const m of SUBMODULES) run('git', ['-C', `${src}${m}`, 'apply', `${root}tools/battleship/${m}-web.patch`]);

run('docker', ['build', '--quiet', '-t', IMAGE, `${root}tools/battleship`], { stdio: ['ignore', 'ignore', 'inherit'] });
const docker = (cwd, script) => run('docker', ['run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`, '-e', 'HOME=/tmp',
  '-v', `${src}:/src`, '-w', cwd, IMAGE, 'bash', '-c', script]);

// The game. zlib comes from Emscripten's port, built into the image.
const sysroot = '/emsdk/upstream/emscripten/cache/sysroot';
docker('/src', [
  'emcmake cmake -S . -B build-web -GNinja -DCMAKE_BUILD_TYPE=Release -DSSB64_VERSION=us',
  `-DBATTLESHIP_VERSION=${VERSION} -DLUS_GCADAPTER=OFF -DLUS_ENABLE_POSTPROCESS_TRANSPILER=OFF`,
  '-DCMAKE_C_FLAGS=-pthread -DCMAKE_CXX_FLAGS=-pthread -DCMAKE_EXE_LINKER_FLAGS=-pthread',
  `-DZLIB_INCLUDE_DIR=${sysroot}/include -DZLIB_LIBRARY=${sysroot}/lib/wasm32-emscripten/libz.a`,
  `&& cmake --build build-web -j ${jobs} --target ssb64`,
].join(' '));

// Torch, as a command-line program for callMain
docker('/src/torch', [
  'emcmake cmake -S . -B build-web -GNinja -DCMAKE_BUILD_TYPE=Release -DUSE_STANDALONE=ON -DTORCH_WEB_CLI=ON',
  '-DBUILD_STORMLIB=OFF -DBUILD_SM64=OFF -DBUILD_MK64=OFF -DBUILD_SF64=OFF -DBUILD_PM64=OFF -DBUILD_FZERO=OFF',
  '-DBUILD_MARIO_ARTIST=OFF -DBUILD_NAUDIO=ON -DBUILD_SSB64=ON',
  '"-DCMAKE_EXE_LINKER_FLAGS=-sINVOKE_RUN=0 -sENVIRONMENT=web,worker"',
  `&& cmake --build build-web -j ${jobs}`,
].join(' '));

rmSync(out, { recursive: true, force: true });
mkdirSync(`${out}fonts`, { recursive: true });
for (const ext of ['js', 'wasm']) {
  copyFileSync(`${src}build-web/BattleShip.${ext}`, `${out}BattleShip.${ext}`);
  copyFileSync(`${src}torch/build-web/torch.${ext}`, `${out}torch.${ext}`);
}
copyFileSync(`${src}f3d.o2r`, `${out}f3d.o2r`);
const yamls = `${src}yamls/us/`;
const recipe = { 'config.yml': readFileSync(`${src}config.yml`, 'utf8'), yamls: {} };
for (const f of readdirSync(yamls).sort()) recipe.yamls[f] = readFileSync(`${yamls}${f}`, 'utf8');
writeFileSync(`${out}recipe.json`, JSON.stringify(recipe));
for (const f of ['Montserrat-Regular.ttf', 'Montserrat-OFL.txt', 'Inconsolata-Regular.ttf', 'Inconsolata-OFL.txt']) {
  copyFileSync(`${src}assets/custom/fonts/${f}`, `${out}fonts/${f}`);
}
copyFileSync(`${src}LICENSE`, `${out}LICENSE`);
copyFileSync(`${src}libultraship/LICENSE`, `${out}libultraship-LICENSE`);
copyFileSync(`${src}torch/LICENSE`, `${out}torch-LICENSE`);
console.log('built apps/battleship/engine/');
