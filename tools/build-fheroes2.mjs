// Builds apps/fheroes2's engine: fheroes2 1.1.17 (GPL-2.0-or-later,
// https://github.com/ihhub/fheroes2), the open-source engine for Heroes of
// Might and Magic II, compiled unmodified with its own Emscripten makefile
// (Makefile.emscripten: SDL2, Asyncify, IDBFS) in Docker
// (tools/fheroes2/Dockerfile: emsdk 4.0.10 plus gettext) to
// apps/fheroes2/engine/fheroes2.{js,wasm,data}. The .data package holds the
// engine's own files (its data file, translations, MIDI instruments and
// maps); the game's own files come from the player. The source the build
// came from goes next to it as fheroes2-1.1.17-src.tar.gz, as the GPL asks.
//
//   node tools/build-fheroes2.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.fheroes2-build/`;
const out = `${root}apps/fheroes2/engine/`;

const FHEROES2 = '1.1.17';
const FHEROES2_COMMIT = '2685c2188b541660f1ce261b554c3e92f79b1775';   // 2026-06-30
const IMAGE = 'frunk-fheroes2-emsdk:4.0.10';

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

const src = `${work}fheroes2-${FHEROES2}/`;
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
run('git', ['init', '--quiet', src]);
run('git', ['-C', src, 'fetch', '--quiet', '--depth', '1', 'https://github.com/ihhub/fheroes2.git', FHEROES2_COMMIT]);
run('git', ['-C', src, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);

// The source, before the build adds to it
mkdirSync(out, { recursive: true });
run('git', ['-C', src, 'archive', '--format=tar.gz', `--prefix=fheroes2-${FHEROES2}/`, '-o', `${out}fheroes2-${FHEROES2}-src.tar.gz`, 'HEAD']);

run('docker', ['build', '-q', '-t', IMAGE, `${root}tools/fheroes2`]);
const jobs = String(Math.max(2, Math.min(16, Number(execFileSync('nproc', { encoding: 'utf8' }).trim()))));
run('docker', [
  'run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`, '-e', 'HOME=/tmp',
  '-v', `${src}:/src`, '-w', '/src', IMAGE,
  'emmake', 'make', '-f', 'Makefile.emscripten', `-j${jobs}`,
]);
for (const f of ['fheroes2.js', 'fheroes2.wasm', 'fheroes2.data']) copyFileSync(`${src}${f}`, `${out}${f}`);
copyFileSync(`${src}LICENSE`, `${out}LICENSE`);
console.log(`built apps/fheroes2/engine/fheroes2.{js,wasm,data} and fheroes2-${FHEROES2}-src.tar.gz`);
