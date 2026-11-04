// Builds apps/neverputt/engine: Neverputt, the minigolf game from the
// Neverball project.
//
// - Neverball (GPL-2.0-or-later, https://github.com/Neverball/neverball) at a
//   pinned commit, checked against its SHA-256, with
//   tools/neverputt/neverputt-web.patch (Neverputt's main instead of
//   Neverball's, no package downloads from play.neverball.org, the standard
//   controller layout, no Exit or switch-game buttons), compiled with
//   Emscripten in Docker (tools/neverputt/Dockerfile: emsdk 4.0.10, gl4es) to
//   engine/neverball.{js,wasm,data}.
// - All nine courses, compiled from their .map sources by the project's own
//   mapc, with the shared textures, sounds and music, in one zip preloaded
//   at /data. Neverball's own level sets, extra balls and the Chinese and
//   Korean font stay out, and one course picture is resized to a power of two.
// - The source of what was built goes next to the engine as a tarball, with
//   the patch and the license, as the GPL asks.
//
//   node tools/build-neverputt.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.neverputt-build/`;
const app = `${root}apps/neverputt/`;
const IMAGE = 'frunk-neverputt-emsdk';
const COMMIT = '2821e1e47de84cc9a743277dcd4152be3766a374';
const URL_ = `https://github.com/Neverball/neverball/archive/${COMMIT}.tar.gz`;
const SHA256 = process.env.NEVERBALL_SHA256 || '';

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const sha256 = async file => { const h = createHash('sha256'); await pipeline(createReadStream(file), h); return h.digest('hex'); };

mkdirSync(`${work}dl`, { recursive: true });
const tarball = `${work}dl/neverball-${COMMIT.slice(0, 12)}.tar.gz`;
if (!existsSync(tarball)) {
  console.log(`downloading ${URL_}`);
  run('curl', ['-fL', '--retry', '3', '-o', tarball, URL_]);
}
const got = await sha256(tarball);
if (SHA256 && got !== SHA256) throw new Error(`${tarball}: checksum mismatch ${got}`);
console.log(`neverball tarball sha256 ${got}`);

// ---------- source ----------

const src = `${work}src/`;
rmSync(src, { recursive: true, force: true });
mkdirSync(src, { recursive: true });
run('tar', ['-xzf', tarball, '-C', src]);
run('mv', [`${src}neverball-${COMMIT}`, `${src}neverball`]);
const nb = `${src}neverball/`;
// (patch, not git apply: inside this repo's tree, git apply skips the files)
run('patch', ['-p1', '-s', '-i', `${root}tools/neverputt/neverputt-web.patch`], { cwd: nb });

// Only what Neverputt plays: Neverball's level sets, the GitHub-permission
// Octocat ball (and the other extra balls) and the big CJK font go now, so
// they reach neither the build nor the source tarball.
const courses = readFileSync(`${nb}data/courses.txt`, 'utf8').split(/\s+/).filter(Boolean);
const keepDirs = new Set(['back', 'bgm', 'geom', 'gui', 'icon', 'item', 'lang', 'map-back', 'png', 'snd', 'textures', 'ttf', 'ball']);
for (const course of courses) {
  const lines = readFileSync(`${nb}data/${course}`, 'utf8').split(/\r?\n/);
  keepDirs.add(lines[0].split('/')[0]);
  for (const line of lines.slice(2)) if (line.trim()) keepDirs.add(line.split('/')[0]);
}
for (const name of readdirSync(`${nb}data`)) {
  const path = `${nb}data/${name}`;
  if (statSync(path).isDirectory() ? !keepDirs.has(name) : /^set-/.test(name)) rmSync(path, { recursive: true, force: true });
}
for (const name of readdirSync(`${nb}data/ball`)) if (name !== 'basic-ball') rmSync(`${nb}data/ball/${name}`, { recursive: true, force: true });
rmSync(`${nb}data/ttf/wqy-microhei.ttc`, { force: true });
// (and the languages that would ask for that font; the build has no translations anyway)
for (const name of readdirSync(`${nb}data/lang`)) if (readFileSync(`${nb}data/lang/${name}`, 'utf8').includes('wqy-microhei')) rmSync(`${nb}data/lang/${name}`);
writeFileSync(`${nb}data/sets.txt`, '');
for (const name of ['prompts', 'Radiant', 'TrenchBroom', 'dist', 'contrib']) rmSync(`${nb}${name}`, { recursive: true, force: true });

