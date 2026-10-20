// Builds apps/openttd's engine and its free base sets:
//
// - OpenTTD 15.3 (GPL-2.0, https://github.com/OpenTTD/OpenTTD) with
//   tools/openttd/openttd-web.patch, compiled with Emscripten by upstream's
//   own Docker image (os/emscripten/Dockerfile: emsdk 3.1.57 plus liblzma)
//   to apps/openttd/engine/openttd.{js,wasm,data}. The patched source the
//   build came from goes next to it as openttd-15.3-web-src.tar.gz, as the
//   GPL asks.
// - The base sets from cdn.openttd.org, checked against their SHA-256:
//   OpenGFX 8.0 (GPL-2.0), OpenSFX 1.0.3 (CC BY-SA 3.0) and OpenMSX 0.4.2
//   (GPL-2.0), each as its tar gzipped to apps/openttd/data/ (the page
//   unpacks them), with their readme and license files, and their source:
//   OpenSFX's and OpenMSX's source releases, and OpenGFX's repository at
//   its tag.
//
//   node tools/build-openttd.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { createGzip, constants } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.openttd-build/`;
const app = `${root}apps/openttd/`;

const OPENTTD = '15.3';
const OPENTTD_COMMIT = '14ec60f248547d4d062a1160f0fc26d742319888';
const IMAGE = 'frunk-openttd-emsdk';
const CDN = 'https://cdn.openttd.org';
const SETS = [
  { name: 'opengfx-8.0', zip: 'opengfx-releases/8.0/opengfx-8.0-all.zip', sha256: '43a0c1dabf39cb865394f3a6cc36d4da5c10ecfaaf55652043104806810903be',
    git: ['https://github.com/OpenTTD/OpenGFX.git', '8.0', 'e68bd9b7cb60305aa98c687b6836e0e0b08e2847'] },
  { name: 'opensfx-1.0.3', zip: 'opensfx-releases/1.0.3/opensfx-1.0.3-all.zip', sha256: 'e0a218b7dd9438e701503b0f84c25a97c1c11b7c2f025323fb19d6db16ef3759',
    source: ['opensfx-releases/1.0.3/opensfx-1.0.3-source.tar.xz', '43cacb3ca2d86e5729d19c7fcf2533e1bb9c9a32a39f515cf6cbe665ec32635c'] },
  { name: 'openmsx-0.4.2', zip: 'openmsx-releases/0.4.2/openmsx-0.4.2-all.zip', sha256: '5a4277a2e62d87f2952ea5020dc20fb2f6ffafdccf9913fbf35ad45ee30ec762',
    source: ['openmsx-releases/0.4.2/openmsx-0.4.2-source.tar.xz', '0f5196f9045c9123ed9207930a73871811654e46e7de2d079be8f8ee501ba840'] },
];

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');

async function fetchChecked(path, hash) {
  const file = `${work}${path.replace(/^.*\//, '')}`;
  if (!existsSync(file) || sha256(file) !== hash) {
    const res = await fetch(`${CDN}/${path}`);
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  if (sha256(file) !== hash) throw new Error(`${path}: checksum mismatch`);
  return file;
}

mkdirSync(work, { recursive: true });
mkdirSync(`${app}engine`, { recursive: true });
mkdirSync(`${app}data`, { recursive: true });

// ---------- engine ----------

const src = `${work}OpenTTD/`;
rmSync(src, { recursive: true, force: true });
run('git', ['-c', 'advice.detachedHead=false', 'clone', '--quiet', '--depth', '1', '--branch', OPENTTD, 'https://github.com/OpenTTD/OpenTTD.git', src]);
const head = execFileSync('git', ['-C', src, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (head !== OPENTTD_COMMIT) throw new Error(`OpenTTD ${OPENTTD} is ${head}, expected ${OPENTTD_COMMIT}`);
run('git', ['-C', src, 'apply', `${root}tools/openttd/openttd-web.patch`]);

// Upstream's build: its image, the host tools (strgen and friends) first,
// then the game
run('docker', ['build', '-q', '-t', IMAGE, `${src}os/emscripten`]);
const docker = (dir, ...cmd) => run('docker', [
  'run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`,
  '-v', `${src}:${src}`, '-w', `${src}${dir}`, IMAGE, ...cmd,
]);
const jobs = String(Math.max(2, Math.min(16, Number(execFileSync('nproc', { encoding: 'utf8' }).trim()))));
mkdirSync(`${src}build-host`, { recursive: true });
mkdirSync(`${src}build`, { recursive: true });
docker('build-host', 'cmake', '..', '-DOPTION_TOOLS_ONLY=ON');
docker('build-host', 'make', `-j${jobs}`, 'tools');
docker('build', 'emcmake', 'cmake', '..', '-DHOST_BINARY_DIR=../build-host', '-DCMAKE_BUILD_TYPE=Release', '-DOPTION_USE_ASSERTS=OFF');
docker('build', 'emmake', 'make', `-j${jobs}`, 'openttd');
for (const ext of ['js', 'wasm', 'data']) copyFileSync(`${src}build/openttd.${ext}`, `${app}engine/openttd.${ext}`);
rmSync(`${src}build`, { recursive: true, force: true });
rmSync(`${src}build-host`, { recursive: true, force: true });
run('tar', ['-czf', `${app}engine/openttd-${OPENTTD}-web-src.tar.gz`, '--exclude=.git', '-C', work, 'OpenTTD']);
copyFileSync(`${src}COPYING.md`, `${app}engine/COPYING.md`);
copyFileSync(`${root}tools/openttd/openttd-web.patch`, `${app}engine/openttd-web.patch`);
console.log('built apps/openttd/engine/openttd.{js,wasm,data}');

// ---------- base sets ----------

for (const set of SETS) {
  const zip = await fetchChecked(set.zip, set.sha256);
  const dir = `${work}${set.name}/`;
  rmSync(dir, { recursive: true, force: true });
  run('unzip', ['-q', zip, '-d', dir]);
  const tar = `${dir}${set.name}.tar`;
  await pipeline(createReadStream(tar), createGzip({ level: constants.Z_BEST_COMPRESSION }), createWriteStream(`${app}data/${set.name}.tar.gz`));
  // its readme and license, where people can read them
  mkdirSync(`${app}data/${set.name}`, { recursive: true });
  run('tar', ['-xf', tar, '-C', `${app}data`, `${set.name}/readme.txt`, `${set.name}/license.txt`, `${set.name}/changelog.txt`]);
  if (set.source) {
    copyFileSync(await fetchChecked(...set.source), `${app}data/${set.source[0].replace(/^.*\//, '')}`);
  } else {
    const [url, tag, commit] = set.git;
    const repo = `${work}${set.name}-src/`;
    rmSync(repo, { recursive: true, force: true });
    run('git', ['-c', 'advice.detachedHead=false', 'clone', '--quiet', '--depth', '1', '--branch', tag, url, repo]);
    const got = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    if (got !== commit) throw new Error(`${set.name} is ${got}, expected ${commit}`);
    run('tar', ['-czf', `${app}data/${set.name}-source.tar.gz`, '--exclude=.git', '-C', work, `${set.name}-src`]);
  }
  console.log(`${set.name}: tar ${statSync(tar).size} bytes, gzipped ${statSync(`${app}data/${set.name}.tar.gz`).size} (SETS in apps/openttd/openttd.js)`);
}
