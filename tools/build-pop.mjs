// Builds apps/pop/engine: Prince of Persia on SDLPoP.
//
// - SDLPoP 1.23 (GPL-3.0-or-later, https://github.com/NagyD/SDLPoP), the
//   release's source tarball checked against its SHA-256, with
//   tools/pop/sdlpop-web.patch (a wait that hands the page its turn, no SDL
//   controllers, the action key picks in menus, a frame counter), compiled
//   with Emscripten in Docker (tools/pop/Dockerfile: emsdk 4.0.10 with the
//   SDL2 and SDL2_image ports) to engine/prince.{js,wasm,data}. The game
//   runs on a stack that can wait (JSPI) inside main(), so its own loops
//   stay as they are.
// - The game's data folder, as SDLPoP ships it (the 1989 game's graphics,
//   levels, sounds and music), and tools/pop/SDLPoP.ini, preloaded at /pop.
// - The patched source the build came from goes next to the engine as
//   sdlpop-1.23-web-src.tar.gz, with the patch and the license, as the GPL asks.
//
//   node tools/build-pop.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, createReadStream, existsSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.pop-build/`;
const app = `${root}apps/pop/`;
const IMAGE = 'frunk-pop-emsdk';
const VERSION = '1.23';
const URL_ = `https://github.com/NagyD/SDLPoP/archive/refs/tags/v${VERSION}.tar.gz`;
const SHA256 = '41a9aa64b4e8d0a9d7a84ffced48f74f9528d81adbffc08593ecf84776c5d77a';

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const sha256 = async file => { const h = createHash('sha256'); await pipeline(createReadStream(file), h); return h.digest('hex'); };

mkdirSync(`${work}dl`, { recursive: true });
const tarball = `${work}dl/SDLPoP-${VERSION}.tar.gz`;
if (!existsSync(tarball) || await sha256(tarball) !== SHA256) {
  console.log(`downloading ${URL_}`);
  run('curl', ['-fL', '--retry', '3', '-o', tarball, URL_]);
}
if (await sha256(tarball) !== SHA256) throw new Error(`${tarball}: checksum mismatch`);

// ---------- source ----------

const src = `${work}src/`;
rmSync(src, { recursive: true, force: true });
mkdirSync(src, { recursive: true });
run('tar', ['-xzf', tarball, '-C', src]);
run('mv', [`${src}SDLPoP-${VERSION}`, `${src}sdlpop`]);
// (patch, not git apply: inside this repo's tree, git apply skips the files)
run('patch', ['-p1', '-s', '-i', `${root}tools/pop/sdlpop-web.patch`], { cwd: `${src}sdlpop` });
copyFileSync(`${root}tools/pop/SDLPoP.ini`, `${src}sdlpop/SDLPoP.ini`);

// ---------- engine ----------

run('docker', ['build', '--quiet', '-t', IMAGE, `${root}tools/pop`], { stdio: ['ignore', 'ignore', 'inherit'] });
const SOURCES = ['main', 'data', 'seg000', 'seg001', 'seg002', 'seg003', 'seg004', 'seg005', 'seg006', 'seg007', 'seg008', 'seg009',
  'seqtbl', 'replay', 'options', 'lighting', 'screenshot', 'menu', 'midi', 'opl3', 'stb_vorbis'].map(f => `src/${f}.c`);
run('docker', ['run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`, '-e', 'HOME=/tmp',
  // WebAssembly exceptions and longjmp: with Emscripten's JavaScript ones, a
  // call through libpng's setjmp puts JavaScript frames on the game's stack,
  // where a wait (JSPI) can't suspend
  '-v', `${src}sdlpop:/w`, '-w', '/w', IMAGE, 'emcc', '-O2', '-std=gnu99', '-D_GNU_SOURCE=1', '-Wno-unused-result', '-fwasm-exceptions', '-sSUPPORT_LONGJMP=wasm', ...SOURCES,
  '-sUSE_SDL=2', '-sUSE_SDL_IMAGE=2', '-sSDL2_IMAGE_FORMATS=["png"]',
  '-sJSPI', '-sENVIRONMENT=web', '-sINVOKE_RUN=0', '-sEXIT_RUNTIME=1', '-sFORCE_FILESYSTEM', '-lidbfs.js',
  '-sALLOW_MEMORY_GROWTH', '-sINITIAL_MEMORY=67108864', '-sSTACK_SIZE=1048576',
  '-sEXPORTED_RUNTIME_METHODS=FS,IDBFS,callMain', '-sEXPORTED_FUNCTIONS=_main',
  '--preload-file', 'data@/pop/data', '--preload-file', 'SDLPoP.ini@/pop/SDLPoP.ini',
  '-o', 'prince.js']);

rmSync(`${app}engine`, { recursive: true, force: true });
mkdirSync(`${app}engine`, { recursive: true });
for (const ext of ['js', 'wasm', 'data']) copyFileSync(`${src}sdlpop/prince.${ext}`, `${app}engine/prince.${ext}`);
// the source that goes with it: the patched game as built, without the
// build's outputs
run('tar', ['-czf', `${app}engine/sdlpop-${VERSION}-web-src.tar.gz`, '--exclude=sdlpop/prince.js', '--exclude=sdlpop/prince.wasm', '--exclude=sdlpop/prince.data', '-C', src, 'sdlpop']);
copyFileSync(`${src}sdlpop/COPYING`, `${app}engine/COPYING`);
copyFileSync(`${root}tools/pop/sdlpop-web.patch`, `${app}engine/sdlpop-web.patch`);
console.log('built apps/pop/engine/prince.{js,wasm,data}');
