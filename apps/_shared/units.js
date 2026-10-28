// Miles or kilometres for distances, one choice for every app that shows
// them (Pit Stop, What's Around Me, Sky Events). Until someone picks, it
// follows the browser's language: miles in the US and the UK.

const KEY = 'units.distance';

export function useMiles() {
  try {
    const v = localStorage.getItem(KEY);
    if (v) return v === 'mi';
  } catch {}
  return /-(US|GB)$/.test(navigator.language);
}

export function setMiles(on) {
  try { localStorage.setItem(KEY, on ? 'mi' : 'km'); } catch {}
}
