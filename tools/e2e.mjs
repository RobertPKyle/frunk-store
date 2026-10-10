// End-to-end check of the hub and every sample app, at the Model 3 browser
// viewport. Uses the system Chrome through playwright-core.
//
//   node tools/e2e.mjs                       # against `npm run dev`
//   node tools/e2e.mjs https://frunk.store   # against production
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:5173';
const shots = new URL('../.e2e/', import.meta.url).pathname;
mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 773, height: 601 }, deviceScaleFactor: 1.53, hasTouch: true });

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

await check('hub lists 3 apps', async () => {
  await page.goto(base + '/');
  await page.waitForSelector('.card');
  const n = await page.locator('.card').count();
  if (n !== 3) throw new Error(`expected 3 cards, got ${n}`);
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
  if (new URL(page.url()).search) throw new Error(`URL still has query: ${page.url()}`);
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

await check('probe deep link + isolation inside frame', async () => {
  await page.goto(base + '/?app=probe');
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

await check('no console or page errors', async () => {
  // headless Chrome may log a GPU stall warning for readPixels; ignore those
  const real = errors.filter(e => !/GPU stall|swiftshader/i.test(e));
  if (real.length) throw new Error(real.join('\n     '));
});

await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
console.log(`screenshots: ${shots}`);
process.exit(failed ? 1 : 0);
