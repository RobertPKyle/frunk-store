// The holders' wall: apps in early access for wallets holding FrunkStore
// tokens (the Holders menu, the holders edition of Retro Console,
// Craft 4K, Freedoom, LibreQuake, OpenTTD and OpenArena). An app awaits
// holdersGate() before it starts.
//
// The car has no wallet, so a phone vouches for it (apps/api/vote.js): this
// screen shows a QR code to the vote page, the phone signs in there and
// links the car, and the car gets a 30-day pass, kept in localStorage and
// shared by every app on this origin. With a pass, an app starts at once
// and the pass is checked in the background, at most every 10 minutes: a
// wallet that sold its tokens reloads the app into the locked screen.
// Without a connection the screen stays unlocked.
//
// This gates the pages, not the files: the engines and games are ordinary
// static files, and their source is public.

const PASS = 'holders.pass';
const CHECKED = 'holders.checked';   // sessionStorage: when the pass was last checked
const REASON = 'holders.reason';     // sessionStorage: why the screen just locked
const RECHECK = 10 * 60 * 1000;

const local = {
  get: (store, k) => { try { return store.getItem(k); } catch { return null; } },
  set: (store, k, v) => { try { v === null ? store.removeItem(k) : store.setItem(k, v); } catch {} },
};

async function api(op, data) {
  const res = await fetch(`/api/vote?op=${op}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data || {}), cache: 'no-store',
  });
  return res.json();
}

export const voteLink = () => `${location.origin}/vote/`;

// Draws a QR code of link into el; the code is also the link, so the phone
// page can be tried on a computer (the car's browser blocks new windows)
export async function qr(el, link, size) {
  if (!window.QRCode) {
    await new Promise((resolve, reject) => {
      const s = Object.assign(document.createElement('script'), { src: '/probe/qrcode.min.js', onload: resolve, onerror: reject });
      document.head.append(s);
    });
  }
  const a = Object.assign(document.createElement('a'), { href: link, target: '_blank', rel: 'noopener' });
  el.replaceChildren(a);
  new QRCode(a, { text: link, width: size, height: size, correctLevel: QRCode.CorrectLevel.M });
}

// Keeps a pass this screen just got; the token screen gets one too when a
// holder's wallet connects there
export function savePass(pass) {
  local.set(localStorage, PASS, pass);
  local.set(sessionStorage, CHECKED, String(Date.now()));
}

export const hasPass = () => !!local.get(localStorage, PASS);

// Forgets this screen's pass and shows the locked screen
export function lockHolders() {
  local.set(localStorage, PASS, null);
  local.set(sessionStorage, CHECKED, null);
  location.reload();
}

const STYLE = `
  #holdersLock { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 70px 16px 16px; overflow-y: auto;
    background: #0b0b12; color: #ecebf5; font: 16px/1.4 system-ui, sans-serif; user-select: none; -webkit-user-select: none; }
  #holdersLock .sheet { display: flex; gap: 22px; align-items: center; max-width: 720px; padding: 18px; border-radius: 18px;
    background: #13131d; border: 1px solid rgba(190, 180, 255, .15); }
  #holdersLock .code { flex: none; display: grid; place-items: center; width: 236px; height: 236px; border-radius: 12px; background: #fff; }
  #holdersLock .code a { display: block; }
  #holdersLock .code img, #holdersLock .code canvas { display: block; width: 216px; height: 216px; image-rendering: pixelated; }
  #holdersLock h2 { margin: 0 0 6px; font-size: 19px; }
  #holdersLock p { margin: 0 0 8px; font-size: 14px; color: #9592ab; }
  #holdersLock ol { margin: 0 0 10px; padding-left: 20px; font-size: 15px; color: #c9c6dc; }
  @media (max-width: 640px) { #holdersLock .sheet { flex-direction: column; } }
`;

// Shows the locked screen until a phone links this one; resolves then.
// what names what's behind the wall ("Freedoom"), for the explanation;
// reason, when given, replaces the status line.
function lockScreen(what, reason) {
  return new Promise(resolve => {
    const style = Object.assign(document.createElement('style'), { textContent: STYLE });
    const box = document.createElement('section');
    box.id = 'holdersLock';
    box.setAttribute('aria-labelledby', 'holdersTitle');
    box.innerHTML = `<div class="sheet"><div class="code" aria-hidden="true"></div><div>
      <h2 id="holdersTitle">Early access for FrunkStore holders</h2>
      <p class="what"></p>
      <ol>
        <li>Scan this code with your phone's camera.</li>
        <li>Open the page in your wallet app (Phantom or Solflare) and sign in. That only signs a message: no transaction.</li>
        <li>This screen unlocks for 30 days, as long as the wallet keeps its tokens.</li>
      </ol>
      <p class="status" aria-live="polite">Getting a code…</p></div></div>`;
    document.head.append(style);
    document.body.append(box);
    const status = box.querySelector('.status');
    let min = '100,000';
    const explain = () => { box.querySelector('.what').textContent = `${what}: early access for wallets holding at least ${min} FrunkStore tokens.`; };
    explain();

    let timer = 0;
    async function code() {
      clearInterval(timer);
      const c = await api('link-open').catch(() => null);
      if (!c?.lid) {
        status.textContent = c?.error || 'Unlocking isn\'t available right now. Check the connection; trying again shortly.';
        timer = setTimeout(code, 15000);
        return;
      }
      min = c.min.toLocaleString('en-US');
      explain();
      await qr(box.querySelector('.code'), `${location.origin}/vote/?link=${c.lid}`, 216).catch(() => {});
      status.textContent = reason || 'Waiting for your phone…';
      timer = setInterval(async () => {
        if (document.hidden) return;
        const r = await api('link-poll', { lid: c.lid, secret: c.secret }).catch(() => null);
        if (r?.expired) return code();   // a fresh code
        if (!r?.pass) return;
        clearInterval(timer);
        savePass(r.pass);
        box.remove();
        style.remove();
        resolve();
      }, 2500);
    }
    code();
  });
}

// Resolves once this screen may use the app
export async function holdersGate(what) {
  const pass = local.get(localStorage, PASS);
  if (!pass) {
    // after a reload for a wallet that sold, the locked screen says why
    const why = local.get(sessionStorage, REASON);
    local.set(sessionStorage, REASON, null);
    return lockScreen(what, why || null);
  }
  const last = +local.get(sessionStorage, CHECKED) || 0;
  if (Date.now() - last < RECHECK) return;
  api('pass', { pass }).then(r => {
    if (r.ok) return local.set(sessionStorage, CHECKED, String(Date.now()));
    if (r.ok !== false) return;
    local.set(localStorage, PASS, null);
    if (r.error) local.set(sessionStorage, REASON, `${r.error} Scan to unlock with another wallet.`);
    location.reload();
  }).catch(() => {});
}
