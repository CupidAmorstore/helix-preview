import { describe, expect, it } from 'vitest';
import { createAccount, placeOrder, valueAccount, type Book, type PaperAccount, type Quote } from '../paper/engine';
import { createSerialStore } from '../paper/serialStore';

const FEE = 0.006;
const NOW = 1_700_000_000_000;
// deterministic PRNG
function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
function bookAt(px: number, r: () => number, thin = false): Book {
  const lv = (dir: 1 | -1) => Array.from({ length: 8 }, (_, i) => [px * (1 + dir * (0.0002 + i * 0.004)), (thin ? 0.002 : 0.05) * (1 + r() * 3)] as [number, number]);
  return { ts: NOW, asks: lv(1), bids: lv(-1) };
}
const q = (symbol: string, price: number, book?: Book): Quote => ({ symbol, product: `${symbol}-USD`, price, ts: NOW, book });

/** The ledger identities every account must satisfy at all times. */
function assertInvariants(a: PaperAccount) {
  const filled = a.orders.filter((o) => o.status === 'filled');
  const buys = filled.filter((o) => o.side === 'buy');
  const sells = filled.filter((o) => o.side === 'sell');
  // 1. cash conservation
  const cash = a.startingCash - buys.reduce((s, o) => s + o.cashUsd, 0) + sells.reduce((s, o) => s + o.cashUsd, 0);
  expect(a.cash).toBeCloseTo(cash, 6);
  expect(a.cash).toBeGreaterThanOrEqual(-1e-9);
  // 2. inventory conservation per symbol
  for (const sym of new Set(filled.map((o) => o.symbol))) {
    const held = buys.filter((o) => o.symbol === sym).reduce((s, o) => s + o.qty, 0) - sells.filter((o) => o.symbol === sym).reduce((s, o) => s + o.qty, 0);
    expect(a.positions[sym]?.qty ?? 0).toBeCloseTo(held, 7);
    expect(a.positions[sym]?.qty ?? 0).toBeGreaterThanOrEqual(0);
  }
  // 3. cost-basis identity: open cost + cost released by sells == everything paid for buys
  const realized = sells.reduce((s, o) => s + (o.realizedPnl ?? 0), 0);
  const openCost = Object.values(a.positions).reduce((s, p) => s + p.costUsd, 0);
  const released = sells.reduce((s, o) => s + o.cashUsd, 0) - realized;
  expect(openCost + released).toBeCloseTo(buys.reduce((s, o) => s + o.cashUsd, 0), 6);
  // 4. fee on every fill = 0.60% of gross notional
  for (const o of filled) {
    const gross = o.side === 'buy' ? o.cashUsd : o.cashUsd + o.feeUsd;
    expect(o.feeUsd).toBeCloseTo(gross * FEE, 8);
  }
  // 5. no fill beyond the 2% band
  for (const o of filled) if (o.fillModel === 'book') expect(Math.abs(o.fillPx / o.quotePx - 1)).toBeLessThanOrEqual(0.02 + 1e-12);
}

describe('paper ledger: randomized invariants (300 sequences × 40 orders, synthetic books)', () => {
  it('cash, inventory, cost basis, fees and price band hold after every order', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const r = rng(seed);
      let a = createAccount([20, 100, 1000][seed % 3], NOW);
      const px: Record<string, number> = { BTC: 60000, ETH: 1700, DOGE: 0.12 };
      for (let i = 0; i < 40; i++) {
        const sym = ['BTC', 'ETH', 'DOGE'][Math.floor(r() * 3)];
        px[sym] *= 1 + (r() - 0.5) * 0.04;
        const book = r() < 0.15 ? undefined : bookAt(px[sym], r, r() < 0.2);
        const held = a.positions[sym]?.qty ?? 0;
        const req = r() < 0.55 || held === 0
          ? { clientId: `${seed}-${i}`, side: 'buy' as const, symbol: sym, product: `${sym}-USD`, notionalUsd: Math.round(r() * a.cash * 0.6 * 100) / 100 }
          : { clientId: `${seed}-${i}`, side: 'sell' as const, symbol: sym, product: `${sym}-USD`, qty: r() < 0.3 ? held : held * r() };
        a = placeOrder(a, req, q(sym, px[sym], book), NOW).account;
        assertInvariants(a);
      }
      // final liquidation (cost model, no book): cash == start + realized
      for (const p of Object.values(a.positions)) a = placeOrder(a, { clientId: `liq-${p.symbol}`, side: 'sell', symbol: p.symbol, product: p.product, qty: p.qty }, q(p.symbol, px[p.symbol]), NOW).account;
      assertInvariants(a);
      const dust = Object.values(a.positions);
      // anything left is below the $1 venue minimum (unsellable dust), never a hidden balance
      for (const p of dust) expect(p.qty * px[p.symbol]).toBeLessThan(1.02);
      if (!dust.length) {
        const realized = a.orders.filter((o) => o.status === 'filled').reduce((s, o) => s + (o.realizedPnl ?? 0), 0);
        expect(a.cash).toBeCloseTo(a.startingCash + realized, 6);
      }
    }
  });

  it('is deterministic: the same inputs give the same ledger', () => {
    const run = () => {
      let a = createAccount(500, NOW);
      const r = rng(7);
      for (let i = 0; i < 20; i++) a = placeOrder(a, { clientId: `d${i}`, side: 'buy', symbol: 'ETH', product: 'ETH-USD', notionalUsd: 10 }, q('ETH', 1700 + i, bookAt(1700 + i, r)), NOW).account;
      return JSON.stringify(a);
    };
    expect(run()).toBe(run());
  });
});

