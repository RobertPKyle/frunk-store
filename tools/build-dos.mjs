// Builds the shareware DOS game apps that run in DOSBox: apps/deathrally
// (Death Rally), apps/wolf3d (Wolfenstein 3D), apps/keen1 (Commander Keen 1),
// and the games in tools/dos/games/ (Keen 4, Duke Nukem II, Cosmo, Hocus
// Pocus, Rise of the Triad, Blake Stone).
//
// - The engine is The Elder Scrolls app's: em-dosbox (DOSBox SVN r4305 ported
//   to Emscripten, GPL-2.0) at the same pinned commit with
//   tools/elderscrolls/em-dosbox-web.patch, compiled in Docker
//   (tools/elderscrolls/Dockerfile, emsdk 4.0.10 with Autotools). It's built
//   once into tools/.dos-build/ and copied to each app's engine/, with the
//   patched source next to it as em-dosbox-<commit>-web-src.tar.gz, as the
//   GPL asks.
// - The games are the shareware episodes as Apogee released them, fetched
//   from the Internet Archive's copy of Apogee's own FTP server
//   (ftp.3drealms.com/share/) and checked against their SHA-256:
//   - Death Rally: 1ral11.zip (v1.1, 1996), whose DRSW11.SHR is a zip of the
//     game's folder.
//   - Wolfenstein 3D: 1wolf14.zip (v1.4, 1993), whose W3DSW14.SHR is Apogee's
//     installer archive (PKWARE implode, tools/dos/apogee.mjs).
//   - Commander Keen 1: 1keen.zip (v1.31), whose CK1SW131.SHR is the same kind
//     of archive.
//   Every file comes out unchanged, as all three licenses ask (they list the
//   files). The zip itself is kept in each app's data/ too, for anyone who
//   wants the release as it was, and its license text is copied to the app's
//   folder for the page to link. tools/supertux/pack.mjs packs the game's
//   folder into 1 MB blocks (apps/<app>/data/<version>/<n>.bin) and
//   data/index.json; the page fetches them all before the game starts.
//
// More games (one file each, in the same shape) are in tools/dos/games/.
//
//   node tools/build-dos.mjs [deathrally] [wolf3d] [keen1] [<game> ...] [--engine | --data]
//   (no game: all; --engine: leave data/ as it is; --data: leave engine/)
import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pack } from './supertux/pack.mjs';
import { unshr } from './dos/apogee.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.dos-build/`;
const IMAGE = 'frunk-elderscrolls-emsdk';

const EMD_REPO = 'https://github.com/dreamlayers/em-dosbox.git';
const EMD_COMMIT = 'e1f72dd11513c9ddc6e2a9c1f08ff50581c320f7';   // em-dosbox-svn-sdl2, "Update to DOSBox r4305", 2023-01-06
const PATCH = `${root}tools/elderscrolls/em-dosbox-web.patch`;

