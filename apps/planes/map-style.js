// The base map: a night-flying chart. It draws only what helps place a plane
// (coast, cities, big roads, airports) and leaves out buildings, small roads
// and points of interest, so the car's GPU has little to do and the planes
// stay the brightest thing on screen.

const name = ['coalesce', ['get', 'name_en'], ['get', 'name:latin'], ['get', 'name']];

const city = (id, cls, minzoom, size, color, extra = {}) => ({
  id, type: 'symbol', source: 'chart', 'source-layer': 'place', minzoom,
  filter: ['==', ['get', 'class'], cls],
  layout: { 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-size': size, 'text-max-width': 8, ...extra },
  paint: { 'text-color': color, 'text-halo-color': '#0d1f2e', 'text-halo-width': 1.2 },
});

const road = (id, classes, minzoom, width, color) => ({
  id, type: 'line', source: 'chart', 'source-layer': 'transportation', minzoom,
  filter: ['match', ['get', 'class'], classes, true, false],
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: { 'line-color': color, 'line-width': width },
});

export const chartStyle = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: { chart: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } },
  layers: [
    { id: 'land', type: 'background', paint: { 'background-color': '#14293a' } },
    // Towns get a warm tint, as the yellow patches do on a paper chart
    {
      id: 'town', type: 'fill', source: 'chart', 'source-layer': 'landuse',
      filter: ['==', ['get', 'class'], 'residential'],
      paint: { 'fill-color': '#6f5f3a', 'fill-opacity': 0.18 },
    },
    {
      id: 'water', type: 'fill', source: 'chart', 'source-layer': 'water',
      filter: ['!=', ['get', 'brunnel'], 'tunnel'],
      paint: { 'fill-color': '#091725' },
    },
    road('road-big', ['motorway', 'trunk'], 6, ['interpolate', ['linear'], ['zoom'], 6, 0.5, 12, 1.6], '#2f5168'),
    road('road-main', ['primary'], 9, ['interpolate', ['linear'], ['zoom'], 9, 0.4, 12, 1], '#28465a'),
    {
      id: 'border', type: 'line', source: 'chart', 'source-layer': 'boundary',
      filter: ['<=', ['coalesce', ['get', 'admin_level'], 99], 4],
      paint: { 'line-color': '#54758b', 'line-width': 0.8, 'line-dasharray': [3, 2] },
    },
    {
      id: 'runway', type: 'line', source: 'chart', 'source-layer': 'aeroway', minzoom: 9,
      filter: ['==', ['get', 'class'], 'runway'],
      paint: { 'line-color': '#b8d4e6', 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1, 12, 3] },
    },
    city('state', 'state', 6, 12, '#5f7f95', { 'text-transform': 'uppercase', 'text-letter-spacing': 0.1 }),
    city('village', 'village', 10, 11, '#7f99ad'),
    city('town-name', 'town', 8, 12, '#8fa9bc'),
    city('city', 'city', 6, 14, '#bcd0de'),
    // Airport codes, the one label pilots and passengers both read
    {
      id: 'airport-mark', type: 'circle', source: 'chart', 'source-layer': 'aerodrome_label', minzoom: 7,
      filter: ['match', ['get', 'class'], ['international', 'public', 'regional', 'military'], true, false],
      paint: { 'circle-radius': 3.5, 'circle-color': '#14293a', 'circle-stroke-color': '#7cc4ea', 'circle-stroke-width': 1.4 },
    },
    {
      id: 'airport-code', type: 'symbol', source: 'chart', 'source-layer': 'aerodrome_label', minzoom: 7,
      filter: ['match', ['get', 'class'], ['international', 'public', 'regional', 'military'], true, false],
      layout: {
        'text-field': ['coalesce', ['get', 'iata'], ['get', 'icao'], ''],
        'text-font': ['Noto Sans Bold'], 'text-size': 11, 'text-anchor': 'left', 'text-offset': [0.7, 0],
      },
      paint: { 'text-color': '#7cc4ea', 'text-halo-color': '#0d1f2e', 'text-halo-width': 1.2 },
    },
  ],
};
