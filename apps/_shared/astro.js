// Low-precision astronomy, good to a fraction of a degree for 1800-2050:
// sidereal time, horizon coordinates, the Sun, the Moon (with phase) and the
// naked-eye planets. Angles are in degrees unless a name says otherwise.

const RAD = Math.PI / 180;
const sin = d => Math.sin(d * RAD), cos = d => Math.cos(d * RAD);
const norm = d => ((d % 360) + 360) % 360;

export const julianDay = date => date.getTime() / 86400000 + 2440587.5;

function obliquity(d) { return 23.439 - 0.0000004 * d; }

// Local sidereal time for east-positive longitude
export function localSiderealTime(jd, lon) {
  return norm(280.46061837 + 360.98564736629 * (jd - 2451545) + lon);
}

// Equatorial (J2000-ish) to horizon. Azimuth runs from north through east.
export function toHorizon(ra, dec, lat, lst) {
  const h = lst - ra;
  const alt = Math.asin(sin(lat) * sin(dec) + cos(lat) * cos(dec) * cos(h)) / RAD;
  const az = Math.atan2(-cos(dec) * sin(h), sin(dec) * cos(lat) - cos(dec) * cos(h) * sin(lat)) / RAD;
  return { alt, az: norm(az) };
}

function eclipticToEquatorial(lambda, beta, eps) {
  const ra = Math.atan2(sin(lambda) * cos(eps) - Math.tan(beta * RAD) * sin(eps), cos(lambda)) / RAD;
  const dec = Math.asin(sin(beta) * cos(eps) + cos(beta) * sin(eps) * sin(lambda)) / RAD;
  return { ra: norm(ra), dec };
}

function sunLongitude(d) {
  const g = 357.529 + 0.98560028 * d;
  const q = 280.459 + 0.98564736 * d;
  return norm(q + 1.915 * sin(g) + 0.020 * sin(2 * g));
}

// The Sun's ecliptic longitude, of date
export function sunEclipticLongitude(jd) {
  return sunLongitude(jd - 2451545);
}

export function sun(jd) {
  const d = jd - 2451545;
  return { name: 'Sun', ...eclipticToEquatorial(sunLongitude(d), 0, obliquity(d)) };
}

// Meeus, Astronomical Algorithms, ch. 47: the largest periodic terms of the
// Moon's longitude and distance (Table 47.A) and latitude (47.B), as
// [coefficient, D, M, M', F] with longitude and latitude in 1e-6 degrees and
// distance in metres.
const MOON_LR = [
  [6288774, -20905355, 0, 0, 1, 0], [1274027, -3699111, 2, 0, -1, 0], [658314, -2955968, 2, 0, 0, 0],
  [213618, -569925, 0, 0, 2, 0], [-185116, 48888, 0, 1, 0, 0], [-114332, -3149, 0, 0, 0, 2],
  [58793, 246158, 2, 0, -2, 0], [57066, -152138, 2, -1, -1, 0], [53322, -170733, 2, 0, 1, 0],
  [45758, -204586, 2, -1, 0, 0], [-40923, -129620, 0, 1, -1, 0], [-34720, 108743, 1, 0, 0, 0],
  [-30383, 104755, 0, 1, 1, 0], [15327, 10321, 2, 0, 0, -2], [-12528, 0, 0, 0, 1, 2],
  [10980, 79661, 0, 0, 1, -2], [10675, -34782, 4, 0, -1, 0], [10034, -23210, 0, 0, 3, 0],
  [8548, -21636, 4, 0, -2, 0], [-7888, 24208, 2, 1, -1, 0], [-6766, 30824, 2, 1, 0, 0],
  [-5163, -8379, 1, 0, -1, 0], [4987, -16675, 1, 1, 0, 0], [4036, -12831, 2, -1, 1, 0],
];
const MOON_B = [
  [5128122, 0, 0, 0, 1], [280602, 0, 0, 1, 1], [277693, 0, 0, 1, -1], [173237, 2, 0, 0, -1],
  [55413, 2, 0, -1, 1], [46271, 2, 0, -1, -1], [32573, 2, 0, 0, 1], [17198, 0, 0, 2, 1],
  [9266, 2, 0, 1, -1], [8822, 0, 0, 2, -1], [8216, 2, -1, 0, -1], [4324, 2, 0, -2, -1],
  [4200, 2, 0, 1, 1], [-3359, 2, 1, 0, -1], [2463, 2, -1, -1, 1], [2211, 2, -1, 0, 1],
  [2065, 2, -1, -1, -1], [-1870, 0, 1, -1, -1], [1828, 4, 0, -1, -1], [-1794, 0, 1, 0, 1],
  [-1749, 0, 0, 0, 3], [-1565, 0, 1, -1, 1], [-1491, 1, 0, 0, 1], [-1475, 0, 1, 1, 1],
];

