// Builds apps/adventure's engine, its data files and the free games:
//
// - ScummVM 2026.4.0 (GPL-3.0-or-later, https://github.com/scummvm/scummvm)
//   with tools/scummvm/scummvm-web.patch, compiled with Emscripten 4.0.10 in
//   Docker (tools/scummvm/Dockerfile adds pkg-config to emscripten/emsdk) to
//   apps/adventure/engine/scummvm.{js,wasm}, with the engines in ENGINES
//   built in. libmad 0.15.1b (GPL-2.0-or-later) is compiled with it for MP3
//   sound, libmikmod 3.3.15 (LGPL-2.0-or-later) for the tracker music of
//   SLUDGE games and libvpx 1.15.2 (BSD-3-Clause, VP8 decoding only) for
//   their WebM movies; their sources go next to the engine. The engine's data files
//   (themes, engine tables) go to apps/adventure/data/ with the index.json
//   files ScummVM's web file system reads.
// - The freeware games in GAMES, from downloads.scummvm.org, checked against
//   their SHA-256 and copied unmodified to apps/adventure/games/ (the page
//   unzips them).
//
//   node tools/build-scummvm.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.scummvm-build/`;
const app = `${root}apps/adventure/`;

const TAG = 'v2026.4.0';
const COMMIT = '7d2709da5136866589f7602f5f5a7b17de03420e';
const IMAGE = 'frunk-emsdk-scummvm:4.0.10';

// The free games' engines, and the ones for the most-loved games people own:
// LucasArts (SCUMM, including Humongous's children's games), Sierra (AGI,
// SCI), Revolution, Westwood, Coktel, Adventure Soft and others. Big 3D and
// video-heavy engines are left out: the car's Atom can't run them well.
const ENGINES = [
  'sky', 'queen', 'lure', 'drascula', 'cge', 'cge2', 'parallaction', 'sludge', 'adl',
  'scumm', 'scumm_7_8', 'he', 'agi', 'sci', 'agos', 'sword1', 'sword2', 'kyra', 'gob',
  'saga', 'tinsel', 'cine', 'touche', 'tucker', 'toon',
];

// Data files ScummVM reads from apps/adventure/data/: the GUI themes for its
// menus, the help dialog, text encodings, Mac fonts (Mac versions of SCUMM
// games), the AGI predictive-text dictionary and the built engines' tables.
const DATA = [
  'scummremastered.zip', 'scummclassic.zip', 'scummmodern.zip', 'helpdialog.zip', 'encoding.dat',
  'macgui.dat', 'classicmacfonts.dat', 'pred.dic',
  'sky.cpt', 'queen.tbl', 'lure.dat', 'drascula.dat', 'kyra.dat', 'toon.dat',
];

const LIBMAD = {
  file: 'libmad-0.15.1b.tar.gz', url: 'https://downloads.sourceforge.net/mad/libmad-0.15.1b.tar.gz',
  sha256: 'bbfac3ed6bfbc2823d3775ebb931087371e142bb0e9bb1bee51a76a6e0078690',
};
const LIBMIKMOD = {
  file: 'libmikmod-3.3.15.tar.gz', url: 'https://downloads.sourceforge.net/mikmod/libmikmod-3.3.15.tar.gz',
  sha256: 'dc27b338154b8f88dc9e6317196d42c6abc13bf63c4e055257a18d4e38e1afa2',
};
const LIBVPX = {
  file: 'libvpx-1.15.2.tar.gz', url: 'https://github.com/webmproject/libvpx/archive/refs/tags/v1.15.2.tar.gz',
  sha256: '26fcd3db88045dee380e581862a6ef106f49b74b6396ee95c2993a260b4636aa',
};

