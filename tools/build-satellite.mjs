// Bundles the parts of satellite.js (MIT, https://github.com/shashwatak/satellite-js)
// that the Satellite Tracker uses into one browser ES module. The package's
// WebAssembly build is left out; the plain JS SGP4 is fast enough here.
//
//   node tools/build-satellite.mjs
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../node_modules/satellite.js/package.json', import.meta.url)));
const license = readFileSync(new URL('../node_modules/satellite.js/LICENSE.md', import.meta.url), 'utf8');

await build({
  stdin: {
    contents: `
      export { json2satrec } from './node_modules/satellite.js/dist/io.js';
      export { propagate, gstime } from './node_modules/satellite.js/dist/propagation.js';
      export { eciToEcf, ecfToLookAngles, eciToGeodetic } from './node_modules/satellite.js/dist/transforms.js';
    `,
    resolveDir: new URL('..', import.meta.url).pathname,
  },
  bundle: true,
  format: 'esm',
  minify: true,
  legalComments: 'none',
  banner: { js: `/* satellite.js ${pkg.version}\n${license.trim()}\n*/` },
  outfile: new URL('../apps/satellites/satellite.js', import.meta.url).pathname,
});
console.log('wrote apps/satellites/satellite.js');
