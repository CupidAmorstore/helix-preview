import { describe, expect, it } from 'vitest';
import { buildSignal, PARAM_GRID, familyAllowed } from '../../bot/strategies';
import { backtest } from '../../bot/backtest';
import { COST_PRESETS } from '../../bot/costs';
import type { Candle, StrategyFamily } from '../../bot/types';
import { randomWalk } from './helpers';

const DAY = 86_400_000;
const daily = (c: Candle[]) => c.map((k, i) => ({ ...k, t: Date.UTC(2020, 0, 1) + i * DAY }));
const FAMS: StrategyFamily[] = ['weekly_trend', 'monthly_momentum'];

describe('multi-day horizon families', () => {
  it('are daily-only', () => {
    for (const f of FAMS) {
      expect(familyAllowed(f, DAY)).toBe(true);
      expect(familyAllowed(f, 3_600_000)).toBe(false);
    }
  });

  it('use no future data: mutating bars after i never changes the decision at i', () => {
    const c = daily(randomWalk(800, 4, 0.03));
    for (const f of FAMS)
      for (const params of PARAM_GRID[f]) {
        const base = buildSignal({ family: f, params }, c);
        for (const i of [300, 450, 600]) {
          const mutated = c.map((k, j) => (j > i ? { ...k, o: k.o * 3, h: k.h * 3, l: k.l * 3, c: k.c * 3 } : k));
          const sig = buildSignal({ family: f, params }, mutated);
          for (const pos of [0, 1] as const) expect(sig(i, pos)).toBe(base(i, pos));
        }
      }
  });

  it('only change position on calendar rebalance days (low turnover)', () => {
    const c = daily(randomWalk(1500, 11, 0.03));
    for (const f of FAMS)
      for (const params of PARAM_GRID[f]) {
        const r = backtest(c, { family: f, params }, { start: 250, end: c.length, cost: COST_PRESETS.coinbase_taker, capitalUsd: 1000 });
        // at most one entry per rebalance period
        expect(r.trades.length).toBeLessThanOrEqual(Math.ceil((c.length - 250) / params.period) + 1);
        const sig = buildSignal({ family: f, params }, c);
        for (let i = 251; i < c.length; i++) {
          if ((Math.floor(c[i].t / DAY) + 1) % params.period !== 0) for (const pos of [0, 1] as const) expect(sig(i, pos)).toBe(pos);
        }
      }
  });
});
