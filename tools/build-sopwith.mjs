// Builds apps/sopwith/engine: SDL Sopwith, Simon Howard's port of the 1984
// biplane game by David L. Clark.
//
// - SDL Sopwith (GPL-2.0-or-later, https://github.com/fragglet/sdl-sopwith)
//   at a pinned commit, with tools/sopwith/sopwith-web.patch (web_* calls so
//   the page can pass on touch and controllers, no built-in touch strip, keys
//   only while the picture has the focus, no "open manual" or "install as
//   app" in the menu), compiled with Emscripten in Docker
//   (tools/sopwith/Dockerfile: emsdk 4.0.10) to engine/sopwith.{js,wasm}.
// - The game's pictures, sounds and missions are part of the code, so there
//   is no data file.
// - The source of what was built goes next to the engine as a tarball, with
//   the patch and the license, as the GPL asks.
//
//   node tools/build-sopwith.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.sopwith-build/`;
const app = `${root}apps/sopwith/`;
const IMAGE = 'frunk-sopwith-emsdk';
const COMMIT = 'c4e034109e28a5bd1727645fe77b27430219e8b5';   // 2026-04-15, after 2.9.0

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const jobs = String(Math.max(2, cpus().length - 1));

// ---------- source ----------

const src = `${work}src/sopwith/`;
rmSync(`${work}src`, { recursive: true, force: true });
mkdirSync(src, { recursive: true });
run('git', ['init', '--quiet', src]);
run('git', ['-C', src, 'fetch', '--quiet', '--depth', '1', 'https://github.com/fragglet/sdl-sopwith.git', COMMIT]);
run('git', ['-C', src, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);
rmSync(`${src}.git`, { recursive: true, force: true });
// (patch, not git apply: inside this repo's tree, git apply skips the files)
run('patch', ['-p1', '-s', '-i', `${root}tools/sopwith/sopwith-web.patch`], { cwd: src });

// Emscripten's SDL2 port has no pkg-config file of its own
mkdirSync(`${src}.pkg`, { recursive: true });
writeFileSync(`${src}.pkg/sdl2.pc`, 'prefix=/\nName: sdl2\nDescription: sdl2\nVersion: 2.30.0\nLibs: -sUSE_SDL=2\nCflags: -sUSE_SDL=2\n');

// ---------- engine ----------

run('docker', ['build', '--quiet', '-t', IMAGE, `${root}tools/sopwith`], { stdio: ['ignore', 'ignore', 'inherit'] });
// (configure puts -g in front of these; -g0 takes it back out)
const CFLAGS = '-O2 -g0 -fexceptions -sSUPPORT_LONGJMP=emscripten';
const LDFLAGS = [
  '-O2', '-flto', '-sASYNCIFY', '-sFORCE_FILESYSTEM', '-sENVIRONMENT=web', '-lidbfs.js', '-Wl,-u,ntohs',
  '-sMODULARIZE=1', '-sEXPORT_NAME=createSopwith', '-sINVOKE_RUN=0', '-sEXIT_RUNTIME=0',
  '-sEXPORTED_FUNCTIONS=_main', '-sEXPORTED_RUNTIME_METHODS=FS,callMain',
  CFLAGS,
].join(' ');
run('docker', ['run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`, '-e', 'HOME=/tmp',
  '-e', `CFLAGS=${CFLAGS}`, '-e', `LDFLAGS=${LDFLAGS}`, '-e', 'PKG_CONFIG_PATH=/w/.pkg', '-e', 'PKG_CONFIG_LIBDIR=/w/.pkg',
  '-v', `${src}:/w`, '-w', '/w', IMAGE, 'sh', '-c', `set -e
  mkdir -p autotools
  autoreconf -fi
  emconfigure ./configure --host=asmjs-local-emscripten
  emmake make -j${jobs}
`]);

rmSync(`${app}engine`, { recursive: true, force: true });
mkdirSync(`${app}engine`, { recursive: true });
copyFileSync(`${src}src/sopwith`, `${app}engine/sopwith.js`);
copyFileSync(`${src}src/sopwith.wasm`, `${app}engine/sopwith.wasm`);

// the source that goes with it: the tree as patched, before configure ran
const short = COMMIT.slice(0, 12);
rmSync(`${work}src`, { recursive: true, force: true });
mkdirSync(src, { recursive: true });
run('git', ['init', '--quiet', src]);
run('git', ['-C', src, 'fetch', '--quiet', '--depth', '1', 'https://github.com/fragglet/sdl-sopwith.git', COMMIT]);
run('git', ['-C', src, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);
rmSync(`${src}.git`, { recursive: true, force: true });
run('patch', ['-p1', '-s', '-i', `${root}tools/sopwith/sopwith-web.patch`], { cwd: src });
run('tar', ['-czf', `${app}engine/sdl-sopwith-${short}-web-src.tar.gz`, '-C', `${work}src`, 'sopwith']);
copyFileSync(`${src}COPYING.md`, `${app}engine/COPYING.md`);
copyFileSync(`${root}tools/sopwith/sopwith-web.patch`, `${app}engine/sopwith-web.patch`);
for (const f of readdirSync(`${app}engine`)) console.log(`${f}  ${(statSync(`${app}engine/${f}`).size / 1048576).toFixed(2)} MB`);
console.log('built apps/sopwith/engine/sopwith.{js,wasm}');