// ---------- engine ----------

run('docker', ['build', '--quiet', '-t', IMAGE, `${root}tools/neverputt`], { stdio: ['ignore', 'ignore', 'inherit'] });
const inDocker = (...args) => run('docker', ['run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`, '-e', 'HOME=/tmp', '-e', 'GL4ES_DIR=/opt/gl4es', '-v', `${nb}:/w`, '-w', '/w', IMAGE, ...args]);
const jobs = String(Math.max(2, (await import('node:os')).cpus().length - 1));

// The courses: .map to .sol, by the project's own compiler (itself compiled
// to run under node, so no native libraries are needed)
inDocker('make', `-j${jobs}`, '-f', 'emscripten/mapc.mk', 'BUILD=release', 'sols');

// The data: one zip, kept compressed in memory. Zip level 9 for the maps;
// the ogg, png and jpg files don't shrink further.
const ASSETS = ['back', 'ball/basic-ball', 'bgm', 'courses.txt', 'geom', 'gui', 'icon', 'item', 'lang', 'lights.txt', 'map-back', 'png', 'sets.txt', 'snd', 'textures', 'ttf'];
for (const course of courses) {
  const lines = readFileSync(`${nb}data/${course}`, 'utf8').split(/\r?\n/);
  if (!ASSETS.includes(course)) ASSETS.push(course);
  if (!ASSETS.includes(lines[0].trim())) ASSETS.push(lines[0].trim());
  for (const line of lines.slice(2)) {
    const sol = line.trim().split(/\s+/)[0];
    if (sol && !ASSETS.includes(sol)) ASSETS.push(sol);
  }
}
// One course picture isn't a power of two in size, which the WebGL 1 the game
// runs on can't mipmap: it would show as a black tile on the course screen
inDocker('convert', 'data/shot-putt/iCourse.png', '-resize', '256x256', 'data/shot-putt/iCourse.png');
rmSync(`${nb}base-neverball.zip`, { force: true });
run('docker', ['run', '--rm', '-i', '-u', `${process.getuid()}:${process.getgid()}`, '-v', `${nb}:/w`, '-w', '/w/data', IMAGE,
  'zip', '-X', '-q', '-9', '-r', '../base-neverball.zip', '-@', '-x', '*.map', '*.xcf', '*.wings', 'screenshot.png'],
  { input: ASSETS.join('\n') + '\n', stdio: ['pipe', 'inherit', 'inherit'] });

inDocker('make', `-j${jobs}`, '-f', 'emscripten/ball.mk', 'BUILD=release', 'js/neverball.js');

rmSync(`${app}engine`, { recursive: true, force: true });
mkdirSync(`${app}engine`, { recursive: true });
for (const ext of ['js', 'wasm', 'data']) copyFileSync(`${nb}js/neverball.${ext}`, `${app}engine/neverball.${ext}`);

// the source that goes with it: what was left of the tree after the pruning
// above, without the build's outputs
const short = COMMIT.slice(0, 12);
run('tar', ['-czf', `${app}engine/neverball-${short}-web-src.tar.gz`,
  '--exclude=*.emscripten.o', '--exclude=*.sol', '--exclude=neverball/base-neverball.zip',
  '--exclude=neverball/js/neverball.js', '--exclude=neverball/js/neverball.wasm', '--exclude=neverball/js/neverball.data',
  '--exclude=neverball/js/mapc.js', '--exclude=neverball/js/mapc.wasm', '--exclude=neverball/js/anim.mp4',
  '-C', src, 'neverball']);
copyFileSync(`${nb}doc/legal/license-GPL-2.0.txt`, `${app}engine/COPYING`);
copyFileSync(`${root}tools/neverputt/neverputt-web.patch`, `${app}engine/neverputt-web.patch`);
for (const f of readdirSync(`${app}engine`)) console.log(`${f}  ${(statSync(`${app}engine/${f}`).size / 1048576).toFixed(1)} MB`);
console.log('built apps/neverputt/engine/neverball.{js,wasm,data}');
