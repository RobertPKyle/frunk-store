// Sky events computed on this screen: Moon phases (with supermoons, blue
// moons and lunar eclipses), meteor shower peaks rated for the viewer's
// latitude and the Moon, planet oppositions, greatest elongations, close
// pairings, and the equinoxes and solstices. Solar eclipses come from NASA's
// table, since their local circumstances need more precision than this has.
//
// Times are milliseconds since 1970. Angles are degrees.
import { julianDay, localSiderealTime, toHorizon, moon, planet, sunEclipticLongitude } from '../_shared/astro.js';
import { useMiles } from '../_shared/units.js';

const HOUR = 3600_000, DAY = 86400_000;
const DEG = Math.PI / 180;
const jdOf = t => julianDay(new Date(t));
const wrap = d => ((d % 360) + 540) % 360 - 180;

// The Sun precessed to J2000, the frame of the Moon and planets in astro.js
function sunJ2000(jd) {
  const lam = (sunEclipticLongitude(jd) - 1.397 * (jd - 2451545) / 36525) * DEG, eps = 23.4393 * DEG;
  return {
    name: 'Sun',
    ra: (Math.atan2(Math.sin(lam) * Math.cos(eps), Math.cos(lam)) / DEG + 360) % 360,
    dec: Math.asin(Math.sin(eps) * Math.sin(lam)) / DEG,
  };
}

export function position(name, t) {
  const jd = jdOf(t);
  return name === 'Sun' ? sunJ2000(jd) : name === 'Moon' ? moon(jd) : planet(name, jd);
}

export function separation(a, b) {
  const c = Math.sin(a.dec * DEG) * Math.sin(b.dec * DEG) + Math.cos(a.dec * DEG) * Math.cos(b.dec * DEG) * Math.cos((a.ra - b.ra) * DEG);
  return Math.acos(Math.min(1, Math.max(-1, c))) / DEG;
}

export function altAz(body, t, lat, lon) {
  return toHorizon(body.ra, body.dec, lat, localSiderealTime(jdOf(t), lon));
}

// Times in [t0, t1] where f rises through zero. f is an angle difference in
// (-180, 180], so jumps across ±180 are not crossings.
function rising(f, t0, t1, step) {
  const out = [];
  let a = t0, fa = f(a);
  for (let b = t0 + step; b <= t1 + step; b += step) {
    const fb = f(b);
    if (fa < 0 && fb >= 0 && fb - fa < 90) {
      let lo = a, hi = b;
      while (hi - lo > 20_000) {
        const mid = (lo + hi) / 2;
        if (f(mid) < 0) lo = mid; else hi = mid;
      }
      const t = (lo + hi) / 2;
      if (t >= t0 && t <= t1) out.push(t);
    }
    a = b; fa = fb;
  }
  return out;
}

// Local minima (or maxima with sign -1) of f in [t0, t1]
function extrema(f, t0, t1, step, sign = 1) {
  const g = t => sign * f(t);
  const out = [];
  let p = g(t0 - step), c = g(t0);
  for (let t = t0; t <= t1; t += step) {
    const n = g(t + step);
    if (c <= p && c < n) {
      let lo = t - step, hi = t + step;
      while (hi - lo > 60_000) {
        const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
        if (g(m1) < g(m2)) hi = m2; else lo = m1;
      }
      const tm = (lo + hi) / 2;
      out.push({ t: tm, value: f(tm) });
    }
    p = c; c = n;
  }
  return out;
}

// ---------- the Moon ----------

const PHASES = [[0, 'New Moon'], [90, 'First quarter'], [180, 'Full Moon'], [270, 'Last quarter']];

// Traditional North American full moon names by month
const MOON_NAMES = ['Wolf', 'Snow', 'Worm', 'Pink', 'Flower', 'Strawberry', 'Buck', 'Sturgeon', 'Corn', "Hunter's", 'Beaver', 'Cold'];

export function phaseName(elong) {
  if (elong < 6 || elong > 354) return 'New Moon';
  if (elong < 84) return 'Waxing crescent';
  if (elong < 96) return 'First quarter';
  if (elong < 174) return 'Waxing gibbous';
  if (elong < 186) return 'Full Moon';
  if (elong < 264) return 'Waning gibbous';
  if (elong < 276) return 'Last quarter';
  return 'Waning crescent';
}

const SUPERMOON_KM = 360_000;

