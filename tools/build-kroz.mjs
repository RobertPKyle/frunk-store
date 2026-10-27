// Builds ASCII Quests' games: Scott Miller's Kroz series, from the Turbo
// Pascal source Apogee released under the GNU GPL (version 2 or later) in
// 2009, as imported unchanged from Apogee's krozfree.zip into
// github.com/tangentforks/kroz. tools/kroz/pascal.mjs translates each game
// to apps/ascii/games/<id>.js, which apps/ascii/runtime.js runs.
//
// Only the source/ folder is used: the compiled games in the same zip are
// freeware with all rights reserved, and its TURBO3 folder holds Borland's
// compiler. The GPL wants the source with the program, so the build also
// writes apps/ascii/kroz-src.tar.gz: the Pascal files translated here,
// Apogee's source readme and license, the translator and this script.
//
// It also turns the Linux kernel's 8x16 VGA font (GPL-2.0) into
// apps/ascii/font.js for the text screen.
//
//   node tools/build-kroz.mjs
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { translate } from './kroz/pascal.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.kroz-build/`;
const out = `${root}apps/ascii/`;

const KROZ_REPO = 'https://github.com/tangentforks/kroz.git';
const KROZ_COMMIT = '5d080fb4f2440f704e57a5bc5e73ba080c1a1d8d';   // "import of krozfree.zip from 3d realms"
const FONT_URL = 'https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/plain/lib/fonts/font_8x16.c?h=v6.12';
const FONT_SHA256 = '786c901bd04e74ad7c81627146df2384622e874cea4b3bb76c2e4b35be4af2e6';

// Each game: its folder in source/, its main program, and the units and
// include files it needs
const GAMES = {
  caverns: { dir: 'KROZTRLI/CAVERNST', main: 'CAVERNS.PAS', files: /^CAVERNS(\d\.INC|\.PAS)$/ },
  dungeons: { dir: 'KROZTRLI/DUNGEONT', main: 'DUNGEONS.PAS', files: /^DUNGEON(S\.PAS|\d\.INC)$/ },
  kingdom: { dir: 'KROZTRLI/KINGDOMT', main: 'KINGDOM.PAS', files: /^KINGDOM(\d\.INC|\.PAS)$/ },
  return: { dir: 'SUPERKZ/RETURN', main: 'RETURN.PAS', files: /^RETURN\.(PAS|LEV|MON|TIT)$/ },
  temple: { dir: 'SUPERKZ/TEMPLE', main: 'TEMPLE.PAS', files: /^TEMPLE\.(PAS|LEV|MON|TIT)$/ },
  crusade: { dir: 'SUPERKZ/FINAL', main: 'CRUSADE.PAS', files: /^CRUSADE\.(PAS|LEV|MON|TIT)$/ },
  lost: { dir: 'LOSTKROZ/MASTER', main: 'LOST.PAS', files: /^LOST(\.PAS|\d\.LEV|2B\.LEV|\d\.TIT|5\.MOV)$/ },
};

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
const kroz = `${work}kroz/`;
run('git', ['init', '--quiet', kroz]);
run('git', ['-C', kroz, 'fetch', '--quiet', '--depth', '1', KROZ_REPO, KROZ_COMMIT]);
run('git', ['-C', kroz, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);

const base = 'kroz-src';
const src = `${work}${base}/`;
mkdirSync(`${out}games`, { recursive: true });
for (const [id, game] of Object.entries(GAMES)) {
  const from = `${kroz}source/${game.dir}/`;
  const dest = `${src}${game.dir}/`;
  mkdirSync(dest, { recursive: true });
  const names = readdirSync(from).filter(n => game.files.test(n));
  for (const n of names) copyFileSync(from + n, dest + n);
  writeFileSync(`${out}games/${id}.js`, translate(dest, game.main));
  console.log(`translated ${id} (${names.join(', ')})`);
}
copyFileSync(`${kroz}source/GNU.TXT`, `${src}GNU.TXT`);
copyFileSync(`${kroz}source/readme.txt`, `${src}readme.txt`);
mkdirSync(`${src}tools/kroz`, { recursive: true });
copyFileSync(`${root}tools/kroz/pascal.mjs`, `${src}tools/kroz/pascal.mjs`);
copyFileSync(`${root}tools/build-kroz.mjs`, `${src}tools/build-kroz.mjs`);
writeFileSync(`${src}README.txt`, [
  'The source of ASCII Quests\' games (frunk.store/ascii): Scott Miller\'s Kroz',
  'games as Apogee Software released them in 2009 under the GNU General Public',
  'License, version 2 or later (GNU.TXT, readme.txt). They are unchanged; frunk.store\'s',
  'translator (tools/kroz/pascal.mjs, run by tools/build-kroz.mjs) turns each into',
  'JavaScript for the runtime in frunk-apps.vercel.app/ascii/runtime.js.',
  '',
].join('\n'));
run('tar', ['-czf', `${out}kroz-src.tar.gz`, '--sort=name', '--mtime=2009-03-20', '--owner=0', '--group=0', '-C', work, base]);
copyFileSync(`${kroz}source/GNU.TXT`, `${out}COPYING`);

// The font: 256 characters of 16 rows, one byte per row
const fontSrc = Buffer.from(await (await fetch(FONT_URL)).arrayBuffer());
const sum = createHash('sha256').update(fontSrc).digest('hex');
if (sum !== FONT_SHA256) throw new Error(`font_8x16.c has changed (sha256 ${sum})`);
const bytes = [...fontSrc.toString('latin1').matchAll(/0x([0-9a-f]{2}),/gi)].map(m => parseInt(m[1], 16));
if (bytes.length !== 4096) throw new Error(`font_8x16.c gave ${bytes.length} bytes`);
writeFileSync(`${out}font.js`, [
  '// The Linux kernel\'s 8x16 VGA console font (lib/fonts/font_8x16.c, v6.12,',
  '// GPL-2.0), in code page 437 order: 256 characters of 16 rows, one byte per',
  '// row, base64. Written by tools/build-kroz.mjs.',
  `export const FONT = '${Buffer.from(bytes).toString('base64')}';`,
  '',
].join('\n'));
console.log('built apps/ascii/games/*.js, font.js and kroz-src.tar.gz');
