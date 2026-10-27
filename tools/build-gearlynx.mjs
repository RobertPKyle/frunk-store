// Builds the Atari Lynx core: Gearlynx (GPL-3.0-or-later,
// https://github.com/drhelius/Gearlynx) at a fixed release, with
// tools/gearlynx/gearlynx-web.patch (a hook for the stand-in boot ROM) and
// tools/gearlynx/web.cpp, compiled with Emscripten in Docker to
// apps/retro/lynx/gearlynx.{js,wasm}. It runs in a worker
// (apps/retro/lynx-worker.js, with apps/retro/gear-worker.js).
//
// Gearlynx's license asks for the source to go with the program, so the
// build also writes apps/retro/lynx/gearlynx-web-src.tar.gz: the Gearlynx
// sources compiled here, patched, with web.cpp, the patch and this script.
//
//   node tools/build-gearlynx.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.gearlynx-build/`;
const out = `${root}apps/retro/lynx/`;

const GEARLYNX_TAG = '1.2.36';
const GEARLYNX_COMMIT = '838af17e9948bb6215a3ab7c9d45aba4355fe0fb';   // 2026-10-24
const IMAGE = 'emscripten/emsdk:4.0.10';

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

const src = `${work}Gearlynx-${GEARLYNX_TAG}/`;
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
run('git', ['init', '--quiet', src]);
run('git', ['-C', src, 'fetch', '--quiet', '--depth', '1', 'https://github.com/drhelius/Gearlynx.git', GEARLYNX_COMMIT]);
run('git', ['-C', src, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);
run('git', ['-C', src, 'apply', `${root}tools/gearlynx/gearlynx-web.patch`]);
copyFileSync(`${root}tools/gearlynx/web.cpp`, `${src}web.cpp`);
copyFileSync(`${root}tools/gearlynx/gearlynx-web.patch`, `${src}gearlynx-web.patch`);
copyFileSync(`${root}tools/build-gearlynx.mjs`, `${src}build-gearlynx.mjs`);

// What the libretro build compiles (platforms/libretro/Makefile.common),
// without the libretro front end; web.cpp stands in for the SD card's file
// access
const deps = 'platforms/shared/dependencies';
const cpp = ['web.cpp', ...readdirSync(`${src}src`).filter(f => f.endsWith('.cpp') && f !== 'sd_card_filesystem_native.cpp').map(f => `src/${f}`)];
const exported = ['alloc', 'free', 'load', 'reset', 'button', 'frame', 'frame_us', 'screen', 'sample_count', 'samples',
  'battery_size', 'battery', 'state_size', 'state_save', 'state_load'].map(f => `_gl_${f}`).join(',');
const flags = ['-O3', '-msimd128', '-flto', '-fno-exceptions', '-DGLYNX_DISABLE_DISASSEMBLER', '-DGLYNX_DISABLE_VGMRECORDER', '-DNDEBUG',
  '-DMINIZ_NO_TIME', `-DEMULATOR_BUILD="${GEARLYNX_TAG}"`, '-Isrc', `-I${deps}/miniz`];

mkdirSync(out, { recursive: true });
run('docker', [
  'run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`,
  '-v', `${src}:/src`, '-v', `${out}:/out`, '-w', '/src', IMAGE,
  'bash', '-c', [
    `mkdir -p obj`,
    `emcc ${flags.map(f => `'${f}'`).join(' ')} -c ${deps}/miniz/miniz.c -o obj/miniz.o`,
    `em++ -std=c++17 ${flags.map(f => `'${f}'`).join(' ')} ${cpp.join(' ')} obj/*.o -o /out/gearlynx.js ` +
      `-sMODULARIZE -sEXPORT_ES6 -sENVIRONMENT=web,worker -sALLOW_MEMORY_GROWTH -sFILESYSTEM=0 ` +
      `-sEXPORTED_FUNCTIONS=${exported} -sEXPORTED_RUNTIME_METHODS=HEAPU8,HEAP16`,
  ].join(' && '),
]);

// The source that goes with it
rmSync(`${src}.git`, { recursive: true, force: true });
rmSync(`${src}obj`, { recursive: true, force: true });
const base = `Gearlynx-${GEARLYNX_TAG}`;
run('tar', ['-czf', `${out}gearlynx-web-src.tar.gz`, '-C', work, `${base}/src`, `${base}/LICENSE`, `${base}/README.md`,
  `${base}/${deps}/miniz`, `${base}/web.cpp`, `${base}/gearlynx-web.patch`, `${base}/build-gearlynx.mjs`]);
copyFileSync(`${src}LICENSE`, `${out}LICENSE`);
// miniz's license is in the first comment of miniz.c
const mit = /\/\*+([\s\S]*?)\*+\//.exec(readFileSync(`${src}${deps}/miniz/miniz.c`, 'utf8'))[1]
  .split('\n').map(l => l.replace(/^ ?\* ?/, '')).join('\n').trim();
writeFileSync(`${out}THIRD-PARTY.txt`, [
  'Compiled into gearlynx.wasm along with Gearlynx (GNU GPL 3 or later, LICENSE):\n',
  `\n== miniz (${deps}/miniz), MIT License ==\n\n${mit}\n`,
  '\n== The stand-in boot ROM (web.cpp) ==\n\nIts start-up is modeled on Handy\'s high-level boot ROM (libretro-handy, lynx/system.cpp),\nCopyright (c) 2004 K. Wilkins, under the zlib license.\n',
].join(''));
console.log('built apps/retro/lynx/gearlynx.{js,wasm} and gearlynx-web-src.tar.gz');
