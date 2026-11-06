// Plays many Wagon Trail 1848 journeys with a plain sensible player, to check
// the balance: how many arrive, how long it takes, how many die on the way.
//
//   node tools/test-wagon.mjs            # 2000 games for each job and month
//   GAMES=200 node tools/test-wagon.mjs
import * as G from '../apps/wagon/game.js';

const GAMES = +process.env.GAMES || 2000;
const NAMES = ['Ada', 'Ben', 'Cora', 'Dan', 'Eve'];

function shop(s, wantFood) {
  const cart = {};
  const price = k => G.storePrice(s, k) / (G.ITEMS[k].per || 1);
  const get = (k, n) => {
    n = Math.max(0, Math.min(n, G.ITEMS[k].max - s[k]));
    const cost = price(k) * n;
    if (cost > s.money) n = Math.floor(s.money / price(k));
    if (n > 0 && G.buy(s, { [k]: n })) cart[k] = n;
  };
  const poor = s.money < 700;
  if (s.oxen < 6) get('oxen', 6 - s.oxen);
  if (poor && s.ammo < 200) get('ammo', Math.ceil((200 - s.ammo) / 20) * 20);
  get('food', Math.ceil(((poor ? wantFood * 0.6 : wantFood) - s.food) / 50) * 50);
  get('clothes', (poor ? 1 : 2) * G.alive(s).length - s.clothes);
  for (const k of G.PARTS) if (!s[k]) get(k, 1);
  if (s.medicine < 2) get('medicine', 2 - s.medicine);
  if (s.ammo < 200) get('ammo', Math.ceil((200 - s.ammo) / 20) * 20);
  return cart;
}

function play(job, month, seed) {
  const s = G.newGame({ job, names: NAMES, month, seed });
  shop(s, 1000);
  s.phase = 'trail';
  s.rations = s.money < 100 ? 2 : 1;
  let guard = 0, brokenDays = 0;
  while (s.phase !== 'end' && guard++ < 600) {
    if (s.phase === 'river') {
      const opts = G.riverOptions(s).filter(o => !o.off);
      const has = h => opts.find(o => o.how === h);
      const how = s.river.depth <= 2.5 ? 'ford' : has('ferry') ? 'ferry' : has('guide') ? 'guide' : s.river.depth > 3.2 ? 'float' : 'ford';
      G.cross(s, how);
      continue;
    }
    if (s.phase === 'raft') {
      // a careful reader picks the clean way most of the time
      const safe = G.RAPIDS[s.rapids.now].ways.indexOf('safe');
      G.runRapid(s, Math.random() < 0.75 ? safe : Math.floor(Math.random() * 3));
      continue;
    }
    if (!s.leg) {
      if (G.STOPS[s.at].store) shop(s, 700);
      const opts = G.choicesAt(s);
      if (opts.length > 1) {
        const via = s.at === 'dalles' ? (s.money >= G.barlowToll(s) ? 'barlow' : 'raft') : opts[Math.floor(Math.random() * 2)].via;
        G.depart(s, via);
      } else G.depart(s);
      continue;
    }
    const people = G.alive(s);
    if (G.partyHealth(s) < 35 && !s.broken) { G.advance(s, 'rest'); continue; }
    if (s.food < people.length * 3 * 12 && s.ammo >= 20) {
      const shot = Math.random() * 300 * G.gameAbout(s);
      G.afterHunt(s, shot, 15);
      continue;
    }
    if ((s.broken && ++brokenDays > 4) || G.pull(s) < 1) {
      const o = G.tradeOffer(s);
      if (o && (o.give === s.broken || o.give === 'oxen')) G.acceptTrade(s, o);
      G.advance(s, 'camp');
      if (!s.broken) brokenDays = 0;
      continue;
    }
    G.advance(s, 'travel');
  }
  return s;
}

const months = [2, 3, 4, 5, 6];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
console.log('job        month  arrived  days  deaths  score');
for (const job of Object.keys(G.JOBS)) {
  for (const month of months) {
    var causes = {};
    let won = 0, days = 0, deaths = 0, score = 0;
    for (let i = 0; i < GAMES; i++) {
      const s = play(job, month, i * 7919 + month);
      if (s.ended === 'won') { won++; days += G.daysOut(s); score += G.score(s).total; }
      deaths += s.deaths.length;
      for (const d of s.deaths) causes[d.cause] = (causes[d.cause] || 0) + 1;
    }
    console.log(`${job.padEnd(10)} ${MONTH[month].padEnd(6)} ${(won / GAMES * 100).toFixed(0).padStart(5)}%  ${(days / Math.max(1, won)).toFixed(0).padStart(4)}  ${(deaths / GAMES).toFixed(2).padStart(6)}  ${(score / Math.max(1, won)).toFixed(0).padStart(5)}  ${Object.entries(causes).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c, n]) => `${c} ${(n / GAMES).toFixed(2)}`).join(', ')}`);
  }
}
