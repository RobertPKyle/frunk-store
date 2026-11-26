// Languages the hub can show. The page's own text comes in English from
// index.html (elements marked data-i18n); each other language has a file in
// /lang/ with its text, tag names and app names. A string a file lacks is
// shown in English. The inline script in index.html's head lists the same
// codes, so it can pick the language before the page is drawn.
export const LANGS = [
  ['en', 'English'],
  ['zh-Hant', '繁體中文'],
  ['zh-Hans', '简体中文'],
  ['de', 'Deutsch'],
  ['nb', 'Norsk'],
  ['nl', 'Nederlands'],
  ['ja', '日本語'],
  ['ko', '한국어'],
];

// English for the strings hub.js writes itself
export const EN_UI = {
  fullscreen: 'Full screen',
  fullscreenExit: 'Exit full screen',
  fullscreenBlocked: 'Full screen blocked',
  catalogError: 'Could not load the app list ({error}). Check the connection and reload.',
  filterAll: 'All',
  filterGames: 'Games',
  filterCamp: 'Camp Mode',
  filterRoad: 'Road Trip',
  filterTools: 'Tools',
  shelfFavorites: 'Favorites',
  favorite: 'Favorite',
  shelfNew: 'New and updated',
  shelf_consoles: 'Retro consoles',
  shelf_shooters: 'Shooters',
  shelf_platformers: 'Platformers',
  shelf_arcade: 'Arcade and sports',
  shelf_puzzles: 'Puzzles and board games',
  shelf_strategy: 'Strategy and building',
  shelf_adventure: 'Adventure and RPG',
  shelf_camp: 'Camp Mode',
  shelf_road: 'Road trip and tools',
  shelfMore: 'More apps',
  copied: 'Copied',
  selected: 'Selected',
  badgeNew: 'New',
  badgeUpdated: 'Updated',
  searchNone: 'No apps match “{query}”.',
  inputTouch: 'Touch',
  inputController: 'Best with a controller',
  inputBoth: 'Touch or controller',
  partnerVisit: 'Visit {site}',
  partnerPlay: 'Play on {site}',
  partnerTag: 'Partner',
  featuredLabel: 'Featured apps',
  featuredKicker: 'Featured',
  featuredPlay: 'Play',
  featuredOpen: 'Open',
};