// Earth's shadow at the Moon's distance and the Moon's path through it
export function lunarEclipse(tFull, lat, lon) {
  // Ecliptic coordinates of date, given as ra/dec so separation() applies
  const moonAt = t => { const jd = jdOf(t), m = moon(jd); return { ra: m.lambda + 1.397 * (jd - 2451545) / 36525, dec: m.beta, dist: m.dist }; };
  const antiSun = t => ({ ra: (sunEclipticLongitude(jdOf(t)) + 180) % 360, dec: 0 });
  const gap = t => separation(moonAt(t), antiSun(t));
  const [best] = extrema(gap, tFull - 3 * HOUR, tFull + 3 * HOUR, 20 * 60_000).sort((a, b) => a.value - b.value);
  if (!best) return null;
  const t = best.t, g = best.value;
  const m = moonAt(t);
  const pm = Math.asin(6378.14 / m.dist) / DEG; // Moon's horizontal parallax
  const sm = 0.2725 * pm;                       // Moon's radius
  const ss = 0.2666, ps = 0.00244;              // Sun's radius and parallax
  const umbra = 1.02 * (0.99834 * pm + ps - ss);
  const penumbra = 1.02 * (0.99834 * pm + ps + ss);
  if (g - sm >= penumbra) return null;
  const type = g + sm < umbra ? 'total' : g - sm < umbra ? 'partial' : 'penumbral';

  // How fast the Moon crosses the shadow, degrees per hour
  const offset = u => { const a = moonAt(u), b = antiSun(u); return [wrap(a.ra - b.ra) * Math.cos(a.dec * DEG), a.dec - b.dec]; };
  const [x1, y1] = offset(t - HOUR / 2), [x2, y2] = offset(t + HOUR / 2);
  const rate = Math.hypot(x2 - x1, y2 - y1);
  const half = r => (r > g ? Math.sqrt(r * r - g * g) / rate * HOUR : 0);
  const partial = half(umbra + sm), total = half(umbra - sm), pen = half(penumbra + sm);

  // Visible if the Moon is up at some point while the eclipse is happening
  const span = type === 'penumbral' ? pen : partial;
  let visible = false;
  for (let u = t - span; u <= t + span + 1; u += 5 * 60_000) {
    if (altAz(position('Moon', u), u, lat, lon).alt > 0) { visible = true; break; }
  }
  return {
    type, t, visible, magnitude: (umbra + sm - g) / (2 * sm),
    partialStart: partial && t - partial, partialEnd: partial && t + partial,
    totalStart: total && t - total, totalEnd: total && t + total,
  };
}

function moonEvents(t0, t1, lat, lon, eclipseEnd) {
  const events = [];
  const fullMoons = [];
  for (const [target, name] of PHASES) {
    const end = target === 180 ? Math.max(t1, eclipseEnd) : t1;
    for (const t of rising(u => wrap(position('Moon', u).elong - target), t0, end, 6 * HOUR)) {
      if (target === 180) fullMoons.push(t);
      if (t <= t1) events.push({ t, kind: 'moon', title: name, phase: target });
    }
  }

  // Name the full moons. The Harvest Moon is the one nearest the September
  // equinox and the Hunter's Moon the one after it.
  const full = events.filter(e => e.phase === 180);
  const special = new Map();
  for (const { t: eq } of seasons(t0 - 60 * DAY, t1 + 60 * DAY).filter(e => e.lon === 180)) {
    const i = full.reduce((bi, e, k) => (Math.abs(e.t - eq) < Math.abs(full[bi].t - eq) ? k : bi), 0);
    if (!full[i] || Math.abs(full[i].t - eq) > 16 * DAY) continue;
    special.set(full[i], 'Harvest');
    if (full[i + 1]) special.set(full[i + 1], "Hunter's");
  }
  for (const e of full) {
    const d = new Date(e.t);
    const m = position('Moon', e.t);
    const notes = [];
    if (lat >= 0) e.title = `Full ${special.get(e) || MOON_NAMES[d.getMonth()]} Moon`;
    if (m.dist < SUPERMOON_KM) {
      e.title += ' (supermoon)';
      notes.push(`The Moon is close to Earth (${useMiles() ? `${(Math.round(m.dist / 1609.344 / 1000) * 1000).toLocaleString('en-US')} miles` : `${(Math.round(m.dist / 1000) * 1000).toLocaleString('en-US')} km`}), so it looks a little bigger and brighter than usual.`);
    }
    const sameMonth = events.find(o => o.phase === 180 && o.t < e.t && new Date(o.t).getMonth() === d.getMonth() && new Date(o.t).getFullYear() === d.getFullYear());
    if (sameMonth) { notes.push('Second full moon this month: a "blue moon".'); e.badge = 'Blue moon'; }
    e.text = notes.join(' ');
  }

  for (const t of fullMoons) {
    const ec = lunarEclipse(t, lat, lon);
    if (!ec) continue;
    const kind = { total: 'Total lunar eclipse', partial: 'Partial lunar eclipse', penumbral: 'Penumbral lunar eclipse' }[ec.type];
    const what = {
      total: 'The whole Moon passes into Earth\'s shadow and turns a coppery red.',
      partial: `Earth's shadow covers ${Math.round(ec.magnitude * 100)}% of the Moon at most.`,
      penumbral: 'The Moon only grazes the outer shadow. A subtle dimming that is easy to miss.',
    }[ec.type];
    events.push({ t: ec.t, kind: 'eclipse', title: kind, text: what, eclipse: ec, badge: ec.visible ? 'Visible from here' : 'Not visible from here', good: ec.visible });
  }
  return events;
}