// Apogee's FTP server as the Internet Archive saved it on 2015-11-30 (the
// server itself is gone); archive.org's own copy of the same zip second
const FTP = 'https://web.archive.org/web/20151130230432id_/ftp://ftp.3drealms.com/share/';
// An Apogee installer archive, as the game's folder
const unpackShr = (shr, dir) => (zipDir, out) => {
  mkdirSync(`${out}${dir}`);
  for (const { name, data, date } of unshr(readFileSync(`${zipDir}${shr}`))) {
    writeFileSync(`${out}${dir}/${name}`, data);
    utimesSync(`${out}${dir}/${name}`, date, date);
  }
};
const GAMES = {
  deathrally: {
    app: 'deathrally', zip: '1ral11.zip', sha256: '4a2c219e1590a4f83199ae416436a8d9fe9899500fdd8bef91b6cea6afa1c31d',
    urls: [`${FTP}1ral11.zip`, 'https://archive.org/download/1rally/1ral11.zip'],
    // the game's folder as the installer would make it
    unpack(zipDir, out) {
      mkdirSync(`${out}RALLY`);
      run('unzip', ['-q', '-o', `${zipDir}DRSW11.SHR`, '-d', `${out}RALLY`]);
    },
    files: ['DRHELP.EXE', 'ENGINE.BPA', 'IBFILES.BPA', 'LICENSE.TXT', 'MENU.BPA', 'MUSICS.BPA', 'RALLY.EXE', 'RALLY.ICO', 'SETUP.EXE', 'TR4.BPA', 'TR7.BPA', 'TR9.BPA'],
    dir: 'RALLY',
    license: 'LICENSE.TXT',
  },
  wolf3d: {
    app: 'wolf3d', zip: '1wolf14.zip', sha256: 'cb2a2ef7ecef14152c65ff93cc3b84fbd3e8eb0c5c1de41a6fc8cdef559451a8',
    urls: [`${FTP}1wolf14.zip`],
    unpack: unpackShr('W3DSW14.SHR', 'WOLF3D'),
    // the files VENDOR.DOC lists, with their sizes
    files: ['AUDIOHED.WL1', 'AUDIOT.WL1', 'GAMEMAPS.WL1', 'MAPHEAD.WL1', 'VGADICT.WL1', 'VGAGRAPH.WL1', 'VGAHEAD.WL1', 'VSWAP.WL1', 'WOLF3D.EXE', 'W3DHELP.EXE', 'VENDOR.DOC', 'ORDER.FRM'],
    sizes: { 'AUDIOHED.WL1': 1156, 'AUDIOT.WL1': 132613, 'GAMEMAPS.WL1': 27425, 'MAPHEAD.WL1': 402, 'VGADICT.WL1': 1024, 'VGAGRAPH.WL1': 326568, 'VGAHEAD.WL1': 471, 'VSWAP.WL1': 742912, 'WOLF3D.EXE': 109959 },
    dir: 'WOLF3D',
    license: 'VENDOR.DOC',
  },
  keen1: {
    app: 'keen1', zip: '1keen.zip', sha256: 'c1b6c2ba73183a4e4fa049694a4da68628113229346fc6d0ed410d740d17791b',
    urls: [`${FTP}1keen.zip`],
    unpack: unpackShr('CK1SW131.SHR', 'KEEN1'),
    // the files VENDOR.DOC lists, with their sizes, and the two it comes with
    files: ['EGAHEAD.CK1', 'EGALATCH.CK1', 'EGASPRIT.CK1', 'ENDTEXT.CK1', 'FINALE.CK1', 'HELPTEXT.CK1', 'KEEN1.EXE',
      'LEVEL01.CK1', 'LEVEL02.CK1', 'LEVEL03.CK1', 'LEVEL04.CK1', 'LEVEL05.CK1', 'LEVEL06.CK1', 'LEVEL07.CK1', 'LEVEL08.CK1',
      'LEVEL09.CK1', 'LEVEL10.CK1', 'LEVEL11.CK1', 'LEVEL12.CK1', 'LEVEL13.CK1', 'LEVEL14.CK1', 'LEVEL15.CK1', 'LEVEL16.CK1',
      'LEVEL80.CK1', 'LEVEL81.CK1', 'LEVEL90.CK1', 'PREVIEW2.CK1', 'PREVIEW3.CK1', 'PREVIEWS.CK1', 'SOUNDS.CK1', 'STORYTXT.CK1',
      'VENDOR.DOC', 'ORDER.FRM'],
    sizes: { 'EGAHEAD.CK1': 15568, 'EGALATCH.CK1': 57065, 'EGASPRIT.CK1': 17633, 'ENDTEXT.CK1': 942, 'FINALE.CK1': 8565, 'HELPTEXT.CK1': 1859, 'KEEN1.EXE': 51190,
      'LEVEL01.CK1': 1368, 'LEVEL02.CK1': 724, 'LEVEL03.CK1': 3474, 'LEVEL04.CK1': 1720, 'LEVEL05.CK1': 810, 'LEVEL06.CK1': 928, 'LEVEL07.CK1': 5650, 'LEVEL08.CK1': 3416,
      'LEVEL09.CK1': 1638, 'LEVEL10.CK1': 2086, 'LEVEL11.CK1': 1636, 'LEVEL12.CK1': 2178, 'LEVEL13.CK1': 9908, 'LEVEL14.CK1': 7024, 'LEVEL15.CK1': 2234, 'LEVEL16.CK1': 5818,
      'LEVEL80.CK1': 5638, 'LEVEL81.CK1': 758, 'LEVEL90.CK1': 1262, 'PREVIEW2.CK1': 27886, 'PREVIEW3.CK1': 25429, 'PREVIEWS.CK1': 2160, 'SOUNDS.CK1': 8898, 'STORYTXT.CK1': 3504 },
    dir: 'KEEN1',
    license: 'VENDOR.DOC',
  },
};
// More games, one file each: tools/dos/games/<app>.mjs default-exports
// ({ FTP, unpackShr, run }) => the game's entry, in the same shape as above
for (const f of readdirSync(`${root}tools/dos/games`).filter(f => f.endsWith('.mjs')).sort()) {
  const id = f.slice(0, -4);
  GAMES[id] = (await import(`./dos/games/${f}`)).default({ FTP, unpackShr, run: (...a) => run(...a) });
}

