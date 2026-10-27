// Packs SuperTux's data folder for apps/supertux: every file, one after
// another, as one stream cut into 1 MB blocks (data/<version>/<n>.bin, or
// .bin.gz where gzip saves at least a tenth), and data/index.json listing
// the files in stream order with their sizes. The page mounts the files at
// /data and reads the blocks a file needs when the game reads it, so the
// car never holds more than a few dozen MB of the game's 300 MB.
//
// The files the game reads while it starts (boot.txt's [start], in the order
// it reads them) go first, so the page can fetch them all at once before the
// game runs, then the ones it reads next ([next]: the intro, the first world
// map and its first level), which the page fetches in the background. The
// rest follow folder by folder, so a sprite's images sit together.
//
//   import { pack, readBoot } from './supertux/pack.mjs';
//   pack({ data, out, ...readBoot(text) })
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

export const BLOCK = 1 << 20;

// boot.txt: { start: [paths], next: [paths] }
export function readBoot(text) {
  const lists = { start: [], next: [] };
  let list = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const section = /^\[(\w+)\]$/.exec(line);
    if (section) list = lists[section[1]];
    else if (list) list.push(line);
  }
  return lists;
}

function walk(dir, prefix = '', out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const rel = prefix + e.name;
    if (e.isDirectory()) walk(`${dir}/${e.name}`, rel + '/', out);
    else if (e.isFile()) out.push(rel);
  }
  return out;
}

export function pack({ data, out, start = [], next = [] }) {
  const all = walk(data);
  const known = new Set(all);
  const seen = new Set();
  const listed = list => list.filter(p => known.has(p) && !seen.has(p) && seen.add(p));
  const boot = listed(start), soon = listed(next);
  const first = [...boot, ...soon];
  const firstSet = new Set(first);
  // files before folders at each level, so a folder's own files stay together
  const rest = all.filter(p => !firstSet.has(p)).sort((a, b) => {
    const da = a.slice(0, a.lastIndexOf('/') + 1), db = b.slice(0, b.lastIndexOf('/') + 1);
    if (da !== db) return da < db ? -1 : 1;
    return a < b ? -1 : 1;
  });
  const order = [...first, ...rest];

  const sizes = order.map(p => statSync(`${data}/${p}`).size);
  const total = sizes.reduce((a, b) => a + b, 0);
  const bootBytes = sizes.slice(0, boot.length).reduce((a, b) => a + b, 0);
  const nextBytes = sizes.slice(boot.length, first.length).reduce((a, b) => a + b, 0);
  const blocks = Math.ceil(total / BLOCK);

  // the stream, block by block
  const hash = createHash('sha256');
  const parts = [];
  let buf = Buffer.alloc(BLOCK), fill = 0;
  const flush = () => { parts.push(buf.subarray(0, fill)); hash.update(buf.subarray(0, fill)); buf = Buffer.alloc(BLOCK); fill = 0; };
  for (const p of order) {
    const bytes = readFileSync(`${data}/${p}`);
    for (let at = 0; at < bytes.length;) {
      const take = Math.min(BLOCK - fill, bytes.length - at);
      bytes.copy(buf, fill, at, at + take);
      fill += take;
      at += take;
      if (fill === BLOCK) flush();
    }
  }
  if (fill) flush();
  hash.update(JSON.stringify(order.map((p, i) => [p, sizes[i]])));
  const version = hash.digest('hex').slice(0, 12);

  for (const f of readdirSync(out, { withFileTypes: true })) {
    if (f.isDirectory() && /^[0-9a-f]{12}$/.test(f.name)) rmSync(`${out}/${f.name}`, { recursive: true });
  }
  mkdirSync(`${out}/${version}`, { recursive: true });
  const gz = [];
  let stored = 0;
  parts.forEach((part, n) => {
    const packed = gzipSync(part, { level: 9 });
    if (packed.length <= part.length * 0.9) {
      gz.push(n);
      writeFileSync(`${out}/${version}/${n}.bin.gz`, packed);
      stored += packed.length;
    } else {
      writeFileSync(`${out}/${version}/${n}.bin`, part);
      stored += part.length;
    }
  });
  // boot and next: bytes from the start of the stream
  const index = { version, block: BLOCK, blocks, bytes: total, boot: bootBytes, next: bootBytes + nextBytes, gz, files: order.map((p, i) => [p, sizes[i]]) };
  writeFileSync(`${out}/index.json`, JSON.stringify(index));
  return { version, files: order.length, bytes: total, stored, boot: bootBytes, next: nextBytes, blocks, gz: gz.length };
}
