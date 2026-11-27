import { describe, expect, it } from 'vitest';
import { chronologicalSplit, evaluateFamily, walkForward, GATES } from '../../bot/validation';
import { COST_PRESETS } from '../../bot/costs';
import type { StrategySpec } from '../../bot/types';
import { randomWalk, trendingRegimes } from './helpers';

const LOW = { ...COST_PRESETS.coinbase_taker, takerFeeBps: 1, halfSpreadBps: 0, slippageBps: 0 };

describe('walk-forward re-estimation with embargo', () => {
  it('folds stay inside the pre-test region; each re-selection ends an embargo before its fold', () => {
    const c = randomWalk(2000, 5, 0.02);
    const s = chronologicalSplit(c.length, 200);
    const calls: [number, number][] = [];
    const spec: StrategySpec = { family: 'sma_cross', params: { fast: 10, slow: 100 } };
    const wf = walkForward(c, 'sma_cross', LOW, s, 200, (a, b) => { calls.push([a, b]); return spec; });
    expect(wf.folds.length).toBe(GATES.walkForwardFolds);
    for (const f of wf.folds) {
      expect(f.from).toBeGreaterThanOrEqual(c[s.trainStart].t);
      expect(f.to).toBeLessThan(c[s.valEnd].t); // never touches the final test window
    }
    // selection window ends exactly `embargo` bars before the fold starts
    const firstFoldStart = c.findIndex((k) => k.t === wf.folds[0].from);
    expect(calls[0][1]).toBe(firstFoldStart - 200);
    expect(calls.every(([a]) => a === s.trainStart)).toBe(true);
  });

  it('an edge that disappears after the training half is rejected by walk-forward', () => {
    // trending first half, pure noise afterwards
    const a = trendingRegimes(1200, 9);
    const b = randomWalk(1200, 77, 0.01).map((k, i) => ({ ...k, t: a[a.length - 1].t + (i + 1) * (a[1].t - a[0].t) }));
    const scale = a[a.length - 1].c / b[0].o;
    const c = [...a, ...b.map((k) => ({ ...k, o: k.o * scale, h: k.h * scale, l: k.l * scale, c: k.c * scale }))];
    const r = evaluateFamily(c, 'sma_cross', LOW, 1);
    expect(r.status).toBe('rejected');
    expect(r.walkForward).toBeDefined();
  });

  it('reports folds, compounded net and positive-fold count on every candidate', () => {
    const r = evaluateFamily(randomWalk(2000, 3, 0.02), 'ts_momentum', COST_PRESETS.coinbase_taker, 1);
    expect(r.walkForward!.folds.length).toBeGreaterThan(0);
    expect(r.walkForward!.compoundedNet).toBeCloseTo(r.walkForward!.folds.reduce((m, f) => m * (1 + f.netReturn), 1) - 1, 12);
    expect(r.walkForward!.embargoBars).toBeGreaterThan(0);
  });
});
