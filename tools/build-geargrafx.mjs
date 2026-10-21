// Builds the PC Engine / TurboGrafx-16 core: Geargrafx (GPL-3.0-or-later,
// https://github.com/drhelius/Geargrafx) at a fixed release, unmodified,
// plus tools/geargrafx/web.cpp, compiled with Emscripten in Docker to
// apps/retro/pce/geargrafx.{js,wasm}. It runs in a worker
// (apps/retro/pce-worker.js, with apps/retro/gear-worker.js).
//
// Geargrafx's license asks for the source to go with the program, so the
// build also writes apps/retro/pce/geargrafx-web-src.tar.gz: the Geargrafx
// sources compiled here, web.cpp and this script.
//
//   node tools/build-geargrafx.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.geargrafx-build/`;
const out = `${root}apps/retro/pce/`;

const GEARGRAFX_TAG = '1.8.4';
const GEARGRAFX_COMMIT = '1c62a549328241518101f5be5bf3e6840b96ea5d';   // 2026-10-15
const IMAGE = 'emscripten/emsdk:4.0.10';

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

const src = `${work}Geargrafx-${GEARGRAFX_TAG}/`;
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
run('git', ['init', '--quiet', src]);
run('git', ['-C', src, 'fetch', '--quiet', '--depth', '1', 'https://github.com/drhelius/Geargrafx.git', GEARGRAFX_COMMIT]);
run('git', ['-C', src, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);
copyFileSync(`${root}tools/geargrafx/web.cpp`, `${src}web.cpp`);
copyFileSync(`${root}tools/build-geargrafx.mjs`, `${src}build-geargrafx.mjs`);

// What the libretro build compiles (platforms/libretro/Makefile.common),
// without the libretro front end and its file access, and without the
// readers for physical CD drives
const deps = 'platforms/shared/dependencies';
const cpp = ['web.cpp', `${deps}/qon/qon.cpp`,
  ...readdirSync(`${src}src`).filter(f => f.endsWith('.cpp') && !/^(cdrom_drive_|cdrom_physical_|media_file_libretro)/.test(f)).map(f => `src/${f}`)];
const c = [`${deps}/miniz/miniz.c`,
  ...['bitstream', 'cdrom', 'chd', 'flac', 'huffman'].map(f => `${deps}/libchdr/src/libchdr_${f}.c`),
  ...['LzFind', 'LzmaEnc', 'LzmaDec', 'CpuArch'].map(f => `${deps}/lzma/src/${f}.c`),
  `${deps}/minivorbis/minivorbis.c`];
const exported = ['alloc', 'free', 'load', 'reset', 'button', 'frame', 'display_width', 'screen', 'sample_count', 'samples',
  'battery_size', 'battery', 'state_size', 'state_save', 'state_load'].map(f => `_gg_${f}`).join(',');
const flags = ['-O3', '-msimd128', '-flto', '-fno-exceptions', '-DGG_DISABLE_DISASSEMBLER', '-DGG_DISABLE_VGMRECORDER', '-DNDEBUG',
  '-DZ7_ST', '-DZSTD_DISABLE_ASM', '-DMINIZ_NO_TIME', '-D_POSIX_C_SOURCE=200809L', `-DEMULATOR_BUILD="${GEARGRAFX_TAG}"`,
  '-Isrc', ...['minivorbis', 'miniz', 'json', 'qon', 'libchdr/include', 'zstd', 'lzma/include'].map(d => `-I${deps}/${d}`)];

mkdirSync(out, { recursive: true });
run('docker', [
  'run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`,
  '-v', `${src}:/src`, '-v', `${out}:/out`, '-w', '/src', IMAGE,
  'bash', '-c', [
    `mkdir -p obj`,
    ...c.map((f, i) => `emcc ${flags.map(f => `'${f}'`).join(' ')} -std=gnu99 -c ${f} -o obj/c${i}.o`),
    `em++ -std=c++17 ${flags.map(f => `'${f}'`).join(' ')} ${cpp.join(' ')} obj/*.o -o /out/geargrafx.js ` +
      `-sMODULARIZE -sEXPORT_ES6 -sENVIRONMENT=web,worker -sALLOW_MEMORY_GROWTH -sFILESYSTEM=0 ` +
      `-sEXPORTED_FUNCTIONS=${exported} -sEXPORTED_RUNTIME_METHODS=HEAPU8,HEAP16`,
  ].join(' && '),
]);

// The source that goes with it
rmSync(`${src}.git`, { recursive: true, force: true });
rmSync(`${src}obj`, { recursive: true, force: true });
const base = `Geargrafx-${GEARGRAFX_TAG}`;
run('tar', ['-czf', `${out}geargrafx-web-src.tar.gz`, '-C', work, `${base}/src`, `${base}/LICENSE`, `${base}/README.md`,
  ...['miniz', 'libchdr', 'lzma', 'minivorbis', 'zstd', 'json', 'qon'].map(d => `${base}/${deps}/${d}`),
  `${base}/web.cpp`, `${base}/build-geargrafx.mjs`]);
copyFileSync(`${src}LICENSE`, `${out}LICENSE`);
// The licenses of the libraries compiled in: ours lists those whose license
// is only in their files' headers
writeFileSync(`${out}THIRD-PARTY.txt`, [readFileSync(`${root}tools/geargrafx/licenses.txt`, 'utf8'),
  ...[['libchdr', 'libchdr/LICENSE.txt', 'BSD 3-Clause License'], ['LZMA SDK', 'lzma/LICENSE', 'public domain'],
    ['minivorbis', 'minivorbis/LICENSE.txt', 'BSD 3-Clause License']].map(([name, file, license]) =>
    `\n== ${name} (${deps}/${file.split('/')[0]}), ${license} ==\n\n${readFileSync(`${src}${deps}/${file}`, 'utf8').trim()}\n`)].join(''));
console.log('built apps/retro/pce/geargrafx.{js,wasm} and geargrafx-web-src.tar.gz');
