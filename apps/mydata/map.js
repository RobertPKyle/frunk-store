// Which app each stored thing belongs to, and what kind of thing it is. Every
// app runs on this one origin, so they share localStorage, IndexedDB and
// Cache Storage; the names here were read from each app's code.
//
// Kinds:
//   save  saves, progress and settings: lost for good when cleared
//   own   files the player sent from a phone (their own games): gone until sent again
//   data  game data and app files downloaded from frunk.store: downloaded again when needed
// Only saves go into a backup: the rest is on the phone already, or on the server.

// Names as the hub shows them (hub/catalog.json), plus groups that aren't one app
export const NAMES = {
  adventure: 'Adventure Games', arcade: 'Arcade', ascii: 'ASCII Quests', audiobooks: 'Audiobooks', beach: 'Beach Conditions',
  billiards: 'Billiards', blake: 'Blake Stone', blocks: 'Block Builder', brain: 'Brain Test', breakout: 'Brick Breaker',
  chess: 'Chess Puzzle', city: 'City Builder', cnc: 'Command & Conquer', cosmo: 'Cosmo\'s Cosmic Adventure', craft4k: 'Craft 4K',
  critter: 'Critical Mass', deathrally: 'Death Rally', doom: 'Freedoom', duke2: 'Duke Nukem II', duke3d: 'Duke Nukem 3D',
  elderscrolls: 'The Elder Scrolls', fheroes2: 'fheroes2', fireplace: 'Campfire', fractal: 'Fractal Explorer', heretic: 'Blasphemer',
  hocus: 'Hocus Pocus', keen1: 'Commander Keen', keen4: 'Commander Keen 4', mahjong: 'Mahjong', mydata: 'My Data',
  nearby: 'What\'s Around Me', neverball: 'Neverball', neverputt: 'Neverputt', openarena: 'OpenArena', openttd: 'OpenTTD',
  pitstop: 'Pit Stop', planes: 'Planes Overhead', pokeguess: 'Daily Pokémon Guess', pop: 'Prince of Persia', postcard: 'Road Trip Postcard',
  probe: 'Car Benchmark', puzzles: 'Logic Puzzles', quake: 'LibreQuake', retro: 'Retro Console', rocks: 'Rocks\'n\'Diamonds',
  roguerogue: 'Rogue Rogue', rott: 'Rise of the Triad', satellites: 'Satellite Tracker', send: 'Send from phone', skyevents: 'Sky Events',
  sleep: 'Sleep Sounds', sopwith: 'Sopwith', speedtest: 'Speed Test', stars: 'Star Map', stockfish: 'Chess vs Stockfish',
  supertux: 'SuperTux', terrarium: 'Terrarium', text: 'Text Adventures', tic80: 'Tiny Games', under: 'What\'s Under Me',
  wagon: 'Wagon Trail 1848', weather: 'Weather', wolf3d: 'Wolfenstein 3D',
  shared: 'Shared by several apps', other: 'Other',
};

// Said in the Clear sheet, for apps whose saves sit with another app's
export const NOTES = {
  neverball: 'Neverputt keeps its saves here too: clearing Neverball\'s saves clears Neverputt\'s.',
  shared: 'Your chosen place and distance units, used by Weather, Star Map, Pit Stop and other road trip apps, and the code every app shares.',
};

// The DOS games on _shared/dosgame.js: each has a database of 1 MB data
// blocks named after it, and keeps its saves in the shared /save database
const DOS = ['blake', 'cosmo', 'deathrally', 'duke2', 'hocus', 'keen1', 'keen4', 'rott', 'wolf3d'];

// ---------- localStorage ----------

// Keys that don't start with their app's id (most are "<app id>.<name>")
const LOCAL = [
  [/^input\.(\w+)$/, m => [m[1], 'save']],                         // _shared/inputswap.js: touch or controller
  [/^(frunk\.place|units\.distance)$/, () => ['shared', 'save']],  // _shared/place.js, _shared/units.js
  [/^(beach|nearby|pitstop|under|weather)\.cache$|^nearby\.articles$|^weather\.kp$/, m => [m[0].split('.')[0], 'data']],
  [/^frunk\.chess\.puzzle$/, () => ['chess', 'data']],             // the day's puzzle, fetched again
  [/^frunk\.chess\./, () => ['chess', 'save']],
  [/^frunk\.mahjong\./, () => ['mahjong', 'save']],
  [/^frunk\.stockfish\./, () => ['stockfish', 'save']],
  [/^campfire\./, () => ['fireplace', 'save']],
  [/^sats\./, () => ['satellites', 'save']],
  [/^tesla\.terrarium/, () => ['terrarium', 'save']],
  [/^wagon1848\./, () => ['wagon', 'save']],
  [/^(gamepadConfig|keys|jsnes_debug)$/, () => ['retro', 'save']], // the NES core's own settings
];

