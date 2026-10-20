// Repacks OpenArena 0.8.8's baseoa into what apps/openarena downloads: one
// core pk3 (menus, weapons, items, effects, sounds and a roster of player
// models) and one small pk3 per map with just what that map adds (its bsp,
// bot navigation, textures, skies, sounds and music). The files are
// OpenArena's own, unchanged, except scripts/bots.txt, which lists only the
// bots whose player models are in the roster.
//
// Which files a map or model needs is worked out the way the engine looks
// them up: shader names from the bsp's shader and fog lumps and the md3
// surfaces, the images in those shaders' stages (or the image of the same
// name when no shader script defines one), and the sounds, models and music
// named in the map's entities. Paths named in the game code (the qvms) and the
// engine (its wasm) go in the core pk3.
import { readFileSync } from 'node:fs';
import { readZip, writeZip } from './pk3.mjs';

// The paks in the order the engine searches them, last first
const PAKS = ['pak0', 'pak1-maps', 'pak2-players', 'pak4-textures', 'pak5-TA', 'pak6-misc', 'pak6-patch085', 'pak6-patch088'];
// pak2-players-mature.pk3 isn't read at all, and these models are left out
// wherever their files are
const MATURE = ['angelyss', 'arachna', 'ayumi', 'sorceress', 'hnt'];
// Folders the core pk3 takes whole
const CORE_DIRS = ['botfiles/', 'gfx/', 'icons/', 'menu/', 'models/ammo/', 'models/flags/', 'models/gibs/', 'models/powerups/',
  'models/weaphits/', 'models/weapons/', 'models/weapons2/', 'models/misc/', 'scripts/', 'sound/feedback/', 'sound/items/', 'sound/le/',
  'sound/misc/', 'sound/movers/', 'sound/weapons/', 'sprites/', 'vm/'];
const CORE_FILES = ['default.cfg', 'sprees.dat', 'copying', 'credits', 'license.txt', 'readme', 'readme.txt'];
const ROOTS = 'models|sound|gfx|sprites|icons|menu|music|textures|env|ui|botfiles|scripts|levelshots|maps';
const IMAGE_EXTS = ['.tga', '.jpg', '.png'];
const SOUND_EXTS = ['.wav', '.ogg'];

const lower = s => s.toLowerCase().replace(/\\/g, '/');
const stripExt = s => s.replace(/\.[^./]*$/, '');

