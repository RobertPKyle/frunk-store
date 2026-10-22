// Builds the Nintendo 64 core: n64js (MIT, https://github.com/hulkholden/n64js)
// at a fixed commit, unmodified, bundled with tools/n64js/web.js (Retro
// Console's entry point, in place of n64js's src/n64.js) and
// tools/n64js/shims.js (stand-ins for the page globals n64js expects, as it
// runs in a worker) into apps/retro/n64/n64js.js. The bundler is Bun's, as
// n64js's own build uses (its shaders are imported as text), run through
// npx.
//
// n64js's options panel (src/debug/dbg_ui.js, built on lil-gui) is swapped
// for a stand-in that keeps each option's default, so lil-gui stays out.
//
//   node tools/build-n64js.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.n64js-build/`;
const out = `${root}apps/retro/n64/`;

const N64JS_COMMIT = '1eb54aa55fa55db831f7491a289ec55afc7a1688';   // 2026-10-21
const BUN = 'bun@1.3.14';                                           // n64js's packageManager

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

const src = `${work}n64js/`;
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
run('git', ['init', '--quiet', src]);
run('git', ['-C', src, 'fetch', '--quiet', '--depth', '1', 'https://github.com/hulkholden/n64js.git', N64JS_COMMIT]);
run('git', ['-C', src, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);
copyFileSync(`${root}tools/n64js/web.js`, `${src}web.js`);
copyFileSync(`${root}tools/n64js/shims.js`, `${src}shims.js`);

// The stand-in options panel: every control is accepted and ignored
writeFileSync(`${work}dbg_ui.js`, `
const panel = new Proxy({}, { get: (_, key) => key === 'then' ? undefined : () => panel });
export const dbgGUI = panel;
export function addOptionsFolder(name, bindOptions) { bindOptions(panel); }
export function show() {}
export function hide() {}
export function setVisible() {}
`);
writeFileSync(`${work}bundle.js`, `
const result = await Bun.build({
  entrypoints: [${JSON.stringify(`${src}web.js`)}],
  outdir: ${JSON.stringify(out)},
  naming: 'n64js.js',
  format: 'esm',
  target: 'browser',
  minify: true,
  define: { __BUILD_VERSION__: ${JSON.stringify(JSON.stringify(N64JS_COMMIT.slice(0, 7)))} },
  plugins: [{
    name: 'no-options-panel',
    setup(build) {
      build.onResolve({ filter: /dbg_ui\\.js$/ }, () => ({ path: ${JSON.stringify(`${work}dbg_ui.js`)} }));
    },
  }],
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
`);

mkdirSync(out, { recursive: true });
run('npx', ['--yes', BUN, `${work}bundle.js`], { cwd: src });

copyFileSync(`${src}LICENSE`, `${out}LICENSE`);
// The CRT shader n64js adapted from Mattias Gustavsson's crtemu, bundled
// with it (and off unless chosen), carries its own MIT notice
const crt = readFileSync(`${src}src/hle/graphics/shaders/crt_mattias.glsl`, 'utf8');
writeFileSync(`${out}THIRD-PARTY.txt`, [
  `n64js ${N64JS_COMMIT}, by Paul Holden, MIT license (LICENSE).`,
  'It includes a CRT shader adapted from crtemu by Mattias Gustavsson:',
  '',
  crt.slice(crt.indexOf('/*') + 2, crt.indexOf('*/')).trim(),
  '',
].join('\n'));
console.log('built apps/retro/n64/n64js.js');
