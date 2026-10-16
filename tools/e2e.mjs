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
page.on('console', m => {
  if (m.type() !== 'error') return;
  // Pit Stop asks again when OpenStreetMap is busy; the check below fails if it never answers
  if (m.location().url.includes('/api/places') && m.text().includes('status of 503')) return;
  errors.push(`console: ${m.text()}`);
});

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
  await page.screenshot({ path: shots + 'chess.png' });
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

await check('retro console adds a local file and plays a game', async () => {
  await openFromHub(/Retro Console/);
  // A player's own file: use one of the bundled free games as the stand-in
  await appFrame().getByRole('button', { name: 'Add game files' }).click();
  // First time: confirm owning the games; that tap opens the picker
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), appFrame().getByRole('button', { name: 'I own my games' }).click()]);
  await chooser.setFiles(new URL('../apps/retro/games/croom.nes', import.meta.url).pathname);
  await appFrame().locator('#mine .game').filter({ hasText: 'croom' }).waitFor({ timeout: 5000 });
  await appFrame().getByRole('button', { name: 'Remove croom' }).click();
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
  await appFrame().locator('#mine .game').waitFor({ state: 'detached', timeout: 5000 });

  await appFrame().getByRole('button', { name: /Thwaite/ }).click();
  await appFrame().locator('#fps').filter({ hasText: /fps/ }).waitFor({ timeout: 10000 });
  // Start skips the notice, then starts a game; the on-screen button is tapped
  for (let i = 0; i < 2; i++) { await appFrame().locator('.pill[data-b=start]').click(); await page.waitForTimeout(1500); }
  const fps = parseInt(await appFrame().locator('#fps').textContent());
  if (!(fps >= 50)) throw new Error(`running at ${fps} fps`);
  const lit = await page.frames().find(f => f.url().includes('/retro/')).evaluate(() => {
    const d = document.getElementById('screen').getContext('2d').getImageData(0, 0, 256, 240).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) n++;
    return n;
  });
  if (lit < 5000) throw new Error(`screen mostly black (${lit} lit pixels)`);
  console.log(`     ${fps} fps, ${lit} lit pixels`);
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
  await appFrame().getByRole('button', { name: /Attack on Voxelburg/ }).click();
  await appFrame().locator('#fps').filter({ hasText: /fps/ }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(7000);   // logo, then the title menu
  const screen = appFrame().locator('#gbaScreen');
  const menu = await screen.screenshot();
  const fps = parseInt(await appFrame().locator('#fps').textContent());
  if (!(fps >= 50)) throw new Error(`running at ${fps} fps`);
  if (menu.length < 8000) throw new Error(`screen looks empty (${menu.length} byte PNG)`);
  // Down, then A, opens the Controls page
  await frame().evaluate(async () => { await padTap(1, 13); await padTap(1, 1); });
  const controls = await screen.screenshot();
  if (controls.equals(menu)) throw new Error('controller input did nothing');
  // Leaving and coming back picks up on the same page
  await appFrame().getByRole('button', { name: 'Games' }).click();
  await appFrame().getByRole('button', { name: /Attack on Voxelburg/ }).click();
  await page.waitForTimeout(1500);
  if (!(await screen.screenshot()).equals(controls)) throw new Error('did not resume where it left off');
  console.log(`     ${fps} fps`);
  await page.screenshot({ path: shots + 'retro-gba.png' });
});

await check('retro console plays a Game Boy Color game', async () => {
  await openFromHub(/Retro Console/);
  await appFrame().getByRole('button', { name: /Tobu Tobu Girl Deluxe/ }).click();
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

await check('no console or page errors', async () => {
  // headless Chrome may log a GPU stall warning for readPixels; ignore those
  const real = errors.filter(e => !/GPU stall|swiftshader/i.test(e));
  if (real.length) throw new Error(real.join('\n     '));
});

await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
console.log(`screenshots: ${shots}`);
process.exit(failed ? 1 : 0);
