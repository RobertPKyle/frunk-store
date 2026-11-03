// The words behind What's Under Me: plain explanations of geologic time, rock
// types and the places rock forms, written for people who aren't geologists.
// Ages are millions of years ago, from the International Chronostratigraphic
// Chart; colors are its standard ones.

export const PERIODS = [
  { name: 'Quaternary', from: 2.58, color: '#F9F97F', then: 'Ice ages come and go. Mammoths roam, and modern humans spread across the planet.' },
  { name: 'Neogene', from: 23.03, color: '#FFE619', then: 'Grasslands spread and the continents are nearly where they are today. Early human ancestors appear in Africa near the end.' },
  { name: 'Paleogene', from: 66, color: '#FD9A52', then: 'The big dinosaurs are gone. Mammals take over, and the first whales, horses and primates appear.' },
  { name: 'Cretaceous', from: 145, color: '#7FC64E', then: 'Flowering plants appear. Tyrannosaurus and Triceratops live near the end, when an asteroid strike wipes out the big dinosaurs.' },
  { name: 'Jurassic', from: 201.4, color: '#34B2C9', then: 'Giant long-necked dinosaurs walk the land and the first birds appear, as the supercontinent Pangaea breaks apart.' },
  { name: 'Triassic', from: 251.9, color: '#812B92', then: 'Life recovers from Earth\'s worst mass extinction. The first dinosaurs and mammals appear on the supercontinent Pangaea.' },
  { name: 'Permian', from: 298.9, color: '#F04028', then: 'The land joins into one supercontinent, Pangaea. The period ends with Earth\'s worst mass extinction.' },
  { name: 'Carboniferous', from: 358.9, color: '#67A599', then: 'Vast swamp forests grow and later turn into coal. Dragonfly-like insects reach the size of hawks, and the first reptiles appear.' },
  { name: 'Devonian', from: 419.2, color: '#CB8C37', then: 'Called the Age of Fishes. The first forests grow, and the first animals with legs crawl onto land.' },
  { name: 'Silurian', from: 443.8, color: '#B3E1B6', then: 'Coral reefs spread through warm seas, jawed fish appear, and the first small plants take hold on land.' },
  { name: 'Ordovician', from: 485.4, color: '#009270', then: 'Seas fill with trilobites and giant shelled squid-like animals. The land is still almost bare.' },
  { name: 'Cambrian', from: 538.8, color: '#7FA056', then: 'Animal life bursts out across the seas, including the first trilobites. Nothing lives on land yet.' },
  { name: 'Proterozoic', from: 2500, color: '#F73563', then: 'Life is almost all microbes. They fill the air with oxygen for the first time. The first soft-bodied animals appear only at the very end.' },
  { name: 'Archean', from: 4031, color: '#F0047F', then: 'The first continents form and the first microbes appear. The air has no oxygen to breathe.' },
  { name: 'Hadean', from: 4567, color: '#AE027E', then: 'Earth is newly formed, hot and battered by asteroids. Almost no rock from this time survives.' },
];

export const periodAt = ma => PERIODS.find(p => ma <= p.from) || PERIODS[PERIODS.length - 1];

