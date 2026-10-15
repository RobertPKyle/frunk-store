// Builds the SNES core: LakeSnes (tools/lakesnes, MIT, from
// https://github.com/dinkc64/LakeSnes) plus tools/lakesnes/web.c, compiled
// with Emscripten in Docker to apps/retro/snes/lakesnes.{js,wasm}.
//
//   node tools/build-snes.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
mkdirSync(`${root}apps/retro/snes`, { recursive: true });

const sources = ['web.c', ...['apu', 'cart', 'cpu', 'cx4', 'dma', 'dsp', 'input', 'ppu', 'snes', 'snes_other', 'spc', 'statehandler'].map(f => `snes/${f}.c`)];
const exported = ['alloc', 'free', 'load', 'reset', 'button', 'frame', 'screen', 'samples', 'battery_size', 'battery_save', 'battery_load', 'state_size', 'state_save', 'state_load']
  .map(f => `_lake_${f}`).join(',');

execFileSync('docker', [
  'run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`,
  '-v', `${root}:/src`, '-w', '/src/tools/lakesnes',
  'emscripten/emsdk:4.0.10',
  'emcc', '-O3', '-msimd128', '-flto', ...sources,
  '-o', '/src/apps/retro/snes/lakesnes.js',
  '-sMODULARIZE', '-sEXPORT_ES6', '-sENVIRONMENT=web', '-sALLOW_MEMORY_GROWTH',
  '-sINITIAL_MEMORY=33554432', '-sFILESYSTEM=0',
  `-sEXPORTED_FUNCTIONS=${exported}`, '-sEXPORTED_RUNTIME_METHODS=HEAPU8,HEAP16',
], { stdio: 'inherit' });
console.log('built apps/retro/snes/lakesnes.{js,wasm}');
