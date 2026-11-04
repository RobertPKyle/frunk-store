// Writes apps/beach/tides.json, NOAA's tide prediction stations in a form small
// enough for the car: its own list is 2 MB and hardly changes, so the app ships
// this copy and asks NOAA only for the predictions at the closest station.
//
//   node tools/build-beach-tides.mjs      # rerun now and then for new stations
import { writeFileSync } from 'node:fs';

const LIST = 'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions';
const out = new URL('../apps/beach/tides.json', import.meta.url);

const res = await fetch(LIST, { headers: { 'User-Agent': 'frunk.store build (https://frunk.store)' } });
if (!res.ok) throw new Error(`NOAA HTTP ${res.status}`);
const { stations } = await res.json();

// Some names are in capitals: NAWILIWILI, SAN DIEGO (Broadway)
const tidy = name => name.replace(/\b[A-Z]{3,}\b/g, word => word[0] + word.slice(1).toLowerCase());

const rows = stations
  .filter(s => Number.isFinite(s.lat) && Number.isFinite(s.lng) && s.id)
  .map(s => [s.id, tidy(s.name.trim()), +s.lat.toFixed(3), +s.lng.toFixed(3)]);
if (rows.length < 1000) throw new Error(`only ${rows.length} stations; not replacing the list`);

writeFileSync(out, JSON.stringify(rows));
console.log(`${rows.length} tide stations written`);
