// Builds apps/supertux:
//
// - SuperTux 0.7.0 (GPL-3.0-or-later, https://www.supertux.org), the
//   release's source tarball checked against its SHA-256, with
//   tools/supertux/supertux-web.patch, compiled with Emscripten in Docker
//   (tools/supertux/Dockerfile: emsdk 4.0.10 with the ports the game uses)
//   to apps/supertux/engine/supertux2.{js,wasm}. Its libraries Emscripten
//   doesn't have as ports are built from their release tarballs first:
//   PhysicsFS 3.2.0 (zlib license), {fmt} 11.2.0 (MIT) and GLM 1.0.1 (MIT).
//   The patched source the build came from goes next to the engine as
//   supertux-0.7.0-web-src.tar.gz (without the data, which is published
//   as is in data/), with the libraries' source tarballs, as the GPL asks.
// - The game's data folder from the same tarball, packed by
//   tools/supertux/pack.mjs into apps/supertux/data/<version>/<n>.bin
//   blocks and data/index.json, the files the game reads while starting
//   and in its first level (tools/supertux/boot.txt) first.
//
//   node tools/build-supertux.mjs [--engine]   (--engine: leave data/ as it is)
import { execFileSync } from 'node:child_process';
import { copyFileSync, createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';
import { pack, readBoot } from './supertux/pack.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.supertux-build/`;
const app = `${root}apps/supertux/`;
const IMAGE = 'frunk-supertux-emsdk';

const SUPERTUX = '0.7.0';
const SOURCES = {
  supertux: ['https://github.com/SuperTux/supertux/releases/download/v0.7.0/SuperTux-v0.7.0-Source.tar.gz', '32fc5b99b9994ed58e58341d6f21de925764b381256e108591136de53bc31da5'],
  physfs: ['https://github.com/icculus/physfs/archive/refs/tags/release-3.2.0.tar.gz', '1991500eaeb8d5325e3a8361847ff3bf8e03ec89252b7915e1f25b3f8ab5d560'],
  fmt: ['https://github.com/fmtlib/fmt/archive/refs/tags/11.2.0.tar.gz', 'bc23066d87ab3168f27cef3e97d545fa63314f5c79df5ea444d41d56f962c6af'],
  glm: ['https://github.com/g-truc/glm/archive/refs/tags/1.0.1.tar.gz', '9f3174561fd26904b23f0db5e560971cbf9b3cbda0b280f04d5c379d03bf234c'],
};
const FILES = { supertux: 'SuperTux-v0.7.0-Source.tar.gz', physfs: 'physfs-3.2.0.tar.gz', fmt: 'fmt-11.2.0.tar.gz', glm: 'glm-1.0.1.tar.gz' };

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const sha256 = async file => { const h = createHash('sha256'); await pipeline(createReadStream(file), h); return h.digest('hex'); };

async function fetchChecked(url, file, sum) {
  if (!existsSync(file) || await sha256(file) !== sum) {
    console.log(`downloading ${url}`);
    run('curl', ['-fL', '--retry', '3', '-o', file, url]);
  }
  if (await sha256(file) !== sum) throw new Error(`${file}: checksum mismatch`);
}

mkdirSync(`${work}dl`, { recursive: true });
for (const [name, [url, sum]] of Object.entries(SOURCES)) await fetchChecked(url, `${work}dl/${FILES[name]}`, sum);

// ---------- sources ----------

const src = `${work}src/`;
rmSync(src, { recursive: true, force: true });
mkdirSync(`${src}deps`, { recursive: true });
run('tar', ['-xzf', `${work}dl/${FILES.supertux}`, '-C', src]);
run('mv', [`${src}SuperTux-v${SUPERTUX}-Source`, `${src}supertux`]);
for (const name of ['physfs', 'fmt', 'glm']) run('tar', ['-xzf', `${work}dl/${FILES[name]}`, '-C', `${src}deps`]);
// (patch, not git apply: inside this repo's tree, git apply skips the files)
run('patch', ['-p1', '-s', '-i', `${root}tools/supertux/supertux-web.patch`], { cwd: `${src}supertux` });

// ---------- engine ----------

run('docker', ['build', '--quiet', '-t', IMAGE, `${root}tools/supertux`], { stdio: ['ignore', 'ignore', 'inherit'] });
const jobs = String(availableParallelism());
const docker = script => run('docker', ['run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`, '-e', 'HOME=/tmp',
  '-v', `${src}:/w`, '-w', '/w', IMAGE, 'bash', '-ec', script]);
// the libraries, with WebAssembly exceptions like the game
docker(`
F="-O2 -fwasm-exceptions"
emcmake cmake -S deps/physfs-release-3.2.0 -B deps/b-physfs -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/w/prefix -DPHYSFS_BUILD_SHARED=OFF -DPHYSFS_BUILD_TEST=OFF -DPHYSFS_BUILD_DOCS=OFF -DCMAKE_C_FLAGS="$F" -DCMAKE_POLICY_VERSION_MINIMUM=3.5 -Wno-dev > /dev/null
cmake --build deps/b-physfs -j${jobs} --target install > /dev/null
emcmake cmake -S deps/fmt-11.2.0 -B deps/b-fmt -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/w/prefix -DFMT_TEST=OFF -DFMT_DOC=OFF -DCMAKE_CXX_FLAGS="$F" > /dev/null
cmake --build deps/b-fmt -j${jobs} --target install > /dev/null
emcmake cmake -S deps/glm-1.0.1 -B deps/b-glm -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/w/prefix -DGLM_BUILD_TESTS=OFF -DGLM_BUILD_LIBRARY=OFF -Wno-dev > /dev/null
cmake --build deps/b-glm -j${jobs} --target install > /dev/null
`);
// The game draws through SDL's renderer on the web (upstream's choice), with
// the menus for phones (no level editor, resolutions or cursors) and no
// network features
docker(`
emcmake cmake -S supertux -B build-web -DCMAKE_BUILD_TYPE=Release -DCMAKE_PREFIX_PATH=/w/prefix -DCMAKE_FIND_ROOT_PATH=/w/prefix \
  -DIS_SUPERTUX_RELEASE=ON -DENABLE_DISCORD=OFF -DENABLE_NETWORKING=OFF -DENABLE_OPENGL=OFF -DHIDE_NONMOBILE_OPTIONS=ON \
  -DUSE_STATIC_SIMPLESQUIRREL=ON -Wno-dev > /dev/null
cmake --build build-web -j${jobs} --target supertux2
`);
rmSync(`${app}engine`, { recursive: true, force: true });
mkdirSync(`${app}engine`, { recursive: true });
for (const ext of ['js', 'wasm']) copyFileSync(`${src}build-web/supertux2.${ext}`, `${app}engine/supertux2.${ext}`);

// The source that goes with it: the patched game without its data, and the
// libraries as released
run('tar', ['-czf', `${app}engine/supertux-${SUPERTUX}-web-src.tar.gz`, '--exclude=supertux/data', '-C', src, 'supertux']);
for (const name of ['physfs', 'fmt', 'glm']) copyFileSync(`${work}dl/${FILES[name]}`, `${app}engine/${FILES[name]}`);
copyFileSync(`${src}supertux/LICENSE.txt`, `${app}engine/LICENSE.txt`);
copyFileSync(`${root}tools/supertux/supertux-web.patch`, `${app}engine/supertux-web.patch`);
console.log(`built apps/supertux/engine/supertux2.{js,wasm}`);

// ---------- data ----------

if (process.argv.includes('--engine')) process.exit(0);

const data = `${src}supertux/data`;
const out = `${app}data`;
mkdirSync(out, { recursive: true });
const packed = pack({ data, out, ...readBoot(readFileSync(`${root}tools/supertux/boot.txt`, 'utf8')) });
// the art's and music's authors and licenses, readable without the game
const licenses = ['AUTHORS', 'ACKNOWLEDGEMENTS.txt', 'credits.stxt'].filter(f => existsSync(`${data}/${f}`));
writeFileSync(`${out}/LICENSES.txt`, licenses.map(f => `==> ${f} <==\n\n${readFileSync(`${data}/${f}`, 'utf8')}\n`).join('\n'));
for (const f of readdirSync(`${data}/fonts`)) if (/licen[cs]e/i.test(f)) copyFileSync(`${data}/fonts/${f}`, `${out}/${f}`);
console.log(`built apps/supertux/data/ (${packed.files} files, ${Math.round(packed.bytes / 1e6)} MB in ${packed.blocks} blocks, ${Math.round(packed.stored / 1e6)} MB stored, ${Math.round(packed.boot / 1e6)} MB read at start, ${Math.round(packed.next / 1e6)} MB next)`);
