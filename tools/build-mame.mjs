// Builds apps/arcade's engine: MAME 0.289 (GPL-2.0-or-later as a whole,
// https://github.com/mamedev/mame) at a fixed commit, with
// tools/mame/mame-web.patch, compiled with Emscripten 6.0.11 in Docker
// (emscripten/emsdk; MAME's SDL3 front end needs its SDL3_ttf port) to
// apps/arcade/engine/arcade.{js,wasm}. Only the drivers of the games in
// DRIVERS are built in, which keeps the wasm to about 39 MB (7 MB gzipped).
//
// No games: the ROMs mamedev.org gives away for free, non-commercial use
// may be downloaded only from mamedev.org, so players fetch them there on
// their phone and send them to the car.
//
// The source that goes with the engine, as the GPL asks, is every file the
// compiler read (from the build's dependency files) plus the build scripts,
// packed as apps/arcade/engine/mame-0.289-web-src.tar.xz with the patch.
//
//   node tools/build-mame.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.mame-build/`;
const app = `${root}apps/arcade/`;

const TAG = 'mame0289';
const COMMIT = 'f34f02505e32c1993c6a782b6814232cbfc74e36';
const IMAGE = 'emscripten/emsdk:6.0.11';

// The drivers of the games the page lists (apps/arcade/arcade.js GAMES)
const DRIVERS = [
  'exidy/circus.cpp', 'exidy/carpolo.cpp', 'exidy/exidy.cpp', 'exidy/starfire.cpp', 'exidy/victory.cpp', 'exidy/vertigo.cpp',
  'bally/astrocde.cpp', 'bally/gridlee.cpp', 'videogames/supertnk.cpp', 'videogames/looping.cpp', 'williams/williams.cpp',
];

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

mkdirSync(work, { recursive: true });
const src = `${work}mame/`;
if (!existsSync(`${src}.git`) || execFileSync('git', ['-C', src, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() !== COMMIT) {
  rmSync(src, { recursive: true, force: true });
  run('git', ['-c', 'advice.detachedHead=false', 'clone', '--quiet', '--depth', '1', '--branch', TAG, 'https://github.com/mamedev/mame.git', src]);
  const head = execFileSync('git', ['-C', src, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (head !== COMMIT) throw new Error(`${TAG} is ${head}, expected ${COMMIT}`);
}
run('git', ['-C', src, 'checkout', '--quiet', '--', '.']);
run('git', ['-C', src, 'clean', '-fdxq']);
run('git', ['-C', src, 'apply', `${root}tools/mame/mame-web.patch`]);

const sources = DRIVERS.map(d => `src/mame/${d}`).join(',');
run('docker', ['run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`, '-e', 'HOME=/tmp', '-v', `${src}:/src`, '-w', '/src', IMAGE,
  'bash', '-ec', `emmake make SUBTARGET=arcade SOURCES=${sources} REGENIE=1 -j${availableParallelism()} > build.log 2>&1 || { tail -40 build.log; exit 1; }`]);

rmSync(`${app}engine`, { recursive: true, force: true });
mkdirSync(`${app}engine`, { recursive: true });
for (const ext of ['js', 'wasm']) copyFileSync(`${src}arcade.${ext}`, `${app}engine/arcade.${ext}`);
copyFileSync(`${src}COPYING`, `${app}engine/COPYING`);
copyFileSync(`${root}tools/mame/mame-web.patch`, `${app}engine/mame-web.patch`);
console.log('built apps/arcade/engine/arcade.{js,wasm}');

// ---------- the source that goes with it ----------

// Every source or header file a dependency file names,
// plus what builds it: the makefiles and scripts, GENie's source, the files
// the link step embeds or adds, and the licenses
const files = new Set();
const walk = dir => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.d')) {
      // paths are relative to the project's make directory (../../../../../src/...)
      for (const m of readFileSync(p, 'utf8').matchAll(/(?:^|\s)(?:\.\.\/)+((?:src|3rdparty)\/[^\s\\]+)/g)) files.add(posix.normalize(m[1]));
    }
  }
};
walk(`${src}build`);
const keep = ['makefile', 'COPYING', 'README.md', 'scripts', '3rdparty/genie', 'bgfx/chains', 'bgfx/effects', 'bgfx/shaders/essl',
  'artwork/bgfx', 'artwork/lut-default.png', 'artwork/slot-mask.png', 'src/osd/modules/sound/js_sound.js', 'docs/legal'];
for (const k of keep) if (existsSync(`${src}${k}`)) files.add(k);
// each directory's license file, for the third-party libraries
for (const f of [...files]) {
  const top = f.match(/^3rdparty\/[^/]+/)?.[0];
  if (top) for (const name of readdirSync(`${src}${top}`)) if (/^(license|copying|copyright)/i.test(name)) files.add(`${top}/${name}`);
}
const list = [...files].filter(f => existsSync(`${src}${f}`)).sort();
writeFileSync(`${work}src-files.txt`, list.join('\n') + '\n');
const tarball = `${app}engine/mame-0.289-web-src.tar.xz`;
run('tar', ['-cJf', tarball, '--transform', 's,^,mame-0.289-web/,', '-C', src, '-T', `${work}src-files.txt`]);
console.log(`packed ${list.length} source paths into ${tarball.slice(root.length)} (${(statSync(tarball).size / 1e6).toFixed(1)} MB)`);
