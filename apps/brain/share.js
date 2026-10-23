// Brain Test share page, opened on a phone from the car's QR code (or on
// the screen that ran the test). Draws a score card from the stored result
// and offers it to the phone's share sheet, to save, or with a post on X.
// The card is drawn here from numbers the server kept, so the server never
// stores or serves pictures.

import { setup } from './gpu.js';

const LINK = 'https://frunk.store/app/brain';
const W = 1200, H = 675;
const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString('en-US');

async function load() {
  const id = location.hash.slice(1);
  if (!/^[A-Za-z0-9_-]{12}$/.test(id)) throw new Error('This link is damaged. Scan the code on the car again.');
  const res = await fetch(`/api/brain?op=result&id=${id}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const who = r => r.car ? `Tesla ${r.car}` : { apple: 'iPhone', android: 'Android phone' }[r.group] || 'computer';
const isTesla = r => r.group.startsWith('mcu');
const rankLine = r => r.n < 2 ? `First score for ${r.groupName}`
  : r.percentile > 0 ? `Faster than ${r.percentile}% of ${r.groupName}`
  : `Slowest of the ${r.groupName} so far`;

// The ray-marched brain from the test, as card art for the right of the
// card: drawn at twice the size and scaled down, for smooth edges. Null
// without WebGL2.
const ART_W = 640, ART_H = H;
function brainArt() {
  try {
    const canvas = document.createElement('canvas');
    const drawer = setup(canvas, ART_W * 2, ART_H * 2);
    if (!drawer) return null;
    drawer.draw(40);   // a few frames in, for a nicer angle
    const copy = Object.assign(document.createElement('canvas'), { width: ART_W, height: ART_H });
    copy.getContext('2d').drawImage(canvas, 0, 0, ART_W, ART_H);
    return copy;
  } catch { return null; }
}

async function draw(r) {
  try {
    const font = new FontFace('Unbounded', 'url(unbounded.woff2)', { weight: '200 900' });
    document.fonts.add(await font.load());
  } catch {}
  const ctx = $('card').getContext('2d');
  const sans = 'Unbounded, system-ui, sans-serif';
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0a0b16');
  bg.addColorStop(1, '#1a0d1f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // the brain on the right, faded into the background on its left edge
  const art = brainArt();
  if (art) {
    const x = W - ART_W + 40;
    ctx.drawImage(art, x, 0);
    const fade = ctx.createLinearGradient(x, 0, x + 160, 0);
    fade.addColorStop(0, '#0d0b18');
    fade.addColorStop(1, 'rgba(13, 11, 24, 0)');
    ctx.fillStyle = fade;
    ctx.fillRect(x, 0, 160, H);
  }

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f2729e';
  ctx.font = `700 30px ${sans}`;
  ctx.fillText('CAN YOUR TESLA BRAIN?', 64, 92);

  ctx.fillStyle = '#eceaf6';
  ctx.font = `600 34px ${sans}`;
  ctx.fillText(`My ${who(r)} scored`, 64, 178);

  ctx.font = `800 128px ${sans}`;
  ctx.fillStyle = '#f2729e';
  ctx.shadowColor = 'rgba(242, 114, 158, .45)';
  ctx.shadowBlur = 40;
  ctx.fillText(fmt(r.points.total), 56, 318);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#b9b6cf';
  ctx.font = `500 28px ${sans}`;
  ctx.fillText('brain points', 64, 378);

  ctx.fillStyle = '#eceaf6';
  ctx.font = `600 30px ${sans}`;
  ctx.fillText(rankLine(r), 64, 448);

  const parts = [['One core', r.points.single, '#ffd36e'], ['Every core', r.points.multi, '#8fe0a0'], ['Graphics', r.points.gpu, '#4fd1e8']];
  parts.forEach(([name, value, color], i) => {
    const x = 64 + i * 230, y = 488;
    ctx.fillStyle = 'rgba(22, 26, 39, .85)';
    ctx.beginPath();
    ctx.roundRect(x, y, 210, 92, 16);
    ctx.fill();
    ctx.fillStyle = '#918fab';
    ctx.font = `500 20px ${sans}`;
    ctx.fillText(name, x + 18, y + 34);
    ctx.fillStyle = color;
    ctx.font = `700 34px ${sans}`;
    ctx.fillText(fmt(value), x + 18, y + 76);
  });

  ctx.fillStyle = '#918fab';
  ctx.font = `500 20px ${sans}`;
  ctx.fillText(`${r.chip} · ${r.threads} threads`, 64, 630);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#eceaf6';
  ctx.font = `700 26px ${sans}`;
  ctx.fillText('frunk.store', W - 48, 630);
  ctx.textAlign = 'left';
}

function postText(r) {
  const lead = `My ${who(r)}'s brain scored ${fmt(r.points.total)} points 🧠`;
  const rank = r.n > 1 && r.percentile > 0 ? ` Faster than ${r.percentile}% of ${r.groupName}.` : '';
  const ask = isTesla(r) ? 'Can your Tesla brain?' : 'Can your Tesla beat it?';
  return `${lead}${rank} ${ask}`;
}

async function main() {
  let r;
  try { r = await load(); } catch (e) { $('msg').textContent = e.message; return; }
  await draw(r);
  const blob = await new Promise(res => $('card').toBlob(res, 'image/png'));
  const file = new File([blob], 'brain-score.png', { type: 'image/png' });
  const text = postText(r);

  $('save').href = URL.createObjectURL(blob);
  $('post').href = `https://x.com/intent/post?${new URLSearchParams({ text, url: LINK })}`;
  if (navigator.canShare?.({ files: [file] })) {
    $('shareBtn').hidden = false;
    $('shareBtn').addEventListener('click', async () => {
      try { await navigator.share({ files: [file], text: `${text} ${LINK}` }); }
      catch (e) { if (e.name !== 'AbortError') $('msg').textContent = `Couldn't share: ${e.message}`; }
    });
  }
  $('actions').hidden = false;
}

main();
