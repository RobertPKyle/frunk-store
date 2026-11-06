// Wagon Trail 1848: the rules. Nothing here touches the page, so node can
// play whole journeys to check the balance (tools/test-wagon.mjs).
//
// A game is one plain object (saved as JSON), and every random number comes
// from its own seed, so a saved game carries on the same way it would have.

export const YEAR = 1848;
const DAY = 86400000;

// ---------- random numbers ----------

export function rand(s) {
  let t = (s.rng = (s.rng + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (s, a, b) => a + (b - a) * rand(s);
const whole = (s, a, b) => Math.floor(between(s, a, b + 1));
const chance = (s, p) => rand(s) < p;
const pick = (s, list) => list[Math.floor(rand(s) * list.length)];
function weighted(s, entries) {
  const live = entries.filter(([, w]) => w > 0);
  let r = rand(s) * live.reduce((a, [, w]) => a + w, 0);
  for (const [item, w] of live) if ((r -= w) < 0) return item;
  return live[live.length - 1]?.[0];
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- who sets out, and with what ----------

export const JOBS = {
  merchant: { name: 'Merchant', money: 1200, mult: 1, note: 'Starts with the most money to spend.' },
  doctor: { name: 'Doctor', money: 900, mult: 1.5, note: 'Sickness strikes less often and passes sooner.' },
  smith: { name: 'Blacksmith', money: 750, mult: 2, note: 'Can often mend a broken wheel, axle or tongue without a spare.' },
  farmer: { name: 'Farmer', money: 500, mult: 3, note: 'Knows oxen: they go lame and die less often.' },
};

// ammo is kept in bullets and sold in boxes of 20
export const ITEMS = {
  oxen: { name: 'Oxen', unit: 'ox', units: 'oxen', price: 25, step: 1, max: 12 },
  food: { name: 'Food', unit: 'lb', units: 'lb', price: 0.2, step: 50, max: 2000 },
  clothes: { name: 'Clothing', unit: 'set', units: 'sets', price: 12, step: 1, max: 30 },
  ammo: { name: 'Bullets', unit: 'box of 20', units: 'boxes of 20', price: 3, step: 20, max: 1000, per: 20 },
  wheel: { name: 'Spare wheel', unit: 'wheel', units: 'wheels', price: 10, step: 1, max: 3 },
  axle: { name: 'Spare axle', unit: 'axle', units: 'axles', price: 12, step: 1, max: 3 },
  tongue: { name: 'Spare tongue', unit: 'tongue', units: 'tongues', price: 10, step: 1, max: 3 },
  medicine: { name: 'Medicine kit', unit: 'kit', units: 'kits', price: 10, step: 1, max: 10 },
};
export const PARTS = ['wheel', 'axle', 'tongue'];
const PART_NAME = { wheel: 'wheel', axle: 'axle', tongue: 'wagon tongue' };

// ---------- the trail ----------

// `region` and `rough` describe the leg that ends at the stop. Miles are
// close to the real ones; positions are for the map.
export const STOPS = {
  independence: { name: 'Independence, Missouri', short: 'Independence', kind: 'town', store: 1, region: 'plains', next: [['kansas', 102]], at: [39.09, -94.42] },
  kansas: { name: 'Kansas River crossing', short: 'Kansas River', kind: 'river', river: { depth: 3, width: 620, ferry: 5 }, region: 'plains', next: [['bigblue', 83]], at: [39.05, -95.7] },
  bigblue: { name: 'Big Blue River crossing', short: 'Big Blue River', kind: 'river', river: { depth: 2.6, width: 220 }, region: 'plains', next: [['kearny', 119]], at: [39.8, -96.65] },
  kearny: { name: 'Fort Kearny', short: 'Fort Kearny', kind: 'fort', store: 1.25, region: 'plains', next: [['chimney', 250]], at: [40.64, -99.0] },
  chimney: { name: 'Chimney Rock', short: 'Chimney Rock', kind: 'landmark', region: 'plains', next: [['laramie', 86]], at: [41.7, -103.35] },
  laramie: { name: 'Fort Laramie', short: 'Fort Laramie', kind: 'fort', store: 1.5, region: 'bluffs', next: [['indrock', 190]], at: [42.2, -104.56] },
  indrock: { name: 'Independence Rock', short: 'Independence Rock', kind: 'landmark', region: 'bluffs', next: [['southpass', 102]], at: [42.49, -107.13] },
  southpass: { name: 'South Pass', short: 'South Pass', kind: 'landmark', region: 'mountains', next: [['bridger', 125, 'bridger'], ['green', 85, 'cutoff']], at: [42.35, -108.9] },
  bridger: { name: 'Fort Bridger', short: 'Fort Bridger', kind: 'fort', store: 1.75, region: 'mountains', next: [['soda', 162]], at: [41.32, -110.39] },
  green: { name: 'Green River crossing', short: 'Green River', kind: 'river', river: { depth: 3.6, width: 400, ferry: 8 }, region: 'desert', dry: true, next: [['soda', 95]], at: [42.2, -110.15] },
  soda: { name: 'Soda Springs', short: 'Soda Springs', kind: 'landmark', region: 'mountains', next: [['hall', 57]], at: [42.65, -111.6] },
  hall: { name: 'Fort Hall', short: 'Fort Hall', kind: 'fort', store: 2, region: 'desert', next: [['snake', 182]], at: [43.02, -112.43] },
  snake: { name: 'Snake River crossing', short: 'Snake River', kind: 'river', river: { depth: 4.2, width: 1000, guide: 2 }, region: 'desert', next: [['boise', 114]], at: [42.95, -115.3] },
  boise: { name: 'Fort Boise', short: 'Fort Boise', kind: 'fort', store: 2.25, region: 'desert', next: [['blue', 160]], at: [43.8, -116.95] },
  blue: { name: 'Blue Mountains', short: 'Blue Mountains', kind: 'landmark', region: 'forest', rough: true, next: [['dalles', 125]], at: [45.45, -118.3] },
  dalles: { name: 'The Dalles', short: 'The Dalles', kind: 'landmark', region: 'desert', next: [['valley', 100, 'barlow'], ['valley', 0, 'raft']], at: [45.6, -121.18] },
  valley: { name: 'Willamette Valley', short: 'Willamette Valley', kind: 'end', region: 'forest', rough: true, at: [45.36, -122.6] },
};

// The way a game goes, for the progress strip and the map: the road taken
// so far, then the Fort Bridger road (or the cutoff, once chosen) to the end.
export function routeOf(s) {
  const out = ['independence'];
  let at = 'independence';
  while (STOPS[at].next) {
    const opts = STOPS[at].next;
    let choice = opts[0];
    if (opts.length > 1) {
      const took = s.took?.[at];
      if (took) choice = opts.find(o => o[2] === took) || choice;
    }
    at = choice[0];
    out.push(at);
  }
  return out;
}
export function milesBetween(from, to) {
  return STOPS[from].next.find(n => n[0] === to)?.[1] ?? 0;
}
export function routeMiles(s) {
  const r = routeOf(s);
  let total = 0;
  for (let i = 1; i < r.length; i++) {
    const via = s.took?.[r[i - 1]];
    const opt = STOPS[r[i - 1]].next.find(n => n[0] === r[i] && (!via || !n[2] || n[2] === via));
    total += opt?.[1] ?? 0;
  }
  return total;
}

// ---------- a new game ----------

export function newGame({ job = 'farmer', names, month = 3, seed = Date.now() }) {
  const s = {
    v: 1, rng: seed >>> 0, job,
    day: Math.round(Date.UTC(YEAR, month, 1) / DAY),
    start: Math.round(Date.UTC(YEAR, month, 1) / DAY),
    money: JOBS[job].money,
    oxen: 0, food: 0, clothes: 0, ammo: 0, wheel: 0, axle: 0, tongue: 0, medicine: 0,
    pace: 1, rations: 1,
    party: names.map(name => ({ name, health: 100, ill: null, alive: true, cause: '' })),
    at: 'independence', leg: null, crossed: false, river: null, took: {},
    broken: null, lame: 0, lost: 0, hunted: [], miles: 0, traded: 0,
    phase: 'store', rapids: null, ended: null, deaths: [],
  };
  s.weather = rollWeather(s);
  return s;
}

// ---------- reading a game ----------

export const dateOf = s => new Date(s.day * DAY);
export const monthOf = s => dateOf(s).getUTCMonth();
export const alive = s => s.party.filter(p => p.alive);
export const pull = s => Math.max(0, s.oxen - s.lame * 0.5);
export function region(s) {
  return s.leg ? STOPS[s.leg.to].region : STOPS[s.at].region;
}
export function legInfo(s) {
  if (!s.leg) return null;
  const to = STOPS[s.leg.to];
  const via = s.leg.via;
  return { region: to.region, rough: to.rough || via === 'barlow', dry: to.dry || via === 'cutoff' };
}
export function healthWord(h) {
  return h >= 70 ? 'good' : h >= 45 ? 'fair' : h >= 20 ? 'poor' : 'very poor';
}
export function partyHealth(s) {
  const a = alive(s);
  return a.length ? a.reduce((t, p) => t + p.health, 0) / a.length : 0;
}
export function weatherWord(w) {
  const t = w.temp >= 90 ? 'very hot' : w.temp >= 75 ? 'hot' : w.temp >= 55 ? 'warm' : w.temp >= 35 ? 'cool' : w.temp >= 15 ? 'cold' : 'very cold';
  return w.sky === 'clear' ? t : w.sky === 'cloudy' ? `${t}, cloudy` : `${t}, ${w.sky}`;
}
export const PACES = ['', 'Steady', 'Strenuous', 'Grueling'];
export const PACE_NOTE = ['', 'About 8 hours a day. Easy on everyone.', 'About 12 hours a day. Faster, but tiring.', '16 hours or more. Fastest, and it wears people down.'];
export const RATIONS = ['', 'Filling', 'Meager', 'Bare bones'];
export const RATION_LBS = [0, 3, 2, 1];
export const RATION_NOTE = ['', '3 lb a person a day. Keeps everyone strong.', '2 lb a person a day. Hunger slowly wears at health.', '1 lb a person a day. Food lasts, people weaken fast.'];

// What the next stop is and how far, for the status line
export function ahead(s) {
  if (s.leg) return { to: s.leg.to, miles: Math.max(0, s.leg.miles - s.leg.done) };
  const next = STOPS[s.at].next;
  if (!next) return null;
  if (next.length > 1) return { to: null, miles: 0 };
  return { to: next[0][0], miles: next[0][1] };
}

export function storePrice(s, item) {
  const mult = STOPS[s.at]?.store;
  if (!mult) return null;
  return ITEMS[item].price * mult;
}

// ---------- weather ----------

const TEMP = [26, 31, 43, 55, 65, 75, 81, 79, 68, 56, 42, 30];
const SHIFT = { plains: 0, bluffs: -3, mountains: -14, desert: 0, forest: -7 };
const WET = [0.18, 0.2, 0.26, 0.3, 0.3, 0.22, 0.14, 0.12, 0.14, 0.18, 0.22, 0.22];

function rollWeather(s) {
  const m = monthOf(s), r = region(s);
  const desert = r === 'desert' ? (m >= 5 && m <= 8 ? 7 : -4) : 0;
  // winter comes early to the high country
  const early = (r === 'mountains' || r === 'forest') && m >= 9 ? 6 * (m - 8) : 0;
  const temp = TEMP[m] + SHIFT[r] + desert - early + between(s, -12, 12);
  const wet = WET[m] * (r === 'desert' ? 0.5 : r === 'forest' ? 1.35 : 1);
  let sky = 'clear';
  if (chance(s, wet)) {
    if (temp < 32) sky = temp < 20 && chance(s, 0.35) ? 'blizzard' : 'snow';
    else sky = chance(s, 0.3) ? 'heavy rain' : 'rain';
  } else if (chance(s, 0.25)) sky = 'cloudy';
  return { temp: Math.round(temp), sky };
}

// ---------- sickness and harm ----------

const ILLS = {
  cholera: { name: 'cholera', hurt: 9, days: [3, 6] },
  dysentery: { name: 'dysentery', hurt: 5, days: [5, 10] },
  typhoid: { name: 'typhoid fever', hurt: 6, days: [7, 13] },
  measles: { name: 'measles', hurt: 4, days: [6, 10] },
  fever: { name: 'mountain fever', hurt: 4, days: [4, 9] },
  ague: { name: 'ague', hurt: 3, days: [5, 10] },
};
const HURTS = {
  arm: { name: 'a broken arm', hurt: 1.5, days: [14, 20], cause: 'a broken arm gone bad' },
  leg: { name: 'a broken leg', hurt: 2.5, days: [18, 26], cause: 'a broken leg gone bad' },
  snake: { name: 'a snakebite', hurt: 8, days: [3, 5], cause: 'a snakebite' },
  burn: { name: 'a bad burn', hurt: 3, days: [6, 10], cause: 'a bad burn' },
};

function fallIll(s, p, kind, table, say) {
  const t = table[kind];
  const doctor = s.job === 'doctor';
  let days = whole(s, ...t.days), hurt = t.hurt;
  if (doctor) days = Math.ceil(days * 0.7);
  let note = '';
  if (s.medicine > 0) {
    s.medicine--;
    days = Math.ceil(days / 2);
    hurt *= 0.6;
    note = ` You open a medicine kit (${s.medicine} left).`;
  }
  p.ill = { kind, name: t.name, hurt, days, cause: t.cause || t.name };
  say(`${p.name} has ${t.name}.${note}`);
}

function sickness(s) {
  const r = region(s);
  return weighted(s, [
    ['cholera', r === 'plains' ? 2 : 0.6],
    ['dysentery', 2.5],
    ['typhoid', 1.5],
    ['measles', 1],
    ['fever', r === 'mountains' || r === 'bluffs' ? 2.5 : 0.8],
    ['ague', r === 'plains' || r === 'forest' ? 1.5 : 0.5],
  ]);
}

function lose(s, frac, keys = ['food', 'clothes', 'ammo', 'medicine', 'wheel', 'axle', 'tongue']) {
  const gone = [];
  for (const k of keys) {
    if (!s[k]) continue;
    let n = s[k] * frac * between(s, 0.6, 1.4);
    n = k === 'food' || k === 'ammo' ? Math.round(n) : Math.floor(n + rand(s) * 0.6);
    n = clamp(n, 0, s[k]);
    if (!n) continue;
    s[k] -= n;
    gone.push(amount(k, n));
  }
  return gone;
}

export function amount(k, n) {
  if (k === 'food') return `${Math.round(n)} lb of food`;
  if (k === 'ammo') return `${n} bullet${n === 1 ? '' : 's'}`;
  if (k === 'oxen') return n === 1 ? '1 ox' : `${n} oxen`;
  if (k === 'clothes') return n === 1 ? '1 set of clothing' : `${n} sets of clothing`;
  if (k === 'medicine') return n === 1 ? '1 medicine kit' : `${n} medicine kits`;
  if (k === 'money') return `$${n.toFixed(2)}`;
  const name = PART_NAME[k] || k;
  return n === 1 ? `a spare ${name}` : `${n} spare ${name}s`;
}
export const listOf = items => items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

function die(s, p, cause, say) {
  p.alive = false;
  p.health = 0;
  p.ill = null;
  p.cause = cause;
  s.deaths.push({ name: p.name, cause, day: s.day, miles: s.miles });
  say(`${p.name} is gone, taken by ${cause}, and buried beside the trail.`);
  if (!alive(s).length) {
    s.phase = 'end';
    s.ended = 'lost';
  }
}

// ---------- one day ----------

// mode: 'travel' moves the wagon; 'rest' heals; 'camp' (hunting, trading,
// waiting at a river) passes the day without the strain of travel.
// Returns { notes: [{ text, stop }], arrived }: a stop note halts travel.
export function advance(s, mode = 'travel') {
  const notes = [];
  const say = (text, stop = true) => notes.push({ text, stop });
  if (s.phase === 'end') return { notes, arrived: null };
  s.day++;
  s.weather = rollWeather(s);
  const w = s.weather;
  const leg = legInfo(s);
  let moved = 0, arrived = null;

  if (mode === 'travel' && s.leg) {
    if (s.broken) {
      const odds = s.job === 'smith' ? 0.5 : 0.22;
      if (chance(s, odds)) {
        say(`You managed to mend the broken ${PART_NAME[s.broken]}. The wagon rolls again.`);
        s.broken = null;
      } else say(`Still at work on the broken ${PART_NAME[s.broken]}. The wagon can't move.`, false);
    } else if (w.sky === 'blizzard') {
      say('A blizzard. The wagon can\'t move today.', false);
      if (s.oxen > 0 && chance(s, 0.08)) {
        s.oxen--;
        s.lame = Math.min(s.lame, s.oxen);
        say(`An ox has frozen to death in the storm. ${s.oxen ? `${s.oxen} left.` : 'No oxen are left.'}`);
      }
    } else if (w.sky === 'snow' && (leg.region === 'mountains' || leg.region === 'forest') && chance(s, 0.45)) {
      say('Deep snow on the trail. You dig all day and get nowhere.', false);
    } else if (s.lost > 0) {
      s.lost--;
      say(s.lostWhy || 'You lose the day.', false);
    } else if (pull(s) <= 0) {
      say('There are no oxen to pull the wagon. Trade for one, or buy one at a fort.');
    } else {
      moved = milesToday(s, leg);
      s.leg.done += moved;
      if (s.leg.done >= s.leg.miles) {
        moved -= s.leg.done - s.leg.miles;
        arrived = s.leg.to;
        s.at = arrived;
        s.leg = null;
        s.crossed = false;
        s.river = STOPS[arrived].river ? rollRiver(s, arrived) : null;
        if (STOPS[arrived].kind === 'river') s.phase = 'river';
        if (STOPS[arrived].kind === 'end') { s.phase = 'end'; s.ended = 'won'; }
      }
      s.miles += moved;
    }
  }
  s.movedToday = moved;

  // food
  const people = alive(s);
  const eat = people.length * RATION_LBS[s.rations];
  const starving = s.food < eat;
  s.food = Math.max(0, s.food - eat);
  if (starving && people.length) say('The food has run out. Everyone is going hungry.', !s.hungry);
  s.hungry = starving;

  // health
  const need = w.temp < 15 ? 2 : w.temp < 35 ? 1 : 0;
  const warm = need ? Math.floor(s.clothes / need) : people.length;
  people.forEach((p, i) => {
    let d = 1;
    if (mode === 'rest') d += 4;
    else if (mode === 'travel' && moved > 0) d -= [0, 0, 1.5, 3.5][s.pace];
    d += starving ? -8 : [0, 1, -0.6, -3][s.rations];
    let cold = false;
    if (need && i >= warm) { d -= need === 2 ? 6 : 3; cold = true; }
    if (w.temp < 10) d -= 2;   // bitter cold gets through any coat
    if (w.sky === 'snow' || w.sky === 'blizzard') d -= 1.5;
    if (w.temp >= 92) d -= 1;
    if (w.sky === 'heavy rain' || w.sky === 'blizzard') d -= 1;
    if (leg?.dry && mode === 'travel' && moved) d -= 2;
    if (p.ill) d -= p.ill.hurt;
    p.health = clamp(p.health + d, 0, 100);
    if (p.health <= 0) {
      die(s, p, p.ill ? p.ill.cause : starving ? 'starvation' : cold ? 'the cold' : 'exhaustion', say);
      return;
    }
    if (p.ill && --p.ill.days <= 0) {
      say(`${p.name} has recovered from ${p.ill.name}.`, false);
      p.ill = null;
    }
  });
  if (s.phase === 'end') return { notes, arrived };

  // new sickness
  for (const p of alive(s)) {
    if (p.ill) continue;
    let odds = 0.0055 + (100 - p.health) / 100 * 0.03;
    if (s.job === 'doctor') odds *= 0.5;
    if (leg?.dry || region(s) === 'desert') odds *= 1.25;
    if (w.sky.includes('rain')) odds *= 1.2;
    if (s.rations === 1 && !starving) odds *= 0.8;
    if (mode === 'rest') odds *= 0.6;
    if (chance(s, odds)) fallIll(s, p, sickness(s), ILLS, say);
  }

  // lame oxen
  for (let i = 0; i < s.lame; i++) {
    if (chance(s, mode === 'rest' ? 0.25 : 0.05)) { s.lame--; i--; say('A lame ox is walking well again.', false); }
    else if (mode === 'travel' && chance(s, 0.025)) {
      s.lame--; s.oxen--; i--;
      say(`A lame ox has died. ${s.oxen ? `${s.oxen} left.` : 'No oxen are left.'}`);
    }
  }

  // out of season there is little grass, and the oxen weaken
  const m = monthOf(s);
  const bare = m >= 10 || m <= 1 ? 0.06 : m === 2 ? 0.03 : m === 9 ? 0.015 : 0;
  if (bare && s.oxen - s.lame > 0 && chance(s, bare * (s.job === 'farmer' ? 0.5 : 1))) {
    s.lame++;
    say(m === 2 ? 'The new grass isn\'t up yet. An ox has grown weak and lame.' : 'The grass is dead and buried under frost. An ox has grown weak and lame.');
  }

  // the dry stretch is hard on oxen
  if (leg?.dry && mode === 'travel' && moved && s.oxen > 0 && chance(s, s.job === 'farmer' ? 0.05 : 0.1)) {
    s.oxen--;
    s.lame = Math.min(s.lame, s.oxen);
    say(`An ox has died of thirst on the dry stretch. ${s.oxen ? `${s.oxen} left.` : 'No oxen are left.'}`);
  }

  // something happens
  if (!arrived && s.phase !== 'end') {
    const odds = mode === 'travel' ? (moved ? 0.075 : 0.02) : mode === 'rest' ? 0.02 : 0.03;
    if (chance(s, odds)) happen(s, mode, moved, say);
  }
  return { notes, arrived };
}

function milesToday(s, leg) {
  const eff = pull(s);
  const ox = Math.min(1.1, 0.4 + 0.1 * eff);
  const terrain = { plains: 1, bluffs: 0.95, mountains: 0.75, desert: 0.9, forest: 0.8 }[leg.region] * (leg.rough ? 0.7 : 1);
  const high = leg.region === 'mountains' || leg.region === 'forest';
  const sky = { clear: 1, cloudy: 1, rain: 0.85, 'heavy rain': 0.6, snow: high ? 0.35 : 0.6, blizzard: 0 }[s.weather.sky];
  const heat = s.weather.temp >= 92 ? 0.9 : 1;
  const pace = [0, 1, 1.3, 1.6][s.pace];
  const people = alive(s);
  const sick = people.filter(p => p.ill).length;
  const slow = sick * 2 > people.length ? 0.85 : 1;
  return Math.max(1, Math.round(17 * ox * terrain * sky * heat * pace * slow * between(s, 0.85, 1.15)));
}

function happen(s, mode, moved, say) {
  const r = region(s), leg = legInfo(s), m = monthOf(s), w = s.weather;
  const farmer = s.job === 'farmer' ? 0.5 : 1;
  const travel = mode === 'travel' && moved;
  const kind = weighted(s, [
    ['broken', travel ? (leg?.rough || r === 'mountains' ? 4 : 2) : 0],
    ['lame', travel && s.oxen - s.lame > 0 ? 1.5 * farmer : 0],
    ['oxDies', s.oxen > 0 ? (leg?.dry ? 3 : 0.6) * farmer : 0],
    ['thief', 1.2],
    ['lost', travel ? (r === 'plains' ? 0.5 : 1.2) : 0],
    ['berries', m >= 5 && m <= 8 && r !== 'desert' ? 1.5 : 0],
    ['abandoned', travel ? 1 : 0],
    ['badWater', r === 'desert' || leg?.dry ? 2 : 0.8],
    ['injury', 1.2],
    ['hail', w.sky.includes('rain') ? 1.5 : 0],
    ['fire', 0.4],
    ['noGrass', (r === 'desert' || leg?.dry) && m >= 6 ? 1.5 : 0.2],
    ['goodRoad', travel ? 1 : 0],
    ['company', 1],
    ['fish', r !== 'desert' || m >= 6 ? 0.7 : 0],
  ]);
  const people = alive(s);
  const someone = () => pick(s, people);
  switch (kind) {
    case 'broken': {
      const part = pick(s, PARTS);
      const name = PART_NAME[part];
      if (s[part] > 0) {
        s[part]--;
        say(`A ${name} broke on the rough trail. You fit your spare (${s[part]} left).`);
      } else if (chance(s, s.job === 'smith' ? 0.75 : 0.3)) {
        say(`A ${name} broke, but you managed to patch it and roll on.`);
      } else {
        s.broken = part;
        say(`A ${name} broke and you have no spare. The wagon can't move until it's mended. Keep trying each day, or trade for one.`);
      }
      break;
    }
    case 'lame':
      s.lame++;
      say(`An ox has gone lame. It will slow the wagon until it heals. Rest helps.`);
      break;
    case 'oxDies':
      s.oxen--;
      s.lame = Math.min(s.lame, s.oxen);
      say(`An ox has died. ${s.oxen ? `${s.oxen} left.` : 'No oxen are left.'}`);
      break;
    case 'thief': {
      const gone = lose(s, 0.15, [pick(s, ['food', 'ammo', 'clothes']), pick(s, ['food', 'medicine', 'clothes'])]);
      say(gone.length ? `A thief came in the night and took ${listOf(gone)}.` : 'A thief came in the night but found nothing worth taking.');
      break;
    }
    case 'lost': {
      const days = whole(s, 1, 4);
      s.lost = days;
      s.lostWhy = pick(s, ['You search for the trail.', 'You double back to find the trail.']);
      say(`You've lost the trail. It will take ${days === 1 ? 'a day' : `${days} days`} to find it again.`);
      break;
    }
    case 'berries': {
      const lbs = whole(s, 20, 60);
      s.food += lbs;
      say(`You find wild ${pick(s, ['chokecherries', 'currants', 'gooseberries', 'serviceberries'])} near the trail and gather ${lbs} lb.`);
      break;
    }
    case 'abandoned': {
      const k = pick(s, ['food', 'clothes', 'ammo', 'wheel', 'axle', 'tongue', 'medicine', 'nothing']);
      if (k === 'nothing') { say('You pass an abandoned wagon. It has been picked clean.'); break; }
      const n = k === 'food' ? whole(s, 30, 120) : k === 'ammo' ? whole(s, 2, 5) * 10 : 1;
      s[k] += n;
      say(`You find an abandoned wagon. Inside: ${amount(k, n)}.`);
      if (s.broken && s[s.broken] > 0) { s[s.broken]--; say(`You fit the spare ${PART_NAME[s.broken]}. The wagon rolls again.`); s.broken = null; }
      break;
    }
    case 'badWater':
      for (const p of people) p.health = clamp(p.health - whole(s, 6, 12), 1, 100);
      say('Bad water. Everyone is sick to the stomach for a day.');
      break;
    case 'injury': {
      const p = people.find(q => !q.ill && chance(s, 0.6)) || people.find(q => !q.ill);
      if (!p) break;
      fallIll(s, p, weighted(s, [['arm', 2], ['leg', 1], ['snake', r === 'plains' || r === 'desert' || r === 'bluffs' ? 1.5 : 0.3], ['burn', 0.8]]), HURTS, say);
      break;
    }
    case 'hail':
      s.lost = Math.max(s.lost, 1);
      s.lostWhy = 'You shelter from the storm.';
      say('A hailstorm. You stop to shelter the oxen.');
      break;
    case 'fire': {
      const gone = lose(s, 0.12);
      say(gone.length ? `A fire in the wagon. You lose ${listOf(gone)}.` : 'A fire in the wagon, but you put it out in time.');
      break;
    }
    case 'noGrass':
      if (s.oxen - s.lame > 0) { s.lame++; say('There is little grass for the oxen. One has grown weak and lame.'); }
      else say('There is little grass for the oxen.');
      break;
    case 'goodRoad': {
      const extra = whole(s, 4, 9);
      s.leg.done = Math.min(s.leg.miles - 1, s.leg.done + extra);
      s.miles += extra;
      say(`A smooth, dry stretch of trail. You make ${extra} extra miles.`, false);
      break;
    }
    case 'company': {
      const what = whole(s, 0, 2);
      if (what === 0 && s.food < 400) {
        const lbs = whole(s, 20, 50);
        s.food += lbs;
        say(`You camp with another wagon party. They share ${lbs} lb of food.`);
      } else if (what === 1) {
        for (const p of people) p.health = clamp(p.health + 5, 0, 100);
        say('You camp with another wagon party. Music and talk by the fire lift everyone\'s spirits.', false);
      } else say('You meet a party heading back east. They say the trail ahead is hard but passable.', false);
      break;
    }
    case 'fish': {
      const lbs = whole(s, 10, 35);
      s.food += lbs;
      say(`${someone().name} catches ${lbs} lb of fish in a creek.`, false);
      break;
    }
  }
}

// ---------- leaving a stop ----------

export function choicesAt(s) {
  return (STOPS[s.at].next || []).map(([to, miles, via]) => ({ to, miles, via }));
}
export function barlowToll(s) { return 5 + 0.1 * s.oxen; }

export function depart(s, via) {
  const opts = choicesAt(s);
  const opt = opts.find(o => o.via === via) || opts[0];
  if (!opt) return;
  if (opt.via) s.took[s.at] = opt.via;
  if (opt.via === 'barlow') s.money = Math.max(0, s.money - barlowToll(s));
  if (opt.via === 'raft') {
    s.phase = 'raft';
    s.rapids = { left: 3, now: rapid(s) };
    return;
  }
  s.leg = { from: s.at, to: opt.to, miles: opt.miles, done: 0, via: opt.via };
  s.at = null;
  s.river = null;
  s.phase = 'trail';
}

// ---------- rivers ----------

const MELT = [0.6, 0.6, 0.85, 1.25, 1.45, 1.3, 1, 0.8, 0.7, 0.7, 0.7, 0.6];
function rollRiver(s, stop) {
  const R = STOPS[stop].river;
  return {
    depth: Math.round(R.depth * MELT[monthOf(s)] * between(s, 0.8, 1.2) * 10) / 10,
    width: Math.round(R.width * between(s, 0.9, 1.1) / 10) * 10,
  };
}
export function riverOptions(s) {
  const R = STOPS[s.at].river, r = s.river;
  const out = [{ how: 'ford', label: 'Ford it', note: 'Drive the wagon through. Safe only in shallow water.' }];
  out.push({ how: 'float', label: 'Caulk and float', note: 'Seal the wagon bed and float it across.', off: r.depth < 1.5 ? 'Too shallow to float' : '' });
  if (R.ferry) out.push({ how: 'ferry', label: `Ferry ($${R.ferry})`, note: 'The safest way. You may wait a day or two for your turn.', off: s.money < R.ferry ? 'Not enough money' : '' });
  if (R.guide) out.push({ how: 'guide', label: `Hire a guide (${R.guide} sets of clothing)`, note: 'A Shoshone guide leads you over the shallows between the islands.', off: s.clothes < R.guide ? 'Not enough clothing to pay' : '' });
  out.push({ how: 'wait', label: 'Wait a day', note: 'See whether the water drops.' });
  return out;
}

// Returns { notes, crossed }
export function cross(s, how) {
  const notes = [];
  const say = (text, stop = true) => notes.push({ text, stop });
  const r = s.river, R = STOPS[s.at].river;
  const name = STOPS[s.at].short;
  if (how === 'wait') {
    const day = advance(s, 'camp');
    const trend = monthOf(s) >= 5 ? between(s, 0.82, 1.03) : between(s, 0.85, 1.12);
    r.depth = Math.max(0.8, Math.round(r.depth * trend * 10) / 10);
    say(`You wait a day. The ${name} is now ${r.depth} feet deep.`, false);
    return { notes: [...day.notes, ...notes], crossed: false };
  }
  let risk;
  if (how === 'ford') risk = r.depth <= 2.5 ? 0.04 : r.depth <= 3.2 ? 0.3 : r.depth <= 4.5 ? 0.6 : 0.85;
  else if (how === 'float') risk = 0.1 + r.width / 6000 + (r.depth > 6 ? 0.1 : 0);
  else if (how === 'ferry') {
    s.money -= R.ferry;
    const wait = whole(s, 0, 2);
    for (let i = 0; i < wait; i++) notes.push(...advance(s, 'camp').notes);
    if (s.phase === 'end') return { notes, crossed: false };
    say(wait ? `You wait ${wait === 1 ? 'a day' : `${wait} days`} for the ferry, then pay $${R.ferry.toFixed(2)} and cross.` : `You pay $${R.ferry.toFixed(2)} and the ferry takes you over.`, false);
    risk = 0.02;
  } else if (how === 'guide') {
    s.clothes -= R.guide;
    say(`You give the guide ${R.guide} sets of clothing, and the guide leads the wagon across, island to island.`, false);
    risk = 0.04;
  }
  const deep = how === 'ford' ? r.depth > 2.5 : true;
  if (chance(s, risk)) {
    const bad = how === 'ford' ? clamp((r.depth - 2) / 4, 0.1, 0.6) : how === 'float' ? 0.3 : 0.12;
    const gone = lose(s, bad);
    if (s.oxen > 0 && deep && chance(s, bad)) { s.oxen--; s.lame = Math.min(s.lame, s.oxen); gone.push('1 ox'); }
    const what = how === 'ford' ? (r.depth > 3.2 ? 'The water pours over the wagon bed and it nearly tips.' : 'The wagon sticks in the mud of the river bed.')
      : how === 'float' ? 'The wagon tips in the current.' : 'The wagon slides on the crossing and takes on water.';
    say(`${what}${gone.length ? ` You lose ${listOf(gone)}.` : ' Somehow nothing is lost.'}`);
    if (deep && chance(s, bad * 0.35)) {
      const p = pick(s, alive(s));
      die(s, p, 'drowning', say);
    }
    if (s.phase !== 'end' && how === 'ford' && r.depth <= 3.2) {
      notes.push(...advance(s, 'camp').notes);
      say('You lose a day drying out your things.', false);
    }
  } else if (how === 'ford' || how === 'float') {
    say(`You ${how === 'ford' ? 'drive' : 'float'} the wagon across the ${name} without trouble.`, false);
  }
  if (s.phase === 'end') return { notes, crossed: false };
  s.crossed = true;
  s.phase = 'trail';
  return { notes, crossed: true };
}

// ---------- down the Columbia ----------

// Each rapid says enough to read it: one way through is clean, one rough,
// one a wreck.
export const RAPIDS = [
  { text: 'A rocky island splits the river. Left of it the channel narrows and foams. To the right the water runs broad and dark.', ways: ['wreck', 'rough', 'safe'] },
  { text: 'Boulders show along the right bank. A smooth tongue of water runs down the middle. The left side churns over a shelf of rock.', ways: ['rough', 'safe', 'wreck'] },
  { text: 'The current pulls hard toward a cliff on the right. Along the left shore the river slows in a long eddy.', ways: ['safe', 'rough', 'wreck'] },
  { text: 'Mist rises from a drop in the middle of the river. Both edges look calmer, but the right edge is shallow gravel.', ways: ['safe', 'wreck', 'rough'] },
  { text: 'Whirlpools spin on the left. In the middle, tall standing waves. On the right, a clear chute between two rocks.', ways: ['wreck', 'rough', 'safe'] },
  { text: 'A sunken log lies across the left channel. The middle is fast but open. The right side is choked with driftwood.', ways: ['wreck', 'safe', 'rough'] },
];
function rapid(s) {
  let i;
  do i = whole(s, 0, RAPIDS.length - 1); while (i === s.rapids?.now);
  return i;
}
export const rapidText = s => RAPIDS[s.rapids.now].text;

export function runRapid(s, way) { // way: 0 left, 1 middle, 2 right
  const notes = [];
  const say = (text, stop = true) => notes.push({ text, stop });
  const result = RAPIDS[s.rapids.now].ways[way];
  for (let i = 0; i < 1; i++) notes.push(...advance(s, 'camp').notes);
  if (s.phase === 'end') return { notes, result };
  if (result === 'safe') say('The raft slips through cleanly.');
  else if (result === 'rough') {
    const gone = lose(s, 0.15, ['food', 'clothes', 'ammo', 'medicine']);
    for (const p of alive(s)) p.health = clamp(p.health - whole(s, 3, 10), 1, 100);
    say(`The raft bucks and spins on the rocks.${gone.length ? ` Over the side go ${listOf(gone)}.` : ''} Everyone is soaked and bruised.`);
  } else {
    const gone = lose(s, 0.45, ['food', 'clothes', 'ammo', 'medicine']);
    say(`The raft slams into the rocks and breaks apart. You drag it ashore and rebuild it.${gone.length ? ` Lost to the river: ${listOf(gone)}.` : ''}`);
    if (chance(s, 0.4)) die(s, pick(s, alive(s)), 'drowning', say);
    else for (const p of alive(s)) p.health = clamp(p.health - whole(s, 8, 18), 1, 100);
    if (s.phase !== 'end') notes.push(...advance(s, 'camp').notes);
  }
  if (s.phase === 'end') return { notes, result };
  s.rapids.left--;
  if (s.rapids.left <= 0) {
    s.rapids = null;
    s.at = 'valley';
    s.miles += 100;
    s.phase = 'end';
    s.ended = 'won';
    say('The river opens out below the last rapid, and you land near Fort Vancouver. A few more days take you up the Willamette.', false);
  } else s.rapids.now = rapid(s);
  return { notes, result };
}

// ---------- the store, trading, resting, hunting ----------

export function buy(s, cart) {
  let cost = 0;
  for (const [k, n] of Object.entries(cart)) cost += storePrice(s, k) * (n / (ITEMS[k].per || 1));
  cost = Math.round(cost * 100) / 100;
  if (cost > s.money + 1e-9) return false;
  s.money = Math.round((s.money - cost) * 100) / 100;
  for (const [k, n] of Object.entries(cart)) s[k] = Math.min(ITEMS[k].max, s[k] + n);
  if (s.broken && s[s.broken] > 0) { s[s.broken]--; s.broken = null; }
  return true;
}

const VALUE = { oxen: 25, food: 0.2, clothes: 12, ammo: 0.15, wheel: 10, axle: 12, tongue: 10, medicine: 10 };
export function tradeOffer(s) {
  const goods = Object.keys(VALUE);
  let give;
  if (pull(s) < 2 && chance(s, 0.7)) give = 'oxen';
  else if (s.broken && chance(s, 0.6)) give = s.broken;
  else give = pick(s, goods);
  const giveN = give === 'food' ? whole(s, 5, 15) * 10 : give === 'ammo' ? whole(s, 2, 6) * 20 : give === 'clothes' ? whole(s, 1, 3) : 1;
  const worth = VALUE[give] * giveN * between(s, 0.9, 1.7);
  const wants = goods.filter(k => k !== give).map(k => {
    let n = Math.max(1, worth / VALUE[k]);
    n = k === 'food' ? Math.ceil(n / 10) * 10 : k === 'ammo' ? Math.ceil(n / 10) * 10 : Math.round(n);
    return [k, n];
  }).filter(([k, n]) => s[k] >= n && (k !== 'oxen' || s.oxen - n >= 1) && n > 0);
  if (!wants.length) return null;
  const [want, wantN] = pick(s, wants);
  return { give, giveN, want, wantN };
}
export function acceptTrade(s, o) {
  if (s[o.want] < o.wantN) return false;
  s[o.want] -= o.wantN;
  s[o.give] = Math.min(ITEMS[o.give].max, s[o.give] + o.giveN);
  if (o.want === 'oxen') s.lame = Math.min(s.lame, s.oxen);
  if (s.broken && s[s.broken] > 0) { s[s.broken]--; s.broken = null; }
  return true;
}

// How many animals are about: fewer where this party has hunted lately
export function gameAbout(s) {
  const recent = s.hunted.filter(m => s.miles - m < 120).length;
  return Math.max(0.25, 1 - 0.25 * recent);
}
export function carryLimit(s) {
  return Math.min(300, 100 + 40 * alive(s).filter(p => p.health >= 20 && !p.ill).length);
}
export function afterHunt(s, shot, used) {
  s.ammo = Math.max(0, s.ammo - used);
  const carried = Math.min(shot, carryLimit(s));
  s.food = Math.min(ITEMS.food.max, s.food + carried);
  s.hunted.push(s.miles);
  s.lastHunt = { shot, used, carried };
  const day = advance(s, 'camp');
  return { carried, notes: day.notes };
}

// ---------- the end ----------

export function score(s) {
  const lines = [];
  const add = (label, pts) => { if (pts) lines.push([label, Math.round(pts)]); };
  for (const p of alive(s)) add(`${p.name} (${healthWord(p.health)} health)`, 100 + p.health);
  add(amount('oxen', s.oxen), s.oxen * 8);
  add(`${Math.round(s.food)} lb of food`, s.food / 25);
  add(amount('clothes', s.clothes), s.clothes * 4);
  add(`${s.ammo} bullets`, s.ammo / 10);
  const parts = s.wheel + s.axle + s.tongue;
  add(`${parts} spare part${parts === 1 ? '' : 's'}`, parts * 6);
  add(amount('medicine', s.medicine), s.medicine * 6);
  add(`$${s.money.toFixed(2)} cash`, s.money / 5);
  const base = lines.reduce((t, [, p]) => t + p, 0);
  const mult = JOBS[s.job].mult;
  return { lines, base, mult, total: Math.round(base * mult) };
}

export const daysOut = s => s.day - s.start;
