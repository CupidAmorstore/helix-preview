import { describe, expect, it } from 'vitest';
import { doubleCostSensitivity, drawdownOf, EXPERIMENTAL_POLICY, nextLatch, runExperimentalAccount, snapshotOf, verifyContinuation, verifySnapshot } from '../../bot/experimental';
import { contractFor, ENTRY_SUSPENDED_REASON, initialState, stepBar } from '../../bot/execution';
import { COST_PRESETS } from '../../bot/costs';
import { mulberry32 } from '../../bot/stats';
import type { Candle } from '../../bot/types';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);
const CAP = 1000;
const PRESET = COST_PRESETS.coinbase_experimental_conservative_2026_11;
const bars = (closes: number[]): Candle[] => closes.map((c, i) => {
  const o = i ? closes[i - 1] : c;
  return { t: T0 + i * DAY, o, h: Math.max(o, c), l: Math.min(o, c), c, v: 1e6 };
});
const walk = (n: number, seed: number): Candle[] => {
  const r = mulberry32(seed);
  let px = 100;
  const closes = Array.from({ length: n }, () => (px = px * Math.exp(0.04 * (r() - 0.5))));
  return bars(closes);
};
const run = (candles: Candle[], signal: (i: number, p: 0 | 1) => 0 | 1, extra: Partial<Parameters<typeof runExperimentalAccount>[0]> = {}) =>
  runExperimentalAccount({ candles, signal, cost: PRESET, intervalMs: DAY, startIndex: 0, capitalUsd: CAP, ...extra });

describe('experimental-v1 policy constants', () => {
  it('5% per position, 5% drawdown guard, no leverage, no averaging, one position', () => {
    expect(EXPERIMENTAL_POLICY).toMatchObject({ positionFraction: 0.05, maxDrawdown: 0.05, leverage: 1, averaging: false, maxPositionsPerAccount: 1 });
  });
});

describe('position sizing and leverage', () => {
  it('the first position is 5% of the $1,000 account', () => {
    const r = run(bars(Array(10).fill(100)), (i) => (i >= 1 ? 1 : 0));
    const buy = r.result.ledger.find((e) => e.kind === 'fill' && e.side === 'buy');
    expect(buy && buy.kind === 'fill' && buy.usd).toBeCloseTo(50, 9);
  });
  it('never averages down: a long signal on a flat path produces exactly one entry', () => {
    const r = run(bars(Array(30).fill(100)), () => 1);
    expect(r.result.ledger.filter((e) => e.kind === 'fill' && e.side === 'buy')).toHaveLength(1);
  });
  it('no leverage: no buy ever exceeds 5% of capital on a volatile path', () => {
    const r = run(walk(400, 7), (i) => ((i % 9) < 5 ? 1 : 0));
    const buys = r.result.ledger.filter((e) => e.kind === 'fill' && e.side === 'buy');
    expect(buys.length).toBeGreaterThan(3);
    for (const b of buys) expect(b.kind === 'fill' && b.usd).toBeLessThanOrEqual(CAP * 0.05 + 1e-9);
  });
});

describe('realistic costs', () => {
  it('a flat round trip loses exactly the modelled fee, half-spread and slippage on 5% of capital', () => {
    const side = (PRESET.takerFeeBps + PRESET.halfSpreadBps + PRESET.slippageBps) / 10_000;
    const r = run(bars(Array(12).fill(100)), (i) => (i >= 1 && i < 5 ? 1 : 0));
    expect(r.result.netReturn).toBeCloseTo(0.05 * ((1 - side) / (1 + side) - 1), 9);
    expect(r.result.totalCostUsd).toBeGreaterThan(0);
  });
  it('double-cost sensitivity is reported and is worse than the base case when trades occur', () => {
    const sens = doubleCostSensitivity({ candles: walk(400, 3), signal: (i) => ((i % 11) < 6 ? 1 : 0), cost: PRESET, intervalMs: DAY, startIndex: 0, capitalUsd: CAP });
    expect(sens.doubleCostNetReturn).toBeLessThan(sens.netReturn);
    expect(sens.deltaPctPoints).toBeLessThan(0);
  });
});

describe('drawdown guard', () => {
  it('trips at 5% from peak and never releases automatically', () => {
    const s = initialState(CAP);
    s.peak = 1000; s.cash = 950; s.units = 0;
    expect(drawdownOf(s)).toBeCloseTo(0.05, 12);
    expect(nextLatch(false, s)).toBe(true);
    s.cash = 1000;
    expect(nextLatch(true, s)).toBe(true);
  });
  it('does not trip below 5%', () => {
    const s = initialState(CAP);
    s.peak = 1000; s.cash = 951;
    expect(nextLatch(false, s)).toBe(false);
  });
  it('documents: at 5% per position a 99% crash of the only position stays under the guard', () => {
    const r = run(bars([100, 100, 100, 1, 1, 1, 1]), (i) => (i >= 0 ? 1 : 0));
    expect(r.suspendedAt).toBeNull();
  });
  it('a latched guard blocks new entries but never blocks an exit', () => {
    let guardOpen = true;
    const c = contractFor(PRESET, DAY, { terminal: 'mark', positionFraction: EXPERIMENTAL_POLICY.positionFraction, allowEntry: () => guardOpen });
    const k = bars(Array(8).fill(100));
    const want = [1, 1, 0, 0, 1, 1, 1, 1];
    const s = initialState(CAP);
    for (let i = 0; i < k.length; i++) {
      if (i === 2) guardOpen = false;
      stepBar(s, k[i], c, () => want[i] as 0 | 1, true);
    }
    const fills = s.ledger.filter((e) => e.kind === 'fill');
    expect(fills.filter((e) => e.kind === 'fill' && e.side === 'sell')).toHaveLength(1);
    expect(s.units).toBe(0);
    expect(s.ledger.some((e) => e.kind === 'rejected' && e.reason === ENTRY_SUSPENDED_REASON)).toBe(true);
    expect(fills.filter((e) => e.kind === 'fill' && e.side === 'buy')).toHaveLength(1);
  });
});

describe('persistence and restart recovery', () => {
  const sig = (i: number) => ((i % 23) < 11 ? 1 : 0) as 0 | 1;
  it('a snapshot verifies, and tampering is detected', () => {
    const c = walk(200, 5);
    const snap = snapshotOf(run(c, sig), { registrationId: 'x', registrationHash: 'h', candles: c });
    expect(verifySnapshot(snap)).toBe(true);
    expect(verifySnapshot({ ...snap, netReturn: snap.netReturn + 0.01 })).toBe(false);
  });
  it('restart: recomputing from data extends the persisted snapshot exactly; rewritten history is refused', () => {
    const full = walk(300, 5);
    const snap1 = snapshotOf(run(full.slice(0, 200), sig), { registrationId: 'x', registrationHash: 'h', candles: full.slice(0, 200) });
    const snap2 = snapshotOf(run(full, sig), { registrationId: 'x', registrationHash: 'h', candles: full });
    expect(verifyContinuation(snap1, snap2)).toEqual({ ok: true });
    const rewritten = { ...snap1, ledger: snap1.ledger.map((e, i) => (i === 0 ? { ...e, t: e.t + 1 } : e)) };
    expect(verifyContinuation(rewritten as typeof snap1, snap2).ok).toBe(false);
  });
  it('the same inputs always give the same result (determinism)', () => {
    const c = walk(250, 9);
    expect(run(c, sig).result.netReturn).toBe(run(c, sig).result.netReturn);
  });
});
