// Makes apps/blocks' texture pack and sounds from Mineclonia's media, for
// tools/build-blocks.mjs:
//
// - textures.zip: the ClassiCube texture pack. terrain.png holds the block
//   tiles in the layout ClassiCube's blocks expect (Minecraft Classic's),
//   animations.png/.txt animate water, lava, fire and magma, and gui.png has
//   the hotbar. These come from Mineclonia's textures, which are based on
//   the Pixel Perfection packs (CC BY-SA 4.0). The buttons, crosshair and
//   clouds are drawn here, and the font (default.png) comes from Monocraft
//   (tools/blocks/font.mjs).
// - sounds/<name>.ogg: one file for each dig and step sound the web client
//   asks for, picked from Mineclonia's sounds (each one's license is in
//   their README, copied to SOUNDS-CREDITS.txt).
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { blank, crop, decodePng, draw, encodePng, scale, tint } from './png.mjs';
import { writeZip } from '../openarena/pk3.mjs';
import { bitmapFont } from './font.mjs';

// Grass and leaves in Mineclonia are grey and tinted by the biome; these are
// Minecraft's plains colours
const GRASS = [145, 189, 89];
const FOLIAGE = [119, 171, 47];

// ClassiCube's wool colours that Mineclonia has no wool for are tinted from
// white wool
const WOOL = {
  64: 'wool_red', 65: 'wool_orange', 66: 'wool_yellow', 67: 'mcl_wool_lime', 68: [60, 200, 60], 69: [40, 190, 130],
  70: 'wool_cyan', 71: 'mcl_wool_light_blue', 72: 'wool_blue', 73: [100, 80, 210], 74: 'wool_violet', 75: 'wool_magenta',
  76: 'wool_pink', 77: 'wool_black', 78: 'wool_grey', 79: 'wool_white',
  80: [250, 180, 200], 81: 'wool_dark_green', 82: 'wool_brown', 83: [40, 50, 150], 84: [50, 170, 170],
};

// terrain.png tile (row * 16 + column) -> texture
const TILES = {
  0: ['mcl_core_grass_block_top', GRASS], 1: 'default_stone', 2: 'default_dirt', 4: 'default_wood',
  5: 'mcl_stairs_stone_slab_side', 6: 'mcl_stairs_stone_slab_top', 7: 'default_brick',
  8: 'default_tnt_side', 9: 'default_tnt_top', 10: 'default_tnt_bottom', 11: 'mcl_lanterns_chain',
  12: 'mcl_flowers_poppy', 13: 'flowers_dandelion_yellow', 15: 'default_sapling',
  16: 'default_cobble', 17: 'mcl_core_bedrock', 18: 'default_sand', 19: 'default_gravel',
  20: 'default_tree', 21: 'default_tree_top', 22: ['default_leaves', FOLIAGE],
  23: 'default_steel_block', 39: 'default_steel_block', 55: 'default_steel_block',
  24: 'default_gold_block', 40: 'default_gold_block', 56: 'default_gold_block',
  25: 'mcl_core_sandstone_top', 41: 'mcl_core_sandstone_normal', 57: 'mcl_core_sandstone_bottom',
  26: 'mcl_nether_quartz_pillar_top', 42: 'mcl_nether_quartz_pillar_side', 58: 'mcl_nether_quartz_pillar_top',
  28: 'farming_mushroom_red', 29: 'farming_mushroom_brown',
  32: 'mcl_core_gold_ore', 33: 'mcl_core_iron_ore', 34: 'mcl_core_coal_ore', 35: 'default_bookshelf',
  36: 'default_mossycobble', 37: 'default_obsidian',
  48: 'mcl_sponges_sponge', 49: 'default_glass', 50: 'default_snow', 51: 'default_ice', 52: 'default_stone_brick',
  53: 'mcl_barrels_barrel_side', 54: 'mcl_nether_quartz_block_side',
};

// Animated tiles: tile -> [vertical strip of 16x16 frames, ticks per frame]
// (the game runs 20 ticks a second)
const ANIMATED = {
  14: ['default_water_source_animated', 2], 30: ['default_lava_source_animated', 3],
  38: ['fire_basic_flame_animated', 2], 86: ['mcl_nether_magma', 8],
};

