// Builds apps/critter/engine: Critical Mass (Critter), Frank Becker's space
// shooter.
//
// - Critter (GPL-2.0-or-later, https://github.com/mooflu/critter) at a pinned
//   commit, with tools/critter/critter-web.patch (the page mounts the saves
//   and starts the game; no pointer lock of its own; no Quit or window
//   settings in the menu; web_* functions so the page can pass on touch and
//   controllers; a longer sound buffer), compiled with Emscripten in Docker
//   (tools/critter/Dockerfile: emsdk 4.0.10) to engine/critter.{js,wasm,data}.
// - glm 0.9.9.8 and PhysicsFS 3.2.0, at the commits upstream's
//   scripts/build-emscripten.sh names by tag.
// - The soundtrack that ships upstream has no license, so it stays out; in
//   its place is "Overdrive" by Centurion_of_war (CC0, OpenGameArt.org),
//   checked against its SHA-256.
// - The source of what was built goes next to the engine as a tarball, with
//   the patch and the licenses, as the GPL asks.
//
//   node tools/build-critter.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.critter-build/`;
const app = `${root}apps/critter/`;
const IMAGE = 'frunk-critter-emsdk';
const COMMIT = 'c4c0b4df13079e8ec64ed5e5ac767b0cdd5bf39c';   // 2024-09-25
const GLM = 'bf71a834948186f4097caa076cd2663c69a10e1e';      // 0.9.9.8
const PHYSFS = 'eb3383b532c5f74bfeb42ec306ba2cf80eed988c';   // release-3.2.0
const MUSIC_URL = 'https://opengameart.org/sites/default/files/overdrive_0.ogg';
const MUSIC_SHA256 = 'cd68563d71a41913cfbb41a0928246b9dd4de4756d751b53d9657af663485ccc';

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const jobs = String(Math.max(2, cpus().length - 1));

function fetchCommit(url, commit, dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  run('git', ['init', '--quiet', dir]);
  run('git', ['-C', dir, 'fetch', '--quiet', '--depth', '1', url, commit]);
  run('git', ['-C', dir, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);
  rmSync(`${dir}/.git`, { recursive: true, force: true });
}

mkdirSync(`${work}dl`, { recursive: true });
const music = `${work}dl/overdrive.ogg`;
if (!existsSync(music)) run('curl', ['-fL', '--retry', '3', '-A', 'Mozilla/5.0', '-o', music, MUSIC_URL]);
const sha = createHash('sha256').update(readFileSync(music)).digest('hex');
if (sha !== MUSIC_SHA256) throw new Error(`${music}: checksum mismatch ${sha}`);

// ---------- source ----------

const src = `${work}src/critter/`;
rmSync(`${work}src`, { recursive: true, force: true });
fetchCommit('https://github.com/mooflu/critter.git', COMMIT, src);
fetchCommit('https://github.com/g-truc/glm.git', GLM, `${src}3rdparty/glm`);
fetchCommit('https://github.com/icculus/physfs.git', PHYSFS, `${src}3rdparty/physfs`);
// (patch, not git apply: inside this repo's tree, git apply skips the files)
run('patch', ['-p1', '-s', '-i', `${root}tools/critter/critter-web.patch`], { cwd: src });

rmSync(`${src}data/music/lg-criti.ogg`);
rmSync(`${src}data/music/Readme.txt`);
copyFileSync(music, `${src}data/music/overdrive.ogg`);
// the game's own data goes in one zip, as the game expects to find it
rmSync(`${src}resource.dat`, { force: true });

// ---------- engine ----------

run('docker', ['build', '--quiet', '-t', IMAGE, `${root}tools/critter`], { stdio: ['ignore', 'ignore', 'inherit'] });
const inDocker = (...args) => run('docker', ['run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`, '-e', 'HOME=/tmp', '-v', `${src}:/w`, '-w', '/w', IMAGE, ...args]);
inDocker('sh', '-c', 'cd data && zip -X -q -9 -r ../resource.dat .');
inDocker('sh', '-c', `set -e
  cd 3rdparty/physfs
  emcmake cmake -DCMAKE_INSTALL_PREFIX:PATH=/w/oem -DCMAKE_PREFIX_PATH:PATH=/w/oem -DPHYSFS_BUILD_SHARED=False -DPHYSFS_BUILD_TEST=False -DPHYSFS_BUILD_DOCS=False -DCMAKE_BUILD_TYPE=MinSizeRel \
    -DPHYSFS_ARCHIVE_7Z:BOOL=ON -DPHYSFS_ARCHIVE_ZIP=ON -DPHYSFS_ARCHIVE_GRP=OFF -DPHYSFS_ARCHIVE_WAD=OFF -DPHYSFS_ARCHIVE_HOG=OFF -DPHYSFS_ARCHIVE_MVL=OFF -DPHYSFS_ARCHIVE_QPAK=OFF -DPHYSFS_ARCHIVE_SLB=OFF -DPHYSFS_ARCHIVE_ISO9660=OFF -DPHYSFS_ARCHIVE_VDF=OFF .
  cmake --build . --parallel ${jobs}
  cmake --install .
  mkdir -p /w/build && cd /w/build
  emcmake cmake -DVERSION=${COMMIT.slice(0, 7)} -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX:PATH=/w/oem -DCMAKE_PREFIX_PATH:PATH=/w/oem ..
  cmake --build . --config Release --parallel ${jobs}
`);

rmSync(`${app}engine`, { recursive: true, force: true });
mkdirSync(`${app}engine`, { recursive: true });
for (const ext of ['js', 'wasm', 'data']) copyFileSync(`${src}build/game/critter.${ext}`, `${app}engine/critter.${ext}`);

// the source that goes with it: the tree as compiled, without the build's outputs
const short = COMMIT.slice(0, 12);
run('tar', ['-czf', `${app}engine/critter-${short}-web-src.tar.gz`, '--exclude=build', '--exclude=oem', '--exclude=resource.dat',
  '--exclude=critter/3rdparty/physfs/CMakeFiles', '--exclude=critter/3rdparty/physfs/*.a', '--exclude=critter/3rdparty/physfs/CMakeCache.txt',
  '-C', `${work}src`, 'critter']);
copyFileSync(`${src}COPYING`, `${app}engine/COPYING`);
copyFileSync(`${root}tools/critter/critter-web.patch`, `${app}engine/critter-web.patch`);
copyFileSync(`${src}mooflu.common/vmmlib/LICENSE`, `${app}engine/LICENSE.vmmlib`);
copyFileSync(`${src}3rdparty/glm/copying.txt`, `${app}engine/LICENSE.glm`);
copyFileSync(`${src}3rdparty/physfs/LICENSE.txt`, `${app}engine/LICENSE.physfs`);
for (const f of readdirSync(`${app}engine`)) console.log(`${f}  ${(statSync(`${app}engine/${f}`).size / 1048576).toFixed(1)} MB`);
console.log('built apps/critter/engine/critter.{js,wasm,data}');
