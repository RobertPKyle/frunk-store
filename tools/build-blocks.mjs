// Builds apps/blocks' engine, textures and sounds:
//
// - ClassiCube (BSD-3-Clause, https://github.com/ClassiCube/ClassiCube), a
//   clean-room Minecraft Classic compatible game, at a fixed commit with
//   tools/blocks/classicube-web.patch, compiled with Emscripten in Docker to
//   apps/blocks/engine/ClassiCube.{js,wasm}, with its license and the patch.
// - Mineclonia's textures and sounds (https://codeberg.org/mineclonia/mineclonia,
//   media under Creative Commons licenses; the textures are based on the
//   Pixel Perfection packs, CC BY-SA 4.0) at a fixed commit, made into
//   apps/blocks/data/textures.zip (ClassiCube's texture pack layout) and
//   apps/blocks/data/sounds/ by tools/blocks/pack.mjs. Mineclonia's legal
//   notes go next to them.
// - Monocraft (SIL Open Font License 1.1, https://github.com/IdreesInc/Monocraft),
//   a pixel font in Minecraft's style, checked against its SHA-256 and drawn
//   into the texture pack's font; its license goes next to it.
//
//   node tools/build-blocks.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';
import { pack } from './blocks/pack.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.blocks-build/`;
const app = `${root}apps/blocks/`;

const CLASSICUBE_COMMIT = '33891a4e7e586941240261bc911312f228be57d3';   // 1.3.8 + fixes, 2026-10-15
const MINECLONIA_COMMIT = '490f3c62e609e87f615703f4fe75b9ba7e05cfbc';   // 2026-10-15
const MONOCRAFT = 'https://raw.githubusercontent.com/IdreesInc/Monocraft/e498bf70aeb25b4bdcff1e44d878fb2cb4f7c2a9/';
const MONOCRAFT_TTF_SHA256 = '262e31822e0a75be567b02320bfa092143d871e8a273e529d1c5ab0c04cd215f';
const MONOCRAFT_LICENSE_SHA256 = 'f69c147003e052dbc9d96c40a9f73647e72766cfda95a597b94ed827fe25acb1';

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

function checkout(url, commit, dir) {
  rmSync(dir, { recursive: true, force: true });
  run('git', ['init', '--quiet', dir]);
  run('git', ['-C', dir, 'fetch', '--quiet', '--depth', '1', url, commit]);
  run('git', ['-C', dir, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);
}

mkdirSync(work, { recursive: true });
mkdirSync(`${app}engine`, { recursive: true });
mkdirSync(`${app}data`, { recursive: true });

// ---------- engine ----------

const src = `${work}ClassiCube/`;
checkout('https://github.com/ClassiCube/ClassiCube.git', CLASSICUBE_COMMIT, src);
run('git', ['-C', src, 'apply', `${root}tools/blocks/classicube-web.patch`]);
run('docker', [
  'run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`,
  '-v', `${src}:/src`, '-w', '/src',
  'emscripten/emsdk:4.0.10',
  'make', 'web', `-j${availableParallelism()}`,
]);
for (const ext of ['js', 'wasm']) copyFileSync(`${src}ClassiCube.${ext}`, `${app}engine/ClassiCube.${ext}`);
copyFileSync(`${src}license.txt`, `${app}engine/LICENSE.txt`);
copyFileSync(`${root}tools/blocks/classicube-web.patch`, `${app}engine/classicube-web.patch`);
console.log('built apps/blocks/engine/ClassiCube.{js,wasm}');

// ---------- textures and sounds ----------

const mcl = `${work}mineclonia/`;
checkout('https://codeberg.org/mineclonia/mineclonia.git', MINECLONIA_COMMIT, mcl);
async function fetchChecked(url, file, sum) {
  if (!existsSync(file)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const data = readFileSync(file);
  if (createHash('sha256').update(data).digest('hex') !== sum) throw new Error(`${file}: checksum mismatch`);
  return data;
}
const font = await fetchChecked(`${MONOCRAFT}dist/Monocraft-ttf/Monocraft.ttf`, `${work}Monocraft.ttf`, MONOCRAFT_TTF_SHA256);
writeFileSync(`${app}data/MONOCRAFT-LICENSE.txt`, await fetchChecked(`${MONOCRAFT}LICENSE`, `${work}MONOCRAFT-LICENSE`, MONOCRAFT_LICENSE_SHA256));

const packed = pack({ mineclonia: mcl, font, out: `${app}data` });
copyFileSync(`${mcl}LEGAL.md`, `${app}data/MINECLONIA-LEGAL.md`);
console.log(`built apps/blocks/data/textures.zip (${packed.files.length} files) and ${packed.sounds.length} sounds`);