// First match wins, so the more specific rocks come first. `pattern` is the
// mark geologic maps use for that rock.
export const ROCKS = [
  { match: /alluvi|floodplain|stream|terrace|river|fluvial/, name: 'River sediment', pattern: 'dots', what: 'Sand, silt and gravel dropped by rivers and floods. It\'s still loose, not yet pressed into stone.' },
  { match: /glacial|till\b|moraine|drift\b|outwash/, name: 'Glacial deposit', pattern: 'pebbles', what: 'Rock and grit bulldozed and left behind by glaciers when the ice melted.' },
  { match: /loess/, name: 'Loess', pattern: 'dashes', what: 'Fine dust blown in by the wind and piled up over thousands of years.' },
  { match: /\bdune|eolian|aeolian/, name: 'Dune sand', pattern: 'dots', what: 'Sand piled up by the wind, as in a desert or behind a beach.' },
  { match: /peat|coal|lignite/, name: 'Coal', pattern: 'dashes', what: 'Plants from ancient swamps, buried and pressed until they turned to carbon.' },
  { match: /gypsum|evaporite|halite|\bsalt\b|anhydrite/, name: 'Evaporite', pattern: 'dashes', what: 'Minerals left behind when a salty sea or lake dried up.' },
  { match: /conglomerate|breccia|gravel|cobble/, name: 'Conglomerate', pattern: 'pebbles', what: 'Rounded pebbles and stones cemented together, usually left by fast rivers.' },
  { match: /limestone|carbonate|chalk|dolomite|dolostone|marl/, name: 'Limestone', pattern: 'bricks', what: 'Mostly the shells and skeletons of sea creatures, so it usually marks an old sea floor.' },
  { match: /sandstone/, name: 'Sandstone', pattern: 'dots', what: 'Sand from an ancient beach, river or desert, pressed and cemented into stone.' },
  { match: /\bsand\b/, name: 'Sand', pattern: 'dots', what: 'Loose grains of worn-down rock that haven\'t yet been pressed into stone.' },
  { match: /siltstone|mudstone|shale|claystone|argillite/, name: 'Shale', pattern: 'dashes', what: 'Fine mud that settled in still water, such as a sea or lake, and hardened in thin layers.' },
  { match: /\bsilt\b|\bclay\b|\bmud\b/, name: 'Mud and clay', pattern: 'dashes', what: 'Fine sediment that settled in slow or still water and hasn\'t yet hardened.' },
  { match: /basalt|lava/, name: 'Basalt', pattern: 'vees', what: 'Dark rock from runny lava, the same kind that forms Hawaii and the ocean floor.' },
  { match: /andesite|rhyolite|dacite|tuff|\bash\b|volcanic/, name: 'Volcanic rock', pattern: 'vees', what: 'Rock made by volcanoes, from lava flows or from ash that settled and hardened.' },
  { match: /granit|granodiorite|diorite|gabbro|plutonic|intrusive|monzonite|tonalite/, name: 'Granite-like rock', pattern: 'plus', what: 'Magma that cooled slowly deep underground, then was exposed as the rock above it wore away.' },
  { match: /gneiss|schist|slate|phyllite|quartzite|marble|metamorphic|migmatite/, name: 'Metamorphic rock', pattern: 'waves', what: 'Older rock squeezed and heated deep in the Earth until it changed into something new, often where continents collided.' },
  { match: /igneous/, name: 'Igneous rock', pattern: 'plus', what: 'Rock that cooled from molten magma or lava.' },
  { match: /unconsolidated|surficial|sediment/, name: 'Loose sediment', pattern: 'dots', what: 'Sand, mud and gravel laid down recently enough that it hasn\'t yet turned to stone.' },
];

// Given descriptions, most telling first. Each is tried against every rock, so
// a layer that's mostly shale isn't called limestone for a passing mention.
export function rockFrom(texts) {
  for (const text of texts) {
    const hit = ROCKS.find(r => r.match.test(String(text || '').toLowerCase()));
    if (hit) return hit;
  }
  return null;
}

// Where the sediment settled, from Macrostrat's environment names
const PLACES = [
  [/eolian|dune/, 'wind-blown desert dunes'],
  [/glacial/, 'glaciers'],
  [/lacustrine|lake/, 'a lake'],
  [/fluvial|channel|floodplain|alluvial|levee/, 'rivers and floodplains'],
  [/paludal|swamp|marsh|bog/, 'a swamp'],
  [/reef/, 'a reef'],
  [/lagoon|estuar|delta|tidal|peritidal|shoreface|beach|barrier|coastal|foreshore/, 'a coastline'],
  [/subtidal|shelf|platform|shallow|inner|outer|ramp/, 'a shallow sea'],
  [/offshore|basin|slope|deep|pelagic|submarine/, 'a deep sea'],
  [/volcanic|pyroclastic/, 'volcanoes'],
  [/plutonic|metamorphic/, 'deep underground'],
];

export function placesFrom(names) {
  const found = [];
  for (const name of names) {
    const hit = PLACES.find(([re]) => re.test(name.toLowerCase()));
    if (hit && !found.includes(hit[1])) found.push(hit[1]);
  }
  return found.slice(0, 3);
}

export function climateAt(lat) {
  const a = Math.abs(lat);
  return a < 23.5 ? 'the tropics' : a < 35 ? 'the subtropics' : a < 66.5 ? 'the mild middle latitudes' : 'the polar regions';
}