describe('paper ledger: edge cases', () => {
  it('future-dated quote is refused', () => {
    const { order } = placeOrder(createAccount(100, NOW), { clientId: 'f', side: 'buy', symbol: 'BTC', product: 'BTC-USD', notionalUsd: 10 }, { ...q('BTC', 60000), ts: NOW + 60_000 }, NOW);
    expect(order.status).toBe('rejected');
    expect(order.reason).toMatch(/future/);
  });
  it('future-dated book is not used (falls back to the cost model)', () => {
    const r = rng(3);
    const { order } = placeOrder(createAccount(100, NOW), { clientId: 'fb', side: 'buy', symbol: 'BTC', product: 'BTC-USD', notionalUsd: 10 }, q('BTC', 60000, { ...bookAt(60000, r), ts: NOW + 60_000 }), NOW);
    expect(order.fillModel).toBe('model');
  });
  it('selling the whole position leaves no dust position', () => {
    let a = createAccount(100, NOW);
    a = placeOrder(a, { clientId: 'b', side: 'buy', symbol: 'ETH', product: 'ETH-USD', notionalUsd: 33.33 }, q('ETH', 1733.37), NOW).account;
    a = placeOrder(a, { clientId: 's', side: 'sell', symbol: 'ETH', product: 'ETH-USD', qty: a.positions.ETH.qty }, q('ETH', 1801.01), NOW).account;
    expect(a.positions.ETH).toBeUndefined();
    assertInvariants(a);
  });
  it('rejected and duplicate orders never move money', () => {
    let a = createAccount(50, NOW);
    a = placeOrder(a, { clientId: 'x', side: 'buy', symbol: 'BTC', product: 'BTC-USD', notionalUsd: 10 }, q('BTC', 60000), NOW).account;
    const before = a.cash;
    const dup = placeOrder(a, { clientId: 'x', side: 'buy', symbol: 'BTC', product: 'BTC-USD', notionalUsd: 10 }, q('BTC', 60000), NOW);
    expect(dup.duplicate).toBe(true);
    expect(dup.account.cash).toBe(before);
    const rej = placeOrder(a, { clientId: 'y', side: 'buy', symbol: 'BTC', product: 'BTC-USD', notionalUsd: 0.5 }, q('BTC', 60000), NOW);
    expect(rej.order.status).toBe('rejected');
    expect(rej.account.cash).toBe(before);
    assertInvariants(rej.account);
  });
  it('unrealized P&L = market value − open cost', () => {
    let a = createAccount(100, NOW);
    a = placeOrder(a, { clientId: 'u', side: 'buy', symbol: 'BTC', product: 'BTC-USD', notionalUsd: 40 }, q('BTC', 60000), NOW).account;
    const v = valueAccount(a, { BTC: 66000 });
    expect(v.unrealized).toBeCloseTo(a.positions.BTC.qty * 66000 - a.positions.BTC.costUsd, 9);
    expect(v.equity).toBeCloseTo(a.cash + a.positions.BTC.qty * 66000, 9);
  });
});

describe('paper ledger: concurrency (REGRESSION: lost update between overlapping orders)', () => {
  it('two overlapping orders and a valuation snapshot all land, in order, with slow saves', async () => {
    const saved: PaperAccount[] = [];
    const store = createSerialStore<PaperAccount | null>(createAccount(1000, NOW), async (s) => { await new Promise((r) => setTimeout(r, 5)); saved.push(s!); });
    const buy = (id: string, usd: number) => store.mutate((a) => { const r = placeOrder(a!, { clientId: id, side: 'buy', symbol: 'BTC', product: 'BTC-USD', notionalUsd: usd }, q('BTC', 60000), NOW); return { next: r.account, result: r.order }; });
    const snapshot = store.mutate((a) => ({ next: { ...a!, equity: [...a!.equity, [NOW + 1, 999] as [number, number]] }, result: 'snap' }));
    const [o1, , o2] = await Promise.all([buy('a', 100), snapshot, buy('b', 200)]);
    expect(o1?.status).toBe('filled');
    expect(o2?.status).toBe('filled');
    const final = store.get()!;
    expect(final.orders.map((o) => o.clientId)).toEqual(['a', 'b']);
    expect(final.cash).toBeCloseTo(700, 9);
    expect(final.equity.some(([, e]) => e === 999)).toBe(true);
    expect(saved[saved.length - 1]).toBe(final); // last save is the latest state
    assertInvariants(final);
  });
  it('a failing save rolls back (memory never diverges from disk) and does not block later mutations', async () => {
    let fail = true;
    const store = createSerialStore<number>(0, async () => { if (fail) { fail = false; throw new Error('disk'); } });
    await expect(store.mutate((s) => ({ next: s + 1, result: 1 }))).rejects.toThrow('disk');
    expect(store.get()).toBe(0);
    await expect(store.mutate((s) => ({ next: s + 1, result: 2 }))).resolves.toBe(2);
    expect(store.get()).toBe(1);
  });
});
