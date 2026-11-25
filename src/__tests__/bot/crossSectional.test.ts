import { describe, expect, it } from 'vitest';
import { evaluateCrossSectional, simulateXs } from '../../bot/crossSectional';
import { COST_PRESETS } from '../../bot/costs';
import type { Candle } from '../../bot/types';
import { randomWalk } from './helpers';

const DAY = 86_400_000;
const daily = (c: Candle[]) => c.map((k, i) => ({ ...k, t: Date.UTC(2020, 0, 1) + i * DAY }));
const LOW = { ...COST_PRESETS.coinbase_taker, takerFeeBps: 1, halfSpreadBps: 0, slippageBps: 0 };

describe('cross-sectional momentum', () => {
  it('no look-ahead: changing prices after the window does not change the window result', () => {
    const u = [1, 2, 3, 4].map((s) => ({ symbol: `M${s}`, candles: daily(randomWalk(900, s, 0.03)) }));
    const to = u[0].candles[600].t;
    const a = simulateXs(u, { lookback: 14, topK: 2, rebalance: 7 }, u[0].candles[100].t, to, COST_PRESETS.coinbase_taker);
    const altered = u.map((s) => ({ ...s, candles: s.candles.map((k, i) => (i > 600 ? { ...k, o: k.o * 5, c: k.c * 5, h: k.h * 5, l: k.l * 5 } : k)) }));
    const b = simulateXs(altered, { lookback: 14, topK: 2, rebalance: 7 }, u[0].candles[100].t, to, COST_PRESETS.coinbase_taker);
    expect(b.netReturn).toBeCloseTo(a.netReturn, 12);
  });

  it('nothing qualifies on a universe of random walks', () => {
    for (const seed of [41, 51, 61]) {
      const u = [0, 1, 2, 3, 4, 5].map((k) => ({ symbol: `R${k}`, candles: daily(randomWalk(1500, seed + k, 0.03)) }));
      expect(evaluateCrossSectional(u, COST_PRESETS.coinbase_taker, DAY, 3).status).toBe('rejected');
    }
  });

  it('a persistent relative-strength edge can qualify (power check)', () => {
    // one coin drifts up strongly, the rest are noise: a top-1 momentum rule should find it
    // gates-v3 (monthly inference, mandatory walk-forward) needs a cleaner edge than v2: at 2% daily noise this
    // fixture's test drawdown is 30% and the monthly t bound is <= 0, so it is rejected (as it should be).
    const u = [0, 1, 2, 3].map((k) => ({ symbol: `P${k}`, candles: daily(randomWalk(1500, 70 + k, 0.015, k === 0 ? 0.004 : 0)) }));
    const r = evaluateCrossSectional(u, LOW, DAY, 1);
    expect(r.validation!.netReturn).toBeGreaterThan(0);
    expect(r.status).toBe('qualified_paper_strategy');
  });
});

describe('cross-sectional portfolio accounting (hand-calculated)', () => {
  // 2 coins, 6 days. lookback 1, top-1, rebalance every 2 days, 1% cost per side.
  // Day:        0     1     2     3     4     5
  // A open/close  100  100/110 ...  — built so the picks are unambiguous.
  const day = (i: number) => Date.UTC(2024, 0, 1) + i * 86_400_000;
  const mk = (rows: [number, number][]) => rows.map(([o, c], i) => ({ t: day(i), o, h: Math.max(o, c), l: Math.min(o, c), c, v: 1 }));
  const A = mk([[100, 100], [100, 110], [110, 110], [110, 100], [100, 100], [120, 120]]);
  const B = mk([[50, 50], [50, 50], [50, 50], [50, 60], [60, 60], [66, 66]]);
  const cost = { ...COST_PRESETS.coinbase_taker, takerFeeBps: 100, halfSpreadBps: 0, slippageBps: 0 };
  it('matches the hand calculation', () => {
    const w = simulateXs([{ symbol: 'A', candles: A }, { symbol: 'B', candles: B }], { lookback: 1, topK: 1, rebalance: 2 }, day(1), day(6), cost);
    // decide close d1: A +10%, B 0% → buy A at open d2 (110): 1*(0.99)/110 = 0.009 A
    // decide close d3: A −9.1%, B +20% → sell A at open d4 (100): 0.9*0.99 = 0.891 cash; buy B at open d4 (60): 0.891*0.99/60 = 0.0147015
    // window ends: liquidate at open d5 (66): 0.0147015*66*0.99 = 0.96058
    expect(w.netReturn).toBeCloseTo(0.0147015 * 66 * 0.99 - 1, 6);
    expect(w.trades).toBe(2);
    // gross (no cost): 1/110*100 = 0.90909 → /60*66 = 1.0
    expect(w.grossReturn).toBeCloseTo((100 / 110) * (66 / 60) - 1, 9);
    // period returns: execution d2 → d4 (value at d4 open before trading = 0.9) and d4 → final liquidation
    expect(w.periodReturns.map((x) => x.netRet)[0]).toBeCloseTo(0.009 * 100 / 1 - 1, 9); // includes the 1% buy cost
    // compounding the periods reproduces the total net return (no cost leaks out of the series)
    expect(w.periodReturns.reduce((m, x) => m * (1 + x.netRet), 1) - 1).toBeCloseTo(w.netReturn, 12);
    expect(w.periodReturns.every((x) => x.entryT >= day(2))).toBe(true);
    // drawdown: worst close-to-peak includes the A drop on day 3 close (0.009*100 = 0.9 vs peak 0.99)
    expect(w.maxDrawdown).toBeGreaterThan(0.09);
  });
  it('incomplete allocation: no coin with positive momentum → stays in cash, no costs', () => {
    const down = mk([[100, 100], [100, 90], [90, 80], [80, 70], [70, 60], [60, 50]]);
    const w = simulateXs([{ symbol: 'A', candles: down }, { symbol: 'B', candles: down.map((k) => ({ ...k })) }], { lookback: 1, topK: 2, rebalance: 1 }, day(1), day(6), cost);
    expect(w.netReturn).toBe(0);
    expect(w.trades).toBe(0);
  });
});
