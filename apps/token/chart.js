// The price chart: candles over volume bars on a canvas, with the price
// scale on the right and times along the bottom. Too many candles for their
// width turn into a line. Hours without a trade are flat grey dashes.

export const UP = '#3ddc97', DOWN = '#ff5d73';
const FLAT = '#5d5a72', GRID = 'rgba(190, 180, 255, .09)', LABEL = '#8f8ca6', LAST = '#ecebf5';
const AXIS = 74, BOTTOM = 22, TOP = 8;   // CSS pixels for the price scale, the times and the top gap

// A price with four significant digits: 0.00002449, 1.234, 12.34
export function price(p) {
  if (!(p > 0)) return '0';
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return p.toFixed(Math.min(12, Math.max(2, 3 - Math.floor(Math.log10(p)))));
}

function timeLabel(t, range) {
  const d = new Date(t * 1000);
  if (range === '1h' || range === '6h' || range === '1d') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (range === '1w') return d.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Draws candles into canvas; hover is a candle index to mark, or -1.
// Returns where each candle sits, for finding the one under a finger.
export function draw(canvas, candles, range, hover = -1) {
  const dpr = devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  if (!candles?.length) return null;

  const plotW = w - AXIS, plotH = h - BOTTOM - TOP;
  const volH = plotH * 0.18, priceH = plotH - volH - 6;
  let lo = Infinity, hi = -Infinity, vmax = 0;
  for (const [, , high, low, , v] of candles) { lo = Math.min(lo, low); hi = Math.max(hi, high); vmax = Math.max(vmax, v); }
  if (hi === lo) { hi *= 1.01; lo *= 0.99; }
  const pad = (hi - lo) * 0.08;
  hi += pad; lo = Math.max(0, lo - pad);
  const y = p => TOP + (hi - p) / (hi - lo) * priceH;
  const step = plotW / candles.length;
  const x = i => i * step + step / 2;

  // the price scale: five lines with labels
  g.font = '11px system-ui, sans-serif';
  g.textBaseline = 'middle';
  g.lineWidth = 1;
  for (let k = 0; k <= 4; k++) {
    const p = lo + (hi - lo) * k / 4, yy = Math.round(y(p)) + 0.5;
    g.strokeStyle = GRID;
    g.beginPath(); g.moveTo(0, yy); g.lineTo(plotW, yy); g.stroke();
    g.fillStyle = LABEL;
    g.fillText(price(p), plotW + 6, yy);
  }

  // times: about one label per 110 pixels
  g.textBaseline = 'alphabetic';
  g.textAlign = 'center';
  const every = Math.max(1, Math.round(110 / step));
  for (let i = candles.length - 1 - Math.floor(every / 2); i >= 0; i -= every) {
    const xx = x(i);
    if (xx < 30 || xx > plotW - 30) continue;
    g.fillStyle = LABEL;
    g.fillText(timeLabel(candles[i][0], range), xx, h - 6);
  }
  g.textAlign = 'left';

  // volume
  const volTop = TOP + priceH + 6;
  const bar = Math.max(1, Math.min(14, step * 0.7));
  if (vmax > 0) {
    candles.forEach(([, o, , , c, v], i) => {
      if (!v) return;
      const bh = Math.max(1, v / vmax * volH);
      g.fillStyle = c >= o ? 'rgba(61, 220, 151, .35)' : 'rgba(255, 93, 115, .35)';
      g.fillRect(x(i) - bar / 2, volTop + volH - bh, bar, bh);
    });
  }

  if (step < 3) {
    // a line of closes, filled below
    g.beginPath();
    candles.forEach(([, , , , c], i) => (i ? g.lineTo(x(i), y(c)) : g.moveTo(x(i), y(c))));
    const rising = candles.at(-1)[4] >= candles[0][1];
    g.strokeStyle = rising ? UP : DOWN;
    g.lineWidth = 1.5;
    g.stroke();
    g.lineTo(x(candles.length - 1), TOP + priceH);
    g.lineTo(x(0), TOP + priceH);
    g.fillStyle = rising ? 'rgba(61, 220, 151, .08)' : 'rgba(255, 93, 115, .08)';
    g.fill();
  } else {
    candles.forEach(([, o, high, low, c, v], i) => {
      const xx = Math.round(x(i)) + 0.5;
      if (!v && o === c && high === low) {
        g.fillStyle = FLAT;
        g.fillRect(xx - bar / 2, Math.round(y(c)), bar, 1);
        return;
      }
      const color = c >= o ? UP : DOWN;
      g.strokeStyle = g.fillStyle = color;
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(xx, y(high)); g.lineTo(xx, y(low)); g.stroke();
      const top = y(Math.max(o, c)), bh = Math.max(1, y(Math.min(o, c)) - top);
      g.fillRect(xx - bar / 2, top, bar, bh);
    });
  }

  // the last price, dashed across with its label on the scale
  const last = candles.at(-1)[4], ly = Math.round(y(last)) + 0.5;
  g.setLineDash([3, 3]);
  g.strokeStyle = 'rgba(236, 235, 245, .45)';
  g.beginPath(); g.moveTo(0, ly); g.lineTo(plotW, ly); g.stroke();
  g.setLineDash([]);
  g.fillStyle = LAST;
  g.fillRect(plotW + 2, ly - 9, AXIS - 4, 18);
  g.fillStyle = '#0b0b12';
  g.textBaseline = 'middle';
  g.fillText(price(last), plotW + 6, ly);

  if (hover >= 0 && hover < candles.length) {
    const xx = Math.round(x(hover)) + 0.5;
    g.strokeStyle = 'rgba(236, 235, 245, .5)';
    g.beginPath(); g.moveTo(xx, TOP); g.lineTo(xx, h - BOTTOM); g.stroke();
  }
  return { step, plotW };
}
