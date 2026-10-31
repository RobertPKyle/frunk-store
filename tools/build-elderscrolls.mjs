// Builds apps/elderscrolls, The Elder Scrolls: Arena and Daggerfall:
//
// - DOSBox for the browser: em-dosbox (https://github.com/dreamlayers/em-dosbox,
//   DOSBox SVN r4305 ported to Emscripten, GPL-2.0) at a pinned commit, with
//   tools/elderscrolls/em-dosbox-web.patch, compiled with Emscripten in Docker
//   (tools/elderscrolls/Dockerfile: emsdk 4.0.10 with Autotools) to
//   apps/elderscrolls/engine/dosbox.{js,wasm}. The patched source goes next
//   to them as em-dosbox-<commit>-web-src.tar.gz, as the GPL asks.
// - The games from Bethesda's freeware releases (Arena in 2004, Daggerfall
//   in 2009), downloaded from Bethesda's own server and checked against
//   their SHA-256:
//   - Arena: Arena106.exe (a RAR self-extractor, unpacked with Debian's
//     unrar in Docker), its ARENA folder unchanged.
//   - Daggerfall: the CD's DAGGER folder from DFInstall.zip, set up as the
//     installer's "huge" install would: ARCH3D.BSA and DAGGER.SND unpacked
//     from PACKED.DAT (PKWARE implode blocks), Bethesda's 1.07.213 patch
//     (DAG213.EXE, in the same zip) applied by running it in Debian's DOSBox
//     in Docker, and the installer's Z.CFG and HMISET.CFG (Sound Blaster 16)
//     written. PACKED.DAT itself isn't needed once unpacked.
//   tools/supertux/pack.mjs packs each game into 1 MB blocks
//   (apps/elderscrolls/data/<game>/<version>/<n>.bin) and
//   data/<game>/index.json, the files the game reads while starting first
//   (tools/elderscrolls/boot-<game>.txt).
//
//   node tools/build-elderscrolls.mjs [--engine | --data]
//   (--engine: leave data/ as it is; --data: leave engine/ as it is)
import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pack, readBoot } from './supertux/pack.mjs';
import { blast } from './cnc/westwood.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.elderscrolls-build/`;
const app = `${root}apps/elderscrolls/`;
const IMAGE = 'frunk-elderscrolls-emsdk';

const EMD_REPO = 'https://github.com/dreamlayers/em-dosbox.git';
const EMD_COMMIT = 'e1f72dd11513c9ddc6e2a9c1f08ff50581c320f7';   // em-dosbox-svn-sdl2, "Update to DOSBox r4305", 2023-01-06
const BETHESDA = 'https://cdnstatic.bethsoft.com/elderscrolls.com/assets/files/tes/extras/';
const DOWNLOADS = {
  arena: { file: 'Arena106Setup.zip', sha256: 'aed6d15d9cd29fde12464097fd73e0c9fa290d2a57979e84a1cc8ac0c3fb1fc7' },
  daggerfall: { file: 'DFInstall.zip', sha256: 'a9ba539d56f84f28b9da8c0a1d5ef5d34ccd6dcb5003f2bb2f5aa8baf6ffe828' },
};

// Daggerfall's settings, as its installer writes them for a "huge" install.
// The CD's folder is the same as the hard disk's here, so both paths point
// at C:. A partial Z.CFG hangs the game on a black screen after the intro.
const Z_CFG = [
  'type dfall_huge', 'path c:\\dagger\\arena2\\', 'pathcd c:\\dagger\\arena2\\', 'fadecolor 0', 'mapfile d',
  'rendergame 1', 'user 1', 'startMap 179', 'region 17', 'helmet 0', 'maxSpeed 200', 'controls betaplyr.dat',
  'maps mapsave.sav',
];
// The sound setup's choice of a Sound Blaster 16 (DOSBox's, at 220h, IRQ 7, DMA 1)
const HMISET_CFG = [
  '', '[DIGITAL]', 'DeviceName  = Sound Blaster 16/AWE32    ', 'DeviceIRQ   = 7', 'DeviceDMA   = 1',
  'DevicePort  = 0x220', 'DeviceID    = 0xe016', '', '[MIDI]', 'DeviceName  = Sound Blaster 16          ',
  'DevicePort  = 0x388', 'DeviceID    = 0xa009',
];
const dos = lines => lines.join('\r\n') + '\r\n';

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const engineOnly = process.argv.includes('--engine');
const dataOnly = process.argv.includes('--data');
const uid = `${process.getuid()}:${process.getgid()}`;

mkdirSync(work, { recursive: true });
mkdirSync(`${app}engine`, { recursive: true });