// ---------- the Sun ----------

function seasons(t0, t1) {
  const out = [];
  for (const target of [0, 90, 180, 270]) {
    for (const t of rising(u => wrap(sunEclipticLongitude(jdOf(u)) - target), t0, t1, DAY)) out.push({ t, lon: target });
  }
  return out;
}

function seasonEvents(t0, t1, lat) {
  const north = lat >= 0;
  const names = {
    0: ['March equinox', north ? 'spring' : 'autumn'],
    90: ['June solstice', north ? 'summer' : 'winter'],
    180: ['September equinox', north ? 'autumn' : 'spring'],
    270: ['December solstice', north ? 'winter' : 'summer'],
  };
  return seasons(t0, t1).map(({ t, lon }) => {
    const [title, season] = names[lon];
    const extra = lon % 180 ? (season === 'summer' ? ' The longest day of the year.' : ' The shortest day of the year.') : ' Day and night are about equal everywhere.';
    return { t, kind: 'season', title, text: `First day of ${season} where you are.${extra}` };
  });
}

// NASA solar eclipse table (Espenak), greatest eclipse in UT
const SOLAR = [
  ['2027-02-06T16:01Z', 'Annular', 'Chile, Argentina and the South Atlantic', 'South America, Antarctica, western and southern Africa'],
  ['2027-08-02T10:07Z', 'Total', 'Morocco, Spain, Algeria, Libya, Egypt, Saudi Arabia, Yemen and Somalia', 'Africa, Europe, the Middle East, western and southern Asia'],
  ['2028-01-26T15:08Z', 'Annular', 'Ecuador, Peru, Brazil, Suriname, Spain and Portugal', 'eastern North America, Central and South America, western Europe, northwestern Africa'],
  ['2028-07-22T02:55Z', 'Total', 'Australia and New Zealand', 'Southeast Asia, the East Indies, Australia and New Zealand'],
  ['2029-01-14T17:12Z', 'Partial', '', 'North and Central America'],
  ['2029-06-12T04:05Z', 'Partial', '', 'the Arctic, Scandinavia, Alaska, northern Asia and northern Canada'],
  ['2029-07-11T15:36Z', 'Partial', '', 'southern Chile and Argentina'],
  ['2029-12-05T15:03Z', 'Partial', '', 'southern Argentina and Chile, Antarctica'],
  ['2030-06-01T06:28Z', 'Annular', 'Algeria, Tunisia, Greece, Turkey, Russia, northern China and Japan', 'Europe, northern Africa, the Middle East, Asia, the Arctic and Alaska'],
  ['2030-11-25T06:50Z', 'Total', 'Botswana, South Africa and Australia', 'southern Africa, the southern Indian Ocean, the East Indies, Australia and Antarctica'],
  ['2031-05-21T07:15Z', 'Annular', 'Angola, Congo, Zambia, Tanzania, southern India, Malaysia and Indonesia', 'Africa, southern Asia, the East Indies and Australia'],
  ['2031-11-14T21:06Z', 'Hybrid', 'the Pacific and Panama', 'the Pacific, southern US, Central America and northwestern South America'],
  ['2032-05-09T13:25Z', 'Annular', 'the South Atlantic', 'southern South America and southern Africa'],
  ['2032-11-03T05:33Z', 'Partial', '', 'Asia'],
  ['2033-03-30T18:01Z', 'Total', 'eastern Russia and Alaska', 'North America'],
  ['2033-09-23T13:53Z', 'Partial', '', 'southern South America and Antarctica'],
  ['2034-03-20T10:17Z', 'Total', 'Nigeria, Cameroon, Chad, Sudan, Egypt, Saudi Arabia, Iran, Afghanistan, Pakistan, India and China', 'Africa, Europe and western Asia'],
  ['2034-09-12T16:18Z', 'Annular', 'Chile, Bolivia, Argentina, Paraguay and Brazil', 'Central and South America'],
  ['2035-03-09T23:05Z', 'Annular', 'New Zealand and the Pacific', 'Australia, New Zealand, the southern Pacific, Mexico and Antarctica'],
  ['2035-09-02T01:55Z', 'Total', 'China, Korea, Japan and the Pacific', 'eastern Asia and the Pacific'],
];

