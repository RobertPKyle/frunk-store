// End-to-end check of the hub and every sample app, at the Model 3 browser
// viewport. Uses the system Chrome through playwright-core.
//
//   node tools/e2e.mjs                       # against `npm run dev`
//   node tools/e2e.mjs https://frunk.store   # against production
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';

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
page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

let failed = 0;
async function check(name, fn) {
  try { await fn(); console.log(`ok   ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.message.split('\n')[0]}`); }
}
const appFrame = () => page.frameLocator('#frame');
async function openFromHub(name) {
  await page.goto(base + '/');
  await page.getByRole('button', { name }).click();
  await page.waitForSelector('#loading', { state: 'hidden' });
}

await check('hub lists every catalog app', async () => {
  await page.goto(base + '/');
  await page.waitForSelector('.card');
  const expected = (await (await fetch(base + '/catalog.json')).json()).apps.length;
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

await check('no console or page errors', async () => {
  // headless Chrome may log a GPU stall warning for readPixels; ignore those
  const real = errors.filter(e => !/GPU stall|swiftshader/i.test(e));
  if (real.length) throw new Error(real.join('\n     '));
});

await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
console.log(`screenshots: ${shots}`);
process.exit(failed ? 1 : 0);
