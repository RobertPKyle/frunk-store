// Brain Test CPU worker. Runs the kernel until told to stop, posting how
// many units it finished every quarter second. The page starts one worker
// for the one-core test and one per core for the all-cores test.
//
// A unit is a mix of what apps and games do: float math (a Mandelbrot
// patch), integer hashing over an array, making and sorting objects, and
// building and parsing JSON. It takes about 0.2 ms on a fast desktop core.

let checksum = 0;

function unit(seed) {
  let sum = 0;

  // float: a 12x12 patch of the Mandelbrot set, 48 iterations at most
  for (let py = 0; py < 12; py++) {
    for (let px = 0; px < 12; px++) {
      const cx = -0.75 + (px + seed % 7) * 0.01, cy = 0.1 + py * 0.01;
      let x = 0, y = 0, i = 0;
      for (; i < 48 && x * x + y * y < 4; i++) { const t = x * x - y * y + cx; y = 2 * x * y + cy; x = t; }
      sum += i;
    }
  }

  // integers: xorshift fill and a hash over it
  const a = new Int32Array(1024);
  let s = seed | 1;
  for (let i = 0; i < a.length; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; a[i] = s; }
  let h = 0x811c9dc5;
  for (let i = 0; i < a.length; i++) h = Math.imul(h ^ a[i], 16777619);
  sum += h & 0xff;

  // objects: make, sort, look up
  const items = [];
  for (let i = 0; i < 120; i++) items.push({ id: i, key: (a[i] >>> 8) % 1000, name: 'n' + i });
  items.sort((p, q) => p.key - q.key || p.id - q.id);
  const byName = new Map(items.map(o => [o.name, o]));
  sum += byName.get('n' + (seed % 120)).key;

  // strings: JSON round trip
  const text = JSON.stringify(items.slice(0, 30));
  sum += JSON.parse(text).length + text.length;

  return sum;
}

let running = false;
onmessage = ({ data }) => {
  if (data === 'stop') { running = false; return; }
  running = true;
  let units = 0, seed = data.seed, last = performance.now();
  const step = () => {
    // a 50 ms slice between messages, so 'stop' gets through
    const end = performance.now() + 50;
    while (performance.now() < end) { checksum += unit(seed++); units++; }
    const now = performance.now();
    if (now - last >= 250) { postMessage({ units, at: now }); units = 0; last = now; }
    if (running) setTimeout(step, 0);
    else postMessage({ units, at: now, done: true, checksum });
  };
  step();
};
