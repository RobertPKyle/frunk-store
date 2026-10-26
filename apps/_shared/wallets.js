// Solana wallets on a phone page, for signing a sign-in message (the vote,
// the token screen's wallet connection). Never for transactions.
//
// Wallets are found through the Wallet Standard, which Phantom, Solflare,
// Backpack and others use, both as browser extensions and inside their
// apps' own browsers. A phone's ordinary browser has none, so pages offer to
// open themselves in a wallet app instead (walletLinks).

// Calls onChange(list) now and whenever a wallet appears. Each item is
// { name, signer }; name is null for an older wallet that only puts itself
// on window. A signer's connect() gives the address, sign(text) the
// signature's bytes.
export function findWallets(onChange) {
  const wallets = [];
  const show = () => {
    const list = wallets.map(w => ({ name: w.name, signer: standardSigner(w) }));
    if (!list.length && legacy()) list.push({ name: null, signer: legacySigner(legacy()) });
    onChange(list);
  };
  const registry = {
    register(...found) {
      for (const w of found) {
        if (w.features['solana:signMessage'] && w.features['standard:connect'] && w.chains.some(c => c.startsWith('solana:')) && !wallets.includes(w)) wallets.push(w);
      }
      show();
      return () => {};
    },
  };
  addEventListener('wallet-standard:register-wallet', e => { try { e.detail(registry); } catch {} });
  dispatchEvent(new CustomEvent('wallet-standard:app-ready', { detail: registry }));
  show();
}

// Older wallets only put themselves on window
function legacy() {
  const p = window.phantom?.solana || window.solflare || window.solana;
  return p && p.signMessage && p.connect ? p : null;
}

function standardSigner(w) {
  let account;
  return {
    async connect() {
      ({ accounts: [account] } = await w.features['standard:connect'].connect());
      if (!account) throw new Error('The wallet didn\'t share an account.');
      return account.address;
    },
    async sign(text) {
      const [out] = await w.features['solana:signMessage'].signMessage({ account, message: new TextEncoder().encode(text) });
      return out.signature;
    },
  };
}

function legacySigner(p) {
  return {
    async connect() { return (await p.connect()).publicKey?.toString() || p.publicKey.toString(); },
    async sign(text) { return (await p.signMessage(new TextEncoder().encode(text), 'utf8')).signature; },
  };
}

// Links that open this page inside a wallet app's own browser
export function walletLinks() {
  const here = encodeURIComponent(location.origin + location.pathname + location.search);
  const origin = encodeURIComponent(location.origin);
  return {
    phantom: `https://phantom.app/ul/browse/${here}?ref=${origin}`,
    solflare: `https://solflare.com/ul/v1/browse/${here}?ref=${origin}`,
  };
}

// A wallet's "rejected" errors are the person saying no
export const cancelled = e => /reject|denied|cancel/i.test(e.message);

export const base64 = bytes => btoa(String.fromCharCode(...bytes));
export const short = a => `${a.slice(0, 4)}…${a.slice(-4)}`;
