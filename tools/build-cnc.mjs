// Builds apps/cnc, Command & Conquer and Red Alert:
//
// - Vanilla Conquer (https://github.com/TheAssemblyArmada/Vanilla-Conquer),
//   the games' engines from EA's source release under the GNU GPL 3 with
//   EA's additional terms, at a pinned commit, with
//   tools/cnc/vanilla-conquer-web.patch, compiled with Emscripten in Docker
//   (tools/cnc/Dockerfile: emsdk 4.0.10 with a newer CMake) by the patch's
//   web/build.sh to apps/cnc/engine/vanilla{td,ra}.{js,wasm}. The source the
//   build came from goes next to them as vanilla-conquer-<commit>-web-src.tar.gz,
//   as the GPL asks, with the license.
// - The games' files from EA's freeware releases (Command & Conquer Gold in
//   2007, Red Alert in 2008), as archived from EA's own download page at
//   archive.org, checked against their MD5 and SHA-256. The files are taken
//   out unchanged: from the C&C GDI disc and its installer archive
//   (INSTALL/SETUP.Z), and from the Red Alert Allied disc (inside EA's .rar)
//   its REDALERT.MIX and the archives inside its MAIN.MIX. The cutscenes
//   (MOVIES.MIX, MOVIES1.MIX) are left out. tools/supertux/pack.mjs
//   packs each game's files into 1 MB blocks
//   (apps/cnc/data/<game>/<version>/<n>.bin) and data/<game>/index.json,
//   the files the game reads while starting first (tools/cnc/boot-<game>.txt).
//
// Unpacking EA's .rar takes unrar, run from Debian's non-free archive in
// Docker.
//
//   node tools/build-cnc.mjs [--engine | --data]
//   (--engine: leave data/ as it is; --data: leave engine/ as it is)
import { execFileSync } from 'node:child_process';
import { closeSync, copyFileSync, createReadStream, existsSync, mkdirSync, openSync, readFileSync, readSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pack, readBoot } from './supertux/pack.mjs';
import { installShieldFile, installShieldIndex, mixFile, mixIndex } from './cnc/westwood.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.cnc-build/`;
const app = `${root}apps/cnc/`;
const IMAGE = 'frunk-cnc-emsdk';

const VC_REPO = 'https://github.com/TheAssemblyArmada/Vanilla-Conquer.git';
const VC_COMMIT = 'ce83b59edd99cccac6cebaae054ca04962c744b7';   // vanilla, 2026-07-16
const ITEM = 'https://archive.org/download/official-cn-ctiberian-sun_202510/';
const DISCS = {
  gdi: { file: 'GDI95.iso', md5: '1cb7c6290718c5e729ae1a4a146aa793', sha256: 'c90b284d30ae48f7a2f5a92e7d70915f3c5562d9e8a149db920a6a6378c98462' },
  nod: { file: 'NOD95.iso', md5: '1dfb2ccae81117b053b60d70e8381250', sha256: '721df01b8d5bb11f39223232589b6d992d4d8a34539849d026030cc31c959b2a' },
  ra: { file: 'RedAlert1_AlliedDisc.rar', md5: '0a528b4d12d01b9076c16687ebf821b0', sha256: '6ca7c7c18bce37fc4c60b0aeeb5aea104160ac5aa1e305bde4f5bfbfb32b41c6' },
};
const RA_ISO = 'RedAlert1_AlliedDisc/RedAlert1_AlliedDisc/CD1_ALLIED_DISC.ISO';
const RA_EULA = 'RedAlert1_AlliedDisc/RedAlert1_AlliedDisc/EA Product EULA RedAlert1.rtf';

// What each game reads, by where it is on the disc. Each C&C disc has its
// own side's missions in GENERAL.MIX (and the other side's first), so
// those go in gdi/ and nod/, where the game looks for each disc's files.
const TD_DISC = ['CONQUER.MIX', 'DESERT.MIX', 'TEMPERAT.MIX', 'WINTER.MIX', 'SOUNDS.MIX', 'SCORES.MIX'];
// The installer's CCLOCAL.MIX has the English text (the one loose in the
// disc's INSTALL folder is German)
const TD_INSTALLER = ['CCLOCAL.MIX', 'UPDATE.MIX', 'UPDATEC.MIX', 'SPEECH.MIX', 'TRANSIT.MIX', 'DESEICNH.MIX', 'TEMPICNH.MIX', 'WINTICNH.MIX'];
const RA_MAIN = ['CONQUER.MIX', 'GENERAL.MIX', 'SCORES.MIX', 'SOUNDS.MIX', 'RUSSIAN.MIX', 'ALLIES.MIX', 'INTERIOR.MIX', 'SNOW.MIX', 'TEMPERAT.MIX'];

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const engineOnly = process.argv.includes('--engine');
const dataOnly = process.argv.includes('--data');