// The web client's sound names -> Mineclonia sounds (repeated where there are
// fewer than four)
const SOUNDS = {
  cloth: { dig: ['mcl_sounds_cloth.1', 'mcl_sounds_cloth.2', 'mcl_sounds_cloth.3', 'mcl_sounds_cloth.4'] },
  grass: { dig: ['default_grass_footstep.1', 'default_grass_footstep.2', 'default_grass_footstep.3', 'default_dig_crumbly'] },
  glass: { dig: ['default_break_glass.1', 'default_break_glass.2', 'default_break_glass.3'], step: null },
  gravel: { dig: ['default_gravel_dug.1', 'default_gravel_dug.2', 'default_gravel_dug.3', 'default_gravel_dig.1'],
    step: ['default_gravel_footstep.1', 'default_gravel_footstep.2', 'default_gravel_footstep.3', 'default_gravel_footstep.4'] },
  sand: { dig: ['default_sand_footstep.1', 'default_sand_footstep.2', 'default_sand_footstep.3', 'default_dig_crumbly'],
    step: ['default_sand_footstep.1', 'default_sand_footstep.2', 'default_sand_footstep.3', 'default_sand_footstep.1'] },
  snow: { dig: ['pedology_snow_soft_footstep.1', 'pedology_snow_soft_footstep.2', 'pedology_snow_soft_footstep.1', 'pedology_snow_soft_footstep.2'] },
  stone: { dig: ['default_dig_cracky.1', 'default_dig_cracky.2', 'default_dig_cracky.3', 'default_place_node_hard.1'],
    step: ['default_hard_footstep.1', 'default_hard_footstep.2', 'default_hard_footstep.3', 'default_hard_footstep.1'] },
  wood: { dig: ['default_dig_choppy.1', 'default_dig_choppy.2', 'default_dig_choppy.3', 'default_dig_choppy.1'],
    step: ['default_wood_footstep.1', 'default_wood_footstep.2', 'default_wood_footstep.1', 'default_wood_footstep.2'] },
};

function indexFiles(dir, ext, map = new Map()) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) indexFiles(p, ext, map);
    else if (name.endsWith(ext) && !map.has(name.slice(0, -ext.length))) map.set(name.slice(0, -ext.length), p);
  }
  return map;
}

// A raised grey button, 200x20, like the game's own
function button(fill, light, dark) {
  const img = blank(200, 20);
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 200; x++) {
      const o = (y * 200 + x) * 4;
      const edge = x === 0 || y === 0 || x === 199 || y === 19;
      const c = edge ? [0, 0, 0] : x === 1 || y === 1 ? light : x === 198 || y === 18 || y === 17 ? dark : fill;
      // a little grain, the same every build
      const n = edge ? 0 : ((x * 7 + y * 13 + (x * y) % 5) % 9) - 4;
      img.data[o] = c[0] + n; img.data[o + 1] = c[1] + n; img.data[o + 2] = c[2] + n; img.data[o + 3] = 255;
    }
  }
  return img;
}

// Blocky clouds on a 256x256 tile that repeats: two octaves of a fixed value
// noise, cut at a level so about a third of the sky is cloud
function clouds() {
  const img = blank(256, 256);
  let seed = 1234567;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const octave = cell => {
    const n = 256 / cell, grid = Array.from({ length: n * n }, rnd);
    const at = (x, y) => grid[(y % n) * n + (x % n)];
    const ease = t => t * t * (3 - 2 * t);
    return (x, y) => {
      const fx = x / cell, fy = y / cell, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = ease(fx - x0), ty = ease(fy - y0);
      return (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty;
    };
  };
  const big = octave(32), small = octave(8);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const o = (y * 256 + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = big(x, y) * 0.75 + small(x, y) * 0.25 > 0.6 ? 255 : 0;
    }
  }
  return img;
}

// The touch screen's walking stick (touch.png): the game draws its four
// arrows from one triangle, pointing out from the stick's centre, whose apex
// is the top middle of a half-height strip and whose base is the strip's
// bottom edge. The top half of the image is a pressed arrow, the bottom
// half one at rest.
function stick() {
  const S = 256, H = S / 2;
  const img = blank(S, S);
  const shade = (half, fill, edge, mark) => {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < S; x++) {
        // inside the triangle when |x - mid| <= y / 2 (apex at the top)
        const d = y / 2 - Math.abs(x - S / 2);
        if (d < 0) continue;
        // a chevron near the base points the way
        const cx = Math.abs(x - S / 2), cy = H - 30 - y;
        const chevron = cx < 34 && Math.abs(cy - cx * 0.6) < 5;
        const c = chevron ? mark : d < 3 || y > H - 4 ? edge : fill;
        img.data.set(c, ((half * H + y) * S + x) * 4);
      }
    }
  };
  shade(0, [190, 220, 160, 200], [235, 245, 225, 230], [40, 60, 30, 230]);
  shade(1, [25, 30, 22, 120], [200, 210, 190, 150], [235, 240, 230, 200]);
  return img;
}

