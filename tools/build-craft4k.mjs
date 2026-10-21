// Builds Craft 4K: Minecraft4k-CPP by TheSunCat (GPL-3.0,
// https://github.com/TheSunCat/Minecraft4k-CPP) at the commit that added
// its license, the last before it was squeezed into a 4 KB Linux binary,
// with tools/craft4k/craft4k-web.patch and the browser front end
// tools/craft4k/web.cpp, compiled with Emscripten in Docker to
// apps/craft4k/engine/craft4k.{js,wasm}.
//
// The license asks for the source to go with the program, so the build also
// writes apps/craft4k/engine/craft4k-web-src.tar.gz: the sources compiled
// here (patched), the patch, web.cpp and this script.
//
//   node tools/build-craft4k.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const work = `${root}tools/.craft4k-build/`;
const out = `${root}apps/craft4k/engine/`;

const COMMIT = 'cfb537a35c85ee18b01b4305fd975740f67f0380';   // 2021-12-22, "Create LICENSE"
const IMAGE = 'emscripten/emsdk:4.0.10';

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

const src = `${work}Minecraft4k-CPP/`;
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
run('git', ['init', '--quiet', src]);
run('git', ['-C', src, 'fetch', '--quiet', 'https://github.com/TheSunCat/Minecraft4k-CPP.git', COMMIT]);
run('git', ['-C', src, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD']);
run('git', ['-C', src, 'apply', `${root}tools/craft4k/craft4k-web.patch`]);
for (const f of ['web.cpp', 'craft4k-web.patch']) copyFileSync(`${root}tools/craft4k/${f}`, `${src}${f}`);
// GLM's license, which the repository leaves out (GLM 0.9.9.8's copying.txt)
copyFileSync(`${root}tools/craft4k/GLM-copying.txt`, `${src}include/glm/copying.txt`);
copyFileSync(`${root}tools/build-craft4k.mjs`, `${src}build-craft4k.mjs`);

const cpp = ['web.cpp', 'World.cpp', 'TextureGenerator.cpp', 'Util.cpp'];
const exported = ['init', 'set_block', 'edits', 'edit_count', 'clear_edits', 'player', 'set_player', 'input', 'look',
  'break', 'place', 'frame'].map(f => `_c4k_${f}`).join(',');

mkdirSync(out, { recursive: true });
run('docker', [
  'run', '--rm', '-u', `${process.getuid()}:${process.getgid()}`,
  '-v', `${src}:/src`, '-v', `${out}:/out`, '-w', '/src', IMAGE,
  'bash', '-c',
  `em++ -std=c++17 -O3 -flto -DNDEBUG -Iinclude ${cpp.join(' ')} -o /out/craft4k.js ` +
    `-sMODULARIZE -sEXPORT_ES6 -sENVIRONMENT=web -sMIN_WEBGL_VERSION=2 -sMAX_WEBGL_VERSION=2 ` +
    `-sINITIAL_MEMORY=33554432 -sALLOW_MEMORY_GROWTH -sFILESYSTEM=0 ` +
    `-sEXPORTED_FUNCTIONS=${exported} -sEXPORTED_RUNTIME_METHODS=HEAPU32`,
]);

// The source that goes with it
rmSync(`${src}.git`, { recursive: true, force: true });
run('tar', ['-czf', `${out}craft4k-web-src.tar.gz`, '-C', work, '--exclude=Minecraft4k-CPP/glfw.lib', '--exclude=Minecraft4k-CPP/lib',
  'Minecraft4k-CPP']);
copyFileSync(`${src}LICENSE`, `${out}LICENSE`);
copyFileSync(`${src}include/glm/copying.txt`, `${out}GLM-LICENSE.txt`);
console.log('built apps/craft4k/engine/craft4k.{js,wasm} and craft4k-web-src.tar.gz');