// Fossil groups, most exciting first. Each record is sorted into the first that fits.
export const FOSSILS = [
  { key: 'dinosaurs', name: 'Dinosaurs' },
  { key: 'mammals', name: 'Mammals', test: r => /mammalia/i.test(r.cll) },
  { key: 'reptiles', name: 'Reptiles, birds and amphibians', test: r => /reptilia|amphibia|aves|testudines|saurischia|ornithischia|ichthyosauria|sauropterygia/i.test(r.cll) },
  { key: 'fish', name: 'Fish and sharks', test: r => /osteichthyes|actinopt|chondrichthyes|sarcopterygii|placodermi|agnatha|acanthodii/i.test(r.cll) },
  { key: 'trilobites', name: 'Trilobites', test: r => /trilobita/i.test(r.cll) },
  { key: 'ammonites', name: 'Ammonites and squid relatives', test: r => /cephalopoda/i.test(r.cll) },
  { key: 'insects', name: 'Insects and spiders', test: r => /insecta|arachnida/i.test(r.cll) },
  { key: 'plants', name: 'Plants', test: r => /phyta$/i.test(r.phl) || /opsida$/i.test(r.cll) },
  { key: 'shells', name: 'Shells', test: r => /bivalvia|gastropoda/i.test(r.cll) || /brachiopoda/i.test(r.phl) },
  { key: 'reefs', name: 'Corals, urchins and sea lilies', test: r => /cnidaria|bryozoa|porifera|echinodermata/i.test(r.phl) },
  { key: 'other', name: 'Other life', test: () => true },
];

// Small field-guide marks, one per group
export const ICONS = {
  dinosaurs: '<path d="M3 15c3-1 3-5 6-6 2 0 3 1 5 1 2-2 2-5 4-6 1 0 2 0 3 1l-2 1c-1 1-1 4-2 6-1 3-3 4-5 4v4h-2v-4H9v4H7v-4c-1 0-3 0-4-1z"/>',
  mammals: '<path d="M7 3c2 0 3 1 5 1s3-1 5-1c3 0 4 3 3 6-1 2-1 5-2 8-1 3-2 4-3 4-2 0-2-5-3-5s-1 5-3 5c-1 0-2-1-3-4-1-3-1-6-2-8-1-3 0-6 3-6z"/>',
  reptiles: '<path d="M2 12c2-3 6-5 11-5 3 0 5 1 7 2l2 2-2 1c-2 1-4 3-7 3l1 3h-2l-1-3-3-1-1 3H5l1-4c-2 0-3 0-4-1z"/>',
  fish: '<path d="M2 12c3-4 7-6 11-5 3 1 5 3 6 5l3-3v6l-3-3c-1 2-3 4-6 5-4 1-8-1-11-5z"/>',
  trilobites: '<path d="M12 2c4 0 7 2 7 5 0 2-1 3-3 3l2 1-2 1 2 1-2 1 2 1-3 1 1 2c-1 2-3 3-4 3s-3-1-4-3l1-2-3-1 2-1-2-1 2-1-2-1 2-1C6 10 5 9 5 7c0-3 3-5 7-5z"/>',
  ammonites: '<path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M12 12c0-1.5 2-1.5 2 0 0 2.5-4 3-4.5 0-.5-3.5 5-5.5 7.5-2.5 3 3.5 0 9-5 9-6 0-9-6-6.5-11C8 3 14 2 18 4.5"/>',
  insects: '<path d="M11 8h2v13h-2zM9 4l2 3h2l2-3 1 1-2 3-1 1h-2l-1-1-2-3zM3 8c3 0 6 1 8 4-3 1-7 0-8-2zM21 8c-3 0-6 1-8 4 3 1 7 0 8-2zM5 15c2-1 4-1 6 0-1 2-5 3-6 2zM19 15c-2-1-4-1-6 0 1 2 5 3 6 2z"/>',
  plants: '<path d="M20 3C10 3 5 8 5 14c0 2 .5 3 1 4l-2 3 1.5 1 2-3c1 .5 2 1 4 1 6 0 9-7 8.5-17zM8 17c2-4 5-7 8-9-2 3-5 6-7 10z"/>',
  shells: '<path d="M12 21l-3-2c-4-2-7-6-7-10 0-1 1-2 2-2 0-2 2-3 3-3 1-1 3-2 5-2s4 1 5 2c1 0 3 1 3 3 1 0 2 1 2 2 0 4-3 8-7 10z"/>',
  reefs: '<path d="M11 22V13L6 8V3h2v4l3 3V2h2v8l3-3V3h2v5l-5 5v9z"/>',
  other: '<circle cx="12" cy="12" r="4"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="7" r="2.5"/><circle cx="7" cy="19" r="2.5"/><circle cx="18" cy="18" r="1.5"/>',
};
