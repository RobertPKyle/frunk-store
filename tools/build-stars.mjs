// Builds apps/stars/sky.json from the d3-celestial data set
// (https://github.com/ofrohn/d3-celestial, BSD-3-Clause, Copyright (c) 2015
// Olaf Frohn). Keeps only what the Star Map draws, in compact arrays.
//
//   node tools/build-stars.mjs
import { writeFileSync } from 'node:fs';

const BASE = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/';
const MAG_LIMIT = 5.5;        // naked eye from a dark campsite
const NAMED_MAG_LIMIT = 2.6;  // label only the brightest named stars

async function get(file) {
  const res = await fetch(BASE + file);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return res.json();
}

// d3-celestial stores RA as longitude in -180..180 degrees
const ra = lon => +(lon < 0 ? lon + 360 : lon).toFixed(3);
const dec = lat => +lat.toFixed(3);

const [stars, lines, cons, names] = await Promise.all([
  get('stars.6.json'), get('constellations.lines.json'), get('constellations.json'), get('starnames.json'),
]);

const out = { stars: [], lines: [], cons: [], names: [] };

for (const f of stars.features) {
  const { mag, bv } = f.properties;
  if (mag > MAG_LIMIT) continue;
  const [lon, lat] = f.geometry.coordinates;
  out.stars.push([ra(lon), dec(lat), +mag.toFixed(2), +(parseFloat(bv) || 0.6).toFixed(2)]);
  const name = names[f.id]?.name;
  if (name && mag <= NAMED_MAG_LIMIT) out.names.push([ra(lon), dec(lat), name]);
}

for (const f of lines.features) {
  for (const line of f.geometry.coordinates) out.lines.push(line.map(([lon, lat]) => [ra(lon), dec(lat)]));
}

for (const f of cons.features) {
  const [lon, lat] = f.geometry.coordinates;
  out.cons.push([ra(lon), dec(lat), f.properties.name, +f.properties.rank]);
}

out.stars.sort((a, b) => a[2] - b[2]); // brightest first, drawn last-to-first
const file = new URL('../apps/stars/sky.json', import.meta.url);
writeFileSync(file, JSON.stringify(out));
console.log(`stars ${out.stars.length}, lines ${out.lines.length}, constellations ${out.cons.length}, names ${out.names.length}`);
