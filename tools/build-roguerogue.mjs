// Builds apps/roguerogue/game/: Rogue Rogue by KesieV (MIT,
// https://github.com/kesiev/roguerogue) at a fixed commit, with
// tools/roguerogue/roguerogue-web.patch. The patch removes the configuration
// screen and the CRT effect (js/crt.js is adapted from a project with no
// license, so it must never ship), takes touch buttons from the page, and
// keeps the music compressed until it is played.
//
// Output in apps/roguerogue/game/:
// - rogue.js: all of upstream's scripts in index.html's order, one file
// - sprites/, fonts/, audio/: the game's graphics, fonts, music and sound
// - MIT-LICENSE.txt: upstream's license
//
//   node tools/build-roguerogue.mjs
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.roguerogue-build/`;
const out = `${root}apps/roguerogue/game/`;

const COMMIT = '57288064b08bb7a3ca2d9c49f3909d885c7bef0b';   // 2023-07-17
const PATCH = `${root}tools/roguerogue/roguerogue-web.patch`;

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

const src = `${work}roguerogue/`;
rmSync(src, { recursive: true, force: true });
mkdirSync(src, { recursive: true });
run('git', ['init', '--quiet', src]);
run('git', ['-C', src, 'fetch', '--quiet', '--depth', '1', 'https://github.com/kesiev/roguerogue.git', COMMIT]);
run('git', ['-C', src, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);
run('git', ['-C', src, 'apply', PATCH]);

// The scripts in the order upstream's page loads them, minus the CRT effect
const html = readFileSync(`${src}index.html`, 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]).filter(s => s !== 'js/crt.js');
if (scripts.length < 40) throw new Error(`expected about 41 scripts, found ${scripts.length}`);
const bundle = scripts.map(s => `// ${s}\n${readFileSync(src + s, 'utf8')}`).join('\n;\n');
if (/initRenderer|crt\.js/.test(bundle.replace(/\/\/ js\/[^\n]*/g, ''))) throw new Error('the CRT effect is still in the bundle');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
writeFileSync(`${out}rogue.js`, bundle);
for (const dir of ['sprites', 'fonts', 'audio']) cpSync(src + dir, out + dir, { recursive: true });
cpSync(`${src}MIT-LICENSE.txt`, `${out}MIT-LICENSE.txt`);
if (!existsSync(`${out}sprites/players.png`)) throw new Error('sprites are missing');
console.log(`roguerogue: ${scripts.length} scripts, ${(bundle.length / 1024).toFixed(0)} KB -> ${out}`);