const EXTRAS = 'https://downloads.scummvm.org/frs/extras/';
const GAMES = [
  ['Beneath a Steel Sky/BASS-Floppy-1.3.zip', 'd0bac1bd61747a67e885fa44b78c78887bf2b15d3dfa2790c483fad651078818'],
  ['Flight of the Amazon Queen/FOTAQ_Floppy.zip', '2e59de85f708cdb32bf85c85b394ac091c05f7647e856b71f5b3ae73fde761e0'],
  ['Lure of the Temptress/lure-1.1.zip', 'f3178245a1483da1168c3a11e70b65d33c389f1f5df63d4f3a356886c1890108'],
  ['Drascula_ The Vampire Strikes Back/drascula-1.0.zip', 'b731f6cb5a22ba8b4c3b3362f570b9a10a67b6cb0b395394b19a94b36e4e42de'],
  ['Drascula_ The Vampire Strikes Back/drascula-audio-2.0.zip', '7e6afba36eed13dd02e0360119e9a6a8d0e7b334ddc11d7c46ab7faceb8fe401'],
  ['Soltys/soltys-en-v1.0.zip', '87b89e654b8a5b8ebe342cb4c5c6049ab9a43a5efb474d9c49bafb77dcce48f6'],
  ['Sfinx/sfinx-en-v1.1.zip', 'f516b30a046526f78cbc923d8f907d267ab964ccd9b770afc72350e8d467ec4d'],
  ['Nippon Safes/nippon-1.0.zip', '53e7e2c60065e4aed193169bbcdcfd1113fa68d3efe1c8240ba073c0e20d613f'],
  // SLUDGE games whose terms let them be passed on as they are: Tremendous
  // Corporation's code is LGPL-3.0 and its art CC BY-SA 4.0; Out Of Order,
  // Frasse and Nathan's Second Chance are freeware that may be shared free
  // and whole. (Not Mandy, which forbids any profit, nor the ones whose
  // packages state no terms.)
  ['SLUDGE/tsotc-v6.zip', '4493047914318167cf1e955795028c65592be99fe620a389745c5d6bec97d24b'],
  ['SLUDGE/outoforder.zip', 'e57a2fda60ff41e3d22ee6ac763de89762eaeb719104d8851662f1d6146f38ec'],
  ['SLUDGE/frasse-1.04.zip', '8c517241389073f8577b805ecd730cf255c867220ff108d837b21026d90c06cd'],
  ['SLUDGE/nsc.zip', 'b269b11fc74ceeeeaa8692d2f695786ce6bd9b104a7bbf7fdf913ab62d45b4de'],
  // Sierra's first graphic adventure (1980), in the public domain
  ['Mystery House/MYSTHOUS.zip', 'ada412228a149394489b28c6c7f9ebab0722b52e04732fd0aa22949673cfa3a0'],
];

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');