export function moon(jd) {
  const d = jd - 2451545, T = d / 36525;
  const L = 218.3164477 + 481267.88123421 * T; // mean longitude
  const D = 297.8501921 + 445267.1114034 * T;  // mean elongation
  const M = 357.5291092 + 35999.0502909 * T;   // Sun's mean anomaly
  const Mm = 134.9633964 + 477198.8675055 * T; // Moon's mean anomaly
  const F = 93.2720950 + 483202.0175233 * T;   // argument of latitude
  let sl = 0, sr = 0, sb = 0;
  for (const [l, r, a, b, c, e] of MOON_LR) {
    const arg = a * D + b * M + c * Mm + e * F;
    sl += l * sin(arg); sr += r * cos(arg);
  }
  for (const [k, a, b, c, e] of MOON_B) sb += k * sin(a * D + b * M + c * Mm + e * F);
  // Precess back to J2000 to match the stars
  const lambda = norm(L + sl / 1e6 - 1.397 * T);
  const beta = sb / 1e6;
  // Elongation from the Sun, both of date
  const elong = norm(lambda + 1.397 * T - sunLongitude(d));
  return {
    name: 'Moon',
    ...eclipticToEquatorial(lambda, beta, obliquity(d)),
    lambda, beta, elong,
    illuminated: (1 - cos(elong)) / 2,
    waxing: elong < 180,
    dist: 385000.56 + sr / 1000, // Earth-Moon distance, km
  };
}

// JPL "Approximate Positions of the Planets", Table 1 (valid 1800-2050):
// [a, e, I, L, longPeri, longNode] and their rates per Julian century.
const ELEMENTS = {
  Mercury: [[0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593],
            [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]],
  Venus:   [[0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255],
            [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418]],
  Earth:   [[1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0],
            [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0]],
  Mars:    [[1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
            [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]],
  Jupiter: [[5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
            [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]],
  Saturn:  [[9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
            [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]],
};

function heliocentric(name, T) {
  const [base, rate] = ELEMENTS[name];
  const [a, e, I, L, peri, node] = base.map((v, i) => v + rate[i] * T);
  const w = peri - node;
  let M = norm(L - peri);
  if (M > 180) M -= 360;
  // Kepler's equation, Newton iterations in radians
  const Mr = M * RAD;
  let E = Mr + e * Math.sin(Mr);
  for (let i = 0; i < 6; i++) E -= (E - e * Math.sin(E) - Mr) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  return {
    x: (cos(w) * cos(node) - sin(w) * sin(node) * cos(I)) * xp + (-sin(w) * cos(node) - cos(w) * sin(node) * cos(I)) * yp,
    y: (cos(w) * sin(node) + sin(w) * cos(node) * cos(I)) * xp + (-sin(w) * sin(node) + cos(w) * cos(node) * cos(I)) * yp,
    z: sin(w) * sin(I) * xp + cos(w) * sin(I) * yp,
  };
}

export const PLANETS = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

export function planet(name, jd) {
  const T = (jd - 2451545) / 36525;
  const p = heliocentric(name, T), earth = heliocentric('Earth', T);
  const x = p.x - earth.x, y = p.y - earth.y, z = p.z - earth.z;
  const eps = obliquity(jd - 2451545);
  const ye = y * cos(eps) - z * sin(eps), ze = y * sin(eps) + z * cos(eps);
  return { name, ra: norm(Math.atan2(ye, x) / RAD), dec: Math.atan2(ze, Math.hypot(x, ye)) / RAD };
}