mkdirSync(work, { recursive: true });
mkdirSync(`${app}engine`, { recursive: true });

// ---------- engine ----------

const src = `${work}vanilla-conquer/`;
if (!dataOnly) {
  rmSync(src, { recursive: true, force: true });
  mkdirSync(src);
  run('git', ['-C', src, 'init', '--quiet']);
  run('git', ['-C', src, 'fetch', '--quiet', '--depth', '1', VC_REPO, VC_COMMIT]);
  run('git', ['-C', src, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);
  const head = execFileSync('git', ['-C', src, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (head !== VC_COMMIT) throw new Error(`Vanilla Conquer is ${head}, expected ${VC_COMMIT}`);
  // patch, not git apply: inside this repository's tree git apply skips files
  run('patch', ['-p1', '--quiet', '-d', src, '-i', `${root}tools/cnc/vanilla-conquer-web.patch`]);

  run('docker', ['build', '-q', '-t', IMAGE, `${root}tools/cnc`]);
  run('docker', [
    'run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`, '-e', 'HOME=/tmp',
    '-v', `${src}:/src`, '-w', '/src', IMAGE, 'sh', 'web/build.sh',
  ]);
  for (const game of ['vanillatd', 'vanillara'])
    for (const ext of ['js', 'wasm']) copyFileSync(`${src}build-web/${game}.${ext}`, `${app}engine/${game}.${ext}`);
  rmSync(`${src}build-web`, { recursive: true, force: true });
  const tarball = `vanilla-conquer-${VC_COMMIT.slice(0, 7)}-web-src.tar.gz`;
  run('tar', ['-czf', `${app}engine/${tarball}`, '--exclude=.git', '-C', work, 'vanilla-conquer']);
  copyFileSync(`${src}License.txt`, `${app}engine/License.txt`);
  copyFileSync(`${root}tools/cnc/vanilla-conquer-web.patch`, `${app}engine/vanilla-conquer-web.patch`);
  console.log(`built apps/cnc/engine/vanilla{td,ra}.{js,wasm} and ${tarball}`);
}

// ---------- game files ----------

async function disc({ file, md5, sha256 }) {
  const path = `${work}dl/${file}`;
  if (!existsSync(path)) {
    mkdirSync(`${work}dl`, { recursive: true });
    console.log(`downloading ${file}…`);
    run('curl', ['-sSfL', '-o', `${path}.part`, ITEM + encodeURIComponent(file)]);
    run('mv', [`${path}.part`, path]);
  }
  const hashes = await Promise.all(['md5', 'sha256'].map(algo => new Promise((resolve, reject) => {
    const h = createHash(algo);
    createReadStream(path).on('data', d => h.update(d)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
  })));
  if (hashes[0] !== md5 || hashes[1] !== sha256) throw new Error(`${file}: checksum mismatch`);
  return path;
}

// ISO 9660: { 'DIR/NAME': bytes } for the paths asked for
function fromIso(path, wanted) {
  const fd = openSync(path, 'r');
  const read = (offset, size) => {
    const buf = Buffer.alloc(size);
    readSync(fd, buf, 0, size, offset);
    return buf;
  };
  const pvd = read(16 * 2048, 2048);
  if (pvd.toString('latin1', 1, 6) !== 'CD001') throw new Error(`${path} isn't an ISO 9660 image`);
  const found = {};
  const walk = (extent, size, prefix) => {
    const dir = read(extent * 2048, size);
    for (let p = 0; p < size;) {
      const len = dir[p];
      if (!len) { p = (Math.floor(p / 2048) + 1) * 2048; continue; }
      const nameLen = dir[p + 32];
      const name = dir.toString('latin1', p + 33, p + 33 + nameLen).replace(/;1$/, '').replace(/\.$/, '');
      if (nameLen > 1 || dir[p + 33] > 1) {
        const at = dir.readUInt32LE(p + 2), bytes = dir.readUInt32LE(p + 10);
        if (dir[p + 25] & 2) walk(at, bytes, `${prefix}${name}/`);
        else if (wanted.includes(prefix + name)) found[prefix + name] = read(at * 2048, bytes);
      }
      p += len;
    }
  };
  walk(pvd.readUInt32LE(156 + 2), pvd.readUInt32LE(156 + 10), '');
  closeSync(fd);
  for (const w of wanted) if (!found[w]) throw new Error(`${w} isn't on ${path}`);
  return found;
}

function put(dir, name, bytes) {
  if (!bytes) throw new Error(`${name} not found`);
  writeFileSync(`${dir}${name}`, bytes);
}

if (!engineOnly) {
  const gameData = `${work}data/`;
  rmSync(gameData, { recursive: true, force: true });

  // Command & Conquer (Tiberian Dawn), the GDI and Nod discs
  const td = `${gameData}td/`;
  for (const d of ['gdi', 'nod']) mkdirSync(`${td}${d}`, { recursive: true });
  const tdDisc = fromIso(await disc(DISCS.gdi), [...TD_DISC, 'GENERAL.MIX', 'INSTALL/SETUP.Z', 'README.WRI']);
  for (const f of TD_DISC) put(td, f, tdDisc[f]);
  put(td, 'gdi/GENERAL.MIX', tdDisc['GENERAL.MIX']);
  put(td, 'nod/GENERAL.MIX', fromIso(await disc(DISCS.nod), ['GENERAL.MIX'])['GENERAL.MIX']);
  const setup = tdDisc['INSTALL/SETUP.Z'];
  const setupIndex = installShieldIndex(setup);
  for (const f of TD_INSTALLER) put(td, f, installShieldFile(setup, setupIndex, `C&C95\\${f}`));

  // Red Alert, the Allied disc inside EA's .rar
  const ra = `${gameData}ra/`;
  mkdirSync(ra, { recursive: true });
  const rar = await disc(DISCS.ra);
  const unpacked = `${work}ra-rar/`;
  if (!existsSync(`${unpacked}${RA_ISO}`)) {
    mkdirSync(unpacked, { recursive: true });
    run('docker', ['run', '--rm', '-v', `${work}:/w`, '-w', '/w', 'debian:bookworm-slim', 'sh', '-c',
      'sed -i "s/Components: main/Components: main non-free/" /etc/apt/sources.list.d/debian.sources'
      + ' && apt-get update -qq && apt-get install -y -qq unrar >/dev/null'
      + ` && unrar x -o+ -inul dl/${DISCS.ra.file} "${RA_ISO}" "${RA_EULA}" ra-rar/`
      + ` && chown -R ${process.getuid()}:${process.getgid()} ra-rar`]);
  }
  const raDisc = fromIso(`${unpacked}${RA_ISO}`, ['MAIN.MIX', 'INSTALL/REDALERT.MIX', 'README.TXT']);
  put(ra, 'REDALERT.MIX', raDisc['INSTALL/REDALERT.MIX']);
  const main = raDisc['MAIN.MIX'];
  const mainIndex = mixIndex(main, src);
  for (const f of RA_MAIN) put(ra, f, mixFile(main, mainIndex, f));

  // The games' own notices, to be read next to the files
  mkdirSync(`${app}data`, { recursive: true });
  writeFileSync(`${app}data/td-README.WRI`, tdDisc['README.WRI']);
  writeFileSync(`${app}data/ra-README.TXT`, raDisc['README.TXT']);
  copyFileSync(`${unpacked}${RA_EULA}`, `${app}data/ra-EA-EULA.rtf`);

  for (const game of ['td', 'ra']) {
    const out = `${app}data/${game}`;
    mkdirSync(out, { recursive: true });
    const packed = pack({ data: `${gameData}${game}`, out, ...readBoot(readFileSync(`${root}tools/cnc/boot-${game}.txt`, 'utf8')) });
    console.log(`packed apps/cnc/data/${game}/ (${packed.files} files, ${Math.round(packed.bytes / 1e6)} MB in ${packed.blocks} blocks, ${Math.round(packed.stored / 1e6)} MB stored, ${Math.round(packed.boot / 1e6)} MB read at start)`);
  }
}
