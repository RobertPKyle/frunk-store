// Compiles apps/fractal/fractal.wat into two binaries:
//   fractal.wasm     shared memory, used by the worker pool
//   fractal-st.wasm  plain memory, main-thread fallback when the page is not
//                    cross-origin isolated (no SharedArrayBuffer)
//
// Uses the wabt CLI because the JS API in wabt 1.0.39 ignores the threads
// feature flag and rejects shared memory.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = join(root, 'apps/fractal');
const wat2wasm = join(root, 'node_modules/wabt/bin/wat2wasm');
const src = readFileSync(join(dir, 'fractal.wat'), 'utf8');
const tmp = mkdtempSync(join(tmpdir(), 'frunk-wasm-'));

const variants = {
  'fractal.wasm': src,
  'fractal-st.wasm': src.replace('(memory 257 257 shared)', '(memory 257 257)'),
};

try {
  for (const [name, wat] of Object.entries(variants)) {
    const input = join(tmp, name + '.wat');
    writeFileSync(input, wat);
    execFileSync(process.execPath, [wat2wasm, '--enable-threads', input, '-o', join(dir, name)], { stdio: 'inherit' });
    console.log(`${name}: ${statSync(join(dir, name)).size} bytes`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
