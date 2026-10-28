// Builds apps/city's engine: the city simulation from micropolisJS
// (GPL-3.0 with additional terms, https://github.com/graememcc/micropolisJS),
// Graeme McCutcheon's JavaScript port of Micropolis, at a fixed commit with
// tools/city/micropolis-web.patch. Only the simulation, the map, the tools and
// the map generator are bundled; the page draws its own map and controls, so
// micropolisJS's jQuery front end (windows, canvas, input) is left out.
//
// Output in apps/city/engine/:
// - engine.js: one ES module, not minified, with the licence header
// - tiles.png, sprites.png: the game's graphics
// - LICENSE, COPYING, MicropolisPublicNameLicense.md: upstream's terms
// - micropolisJS-src.tar.gz: the source at that commit, with the patch in it
//
//   node tools/build-city.mjs
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.city-build/`;
const out = `${root}apps/city/engine/`;

const COMMIT = 'f13a1624d111d235e804bd80f48ba7c9f66a8e0f';   // 2025-07-13
const PATCH = `${root}tools/city/micropolis-web.patch`;

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

const src = `${work}micropolisJS/`;
rmSync(src, { recursive: true, force: true });
mkdirSync(src, { recursive: true });
run('git', ['init', '--quiet', src]);
run('git', ['-C', src, 'fetch', '--quiet', '--depth', '1', 'https://github.com/graememcc/micropolisJS.git', COMMIT]);
run('git', ['-C', src, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// The untouched source first, with the patch alongside, for the tarball
run('git', ['-C', src, 'archive', '--format=tar', '--prefix=micropolisJS/', '-o', `${work}src.tar`, 'HEAD']);
copyFileSync(PATCH, `${work}micropolis-web.patch`);
run('tar', ['-rf', `${work}src.tar`, '-C', work, '--transform', 's,^,micropolisJS/,', 'micropolis-web.patch']);
run('gzip', ['-9nf', `${work}src.tar`]);
copyFileSync(`${work}src.tar.gz`, `${out}micropolisJS-src.tar.gz`);

run('git', ['-C', src, 'apply', PATCH]);

const header = readFileSync(`${src}LICENSE`, 'utf8').trim();
await build({
  stdin: {
    contents: `
      export { AnimationManager } from './src/animationManager.js';
      export { BaseTool } from './src/baseTool.js';
      export { Evaluation } from './src/evaluation.js';
      export { GameMap } from './src/gameMap.js';
      export { GameTools } from './src/gameTools.js';
      export { MapGenerator } from './src/mapGenerator.js';
      export { Simulation } from './src/simulation.js';
      export { Text } from './src/text.js';
      export * as Messages from './src/messages.ts';
      export { LIGHTNINGBOLT, TILE_INVALID } from './src/tileValues.ts';
    `,
    resolveDir: src,
  },
  bundle: true,
  format: 'esm',
  target: 'es2020',
  legalComments: 'none',
  banner: { js: `/* City simulation from micropolisJS, commit ${COMMIT},\n   changed by frunk.store (micropolis-web.patch in micropolisJS-src.tar.gz).\n\n${header}\n*/` },
  outfile: `${out}engine.js`,
});

for (const f of ['images/tiles.png', 'images/sprites.png', 'LICENSE', 'COPYING', 'MicropolisPublicNameLicense.md'])
  copyFileSync(`${src}${f}`, `${out}${f.split('/').pop()}`);
console.log('built apps/city/engine/');
