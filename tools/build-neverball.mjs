// Builds apps/neverball/engine: Neverball, the tilt-the-floor marble game.
//
// - Neverball (GPL-2.0-or-later, https://github.com/Neverball/neverball) at the
//   same pinned commit as Neverputt, checked against its SHA-256, with
//   tools/neverball/neverball-web.patch (no package downloads from
//   play.neverball.org, the standard controller layout, no Exit or
//   switch-to-Neverputt buttons), compiled with Emscripten in Docker
//   (tools/neverputt/Dockerfile: emsdk 4.0.10, gl4es) to
//   engine/neverball.{js,wasm,data}.
// - All eight level sets, compiled from their .map sources by the project's own
//   mapc, with the shared textures, sounds and music and the balls, in one zip
//   preloaded at /data. Neverputt's courses (its own app), the Octocat ball
//   (GitHub's permission to the project, not to us) and the Chinese and Korean
//   font stay out.
// - The source of what was built goes next to the engine as a tarball, with
//   the patch and the license, as the GPL asks.
//
//   node tools/build-neverball.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.neverball-build/`;
const app = `${root}apps/neverball/`;
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
run('patch', ['-p1', '-s', '-i', `${root}tools/neverball/neverball-web.patch`], { cwd: nb });

// Only what Neverball plays: Neverputt's courses, the GitHub-permission Octocat
// ball and the big CJK font go now, so they reach neither the build nor the
// source tarball. (obj/ stays for mapc: the maps' models get compiled in.)
const sets = readFileSync(`${nb}data/sets.txt`, 'utf8').split(/\s+/).filter(Boolean);
const keepDirs = new Set(['back', 'ball', 'bgm', 'geom', 'gui', 'icon', 'item', 'lang', 'map-back', 'obj', 'png', 'snd', 'textures', 'ttf']);
const setSols = [];
const setShots = new Set();
for (const set of sets) {
  const lines = readFileSync(`${nb}data/${set}`, 'utf8').split(/\r?\n/);
  setShots.add(lines[3].trim());
  keepDirs.add(lines[3].split('/')[0]);
  for (const line of lines.slice(5)) {
    if (!line.trim()) continue;
    setSols.push(line.trim());
    keepDirs.add(line.split('/')[0]);
  }
}
for (const name of readdirSync(`${nb}data`)) {
  const path = `${nb}data/${name}`;
  if (statSync(path).isDirectory() ? !keepDirs.has(name) : /^holes-/.test(name)) rmSync(path, { recursive: true, force: true });
}
rmSync(`${nb}data/ball/octocat`, { recursive: true, force: true });
rmSync(`${nb}doc/legal/license-octocat.md`, { force: true });
rmSync(`${nb}data/ttf/wqy-microhei.ttc`, { force: true });
// (and the languages that would ask for that font; the build has no translations anyway)
for (const name of readdirSync(`${nb}data/lang`)) if (readFileSync(`${nb}data/lang/${name}`, 'utf8').includes('wqy-microhei')) rmSync(`${nb}data/lang/${name}`);
writeFileSync(`${nb}data/courses.txt`, '');
for (const name of ['prompts', 'Radiant', 'TrenchBroom', 'dist', 'contrib']) rmSync(`${nb}${name}`, { recursive: true, force: true });

// ---------- engine ----------

run('docker', ['build', '--quiet', '-t', IMAGE, `${root}tools/neverputt`], { stdio: ['ignore', 'ignore', 'inherit'] });
const inDocker = (...args) => run('docker', ['run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`, '-e', 'HOME=/tmp', '-e', 'GL4ES_DIR=/opt/gl4es', '-v', `${nb}:/w`, '-w', '/w', IMAGE, ...args]);
const jobs = String(Math.max(2, (await import('node:os')).cpus().length - 1));

// The levels: .map to .sol, by the project's own compiler (itself compiled
// to run under node, so no native libraries are needed)
inDocker('make', `-j${jobs}`, '-f', 'emscripten/mapc.mk', 'BUILD=release', 'sols');

// The data: one zip, kept compressed in memory. Zip level 9 for the maps;
// the ogg, png and jpg files don't shrink further.
const ASSETS = ['back', 'ball', 'bgm', 'courses.txt', 'geom', 'gui', 'icon', 'item', 'lang', 'lights.txt', 'map-back', 'png', 'sets.txt', 'snd', 'textures', 'ttf', ...sets, ...setShots, ...setSols];
for (const name of readdirSync(`${nb}data`)) if (/^shot-/.test(name) && !ASSETS.includes(name)) ASSETS.push(name);
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
copyFileSync(`${root}tools/neverball/neverball-web.patch`, `${app}engine/neverball-web.patch`);
for (const f of readdirSync(`${app}engine`)) console.log(`${f}  ${(statSync(`${app}engine/${f}`).size / 1048576).toFixed(1)} MB`);
console.log('built apps/neverball/engine/neverball.{js,wasm,data}');
