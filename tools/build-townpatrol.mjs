// Builds Town Patrol, Bjorn Nah's Atari Lynx game for LynxJam 2024 (code
// MIT; art from 0x72's "Lynx Robots", CC0), from its source at a fixed
// commit into apps/retro/games/townpatrol.lnx, the cartridge Retro Console
// plays. Its author offers no built cartridge outside itch.io, so this
// compiles one: cc65 (zlib license) and 42Bastian's sprite packer sprpck
// (Apache License 2.0), also at fixed commits, are built first, all in
// Docker. The game's source goes next to it as townpatrol-src.tar.gz, with
// this script.
//
//   node tools/build-townpatrol.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.townpatrol-build/`;
const games = `${root}apps/retro/games/`;
const IMAGE = 'emscripten/emsdk:4.0.10';   // for its gcc and make

const REPOS = {
  town_patrol: ['https://github.com/bjorn-nah/town_patrol.git', '3e13b03be153ad8b0ec0f1c82ff5f5fba2a578ff'],   // v0.4, 2025-01-21
  cc65: ['https://github.com/cc65/cc65.git', '5725066bfb86cdb52c8f4afb94b6401cb320cb21'],                     // 2026-10-24
  sprpck: ['https://github.com/42Bastian/sprpck.git', '9992cb675ebb76e357f8f5f132d09231182b4b3e'],            // 2026-06-01
};

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
for (const [name, [url, commit]] of Object.entries(REPOS)) {
  run('git', ['init', '--quiet', `${work}${name}`]);
  run('git', ['-C', `${work}${name}`, 'fetch', '--quiet', '--depth', '1', url, commit]);
  run('git', ['-C', `${work}${name}`, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);
}

// The game's Makefile names Windows tools (del, ..\sprite_packer\sprpck);
// the rest of it is used as it is
run('docker', [
  'run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`, '-v', `${work}:/w`, '-w', '/w', IMAGE,
  'bash', '-c', [
    'make -C cc65 -j8 bin lib QUIET=1 >/dev/null',
    'gcc -Os -DUNIX -o sprpck/sprpck sprpck/src/io.c sprpck/src/sprpck.c',
    'cd town_patrol',
    'PATH=/w/cc65/bin:$PATH make town_patrol CC65_HOME=/w/cc65 SPRPCK=/w/sprpck/sprpck RM="rm -f"',
  ].join(' && '),
]);

copyFileSync(`${work}town_patrol/town_patrol.lnx`, `${games}townpatrol.lnx`);
copyFileSync(`${root}tools/build-townpatrol.mjs`, `${work}town_patrol/build-townpatrol.mjs`);
run('git', ['-C', `${work}town_patrol`, 'add', 'build-townpatrol.mjs']);
run('git', ['-C', `${work}town_patrol`, '-c', 'user.name=frunk.store', '-c', 'user.email=frunkstore@protonmail.com',
  'commit', '--quiet', '-m', 'Add the build script used for frunk.store']);
run('git', ['-C', `${work}town_patrol`, 'archive', '--format=tar.gz', '--prefix=town_patrol/', '-o', `${games}townpatrol-src.tar.gz`, 'HEAD']);
console.log('built apps/retro/games/townpatrol.lnx and townpatrol-src.tar.gz');