const run =(cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const args = process.argv.slice(2);
const engineOnly = args.includes('--engine');
const dataOnly = args.includes('--data');
const picked = args.filter(a => !a.startsWith('--'));
for (const g of picked) if (!GAMES[g]) throw new Error(`unknown game ${g}; one of ${Object.keys(GAMES).join(', ')}`);
const games = picked.length ? picked : Object.keys(GAMES);
const uid = `${process.getuid()}:${process.getgid()}`;

mkdirSync(work, { recursive: true });

// ---------- engine ----------

if (!dataOnly) {
  const src = `${work}em-dosbox/`;
  rmSync(src, { recursive: true, force: true });
  mkdirSync(src);
  run('git', ['-C', src, 'init', '--quiet']);
  run('git', ['-C', src, 'fetch', '--quiet', '--depth', '1', EMD_REPO, EMD_COMMIT]);
  run('git', ['-C', src, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);
  const head = execFileSync('git', ['-C', src, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (head !== EMD_COMMIT) throw new Error(`em-dosbox is ${head}, expected ${EMD_COMMIT}`);
  run('patch', ['-p1', '--quiet', '-d', src, '-i', PATCH]);
  const tarball = `em-dosbox-${EMD_COMMIT.slice(0, 7)}-web-src.tar.gz`;
  run('tar', ['-czf', `${work}${tarball}`, '--exclude=.git', '-C', work, 'em-dosbox']);

  run('docker', ['build', '-q', '-t', IMAGE, `${root}tools/elderscrolls`]);
  run('docker', [
    'run', '--rm', '-u', uid, '-e', 'HOME=/tmp', '-v', `${src}:/src`, '-w', '/src', IMAGE, 'sh', '-c',
    './autogen.sh >/dev/null 2>&1'
    + ' && ac_cv_exeext=.js emconfigure ./configure --with-sdl2 --disable-funarray --enable-frunk >/dev/null'
    + ' && make -j"$(nproc)" >/dev/null',
  ]);
  for (const g of games) {
    const engine = `${root}apps/${GAMES[g].app}/engine/`;
    mkdirSync(engine, { recursive: true });
    for (const ext of ['js', 'wasm']) copyFileSync(`${src}src/dosbox.${ext}`, `${engine}dosbox.${ext}`);
    copyFileSync(`${src}COPYING`, `${engine}COPYING`);
    copyFileSync(PATCH, `${engine}em-dosbox-web.patch`);
    copyFileSync(`${work}${tarball}`, `${engine}${tarball}`);
    console.log(`built apps/${GAMES[g].app}/engine/dosbox.{js,wasm} and ${tarball}`);
  }
}

// ---------- games ----------

async function sha256(path) {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    createReadStream(path).on('data', d => h.update(d)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
  });
}

async function download(G) {
  const path = `${work}dl/${G.zip}`;
  mkdirSync(`${work}dl`, { recursive: true });
  if (!existsSync(path) || await sha256(path) !== G.sha256) {
    let ok = false;
    for (const url of G.urls) {
      console.log(`downloading ${url}…`);
      try {
        run('curl', ['-sSfL', '-o', `${path}.part`, url]);
        if (await sha256(`${path}.part`) === G.sha256) { run('mv', [`${path}.part`, path]); ok = true; break; }
        console.log(`${url}: checksum mismatch`);
      } catch (e) { console.log(`${url}: ${e.message}`); }
    }
    if (!ok) throw new Error(`${G.zip}: no good copy`);
  }
  return path;
}

if (!engineOnly) {
  for (const g of games) {
    const G = GAMES[g];
    const app = `${root}apps/${G.app}/`;
    const zip = await download(G);
    const zipDir = `${work}${g}/zip/`, gameDir = `${work}${g}/game/`;
    rmSync(`${work}${g}`, { recursive: true, force: true });
    mkdirSync(zipDir, { recursive: true });
    mkdirSync(gameDir, { recursive: true });
    run('unzip', ['-q', '-o', zip, '-d', zipDir]);
    G.unpack(zipDir, gameDir);
    for (const f of G.files) {
      const p = `${gameDir}${G.dir}/${f}`;
      if (!existsSync(p)) throw new Error(`${g}: ${f} is missing`);
      if (G.sizes?.[f] != null && readFileSync(p).length !== G.sizes[f]) throw new Error(`${g}: ${f} has the wrong size`);
    }
    mkdirSync(`${app}data`, { recursive: true });
    copyFileSync(zip, `${app}data/${G.zip}`);
    // the license, linked from the page
    copyFileSync(`${gameDir}${G.dir}/${G.license}`, `${app}${G.license}`);
    const packed = pack({ data: gameDir, out: `${app}data`, start: G.files.map(f => `${G.dir}/${f}`) });
    console.log(`packed apps/${G.app}/data/ (${packed.files} files, ${(packed.bytes / 1e6).toFixed(1)} MB in ${packed.blocks} blocks, ${(packed.stored / 1e6).toFixed(1)} MB stored)`);
  }
}