export function pack({ mineclonia, font, out }) {
  const textures = indexFiles(join(mineclonia, 'mods'), '.png');
  const png = name => {
    const p = textures.get(name);
    if (!p) throw new Error(`no texture ${name}.png in Mineclonia`);
    return decodePng(readFileSync(p));
  };
  const tile = img => (img.width === 16 && img.height === 16 ? img : scale(crop(img, 0, 0, img.width, img.width), 16, 16));

  // ---------- terrain.png ----------
  const terrain = blank(256, 256);
  const put = (i, img) => draw(terrain, tile(img), (i % 16) * 16, Math.floor(i / 16) * 16);
  for (const [i, t] of Object.entries(TILES)) put(+i, Array.isArray(t) ? tint(png(t[0]), t[1]) : png(t));
  // grass side: dirt with the tinted grass overlay on top
  const side = png('default_dirt');
  draw(side, tint(png('mcl_core_grass_block_side_overlay'), GRASS), 0, 0);
  put(3, side);
  const white = png('wool_white');
  for (const [i, w] of Object.entries(WOOL)) put(+i, typeof w === 'string' ? png(w) : tint(white, w.map(c => Math.min(255, c * 255 / 212))));

  // ---------- animations ----------
  const strips = Object.entries(ANIMATED).map(([i, [name, delay]]) => ({ i: +i, img: png(name), delay }));
  const width = Math.max(...strips.map(s => s.img.height));
  const anims = blank(Math.max(256, width), strips.length * 16);
  const lines = ['# <TileX> <TileY> <FrameX> <FrameY> <Frame size> <Frames count> <Tick delay>'];
  strips.forEach(({ i, img, delay }, row) => {
    const frames = img.height / 16;
    for (let f = 0; f < frames; f++) draw(anims, crop(img, 0, f * 16, 16, 16), f * 16, row * 16);
    put(i, crop(img, 0, 0, 16, 16));
    lines.push(`${i % 16} ${Math.floor(i / 16)} 0 ${row * 16} 16 ${frames} ${delay}`);
  });

  // ---------- gui.png (only its top half is used) and icons.png ----------
  const gui = blank(256, 256);
  draw(gui, png('mcl_inventory_hotbar'), 0, 0);
  draw(gui, png('mcl_inventory_hotbar_selected'), 0, 22);
  draw(gui, button([44, 44, 44], [70, 70, 70], [28, 28, 28]), 0, 46);       // disabled
  draw(gui, button([111, 111, 111], [168, 168, 168], [70, 70, 70]), 0, 66);  // normal
  draw(gui, button([120, 132, 190], [180, 192, 240], [70, 80, 130]), 0, 86); // selected
  const icons = blank(256, 256);
  for (let k = 0; k < 15; k++) {
    for (const [x, y] of [[k, 7], [7, k]]) {
      const o = (y * 256 + x) * 4;
      icons.data.set([255, 255, 255, 255], o);
    }
  }

  const files = [
    { name: 'terrain.png', data: encodePng(terrain) },
    { name: 'animations.png', data: encodePng(anims) },
    { name: 'animations.txt', data: Buffer.from(lines.join('\n') + '\n') },
    { name: 'gui.png', data: encodePng(gui) },
    // the "classic style" GUI, the game's default, looks the same here
    { name: 'gui_classic.png', data: encodePng(gui) },
    { name: 'default.png', data: encodePng(bitmapFont(font)) },
    { name: 'touch.png', data: encodePng(stick()) },
    { name: 'icons.png', data: encodePng(icons) },
    { name: 'char.png', data: encodePng(png('character')) },
    { name: 'clouds.png', data: encodePng(clouds()) },
  ];
  mkdirSync(out, { recursive: true });
  writeZip(join(out, 'textures.zip'), files);

  // ---------- sounds ----------
  const sounds = indexFiles(join(mineclonia, 'mods'), '.ogg');
  const soundDir = join(out, 'sounds');
  rmSync(soundDir, { recursive: true, force: true });
  mkdirSync(soundDir);
  const used = new Set();
  for (const [group, kinds] of Object.entries(SOUNDS)) {
    for (const kind of ['dig', 'step']) {
      const list = kind in kinds ? kinds[kind] : kinds.dig;
      if (!list) continue;
      list.forEach((name, n) => {
        const p = sounds.get(name);
        if (!p) throw new Error(`no sound ${name}.ogg in Mineclonia`);
        copyFileSync(p, join(soundDir, `${kind}_${group}${n + 1}.ogg`));
        used.add(name);
      });
    }
  }
  copyFileSync(join(mineclonia, 'mods/CORE/mcl_sounds/README.txt'), join(out, 'SOUNDS-CREDITS.txt'));
  return { files: files.map(f => f.name), sounds: [...used].sort() };
}
