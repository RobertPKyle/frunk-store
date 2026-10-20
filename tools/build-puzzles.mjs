// Builds apps/puzzles' engine, help pages, icons and list:
//
// - Simon Tatham's Portable Puzzle Collection (MIT License,
//   https://git.tartarus.org/simon/puzzles.git) at a fixed commit with
//   tools/puzzles/puzzles-web.patch, compiled with Emscripten in Docker
//   (tools/puzzles/Dockerfile: emsdk plus Halibut for the manual) to
//   apps/puzzles/engine/<puzzle>.{js,wasm}, one pair per puzzle, with the
//   licence and the patch.
// - Each puzzle's chapter of the manual, as an HTML fragment in
//   apps/puzzles/help/<puzzle>.html (links to other chapters unwrapped:
//   the app shows one chapter at a time).
// - An icon per puzzle, apps/puzzles/icons/<puzzle>.png: the puzzle's own
//   icon save (icons/<puzzle>.sav) drawn by the built puzzle in Chrome and
//   cropped as upstream's icons/icons.cmake crops it.
// - apps/puzzles/puzzles.json: the puzzles' names, descriptions and goals,
//   from upstream's CMakeLists.txt.
//
//   node tools/build-puzzles.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname } from 'node:path';
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.puzzles-build/`;
const app = `${root}apps/puzzles/`;

const PUZZLES_COMMIT = '616da16f25da428ccda805536209095bd062676e';   // 2026-09-22
const IMAGE = 'frunk-puzzles-emsdk:4.0.10';
const ICON = 128;   // px

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

function checkout(url, commit, dir) {
  rmSync(dir, { recursive: true, force: true });
  run('git', ['init', '--quiet', dir]);
  run('git', ['-C', dir, 'fetch', '--quiet', '--depth', '1', url, commit]);
  run('git', ['-C', dir, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);
}

mkdirSync(work, { recursive: true });
for (const dir of ['engine', 'help', 'icons']) {
  rmSync(`${app}${dir}`, { recursive: true, force: true });
  mkdirSync(`${app}${dir}`, { recursive: true });
}

// ---------- engine ----------

const src = `${work}puzzles/`;
checkout('https://git.tartarus.org/simon/puzzles.git', PUZZLES_COMMIT, src);
run('git', ['-C', src, 'apply', `${root}tools/puzzles/puzzles-web.patch`]);
run('docker', ['build', '--quiet', '-t', IMAGE, `${root}tools/puzzles`]);
run('docker', [
  'run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`,
  '-v', `${src}:/src`, '-w', '/src', IMAGE,
  'bash', '-c', `emcmake cmake -S . -B build-web -DCMAKE_BUILD_TYPE=Release && cmake --build build-web -j${availableParallelism()}`,
]);
const out = `${src}build-web/`;

// The puzzles, in upstream's order: puzzle(name DISPLAYNAME ".." DESCRIPTION ".." OBJECTIVE "..")
const cmake = readFileSync(`${src}CMakeLists.txt`, 'utf8');
const field = (block, key) => block.match(new RegExp(`${key}\\s+"((?:[^"\\\\]|\\\\.)*)"`, 's'))?.[1].replace(/\\\n/g, '').replace(/\\(.)/g, '$1');
const puzzles = [...cmake.matchAll(/^puzzle\((\w+)([^)]*)\)/gm)]
  .map(([, id, block]) => ({ id, title: field(block, 'DISPLAYNAME'), description: field(block, 'DESCRIPTION'), objective: field(block, 'OBJECTIVE') }))
  .filter(p => p.title && existsSync(`${out}${p.id}.wasm`));

for (const { id } of puzzles) for (const ext of ['js', 'wasm']) copyFileSync(`${out}${id}.${ext}`, `${app}engine/${id}.${ext}`);
copyFileSync(`${src}LICENCE`, `${app}engine/LICENCE.txt`);
copyFileSync(`${root}tools/puzzles/puzzles-web.patch`, `${app}engine/puzzles-web.patch`);
console.log(`built ${puzzles.length} puzzles in apps/puzzles/engine/`);

// ---------- help ----------

