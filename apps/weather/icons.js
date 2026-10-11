// Weather icons as inline SVG, keyed by WMO weather code (the codes
// Open-Meteo returns). Drawn on a 32x32 grid.

const SUN = '#ffc94d', MOON = '#e9e4cc', CLOUD = '#c9d3e6', DARK_CLOUD = '#8d98ae', RAIN = '#5b9bff', SNOW = '#eef4ff', BOLT = '#ffd24a';

const sun = (cx, cy, r) => {
  let rays = '';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a);
    rays += `M${(cx + c * (r + 2.5)).toFixed(1)} ${(cy + s * (r + 2.5)).toFixed(1)}L${(cx + c * (r + 5)).toFixed(1)} ${(cy + s * (r + 5)).toFixed(1)}`;
  }
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${SUN}"/><path d="${rays}" stroke="${SUN}" stroke-width="2" stroke-linecap="round"/>`;
};
const moon = (x, y, k) => `<path transform="translate(${x} ${y}) scale(${k})" d="M14 2a12 12 0 1 0 12 15A10 10 0 0 1 14 2z" fill="${MOON}"/>`;
const cloud = (dy = 0, fill = CLOUD, dx = 0) => `<path transform="translate(${dx} ${dy})" d="M9 25h15a5 5 0 0 0 0-10 7 7 0 0 0-13.5-1.5A5.5 5.5 0 0 0 9 25z" fill="${fill}"/>`;
const drops = n => {
  const xs = n === 2 ? [12, 20] : [10, 16, 22];
  return xs.map(x => `<path d="M${x} 25l-1.5 4" stroke="${RAIN}" stroke-width="2" stroke-linecap="round"/>`).join('');
};
const flakes = () => [10, 16, 22].map((x, i) => `<circle cx="${x - i * 0.5}" cy="${27 + (i % 2) * 2}" r="1.5" fill="${SNOW}"/>`).join('');
const bolt = `<path d="M17 21l-4 6h4l-2 5 6-8h-4l2-3z" fill="${BOLT}"/>`;
const fog = `<path d="M6 13h20M4 18h24M7 23h18" stroke="${CLOUD}" stroke-width="2.4" stroke-linecap="round"/>`;

export function weatherIcon(code, isDay = true) {
  let body;
  const lit = isDay ? sun(11, 11, 5) : moon(3, 1, 0.75);
  if (code === 0) body = isDay ? sun(16, 16, 7) : moon(4, 4, 1);
  else if (code <= 2) body = lit + cloud(code === 1 ? 4 : 2);
  else if (code === 3) body = cloud(-5, DARK_CLOUD, -3) + cloud(0);
  else if (code === 45 || code === 48) body = fog;
  else if (code >= 51 && code <= 57) body = cloud(-4) + drops(2);
  else if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) body = cloud(-4, code >= 63 && code !== 80 ? DARK_CLOUD : CLOUD) + drops(3);
  else if ((code >= 71 && code <= 77) || code === 85 || code === 86) body = cloud(-4) + flakes();
  else if (code >= 95) body = cloud(-6, DARK_CLOUD) + bolt;
  else body = cloud(0);
  return `<svg viewBox="0 0 32 32" aria-hidden="true">${body}</svg>`;
}

const NAMES = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Cloudy', 45: 'Fog', 48: 'Freezing fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Showers', 81: 'Showers', 82: 'Heavy showers', 85: 'Snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorms', 96: 'Thunderstorms with hail', 99: 'Thunderstorms with hail',
};
export const weatherName = code => NAMES[code] ?? 'Unknown';
