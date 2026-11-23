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