// The chapter's own text: from its heading to the closing navigation,
// with the table of contents and the links to elsewhere in the manual taken
// out (external links stay as their address; the app can't open them)
for (const { id } of puzzles) {
  const html = readFileSync(`${out}help/en/${id}.html`, 'latin1');
  const body = html.slice(html.indexOf('<h1>'), html.lastIndexOf('<hr>') > 0 ? html.lastIndexOf('<hr>') : html.indexOf('</body>'));
  const text = body
    .replace(/<a name="[^"]*"><\/a>/g, '')
    .replace(/<h1>Chapter \d+: /, '<h1>')
    .replace(/<a href="([^"]*)">([\s\S]*?)<\/a>/g, (_, href, inner) => inner)
    .replace(/<p>\s*<\/p>/g, '');
  writeFileSync(`${app}help/${id}.html`, text);
}
console.log(`wrote ${puzzles.length} help pages in apps/puzzles/help/`);

// ---------- icons ----------

// "<width>x<height> <crop w>x<crop h>+<x>+<y>" per puzzle, as upstream crops
const crops = Object.fromEntries([...readFileSync(`${src}icons/icons.cmake`, 'utf8')
  .matchAll(/^set\((\w+)_crop (\d+)x(\d+) (\d+)x(\d+)\+(\d+)\+(\d+)\)/gm)]
  .map(([, id, ...n]) => [id, n.map(Number)]));

// A page that runs one puzzle in a box of the icon's full size, with the
// elements the puzzles' web front end expects
writeFileSync(`${out}icon.html`, `<!doctype html>
<meta charset="utf-8">
<style>body { margin: 0; } #puzzlecanvascontain { width: var(--w); height: var(--h); } #puzzlecanvas { display: block; font-family: sans-serif; }</style>
<form id="gamemenu"><ul><li><div><ul id="gametype"></ul></div></li></ul></form>
<main id="puzzle"><div id="puzzlecanvascontain"><canvas id="puzzlecanvas"></canvas></div><div id="statusbar"></div>
<button id="undo"></button><button id="redo"></button></main>
<script>
  // not in the #fragment: the puzzles read that as a game ID
  const q = new URLSearchParams(location.search), id = q.get('p');
  const [w, h] = q.get('size').split('x');
  document.documentElement.style.setProperty('--w', w + 'px');
  document.documentElement.style.setProperty('--h', h + 'px');
  window.post_init_done = new Promise(resolve => { window.icon_ready = resolve; });
  const s = document.createElement('script');
  s.src = id + '.js';
  s.onload = () => { const real = window.post_init; window.post_init = () => { real(); window.icon_ready(); }; };
  document.body.append(s);
</script>`);
copyFileSync(`${src}LICENCE`, `${out}LICENCE`);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
  if (!path || path.includes('..') || !existsSync(out + path)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' }).end(readFileSync(out + path));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const { id } of puzzles) {
  const crop = crops[id];
  const [w, h] = crop ? crop : [256, 256];
  await page.goto(`${base}icon.html?p=${id}&size=${w}x${h}`);
  await page.evaluate(() => window.post_init_done);
  const sav = readFileSync(`${src}icons/${id}.sav`, 'latin1');
  const png = await page.evaluate(({ sav, crop, size }) => {
    const bytes = Uint8Array.from(sav, c => c.charCodeAt(0));
    let pos = 0;
    window.savefile_read_callback = (buf, len) => {
      if (pos + len > bytes.length) return false;
      Module.writeArrayToMemory(bytes.subarray(pos, pos + len), buf);
      pos += len;
      return true;
    };
    Module.cwrap('load_game', 'void', [])();
    window.savefile_read_callback = null;
    const c = document.getElementById('puzzlecanvas');
    // The crop, scaled from upstream's screenshot size to this canvas
    let [sx, sy, sw, sh] = [0, 0, c.width, c.height];
    if (crop) {
      const k = c.width / crop[0];
      [sw, sh, sx, sy] = [crop[2] * k, crop[3] * k, crop[4] * k, crop[5] * k];
    }
    const icon = document.createElement('canvas');
    icon.width = icon.height = size;
    const g = icon.getContext('2d');
    g.imageSmoothingQuality = 'high';
    const fit = Math.min(size / sw, size / sh);
    g.drawImage(c, sx, sy, sw, sh, (size - sw * fit) / 2, (size - sh * fit) / 2, sw * fit, sh * fit);
    return icon.toDataURL('image/png');
  }, { sav, crop, size: ICON });
  writeFileSync(`${app}icons/${id}.png`, Buffer.from(png.split(',')[1], 'base64'));
}
await browser.close();
server.close();
console.log(`drew ${puzzles.length} icons in apps/puzzles/icons/`);

writeFileSync(`${app}puzzles.json`, JSON.stringify({ commit: PUZZLES_COMMIT, puzzles }, null, 1) + '\n');
console.log('wrote apps/puzzles/puzzles.json');