export function localKind(key) {
  for (const [re, to] of LOCAL) {
    const m = re.exec(key);
    if (m) return to(m);
  }
  const id = key.split('.')[0];
  if (key.includes('.') && id in NAMES && id !== 'shared' && id !== 'other') return [id, 'save'];
  return ['other', 'save'];
}

// ---------- IndexedDB ----------

// Database name -> (store, key) -> [app, kind]. Emscripten's IDBFS names a
// database after the folder it mounts there (version 21, store FILE_DATA,
// keyed by full path), so those are paths.
const one = (app, kind) => () => [app, kind];
const IDB = {
  // downloaded free games are "free:<id>"; the rest are the player's own
  adventure: (s, k) => ['adventure', String(k).startsWith('free:') ? 'data' : 'own'],
  doom: (s, k) => ['doom', String(k).startsWith('free:') ? 'data' : 'own'],
  heretic: (s, k) => ['heretic', String(k).startsWith('free:') ? 'data' : 'own'],
  // the free LibreQuake paks and Duke's shareware next to the player's files; saves apart
  quake: (s, k) => ['quake', s === 'saves' ? 'save' : String(k).startsWith('librequake/') ? 'data' : 'own'],
  duke3d: (s, k) => ['duke3d', s === 'saves' ? 'save' : String(k).startsWith('shareware/') ? 'data' : 'own'],
  openarena: (s) => ['openarena', s === 'config' ? 'save' : 'data'],
  text: (s) => ['text', s === 'progress' ? 'save' : 'own'],
  arcade: one('arcade', 'own'),            // zips from mamedev.org, sent from the phone
  retro: one('retro', 'own'),
  fheroes2: one('fheroes2', 'own'),
  'tic80-carts': one('tic80', 'own'),
  ascii: one('ascii', 'save'),
  craft4k: one('craft4k', 'save'),
  // Retro Console's battery saves, one database per core
  nes: one('retro', 'save'), sms: one('retro', 'save'), lynx: one('retro', 'save'), pce: one('retro', 'save'), md: one('retro', 'save'), n64: one('retro', 'save'),
  // data blocks, downloaded again when a game starts
  cnc: one('cnc', 'data'), elderscrolls: one('elderscrolls', 'data'), supertux: one('supertux', 'data'), openttd: one('openttd', 'data'),
  ...Object.fromEntries(DOS.map(id => [id, one(id, 'data')])),
  // IDBFS folders
  '/save': (s, k) => {
    // shared: the DOS games under /save/<id>, Arena and Daggerfall under
    // /save/arena and /save/daggerfall, Prince of Persia's files at the top
    const sub = String(k).split('/')[2] || '';
    return [DOS.includes(sub) ? sub : sub === 'arena' || sub === 'daggerfall' ? 'elderscrolls' : 'pop', 'save'];
  },
  // mGBA: a game sits in /data/games only while it loads
  '/data': (s, k) => ['retro', String(k).startsWith('/data/games') ? 'own' : 'save'],
  '/autosave': one('retro', 'save'),
  '/mame': one('arcade', 'save'),
  '/doom': one('doom', 'save'),
  '/heretic': one('heretic', 'save'),
  '/fheroes2': one('fheroes2', 'save'),
  '/classicube': one('blocks', 'save'),
  '/Critter': one('critter', 'save'),
  '/libsdl': one('sopwith', 'save'),
  '/persistent': one('rocks', 'save'),
  '/neverball': one('neverball', 'save'),   // Neverputt's too
  '/com.nesbox.tic/TIC-80': one('tic80', 'save'),
  '/home/web_user': one('adventure', 'save'),   // ScummVM's settings and saves
  '/home/web_user/.config/vanilla-conquer': one('cnc', 'save'),
  '/home/web_user/.local/share/supertux2': one('supertux', 'save'),
  '/home/web_user/.openttd': one('openttd', 'save'),
};

// -> (store, key) -> [app, kind], or null for a database no app here claims
export const idbRule = name => Object.hasOwn(IDB, name) ? IDB[name] : null;

// ---------- Cache Storage ----------

// The apps' service worker (apps/sw.js) keeps every app's files in one cache;
// the first folder of the path says whose they are. They download again.
// App icons count as shared: this list shows them all, which caches them.
export function cacheKind(url) {
  const path = new URL(url).pathname;
  const id = path.split('/')[1];
  if (path === `/${id}/icon.svg`) return ['shared', 'data'];
  return [id in NAMES && id !== 'other' ? id : 'shared', 'data'];
}
