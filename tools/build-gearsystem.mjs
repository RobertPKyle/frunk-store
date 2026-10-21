// Builds the Master System, Game Gear and SG-1000 core: Gearsystem
// (GPL-3.0-or-later, https://github.com/drhelius/Gearsystem) at a fixed
// release, unmodified, plus tools/gearsystem/web.cpp, compiled with
// Emscripten in Docker to apps/retro/sms/gearsystem.{js,wasm}. It runs in a
// worker (apps/retro/sms-worker.js).
//
// Gearsystem's license asks for the source to go with the program, so the
// build also writes apps/retro/sms/gearsystem-web-src.tar.gz: the
// Gearsystem sources compiled here, web.cpp and this script.
//
//   node tools/build-gearsystem.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.gearsystem-build/`;
const out = `${root}apps/retro/sms/`;

const GEARSYSTEM_TAG = '3.9.22';
const GEARSYSTEM_COMMIT = '517ddaaafbab1af7a312c2b6b6f6043275f58500';   // 2026-10-11
const IMAGE = 'emscripten/emsdk:4.0.10';

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

const src = `${work}Gearsystem-${GEARSYSTEM_TAG}/`;
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
run('git', ['init', '--quiet', src]);
run('git', ['-C', src, 'fetch', '--quiet', '--depth', '1', 'https://github.com/drhelius/Gearsystem.git', GEARSYSTEM_COMMIT]);
run('git', ['-C', src, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);
copyFileSync(`${root}tools/gearsystem/web.cpp`, `${src}web.cpp`);
copyFileSync(`${root}tools/build-gearsystem.mjs`, `${src}build-gearsystem.mjs`);

// What the libretro build compiles, without the libretro front end and the
// zip reader's own files (games arrive already unzipped)
const cpp = ['web.cpp',
  ...readdirSync(`${src}src`).filter(f => f.endsWith('.cpp')).map(f => `src/${f}`),
  ...['Blip_Buffer', 'Sms_Apu', 'Stereo_Buffer'].map(f => `src/audio/${f}.cpp`)];
const c = ['src/audio/emu2413/emu2413.c', 'platforms/shared/dependencies/miniz/miniz.c'];
const exported = ['alloc', 'free', 'load', 'reset', 'button', 'frame', 'screen', 'sample_count', 'samples',
  'battery_size', 'battery', 'state_size', 'state_save', 'state_load'].map(f => `_gs_${f}`).join(',');
const flags = ['-O3', '-msimd128', '-flto', '-DGS_DISABLE_DISASSEMBLER', '-DGS_DISABLE_VGMRECORDER', '-DNDEBUG', '-DEMULATOR_BUILD="3.9.22"',
  '-Isrc', '-Iplatforms/shared/dependencies/miniz'];

mkdirSync(out, { recursive: true });
run('docker', [
  'run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`,
  '-v', `${src}:/src`, '-v', `${out}:/out`, '-w', '/src', IMAGE,
  'bash', '-c', [
    `mkdir -p obj`,
    ...c.map((f, i) => `emcc ${flags.join(' ')} -c ${f} -o obj/c${i}.o`),
    `em++ -std=c++11 ${flags.map(f => `'${f}'`).join(' ')} ${cpp.join(' ')} obj/*.o -o /out/gearsystem.js ` +
      `-sMODULARIZE -sEXPORT_ES6 -sENVIRONMENT=web,worker -sALLOW_MEMORY_GROWTH -sFILESYSTEM=0 ` +
      `-sEXPORTED_FUNCTIONS=${exported} -sEXPORTED_RUNTIME_METHODS=HEAPU8,HEAP16,stringToUTF8,lengthBytesUTF8`,
  ].join(' && '),
]);

// The source that goes with it
rmSync(`${src}.git`, { recursive: true, force: true });
rmSync(`${src}obj`, { recursive: true, force: true });
run('tar', ['-czf', `${out}gearsystem-web-src.tar.gz`, '-C', work, `Gearsystem-${GEARSYSTEM_TAG}/src`, `Gearsystem-${GEARSYSTEM_TAG}/LICENSE`,
  `Gearsystem-${GEARSYSTEM_TAG}/README.md`, `Gearsystem-${GEARSYSTEM_TAG}/platforms/shared/dependencies/miniz`,
  `Gearsystem-${GEARSYSTEM_TAG}/web.cpp`, `Gearsystem-${GEARSYSTEM_TAG}/build-gearsystem.mjs`]);
copyFileSync(`${src}LICENSE`, `${out}LICENSE`);
console.log('built apps/retro/sms/gearsystem.{js,wasm} and gearsystem-web-src.tar.gz');
