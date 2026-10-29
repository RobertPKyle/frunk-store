// Builds apps/duke3d's engine and fetches the shareware episode:
//
// - EDuke32 (https://voidpoint.io/terminx/eduke32), Duke Nukem 3D's game
//   code under the GNU GPL 2 and Ken Silverman's Build engine under his
//   BUILD license (free distribution only), at a pinned commit, with
//   tools/duke3d/eduke32-web.patch, compiled with Emscripten in Docker (by
//   the patch's web/build.sh) to apps/duke3d/engine/eduke32.{js,wasm}. The
//   source the build came from goes next to it as
//   eduke32-<commit>-web-src.tar.gz, as the GPL asks, with both licenses.
// - Duke Nukem 3D Episode One, shareware v1.3D (3D Realms' 1998 repack,
//   3dduke13SW.zip), checked against its MD5 (the one SlackBuilds also
//   lists) and SHA-256, and kept exactly as released, as its LICENSE.TXT
//   asks: the page downloads the zip and takes DUKE3D.GRP and DUKE.RTS out
//   of it. LICENSE.TXT is copied next to it to be read.
//
//   node tools/build-duke3d.mjs [--engine]     (--engine: skip the shareware)
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.duke3d-build/`;
const app = `${root}apps/duke3d/`;

const EDUKE32_REPO = 'https://voidpoint.io/terminx/eduke32.git';
const EDUKE32_COMMIT = 'ec5824db81817866f70da326d3811bb0f52b3517';   // master, 2026-08-07
const SHAREWARE_URL = 'https://archive.org/download/3dduke13SW/Files%2Fv1.3d%20%281998%20Repack%29%2F3dduke13SW.zip';
const SHAREWARE_MD5 = '04e4ca70b8a2d59ed56c451c5c1d5d39';
const SHAREWARE_SHA256 = 'c67efd179022bc6d9bde54f404c707cbcbdc15423c20be72e277bc2bdddf3d0e';

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const engineOnly = process.argv.includes('--engine');

mkdirSync(work, { recursive: true });
mkdirSync(`${app}engine`, { recursive: true });

// ---------- engine ----------

const src = `${work}eduke32/`;
rmSync(src, { recursive: true, force: true });
mkdirSync(src);
run('git', ['-C', src, 'init', '--quiet']);
run('git', ['-C', src, 'fetch', '--quiet', '--depth', '1', EDUKE32_REPO, EDUKE32_COMMIT]);
run('git', ['-C', src, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);
const head = execFileSync('git', ['-C', src, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (head !== EDUKE32_COMMIT) throw new Error(`EDuke32 is ${head}, expected ${EDUKE32_COMMIT}`);
// patch, not git apply: inside this repository's tree git apply skips files
run('patch', ['-p1', '--quiet', '-d', src, '-i', `${root}tools/duke3d/eduke32-web.patch`]);

run('docker', [
  'run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`,
  '-v', `${src}:/src`, '-w', '/src',
  'emscripten/emsdk:4.0.10',
  'sh', 'web/build.sh',
]);
for (const ext of ['js', 'wasm']) copyFileSync(`${src}build-web/eduke32.${ext}`, `${app}engine/eduke32.${ext}`);
rmSync(`${src}build-web`, { recursive: true, force: true });
// The source of what's built: the engine, the game, their libraries, the
// build script and the licenses (Shadow Warrior, the editor's tools and the
// platform folders aren't part of it)
const tarball = `eduke32-${EDUKE32_COMMIT.slice(0, 7)}-web-src.tar.gz`;
run('tar', ['-czf', `${app}engine/${tarball}`, '--exclude=.git', '-C', work,
  ...['source/build', 'source/duke3d', 'source/audiolib', 'source/mact', 'source/imgui', 'source/glad', 'source/mimalloc', 'source/voidwrap', 'package/common', 'web'].map(p => `eduke32/${p}`)]);
copyFileSync(`${src}package/common/gpl-2.0.txt`, `${app}engine/gpl-2.0.txt`);
copyFileSync(`${src}package/common/buildlic.txt`, `${app}engine/BUILDLIC.TXT`);
copyFileSync(`${root}tools/duke3d/eduke32-web.patch`, `${app}engine/eduke32-web.patch`);
console.log(`built apps/duke3d/engine/eduke32.{js,wasm} and ${tarball}`);

// ---------- shareware ----------

if (!engineOnly) {
  const zip = `${work}3dduke13SW.zip`;
  if (!existsSync(zip)) {
    const res = await fetch(SHAREWARE_URL);
    if (!res.ok) throw new Error(`shareware download: ${res.status}`);
    writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  }
  const bytes = readFileSync(zip);
  const md5 = createHash('md5').update(bytes).digest('hex');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (md5 !== SHAREWARE_MD5 || sha256 !== SHAREWARE_SHA256) throw new Error('shareware zip checksum mismatch');
  mkdirSync(`${app}shareware`, { recursive: true });
  copyFileSync(zip, `${app}shareware/3dduke13SW.zip`);
  run('unzip', ['-o', '-q', '-j', zip, 'LICENSE.TXT', '-d', `${app}shareware`]);
  console.log('copied apps/duke3d/shareware/3dduke13SW.zip and LICENSE.TXT');
}
