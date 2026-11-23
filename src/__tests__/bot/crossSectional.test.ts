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
    const u = [0, 1, 2, 3].map((k) => ({ symbol: `P${k}`, candles: daily(randomWalk(1500, 70 + k, 0.02, k === 0 ? 0.004 : 0)) }));
    const r = evaluateCrossSectional(u, LOW, DAY, 1);
    expect(r.validation!.netReturn).toBeGreaterThan(0);
    expect(r.status).toBe('qualified_paper_strategy');
  });
});
