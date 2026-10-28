// End-to-end check of the hub and every sample app, at the Model 3 browser
// viewport. Uses the system Chrome through playwright-core.
//
//   node tools/e2e.mjs                       # against `npm run dev`
//   node tools/e2e.mjs https://frunk.store   # against production
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { n64TestRom } from './n64-test-rom.mjs';

const base = process.argv[2] || 'http://localhost:5173';
const shots = new URL('../.e2e/', import.meta.url).pathname;
mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 773, height: 601 }, deviceScaleFactor: 1.53, hasTouch: true });

// Serve CelesTrak orbit data from a local copy refreshed at most once a day:
// CelesTrak blocks clients that download the same data too often.
async function celestrak(group) {
  const file = `${shots}celestrak-${group}.json`;
  try { if (Date.now() - statSync(file).mtimeMs < 86400_000) return readFileSync(file, 'utf8'); } catch {}
  const body = await (await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=json`)).text();
  JSON.parse(body); // throws on CelesTrak's plain-text rate-limit note
  writeFileSync(file, body);
  return body;
}
await page.route('https://celestrak.org/**', async route => {
  const group = new URL(route.request().url()).searchParams.get('GROUP');
  route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: await celestrak(group) });
});

const errors = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => {
  if (m.type() !== 'error') return;
  // Pit Stop asks again when OpenStreetMap is busy; the check below fails if it never answers
  if (m.location().url.includes('/api/places') && m.text().includes('status of 503')) return;
  errors.push(`console: ${m.text()}`);
});

let failed = 0;
// ONLY=freedoom node tools/e2e.mjs runs just the checks with that in their name
const only = process.env.ONLY;
async function check(name, fn) {
  if (only && !name.includes(only) && name !== 'no console or page errors') return;
  try { await fn(); console.log(`ok   ${name}`); }
  catch (e) {
    if (e.message.startsWith('SKIP: ')) { console.log(`skip ${name}\n     ${e.message.slice(6)}`); return; }
    failed++; console.log(`FAIL ${name}\n     ${process.env.VERBOSE === "2" ? e.stack : process.env.VERBOSE ? e.message : e.message.split("\n")[0]}`); }
}
const appFrame = () => page.frameLocator('#frame');
const dev = base.includes('localhost');
const appsBase = dev ? 'http://127.0.0.1:5174' : 'https://frunk-apps.vercel.app';
// Apps for FrunkStore token holders aren't on the grid: they open from the
// Holders menu, once this browser is unlocked (see the holders checks). The
// made-up balances that unlock it exist only on the dev server.
async function openFromHub(name) {
  await page.goto(base + '/');
  await page.waitForSelector('.card');
  // by title: the Holders card's tagline names the apps inside it
  const card = page.locator('#grid .card').filter({ has: page.locator('h2', { hasText: name }) });
  if (await card.count()) {
    await card.click();
  } else {
    if (!dev) throw new Error('SKIP: early access for holders, which only the dev server can unlock');
    await page.locator('#grid').getByRole('button', { name: /Holders/ }).click();
    await appFrame().locator('#apps .app').filter({ hasText: name }).click();
    await page.waitForURL(/\/app\/(?!holders)[\w-]+$/);
  }
  await page.waitForSelector('#loading', { state: 'hidden' });
}

await check('hub lists every catalog app', async () => {
  await page.goto(base + '/');
  await page.waitForSelector('.card');
  const expected = (await (await fetch(base + '/catalog.json')).json()).apps.filter(app => !app.holders && !app.unlisted).length;
  const n = await page.locator('.card').count();
  if (n !== expected) throw new Error(`expected ${expected} cards, got ${n}`);
  if (!(await page.evaluate(() => crossOriginIsolated))) throw new Error('hub not cross-origin isolated');
  await page.screenshot({ path: shots + 'hub.png' });
});

await check('fractal renders with worker threads', async () => {
  await openFromHub(/Fractal Explorer/);
  const info = appFrame().locator('#info');
  await info.filter({ hasText: /ms/ }).waitFor({ timeout: 15000 });
  const text = await info.textContent();
  if (!/threads/.test(text)) throw new Error(`not multi-threaded: "${text}"`);
  const frame = page.frames().find(f => f.url().includes('/fractal/'));
  if (!(await frame.evaluate(() => crossOriginIsolated))) throw new Error('app frame not cross-origin isolated');
  console.log(`     ${text}`);
  await page.screenshot({ path: shots + 'fractal.png' });
});

await check('home button closes app', async () => {
  await page.click('#home');
  await page.waitForSelector('#runner', { state: 'hidden' });
  if (new URL(page.url()).pathname !== '/') throw new Error(`URL not reset: ${page.url()}`);
});

await check('home button closes apps opened one after another', async () => {
  // Unloading a frame by navigating it used to add history entries, so the
  // second app's home button only moved its frame back a page
  const before = await page.evaluate(() => history.length);
  for (const name of [/Brick Breaker/, /Retro Console/, /Brick Breaker/]) {
    await page.locator('#grid').getByRole('button', { name }).click();
    await page.waitForSelector('#loading', { state: 'hidden' });
    await page.click('#home');
    await page.waitForSelector('#runner', { state: 'hidden', timeout: 3000 });
  }
  const after = await page.evaluate(() => history.length);
  if (after > before + 1) throw new Error(`history grew from ${before} to ${after}`);
});

await check('hub shows recent apps and filters by category', async () => {
  // the apps opened above, newest first, in place of the lede
  const recent = await page.locator('#recent .recent-app').allTextContents();
  if (recent[0] !== 'Brick Breaker' || recent[1] !== 'Retro Console') throw new Error(`recent row: ${recent.join(', ')}`);
  if (await page.locator('#lede').isVisible()) throw new Error('lede still shown next to the recent row');
  await page.getByRole('button', { name: 'Games', exact: true }).click();
  const games = await page.locator('#grid .card h2').allTextContents();
  if (!games.includes('Retro Console') || games.includes('Weather')) throw new Error(`Games shows ${games.join(', ')}`);
  await page.reload();
  await page.waitForSelector('#grid .card');
  if (await page.locator('#grid .card').count() !== games.length) throw new Error('the filter wasn\'t remembered');
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.locator('#recent').getByRole('button', { name: 'Retro Console' }).click();
  await page.waitForSelector('#loading', { state: 'hidden' });
  if (!page.frames().some(f => f.url().includes('/retro/'))) throw new Error('recent app didn\'t open');
  await page.click('#home');
  await page.waitForSelector('#runner', { state: 'hidden' });
});

await check('hub badges a new app until it is opened', async () => {
  // Brick Breaker made new today, so the check doesn't depend on the catalog's real dates
  const today = new Date().toLocaleDateString('sv');
  // on the context, so it reaches the hub's service worker too
  await page.context().route('**/catalog.json', async route => {
    const catalog = await (await route.fetch()).json();
    catalog.apps.find(app => app.id === 'breakout').added = today;
    route.fulfill({ json: catalog });
  });
  try {
    await page.evaluate(() => localStorage.removeItem('hub.opened'));
    await page.reload();
    const card = page.locator('#grid .card[data-app="breakout"]');
    await card.locator('.badge', { hasText: 'New' }).waitFor({ timeout: 3000 });
    await card.click();
    await page.waitForSelector('#loading', { state: 'hidden' });
    await page.click('#home');
    await page.waitForSelector('#runner', { state: 'hidden' });
    if (await card.locator('.badge').count()) throw new Error('badge still shown after opening');
    await page.reload();
    await page.waitForSelector('#grid .card');
    if (await card.locator('.badge').count()) throw new Error('badge back after a reload');
  } finally {
    await page.context().unroute('**/catalog.json');
  }
});

await check('hub switches language and remembers it', async () => {
  const zh = await (await fetch(base + '/lang/zh-Hant.json')).json();
  await page.goto(base + '/');
  await page.waitForSelector('#grid .card');
  await page.click('#langBtn');
  await page.getByRole('menuitemradio', { name: '繁體中文' }).click();
  await page.locator('h1', { hasText: zh.ui.title }).waitFor({ timeout: 3000 });
  const names = await page.locator('#grid .card h2').allTextContents();
  if (!names.includes(zh.apps.breakout.name)) throw new Error(`cards not translated: ${names.join(', ')}`);
  await page.reload();
  await page.locator('h1', { hasText: zh.ui.title }).waitFor({ timeout: 3000 });
  const state = await page.evaluate(() => ({ lang: document.documentElement.lang, waiting: document.documentElement.classList.contains('i18n-wait') }));
  if (state.lang !== 'zh-Hant' || state.waiting) throw new Error(`after reload: ${JSON.stringify(state)}`);
  await page.click('#langBtn');
  await page.getByRole('menuitemradio', { name: 'English' }).click();
  await page.locator('h1', { hasText: "Apps for your car's browser" }).waitFor({ timeout: 3000 });
  if (!(await page.locator('#grid .card h2').allTextContents()).includes('Brick Breaker')) throw new Error('cards not back in English');
});

await check('every language has every string', async () => {
  // compares each language's file with the English on the page: every key,
  // the same links and markup, the same {placeholders}, every app and tag
  const problems = await page.evaluate(async () => {
    const { LANGS, EN_UI } = await import('/i18n.js');
    const catalog = await (await fetch('/catalog.json')).json();
    const en = { ...EN_UI };
    for (const node of document.querySelectorAll('[data-i18n]')) en[node.dataset.i18n] = node.innerHTML;
    for (const node of document.querySelectorAll('[data-i18n-label]')) en[node.dataset.i18nLabel] = node.getAttribute('aria-label');
    for (const node of document.querySelectorAll('[data-i18n-title]')) en[node.dataset.i18nTitle] = node.title;
    const shape = html => {
      const tpl = document.createElement('template');
      tpl.innerHTML = html;
      const tags = [...tpl.content.querySelectorAll('*')].map(n => n.tagName + ' ' + (n.getAttribute('href') ?? ''));
      return [...tags, ...(html.match(/\{\w+\}/g) ?? [])].sort().join(', ');
    };
    const tags = new Set(catalog.apps.flatMap(app => app.tags));
    const problems = [];
    for (const [code] of LANGS.slice(1)) {
      const file = await (await fetch(`/lang/${code}.json`)).json();
      for (const key of Object.keys(en)) {
        if (!(key in file.ui)) problems.push(`${code}: no ${key}`);
        else if (shape(file.ui[key]) !== shape(en[key])) problems.push(`${code}: ${key} has "${shape(file.ui[key])}", English has "${shape(en[key])}"`);
      }
      for (const key of Object.keys(file.ui)) if (!(key in en)) problems.push(`${code}: unused ${key}`);
      // early-access apps show only in the Holders menu, in English
      for (const app of catalog.apps) if (!app.holders && !file.apps[app.id]?.tagline) problems.push(`${code}: no tagline for ${app.id}`);
      for (const tag of tags) if (!file.tags[tag]) problems.push(`${code}: no tag ${tag}`);
    }
    return problems;
  });
  if (problems.length) throw new Error(problems.join('\n'));
});

await check('breakout runs and launches', async () => {
  await openFromHub(/Brick Breaker/);
  const frame = page.frames().find(f => f.url().includes('/breakout/'));
  await frame.waitForFunction(() => document.title.includes('fps'), null, { timeout: 10000 });
  await page.mouse.click(386, 400);
  await page.waitForTimeout(600);
  const msg = await appFrame().locator('#msg').textContent();
  if (msg.trim()) throw new Error(`still showing message after launch: "${msg}"`);
  console.log(`     ${await frame.title()}`);
  await page.screenshot({ path: shots + 'breakout.png' });
});

await check('old ?app= link redirects to /app/ path', async () => {
  await page.goto(base + '/?app=breakout');
  await page.waitForFunction(() => location.pathname === '/app/breakout');
});

await check('probe deep link + isolation inside frame', async () => {
  await page.goto(base + '/app/probe');
  const frame = await (async () => {
    for (let i = 0; i < 50; i++) {
      const f = page.frames().find(f => f.url().includes('/probe/'));
      if (f) return f;
      await page.waitForTimeout(100);
    }
    throw new Error('probe frame never loaded');
  })();
  await frame.waitForFunction(() => document.getElementById('status').textContent.startsWith('Probe done'));
  const json = JSON.parse(await frame.locator('#json').textContent());
  if (json.Compute.crossOriginIsolated !== true) throw new Error('probe reports crossOriginIsolated false');
  await page.screenshot({ path: shots + 'probe.png' });
});

await check('sleep sounds preset starts audio', async () => {
  await openFromHub(/Sleep Sounds/);
  await appFrame().getByRole('button', { name: 'Rainy night' }).click();
  await appFrame().locator('.tile.on').nth(1).waitFor({ timeout: 5000 });
  const frame = page.frames().find(f => f.url().includes('/sleep/'));
  const running = await frame.evaluate(() => new Promise(r => setTimeout(() => r(document.querySelectorAll('.tile.on').length), 300)));
  if (running !== 2) throw new Error(`expected 2 active sounds, got ${running}`);
  await appFrame().getByRole('button', { name: 'Stop all' }).click();
  await page.screenshot({ path: shots + 'sleep.png' });
});

await check('campfire renders', async () => {
  await openFromHub(/Campfire/);
  await appFrame().locator('#fps').filter({ hasText: /fps/ }).waitFor({ timeout: 8000 });
  console.log(`     ${await appFrame().locator('#fps').textContent()}`);
  await page.screenshot({ path: shots + 'campfire.png' });
});

await check('star map draws after picking a place', async () => {
  await openFromHub(/Star Map/);
  const picker = appFrame().locator('.fp-picker');
  if (await picker.isVisible()) await appFrame().getByRole('button', { name: 'Moab' }).click();
  await appFrame().locator('#when').filter({ hasText: /Now ·/ }).waitFor({ timeout: 8000 });
  await page.screenshot({ path: shots + 'stars.png' });
});

await check('weather loads a forecast and tonight\'s sky', async () => {
  await openFromHub(/Weather/);
  // Change place through the shared picker's search
  await appFrame().locator('#placeBtn').click();
  await appFrame().locator('.fp-search').fill('Moab');
  await appFrame().getByRole('button', { name: /Moab.*Utah/ }).click();
  await appFrame().locator('#temp').filter({ hasText: /°/ }).waitFor({ timeout: 15000 });
  const sky = await appFrame().locator('#sky').textContent();
  if (!/Moon/.test(sky)) throw new Error(`sky card missing Moon: "${sky}"`);
  const hours = await appFrame().locator('.hr').count(), days = await appFrame().locator('.day').count();
  if (hours < 24 || days !== 7) throw new Error(`expected 24+ hours and 7 days, got ${hours} and ${days}`);
  console.log(`     ${(await appFrame().locator('#temp').textContent())} ${await appFrame().locator('#desc').textContent()}`);
  await page.screenshot({ path: shots + 'weather.png' });
});

await check('satellite tracker predicts passes', async () => {
  await openFromHub(/Satellite Tracker/);
  const frame = page.frames().find(f => f.url().includes('/satellites/'));
  await frame.waitForFunction(() => !document.getElementById('hero').textContent.includes('Loading')
    && !document.getElementById('hero').textContent.includes('Working'), null, { timeout: 30000 });
  await appFrame().getByRole('button', { name: 'All bright' }).click();
  await appFrame().locator('.pass').first().waitFor({ timeout: 30000 });
  console.log(`     ${(await appFrame().locator('#hero').innerText()).replace(/\s+/g, ' ')} · ${await appFrame().locator('.pass').count()} passes listed`);
  await appFrame().getByRole('button', { name: 'Highlights' }).click();
  await page.screenshot({ path: shots + 'satellites.png' });
});

await check('sky events lists the year ahead', async () => {
  await openFromHub(/Sky Events/);
  const picker = appFrame().locator('.fp-picker');
  if (await picker.isVisible()) await appFrame().getByRole('button', { name: 'Moab' }).click();
  await appFrame().locator('.ev').first().waitFor({ timeout: 15000 });
  const highlights = await appFrame().locator('.ev').count();
  const titles = (await appFrame().locator('.ev h3').allTextContents()).join(' | ');
  for (const want of [/Full .*Moon/, /meteor shower/, /solstice|equinox/]) {
    if (!want.test(titles)) throw new Error(`no ${want} in highlights`);
  }
  if (await appFrame().locator('.pl').count() !== 5) throw new Error('tonight panel missing planets');
  await page.screenshot({ path: shots + 'skyevents.png' });
  await appFrame().getByRole('button', { name: 'Eclipses' }).click();
  const eclipses = await appFrame().locator('.ev').count();
  if (eclipses < 10) throw new Error(`only ${eclipses} eclipses in 5 years`);
  console.log(`     ${highlights} highlights, ${eclipses} eclipses in 5 years`);
  await page.screenshot({ path: shots + 'skyevents-eclipses.png' });
  await appFrame().getByRole('button', { name: 'Highlights' }).click();
});

await check('what\'s around me lists places and opens an article', async () => {
  await openFromHub(/What's Around Me/);
  const picker = appFrame().locator('.fp-picker');
  if (await picker.isVisible()) await appFrame().getByRole('button', { name: 'Moab' }).click();
  await appFrame().locator('.item').first().waitFor({ timeout: 20000 });
  console.log(`     ${await appFrame().locator('#summary').textContent()}`);
  await appFrame().getByRole('button', { name: 'Best known' }).click();
  await appFrame().locator('.item').first().click();
  await appFrame().locator('#article .credit').waitFor({ timeout: 15000 });
  const paras = await appFrame().locator('#article p').count();
  if (paras < 2) throw new Error(`article has ${paras} paragraphs`);
  console.log(`     ${await appFrame().locator('#article h1').textContent()}: ${paras} paragraphs`);
  await page.screenshot({ path: shots + 'nearby.png' });
  await appFrame().getByRole('button', { name: 'Show map' }).click();
  await page.screenshot({ path: shots + 'nearby-map.png' });
});

await check('pit stop lists places with hours and directions', async () => {
  await openFromHub(/Pit Stop/);
  const picker = appFrame().locator('.fp-picker');
  if (await picker.isVisible()) await appFrame().getByRole('button', { name: 'Moab' }).click();
  // A spot the CDN hasn't cached waits on OpenStreetMap's busy servers
  await appFrame().locator('.item').first().waitFor({ timeout: 130000 });
  console.log(`     ${await appFrame().locator('#summary').textContent()}`);
  await appFrame().locator('[data-group="food"]').click();
  await appFrame().locator('.item').first().click();
  await appFrame().locator('#detail .qr canvas').waitFor({ state: 'attached', timeout: 5000 });
  console.log(`     ${await appFrame().locator('#detail h1').textContent()}: ${await appFrame().locator('#detail .sub').textContent()}`);
  await page.screenshot({ path: shots + 'pitstop.png' });
  await appFrame().getByRole('button', { name: 'Show map' }).click();
  await appFrame().locator('[data-group="all"]').click();
  await page.screenshot({ path: shots + 'pitstop-map.png' });
});

await check('chess puzzle renders a board', async () => {
  await openFromHub(/Chess Puzzle/);
  const frame = page.frames().find(f => f.url().includes('/chess/'));
  await frame.waitForFunction(() => {
    const n = document.getElementById('board').children.length;
    const s = document.getElementById('status').textContent;
    return n === 64 || s.includes("Couldn't");
  }, null, { timeout: 15000 });
  console.log(`     ${await frame.locator('#status').textContent()}`);
  // Next puzzle brings a different one
  const first = await frame.locator('#sub').textContent();
  await appFrame().getByRole('button', { name: 'Next puzzle' }).click();
  await frame.waitForFunction(was => {
    const sub = document.getElementById('sub').textContent;
    return (sub !== was && /Puzzle #/.test(sub)) || document.getElementById('status').textContent.includes("Couldn't");
  }, first, { timeout: 15000 });
  const status = await frame.locator('#status').textContent();
  if (status.includes("Couldn't")) throw new Error(status);
  console.log(`     next: ${await frame.locator('#sub').textContent()}`);
  await page.screenshot({ path: shots + 'chess.png' });
});

await check('terrarium runs, feeds and catches up after time away', async () => {
  await openFromHub(/Terrarium/);
  const tank = () => page.frames().find(f => f.url().includes('/terrarium/'));
  await tank().waitForFunction(() => window.__terrarium?.loop.stats.fps > 0, null, { timeout: 10000 });
  const food = () => tank().evaluate(() => window.__terrarium.sim.state.food.length);
  const before = await food();
  await appFrame().getByRole('button', { name: 'Scatter food' }).click();
  if (!(await food() > before)) throw new Error('Feed added no food');
  // pretend the tank was left a week ago, and keep its save on the way out
  // from writing over that, then come back
  await tank().evaluate(() => {
    window.__terrarium.store.write({ seed: 1, sim: window.__terrarium.sim.serialize() });
    const save = JSON.parse(localStorage.getItem('tesla.terrarium'));
    save.savedAt -= 7 * 86400e3;
    localStorage.setItem('tesla.terrarium', JSON.stringify(save));
    Storage.prototype.setItem = () => {};
  });
  await openFromHub(/Terrarium/);
  await tank().waitForFunction(() => window.__terrarium?.awaySummary?.days > 1, null, { timeout: 10000 });
  await appFrame().locator('.away.visible').filter({ hasText: 'While you were away' }).waitFor({ timeout: 5000 });
  console.log(`     ${await tank().evaluate(() => `${window.__terrarium.sim.state.creatures.length} alive after ${window.__terrarium.awaySummary.days.toFixed(0)} tank days away`)}`);
});

await check('speed test measures ping and starts the download', async () => {
  await openFromHub(/Speed Test/);
  await appFrame().getByRole('button', { name: 'Start test' }).click();
  await appFrame().locator('#tPing b:not(.na)').waitFor({ timeout: 20000 });
  await appFrame().locator('#phase').filter({ hasText: 'download' }).waitFor({ timeout: 5000 });
  await page.waitForTimeout(3000);
  const live = await appFrame().locator('#big').textContent();
  if (!(parseFloat(live) > 0)) throw new Error(`no live download rate: "${live}"`);
  // Stop early to keep the test's data use small
  await appFrame().getByRole('button', { name: 'Stop' }).click();
  await appFrame().locator('#phase').filter({ hasText: 'Stopped' }).waitFor({ timeout: 5000 });
  console.log(`     ping ${await appFrame().locator('#tPing b').textContent()} ms, ${live} Mbps live, ${await appFrame().locator('#server').textContent()}`);
});

await check('brain test scores, ranks and makes a share card', async () => {
  await openFromHub(/Brain Test/);
  await appFrame().getByRole('button', { name: 'Test my brain' }).click();
  // this browser's software graphics isn't a Tesla, so the score goes in without asking for a car
  await appFrame().locator('#share:not([hidden])').waitFor({ timeout: 60000 });
  const total = await appFrame().locator('#total').textContent();
  if (!(parseInt(total.replace(/,/g, '')) > 0)) throw new Error(`no score: "${total}"`);
  const rank = await appFrame().locator('#rank').textContent();
  if (!/Faster than|First score/.test(rank)) throw new Error(`no rank: "${rank}"`);
  await appFrame().locator('#board .bar.you').waitFor({ timeout: 5000 });
  console.log(`     ${total} points, ${rank}; ${await appFrame().locator('#chip').textContent()}`);
  // the hub opens the card in its place. (A screenshot before this click
  // stops the click reaching the app's frame at this scale factor.)
  await appFrame().getByRole('button', { name: 'Open the card on this screen' }).click();
  await page.waitForURL(/\/brain\/share\.html/, { waitUntil: 'commit' });
  await page.locator('#actions:not([hidden])').waitFor({ timeout: 10000 });
  const post = await page.locator('#post').getAttribute('href');
  if (!post.includes(encodeURIComponent(total))) throw new Error(`post text lacks the score: ${post}`);
  await page.screenshot({ path: shots + 'brain-card.png' });
});

await check('tiny games plays a free game and an added cart', async () => {
  await openFromHub(/Tiny Games/);
  const games = await (await fetch(`${appsBase}/tic80/games.json`)).json();
  await appFrame().locator('#games .game').nth(games.games.length - 1).waitFor({ timeout: 10000 });
  const playing = () => page.frames().find(f => f.url().includes('/tic80/play.html'));
  // a free game starts its player (the one for its language: Dunkman is MoonScript)
  await appFrame().getByRole('button', { name: 'Play Dunkman' }).click();
  await page.waitForFunction(() => document.querySelector('#frame').contentWindow.length === 1);
  await page.waitForTimeout(500);
  await playing().waitForFunction(() => !!window.Module?.ctx, null, { timeout: 30000 });
  if (!playing().url().includes('player=moon')) throw new Error(`wrong player: ${playing().url()}`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: shots + 'tic80.png' });
  await appFrame().getByRole('button', { name: '‹ Games' }).click();
  await appFrame().locator('#library:not([hidden])').waitFor();

  // a cart from a USB drive: one of the free games stands in
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), appFrame().getByRole('button', { name: 'Add files' }).click()]);
  writeFileSync(shots + 'notacart.tic', 'not a cart');
  await chooser.setFiles([new URL('../apps/tic80/games/grow.tic', import.meta.url).pathname, shots + 'notacart.tic']);
  await appFrame().locator('#status').filter({ hasText: 'notacart.tic' }).waitFor({ timeout: 5000 });
  await appFrame().locator('#mine .game').filter({ hasText: 'Grow quickly' }).waitFor({ timeout: 5000 });
  await appFrame().locator('#mine').getByRole('button', { name: 'Play Grow quickly' }).click();
  await page.waitForTimeout(500);
  await playing().waitForFunction(() => !!window.Module?.ctx, null, { timeout: 30000 });
  if (!/cart=mine%2F/.test(playing().url())) throw new Error(`not the added cart: ${playing().url()}`);
  await appFrame().getByRole('button', { name: '‹ Games' }).click();
  await appFrame().getByRole('button', { name: 'Remove Grow quickly' }).click();
  await appFrame().getByRole('button', { name: 'Remove Grow quickly' }).click();
  await appFrame().locator('#mine .game').waitFor({ state: 'detached', timeout: 5000 });

  // the phone page takes .tic carts for Tiny Games and turns away other files
  await appFrame().getByRole('button', { name: 'Get carts from phone' }).click();
  await appFrame().locator('#transferStatus').filter({ hasText: 'Waiting' }).waitFor({ timeout: 10000 });
  const link = await appFrame().locator('#qr a').getAttribute('href');
  if (!link.includes('?app=tic80')) throw new Error(`phone link doesn't ask for carts: ${link}`);
  const phone = await browser.newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  await phone.goto(link);
  const [pick] = await Promise.all([phone.waitForEvent('filechooser'), phone.getByRole('button', { name: 'Choose games' }).click()]);
  await pick.setFiles([new URL('../apps/tic80/games/quest.tic', import.meta.url).pathname, shots + 'notacart.tic']);
  await phone.locator('#files li.ok').waitFor({ timeout: 20000 });
  await phone.locator('#files li.bad').filter({ hasText: 'Not a TIC-80 cart' }).waitFor({ timeout: 5000 });
  await phone.close();
  await appFrame().locator('#received li:not(.bad):not(.busy)').filter({ hasText: 'QUEST FOR GLORY' }).waitFor({ timeout: 20000 });
  await appFrame().getByRole('button', { name: 'Done' }).click();
  await appFrame().getByRole('button', { name: 'Remove QUEST FOR GLORY' }).click();
  await appFrame().getByRole('button', { name: 'Remove QUEST FOR GLORY' }).click();
  await appFrame().locator('#mine .game').waitFor({ state: 'detached', timeout: 5000 });
});