async function download(url, file, hash) {
  if (!existsSync(file)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  if (sha256(file) !== hash) throw new Error(`${file}: checksum mismatch`);
}

mkdirSync(`${work}libs`, { recursive: true });
mkdirSync(`${work}games`, { recursive: true });
for (const dir of ['engine', 'data', 'games']) mkdirSync(`${app}${dir}`, { recursive: true });

// ---------- engine ----------

const src = `${work}scummvm-src/`;
rmSync(src, { recursive: true, force: true });
run('git', ['-c', 'advice.detachedHead=false', 'clone', '--quiet', '--depth', '1', '--branch', TAG, 'https://github.com/scummvm/scummvm.git', src]);
const head = execFileSync('git', ['-C', src, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (head !== COMMIT) throw new Error(`${TAG} is ${head}, expected ${COMMIT}`);
run('git', ['-C', src, 'apply', `${root}tools/scummvm/scummvm-web.patch`]);

for (const lib of [LIBMAD, LIBMIKMOD, LIBVPX]) await download(lib.url, `${work}libs/${lib.file}`, lib.sha256);
run('docker', ['build', '--quiet', '-t', IMAGE, `${root}tools/scummvm`], { stdio: ['ignore', 'ignore', 'inherit'] });

// One container run: configure builds Emscripten's SDL3, Ogg, Vorbis, zlib
// and libpng ports into the container's cache, which make then links.
const script = `
set -e
LIBS=/work/libs
if [ ! -f $LIBS/build/lib/libmad.a ]; then
  rm -rf $LIBS/libmad-0.15.1b && tar -xzf $LIBS/${LIBMAD.file} -C $LIBS && cd $LIBS/libmad-0.15.1b
  sed -i -e 's/-fforce-mem//g' configure
  CFLAGS="-Oz" emconfigure ./configure --host=wasm32-unknown-none --build=x86_64-linux-gnu --prefix=$LIBS/build --enable-fpm=no --disable-shared > /dev/null
  emmake make -j8 > /dev/null && emmake make install > /dev/null
fi
if [ ! -f $LIBS/build/lib/libmikmod.a ]; then
  rm -rf $LIBS/libmikmod-3.3.15 && tar -xzf $LIBS/${LIBMIKMOD.file} -C $LIBS && cd $LIBS/libmikmod-3.3.15
  CFLAGS="-O2" emconfigure ./configure --host=wasm32-unknown-none --build=x86_64-linux-gnu --prefix=$LIBS/build --disable-shared --enable-static \\
    --disable-alldrv --disable-threads --disable-dl > /dev/null
  emmake make -j8 > /dev/null && emmake make install > /dev/null
fi
if [ ! -f $LIBS/build/lib/libvpx.a ]; then
  rm -rf $LIBS/libvpx-1.15.2 && tar -xzf $LIBS/${LIBVPX.file} -C $LIBS && cd $LIBS/libvpx-1.15.2
  emconfigure ./configure --target=generic-gnu --prefix=$LIBS/build --disable-vp9 --disable-vp8-encoder --disable-examples --disable-tools \\
    --disable-docs --disable-unit-tests --disable-multithread --disable-runtime-cpu-detect --enable-static --disable-shared > /dev/null
  emmake make -j8 > /dev/null && emmake make install > /dev/null
fi
cd /src
emconfigure ./configure --host=wasm32-unknown-emscripten --build=wasm32-unknown-emscripten \\
  --enable-release --disable-all-engines --enable-engine=${ENGINES.join(',')} \\
  --enable-mad --with-mad-prefix=$LIBS/build --enable-mikmod --with-mikmod-prefix=$LIBS/build \\
  --enable-vpx --with-vpx-prefix=$LIBS/build --enable-vorbis --enable-ogg --enable-zlib --enable-png \\
  --disable-cloud --disable-imgui --disable-tts > configure.log
emmake make -j$(nproc) > make.log
emmake make dist-emscripten > /dev/null
`;
run('docker', [
  'run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`,
  '-v', `${src}:/src`, '-v', `${work}:/work`, '-w', '/src', IMAGE, 'bash', '-c', script,
]);
for (const ext of ['js', 'wasm']) copyFileSync(`${src}scummvm.${ext}`, `${app}engine/scummvm.${ext}`);
copyFileSync(`${src}COPYING`, `${app}engine/COPYING`);
copyFileSync(`${root}tools/scummvm/scummvm-web.patch`, `${app}engine/scummvm-web.patch`);
for (const lib of [LIBMAD, LIBMIKMOD, LIBVPX]) copyFileSync(`${work}libs/${lib.file}`, `${app}engine/${lib.file}`);
console.log('built apps/adventure/engine/scummvm.{js,wasm}');

// ---------- data ----------

rmSync(`${app}data`, { recursive: true, force: true });
mkdirSync(`${app}data`);
const index = {};
for (const f of DATA) {
  copyFileSync(`${src}build-emscripten/data/${f}`, `${app}data/${f}`);
  index[f] = statSync(`${app}data/${f}`).size;
}
writeFileSync(`${app}data/index.json`, JSON.stringify(index));
console.log(`copied ${DATA.length} data files to apps/adventure/data/`);

// ---------- games ----------

for (const [path, hash] of GAMES) {
  const file = path.replace(/^.*\//, '');
  await download(EXTRAS + path.split('/').map(encodeURIComponent).join('/'), `${work}games/${file}`, hash);
  copyFileSync(`${work}games/${file}`, `${app}games/${file}`);
}
const stale = readdirSync(`${app}games`).filter(f => f.endsWith('.zip') && !GAMES.some(([p]) => p.endsWith(`/${f}`)));
for (const f of stale) rmSync(`${app}games/${f}`);
console.log(`copied ${GAMES.length} games to apps/adventure/games/`);
