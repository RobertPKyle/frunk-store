// Builds the Mega Drive / Genesis core: clownmdemu's emulation core
// (AGPL-3.0-or-later, https://github.com/Clownacy/clownmdemu) at a fixed
// commit, unmodified, plus tools/clownmdemu/web.c, compiled with Emscripten
// in Docker to apps/retro/md/clownmdemu.{js,wasm}. It runs in a worker
// (apps/retro/md-worker.js, with apps/retro/gear-worker.js).
//
// clownmdemu's license asks for the source to go with the program, also to
// people who use it over a network, so the build also writes
// apps/retro/md/clownmdemu-web-src.tar.gz: the sources compiled here,
// web.c and this script.
//
//   node tools/build-clownmdemu.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.clownmdemu-build/`;
const out = `${root}apps/retro/md/`;

const CLOWNMDEMU_COMMIT = '88ef45a6585556e2247dd26b6c937d6b9fb4a12d';   // 2026-10-02, as in clownmdemu-frontend v1.6.12's tree
const IMAGE = 'emscripten/emsdk:4.0.10';

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

const base = 'clownmdemu-core';
const src = `${work}${base}/`;
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
run('git', ['init', '--quiet', src]);
run('git', ['-C', src, 'fetch', '--quiet', '--depth', '1', 'https://github.com/Clownacy/clownmdemu.git', CLOWNMDEMU_COMMIT]);
run('git', ['-C', src, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);
// clown68000, clownz80 and clowncommon, at the commits the core names
run('git', ['-C', src, 'submodule', '--quiet', 'update', '--init', '--recursive', '--depth', '1']);
copyFileSync(`${root}tools/clownmdemu/web.c`, `${src}web.c`);
copyFileSync(`${root}tools/build-clownmdemu.mjs`, `${src}build-clownmdemu.mjs`);

const exported = ['alloc', 'free', 'load', 'reset', 'button', 'frame', 'display_width', 'screen', 'sample_count', 'samples',
  'battery_size', 'battery', 'state_size', 'state_save', 'state_load'].map(f => `_md_${f}`).join(',');
// The core's own unity build: the 68000 and Z80 interpreters, VDP, sound
// chips and the (unused) Mega CD parts
const flags = ['-O3', '-msimd128', '-flto', '-DNDEBUG'];

mkdirSync(out, { recursive: true });
run('docker', [
  'run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`,
  '-v', `${src}:/src`, '-v', `${out}:/out`, '-w', '/src', IMAGE,
  'emcc', ...flags, 'web.c', 'unity.c', '-o', '/out/clownmdemu.js',
  '-sMODULARIZE', '-sEXPORT_ES6', '-sENVIRONMENT=web,worker', '-sALLOW_MEMORY_GROWTH', '-sFILESYSTEM=0',
  `-sEXPORTED_FUNCTIONS=${exported}`, '-sEXPORTED_RUNTIME_METHODS=HEAPU8,HEAP16',
]);

// The source that goes with it
run('tar',['-czf', `${out}clownmdemu-web-src.tar.gz`, '-C', work, '--exclude=.git', base]);
copyFileSync(`${src}LICENCE.txt`, `${out}LICENSE`);
// The libraries' licenses: clown68000 and clownz80 are under the same AGPL
// as the core, clowncommon under the zero-clause BSD license
writeFileSync(`${out}THIRD-PARTY.txt`, [
  'clownmdemu includes three libraries by the same author (Clownacy):',
  '- clown68000 (68000 interpreter), GNU AGPL 3 or later, the same license as clownmdemu (LICENSE)',
  '- clownz80 (Z80 interpreter), GNU AGPL 3 or later, the same license as clownmdemu (LICENSE)',
  '- clowncommon, zero-clause BSD license:',
  '',
  readFileSync(`${src}libraries/clowncommon/licence.txt`, 'utf8').trim(),
  '',
].join('\n'));
console.log('built apps/retro/md/clownmdemu.{js,wasm} and clownmdemu-web-src.tar.gz');