await check('retro console adds a local file and plays a game', async () => {
  await openFromHub(/Retro Console/);
  // A player's own file: use one of the bundled free games as the stand-in
  await appFrame().getByRole('button', { name: 'Add game files' }).click();
  // First time: confirm owning the games; that tap opens the picker
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), appFrame().getByRole('button', { name: 'I own my games' }).click()]);
  await chooser.setFiles(new URL('../apps/retro/games/croom.nes', import.meta.url).pathname);
  await appFrame().locator('#mine .game').filter({ hasText: 'croom' }).waitFor({ timeout: 5000 });
  // Remove asks for a second tap
  await appFrame().getByRole('button', { name: 'Remove croom' }).click();
  await appFrame().getByRole('button', { name: 'Remove croom' }).filter({ hasText: 'Sure?' }).click();
  await appFrame().locator('#mine .game').waitFor({ state: 'detached', timeout: 5000 });

  // Get games from phone: a second page plays the phone, opened from the QR link
  await appFrame().getByRole('button', { name: 'Get games from phone' }).click();
  await appFrame().locator('#transferStatus').filter({ hasText: 'Waiting' }).waitFor({ timeout: 10000 });
  const link = await appFrame().locator('#qr a').getAttribute('href');
  const phone = await browser.newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  await phone.goto(link);
  const [pick] = await Promise.all([phone.waitForEvent('filechooser'), phone.getByRole('button', { name: 'Choose games' }).click()]);
  await pick.setFiles(new URL('../apps/retro/games/thwaite.nes', import.meta.url).pathname);
  await phone.locator('#files li.ok').waitFor({ timeout: 10000 });
  await phone.close();
  await appFrame().locator('#received li').filter({ hasText: 'thwaite' }).waitFor({ timeout: 10000 });
  await appFrame().getByRole('button', { name: 'Done' }).click();
  await appFrame().getByRole('button', { name: 'Remove thwaite' }).click();
  await appFrame().getByRole('button', { name: 'Remove thwaite' }).click();
  await appFrame().locator('#mine .game').waitFor({ state: 'detached', timeout: 5000 });

  await appFrame().locator('#free .game').filter({ hasText: 'Thwaite' }).click();
  await appFrame().locator('#fps').filter({ hasText: /fps/ }).waitFor({ timeout: 10000 });
  // Start skips the notice, then starts a game; the on-screen button is tapped
  for (let i = 0; i < 2; i++) { await appFrame().locator('.pill[data-b=start]').click(); await page.waitForTimeout(1500); }
  const fps = parseInt(await appFrame().locator('#fps').textContent());
  if (!(fps >= 50)) throw new Error(`running at ${fps} fps`);
  // The worker draws the screen, so read it back from a screenshot
  const shot = await appFrame().locator('#screen').screenshot();
  const lit = await page.evaluate(async png => {
    const img = await createImageBitmap(new Blob([new Uint8Array(png)], { type: 'image/png' }));
    const c = new OffscreenCanvas(img.width, img.height).getContext('2d');
    c.drawImage(img, 0, 0);
    const d = c.getImageData(0, 0, img.width, img.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) n++;
    return Math.round(n / (img.width * img.height) * 100);
  }, [...shot]);
  if (lit < 10) throw new Error(`screen mostly black (${lit}% lit)`);
  // Leaving saves a resume snapshot, and Continue brings the game back
  await appFrame().getByRole('button', { name: 'Games' }).click();
  await appFrame().getByRole('button', { name: 'Continue Thwaite' }).click();
  await appFrame().locator('#player').waitFor({ state: 'visible', timeout: 10000 });
  const saved = await page.frames().find(f => f.url().includes('/retro/')).evaluate(() => new Promise(r => {
    const q = indexedDB.open('nes', 1);
    q.onsuccess = () => { const g = q.result.transaction('saves').objectStore('saves').get('free-thwaite.nes'); g.onsuccess = () => r(!!g.result?.state); };
    q.onerror = () => r(false);
  }));
  if (!saved) throw new Error('no resume snapshot saved for Thwaite');
  console.log(`     ${fps} fps, ${lit}% lit`);
  // Last: after a full-page screenshot, Playwright's clicks stop reaching
  // the app frame
  await page.screenshot({ path: shots + 'retro.png' });
});