function solarEvents(t0, t1) {
  const what = { Total: 'Totality', Annular: 'The "ring of fire"', Hybrid: 'Total or annular' };
  return SOLAR.map(([iso, type, path, partial]) => {
    const t = Date.parse(iso);
    if (t < t0 || t > t1) return null;
    const text = (path ? `${what[type]} along a narrow path over ${path}. ` : '') + `Partial eclipse across ${partial}. Never look at the Sun without eclipse glasses.`;
    return { t, kind: 'eclipse', title: `${type} solar eclipse`, text };
  }).filter(Boolean);
}

// ---------- meteor showers ----------

// Peak solar longitude (J2000), zenithal hourly rate, radiant RA/Dec, and
// typical activity, from the International Meteor Organization calendar
const SHOWERS = [
  ['Quadrantids', 283.15, 80, 230, 49, 'Short, sharp peak of only a few hours.'],
  ['Lyrids', 32.32, 18, 271, 34, 'Occasional bright meteors with trains.'],
  ['Eta Aquariids', 45.5, 50, 338, -1, 'Debris from Halley\'s Comet. Best from the Southern Hemisphere and the tropics.'],
  ['Southern Delta Aquariids', 127, 25, 340, -16, 'Faint meteors over several nights. Best from southern latitudes.'],
  ['Perseids', 140.0, 100, 48, 58, 'The favorite summer shower: fast, bright meteors, many with trails.'],
  ['Draconids', 195.4, 10, 262, 54, 'Usually quiet, with rare outbursts. Best in the early evening.'],
  ['Orionids', 208, 20, 95, 16, 'Debris from Halley\'s Comet. Fast meteors, some leave glowing trails.'],
  ['Northern Taurids', 230, 5, 58, 22, 'Few meteors, but known for slow, bright fireballs.'],
  ['Leonids', 235.27, 15, 152, 22, 'Very fast meteors. Famous for meteor storms in some years.'],
  ['Geminids', 262.2, 150, 112, 33, 'Usually the best shower of the year: bright, slow, colorful meteors.'],
  ['Ursids', 270.7, 10, 217, 76, 'A modest shower around the December solstice. Northern Hemisphere only.'],
];

function sunAlt(t, lat, lon) { return altAz(position('Sun', t), t, lat, lon).alt; }

// The night (local noon to noon) that contains t
export function nightOf(t) {
  const d = new Date(t);
  if (d.getHours() < 12) d.setDate(d.getDate() - 1);
  d.setHours(12, 0, 0, 0);
  const start = d.getTime();
  d.setDate(d.getDate() + 1);
  return [start, d.getTime()];
}

function showerEvents(t0, t1, lat, lon) {
  const events = [];
  for (const [name, lp, zhr, ra, dec, about] of SHOWERS) {
    // Solar longitude of date to J2000
    const f = u => { const jd = jdOf(u); return wrap(sunEclipticLongitude(jd) - 1.397 * (jd - 2451545) / 36525 - lp); };
    for (const t of rising(f, t0, t1, DAY)) {
      // Best moment of the peak night: radiant high, sky dark, Moon down or thin
      const [n0, n1] = nightOf(t);
      let best = null;
      for (let u = n0; u <= n1; u += 15 * 60_000) {
        if (sunAlt(u, lat, lon) > -12) continue;
        const radiant = altAz({ ra, dec }, u, lat, lon).alt;
        if (radiant <= 0) continue;
        const m = position('Moon', u);
        const moonUp = altAz(m, u, lat, lon).alt > 0;
        const moonFactor = moonUp ? 1 - 0.75 * m.illuminated : 1;
        const rate = zhr * Math.sin(radiant * DEG) * moonFactor;
        if (!best || rate > best.rate) best = { t: u, rate, moon: m.illuminated, moonUp };
      }
      const e = { t, kind: 'meteor', title: `${name} meteor shower peak`, night: [n0, n1] };
      if (!best) {
        e.badge = 'Not visible from here';
        e.text = `${about} The radiant stays below the horizon from your latitude.`;
      } else {
        const rate = Math.max(1, Math.round(best.rate));
        e.rating = rate >= 40 ? 'Great' : rate >= 15 ? 'Good' : rate >= 6 ? 'Fair' : 'Poor';
        e.badge = e.rating;
        e.good = rate >= 15;
        e.best = best.t;
        const moonNote = best.moonUp && best.moon > 0.3 ? ` A ${Math.round(best.moon * 100)}% Moon will wash out fainter meteors.` : best.moon > 0.3 ? ' The Moon has set by then.' : ' Little moonlight to spoil it.';
        e.text = `${about} Up to about ${rate} an hour from a dark site.${moonNote}`;
      }
      events.push(e);
    }
  }
  return events;
}

