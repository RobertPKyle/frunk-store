// Brain Test scoring, shared by the app (apps/brain/brain.js), the phone
// share page and the server (apps/api/brain.js), so they all agree.
//
// The test measures three rates: kernel units per second on one core, on
// all cores, and graphics frames per second. Each rate times a constant
// gives points, and the total is their geometric mean, so no one part can
// carry it. The constants aim at about 1,000 points per part for a Tesla
// with the Intel Atom (MCU2). Changing them makes old scores incomparable:
// bump VERSION too, which starts the leaderboard over.

export const VERSION = 1;

// Estimates until a car has run it: a Ryzen 5800X core is about 4.5x an
// MCU2 core, and its RTX 3060 Ti about 70x the HD Graphics 505.
const K = { single: 0.183, multi: 0.0483, gpu: 5.4 };

export function points({ single, multi, gpu }) {
  const p = { single: single * K.single, multi: multi * K.multi, gpu: gpu * K.gpu };
  p.total = Math.cbrt(p.single * p.multi * p.gpu);
  for (const k in p) p[k] = Math.round(p[k]);
  return p;
}

export const CARS = ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck'];

// Leaderboard groups, in the order the board shows them
export const GROUPS = {
  mcu3: 'Tesla MCU3 (AMD Ryzen)',
  mcu2: 'Tesla MCU2 (Intel Atom)',
  computer: 'Computers',
  apple: 'iPhones and iPads',
  android: 'Android phones',
};

// The car's browser says it's plain Linux Chrome, with no Tesla in its user
// agent, so a car is told apart by its graphics chip: Intel HD Graphics 505
// (Apollo Lake) in MCU2, an AMD Radeon in MCU3. Linux PCs can have those
// too, so a device only counts as a Tesla once its owner picks a model.
export function hardware(renderer, ua) {
  if (/iPhone|iPad/.test(ua) || (/Macintosh/.test(ua) && /Apple GPU/.test(renderer) && /Mobile/.test(ua))) return 'apple';
  if (/Android/.test(ua)) return 'android';
  if (/X11; Linux x86_64/.test(ua)) {
    if (/HD Graphics 50[05]|\bAPL\b|Apollo ?Lake/i.test(renderer)) return 'mcu2';
    if (/AMD|Radeon|RADV/i.test(renderer)) return 'mcu3';
  }
  return 'computer';
}

// The group a result counts in: car is a model from CARS, or '' when the
// owner said it isn't a Tesla or wasn't asked
export function group(renderer, ua, car) {
  const hw = hardware(renderer, ua);
  if (hw === 'mcu2' || hw === 'mcu3') return CARS.includes(car) ? hw : 'computer';
  return hw;
}

export const maybeTesla = (renderer, ua) => ['mcu2', 'mcu3'].includes(hardware(renderer, ua));

// "ANGLE (Intel, Mesa Intel(R) HD Graphics 505 (APL 3), OpenGL 4.6)" -> "Intel HD Graphics 505"
export function chipName(renderer) {
  let s = String(renderer || '');
  const angle = /^ANGLE \((.*)\)$/.exec(s);
  if (angle) s = angle[1].split(', ').slice(1, -1).join(', ') || angle[1];
  s = s.replace(/\((R|TM)\)/gi, '').replace(/\bMesa\b|\bDirect3D\S*|\bvs_\S+|\bps_\S+|\(0x[0-9a-f]+\)/gi, '')
    .replace(/\s*\((?:APL|raven|navi|LLVM|DRM|radeonsi)[^)]*\)/gi, '').replace(/\s+/g, ' ').trim();
  return s.slice(0, 60) || 'Unknown graphics';
}