await check('retro console plays a GBA game with a controller and resumes it', async () => {
  await openFromHub(/Retro Console/);
  const frame = () => page.frames().find(f => f.url().includes('/retro/'));
  // Two pads like the car: the controller's raw device and the car's
  // standard-mapping copy. Only the standard one should press buttons.
  await frame().evaluate(() => {
    const pad = (id, mapping, index) => ({ id, index, mapping, connected: true, timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
    const pads = [pad('raw', '', 0), pad('Tesla Virtual Gamepad', 'standard', 1)];
    navigator.getGamepads = () => pads;
    window.padTap = async (p, b) => {
      Object.assign(pads[p].buttons[b], { pressed: true, value: 1 });
      await new Promise(r => setTimeout(r, 150));
      Object.assign(pads[p].buttons[b], { pressed: false, value: 0 });
      await new Promise(r => setTimeout(r, 600));
    };
  });
  await appFrame().locator('#free .game').filter({ hasText: 'Attack on Voxelburg' }).click();
  await appFrame().locator('#fps').filter({ hasText: /fps/ }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(7000);   // logo, then the title menu
  const screen = appFrame().locator('#gbaScreen');
  const menu = await screen.screenshot();
  const fps = parseInt(await appFrame().locator('#fps').textContent());
  if (!(fps >= 50)) throw new Error(`running at ${fps} fps`);
  if (menu.length < 8000) throw new Error(`screen looks empty (${menu.length} byte PNG)`);
  // Down, then A, opens the Controls page
  const small = await screen.evaluate(c => c.getBoundingClientRect().width);
  await frame().evaluate(async () => { await padTap(1, 13); await padTap(1, 1); });
  const controls = await screen.screenshot();
  if (controls.equals(menu)) throw new Error('controller input did nothing');
  // With a controller in use, the on-screen buttons hide and the game grows
  const big = await screen.evaluate(c => c.getBoundingClientRect().width);
  if (!(big > small) || await appFrame().locator('.side.left').isVisible()) throw new Error(`screen didn't grow for the controller (${small} -> ${big} px)`);
  // Leaving and coming back picks up on the same page
  await appFrame().getByRole('button', { name: 'Games' }).click();
  await appFrame().locator('#free .game').filter({ hasText: 'Attack on Voxelburg' }).click();
  await page.waitForTimeout(1500);
  if (!(await screen.screenshot()).equals(controls)) throw new Error('did not resume where it left off');
  console.log(`     ${fps} fps`);
  await page.screenshot({ path: shots + 'retro-gba.png' });
});

await check('retro console plays a Game Boy Color game', async () => {
  await openFromHub(/Retro Console/);
  await appFrame().locator('#free .game').filter({ hasText: 'Tobu Tobu Girl Deluxe' }).click();
  await appFrame().locator('#fps').filter({ hasText: /fps/ }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(3000);
  const size = await appFrame().locator('#gbaScreen').evaluate(c => `${c.width}x${c.height}`);
  if (size !== '160x144') throw new Error(`screen is ${size}, not the Game Boy's 160x144`);
  const shot = await appFrame().locator('#gbaScreen').screenshot();
  if (shot.length < 3000) throw new Error(`screen looks empty (${shot.length} byte PNG)`);
  const fps = parseInt(await appFrame().locator('#fps').textContent());
  if (!(fps >= 50)) throw new Error(`running at ${fps} fps`);
  console.log(`     ${fps} fps`);
  await page.screenshot({ path: shots + 'retro-gbc.png' });
  await appFrame().getByRole('button', { name: 'Games' }).click();
});

await check('retro console plays Game Gear, Master System and SG-1000 games', async () => {
  await openFromHub(/Retro Console/);
  const frame = () => page.frames().find(f => f.url().includes('/retro/'));
  const screen = appFrame().locator('#smsScreen');
  // Share of the screen that isn't black, from a screenshot (the worker draws it)
  const lit = async () => page.evaluate(async png => {
    const img = await createImageBitmap(new Blob([new Uint8Array(png)], { type: 'image/png' }));
    const c = new OffscreenCanvas(img.width, img.height).getContext('2d');
    c.drawImage(img, 0, 0);
    const d = c.getImageData(0, 0, img.width, img.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) n++;
    return Math.round(n / (img.width * img.height) * 100);
  }, [...await screen.screenshot()]);
  const results = [];
  // Cheril Perils opens with a few dark seconds
  for (const [title, ratio, labels, wait] of [['Waternet', 160 / 144, '1 2 Start', 3000], ['Sub Rescue', 256 / 192, '1 2 Pause', 3000], ['Cheril Perils Classic', 256 / 192, '1 2 Pause', 8000]]) {
    await appFrame().locator('#free .game').filter({ hasText: title }).click();
    await appFrame().locator('#fps').filter({ hasText: /fps/ }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(wait);
    const fps = parseInt(await appFrame().locator('#fps').textContent());
    if (!(fps >= 50)) throw new Error(`${title} running at ${fps} fps`);
    const box = await screen.boundingBox();
    if (Math.abs(box.width / box.height - ratio) > 0.03) throw new Error(`${title} screen is ${box.width}x${box.height}`);
    const shown = (await appFrame().locator('[data-b=b], [data-b=a], .pill[data-b=start]').allTextContents()).join(' ');
    if (shown !== labels) throw new Error(`${title} buttons read "${shown}"`);
    const before = await lit();
    if (before < 5) throw new Error(`${title} screen mostly black (${before}% lit)`);
    results.push(`${title} ${fps} fps, ${before}% lit`);
    await appFrame().getByRole('button', { name: 'Games' }).click();
  }
  // Input reaches the game: Start on Waternet's title opens its menu
  await appFrame().locator('#free .game').filter({ hasText: 'Waternet' }).click();
  await appFrame().locator('#fps').filter({ hasText: /fps/ }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  const title = await screen.screenshot();
  await appFrame().locator('.pill[data-b=start]').click();
  await page.waitForTimeout(1500);
  const menu = await screen.screenshot();
  if (menu.equals(title)) throw new Error('Start did nothing in Waternet');
  // Leaving saves a resume snapshot, and the game picks up there
  await appFrame().getByRole('button', { name: 'Games' }).click();
  const saved = await frame().evaluate(() => new Promise(r => {
    const q = indexedDB.open('sms', 1);
    q.onsuccess = () => { const g = q.result.transaction('saves').objectStore('saves').get('free-waternet.gg'); g.onsuccess = () => r(g.result?.state?.length || 0); };
    q.onerror = () => r(0);
  }));
  if (!saved) throw new Error('no resume snapshot saved for Waternet');
  await appFrame().getByRole('button', { name: 'Continue Waternet' }).click();
  await appFrame().locator('#player').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(1000);
  if ((await screen.screenshot()).equals(title)) throw new Error('Waternet did not resume where it left off');
  // A player's own file is known by its name: the Game Gear game sent as a .sms is still a Game Gear game (its header says so)
  await appFrame().getByRole('button', { name: 'Games' }).click();
  const picker = page.waitForEvent('filechooser');
  await appFrame().getByRole('button', { name: 'Add game files' }).click();
  // asked only the first time on this screen
  const terms = appFrame().getByRole('button', { name: 'I own my games' });
  if (await terms.isVisible()) await terms.click();
  const chooser = await picker;
  await chooser.setFiles([
    { name: 'pipes.sms', mimeType: 'application/octet-stream', buffer: readFileSync(new URL('../apps/retro/games/waternet.gg', import.meta.url)) },
    { name: 'cheril.sg', mimeType: 'application/octet-stream', buffer: readFileSync(new URL('../apps/retro/games/cheril.sg', import.meta.url)) },
  ]);
  await appFrame().locator('#mine .game').filter({ hasText: 'cheril' }).waitFor({ timeout: 5000 });
  const kinds = (await appFrame().locator('#mine .game small').allTextContents()).map(t => t.split(' · ')[0]).sort().join(', ');
  if (kinds !== 'Game Gear, SG-1000') throw new Error(`own games read as ${kinds}`);
  for (const name of ['pipes', 'cheril']) {
    await appFrame().getByRole('button', { name: `Remove ${name}` }).click();
    await appFrame().getByRole('button', { name: `Remove ${name}` }).click();
  }
  console.log(`     ${results.join('; ')}`);
  await page.screenshot({ path: shots + 'retro-sms.png' });
});

await check('retro console plays Atari Lynx games without Atari\'s boot ROM', async () => {
  await openFromHub(/Retro Console/);
  const frame = () => page.frames().find(f => f.url().includes('/retro/'));
  const screen = appFrame().locator('#lynxScreen');
  const lit = async () => page.evaluate(async png => {
    const img = await createImageBitmap(new Blob([new Uint8Array(png)], { type: 'image/png' }));
    const c = new OffscreenCanvas(img.width, img.height).getContext('2d');
    c.drawImage(img, 0, 0);
    const d = c.getImageData(0, 0, img.width, img.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) n++;
    return Math.round(n / (img.width * img.height) * 100);
  }, [...await screen.screenshot()]);
  // TreeJumper's cartridge starts with an encrypted loader, which the stand-in boot ROM decrypts
  await appFrame().locator('#free .game').filter({ hasText: 'TreeJumper' }).click();
  await appFrame().locator('#fps').filter({ hasText: /fps/ }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(2000);
  const fps = parseInt(await appFrame().locator('#fps').textContent());
  if (!(fps >= 50)) throw new Error(`TreeJumper running at ${fps} fps`);
  const box = await screen.boundingBox();
  if (Math.abs(box.width / box.height - 160 / 102) > 0.03) throw new Error(`Lynx screen is ${box.width}x${box.height}`);
  const shown = (await appFrame().locator('.shoulder, [data-b=b], [data-b=a], .pill[data-b=start]').allTextContents()).join(' ');
  if (shown !== 'Option 1 Option 2 B A Pause') throw new Error(`Lynx buttons read "${shown}"`);
  // Input reaches the game: A leaves the title for the forest
  const title = await screen.screenshot();
  await appFrame().locator('[data-b=a]').click();
  await page.waitForTimeout(1500);
  if ((await screen.screenshot()).equals(title)) throw new Error('A did nothing in TreeJumper');
  const playing = await lit();
  if (playing < 5) throw new Error(`TreeJumper screen mostly black (${playing}%)`);
  // Leaving saves a resume snapshot, and the game picks up there, past the title
  await appFrame().getByRole('button', { name: 'Games' }).click();
  const saved = await frame().evaluate(() => new Promise(r => {
    const q = indexedDB.open('lynx', 1);
    q.onsuccess = () => { const g = q.result.transaction('saves').objectStore('saves').get('free-treejumper.lynx'); g.onsuccess = () => r(g.result?.state?.length || 0); };
    q.onerror = () => r(0);
  }));
  if (!saved) throw new Error('no resume snapshot saved for TreeJumper');
  await appFrame().getByRole('button', { name: 'Continue TreeJumper' }).click();
  await appFrame().locator('#player').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(1000);
  if ((await lit()) < 5) throw new Error('TreeJumper did not resume where it left off');
  // A player's own cartridge is known by its header, whatever its name
  await appFrame().getByRole('button', { name: 'Games' }).click();
  const picker = page.waitForEvent('filechooser');
  await appFrame().getByRole('button', { name: 'Add game files' }).click();
  const terms = appFrame().getByRole('button', { name: 'I own my games' });
  if (await terms.isVisible()) await terms.click();
  await (await picker).setFiles([
    { name: 'jumper.lnx', mimeType: 'application/octet-stream', buffer: readFileSync(new URL('../apps/retro/games/treejumper.lnx', import.meta.url)) },
  ]);
  await appFrame().locator('#mine .game').filter({ hasText: 'jumper' }).waitFor({ timeout: 5000 });
  const kind = (await appFrame().locator('#mine .game').filter({ hasText: 'jumper' }).locator('small').textContent()).split(' · ')[0];
  if (kind !== 'Atari Lynx') throw new Error(`own cartridge reads as ${kind}`);
  await appFrame().getByRole('button', { name: 'Remove jumper' }).click();
  await appFrame().getByRole('button', { name: 'Remove jumper' }).click();
  console.log(`     TreeJumper ${fps} fps, ${playing}% lit`);
  await page.screenshot({ path: shots + 'retro-lynx.png' });
});

// Plays a holder's phone without a browser: signs in to the vote with an
// ed25519 key of its own, holding the given made-up balance (dev server only)
async function holderPhone(apps, tokens) {
  const { generateKeyPairSync, sign } = await import('node:crypto');
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let n = BigInt('0x' + raw.toString('hex')), address = '';
  for (; n > 0n; n /= 58n) address = ALPHABET[Number(n % 58n)] + address;
  for (const b of raw) { if (b) break; address = '1' + address; }
  const post = async (op, data) => (await fetch(`${apps}/api/vote?op=${op}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json();
  const setTokens = t => post('dev-balance', { address, tokens: t });
  await setTokens(tokens);
  const { message } = await post('nonce', { address });
  const session = await post('login', { message, signature: sign(null, Buffer.from(message), privateKey).toString('base64') });
  if (!session.token) throw new Error(`phone sign-in: ${session.error}`);
  return {
    link: lid => post('link', { token: session.token, lid }), setTokens, address,
    sign: text => sign(null, Buffer.from(text), privateKey).toString('base64'),
  };
}

// The holder's phone that unlocks the test browsers, made when first needed
let holder = null;
const holderNow = async () => holder || (holder = await holderPhone(appsBase, 150000));
await check('holders unlock with a phone and play Genesis and PC Engine games', async () => {
  // The ordinary Retro Console leaves the PC Engine and Mega Drive out, and the hub's grid the early-access apps
  await openFromHub(/Retro Console/);
  for (const game of ['Blox', 'KłełeAtoms']) {
    if (await appFrame().locator('#free .game').filter({ hasText: game }).count()) throw new Error(`${game} is in the ordinary Retro Console`);
  }
  await page.goto(base + '/');
  await page.waitForSelector('.card');
  for (const name of ['SuperTux', 'Craft 4K', 'fheroes2', 'Freedoom', 'LibreQuake', 'OpenTTD', 'OpenArena', 'Genesis & PC Engine']) {
    if (await page.locator('#grid .card h2').filter({ hasText: new RegExp(`^${name}$`) }).count()) throw new Error(`${name} is on the grid`);
  }

  // Holders is locked until a phone links it; so is an early-access app opened directly
  for (const path of ['/app/doom', '/app/holders']) {
    await page.goto(base + path);
    await appFrame().locator('#holdersLock .code a').waitFor({ timeout: 10000 });
  }
  if (await appFrame().locator('#apps .app').count()) throw new Error('the menu shows while locked');
  const link = new URL(await appFrame().locator('#holdersLock .code a').getAttribute('href'));
  if (link.pathname !== '/vote/' || !link.searchParams.get('link')) throw new Error(`lock code is ${link}`);
  if (!dev) return;

  const linked = await (await holderNow()).link(link.searchParams.get('link'));
  if (!linked.ok) throw new Error(`link: ${linked.error}`);
  await appFrame().locator('#apps .app').first().waitFor({ timeout: 10000 });
  const tiles = (await appFrame().locator('#apps .app b').allTextContents()).join(', ');
  if (tiles !== 'Genesis & PC Engine, SuperTux, fheroes2, Craft 4K, Freedoom, LibreQuake, OpenArena, OpenTTD') throw new Error(`menu lists ${tiles}`);
  await appFrame().locator('#voteQr a[href$="/vote/"]').waitFor();

  await openFromHub(/PC Engine/);
  if (await appFrame().locator('#free .game').filter({ hasText: 'Thwaite' }).count()) throw new Error('NES games show with the PC Engine');
  const frame = () => page.frames().find(f => f.url().includes('/retro/'));
  const screen = appFrame().locator('#pceScreen');
  await appFrame().locator('#free .game').filter({ hasText: 'Blox' }).click();
  await appFrame().locator('#fps').filter({ hasText: /fps/ }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(3000);
  const fps = parseInt(await appFrame().locator('#fps').textContent());
  if (!(fps >= 50)) throw new Error(`Blox running at ${fps} fps`);
  // 256 pixels of 8/7 their height, 224 lines
  const box = await screen.boundingBox();
  if (Math.abs(box.width / box.height - 293 / 224) > 0.03) throw new Error(`screen is ${box.width}x${box.height}`);
  const shown = (await appFrame().locator('[data-b=b], [data-b=a], .pill[data-b=start]').allTextContents()).join(' ');
  if (shown !== 'II I Run') throw new Error(`buttons read "${shown}"`);
  // Run pauses the game
  const running = await screen.screenshot();
  await appFrame().locator('.pill[data-b=start]').click();
  await page.waitForTimeout(1500);
  const paused = await screen.screenshot();
  if (paused.equals(running)) throw new Error('Run did nothing in Blox');
  // Leaving saves a resume snapshot
  await appFrame().getByRole('button', { name: 'Games' }).click();
  const saved = await frame().evaluate(() => new Promise(r => {
    const q = indexedDB.open('pce', 1);
    q.onsuccess = () => { const g = q.result.transaction('saves').objectStore('saves').get('free-blox.pce'); g.onsuccess = () => r(g.result?.state?.length || 0); };
    q.onerror = () => r(0);
  }));
  if (!saved) throw new Error('no resume snapshot saved for Blox');

  // KłełeAtoms MD on the Mega Drive core
  const mdScreen = appFrame().locator('#mdScreen');
  await appFrame().locator('#free .game').filter({ hasText: 'KłełeAtoms' }).click();
  await appFrame().locator('#fps').filter({ hasText: /fps/ }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(3000);
  const mdFps = parseInt(await appFrame().locator('#fps').textContent());
  if (!(mdFps >= 50)) throw new Error(`KłełeAtoms running at ${mdFps} fps`);
  const mdBox = await mdScreen.boundingBox();
  if (Math.abs(mdBox.width / mdBox.height - 320 / 224) > 0.03) throw new Error(`Mega Drive screen is ${mdBox.width}x${mdBox.height}`);
  const mdButtons = (await appFrame().locator('.ab [data-b], .pill[data-b=start]').allTextContents()).join(' ');
  if (mdButtons !== 'A B C Start') throw new Error(`Mega Drive buttons read "${mdButtons}"`);
  // Start leaves the title screen
  const title = await mdScreen.screenshot();
  await appFrame().locator('.pill[data-b=start]').click();
  await page.waitForTimeout(1500);
  if ((await mdScreen.screenshot()).equals(title)) throw new Error('Start did nothing in KłełeAtoms');
  await appFrame().locator('#player').screenshot({ path: shots + 'genesis.png' });
  await appFrame().getByRole('button', { name: 'Games' }).click();
  // the worker writes its snapshot (about 1 MB) after Games is tapped
  let mdSaved = 0;
  for (let tries = 0; tries < 20 && !mdSaved; tries++) {
    if (tries) await page.waitForTimeout(250);
    mdSaved = await frame().evaluate(() => new Promise(r => {
      const q = indexedDB.open('md', 1);
      q.onsuccess = () => { const g = q.result.transaction('saves').objectStore('saves').get('free-kleleatoms.md'); g.onsuccess = () => r(g.result?.state?.length || 0); };
      q.onerror = () => r(0);
    }));
  }
  if (!mdSaved) throw new Error('no resume snapshot saved for KłełeAtoms');
  // A player's own HuCard is known by its name
  const picker = page.waitForEvent('filechooser');
  await appFrame().getByRole('button', { name: 'Add game files' }).click();
  const terms = appFrame().getByRole('button', { name: 'I own my games' });
  if (await terms.isVisible()) await terms.click();
  // and a Mega Drive game by its header, also as a Super Magic Drive dump
  // (a 512-byte header, then 16 KB blocks of odd bytes before even ones)
  const atoms = readFileSync(new URL('../apps/retro/games/kleleatoms.gen', import.meta.url));
  const smd = Buffer.alloc(512 + atoms.length);
  smd[8] = 0xaa; smd[9] = 0xbb;
  for (let block = 0; block < atoms.length; block += 16384) {
    for (let i = 0; i < 8192; i++) {
      smd[512 + block + i] = atoms[block + i * 2 + 1];
      smd[512 + block + 8192 + i] = atoms[block + i * 2];
    }
  }
  // but not an N64 cartridge: the N64 is switched off (too slow in the car)
  const n64 = n64TestRom();
  n64.swap16();
  await (await picker).setFiles([
    { name: 'falling.pce', mimeType: 'application/octet-stream', buffer: readFileSync(new URL('../apps/retro/games/blox.pce', import.meta.url)) },
    { name: 'atoms.bin', mimeType: 'application/octet-stream', buffer: atoms },
    { name: 'copier.smd', mimeType: 'application/octet-stream', buffer: smd },
    { name: 'n64 test.v64', mimeType: 'application/octet-stream', buffer: n64 },
  ]);
  for (const name of ['falling', 'atoms', 'copier']) await appFrame().locator('#mine .game').filter({ hasText: name }).waitFor({ timeout: 5000 });
  const addMsg = await appFrame().locator('#addMsg').textContent();
  if (await appFrame().locator('#mine .game').filter({ hasText: 'n64 test' }).count() || !addMsg.includes('Skipped 1 file')) throw new Error(`the N64 cartridge was taken: ${addMsg}`);
  const kinds = {};
  for (const card of await appFrame().locator('#mine .game').all()) {
    kinds[await card.locator('b').textContent()] = (await card.locator('small').textContent()).split(' · ')[0];
  }
  if (kinds.falling !== 'PC Engine' || kinds.atoms !== 'Mega Drive / Genesis' || kinds.copier !== 'Mega Drive / Genesis') {
    throw new Error(`own games read as ${JSON.stringify(kinds)}`);
  }
  // The copier dump plays once unscrambled
  await appFrame().locator('#mine .game').filter({ hasText: 'copier' }).click();
  await appFrame().locator('#fps').filter({ hasText: /fps/ }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  if (!(parseInt(await appFrame().locator('#fps').textContent()) >= 50)) throw new Error('the .smd game isn\'t running');
  await appFrame().getByRole('button', { name: 'Games' }).click();
  await page.screenshot({ path: shots + 'holders.png' });
  // The ordinary Retro Console doesn't list the HuCard
  await openFromHub(/Retro Console/);
  await appFrame().locator('#free .game').first().waitFor();
  for (const name of ['falling', 'atoms', 'n64 test']) {
    if (await appFrame().locator('#mine .game').filter({ hasText: name }).count()) throw new Error(`${name} shows in the ordinary Retro Console`);
  }
  console.log(`     Blox ${fps} fps, snapshot ${saved} bytes; KłełeAtoms ${mdFps} fps, snapshot ${mdSaved} bytes`);
});

await check('freedoom takes WADs from a phone', async () => {
  await openFromHub(/Freedoom/);
  // Tiny stand-ins for a player's files: a whole game (IWAD) and an add-on (PWAD)
  const wad = kind => {
    const b = Buffer.alloc(32);
    b.write(kind, 0, 'ascii');
    b.writeInt32LE(1, 4);       // one lump
    b.writeInt32LE(16, 8);      // directory after its 4 bytes
    b.writeInt32LE(12, 16);
    b.writeInt32LE(4, 20);
    b.write('E1M1', 24, 'ascii');
    return b;
  };
  writeFileSync(shots + 'mini.wad', wad('IWAD'));
  writeFileSync(shots + 'addon.wad', wad('PWAD'));
  await appFrame().getByRole('button', { name: 'Get games from phone' }).click();
  await appFrame().getByRole('button', { name: 'I own my games' }).click();
  await appFrame().locator('#transferStatus').filter({ hasText: 'Waiting' }).waitFor({ timeout: 10000 });
  const link = await appFrame().locator('#qr a').getAttribute('href');
  if (!link.includes('?app=doom')) throw new Error(`phone link doesn't ask for Doom games: ${link}`);
  const phone = await browser.newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  // A weak signal on the phone: the first upload is lost on the way, and the
  // second reaches the server but its answer is lost. The phone tries again,
  // and the car uses the piece it gets twice only once.
  let puts = 0;
  await phone.route(/\/api\/transfer\?op=put/, async route => {
    if (++puts === 1) return route.abort();
    if (puts === 2) { await route.fetch(); return route.abort(); }
    return route.continue();
  });
  await phone.goto(link);
  const [pick] = await Promise.all([phone.waitForEvent('filechooser'), phone.getByRole('button', { name: 'Choose games' }).click()]);
  // A console game is turned away on the phone; both WADs are sent
  await pick.setFiles([shots + 'mini.wad', shots + 'addon.wad', new URL('../apps/retro/games/croom.nes', import.meta.url).pathname]);
  await phone.locator('#files li.bad').filter({ hasText: 'croom' }).waitFor({ timeout: 10000 });
  await phone.locator('#files li.ok').nth(1).waitFor({ timeout: 20000 });
  await phone.close();
  // The car keeps the whole game and explains why it can't play the add-on
  await appFrame().locator('#received li.bad').filter({ hasText: 'PWAD' }).waitFor({ timeout: 10000 });
  await appFrame().locator('#received li:not(.bad)').filter({ hasText: 'mini' }).waitFor({ timeout: 10000 });
  const copies = await appFrame().locator('#received li').filter({ hasText: 'mini' }).count();
  if (copies !== 1) throw new Error(`the retried piece was used ${copies} times`);
  await appFrame().getByRole('button', { name: 'Done' }).click();
  await appFrame().locator('#mine .game').filter({ hasText: 'mini.wad' }).waitFor({ timeout: 5000 });
  await appFrame().getByRole('button', { name: 'Remove mini' }).click();
  await appFrame().getByRole('button', { name: 'Remove mini' }).click();
  await appFrame().locator('#mine .game').waitFor({ state: 'detached', timeout: 5000 });
});

await check('freedoom plays with a controller and resumes from its autosave', async () => {
  await openFromHub(/Freedoom/);
  const frame = () => page.frames().find(f => f.url().includes('/doom/'));
  await appFrame().locator('#free .game').filter({ hasText: 'Phase 1' }).click();
  // First time: downloads 10 MB, then starts
  await appFrame().locator('#fps').filter({ hasText: /fps/ }).waitFor({ timeout: 60000 });
  // Two pads like the car: the controller's raw device and the car's
  // standard-mapping copy (A is raw 0, standard 1). Fire (A) opens the menu
  // and picks New Game, the episode and the skill.
  await frame().evaluate(() => {
    const pad = (id, mapping, index) => ({ id, index, mapping, connected: true, timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
    const pads = [pad('raw', '', 0), pad('Tesla Virtual Gamepad', 'standard', 1)];
    navigator.getGamepads = () => pads;
    window.padHold = async (b, ms = 150) => {
      for (const [p, i] of [[0, b === 1 ? 0 : -1], [1, b]]) if (i >= 0) Object.assign(pads[p].buttons[i], { pressed: true, value: 1 });
      await new Promise(r => setTimeout(r, ms));
      for (const p of pads) for (const x of p.buttons) Object.assign(x, { pressed: false, value: 0 });
      await new Promise(r => setTimeout(r, 500));
    };
  });
  const canvas = appFrame().locator('#canvas');
  const small = await canvas.evaluate(c => c.getBoundingClientRect().width);
  const title = await canvas.screenshot();
  for (let i = 0; i < 4; i++) await frame().evaluate(() => padHold(1));
  await page.waitForTimeout(1500);   // the screen melts into the level
  const level = await canvas.screenshot();
  if (level.equals(title)) throw new Error('controller input did nothing');
  if (await appFrame().locator('.side.left').isVisible()) throw new Error('on-screen controls still showing with a controller');
  // D-pad up walks forward
  await frame().evaluate(() => padHold(12, 1200));
  if ((await canvas.screenshot()).equals(level)) throw new Error('walking forward changed nothing');
  const fps = parseInt(await appFrame().locator('#fps').textContent());
  if (!(fps >= 30)) throw new Error(`running at ${fps} fps`);
  console.log(`     ${fps} fps, ${small} px wide`);
  await page.screenshot({ path: shots + 'doom.png' });
  // Closing the app from the hub saves the game to the autosave slot, and
  // Continue loads it straight into the level (data-state 1: playing)
  await page.click('#home');
  await page.waitForSelector('#runner', { state: 'hidden' });
  await openFromHub(/Freedoom/);
  const saves = await frame().evaluate(() => new Promise(r => {
    const q = indexedDB.open('/doom');
    q.onsuccess = () => { const g = q.result.transaction('FILE_DATA').objectStore('FILE_DATA').getAllKeys(); g.onsuccess = () => r(g.result); };
    q.onerror = () => r([]);
  }));
  if (!saves.some(k => String(k).endsWith('/free-freedoom1/doomsav77.dsg'))) throw new Error(`no autosave: ${saves.join(', ')}`);
  await appFrame().getByRole('button', { name: 'Continue Freedoom: Phase 1' }).click();
  await appFrame().locator('#player[data-state="1"]').waitFor({ timeout: 20000 });
  await appFrame().getByRole('button', { name: 'Games' }).click();
  await appFrame().locator('#library').waitFor({ state: 'visible', timeout: 10000 });
});

await check('blasphemer takes Heretic WADs from a phone and turns Doom ones away', async () => {
  await openFromHub(/Blasphemer/);
  // Tiny stand-ins: a Heretic IWAD (episode maps and Heretic's status bar)
  // and a Doom one (episode maps only)
  const wad = names => {
    const b = Buffer.alloc(12 + 4 + 16 * names.length);
    b.write('IWAD', 0, 'ascii');
    b.writeInt32LE(names.length, 4);
    b.writeInt32LE(16, 8);
    names.forEach((n, i) => { b.writeInt32LE(12, 16 + 16 * i); b.writeInt32LE(4, 20 + 16 * i); b.write(n, 24 + 16 * i, 'ascii'); });
    return b;
  };
  writeFileSync(shots + 'mini-heretic.wad', wad(['E1M1', 'BARBACK']));
  writeFileSync(shots + 'mini-doom.wad', wad(['E1M1', 'STBAR']));
  await appFrame().getByRole('button', { name: 'Get games from phone' }).click();
  await appFrame().getByRole('button', { name: 'I own my games' }).click();
  await appFrame().locator('#transferStatus').filter({ hasText: 'Waiting' }).waitFor({ timeout: 10000 });
  const link = await appFrame().locator('#qr a').getAttribute('href');
  if (!link.includes('?app=heretic')) throw new Error(`phone link doesn't ask for Heretic games: ${link}`);
  const phone = await browser.newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  await phone.goto(link);
  if (!/Heretic/.test(await phone.locator('#lede').textContent())) throw new Error('phone page not set up for Heretic');
  const [pick] = await Promise.all([phone.waitForEvent('filechooser'), phone.getByRole('button', { name: 'Choose games' }).click()]);
  await pick.setFiles([shots + 'mini-heretic.wad', shots + 'mini-doom.wad']);
  await phone.locator('#files li.ok').nth(1).waitFor({ timeout: 20000 });
  await phone.close();
  await appFrame().locator('#received li.bad').filter({ hasText: 'Freedoom' }).waitFor({ timeout: 10000 });
  await appFrame().locator('#received li:not(.bad)').filter({ hasText: 'mini' }).waitFor({ timeout: 10000 });
  await appFrame().getByRole('button', { name: 'Done' }).click();
  await appFrame().locator('#mine .game').filter({ hasText: 'mini-heretic.wad' }).waitFor({ timeout: 5000 });
  await appFrame().getByRole('button', { name: 'Remove mini' }).click();
  await appFrame().getByRole('button', { name: 'Remove mini' }).click();
  await appFrame().locator('#mine .game').waitFor({ state: 'detached', timeout: 5000 });
});

await check('blasphemer plays with a controller and resumes from its autosave', async () => {
  await openFromHub(/Blasphemer/);
  const frame = () => page.frames().find(f => f.url().includes('/heretic/'));
  await appFrame().locator('#free .game').filter({ hasText: 'Blasphemer' }).click();
  // First time: downloads 8 MB, then starts
  await appFrame().locator('#fps').filter({ hasText: /fps/ }).waitFor({ timeout: 60000 });
  // The car's two pads, as in the Freedoom check. Fire opens the menu and
  // picks New Game, the episode and the skill.
  await frame().evaluate(() => {
    const pad = (id, mapping, index) => ({ id, index, mapping, connected: true, timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
    const pads = [pad('raw', '', 0), pad('Tesla Virtual Gamepad', 'standard', 1)];
    navigator.getGamepads = () => pads;
    window.padHold = async (bs, ms = 150) => {
      for (const b of [].concat(bs)) for (const [p, i] of [[0, b === 1 ? 0 : -1], [1, b]]) if (i >= 0) Object.assign(pads[p].buttons[i], { pressed: true, value: 1 });
      await new Promise(r => setTimeout(r, ms));
      for (const p of pads) for (const x of p.buttons) Object.assign(x, { pressed: false, value: 0 });
      await new Promise(r => setTimeout(r, 500));
    };
  });
  const canvas = appFrame().locator('#canvas');
  const title = await canvas.screenshot();
  for (let i = 0; i < 4; i++) await frame().evaluate(() => padHold(1));
  await appFrame().locator('#player[data-state="1"]').waitFor({ timeout: 10000 });
  await page.waitForTimeout(1000);
  const level = await canvas.screenshot();
  if (level.equals(title)) throw new Error('controller input did nothing');
  if (await appFrame().locator('.side.left').isVisible()) throw new Error('on-screen controls still showing with a controller');
  // D-pad up walks forward
  await frame().evaluate(() => padHold(12, 1200));
  const walked = await canvas.screenshot();
  if (walked.equals(level)) throw new Error('walking forward changed nothing');
  // Select alone shows the map, once it's let go; Select with L picks an item
  // instead, without the map
  await frame().evaluate(() => padHold([8, 4]));
  await page.waitForTimeout(300);
  const combo = await canvas.screenshot();
  await frame().evaluate(() => padHold(8));
  await page.waitForTimeout(300);
  const map = await canvas.screenshot();
  if (map.equals(combo)) throw new Error('Select did not show the map');
  await frame().evaluate(() => padHold(8));
  const fps = parseInt(await appFrame().locator('#fps').textContent());
  if (!(fps >= 30)) throw new Error(`running at ${fps} fps`);
  console.log(`     ${fps} fps`);
  await page.screenshot({ path: shots + 'heretic.png' });
  await page.click('#home');
  await page.waitForSelector('#runner', { state: 'hidden' });
  await openFromHub(/Blasphemer/);
  const saves = await frame().evaluate(() => new Promise(r => {
    const q = indexedDB.open('/heretic');
    q.onsuccess = () => { const g = q.result.transaction('FILE_DATA').objectStore('FILE_DATA').getAllKeys(); g.onsuccess = () => r(g.result); };
    q.onerror = () => r([]);
  }));
  if (!saves.some(k => String(k).endsWith('/free-blasphemer/hticsav47.hsg'))) throw new Error(`no autosave: ${saves.join(', ')}`);
  await appFrame().getByRole('button', { name: 'Continue Blasphemer' }).click();
  await appFrame().locator('#player[data-state="1"]').waitFor({ timeout: 20000 });
  await appFrame().getByRole('button', { name: 'Games' }).click();
  await appFrame().locator('#library').waitFor({ state: 'visible', timeout: 10000 });
});

await check('adventure games takes game folders from a phone', async () => {
  await openFromHub(/Adventure Games/);
  const frame = () => page.frames().find(f => f.url().includes('/adventure/'));
  // A zipped game folder (Nippon Safes, freeware) and two loose files that
  // aren't a game: the zip is one game, the loose files another when Done
  writeFileSync(shots + 'notes.txt', 'not a game, but the bigger of the two loose files');
  writeFileSync(shots + 'n.txt', 'nope');
  await appFrame().getByRole('button', { name: 'Get games from phone' }).click();
  await appFrame().getByRole('button', { name: 'I own my games' }).click();
  await appFrame().locator('#transferStatus').filter({ hasText: 'Waiting' }).waitFor({ timeout: 10000 });
  const link = await appFrame().locator('#qr a').getAttribute('href');
  if (!link.includes('?app=adventure')) throw new Error(`phone link doesn't ask for adventure games: ${link}`);
  const phone = await browser.newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  await phone.goto(link);
  const [pick] = await Promise.all([phone.waitForEvent('filechooser'), phone.getByRole('button', { name: 'Choose games' }).click()]);
  await pick.setFiles([new URL('../apps/adventure/games/nippon-1.0.zip', import.meta.url).pathname, shots + 'notes.txt', shots + 'n.txt']);
  await phone.locator('#files li.ok').nth(2).waitFor({ timeout: 20000 });
  await phone.close();
  await appFrame().locator('#received li:not(.bad):not(.busy)').nth(2).waitFor({ timeout: 20000 });
  await appFrame().getByRole('button', { name: 'Done' }).click();
  await appFrame().locator('#mine .game').filter({ hasText: 'notes' }).waitFor({ timeout: 5000 });
  // ScummVM finds no game in the loose files and the page says so
  await appFrame().locator('#mine .game').filter({ hasText: 'notes' }).click();
  await appFrame().locator('#status').filter({ hasText: 'didn\'t recognise' }).waitFor({ timeout: 60000 });
  await appFrame().getByRole('button', { name: 'Remove notes' }).click();
  await appFrame().getByRole('button', { name: 'Remove notes' }).click();
  // The zip plays, and takes the name ScummVM gives it
  await appFrame().locator('#mine .game').filter({ hasText: 'nippon' }).click();
  await appFrame().locator('#title').filter({ hasText: 'Nippon Safes, Inc.' }).waitFor({ timeout: 60000 });
  await frame().waitForFunction(() => document.title.startsWith('Nippon'));
  await appFrame().getByRole('button', { name: 'Games' }).click();
  await appFrame().locator('#mine .game').filter({ hasText: 'Nippon Safes, Inc.' }).waitFor({ timeout: 20000 });
  await appFrame().getByRole('button', { name: 'Remove Nippon Safes, Inc.' }).click();
  await appFrame().getByRole('button', { name: 'Remove Nippon Safes, Inc.' }).click();
  await appFrame().locator('#mine .game').waitFor({ state: 'detached', timeout: 5000 });
});

await check('arcade takes a game from mamedev.org by phone, plays it with Coin and Start and keeps its NVRAM', async () => {
  // Robby Roto's free ROM, as a player would download it (frunk.store never
  // holds one); a phone names a second download "robby (1).zip"
  const rom = shots + 'robby (1).zip';
  if (!existsSync(rom)) {
    const res = await fetch('https://www.mamedev.org/roms/robby/robby.zip').catch(() => null);
    if (!res?.ok) throw new Error('SKIP: mamedev.org is out of reach');
    writeFileSync(rom, Buffer.from(await res.arrayBuffer()));
  }
  await openFromHub(/Arcade/);
  const frame = () => page.frames().find(f => f.url().includes('/arcade/'));
  await appFrame().getByRole('button', { name: 'Get games from phone' }).click();
  await appFrame().locator('#transferStatus').filter({ hasText: 'Waiting' }).waitFor({ timeout: 10000 });
  const link = await appFrame().locator('#qr a').getAttribute('href');
  if (!link.includes('?app=arcade')) throw new Error(`phone link doesn't ask for arcade games: ${link}`);
  const phone = await browser.newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  await phone.goto(link);
  // the phone page links each game's page on mamedev.org
  const links = await phone.locator('#links a').evaluateAll(as => as.map(a => a.href));
  if (links.length !== 20 || !links.every(h => h.startsWith('https://www.mamedev.org/roms/'))) throw new Error(`phone links: ${links.length}`);
  const [pick] = await Promise.all([phone.waitForEvent('filechooser'), phone.getByRole('button', { name: 'Choose games' }).click()]);
  await pick.setFiles([rom]);
  await phone.locator('#files li.ok').waitFor({ timeout: 20000 });
  await phone.close();
  await appFrame().locator('#received li:not(.bad):not(.busy)').filter({ hasText: 'Robby Roto' }).waitFor({ timeout: 20000 });
  await appFrame().getByRole('button', { name: 'Done' }).click();
  // the game is ready under MAME's name for it, and starts; the 39 MB
  // engine shows how much of it has arrived while it loads
  await frame().evaluate(() => {
    const text = document.getElementById('loadText');
    window.loadTexts = [];
    new MutationObserver(() => window.loadTexts.push(text.textContent)).observe(text, { childList: true, characterData: true, subtree: true });
  });
  await appFrame().locator('.game.ready').filter({ hasText: 'Robby Roto' }).click();
  await frame().waitForFunction(() => window.JSMESS?.running, null, { timeout: 60000 });
  const texts = await frame().evaluate(() => window.loadTexts);
  if (!texts.some(t => /^Loading the arcade… \d+ of \d+ MB$/.test(t))) throw new Error(`no engine progress: ${texts.slice(0, 4).join(' | ')}`);
  const tap = async sel => {
    const b = await appFrame().locator(sel).boundingBox();
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  };
  await page.waitForTimeout(2000);
  await tap('[data-b=coin]');
  await page.waitForTimeout(1500);
  await tap('[data-b=start]');
  await page.waitForTimeout(3000);
  // Games: MAME writes the game's NVRAM, and it's kept in IndexedDB
  await tap('#quitBtn');
  await appFrame().locator('#library').waitFor({ state: 'visible', timeout: 15000 });
  const kept = await frame().evaluate(() => new Promise(r => {
    const q = indexedDB.open('/mame');
    q.onsuccess = () => { const g = q.result.transaction('FILE_DATA').objectStore('FILE_DATA').getAllKeys(); g.onsuccess = () => r(g.result); };
    q.onerror = () => r([]);
  }));
  if (!kept.includes('/mame/nvram/robby/nvram')) throw new Error(`no NVRAM kept: ${kept.join(', ')}`);
  await appFrame().getByRole('button', { name: 'Play Robby Roto' }).waitFor({ timeout: 5000 });
  await page.screenshot({ path: shots + 'arcade.png' });
});

await check('adventure games plays with touch and a controller and resumes from its autosave', async () => {
  await openFromHub(/Adventure Games/);
  const frame = () => page.frames().find(f => f.url().includes('/adventure/'));
  await appFrame().locator('#free .game').filter({ hasText: 'Lure of the Temptress' }).click();
  // First time: downloads 5.4 MB, then ScummVM recognises it and starts
  await appFrame().locator('#title').filter({ hasText: /^Lure of the Temptress$/ }).waitFor({ timeout: 60000 });
  await page.waitForTimeout(4000);
  // Skip (Esc) skips the intro; if a press reaches the game instead, Lure
  // asks whether to quit, and N says no
  for (let i = 0; i < 2; i++) { await appFrame().getByRole('button', { name: 'Skip' }).click(); await page.waitForTimeout(3000); }
  await page.keyboard.press('n');
  await page.waitForTimeout(1500);
  const canvas = appFrame().locator('#canvas');
  const box = await canvas.boundingBox();
  // Two pads like the car: the stick moves ScummVM's pointer
  await frame().evaluate(() => {
    const pad = (id, mapping, index) => ({ id, index, mapping, connected: true, timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
    const pads = [pad('raw', '', 0), pad('Tesla Virtual Gamepad', 'standard', 1)];
    navigator.getGamepads = () => pads;
    dispatchEvent(new Event('gamepadconnected'));
    window.padStick = async (x, y, ms) => {
      for (const p of pads) p.axes = [x, y, 0, 0];
      await new Promise(r => setTimeout(r, ms));
      for (const p of pads) p.axes = [0, 0, 0, 0];
      await new Promise(r => setTimeout(r, 300));
    };
  });
  const before = await canvas.screenshot();
  await frame().evaluate(() => padStick(1, -1, 700));
  if ((await canvas.screenshot()).equals(before)) throw new Error('the controller didn\'t move the pointer');
  // Right-click holds the right button while the finger is down: Lure shows
  // its menu of actions
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: box.x + x, y: box.y + y }] });
  await appFrame().getByRole('button', { name: 'Right-click' }).click();
  const cell = await canvas.screenshot();
  await touch('touchStart', box.width / 2, box.height * 0.45);
  await page.waitForTimeout(600);
  const menu = await canvas.screenshot({ path: shots + 'adventure-menu.png' });
  await touch('touchEnd');
  if (menu.equals(cell)) throw new Error('right-click did nothing');
  // Close the menu (the game can't save while it's open) with a tap away from it
  await touch('touchStart', box.width * 0.75, box.height * 0.85);
  await touch('touchEnd');
  await page.waitForTimeout(5000);   // and the walk there that it starts
  await page.screenshot({ path: shots + 'adventure.png' });
  // Leaving with Games autosaves (the hub's Apps button can't be relied on
  // for that: going back in its history stops the frame's timers, which
  // ScummVM's loop needs), and Continue loads the save
  await appFrame().getByRole('button', { name: 'Games' }).click();
  await appFrame().locator('#library').waitFor({ state: 'visible', timeout: 10000 });
  const saves = await frame().evaluate(() => new Promise(r => {
    const q = indexedDB.open('/home/web_user');
    q.onsuccess = () => { const g = q.result.transaction('FILE_DATA').objectStore('FILE_DATA').getAllKeys(); g.onsuccess = () => r(g.result); };
    q.onerror = () => r([]);
  }));
  if (!saves.includes('/home/web_user/saves/lure.000')) throw new Error(`no autosave: ${saves.join(', ')}`);
  await appFrame().getByRole('button', { name: 'Continue Lure of the Temptress' }).click();
  await appFrame().locator('#title').filter({ hasText: /^Lure of the Temptress$/ }).waitFor({ timeout: 60000 });
  await appFrame().getByRole('button', { name: 'Games' }).click();
  await appFrame().locator('#library').waitFor({ state: 'visible', timeout: 10000 });
});

await check('adventure games starts the SLUDGE games and Mystery House', async () => {
  await openFromHub(/Adventure Games/);
  const frame = () => page.frames().find(f => f.url().includes('/adventure/'));
  for (const name of ['Out Of Order', 'The Secret of Tremendous Corporation', 'Frasse and the Peas of Kejick', 'Nathan\'s Second Chance', 'Mystery House']) {
    await appFrame().locator('#free .game').filter({ hasText: name }).first().click();
    // ScummVM names the game it recognised in the window title
    const t0 = Date.now();
    let title = '';
    while (Date.now() - t0 < 90000) {
      title = await frame().evaluate(() => document.title).catch(() => '');
      if (title && title !== 'Adventure Games' && !/^ScummVM\b/.test(title)) break;
      if (await appFrame().locator('#failed').isVisible().catch(() => false)) throw new Error(`${name}: ${await appFrame().locator('#failed').innerText()}`);
      await page.waitForTimeout(500);
    }
    if (!title || title === 'Adventure Games' || /^ScummVM\b/.test(title)) throw new Error(`${name} wasn't recognised`);
    // and it keeps running and drawing
    await page.waitForTimeout(6000);
    if (await appFrame().locator('#failed').isVisible()) throw new Error(`${name}: ${await appFrame().locator('#failed').innerText()}`);
    await appFrame().locator('#canvas').screenshot({ path: `${shots}adventure-${name.split(' ')[0].toLowerCase()}.png` });
    // (after a screenshot, Playwright's clicks may stop reaching the app's
    // frame in headless Chrome, so Games is pressed from inside it)
    await frame().evaluate(() => document.getElementById('quitBtn').click());
    await appFrame().locator('#library').waitFor({ state: 'visible', timeout: 15000 });
  }
});

await check('text adventures plays zork by tapping words, undoes and picks up where it was left', async () => {
  await openFromHub(/Text Adventures/);
  const frame = () => page.frames().find(f => f.url().includes('/text/'));
  const app = appFrame();
  const where = place => app.locator('#where').filter({ hasText: place }).waitFor({ timeout: 10000 });
  await app.locator('#free .game').filter({ hasText: 'Zork I:' }).click();
  await where('West of House');
  // Taps the newest place the story says a word, like a finger would
  const tap = async word => {
    const at = await frame().evaluate(w => {
      const walk = document.createTreeWalker(document.getElementById('story'), NodeFilter.SHOW_TEXT);
      let found = null;
      for (let n; (n = walk.nextNode());) { const i = n.data.lastIndexOf(w); if (i >= 0) found = [n, i]; }
      const r = document.createRange();
      r.setStart(found[0], found[1] + 1);
      r.setEnd(found[0], found[1] + 2);
      const b = r.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    }, word);
    const f = await page.locator('#frame').boundingBox();
    await page.touchscreen.tap(f.x + at.x, f.y + at.y);
  };
  // A verb, then words from the story; ones the game doesn't know are left out
  await app.getByRole('button', { name: 'Open', exact: true }).click();
  await tap('standing');
  await tap('mailbox');
  const made = await app.locator('#cmd').inputValue();
  if (made !== 'open mailbox') throw new Error(`tapping made "${made}"`);
  await app.getByRole('button', { name: 'Go' }).click();
  await app.locator('#story').filter({ hasText: 'reveals a leaflet' }).waitFor({ timeout: 5000 });
  // The compass walks, and Undo takes a move back, text and all
  await app.locator('#pad').getByRole('button', { name: 'N', exact: true }).click();
  await where('North of House');
  await app.locator('#pad').getByRole('button', { name: 'E', exact: true }).click();
  await where('Behind House');
  await app.getByRole('button', { name: 'Undo' }).click();
  await where('North of House');
  if ((await app.locator('#story').textContent()).includes('Behind House')) throw new Error('the undone move is still on screen');
  // A keyboard types commands; the game's own SAVE and RESTORE work
  const type = async text => {
    await app.locator('#cmd').click();
    await page.keyboard.type(text);
    await page.keyboard.press('Enter');
  };
  await type('east');
  await where('Behind House');
  await type('save');
  await app.locator('#story').filter({ hasText: /save\s*Ok\./ }).waitFor({ timeout: 5000 });
  await type('north');
  await where('North of House');
  await type('restore');
  await where('Behind House');
  // Leaving with the hub's Apps button keeps the game; Continue picks it up
  await page.click('#home');
  await page.waitForSelector('#runner', { state: 'hidden' });
  await openFromHub(/Text Adventures/);
  await app.getByRole('button', { name: 'Continue Zork I' }).click();
  await where('Behind House');
  if (!(await app.locator('#story').textContent()).includes('reveals a leaflet')) throw new Error('the story so far wasn\'t kept');
  await type('inventory');
  await app.locator('#story').filter({ hasText: 'You are empty-handed' }).waitFor({ timeout: 5000 });
  await page.screenshot({ path: shots + 'text.png' });
});

await check('text adventures takes story files from a phone', async () => {
  await openFromHub(/Text Adventures/);
  writeFileSync(shots + 'not-a-story.z5', 'not a story file');
  await appFrame().getByRole('button', { name: 'Get games from phone' }).click();
  await appFrame().getByRole('button', { name: 'OK' }).click();
  await appFrame().locator('#transferStatus').filter({ hasText: 'Waiting' }).waitFor({ timeout: 10000 });
  const link = await appFrame().locator('#qr a').getAttribute('href');
  if (!link.includes('?app=text')) throw new Error(`phone link doesn't ask for story files: ${link}`);
  const phone = await browser.newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  await phone.goto(link);
  const [pick] = await Promise.all([phone.waitForEvent('filechooser'), phone.getByRole('button', { name: 'Choose games' }).click()]);
  await pick.setFiles([new URL('../apps/text/games/zork2.z3', import.meta.url).pathname, shots + 'not-a-story.z5']);
  await phone.locator('#files li.ok').waitFor({ timeout: 20000 });
  await phone.locator('#files li.bad').filter({ hasText: 'Not a story file' }).waitFor({ timeout: 5000 });
  await phone.close();
  await appFrame().locator('#received li:not(.bad):not(.busy)').filter({ hasText: 'zork2' }).waitFor({ timeout: 20000 });
  await appFrame().getByRole('button', { name: 'Done' }).click();
  await appFrame().locator('#mine .game').filter({ hasText: 'zork2' }).click();
  await appFrame().locator('#story').filter({ hasText: 'ZORK II' }).waitFor({ timeout: 10000 });
  await appFrame().getByRole('button', { name: 'Games' }).click();
  await appFrame().getByRole('button', { name: 'Remove zork2' }).click();
  await appFrame().getByRole('button', { name: 'Remove zork2' }).click();
  await appFrame().locator('#mine .game').waitFor({ state: 'detached', timeout: 5000 });
});

await check('ascii quests plays Kroz from Apogee\'s GPL source: walks by touch, saves, dies and keeps a high score', async () => {
  await openFromHub(/ASCII Quests/);
  const frame = () => page.frames().find(f => f.url().includes('/ascii/'));
  const app = appFrame();
  const state = () => frame().evaluate(() => window.asciiState());
  const prompt = () => app.locator('#prompt').evaluate(e => (e.hidden ? '' : e.textContent));
  const answer = async label => { await app.locator('#prompt button', { hasText: label }).click(); await page.waitForTimeout(600); };
  const until = async (what, fn, ms = 20000) => {
    for (const t = Date.now(); Date.now() - t < ms; await page.waitForTimeout(150)) { const v = await fn(); if (v) return v; }
    const last = (await state())?.text.split('\n')[24].replace(/[^ -~]/g, '.').trim();
    throw new Error(`no ${what}; screen asks "${await prompt()}", bottom line "${last}"`);
  };
  await app.locator('.game').filter({ hasText: 'Return to Kroz' }).click();
  // The runtime answers colour and PC speed itself; the rest are buttons
  await until('difficulty question', async () => (await prompt()).includes('Advanced'));
  await answer('Advanced');
  const start = await until('first level', async () => {
    const s = await state();
    if (s?.px) return s;
    const p = await prompt();
    if (p.includes('Begin')) await answer('Begin');
    else if (p.includes('Continue')) await answer('Continue');
    return null;
  }, 40000);
  // The level waits for a key once its opening flash is over
  const text = await until('the level\'s first key', async () => { const s = await state(); return s.text.includes('Press any key to begin this level') && s.text; });
  if (!['Score', 'Level', 'Gems', 'Whips', 'Teleports'].every(w => text.includes(w))) throw new Error('level 1 isn\'t on screen');
  // A tap steps toward it, a held key walks
  const box = await app.locator('#screen').boundingBox();
  const at = (x, y) => [box.x + (x - 0.5) / 80 * box.width, box.y + (y - 0.5) / 25 * box.height];
  await page.touchscreen.tap(...at(start.px + 6, start.py));
  await until('a step right', async () => (await state()).px === start.px + 1, 3000);
  await page.keyboard.press('ArrowDown');
  await until('a step down', async () => (await state()).py === start.py + 1, 3000);
  // A hidden screen holds the game: a key pressed meanwhile waits for it to show again
  const seen = hidden => frame().evaluate(h => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
  await seen(true);
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(1000);
  if ((await state()).py !== start.py + 1) throw new Error('the game moved while its screen was hidden');
  await seen(false);
  await until('the held step', async () => (await state()).py === start.py + 2, 3000);
  // Saving writes the game's own file. Kroz now and then eats a key while a
  // monster is close, so Save is pressed again if no question comes
  let pressed = 0;
  await until('save question', async () => {
    if ((await prompt()).includes('Yes')) return true;
    if (Date.now() - pressed > 2000) { await app.locator('.side button', { hasText: 'Save' }).click(); pressed = Date.now(); }
    return false;
  }, 9000);
  await answer('Yes');
  const files = () => frame().evaluate(() => new Promise(r => {
    const q = indexedDB.open('ascii');
    q.onsuccess = () => { const g = q.result.transaction('files').objectStore('files').getAll(IDBKeyRange.bound('return/', 'return/￿')); g.onsuccess = () => { q.result.close(); r(g.result); }; };
  }));
  await until('the save file', async () => (await frame().evaluate(() => new Promise(r => {
    const q = indexedDB.open('ascii');
    q.onsuccess = () => { const g = q.result.transaction('files').objectStore('files').getAllKeys(); g.onsuccess = () => { q.result.close(); r(g.result); }; };
  }))).includes('return/RETURN.SAV'), 5000);
  // Whip what comes close, then let the creatures take every gem; a
  // score that places asks for a name
  for (let i = 0; i < 6; i++) { await app.locator('.side button', { hasText: 'Whip' }).click(); await page.waitForTimeout(400); }
  const end = await until('the end of the game', async () => {
    const s = await state();
    if (s?.line) return 'name';
    const p = await prompt();
    if (p.includes('Yes') && s.text.includes('HIGH SCORE')) return 'table';
    if (p.includes('Continue')) await answer('Continue');
    return null;
  }, 90000);
  if (end === 'name') {
    await app.locator('#lineText').fill('CAR TESTER');
    await app.locator('#line button').click();
    await until('another game question', async () => (await prompt()).includes('Yes'));
    const table = await files();
    if (!JSON.stringify(table).includes('CAR TESTER')) throw new Error('the high score wasn\'t kept');
    if (!(await state()).text.includes('CAR TESTER')) throw new Error('the high score isn\'t on screen');
  }
  // No more games: the game signs off and the list comes back
  await answer('No');
  await until('the list of games', async () => {
    if (await app.locator('#library').isVisible()) return true;
    if ((await prompt()).includes('Continue')) await answer('Continue');
    return false;
  });
  await page.screenshot({ path: shots + 'ascii.png' });
});

await check('supertux (holders) streams its data, starts the story by touch, saves when left and loads the save again', async () => {
  await openFromHub(/SuperTux/);
  const frame = () => page.frames().find(f => f.url().includes('/supertux/'));
  const app = appFrame();
  const SAVE = '/home/web_user/.local/share/supertux2/profile1/world1.stsg';
  const until = async (what, fn, ms = 30000) => {
    for (const t = Date.now(); Date.now() - t < ms; await page.waitForTimeout(250)) if (await fn()) return;
    throw new Error(`no ${what}; game log: ${(await frame().evaluate(() => window.supertuxLog.slice(-3).join(' | '))) || 'empty'}`);
  };
  const saved = () => frame().evaluate(path => window.Module.FS.analyzePath(path).exists, SAVE);
  const stats = () => frame().evaluate(() => window.supertuxStats());
  await app.locator('#play').click();
  await app.locator('#player').waitFor({ timeout: 120000 });
  await until('frames', async () => (await stats()).frames > 30);
  // Every file the title screen reads came with the first download
  const boot = await stats();
  if (boot.waits) throw new Error(`the title screen waited for data ${boot.waits} times`);
  // A tap on Start Game (the menu's first item, in the middle of the screen)
  const box = await app.locator('#canvas').boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  // Skip the intro; the world map writes the story's save
  await until('the world map\'s save', async () => {
    if (await saved()) return true;
    await page.keyboard.down('Escape');
    await page.waitForTimeout(150);
    await page.keyboard.up('Escape');
    await page.waitForTimeout(1500);
    return false;
  }, 60000);
  await page.screenshot({ path: shots + 'supertux.png' });
  // Leaving through the hub writes the save to the game's IndexedDB (IDBFS)
  await page.click('#home');
  await page.waitForSelector('#runner', { state: 'hidden' });
  await openFromHub(/SuperTux/);
  const kept = await frame().evaluate(path => new Promise(resolve => {
    const req = indexedDB.open('/home/web_user/.local/share/supertux2');
    req.onsuccess = () => {
      if (!req.result.objectStoreNames.contains('FILE_DATA')) { req.result.close(); return resolve(false); }
      const get = req.result.transaction('FILE_DATA').objectStore('FILE_DATA').getKey(path);
      get.onsuccess = () => { req.result.close(); resolve(get.result === path); };
    };
    req.onerror = () => resolve(false);
  }), SAVE);
  if (!kept) throw new Error('the save wasn\'t kept when the app closed');
  // The blocks came from IndexedDB this time, and the save is back
  await app.locator('#play').click();
  await app.locator('#player').waitFor({ timeout: 60000 });
  await until('the save, loaded', saved, 10000);
  const again = await stats();
  if (again.fetched) throw new Error(`downloaded ${again.fetched} blocks again`);
  await app.locator('#quitBtn').click();
  await app.locator('#start').waitFor({ timeout: 10000 });
});

await check('librequake plays with touch and a controller and resumes from its autosave', async () => {
  await openFromHub(/LibreQuake/);
  const frame = () => page.frames().find(f => f.url().includes('/quake/'));
  await appFrame().locator('#free .game').filter({ hasText: 'LibreQuake' }).click();
  // First time: downloads 25 MB, then starts in the start map
  await appFrame().locator('#player[data-mode="game"]').waitFor({ timeout: 60000 });
  // the start map's music, played by the page from LibreQuake's track02.ogg
  await appFrame().locator('#player[data-music="2"]').waitFor({ timeout: 10000 });
  await page.waitForTimeout(1500);
  const canvas = appFrame().locator('#canvas');
  const box = await canvas.boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });
  // Menu opens Quake's menu, with the arrows pad; Back closes it. (Done
  // first: after a screenshot, headless Chrome's taps and clicks miss
  // their place in the app's frame.)
  const tap = async name => {
    const b = await appFrame().getByRole('button', { name, exact: true }).boundingBox();
    await touch('touchStart', [[b.x + b.width / 2, b.y + b.height / 2]]);
    await page.waitForTimeout(60);
    await touch('touchEnd', []);
  };
  await tap('Menu');
  await appFrame().locator('#player[data-mode="menu"]').waitFor({ timeout: 3000 });
  await tap('Back');
  await appFrame().locator('#player[data-mode="game"]').waitFor({ timeout: 3000 });
  // A finger dragged across the game turns the view
  const before = await canvas.screenshot();
  await touch('touchStart', [[box.x + box.width * 0.6, box.y + box.height * 0.3]]);
  for (let i = 1; i <= 10; i++) { await touch('touchMove', [[box.x + box.width * 0.6 + i * 12, box.y + box.height * 0.3]]); await page.waitForTimeout(30); }
  await touch('touchEnd', []);
  await page.waitForTimeout(300);
  const turned = await canvas.screenshot();
  if (turned.equals(before)) throw new Error('dragging didn\'t turn the view');
  // The stick walks
  const stick = await appFrame().locator('#stick').boundingBox();
  const cx = stick.x + stick.width / 2, cy = stick.y + stick.height / 2;
  await touch('touchStart', [[cx, cy]]);
  await touch('touchMove', [[cx, cy - 60]]);
  await page.waitForTimeout(800);
  await touch('touchEnd', []);
  await page.waitForTimeout(300);
  if ((await canvas.screenshot()).equals(turned)) throw new Error('the stick didn\'t walk');
  // Two pads like the car: the controller's raw device and the car's
  // standard-mapping copy. Start opens the menu, the bottom button closes
  // it, and D-pad up walks; the on-screen controls hide.
  await frame().evaluate(() => {
    const pad = (id, mapping, index) => ({ id, index, mapping, connected: true, timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
    const pads = [pad('raw', '', 0), pad('Tesla Virtual Gamepad', 'standard', 1)];
    navigator.getGamepads = () => pads;
    window.padHold = async (b, ms = 150) => {
      Object.assign(pads[1].buttons[b], { pressed: true, value: 1 });
      await new Promise(r => setTimeout(r, ms));
      for (const p of pads) for (const x of p.buttons) Object.assign(x, { pressed: false, value: 0 });
      await new Promise(r => setTimeout(r, 300));
    };
  });
  await frame().evaluate(() => padHold(9));
  await appFrame().locator('#player[data-mode="menu"]').waitFor({ timeout: 3000 });
  await frame().evaluate(() => padHold(0));
  await appFrame().locator('#player[data-mode="game"]').waitFor({ timeout: 3000 });
  const still = await canvas.screenshot();
  await frame().evaluate(() => padHold(12, 1000));
  if ((await canvas.screenshot()).equals(still)) throw new Error('the D-pad didn\'t walk');
  if (await appFrame().locator('#stick').isVisible()) throw new Error('on-screen controls still showing with a controller');
  const fps = parseInt(await appFrame().locator('#fps').textContent());
  if (!(fps >= 30)) throw new Error(`running at ${fps} fps`);
  console.log(`     ${fps} fps`);
  await page.screenshot({ path: shots + 'quake.png' });
  // Closing the app from the hub saves the game as "auto", and Continue
  // loads it
  await page.click('#home');
  await page.waitForSelector('#runner', { state: 'hidden' });
  await openFromHub(/LibreQuake/);
  const saves = await frame().evaluate(() => new Promise(r => {
    const q = indexedDB.open('quake');
    q.onsuccess = () => { const g = q.result.transaction('saves').objectStore('saves').get('librequake'); g.onsuccess = () => r((g.result?.files || []).map(f => f.name)); };
    q.onerror = () => r([]);
  }));
  if (!saves.includes('auto.sav')) throw new Error(`no autosave: ${saves.join(', ')}`);
  await appFrame().getByRole('button', { name: 'Continue LibreQuake' }).click();
  await appFrame().locator('#player[data-mode="game"]').waitFor({ timeout: 30000 });
  await appFrame().getByRole('button', { name: 'Games' }).click();
  await appFrame().locator('#library').waitFor({ state: 'visible', timeout: 10000 });
});

await check('librequake takes quake files from a phone', async () => {
  await openFromHub(/LibreQuake/);
  // A made-up pak with the files the first pak of Quake has, and a file
  // that isn't Quake's
  const pak = (names) => {
    const dir = Buffer.alloc(64 * names.length);
    names.forEach((n, i) => { dir.write(n, i * 64); dir.writeInt32LE(12, i * 64 + 56); dir.writeInt32LE(0, i * 64 + 60); });
    const head = Buffer.alloc(12);
    head.write('PACK');
    head.writeInt32LE(12, 4);
    head.writeInt32LE(dir.length, 8);
    return Buffer.concat([head, dir]);
  };
  writeFileSync(shots + 'PAK0.PAK', pak(['gfx/palette.lmp', 'progs.dat', 'maps/e1m1.bsp']));
  writeFileSync(shots + 'notes.pak', 'not a pak');
  await appFrame().getByRole('button', { name: 'Get files from phone' }).click();
  await appFrame().getByRole('button', { name: 'I own my games' }).click();
  await appFrame().locator('#transferStatus').filter({ hasText: 'Waiting' }).waitFor({ timeout: 10000 });
  const link = await appFrame().locator('#qr a').getAttribute('href');
  if (!link.includes('?app=quake')) throw new Error(`phone link doesn't ask for Quake files: ${link}`);
  const phone = await browser.newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  await phone.goto(link);
  const [pick] = await Promise.all([phone.waitForEvent('filechooser'), phone.getByRole('button', { name: 'Choose games' }).click()]);
  await pick.setFiles([shots + 'PAK0.PAK', shots + 'notes.pak']);
  await phone.locator('#files li.ok').waitFor({ timeout: 20000 });
  await phone.locator('#files li.bad').filter({ hasText: 'Not a Quake file' }).waitFor({ timeout: 5000 });
  await phone.close();
  await appFrame().locator('#received li:not(.bad):not(.busy)').filter({ hasText: 'episode 1' }).waitFor({ timeout: 20000 });
  await appFrame().getByRole('button', { name: 'Done' }).click();
  await appFrame().locator('#mine .game').filter({ hasText: 'Quake (shareware)' }).waitFor({ timeout: 5000 });
  await appFrame().getByRole('button', { name: 'Remove Quake (shareware)' }).click();
  await appFrame().getByRole('button', { name: 'Remove Quake (shareware)' }).click();
  await appFrame().locator('#mine .game').waitFor({ state: 'detached', timeout: 5000 });
});

await check('openttd plays with touch, saves when left and continues', async () => {
  await openFromHub(/OpenTTD/);
  const frame = () => page.frames().find(f => f.url().includes('/openttd/'));
  await appFrame().locator('#free .game').click();
  // First time: downloads the base sets (15 MB), then the title screen
  await appFrame().locator('#player[data-mode="menu"]').waitFor({ timeout: 90000 });
  // the title music, OpenMSX's MIDI played by the page's synthesizer
  await appFrame().locator('#player[data-music]').waitFor({ timeout: 10000 });
  await page.waitForTimeout(1500);
  const box = await appFrame().locator('#canvas').boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });
  const tap = async (x, y) => {
    await touch('touchStart', [[x, y]]);
    await page.waitForTimeout(60);
    await touch('touchEnd', []);
    await page.waitForTimeout(600);
  };
  // Taps reach the game's own menus: New Game, then Generate (at 150%
  // interface size on a touch screen, in the middle of the 773x541 game)
  await tap(box.x + box.width / 2, box.y + 90);
  await tap(box.x + box.width / 2, box.y + 444);
  await appFrame().locator('#player[data-mode="game"]').waitFor({ timeout: 60000 });
  await page.waitForTimeout(1000);
  const view = () => frame().evaluate(() => [0, 1, 2].map(i => ottd._web_view(i)));
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const move = async (from, by, steps = 10) => {
    await touch('touchStart', from);
    for (let i = 1; i <= steps; i++) {
      await touch('touchMove', from.map(([x, y], n) => [x + by[n][0] * i / steps, y + by[n][1] * i / steps]));
      await page.waitForTimeout(30);
    }
    await touch('touchEnd', []);
    await page.waitForTimeout(400);
  };
  // One finger drags the map
  const v0 = await view();
  await move([[cx, cy]], [[-150, -80]]);
  const v1 = await view();
  if (v1[0] === v0[0] && v1[1] === v0[1]) throw new Error('dragging didn\'t move the map');
  // Pinching out zooms in
  await move([[cx - 30, cy], [cx + 30, cy]], [[-60, 0], [60, 0]]);
  const v2 = await view();
  if (!(v2[2] < v1[2])) throw new Error(`pinching didn't zoom in: zoom ${v1[2]} to ${v2[2]}`);
  // Two fingers move the map too
  await move([[cx - 40, cy], [cx + 40, cy]], [[100, 60], [100, 60]]);
  const v3 = await view();
  if (v3[0] === v2[0] && v3[1] === v2[1]) throw new Error('a two-finger drag didn\'t move the map');
  const fps = parseInt(await appFrame().locator('#fps').textContent());
  if (!(fps >= 30)) throw new Error(`running at ${fps} fps`);
  console.log(`     ${fps} fps`);
  await page.screenshot({ path: shots + 'openttd.png' });
  // Closing the app from the hub saves the game as autosave/exit.sav, and
  // Continue loads it, the view where it was
  await page.click('#home');
  await page.waitForSelector('#runner', { state: 'hidden' });
  await openFromHub(/OpenTTD/);
  await appFrame().getByRole('button', { name: 'Continue' }).click();
  await appFrame().locator('#player[data-mode="game"]').waitFor({ timeout: 60000 });
  const v4 = await view();
  if (v4.join() !== v3.join()) throw new Error(`continued at ${v4.join()}, left at ${v3.join()}`);
  await appFrame().getByRole('button', { name: 'Quit' }).click();
  await appFrame().locator('#library').waitFor({ state: 'visible', timeout: 15000 });
});

// The game's files aren't free: this needs the Heroes II demo (HEROES2.AGG
// and BROKENA.MP2 from h2demo.zip) in roms/h2demo/, which git leaves out
await check('fheroes2 plays the player\'s Heroes II files by touch and keeps its saves', async () => {
  const demo = new URL('../roms/h2demo/', import.meta.url);
  try { statSync(new URL('HEROES2.AGG', demo)); } catch { throw new Error('SKIP: no Heroes II demo files in roms/h2demo/'); }
  if (!dev) throw new Error('SKIP: early access for holders, which only the dev server can unlock');
  // The hub opens it from the Holders menu (unlocked by the holders check, or here)
  await page.goto(base + '/app/holders');
  const menuLock = appFrame().locator('#holdersLock .code a');
  await Promise.race([menuLock.waitFor({ timeout: 10000 }), appFrame().locator('#apps .app').first().waitFor({ timeout: 10000 })]);
  if (await menuLock.isVisible()) {
    await (await holderNow()).link(new URL(await menuLock.getAttribute('href')).searchParams.get('link'));
    await appFrame().locator('#apps .app').first().waitFor({ timeout: 10000 });
  }
  await openFromHub(/fheroes2/);
  await appFrame().locator('#playBtn[disabled]').waitFor({ timeout: 15000 });
  // The game itself is played on its own page: the test browser emulates
  // the car's 1.53 pixel ratio for the hub only (its cross-origin frame
  // reports 1), and SDL misses taps in that mix. With a real 1.53 ratio
  // (Chrome's --force-device-scale-factor), taps work in the frame too.
  const game = await browser.newPage({ viewport: { width: 773, height: 601 }, deviceScaleFactor: 1.53, hasTouch: true });
  game.on('pageerror', e => errors.push(`fheroes2 page: ${e.message}`));
  try {
    await game.goto(`${appsBase}/fheroes2/`);
    const lock = game.locator('#holdersLock .code a');
    await Promise.race([lock.waitFor({ timeout: 10000 }), game.locator('#playBtn').waitFor({ timeout: 10000 })]);
    if (await lock.isVisible()) await (await holderNow()).link(new URL(await lock.getAttribute('href')).searchParams.get('link'));
    await game.locator('#playBtn').waitFor({ timeout: 15000 });
    if (!await game.locator('#playBtn').isDisabled()) throw new Error('Play is on before any game files');
    const picker = game.waitForEvent('filechooser');
    await game.getByRole('button', { name: 'Add game files' }).click();
    const terms = game.getByRole('button', { name: 'I own my games' });
    if (await terms.isVisible()) await terms.click();
    await (await picker).setFiles([
      { name: 'HEROES2.AGG', mimeType: 'application/octet-stream', buffer: readFileSync(new URL('HEROES2.AGG', demo)) },
      { name: 'BROKENA.MP2', mimeType: 'application/octet-stream', buffer: readFileSync(new URL('BROKENA.MP2', demo)) },
      { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a game file') },
    ]);
    await game.locator('#playBtn:not([disabled])').waitFor({ timeout: 30000 });
    const tiles = (await game.locator('#files .file small').allTextContents()).join(' | ');
    if (!/^The Succession Wars · 41 MB \| Optional: The Price of Loyalty \| 1 map/.test(tiles)) throw new Error(`files read ${tiles}`);
    await game.locator('#playBtn').click();
    await game.locator('#player').waitFor({ state: 'visible', timeout: 60000 });
    await game.waitForTimeout(4000);
    // The game's 640x480 picture, scaled into the canvas
    const box = await game.locator('#canvas').boundingBox();
    const s = Math.min(box.width / 640, box.height / 480);
    const tap = async (x, y, wait = 1500) => {
      await game.touchscreen.tap(box.x + (box.width - 640 * s) / 2 + x * s, box.y + (box.height - 480 * s) / 2 + y * s);
      await game.waitForTimeout(wait);
    };
    const shot = () => game.locator('#canvas').screenshot();
    const first = await shot();
    // First start: language, the touch greeting and resolution (OKAY on
    // each), then New Game, the demo's warning, Standard Game and OKAY on its
    // one map
    await tap(215, 409);
    if ((await shot()).equals(first)) throw new Error('a tap did nothing on the language list');
    await tap(319, 426);
    await tap(215, 372, 2500);
    await tap(520, 229);
    await tap(319, 341, 1000);
    await tap(525, 73, 2500);
    await tap(194, 418, 6000);
    await game.screenshot({ path: shots + 'fheroes2.png' });
    // A new game saves itself at the start of its first turn; Quit copies it to IndexedDB
    await game.getByRole('button', { name: 'Quit' }).click();
    await game.locator('#library').waitFor({ state: 'visible', timeout: 15000 });
    const saves = await game.evaluate(() => new Promise(r => {
      const q = indexedDB.open('/fheroes2');
      q.onsuccess = () => {
        if (!q.result.objectStoreNames.contains('FILE_DATA')) return r([]);
        const g = q.result.transaction('FILE_DATA').objectStore('FILE_DATA').getAllKeys();
        g.onsuccess = () => r(g.result.filter(k => k.includes('/files/save/')));
      };
      q.onerror = () => r([]);
    }));
    if (!saves.some(k => /autosave/i.test(k))) throw new Error(`no autosave kept (${saves.join(', ') || 'no saves'})`);
    console.log(`     saves: ${saves.map(k => k.replace(/^.*\//, '')).join(', ')}`);
  } finally {
    await game.close();
  }
});

await check('openarena plays a bot match with touch and a controller, and keeps the game', async () => {
  // The Quake III renderer crashes SwiftShader's graphics process, so this
  // check has its own browser on the real GPU (ANGLE on OpenGL by default)
  const gpu = await chromium.launch({
    executablePath: process.env.CHROME || '/usr/bin/google-chrome',
    args: ['--enable-gpu', `--use-angle=${process.env.OA_ANGLE || 'gl'}`, '--ignore-gpu-blocklist'],
  });
  try {
    const p = await gpu.newPage({ viewport: { width: 773, height: 601 }, deviceScaleFactor: 1.53, hasTouch: true });
    p.on('pageerror', e => errors.push(`openarena pageerror: ${e.message}`));
    p.on('console', m => { if (m.type() === 'error') errors.push(`openarena console: ${m.text()}`); });
    const app = () => p.frameLocator('#frame');
    const frame = () => p.frames().find(f => f.url().includes('/openarena/'));
    // OpenArena is early access for holders, and this browser keeps its own
    // storage: the holder's phone unlocks it once, like a second car
    let unlocked = false;
    const open = async () => {
      if (!dev) throw new Error('SKIP: early access for holders, which only the dev server can unlock');
      await p.goto(base + '/app/openarena');
      if (!unlocked) {
        const code = app().locator('#holdersLock .code a');
        await code.waitFor({ timeout: 10000 });
        await (await holderNow()).link(new URL(await code.getAttribute('href')).searchParams.get('link'));
        await code.waitFor({ state: 'detached', timeout: 10000 });
        unlocked = true;
      }
      await p.waitForSelector('#loading', { state: 'hidden' });
    };
    const cdp = await p.context().newCDPSession(p);
    const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });
    const tapAt = async (x, y) => { await touch('touchStart', [[x, y]]); await p.waitForTimeout(120); await touch('touchEnd', []); };
    const tap = async name => { const b = await app().getByRole('button', { name, exact: true }).boundingBox(); await tapAt(b.x + b.width / 2, b.y + b.height / 2); };
    // A place in the game's menus (640x480, centred and scaled to the
    // height) on the page
    const menuAt = async (x, y) => {
      const b = await app().locator('#canvas').boundingBox();
      const s = b.height / 480;
      await tapAt(b.x + b.width / 2 + (x - 320) * s, b.y + y * s);
    };
    await open();
    await app().locator('.arena').filter({ hasText: 'Think Twice Or Die' }).click();
    // First time: downloads the game (54 MB) and the arena, then the match
    // starts with the bots
    await app().locator('#player[data-mode="game"]').waitFor({ timeout: 120000 });
    // The match's players, from the game's console (status lists them)
    const players = async () => {
      await frame().evaluate(() => document.getElementById('canvas').focus());
      await p.keyboard.press('Shift+Escape');
      await p.keyboard.type('/status');
      await p.keyboard.press('Enter');
      await p.keyboard.press('Shift+Escape');
      await p.waitForTimeout(300);
      const log = await frame().evaluate(() => openarenaLog.slice());
      const at = log.lastIndexOf(']/status');
      return log.slice(at).filter(l => /^\s*\d+\s+-?\d+\s+\d+\s+\S+\s+\S*(bot|loopback)\s/.test(l)).length;
    };
    // Menu opens the game's menu; tapping RESUME GAME closes it (taps first:
    // after a screenshot, headless Chrome's taps miss their place)
    await tap('Menu');
    await app().locator('#player[data-mode="menu"]').waitFor({ timeout: 3000 });
    await p.waitForTimeout(300);
    await menuAt(320, 323);
    await app().locator('#player[data-mode="game"]').waitFor({ timeout: 3000 });
    // and LEAVE ARENA goes back to the arenas, keeping the settings
    await tap('Menu');
    await app().locator('#player[data-mode="menu"]').waitFor({ timeout: 3000 });
    await p.waitForTimeout(300);
    await menuAt(320, 350);
    await app().locator('#library').waitFor({ state: 'visible', timeout: 10000 });
    const config = await frame().evaluate(() => new Promise(r => {
      const q = indexedDB.open('openarena');
      q.onsuccess = () => { const g = q.result.transaction('config').objectStore('config').get('q3config'); g.onsuccess = () => r(g.result ? new TextDecoder().decode(g.result.data) : ''); };
      q.onerror = () => r('');
    }));
    if (!/seta name "Player"/.test(config)) throw new Error('the settings weren\'t kept');
    // Play again: from IndexedDB this time, no download
    let downloads = 0;
    p.on('request', r => { if (/\/openarena\/data\/.*\.pk3$/.test(r.url())) downloads++; });
    await app().getByRole('button', { name: 'Play Think Twice Or Die' }).click();
    await app().locator('#player[data-mode="game"]').waitFor({ timeout: 60000 });
    if (downloads) throw new Error(`downloaded ${downloads} pk3s again`);
    const joined = await players();
    if (joined < 4) throw new Error(`${joined} players in the match, expected the player and 3 bots`);
    // A finger dragged across the game turns the view, and the stick walks
    // (once the player is back, if a bot got them first)
    const canvas = app().locator('#canvas');
    const box = await canvas.boundingBox();
    const alive = async () => {
      for (let i = 0; i < 10 && await app().locator('#player.dead').count(); i++) {
        const f = await app().locator('[data-b="fire"]').boundingBox();
        await tapAt(f.x + f.width / 2, f.y + f.height / 2);
        await p.waitForTimeout(500);
      }
    };
    await alive();
    const sky = () => p.screenshot({ clip: { x: box.x + box.width * 0.2, y: box.y + 10, width: box.width * 0.6, height: box.height * 0.45 } });
    const before = await sky();
    await touch('touchStart', [[box.x + box.width * 0.6, box.y + box.height * 0.3]]);
    for (let i = 1; i <= 10; i++) { await touch('touchMove', [[box.x + box.width * 0.6 + i * 12, box.y + box.height * 0.3]]); await p.waitForTimeout(30); }
    await touch('touchEnd', []);
    await p.waitForTimeout(300);
    const turned = await sky();
    if (turned.equals(before)) throw new Error('dragging didn\'t turn the view');
    const stick = await app().locator('#stick').boundingBox();
    const cx = stick.x + stick.width / 2, cy = stick.y + stick.height / 2;
    await touch('touchStart', [[cx, cy]]);
    await touch('touchMove', [[cx, cy - 60]]);
    await p.waitForTimeout(800);
    await touch('touchEnd', []);
    await p.waitForTimeout(300);
    if ((await sky()).equals(turned)) throw new Error('the stick didn\'t walk');
    // Two pads like the car's. Start opens the menu, the bottom button
    // closes it, and the right stick turns; the on-screen controls hide.
    await frame().evaluate(() => {
      const pad = (id, mapping, index) => ({ id, index, mapping, connected: true, timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
      const pads = [pad('raw', '', 0), pad('Tesla Virtual Gamepad', 'standard', 1)];
      navigator.getGamepads = () => pads;
      window.padHold = async (b, ms = 150) => {
        Object.assign(pads[1].buttons[b], { pressed: true, value: 1 });
        await new Promise(r => setTimeout(r, ms));
        for (const x of pads[1].buttons) Object.assign(x, { pressed: false, value: 0 });
        await new Promise(r => setTimeout(r, 300));
      };
      window.padTurn = async ms => {
        pads[1].axes[2] = 1;
        await new Promise(r => setTimeout(r, ms));
        pads[1].axes[2] = 0;
        await new Promise(r => setTimeout(r, 300));
      };
    });
    await frame().evaluate(() => padHold(9));
    await app().locator('#player[data-mode="menu"]').waitFor({ timeout: 3000 });
    await frame().evaluate(() => padHold(0));
    await app().locator('#player[data-mode="game"]').waitFor({ timeout: 3000 });
    const still = await sky();
    await frame().evaluate(() => padTurn(800));
    if ((await sky()).equals(still)) throw new Error('the right stick didn\'t turn');
    if (await app().locator('#stick').isVisible()) throw new Error('on-screen controls still showing with a controller');
    const fps = parseInt(await app().locator('#fps').textContent());
    if (!(fps >= 30)) throw new Error(`running at ${fps} fps`);
    console.log(`     ${fps} fps`);
    await p.screenshot({ path: shots + 'openarena.png' });
    // Arenas leaves the match (clicked from the page: after the screenshot,
    // real clicks miss)
    await frame().evaluate(() => document.getElementById('quitBtn').click());
    await app().locator('#library').waitFor({ state: 'visible', timeout: 10000 });
  } finally {
    await gpu.close();
  }
});

await check('block builder makes a world, digs with touch, saves when left and reopens it', async () => {
  await openFromHub(/Block Builder/);
  const frame = () => page.frames().find(f => f.url().includes('/blocks/'));
  // The world as the game keeps it in its IndexedDB: SHA-256 of the file
  const stored = () => frame().evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open('/classicube', 21);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const get = req.result.transaction('FILE_DATA').objectStore('FILE_DATA').get('/classicube/maps/World 1.cw');
      get.onsuccess = async () => {
        req.result.close();
        const data = get.result?.contents;
        resolve(data ? [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(b => b.toString(16).padStart(2, '0')).join('') : null);
      };
    };
  }));
  await appFrame().locator('#landSeg').getByRole('button', { name: 'Flat' }).click();
  await appFrame().getByRole('button', { name: 'Make world' }).click();
  await appFrame().locator('#loading').waitFor({ state: 'hidden', timeout: 60000 });
  await appFrame().locator('#saved').filter({ hasText: 'Saved' }).waitFor({ timeout: 10000 });
  const first = await stored();
  if (!first) throw new Error('the new world wasn\'t saved');
  // Look down, then hold a finger on the ground to break the block there
  const box = await appFrame().locator('#canvas').boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  for (let n = 0; n < 3; n++) {
    await touch('touchStart', [[cx, cy - 120]]);
    for (let i = 1; i <= 10; i++) { await touch('touchMove', [[cx, cy - 120 + 24 * i]]); await page.waitForTimeout(16); }
    await touch('touchEnd', []);
  }
  await touch('touchStart', [[cx, cy]]);
  await page.waitForTimeout(1200);
  await touch('touchEnd', []);
  await page.waitForTimeout(300);
  await page.screenshot({ path: shots + 'blocks.png' });
  // Closing the app from the hub saves the world, and it opens again
  await page.click('#home');
  await page.waitForSelector('#runner', { state: 'hidden' });
  await openFromHub(/Block Builder/);
  const left = await stored();
  if (left === first) throw new Error('the dug world wasn\'t saved when the app closed');
  await appFrame().getByRole('button', { name: 'Play World 1' }).click();
  await appFrame().locator('#loading').waitFor({ state: 'hidden', timeout: 60000 });
  await appFrame().getByRole('button', { name: 'Worlds' }).click();
  await appFrame().locator('#library').waitFor({ state: 'visible', timeout: 15000 });
  await appFrame().locator('.world').filter({ hasText: 'World 1' }).waitFor({ timeout: 5000 });
});

await check('craft 4k breaks and places with touch, saves when left and keeps the world', async () => {
  await openFromHub(/Craft 4K/);
  const frame = () => page.frames().find(f => f.url().includes('/craft4k/'));
  const stored = () => frame().evaluate(() => new Promise(resolve => {
    const req = indexedDB.open('craft4k', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('world');
    req.onsuccess = () => {
      const get = req.result.transaction('world').objectStore('world').get('world');
      get.onsuccess = () => { req.result.close(); resolve(get.result ? { seed: get.result.seed.join(), edits: [...get.result.edits], player: get.result.player } : null); };
    };
  }));
  // The help shows over the game the first time
  await appFrame().locator('#fps').filter({ hasText: /fps/ }).waitFor({ timeout: 15000 });
  const help = appFrame().getByRole('button', { name: 'Play' });
  if (await help.isVisible()) await help.click();
  // Look down at the ground, break the block there and put bricks in its place
  const box = await appFrame().locator('#canvas').boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });
  const tapOn = async name => {
    const b = await appFrame().getByRole('button', { name, exact: true }).boundingBox();
    await touch('touchStart', [[b.x + b.width / 2, b.y + b.height / 2]]);
    await page.waitForTimeout(120);
    await touch('touchEnd', []);
    await page.waitForTimeout(300);
  };
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await touch('touchStart', [[cx, cy - 150]]);
  for (let i = 1; i <= 10; i++) { await touch('touchMove', [[cx, cy - 150 + 30 * i]]); await page.waitForTimeout(16); }
  await touch('touchEnd', []);
  await page.waitForTimeout(300);
  // (no screenshots before the taps: taking one stops the touches that follow)
  await tapOn('Break');
  await tapOn('Bricks');
  await tapOn('Place');
  if (await appFrame().getByRole('button', { name: 'Bricks' }).getAttribute('aria-pressed') !== 'true') throw new Error('tapping Bricks didn\'t pick it');
  const fps = parseInt(await appFrame().locator('#fps').textContent());
  await page.screenshot({ path: shots + 'craft4k.png' });
  // Closing the app from the hub saves the world (the bricks, where the
  // broken block was), and the hub unloads it once it has
  const close = async () => {
    await page.click('#home');
    await page.waitForSelector('#runner', { state: 'hidden' });
    await page.waitForFunction(() => !document.querySelector('#frame').src.includes('/craft4k/'), null, { timeout: 5000 });
  };
  await close();
  await openFromHub(/Craft 4K/);
  const kept = await stored();
  if (!kept) throw new Error('the world wasn\'t saved when the app closed');
  if (!kept.edits.some(e => (e & 0xff) === 5)) throw new Error(`no bricks among the ${kept.edits.length} saved changes`);
  // and opening it again keeps the same world
  await appFrame().locator('#fps').filter({ hasText: /fps/ }).waitFor({ timeout: 15000 });
  await close();
  await openFromHub(/Craft 4K/);
  const again = await stored();
  if (again.seed !== kept.seed || again.edits.length < kept.edits.length) throw new Error('reopening changed the world');
  console.log(`     ${fps} fps, ${kept.edits.length} changes saved`);
});

await check('logic puzzles lists every puzzle, plays solo by touch and keeps it when closed', async () => {
  await openFromHub(/Logic Puzzles/);
  const frame = () => page.frames().find(f => f.url().includes('/puzzles/'));
  await appFrame().locator('.puzzle').first().waitFor();
  const n = await appFrame().locator('.puzzle').count();
  if (n !== 40) throw new Error(`expected 40 puzzles, got ${n}`);
  await appFrame().locator('.puzzle').filter({ has: page.locator('b', { hasText: /^Solo$/ }) }).click();
  await appFrame().locator('#loading').waitFor({ state: 'hidden', timeout: 20000 });
  // Tap the empty cells along the top row until a key fills one in
  const box = await appFrame().locator('#puzzlecanvas').boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });
  const tap = async (x, y, ms = 40) => { await touch('touchStart', [[x, y]]); await page.waitForTimeout(ms); await touch('touchEnd', []); await page.waitForTimeout(80); };
  const key = await appFrame().locator('#keys button', { hasText: /^5$/ }).boundingBox();
  for (let col = 0; col < 9 && !(await appFrame().locator('#undo').isEnabled()); col++) {
    await tap(box.x + box.width * (0.13 + col * 0.0925), box.y + box.height * 0.13);
    await tap(key.x + key.width / 2, key.y + key.height / 2);
  }
  if (!(await appFrame().locator('#undo').isEnabled())) throw new Error('no move was made by touch');
  // A long press is Solo's right click: a cell for pencil marks
  await tap(box.x + box.width * 0.5, box.y + box.height * 0.87, 700);
  await tap(key.x + key.width / 2, key.y + key.height / 2);
  const before = await frame().evaluate(() => localStorage.getItem('puzzles.solo.save'));
  await page.waitForTimeout(700);
  // Closing from the hub keeps the game; Continue brings it back
  await page.click('#home');
  await page.waitForSelector('#runner', { state: 'hidden' });
  await openFromHub(/Logic Puzzles/);
  const kept = await frame().evaluate(() => localStorage.getItem('puzzles.solo.save'));
  if (!kept || !/MOVE/.test(kept)) throw new Error(`the game wasn't kept: ${before ? 'saved before closing' : 'nothing saved'}`);
  await appFrame().getByRole('button', { name: 'Continue Solo' }).click();
  await appFrame().locator('#loading').waitFor({ state: 'hidden', timeout: 20000 });
  if (!(await appFrame().locator('#undo').isEnabled())) throw new Error('the move wasn\'t there after Continue');
  await page.screenshot({ path: shots + 'puzzles.png' });
  await appFrame().getByRole('button', { name: 'Puzzles' }).click();
  await appFrame().locator('.puzzle').first().waitFor();
});

await check('a place from the car\'s location follows the car', async () => {
  await openFromHub(/Star Map/);
  const appsOrigin = new URL(page.frames().find(f => f.url().includes('/stars/')).url()).origin;
  await page.frames().find(f => f.url().includes('/stars/')).evaluate(() =>
    localStorage.setItem('frunk.place', JSON.stringify({ lat: 38.57, lon: -109.55, name: 'Here (38.6°, -109.6°)' })));
  await page.context().grantPermissions(['geolocation'], { origin: new URL(base).origin });
  await page.context().grantPermissions(['geolocation'], { origin: appsOrigin });
  await page.context().setGeolocation({ latitude: 39.74, longitude: -104.99 });   // Denver, 350 km away
  await page.click('#home');
  await openFromHub(/Star Map/);
  await appFrame().locator('#placeBtn').filter({ hasText: 'Here (39.7°, -105.0°)' }).waitFor({ timeout: 8000 });
  await page.context().clearPermissions();
});

await check('an app and the hub\'s icons, seen once, open again with no connection', async () => {
  // a browser that has never been here: the app's files load before its
  // service worker runs, and are handed to it once it does
  const context = await browser.newContext({ viewport: { width: 773, height: 601 }, deviceScaleFactor: 1.53, hasTouch: true });
  try {
    const p = await context.newPage();
    await p.goto(base + '/app/sleep');
    await p.frameLocator('#frame').locator('.tile').first().waitFor();
    await p.evaluate(() => navigator.serviceWorker.ready);
    const app = p.frames().find(f => f.url().includes('/sleep/'));
    await app.waitForFunction(async () => !!(await caches.match('/_shared/ambient.js')), null, { timeout: 10000 });
    await context.setOffline(true);
    await p.goto(base + '/app/sleep');
    await p.frameLocator('#frame').locator('.tile').first().waitFor({ timeout: 10000 });
    // and the hub's grid has every app's icon, which the hub's worker fetched when it started
    await p.goto(base + '/');
    await p.waitForSelector('#grid .card');
    await p.waitForFunction(() => [...document.querySelectorAll('#grid .card img')].every(i => i.complete));
    const missing = await p.locator('#grid .card img').evaluateAll(imgs => imgs.filter(i => !i.naturalWidth).length);
    if (missing) throw new Error(`${missing} app icons missing offline after one visit`);
  } finally {
    await context.close();
  }
});

await check('hub and a cached app open offline and on a slow connection', async () => {
  const context = page.context();
  const before = errors.length;   // failed requests while offline are expected
  // A slow page comes from the cache after a few seconds, not when the
  // connection finally gives up
  await context.route(/\/(app\/weather|weather\/)$/, async route => {
    await new Promise(r => setTimeout(r, 15000));
    route.continue().catch(() => {});
  });
  try {
    const t0 = Date.now();
    await page.goto(base + '/app/weather');
    await appFrame().locator('#temp').filter({ hasText: /°/ }).waitFor({ timeout: 12000 });
    console.log(`     slow connection: Weather showed in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  } finally {
    await context.unroute(/\/(app\/weather|weather\/)$/);
  }
  await context.setOffline(true);
  try {
    await page.goto(base + '/');
    await page.waitForSelector('#grid .card');
    await page.waitForFunction(() => [...document.querySelectorAll('#grid .card img')].every(i => i.complete));
    const missing = await page.locator('#grid .card img').evaluateAll(imgs => imgs.filter(i => !i.naturalWidth).length);
    if (missing) throw new Error(`${missing} app icons missing offline`);
    await page.locator('#grid').getByRole('button', { name: /Weather/ }).click();
    await appFrame().locator('#temp').filter({ hasText: /°/ }).waitFor({ timeout: 10000 });
    await page.screenshot({ path: shots + 'offline.png' });
  } finally {
    await context.setOffline(false);
    errors.length = before;
  }
});

await check('holders lock again when the wallet sells', async () => {
  if (!dev) throw new Error('SKIP: needs the dev server\'s made-up balances');
  if (!holder) throw new Error('the holders unlock check failed');
  await holder.setTokens(10);
  // the pass is checked at most every 10 minutes; start that clock over
  await openFromHub(/Holders/);
  await page.frames().find(f => f.url().includes('/holders/')).evaluate(() => sessionStorage.removeItem('holders.checked'));
  await openFromHub(/Holders/);
  await appFrame().locator('#holdersLock .status').filter({ hasText: 'holds 10 FrunkStore tokens' }).waitFor({ timeout: 10000 });
});

await check('token chart, wallet and buying on the phone from the hub footer', async () => {
  await page.goto(base + '/');
  await page.waitForSelector('.card');
  if (await page.locator('#grid .card h2').filter({ hasText: 'FrunkStore Token' }).count()) throw new Error('the token screen is on the grid');
  await page.locator('#openToken').click();
  await page.waitForURL(/\/app\/token$/);
  await page.waitForSelector('#loading', { state: 'hidden' });
  const app = appFrame();
  // live numbers from DexScreener and GeckoTerminal, through /api/token
  await app.locator('#price').filter({ hasText: /^\$\d/ }).waitFor({ timeout: 20000 });
  await app.locator('#chartMsg').waitFor({ state: 'hidden', timeout: 45000 });   // a busy chart source is asked again after 30 s
  await app.getByRole('button', { name: '1H', exact: true }).click();
  await app.locator('#readout').filter({ hasText: / Vol / }).waitFor({ timeout: 45000 });
  const lit = await app.locator('#chart').evaluate(c => {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
    return n / (d.length / 4);
  });
  if (lit < 0.01) throw new Error(`chart nearly empty (${(lit * 100).toFixed(2)}% drawn)`);
  console.log(`     ${await app.locator('#price').textContent()} ${await app.locator('#change').textContent()}, mcap ${await app.locator('#mcap').textContent()}`);

  // Buying: the risks first, then a code to the phone page
  await app.getByRole('button', { name: 'Buy on your phone' }).click();
  if (await app.locator('#risks li').count() < 6) throw new Error('the risks are missing');
  if (!(await app.getByRole('button', { name: 'Show the code for my phone' }).isDisabled())) throw new Error('the code shows before the risks are accepted');
  await app.locator('#accept').check();
  await app.getByRole('button', { name: 'Show the code for my phone' }).click();
  const buyLink = await app.locator('#buyQr a').getAttribute('href');
  if (!buyLink.endsWith('/token/phone/?buy')) throw new Error(`buy code is ${buyLink}`);
  await page.screenshot({ path: shots + 'token-buy.png' });
  await app.locator('#buySheet [data-close]').click();

  // Connecting: a code to the phone page; a signed-in holder's wallet shows its balance and unlocks Holders
  await app.getByRole('button', { name: 'Connect wallet' }).click();
  const code = new URL(await app.locator('#connectCode a').getAttribute('href'));
  if (code.pathname !== '/token/phone/' || !code.searchParams.get('c')) throw new Error(`connect code is ${code}`);
  await page.screenshot({ path: shots + 'token-connect.png' });
  if (!dev) return;
  const holderWallet = await holderPhone(appsBase, 150000);
  const post = async (op, data) => (await fetch(`${appsBase}/api/token?op=${op}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json();
  const cid = code.searchParams.get('c');
  const { message } = await post('nonce', { address: holderWallet.address, cid });
  if (!message?.includes('Connect this wallet to the FrunkStore token screen')) throw new Error(`nonce: ${JSON.stringify(message)}`);
  const linked = await post('connect', { cid, message, signature: holderWallet.sign(message) });
  if (!linked.ok || !linked.holders) throw new Error(`connect: ${JSON.stringify(linked)}`);
  await app.locator('#tokens').filter({ hasText: '150,000 FrunkStore' }).waitFor({ timeout: 10000 });
  if (await app.locator('#kind').textContent() !== 'Signed in') throw new Error('not shown as signed in');
  await app.locator('#holders').filter({ hasText: 'unlocked' }).waitFor();
  await page.screenshot({ path: shots + 'token.png' });

  // The phone page: watching an address without signing, and the buying links after the risks
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  phone.on('pageerror', e => errors.push(`token phone pageerror: ${e.message}`));
  try {
    const watched = await holderPhone(appsBase, 150000);
    await watched.setTokens(2500);
    const car = await post('connect-open', {});
    await phone.goto(`${appsBase}/token/phone/?c=${car.cid}`);
    if (await phone.locator('#buy').isVisible()) throw new Error('buying shows on the connect page');
    const phantom = await phone.getByRole('link', { name: 'Open in Phantom' }).getAttribute('href');
    if (!phantom.includes(encodeURIComponent(`?c=${car.cid}`))) throw new Error('Phantom link drops the car code');
    await phone.locator('#address').fill(watched.address);
    await phone.getByRole('button', { name: 'Show it on my car' }).click();
    await phone.locator('#connectMsg').filter({ hasText: 'Connected: 2,500 FrunkStore' }).waitFor({ timeout: 5000 });
    const got = await post('connect-poll', { cid: car.cid, secret: car.secret });
    if (got.address !== watched.address || got.signed || got.pass) throw new Error(`watch-only poll: ${JSON.stringify(got)}`);

    await phone.goto(`${appsBase}/token/phone/?buy`);
    await phone.locator('#market b').waitFor({ timeout: 20000 });
    if (await phone.locator('#phantomSwap').isVisible()) throw new Error('buy links show before the risks are accepted');
    await phone.locator('#accept').check();
    const swap = await phone.getByRole('link', { name: 'Buy in Phantom' }).getAttribute('href');
    if (swap !== 'https://phantom.app/ul/v1/swap?buy=solana%3A101%2Faddress%3A9T1DbbiKfhfubEabDj5SWSMzBuyU4tJHkpSgR51Tpump') throw new Error(`Phantom swap link is ${swap}`);
    await phone.screenshot({ path: shots + 'token-phone.png', fullPage: true });
  } finally {
    await phone.close();
  }
});

await check('holders vote from a phone', async () => {
  const apps = appsBase;
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  phone.on('pageerror', e => errors.push(`vote pageerror: ${e.message}`));
  try {
    // An ordinary phone browser has no wallet: the page offers the wallet apps
    await phone.goto(apps + '/vote/');
    await phone.locator('#ideas .idea').first().waitFor();
    const href = await phone.getByRole('link', { name: 'Open in Phantom' }).getAttribute('href');
    if (href !== `https://phantom.app/ul/browse/${encodeURIComponent(apps + '/vote/')}?ref=${encodeURIComponent(apps)}`) throw new Error(`Phantom link is ${href}`);
    if (!(await phone.locator('#ideas input').first().isDisabled())) throw new Error('ideas can be picked before signing in');
    if (!base.includes('localhost')) return;   // made-up balances only exist on the dev server

    // A Wallet Standard wallet with a real ed25519 key, as a wallet app's browser has
    await phone.addInitScript(() => {
      const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      const b58 = bytes => {
        let n = 0n, out = '';
        for (const b of bytes) n = n * 256n + BigInt(b);
        for (; n > 0n; n /= 58n) out = ALPHABET[Number(n % 58n)] + out;
        for (const b of bytes) { if (b) break; out = '1' + out; }
        return out;
      };
      const ready = crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign']).then(async k => {
        const address = b58(new Uint8Array(await crypto.subtle.exportKey('raw', k.publicKey)));
        window.__testWallet = { address };
        return { key: k.privateKey, account: { address, chains: ['solana:mainnet'], features: ['solana:signMessage'] } };
      });
      const wallet = {
        version: '1.0.0', name: 'Test Wallet', icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>', chains: ['solana:mainnet'], accounts: [],
        features: {
          'standard:connect': { version: '1.0.0', connect: async () => ({ accounts: [(await ready).account] }) },
          'solana:signMessage': { version: '1.0.0', signMessage: async ({ message }) => {
            window.__testWallet.message = new TextDecoder().decode(message);
            const signature = new Uint8Array(await crypto.subtle.sign('Ed25519', (await ready).key, message));
            return [{ signedMessage: message, signature }];
          } },
        },
      };
      const register = api => api.register(wallet);
      addEventListener('wallet-standard:app-ready', e => register(e.detail));
      dispatchEvent(new CustomEvent('wallet-standard:register-wallet', { detail: register }));
    });
    await phone.goto(apps + '/vote/');
    await phone.getByRole('button', { name: 'Sign in with Test Wallet' }).waitFor();
    const address = await phone.evaluate(async () => { while (!window.__testWallet) await new Promise(r => setTimeout(r, 20)); return window.__testWallet.address; });
    const balance = tokens => phone.evaluate(([address, tokens]) => fetch('/api/vote?op=dev-balance', { method: 'POST', body: JSON.stringify({ address, tokens }) }), [address, tokens]);

    // Too few tokens, no vote
    await balance(99999);
    await phone.getByRole('button', { name: 'Sign in with Test Wallet' }).click();
    await phone.locator('#msg').filter({ hasText: 'holds 99,999 FrunkStore tokens; voting needs 100,000' }).waitFor({ timeout: 5000 });
    const message = await phone.evaluate(() => window.__testWallet.message);
    if (!message.startsWith('127.0.0.1:5174 wants you to sign in with your Solana account:\n' + address)) throw new Error(`signed "${message.slice(0, 80)}"`);

    // With tokens: pick up to three, save, and the counts follow
    await balance(150000);
    await phone.getByRole('button', { name: 'Sign in with Test Wallet' }).click();
    await phone.locator('#who').filter({ hasText: '150,000 FrunkStore' }).waitFor({ timeout: 5000 });
    const boxes = phone.locator('#ideas .idea');
    for (const i of [1, 2, 3, 4]) await boxes.nth(i).click();
    if ((await phone.locator('#ideas input:checked').count()) !== 3) throw new Error('a fourth pick was allowed');
    const picks = await phone.locator('#ideas input:checked').evaluateAll(els => els.map(e => e.value));
    await phone.getByRole('button', { name: 'Save my votes' }).click();
    await phone.locator('#msg').filter({ hasText: 'Votes saved' }).waitFor({ timeout: 5000 });
    const results = await (await fetch(apps + '/api/vote?op=results')).json();
    if (results.wallets < 1 || !picks.every(p => results.ideas[p] >= 1)) throw new Error(`results ${JSON.stringify(results)}`);

    // Coming back keeps the session and the picks; the list is sorted by votes
    await phone.reload();
    await phone.locator('#who').filter({ hasText: 'Signed in as' }).waitFor();
    const kept = await phone.locator('#ideas input:checked').evaluateAll(els => els.map(e => e.value).sort());
    if (kept.join() !== [...picks].sort().join()) throw new Error(`picks after reload: ${kept}`);
    const total = await phone.locator('#total').textContent();
    if (total.startsWith('0 ')) throw new Error(`after reload: "${total}"`);
    const first = await boxes.first().locator('input').getAttribute('value');
    if (!picks.includes(first)) throw new Error(`list not sorted by votes: ${first} first`);

    // Opened from a car's code, the signed-in phone unlocks that car
    const post = async (op, data) => (await fetch(`${apps}/api/vote?op=${op}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json();
    const car = await post('link-open', {});
    await phone.goto(`${apps}/vote/?link=${car.lid}`);
    await phone.locator('#car').filter({ hasText: 'Your car is unlocked' }).waitFor({ timeout: 5000 });
    const { pass } = await post('link-poll', { lid: car.lid, secret: car.secret });
    if (!pass || !(await post('pass', { pass })).ok) throw new Error('the car got no working pass');
    // The wallet apps' links keep the car's code
    if (!(await phone.getByRole('link', { name: 'Open in Phantom', includeHidden: true }).getAttribute('href')).includes(encodeURIComponent(`?link=${car.lid}`))) throw new Error('Phantom link drops the car code');

    // Selling the tokens stops the next vote
    await balance(0);
    await boxes.nth(0).click();
    await phone.getByRole('button', { name: 'Save my votes' }).click();
    await phone.locator('#msg').filter({ hasText: 'holds 0 FrunkStore tokens now' }).waitFor({ timeout: 5000 });

    await phone.getByRole('textbox').fill('A racing game, please');
    await phone.getByRole('button', { name: 'Send suggestion' }).click();
    await phone.locator('#msg').filter({ hasText: 'suggestion was sent' }).waitFor({ timeout: 5000 });
    await phone.screenshot({ path: shots + 'vote.png', fullPage: true });
    console.log(`     ${results.wallets} wallet(s) voted`);
  } finally {
    await phone.close();
  }
});

await check('no console or page errors', async () => {
  // headless Chrome may log a GPU stall warning for readPixels; ignore those
  const real = errors.filter(e => !/GPU stall|swiftshader/i.test(e));
  if (real.length) throw new Error(real.join('\n     '));
});

await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
console.log(`screenshots: ${shots}`);
process.exit(failed ? 1 : 0);