// ---------- planets ----------

const PLANET_LIST = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

function elongation(name, t) { return separation(position(name, t), position('Sun', t)); }
// East of the Sun means visible in the evening
function evening(name, t) { return wrap(position(name, t).ra - position('Sun', t).ra) > 0; }
const sky = (name, t) => (evening(name, t) ? 'evening sky, after sunset' : 'morning sky, before sunrise');

function planetEvents(t0, t1) {
  const events = [];
  for (const name of ['Mars', 'Jupiter', 'Saturn']) {
    for (const { t, value } of extrema(u => elongation(name, u), t0, t1, DAY, -1)) {
      if (value < 170) continue;
      events.push({ t, kind: 'planet', title: `${name} at opposition`, text: `${name} is opposite the Sun: at its biggest and brightest for the year, and up all night.` });
    }
  }
  for (const name of ['Mercury', 'Venus']) {
    for (const { t, value } of extrema(u => elongation(name, u), t0, t1, DAY, -1)) {
      if (value < 15) continue;
      const when = evening(name, t) ? 'Look low in the west after sunset.' : 'Look low in the east before sunrise.';
      events.push({ t, kind: 'planet', title: `${name} at greatest elongation`, text: `${name} is as far from the Sun as it gets (${Math.round(value)}°), the best time to spot it. ${when}` });
    }
  }
  // Two planets close together
  for (let i = 0; i < PLANET_LIST.length; i++) {
    for (let j = i + 1; j < PLANET_LIST.length; j++) {
      const a = PLANET_LIST[i], b = PLANET_LIST[j];
      for (const { t, value } of extrema(u => separation(position(a, u), position(b, u)), t0, t1, DAY / 2)) {
        if (value > 2 || elongation(a, t) < 15 || elongation(b, t) < 15) continue;
        events.push({ t, kind: 'planet', title: `${a} and ${b} meet`, text: `Only ${value < 1 ? value.toFixed(1) : Math.round(value * 10) / 10}° apart in the ${sky(a, t)}.` });
      }
    }
  }
  // The Moon passing a bright planet
  for (const name of ['Venus', 'Mars', 'Jupiter', 'Saturn']) {
    for (const { t, value } of extrema(u => separation(position('Moon', u), position(name, u)), t0, t1, 3 * HOUR)) {
      if (value > 3 || elongation(name, t) < 20) continue;
      events.push({ t, kind: 'planet', title: `Moon near ${name}`, text: `About ${Math.max(1, Math.round(value))}° apart in the ${sky(name, t)}.` });
    }
  }
  return events;
}

// ---------- tonight ----------

// Which planets are up while the sky is dark tonight, and when they are highest
export function tonight(now, lat, lon) {
  const [n0, n1] = nightOf(now);
  const step = 10 * 60_000;
  const out = [];
  for (const name of PLANET_LIST) {
    let from = null, to = null, best = null;
    for (let u = n0; u <= n1; u += step) {
      if (sunAlt(u, lat, lon) > -6) continue;
      const h = altAz(position(name, u), u, lat, lon);
      if (h.alt < 8) continue;
      if (from == null) from = u;
      to = u;
      if (!best || h.alt > best.alt) best = { t: u, ...h };
    }
    out.push({ name, from, to, best, elong: elongation(name, now) });
  }
  return out;
}

// ---------- everything ----------

// Events from t0 to t1, plus eclipses up to eclipseEnd
export function findEvents(t0, t1, lat, lon, eclipseEnd = t1) {
  const events = [
    ...moonEvents(t0, t1, lat, lon, eclipseEnd),
    ...seasonEvents(t0, t1, lat),
    ...solarEvents(t0, eclipseEnd),
    ...showerEvents(t0, t1, lat, lon),
    ...planetEvents(t0, t1),
  ];
  return events.filter(e => e.t >= t0 && e.t <= Math.max(t1, e.kind === 'eclipse' ? eclipseEnd : t1)).sort((a, b) => a.t - b.t);
}
