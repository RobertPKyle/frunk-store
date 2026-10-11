// Finds the visible passes of each satellite over the next hours: times when
// the satellite is above the horizon, sunlit, and the observer's sky is dark
// (Sun at least 6° below the horizon). Runs off the main thread because the
// car's CPU needs a few seconds for a couple of hundred satellites.
//
// in:  { sats: [{ id, omm }], lat, lon, start, hours }
// out: { type: 'passes', id, passes } per satellite, then { type: 'done' }
import { json2satrec, propagate, gstime, eciToEcf, ecfToLookAngles } from './satellite.js';
import { julianDay, localSiderealTime, toHorizon, sun } from '../_shared/astro.js';

const STEP = 60_000;      // coarse scan
const FINE = 10_000;      // sampling inside a pass
const MIN_ALT = 10;       // a pass must climb this high while visible
const DARK = -6;          // Sun altitude for a dark enough sky
const RE = 6378.137;      // Earth radius, km
const AU = 149_597_870.7; // km
const DEG = 180 / Math.PI;

let observer, lat, lon;

function sunAlt(t) {
  const jd = julianDay(new Date(t));
  const s = sun(jd);
  return toHorizon(s.ra, s.dec, lat, localSiderealTime(jd, lon)).alt;
}

// Sun direction in the satellite's inertial frame (TEME is close enough to
// the equator of date for a shadow test)
function sunVector(t) {
  const s = sun(julianDay(new Date(t)));
  const ra = s.ra / DEG, dec = s.dec / DEG;
  return [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
}

// Cylindrical Earth shadow: behind the Earth and within one Earth radius of
// the Sun-Earth line
function sunlit(p, s) {
  const d = p.x * s[0] + p.y * s[1] + p.z * s[2];
  if (d > 0) return true;
  const px = p.x - d * s[0], py = p.y - d * s[1], pz = p.z - d * s[2];
  return Math.hypot(px, py, pz) > RE;
}

function look(rec, t) {
  const date = new Date(t);
  const pv = propagate(rec, date);
  if (!pv || !pv.position) return null;
  const la = ecfToLookAngles(observer, eciToEcf(pv.position, gstime(date)));
  return { alt: la.elevation * DEG, az: ((la.azimuth * DEG) % 360 + 360) % 360, pos: pv.position, range: la.rangeSat };
}

// Samples one stretch of sky time finely and turns it into a pass, or null
function refine(rec, t0, t1) {
  const path = [];
  for (let t = t0; t <= t1; t += FINE) {
    const l = look(rec, t);
    if (!l || l.alt < 0) continue;
    if (sunAlt(t) > DARK) continue;
    path.push([t, +l.alt.toFixed(2), +l.az.toFixed(2), sunlit(l.pos, sunVector(t)) ? 1 : 0, Math.round(l.range)]);
  }
  const lit = path.filter(p => p[3]);
  if (!lit.length) return null;
  const top = lit.reduce((a, b) => (b[1] > a[1] ? b : a));
  if (top[1] < MIN_ALT) return null;
  const a = lit[0], b = lit[lit.length - 1];
  const last = path.indexOf(b);
  return {
    start: a[0], end: b[0], top: top[0], maxAlt: top[1], topAz: top[2], minRange: top[4],
    startAlt: a[1], startAz: a[2], endAlt: b[1], endAz: b[2],
    // The satellite fades out mid-sky when it enters Earth's shadow
    intoShadow: last < path.length - 1 && b[1] > 5,
    path: path.map(p => p.slice(0, 4)),
  };
}

function passesFor(omm, start, end, dark) {
  let rec;
  try { rec = json2satrec(omm); } catch { return []; }
  const out = [];
  let runStart = null;
  for (let i = 0, t = start; t <= end; i++, t += STEP) {
    let up = false;
    if (dark[i]) {
      const l = look(rec, t);
      up = !!l && l.alt > 0;
    }
    if (up && runStart == null) runStart = Math.max(start, t - STEP);
    if (!up && runStart != null) {
      const p = refine(rec, runStart, t);
      if (p) out.push(p);
      runStart = null;
    }
  }
  if (runStart != null) { const p = refine(rec, runStart, end); if (p) out.push(p); }
  return out;
}

self.onmessage = ({ data }) => {
  ({ lat, lon } = data);
  observer = { latitude: lat / DEG, longitude: lon / DEG, height: 0 };
  const start = data.start, end = start + data.hours * 3600_000;
  // Dark mask for the coarse scan, padded by one step so passes that start
  // right at dusk are not clipped
  const n = Math.ceil((end - start) / STEP) + 1;
  const raw = Array.from({ length: n }, (_, i) => sunAlt(start + i * STEP) <= DARK);
  const dark = raw.map((d, i) => d || raw[i - 1] || raw[i + 1]);
  for (const sat of data.sats) {
    self.postMessage({ type: 'passes', id: sat.id, passes: passesFor(sat.omm, start, end, dark) });
  }
  self.postMessage({ type: 'done' });
};
