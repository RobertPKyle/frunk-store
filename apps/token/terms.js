// What a buyer reads before the token screen hands them a way to buy, on
// the car and again on the phone. One list, so both say the same.

export const MINT = '9T1DbbiKfhfubEabDj5SWSMzBuyU4tJHkpSgR51Tpump';

const usd = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// liquidity: the pool's size in US dollars, when known
export function risks(liquidity) {
  return [
    'FrunkStore is a meme token with nothing behind it. Its price swings hard and can fall to zero. Only spend money you can afford to lose.',
    (liquidity > 0 ? `The trading pool is small (about ${usd(liquidity)}), ` : 'The trading pool is small, ') +
      'so even small buys and sells move the price a lot, and you may not be able to sell for what you paid.',
    'frunk.store\'s owner didn\'t create this token but collects its creator rewards: a share of the fee on every trade, including yours. ' +
      'So frunk.store gains when people trade it; keep that in mind.',
    'Holding it gives you no share of frunk.store, its income or its decisions. Holder perks like votes can change or end at any time.',
    'Trades happen in your own wallet app on Solana and can\'t be undone. frunk.store never holds your money, never sees your keys, ' +
      'and will never ask for your recovery phrase or ask you to approve a transaction. If anything does, it isn\'t us.',
    'Copycat tokens use the same name. Before you approve, check that the token address ends in …' + MINT.slice(-8) + '.',
    'None of this is financial, legal or tax advice, or an offer to sell anything. Make sure buying crypto is legal where you live and that you\'re old enough. Any taxes are yours.',
    'Not affiliated with Tesla, pump.fun, Phantom or any exchange. Buy only while parked.',
  ];
}

export function fillRisks(list, liquidity) {
  list.replaceChildren(...risks(liquidity).map(text => Object.assign(document.createElement('li'), { textContent: text })));
}
