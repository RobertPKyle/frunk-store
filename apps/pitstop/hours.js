// "Open now?" for the common forms of OpenStreetMap opening_hours:
//   24/7 · 08:00-20:00 · Mo-Fr 08:00-18:00; Sa 09:00-14:00; Su off
//   Mo-Sa 11:00-15:00,17:00-21:00 · Fr-Sa 05:30-02:00 (past midnight)
// Anything else (months, weeks, open ends, comments, "||") gives null, so the
// app shows the hours as written instead of guessing. Holiday rules (PH, SH)
// are skipped.

export const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const DAY = '(?:Mo|Tu|We|Th|Fr|Sa|Su)';
const DAY_LIST = new RegExp(`^(${DAY}(?:-${DAY})?(?:\\s*,\\s*${DAY}(?:-${DAY})?)*)\\s*:?\\s*(.*)$`);
const HOLIDAY = /^(PH|SH)\b/;
const RANGE = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;

function days(list) {
  const out = new Set();
  for (const part of list.split(',')) {
    const [a, b = a] = part.trim().split('-').map(d => DAYS.indexOf(d));
    // Ranges can wrap past Sunday: Fr-Tu
    for (let d = a; ; d = (d + 1) % 7) { out.add(d); if (d === b) break; }
  }
  return [...out];
}

function ranges(text) {
  if (/^(off|closed)$/i.test(text)) return [];
  const out = [];
  for (const part of text.split(',')) {
    const m = part.trim().match(RANGE);
    if (!m) return null;
    const start = +m[1] * 60 + +m[2];
    let end = +m[3] * 60 + +m[4];
    if (start > 1440 || end > 1440 || +m[2] > 59 || +m[4] > 59) return null;
    if (end <= start) end += 1440;   // closes after midnight
    out.push([start, end]);
  }
  return out.length ? out : null;
}

// One list of [open, close] minutes per day, Monday first. A close past
// 1440 runs into the next day.
export function parseHours(text) {
  if (!text) return null;
  text = text.trim();
  if (text === '24/7') return DAYS.map(() => [[0, 1440]]);
  if (/["|]/.test(text)) return null;
  const week = DAYS.map(() => null);
  for (let rule of text.split(';')) {
    rule = rule.trim();
    if (!rule || HOLIDAY.test(rule)) continue;
    const m = rule.match(DAY_LIST);
    const on = m ? days(m[1]) : DAYS.map((_, i) => i);
    const times = ranges(m ? m[2] : rule);
    if (!times) return null;
    for (const d of on) week[d] = times;   // a later rule replaces earlier ones for its days
  }
  // Days no rule mentions are closed
  return week.map(t => t || []);
}

// The week's opening times laid out on one line, so an opening that runs
// through midnight or all week is a single stretch
function stretches(week) {
  const out = [];
  week.forEach((day, d) => day.forEach(([a, b]) => out.push([d * 1440 + a, d * 1440 + b])));
  out.sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const s of out) {
    const last = merged[merged.length - 1];
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
    else merged.push([...s]);
  }
  // Join a stretch that runs past Sunday night onto Monday morning
  const W = 7 * 1440;
  if (merged.length > 1 && merged[merged.length - 1][1] >= W + merged[0][0]) {
    const last = merged.pop();
    merged[0] = [last[0] - W, Math.max(merged[0][1], last[1] - W)];
  }
  return merged;
}

// now = { day: 0-6 (Monday first), min: minutes since midnight }
// -> { open, always } or { open, at: { day, min } } where at is when it
// closes (if open) or next opens (if closed; null if never)
export function openState(week, now) {
  const W = 7 * 1440, t = now.day * 1440 + now.min;
  const list = stretches(week);
  if (!list.length) return { open: false, at: null };
  if (list.length === 1 && list[0][1] - list[0][0] >= W) return { open: true, always: true };
  for (const [a, b] of list) {
    for (const shift of [-W, 0, W]) {
      if (t >= a + shift && t < b + shift) {
        const close = (b + shift) % W;
        return { open: true, at: { day: Math.floor(close / 1440), min: close % 1440 }, in: b + shift - t };
      }
    }
  }
  let next = null;
  for (const [a] of list) {
    const wait = ((a - t) % W + W) % W;
    if (next === null || wait < next) next = wait;
  }
  const at = (t + next) % W;
  return { open: false, at: { day: Math.floor(at / 1440), min: at % 1440 }, in: next };
}
