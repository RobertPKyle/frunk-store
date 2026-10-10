// Exports square profile-picture PNGs of the Open Lid mark. The mark is kept
// inside the center circle so platforms that crop avatars round (X, YouTube,
// Reddit, TikTok, Facebook) don't clip it.
//
//   node tools/export-profile.mjs
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';

const out = new URL('../hub/brand/profile/', import.meta.url).pathname;
const SIZES = [1024, 800, 400];
const VARIANTS = {
  dark:  { bg: '#0b0d10', ink: '#eef1f5', tiles: '#ffb547' },
  amber: { bg: '#ffb547', ink: '#111418', tiles: '#fff6e5' },
  light: { bg: '#f3efe6', ink: '#111418', tiles: '#d9822b' },
};

// Mark spans x 14..82, y ~13.7..80 in its 96-unit box; scale it to ~51% of
// the canvas and center it.
const S = 0.72, TX = 48 - 48 * S, TY = 48 - 46.85 * S;

function svg({ bg, ink, tiles }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
<rect width="96" height="96" fill="${bg}"/>
<g transform="translate(${TX.toFixed(2)} ${TY.toFixed(2)}) scale(${S})">
<rect x="34" y="42" width="13" height="13" rx="3.5" fill="${tiles}"/>
<rect x="48" y="34" width="13" height="13" rx="3.5" fill="${tiles}"/>
<rect x="62" y="41" width="13" height="13" rx="3.5" fill="${tiles}"/>
<path d="M14 54H82V68a12 12 0 0 1-12 12H26a12 12 0 0 1-12-12Z" fill="${ink}"/>
<rect x="14" y="44" width="64" height="7" rx="3.5" fill="${ink}" transform="rotate(-34 17.5 47.5)"/>
</g>
</svg>`;
}

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
for (const [name, colors] of Object.entries(VARIANTS)) {
  const source = svg(colors);
  writeFileSync(`${out}frunk-profile-${name}.svg`, source + '\n');
  for (const size of SIZES) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${source}`);
    await page.screenshot({ path: `${out}frunk-profile-${name}-${size}.png` });
    await page.close();
  }
  console.log(`${name}: svg + ${SIZES.join('/')} png`);
}
await browser.close();
