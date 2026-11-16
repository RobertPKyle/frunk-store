// Builds apps/billiards/game/: Billiards by tailuge (GPL-3.0,
// https://github.com/tailuge/billiards) at a fixed commit, with
// tools/billiards/billiards-web.patch. The patch takes out everything online
// (the lobby and its presence pings, usage pings, match-result uploads, the
// link shortener, high-score links), sends "Back to Lobby" to this app's own
// menu, trims the page to the game and its controls help, loads the Exo font
// from this site, plays this site's own sounds and drops the three-cushion
// cloth photo (no stated source).
//
// Output in apps/billiards/game/:
// - index.html: the game page (the page itself is the patched dist/index.html)
// - billiards.js: src/index.ts and its libraries in one file, by esbuild
//   (upstream builds with webpack; the libraries are the versions its
//   yarn.lock pins, from tools/billiards/deps/package-lock.json)
// - css/, models/: upstream's styles and table models (the author's own)
// - sounds/: made by tools/billiards/sounds.mjs
// - fonts/: Exo by Natanael Gama (SIL Open Font License), from Google Fonts
// - LICENSE: upstream's GPL-3.0 text; THIRD-PARTY-LICENSES.txt: the libraries'
// - billiards-<commit>-web-src.tar.gz and billiards-web.patch: the source
//   the build came from (the GPL asks for it to be offered with the game)
//
//   node tools/build-billiards.mjs
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { writeSounds } from './billiards/sounds.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.billiards-build/`;
const out = `${root}apps/billiards/game/`;

const COMMIT = '8aeb1dee14e7dccf71b47cdf6f68fc33e5f6459b';   // 2026-11-16
const PATCH = `${root}tools/billiards/billiards-web.patch`;
const FONTS = {
  'exo-200.ttf': 'https://fonts.gstatic.com/s/exo/v25/4UaZrEtFpBI4f1ZSIK9d4LjJ4tM3CwM.ttf',
  'exo-600.ttf': 'https://fonts.gstatic.com/s/exo/v25/4UaZrEtFpBI4f1ZSIK9d4LjJ4o0wCwM.ttf',
  'OFL.txt': 'https://raw.githubusercontent.com/google/fonts/main/ofl/exo/OFL.txt',
};
const CSS = ['fonts', 'index', 'aiminputs', 'powerinput', 'notification', 'tray', 'chat', 'lobby', 'menu', 'wood'];
const MODELS = ['p8', 'snooker', 'threecushion'];

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

// upstream at the pinned commit, patched
const src = `${work}billiards/`;
rmSync(src, { recursive: true, force: true });
mkdirSync(src, { recursive: true });
run('git', ['init', '--quiet', src]);
run('git', ['-C', src, 'fetch', '--quiet', '--depth', '1', 'https://github.com/tailuge/billiards.git', COMMIT]);
run('git', ['-C', src, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);
run('git', ['-C', src, 'apply', PATCH]);
writeFileSync(`${src}src/utils/version.ts`, `export const VERSION = '${COMMIT.slice(0, 7)}-frunk'\n`);

// the libraries, beside the source so esbuild finds them; no install scripts
cpSync(`${root}tools/billiards/deps/package.json`, `${work}package.json`);
cpSync(`${root}tools/billiards/deps/package-lock.json`, `${work}package-lock.json`);
run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: work });

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
await build({
  entryPoints: [`${src}src/index.ts`],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  outfile: `${out}billiards.js`,
  legalComments: 'none',
  logLevel: 'warning',
});

const page = readFileSync(`${src}dist/index.html`, 'utf8');
if (/gstatic|onrender|scoreboard-tailuge/.test(page)) throw new Error('the game page still loads from other sites');
writeFileSync(`${out}index.html`, page);
const js = readFileSync(`${out}billiards.js`, 'utf8');

mkdirSync(`${out}css`);
for (const name of CSS) cpSync(`${src}dist/css/${name}.css`, `${out}css/${name}.css`);
mkdirSync(`${out}models`);
for (const name of MODELS) {
  for (const ext of ['gltf', 'bin']) cpSync(`${src}dist/models/${name}.min.${ext}`, `${out}models/${name}.min.${ext}`);
}
writeSounds(`${out}sounds/`);
mkdirSync(`${out}fonts`);
for (const [name, url] of Object.entries(FONTS)) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  writeFileSync(`${out}fonts/${name}`, Buffer.from(await res.arrayBuffer()));
}
cpSync(`${src}LICENSE`, `${out}LICENSE`);
// the bundled libraries' own license texts (the bundle drops its comments)
const LIBS = ['three', 'interactjs', 'fflate', 'jsoncrush', '@tailuge/messaging', 'lit', 'lit-html', 'lit-element', '@lit/reactive-element', '@lit-labs/ssr-dom-shim'];
writeFileSync(`${out}THIRD-PARTY-LICENSES.txt`, LIBS.map(name => {
  const dir = `${work}node_modules/${name}/`;
  const { version, license } = JSON.parse(readFileSync(`${dir}package.json`, 'utf8'));
  const file = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license'].find(f => existsSync(dir + f));
  return `==== ${name} ${version} (${license})\n\n${file ? readFileSync(dir + file, 'utf8').trim() : `${license}; no license file in the package`}\n`;
}).join('\n'));
if (!existsSync(`${out}models/p8.min.bin`)) throw new Error('the table models are missing');

// the source that goes with it (GPL): the tree as patched, with the table
// models' Blender files, and the patch on its own
const tree = ['src', 'dist/index.html', 'dist/css', 'package.json', 'yarn.lock', 'tsconfig.json', 'webpack.config.js', 'LICENSE', 'README.md',
  ...MODELS.flatMap(name => ['blend', 'gltf', 'bin', 'min.gltf', 'min.bin'].map(ext => `dist/models/${name}.${ext}`))];
run('tar', ['-czf', `${out}billiards-${COMMIT.slice(0, 12)}-web-src.tar.gz`, '--transform', 's,^,billiards/,', '-C', src, ...tree]);
cpSync(PATCH, `${out}billiards-web.patch`);
console.log(`billiards: ${(js.length / 1024).toFixed(0)} KB of script -> ${out}`);