// ---------- engine ----------

const src = `${work}em-dosbox/`;
if (!dataOnly) {
  rmSync(src, { recursive: true, force: true });
  mkdirSync(src);
  run('git', ['-C', src, 'init', '--quiet']);
  run('git', ['-C', src, 'fetch', '--quiet', '--depth', '1', EMD_REPO, EMD_COMMIT]);
  run('git', ['-C', src, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);
  const head = execFileSync('git', ['-C', src, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (head !== EMD_COMMIT) throw new Error(`em-dosbox is ${head}, expected ${EMD_COMMIT}`);
  // patch, not git apply: inside this repository's tree git apply skips files
  run('patch', ['-p1', '--quiet', '-d', src, '-i', `${root}tools/elderscrolls/em-dosbox-web.patch`]);
  // the source as built, before the build's own files land in the tree
  const tarball = `em-dosbox-${EMD_COMMIT.slice(0, 7)}-web-src.tar.gz`;
  run('tar', ['-czf', `${app}engine/${tarball}`, '--exclude=.git', '-C', work, 'em-dosbox']);

  run('docker', ['build', '-q', '-t', IMAGE, `${root}tools/elderscrolls`]);
  // funarray off: em-dosbox turns the CPU cores' big switch statements into
  // arrays of functions for asm.js, which makes WebAssembly about half as fast
  run('docker', [
    'run', '--rm', '-u', uid, '-e', 'HOME=/tmp', '-v', `${src}:/src`, '-w', '/src', IMAGE, 'sh', '-c',
    './autogen.sh >/dev/null 2>&1'
    + ' && ac_cv_exeext=.js emconfigure ./configure --with-sdl2 --disable-funarray --enable-frunk >/dev/null'
    + ' && make -j"$(nproc)" >/dev/null',
  ]);
  for (const ext of ['js', 'wasm']) copyFileSync(`${src}src/dosbox.${ext}`, `${app}engine/dosbox.${ext}`);
  copyFileSync(`${src}COPYING`, `${app}engine/COPYING`);
  copyFileSync(`${root}tools/elderscrolls/em-dosbox-web.patch`, `${app}engine/em-dosbox-web.patch`);
  console.log(`built apps/elderscrolls/engine/dosbox.{js,wasm} and ${tarball}`);
}

// ---------- game files ----------

async function download({ file, sha256 }) {
  const path = `${work}dl/${file}`;
  if (!existsSync(path)) {
    mkdirSync(`${work}dl`, { recursive: true });
    console.log(`downloading ${file}…`);
    run('curl', ['-sSfL', '-o', `${path}.part`, BETHESDA + file]);
    run('mv', [`${path}.part`, path]);
  }
  const hash = await new Promise((resolve, reject) => {
    const h = createHash('sha256');
    createReadStream(path).on('data', d => h.update(d)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
  });
  if (hash !== sha256) throw new Error(`${file}: checksum mismatch`);
  return path;
}

// Debian bookworm in Docker with a package or two, running a shell command
// with work/ as /w; what it writes belongs to us afterwards
function debian(packages, command, { nonFree = false } = {}) {
  run('docker', ['run', '--rm', '-v', `${work}:/w`, '-w', '/w', 'debian:bookworm-slim', 'sh', '-c',
    (nonFree ? 'sed -i "s/Components: main/Components: main non-free/" /etc/apt/sources.list.d/debian.sources && ' : '')
    + `apt-get update -qq && apt-get install -y -qq ${packages} >/dev/null 2>&1`
    + ` && ${command}; status=$?; chown -R ${uid} /w; exit $status`]);
}

// PACKED.DAT (Daggerfall's CD): a u32 offset of its directory, then blocks
// of up to 256 KB, each a 36-byte header (the compressed size at +12) and a
// PKWARE implode stream. The files are one after another in the order the
// directory lists them; each entry is a u32 size, a u32, a 13-byte name and
// a u32.
function unpackPacked(buf) {
  const dir = buf.readUInt32LE(0);
  const parts = [];
  for (let p = 8; p < dir;) {
    const size = buf.readUInt32LE(p + 12);
    parts.push(blast(buf.subarray(p + 36, p + 36 + size)));
    p += 36 + size;
  }
  const stream = Buffer.concat(parts);
  const files = {};
  let at = 0;
  for (let p = dir; p + 25 <= buf.length; p += 25) {
    const size = buf.readUInt32LE(p);
    const name = buf.toString('latin1', p + 8, p + 21).replace(/\0.*$/s, '');
    if (!/^[\w$]+\.\w+$/.test(name)) break;
    files[name] = stream.subarray(at, at + size);
    at += size;
  }
  if (at !== stream.length) throw new Error(`PACKED.DAT: ${at} of ${stream.length} bytes listed`);
  return files;
}

// A BSA archive's records add up to its size (header, records, directory)
function checkBsa(name, bytes) {
  const count = bytes.readUInt16LE(0);
  const dir = bytes.length - count * 8;
  let sum = 4;
  for (let i = 0; i < count; i++) sum += bytes.readUInt32LE(dir + i * 8 + 4);
  if (sum + count * 8 !== bytes.length) throw new Error(`${name} doesn't add up`);
}

if (!engineOnly) {
  const gameData = `${work}data/`;
  rmSync(gameData, { recursive: true, force: true });
  mkdirSync(`${app}data`, { recursive: true });

  // Arena: Arena106.exe inside Bethesda's zip
  const arenaZip = await download(DOWNLOADS.arena);
  rmSync(`${work}arena`, { recursive: true, force: true });
  mkdirSync(`${work}arena`);
  run('unzip', ['-q', '-o', arenaZip, '-d', `${work}arena`]);
  debian('unrar', 'cd arena && unrar x -o+ -inul Arena106.exe', { nonFree: true });
  mkdirSync(`${gameData}arena`, { recursive: true });
  cpSync(`${work}arena/ARENA`, `${gameData}arena/ARENA`, { recursive: true });
  copyFileSync(`${work}arena/Arena106 Setup.pdf`, `${app}data/arena-setup.pdf`);

  // Daggerfall: the CD's DAGGER folder from Bethesda's zip, installed
  const dfZip = await download(DOWNLOADS.daggerfall);
  rmSync(`${work}daggerfall`, { recursive: true, force: true });
  mkdirSync(`${work}daggerfall`);
  run('unzip', ['-q', '-o', dfZip, '-d', `${work}daggerfall`]);
  const dagger = `${gameData}daggerfall/DAGGER/`;
  mkdirSync(`${gameData}daggerfall`, { recursive: true });
  cpSync(`${work}daggerfall/DFCD/DAGGER`, dagger, { recursive: true });
  const unpacked = unpackPacked(readFileSync(`${dagger}ARENA2/PACKED.DAT`));
  for (const name of ['ARCH3D.BSA', 'DAGGER.SND']) {
    if (!unpacked[name]) throw new Error(`${name} isn't in PACKED.DAT`);
    checkBsa(name, unpacked[name]);
    writeFileSync(`${dagger}ARENA2/${name}`, unpacked[name]);
  }
  rmSync(`${dagger}ARENA2/PACKED.DAT`);
  writeFileSync(`${dagger}Z.CFG`, dos(Z_CFG));
  writeFileSync(`${dagger}HMISET.CFG`, dos(HMISET_CFG));
  // Bethesda's patch to 1.07.213: it asks before it starts (y), then
  // replaces FALL.EXE and some of ARENA2's files
  copyFileSync(`${work}daggerfall/DAGGER/DAG213.EXE`, `${dagger}DAG213.EXE`);
  writeFileSync(`${dagger}YES.TXT`, 'y\r\ny\r\ny\r\n');
  debian('dosbox', 'SDL_VIDEODRIVER=dummy SDL_AUDIODRIVER=dummy timeout 300 dosbox'
    + ' -c "mount c /w/data/daggerfall" -c "c:" -c "cd dagger" -c "DAG213 < YES.TXT > PATCH.LOG" -c exit >/dev/null 2>&1');
  const log = readFileSync(`${dagger}PATCH.LOG`, 'latin1');
  if (!/Update successful/.test(log)) throw new Error(`DAG213 didn't finish: ${log.slice(-300)}`);
  for (const f of ['DAG213.EXE', 'YES.TXT', 'PATCH.LOG']) rmSync(`${dagger}${f}`);
  copyFileSync(`${work}daggerfall/daggerfall_legal_and_installation.pdf`, `${app}data/daggerfall-legal.pdf`);

  for (const game of ['arena', 'daggerfall']) {
    const out = `${app}data/${game}`;
    mkdirSync(out, { recursive: true });
    const boot = `${root}tools/elderscrolls/boot-${game}.txt`;
    const packed = pack({ data: `${gameData}${game}`, out, ...readBoot(existsSync(boot) ? readFileSync(boot, 'utf8') : '') });
    console.log(`packed apps/elderscrolls/data/${game}/ (${packed.files} files, ${Math.round(packed.bytes / 1e6)} MB in ${packed.blocks} blocks, ${Math.round(packed.stored / 1e6)} MB stored, ${Math.round(packed.boot / 1e6)} MB read at start)`);
  }
}