export function openBaseoa(dir) {
  const index = new Map();   // lower-case name -> { name, read }
  const zips = [];
  for (const pak of PAKS) {
    const files = readZip(`${dir}/${pak}.pk3`);
    zips.push(files);
    for (const f of files) {
      const name = lower(f.name);
      const player = name.match(/^(?:models|sound)\/players?\/([^/]+)\//);
      if (player && MATURE.includes(player[1])) continue;
      index.set(name, f);
    }
  }
  const shaders = parseShaders(index);
  return { index, shaders, close: () => zips.forEach(z => z.close()) };
}

// shader name -> [image paths] from every scripts/*.shader
function parseShaders(index) {
  const defs = new Map();
  for (const [name, f] of index) {
    if (!name.startsWith('scripts/') || !name.endsWith('.shader')) continue;
    const text = f.read().toString('latin1').replace(/\/\/[^\n]*/g, '');
    const tokens = text.match(/"[^"]*"|[{}]|[^\s{}]+/g) || [];
    for (let i = 0; i < tokens.length; i++) {
      const shader = lower(tokens[i]);
      if (tokens[i + 1] !== '{') continue;
      const images = [];
      let depth = 0, j = i + 1;
      for (; j < tokens.length; j++) {
        const t = tokens[j];
        if (t === '{') depth++;
        else if (t === '}') { if (--depth === 0) break; }
        const k = t.toLowerCase();
        if (k === 'map' || k === 'clampmap') images.push(tokens[j + 1]);
        else if (k === 'animmap') {
          for (let n = j + 2; n < tokens.length && !/^[{}]$/.test(tokens[n]) && /\//.test(tokens[n]); n++) images.push(tokens[n]);
        } else if (k === 'skyparms') {
          for (const box of [tokens[j + 1], tokens[j + 3]]) {
            if (box && box !== '-') for (const side of ['rt', 'bk', 'lf', 'ft', 'up', 'dn']) images.push(`${box}_${side}`);
          }
        }
      }
      const list = defs.get(stripExt(shader)) || [];
      list.push(...images.filter(m => m && !m.startsWith('$') && !m.startsWith('*')).map(m => lower(m.replace(/"/g, ''))));
      defs.set(stripExt(shader), list);
      i = j;
    }
  }
  return defs;
}

// A set of files and the paths they need, resolved against baseoa
export function collector({ index, shaders }) {
  const files = new Set();
  const seen = new Set();
  const missing = new Set();
  const addFile = name => {
    if (files.has(name)) return true;
    const f = index.get(name);
    if (!f) return false;
    files.add(name);
    if (name.endsWith('.md3')) {
      for (const s of md3Shaders(f.read())) want(s);
      const base = stripExt(name);
      for (const lod of [`${base}_1.md3`, `${base}_2.md3`]) addFile(lod);
    } else if (name.endsWith('.skin')) {
      for (const line of f.read().toString('latin1').split(/\r?\n/)) {
        const path = line.split(',')[1];
        if (path && path.trim()) want(path.trim());
      }
    }
    return true;
  };
  const addImage = ref => {
    const base = stripExt(ref);
    let found = false;
    for (const ext of IMAGE_EXTS) found = addFile(base + ext) || found;
    return found;
  };
  function want(ref) {
    ref = lower(ref).replace(/^\/+/, '');
    if (!ref || seen.has(ref)) return;
    seen.add(ref);
    if (addFile(ref)) return;
    const def = shaders.get(stripExt(ref));
    if (def) { for (const img of def) if (!addImage(img)) missing.add(img); return; }
    if (addImage(ref)) return;
    const base = stripExt(ref);
    for (const ext of [...SOUND_EXTS, '.md3']) if (addFile(base + ext)) return;
    missing.add(ref);
  }
  const wantDir = prefix => { for (const name of index.keys()) if (name.startsWith(prefix)) addFile(name); };
  return { files, missing, want, wantDir, addFile };
}

function md3Shaders(buf) {
  if (buf.toString('latin1', 0, 4) !== 'IDP3') return [];
  const out = [];
  let surf = buf.readInt32LE(100);
  for (let s = 0, n = buf.readInt32LE(84); s < n; s++) {
    const numShaders = buf.readInt32LE(surf + 76), ofsShaders = buf.readInt32LE(surf + 92), end = buf.readInt32LE(surf + 104);
    for (let i = 0; i < numShaders; i++) {
      const at = surf + ofsShaders + i * 68;
      out.push(buf.toString('latin1', at, at + 64).replace(/\0.*$/s, ''));
    }
    surf += end;
  }
  return out;
}

// What a map's bsp names: shaders, and the entities' sounds, models and music
export function bspRefs(buf) {
  if (buf.toString('latin1', 0, 4) !== 'IBSP') throw new Error('not a Quake 3 bsp');
  const lump = n => [buf.readInt32LE(8 + n * 8), buf.readInt32LE(12 + n * 8)];
  const refs = [];
  for (const n of [1, 12]) {
    const [at, len] = lump(n);
    for (let p = at; p + 72 <= at + len; p += 72) refs.push(buf.toString('latin1', p, p + 64).replace(/\0.*$/s, ''));
  }
  const [eat, elen] = lump(0);
  const ents = buf.toString('latin1', eat, eat + elen);
  for (const [, key, value] of ents.matchAll(/"([^"]*)"\s+"([^"]*)"/g)) {
    const k = key.toLowerCase();
    if (k === 'noise' || k === 'model' || k === 'model2' || k === 'sound') { if (!value.startsWith('*')) refs.push(value); }
    else if (k === 'music') refs.push(...value.split(/\s+/));
    else if (k === '_remap') refs.push(value.split(';')[1] || '');
  }
  return refs.filter(Boolean);
}

// Paths named in a binary (the qvms, the engine): every string that starts
// with one of the game's folders
export function binaryRefs(buf) {
  const re = new RegExp(`(?:^|[^\\w/])((?:${ROOTS})/[\\w\\-/.]+)`, 'gi');
  return [...buf.toString('latin1').matchAll(re)].map(m => m[1]);
}

export function pack({ baseoa, engineWasm, out, maps, roster, log = console.log }) {
  const oa = openBaseoa(baseoa);
  const { index } = oa;

  // ---------- core ----------
  const core = collector(oa);
  for (const d of CORE_DIRS) core.wantDir(d);
  for (const f of CORE_FILES) core.addFile(f);
  for (const model of roster) { core.wantDir(`models/players/${model}/`); core.wantDir(`sound/player/${model}/`); }
  for (const name of index.keys()) if (/^sound\/player\/[^/]+$/.test(name) || /^sound\/player\/(footsteps|announcer)\//.test(name)) core.addFile(name);
  const refs = [...[...index.keys()].filter(n => n.startsWith('vm/')).flatMap(n => binaryRefs(index.get(n).read())), ...binaryRefs(readFileSync(engineWasm))];
  // (not the players' models and sounds, only the roster's; not the team
  // games' announcements: only free-for-all matches are played)
  for (const r of refs) if (!/\/players?\/|^sound\/teamplay\//i.test(r)) core.want(r);
  // effects, icons and the roster's skins defined in shader scripts: every
  // shader but the maps' surfaces, skies and objects (the game code names
  // many effects by building their names, so they aren't all in its strings)
  const coreShaders = [...oa.shaders.keys()].filter(s => !/^(textures|env|levelshots|maps|models\/(mapobjects|map|desertfactory|dpoints))\//.test(s)
    && (!/^models\/players\/([^/]+)\//.test(s) || roster.includes(s.split('/')[2])));
  for (const s of coreShaders) core.want(s);
  const bots = filterBots(index.get('scripts/bots.txt').read().toString('latin1'), roster);
  const coreList = [...core.files].sort().map(name => ({ name: index.get(name).name, data: name === 'scripts/bots.txt' ? Buffer.from(bots, 'latin1') : index.get(name).read() }));
  writeZip(`${out}/oa-core.pk3`, coreList);
  const size = list => list.reduce((s, f) => s + f.data.length, 0);
  log(`oa-core.pk3: ${coreList.length} files, ${(size(coreList) / 1e6).toFixed(1)} MB unpacked`);

  // ---------- maps ----------
  const result = {};
  for (const map of maps) {
    const m = collector(oa);
    for (const name of core.files) m.files.add(name);
    const bsp = `maps/${map}.bsp`;
    if (!m.addFile(bsp)) throw new Error(`no ${bsp}`);
    m.addFile(`maps/${map}.aas`);
    m.wantDir(`maps/${map}/`);
    for (const ext of IMAGE_EXTS) m.addFile(`levelshots/${map}${ext}`);
    for (const r of bspRefs(index.get(bsp).read())) m.want(r);
    const own = [...m.files].filter(n => !core.files.has(n)).sort();
    const list = own.map(name => ({ name: index.get(name).name, data: index.get(name).read() }));
    writeZip(`${out}/oa-map-${map}.pk3`, list);
    result[map] = { files: list.length, bytes: size(list), missing: [...m.missing].filter(r => !core.missing.has(r)) };
    log(`oa-map-${map}.pk3: ${list.length} files, ${(size(list) / 1e6).toFixed(1)} MB unpacked${result[map].missing.length ? `; not in baseoa: ${result[map].missing.join(' ')}` : ''}`);
  }
  oa.close();
  const botNames = [...bots.matchAll(/\bname\s+"?([^"\r\n]+)/gi)].map(m => m[1].trim());
  return { core: { files: coreList.length, missing: [...core.missing] }, maps: result, bots: botNames };
}

// bots.txt with only the bots whose player model is in the roster
function filterBots(text, roster) {
  return text.replace(/\{[^{}]*\}\s*/g, block => {
    const model = (block.match(/\bmodel\s+"?([^"\s/]+)/i) || [])[1];
    return model && roster.includes(model.toLowerCase()) ? block : '';
  });
}
