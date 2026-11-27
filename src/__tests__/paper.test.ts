import { describe, expect, it } from 'vitest';
import { createAccount, placeOrder, valueAccount, setHalted, recordEquity, previewBuy, PAPER_COST } from '../paper/engine';
import { sideCostFrac } from '../bot/costs';

const T = 1_800_000_000_000;
const q = (price: number, ts = T) => ({ symbol: 'BTC', product: 'BTC-USD', price, ts });
const buy = (clientId: string, notionalUsd: number) => ({ clientId, side: 'buy' as const, symbol: 'BTC', product: 'BTC-USD', notionalUsd });
const sell = (clientId: string, qty: number) => ({ clientId, side: 'sell' as const, symbol: 'BTC', product: 'BTC-USD', qty });
const fee = PAPER_COST.takerFeeBps / 10_000;
const impact = sideCostFrac(PAPER_COST) - fee;

describe('paper account', () => {
  it('starts with cash only and a first equity point', () => {
    const a = createAccount(1000, T);
    expect(valueAccount(a, {})).toMatchObject({ equity: 1000, cash: 1000, totalPnl: 0, returnPct: 0 });
    expect(a.equity).toEqual([[T, 1000]]);
  });

  it('buy: fee and spread are charged, cash and cost basis move by the full amount', () => {
    const { account, order } = placeOrder(createAccount(1000, T), buy('a', 400), q(50_000), T);
    expect(order.status).toBe('filled');
    expect(order.feeUsd).toBeCloseTo(400 * fee, 10);
    expect(order.fillPx).toBeCloseTo(50_000 * (1 + impact), 6);
    expect(order.qty).toBeCloseTo((400 - 400 * fee) / (50_000 * (1 + impact)), 8);
    expect(account.cash).toBeCloseTo(600, 8);
    expect(account.positions.BTC.costUsd).toBe(400);
    // immediately after buying, unrealized P&L equals minus the costs paid
    const v = valueAccount(account, { BTC: 50_000 });
    // quantities are rounded to 1e-8 (one satoshi), so values match to within $0.001 at $50k
    expect(v.unrealized).toBeCloseTo(-(order.feeUsd + order.slippageUsd), 3);
  });

  it('round trip at an unchanged price loses exactly the modelled costs', () => {
    let a = placeOrder(createAccount(1000, T), buy('a', 400), q(50_000), T).account;
    const qty = a.positions.BTC.qty;
    const r = placeOrder(a, sell('b', qty), q(50_000), T);
    a = r.account;
    expect(a.positions.BTC).toBeUndefined();
    const expectedNet = qty * 50_000 * (1 - impact) * (1 - fee);
    expect(a.cash).toBeCloseTo(600 + expectedNet, 6);
    expect(r.order.realizedPnl).toBeCloseTo(expectedNet - 400, 6);
    expect(valueAccount(a, {}).realized).toBeCloseTo(expectedNet - 400, 6);
    expect(valueAccount(a, {}).equity).toBeLessThan(1000);
  });

  it('partial sell uses average cost and keeps the rest of the basis', () => {
    let a = placeOrder(createAccount(1000, T), buy('a', 200), q(50_000), T).account;
    a = placeOrder(a, buy('b', 200), q(40_000), T).account;
    const held = a.positions.BTC;
    const r = placeOrder(a, sell('c', held.qty / 2), q(45_000), T);
    expect(r.account.positions.BTC.costUsd).toBeCloseTo(200, 6);
    expect(r.order.realizedPnl).toBeCloseTo(r.order.cashUsd - 200, 6);
  });

  it('rejects with clear reasons and records them', () => {
    const a = createAccount(100, T);
    expect(placeOrder(a, buy('x', 0.5), q(50_000), T).order.reason).toMatch(/Minimum order is \$1/);
    expect(placeOrder(a, buy('x', 150), q(50_000), T).order.reason).toBe('Not enough paper cash');
    expect(placeOrder(a, buy('x', 60), q(50_000), T).order.reason).toMatch(/at most 50%/);
    expect(placeOrder(a, sell('x', 1), q(50_000), T).order.reason).toMatch(/don't hold any BTC/);
    expect(placeOrder(a, buy('x', 10), q(50_000, T - 120_000), T).order.reason).toMatch(/out of date/);
    const r = placeOrder(a, buy('x', 0.5), q(50_000), T);
    expect(r.account.orders).toHaveLength(1);
    expect(r.account.cash).toBe(100);
  });

  it('ignores a duplicate submit (same ticket id)', () => {
    const r1 = placeOrder(createAccount(1000, T), buy('same', 100), q(50_000), T);
    const r2 = placeOrder(r1.account, buy('same', 100), q(50_000), T + 1000);
    expect(r2.duplicate).toBe(true);
    expect(r2.account).toBe(r1.account);
    expect(r2.account.cash).toBeCloseTo(900, 8);
  });

  it('pause blocks new orders until resumed', () => {
    const a = setHalted(createAccount(1000, T), true);
    expect(placeOrder(a, buy('p', 10), q(50_000), T).order.reason).toMatch(/paused/);
    expect(placeOrder(setHalted(a, false), buy('p', 10), q(50_000), T).order.status).toBe('filled');
  });

  it('$20 account can trade the $1 minimum and nothing breaks', () => {
    const r = placeOrder(createAccount(20, T), buy('s', 5), q(60_000), T);
    expect(r.order.status).toBe('filled');
    expect(valueAccount(r.account, { BTC: 60_000 }).equity).toBeLessThan(20);
  });

  it('equity points are recorded at most hourly', () => {
    let a = createAccount(1000, T);
    a = recordEquity(a, 1001, T + 1000);
    expect(a.equity).toHaveLength(1);
    a = recordEquity(a, 1002, T + 3_600_000);
    expect(a.equity).toHaveLength(2);
  });

  it('preview matches the actual fill', () => {
    const p = previewBuy(250, 50_000);
    const r = placeOrder(createAccount(1000, T), buy('v', 250), q(50_000), T);
    expect(r.order.qty).toBeCloseTo(p.qty, 8);
    expect(r.order.feeUsd).toBeCloseTo(p.fee, 10);
  });
});

describe('order-book fills (liquidity model)', async () => {
  const { createAccount, placeOrder, walkBook, MAX_BOOK_BAND } = await import('../paper/engine');
  const now = 1_700_000_000_000;
  const book = { ts: now, bids: [[99.9, 1], [99.5, 2], [97, 100]] as [number, number][], asks: [[100.1, 1], [100.5, 2], [103, 100]] as [number, number][] };
  const q = { symbol: 'BTC', product: 'BTC-USD', price: 100, ts: now, book };

  it('walks levels to a volume-weighted price', () => {
    const w = walkBook(book.asks, 100, 'buy', 150);
    expect(w.complete).toBe(true);
    expect(w.vwap).toBeCloseTo(150 / (1 + 49.9 / 100.5), 6);
  });

  it('never fills beyond the price band: a large buy is partly filled and only charged for what filled', () => {
    const acc = createAccount(1000, now);
    const { account, order } = placeOrder(acc, { clientId: 'b1', side: 'buy', symbol: 'BTC', product: 'BTC-USD', notionalUsd: 500 }, q, now);
    const depth = 100.1 * 1 + 100.5 * 2; // levels within 2%
    expect(order.status).toBe('filled');
    expect(order.partial).toBe(true);
    expect(order.fillModel).toBe('book');
    expect(order.qty).toBeCloseTo(3, 8);
    expect(order.cashUsd).toBeCloseTo(depth / (1 - 0.006), 6);
    expect(account.cash).toBeCloseTo(1000 - order.cashUsd, 6);
    expect(order.fillPx).toBeLessThanOrEqual(100 * (1 + MAX_BOOK_BAND));
  });

  it('a sell into thin bids sells only what the band allows and keeps the rest', () => {
    let acc = createAccount(1000, now);
    acc = placeOrder(acc, { clientId: 'b2', side: 'buy', symbol: 'BTC', product: 'BTC-USD', notionalUsd: 200 }, { ...q, book: undefined }, now).account;
    const held = acc.positions.BTC.qty;
    const thin = { ...q, book: { ...book, bids: [[99.9, 0.5], [90, 100]] as [number, number][] } };
    const { account, order } = placeOrder(acc, { clientId: 's1', side: 'sell', symbol: 'BTC', product: 'BTC-USD', qty: held }, thin, now);
    expect(order.partial).toBe(true);
    expect(order.qty).toBeCloseTo(0.5, 8);
    expect(account.positions.BTC.qty).toBeCloseTo(held - 0.5, 8);
  });

  it('no liquidity within the band → refused with a reason, nothing changes', () => {
    const acc = createAccount(1000, now);
    const empty = { ...q, book: { ...book, asks: [[110, 5]] as [number, number][] } };
    const { account, order } = placeOrder(acc, { clientId: 'b3', side: 'buy', symbol: 'BTC', product: 'BTC-USD', notionalUsd: 50 }, empty, now);
    expect(order.status).toBe('rejected');
    expect(account.cash).toBe(1000);
  });

  it('stale book falls back to the cost model and says so', () => {
    const acc = createAccount(1000, now);
    const old = { ...q, book: { ...book, ts: now - 120_000 } };
    const { order } = placeOrder(acc, { clientId: 'b4', side: 'buy', symbol: 'BTC', product: 'BTC-USD', notionalUsd: 50 }, old, now);
    expect(order.fillModel).toBe('model');
    expect(order.partial).toBeUndefined();
  });
});
