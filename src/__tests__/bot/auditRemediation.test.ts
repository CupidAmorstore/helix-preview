// Regression tests for the independent audit of 2026-11-25 (AUD-201..208, 4.1). Each block states the defect it
// guards against; the baseline reproduction is research/audit/repro-886d4b2.json.
import { describe, expect, it } from 'vitest';
import { walkForwardCore, walkForwardRejections } from '../../bot/walkForward';
import { evaluatePooled, GATES } from '../../bot/validation';
import { evaluateCrossSectional, simulateXs, CAPITAL_TIERS } from '../../bot/crossSectional';
import { simulateXs as baselineXs } from './fixtures/baselineXs886d4b2';
import { backtest, exitProceeds } from '../../bot/backtest';
import { COST_PRESETS } from '../../bot/costs';
import { dependencyHorizon, warmup, PARAM_GRID } from '../../bot/strategies';
import { monthlyInference, monthlyReturns, requiredBootstrapIterations, studentTQuantile, mulberry32 } from '../../bot/stats';
import type { Candle, CostModel, StrategyFamily } from '../../bot/types';
import { randomWalk, asDaily } from './helpers';

const DAY = 86_400_000;
const T0 = Date.UTC(2021, 0, 1);
const ZERO: CostModel = { ...COST_PRESETS.coinbase_taker, takerFeeBps: 0, halfSpreadBps: 0, slippageBps: 0, fixedCostUsd: 0, minOrderUsd: 0 };
const bar = (i: number, o: number, c = o): Candle => ({ t: T0 + i * DAY, o, h: Math.max(o, c), l: Math.min(o, c), c, v: 1 });

// ------------------------------------------------------------------------------------------- AUD-202
describe('AUD-202 walk-forward fails closed', () => {
  const plan = { trainStart: 0, valEnd: 1000, embargo: 50, folds: 4, step: 1 };
  const sel = () => ({ x: 1 });
  const ok = () => ({ netReturn: 0.01, trades: 3 });

  it('all four folds complete and pass → no rejection', () => {
    const wf = walkForwardCore(plan, sel, ok);
    expect(wf.folds).toHaveLength(4);
    expect(wf.complete).toBe(true);
    expect(walkForwardRejections(wf, 0.5)).toEqual([]);
  });

  it.each([0, 1, 2, 3])('only %i of 4 folds completing is rejected as incomplete', (k) => {
    // fold k' completes iff k' >= 4-k: make the earliest folds lack history via minTrain
    const first = 500, size = 125;
    const minTrain = k === 0 ? 10_000 : first + (4 - k) * size - 50 - 1; // history needed by fold (4-k)
    const wf = walkForwardCore({ ...plan, minTrain }, sel, ok);
    expect(wf.folds.length).toBe(k);
    expect(wf.complete).toBe(false);
    const r = walkForwardRejections(wf, 0.5);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatch(new RegExp(`walk-forward incomplete: ${k}/4 folds .*insufficient history`));
  });

  it('non-finite fold returns are rejected', () => {
    let n = 0;
    const wf = walkForwardCore(plan, sel, () => ({ netReturn: n++ === 2 ? NaN : 0.01, trades: 1 }));
    expect(wf.complete).toBe(false);
    expect(walkForwardRejections(wf, 0.5)[0]).toMatch(/non-finite/);
  });

  it.each([
    ['empty region', { ...plan, valEnd: 0 }],
    ['negative embargo', { ...plan, embargo: -1 }],
    ['NaN embargo', { ...plan, embargo: NaN }],
    ['zero step', { ...plan, step: 0 }],
    ['zero folds', { ...plan, folds: 0 }],
    ['fractional folds', { ...plan, folds: 2.5 }],
    ['embargo longer than history', { ...plan, embargo: 900 }]
  ])('invalid configuration (%s) is rejected', (_, p) => {
    const wf = walkForwardCore(p, sel, ok);
    expect(wf.complete).toBe(false);
    expect(walkForwardRejections(wf, 0.5)[0]).toMatch(/walk-forward incomplete/);
  });

  it('a missing walk-forward result is a rejection, not a pass', () => {
    expect(walkForwardRejections(undefined, 0.5)).toEqual(['walk-forward missing (mandatory)']);
  });

  it('re-selection never sees data at or after its fold minus the embargo; folds never reach valEnd', () => {
    const seen: [number, number][] = [];
    const wf = walkForwardCore(plan, (a, b) => { seen.push([a, b]); return { x: 1 }; }, ok);
    wf.folds.forEach((f, i) => {
      expect(seen[i][1]).toBe(f.from - plan.embargo);
      expect(f.to).toBeLessThanOrEqual(plan.valEnd);
    });
  });
});

// ------------------------------------------------------------------------------------------- AUD-201
describe('AUD-201 walk-forward is mandatory for pooled and cross-sectional evaluators', () => {
  const daily = (c: Candle[]) => asDaily(c, Date.UTC(2019, 0, 1));
  const LOW = { ...COST_PRESETS.coinbase_taker, takerFeeBps: 1, halfSpreadBps: 0, slippageBps: 0 };

  it('pooled: walk-forward is computed on the common calendar, inside the pre-test region', () => {
    const u = [1, 2, 3].map((s) => ({ symbol: `M${s}`, candles: daily(randomWalk(1500, s, 0.02)) }));
    const r = evaluatePooled(u, 'sma_cross', LOW, DAY, 3);
    expect(r.walkForward).toBeDefined();
    expect(r.walkForward!.requiredFolds).toBe(GATES.walkForwardFolds);
    for (const f of r.walkForward!.folds) {
      expect(f.to).toBeLessThanOrEqual(r.cutoffs.valEnd);
      expect(f.trainTo).toBeLessThanOrEqual(f.from - r.walkForward!.embargoBars);
      expect((f.from - r.cutoffs.trainStart) % DAY).toBe(0);
    }
  });

  it('pooled: too little history for walk-forward can never qualify', () => {
    const u = [7, 8, 9].map((s) => ({ symbol: `M${s}`, candles: daily(randomWalk(420, s, 0.02, 0.01)) }));
    const r = evaluatePooled(u, 'weekly_trend', LOW, DAY, 1);
    expect(r.status).not.toBe('qualified_paper_strategy');
  });

  it('cross-sectional: walk-forward folds re-select parameters on earlier data and stay before the test', () => {
    const u = [0, 1, 2, 3].map((k) => ({ symbol: `X${k}`, candles: daily(randomWalk(1500, 90 + k, 0.02)) }));
    const r = evaluateCrossSectional(u, LOW, DAY, 3);
    expect(r.walkForward).toBeDefined();
    for (const f of r.walkForward!.folds) expect(f.to).toBeLessThanOrEqual(r.cutoffs.valEnd);
  });

  it('cross-sectional: an incomplete walk-forward blocks qualification', () => {
    // 260 common days: training too short for 4 embargoed folds
    const u = [0, 1, 2, 3].map((k) => ({ symbol: `X${k}`, candles: daily(randomWalk(260, 10 + k, 0.01, k === 0 ? 0.01 : 0)) }));
    const r = evaluateCrossSectional(u, LOW, DAY, 1);
    expect(r.status).toBe('rejected');
    expect(r.rejectionReasons.join(' ')).toMatch(/walk-forward incomplete/);
  });
});

// ------------------------------------------------------------------------------------------- AUD-203
describe('AUD-203 cross-sectional simulation is chronological', () => {
  // Coin A rises steadily (picked); between decision and execution its CLOSE crashes 50% and recovers before
  // the execution open. While still in cash the portfolio must not register that crash.
  const mk = (d: number, delay: number) => {
    const n = 60;
    const A = Array.from({ length: n }, (_, i) => bar(i, 100 + i, i > d && i <= d + delay ? (100 + i) * 0.5 : 100 + i + 0.5));
    const B = Array.from({ length: n }, (_, i) => bar(i, 100, 99.9));
    return [{ symbol: 'A', candles: A }, { symbol: 'B', candles: B }];
  };
  const p = { lookback: 7, topK: 1, rebalance: 100 };

  it.each([1, 2, 5])('delay %i: equity is untouched (cash only) until the execution open', (delay) => {
    const d = 30;
    const s = mk(d, delay);
    const r = simulateXs(s, p, s[0].candles[d].t, s[0].candles[d + 15].t, ZERO, delay, 1000);
    const exec = s[0].candles[d + 1 + delay].t;
    for (const e of r.equity) if (e.t < exec) expect(e.v).toBe(1000);
    expect(r.maxDrawdown).toBe(0); // the crash happened while in cash; A only rises after the fill
    expect(r.trades).toBe(1);
  });

  it('delay 0 executes at the next open; a crash after the fill is a real drawdown', () => {
    const d = 30;
    const s = mk(d, 1); // crash close on d+1 — we hold from the d+1 open
    const r = simulateXs(s, p, s[0].candles[d].t, s[0].candles[d + 15].t, ZERO, 0, 1000);
    expect(r.maxDrawdown).toBeGreaterThan(0.45);
  });

  it('delayed orders never use prices from before their execution day', () => {
    const d = 30;
    const s = mk(d, 2);
    // change every open/close BEFORE execution except the decision inputs: result must not change
    const a = simulateXs(s, p, s[0].candles[d].t, s[0].candles[d + 15].t, ZERO, 2, 1000);
    const s2 = s.map((x) => ({ ...x, candles: x.candles.map((k, i) => (i === d + 1 || i === d + 2 ? { ...k, o: k.o * 3 } : k)) }));
    const b = simulateXs(s2, p, s[0].candles[d].t, s[0].candles[d + 15].t, ZERO, 2, 1000);
    expect(b.netReturn).toBeCloseTo(a.netReturn, 12);
  });

  it('final liquidation is the final equity and is inside drawdown', () => {
    const d = 30;
    const s = mk(d, 1);
    const cost = { ...ZERO, fixedCostUsd: 200 };
    const r = simulateXs(s, p, s[0].candles[d].t, s[0].candles[d + 15].t, cost, 1, 1000);
    expect(r.equity.at(-1)!.v).toBeCloseTo(1000 * (1 + r.netReturn), 9);
    const peak = Math.max(...r.equity.map((e) => e.v));
    expect(r.maxDrawdown).toBeGreaterThanOrEqual((peak - r.equity.at(-1)!.v) / peak - 1e-12);
  });

  it('at delay 0 with no fixed cost/minimum it reproduces the baseline accounting exactly', () => {
    const daily = (c: Candle[]) => asDaily(c, Date.UTC(2020, 0, 1));
    for (const seed of [1, 5]) {
      const u = [0, 1, 2, 3].map((k) => ({ symbol: `P${k}`, candles: daily(randomWalk(700, seed * 10 + k, 0.03)) }));
      const cost = { ...COST_PRESETS.coinbase_taker, fixedCostUsd: 0, minOrderUsd: 0 };
      const q = { lookback: 14, topK: 2, rebalance: 7 };
      const a = simulateXs(u, q, u[0].candles[60].t, u[0].candles[650].t, cost, 0, 1);
      const b = baselineXs(u, q, u[0].candles[60].t, u[0].candles[650].t, cost, 0);
      expect(a.netReturn).toBeCloseTo(b.netReturn, 9);
      expect(a.maxDrawdown).toBeCloseTo(b.maxDrawdown, 9);
      expect(a.trades).toBe(b.trades);
    }
  });
});

// ------------------------------------------------------------------------------------------- AUD-207
describe('AUD-207 final liquidation inside drawdown; fixed-cost exits', () => {
  const rising = Array.from({ length: 300 }, (_, i) => bar(i, 100 + i * 0.01));
  const spec = { family: 'sma_cross' as const, params: { fast: 10, slow: 100 } };

  it('forced exit with a fixed cost: drawdown covers the liquidated equity; final equity = cash', () => {
    const r = backtest(rising, spec, { start: 101, end: 300, cost: { ...ZERO, fixedCostUsd: 50 }, capitalUsd: 1000, recordEquity: true });
    expect(r.trades.at(-1)!.forcedExit).toBe(true);
    const final = 1 + r.netReturn;
    expect(r.equity!.at(-1)!.v).toBeCloseTo(1000 * final, 9);
    const peak = Math.max(1000, ...r.equity!.map((e) => e.v));
    expect(r.maxDrawdown).toBeGreaterThanOrEqual((peak - 1000 * final) / peak - 1e-12);
  });

  it.each([0.001, 0.006, 0.03])('proportional side cost %f: liquidation drawdown included', (side) => {
    const cost = { ...ZERO, takerFeeBps: side * 10_000 };
    const r = backtest(rising, spec, { start: 101, end: 300, cost, capitalUsd: 1000, recordEquity: true });
    const peak = Math.max(1000, ...r.equity!.map((e) => e.v));
    expect(r.maxDrawdown).toBeGreaterThanOrEqual((peak - 1000 * (1 + r.netReturn)) / peak - 1e-12);
  });

  it('severe loss: a fixed exit cost larger than the position writes it off at 0, never negative equity', () => {
    expect(exitProceeds(5, 10)).toBe(0);
    expect(exitProceeds(15, 10)).toBe(5);
    const crash = Array.from({ length: 300 }, (_, i) => bar(i, i < 290 ? 100 + i * 0.01 : 0.001));
    const r = backtest(crash, spec, { start: 101, end: 300, cost: { ...ZERO, fixedCostUsd: 20 }, capitalUsd: 100 });
    expect(r.netReturn).toBeGreaterThanOrEqual(-1);
    expect(r.maxDrawdown).toBeLessThanOrEqual(1);
  });

  it('orders below the venue minimum are rejected, not resized', () => {
    const r = backtest(rising, spec, { start: 101, end: 300, cost: { ...ZERO, minOrderUsd: 5000 }, capitalUsd: 1000 });
    expect(r.trades).toHaveLength(0);
    expect(r.rejectedOrders).toBeGreaterThan(0);
    expect(r.netReturn).toBe(0);
  });
});

// ------------------------------------------------------------------------------------------- AUD-208
describe('AUD-208 cross-sectional costs are capital-aware', () => {
  const up = (k: number) => Array.from({ length: 80 }, (_, i) => bar(i, 100 * (1 + k) ** i));
  const series = [{ symbol: 'A', candles: up(0.01) }, { symbol: 'B', candles: up(0.005) }, { symbol: 'C', candles: up(0.002) }];
  const q = { lookback: 7, topK: 3, rebalance: 7 };
  const from = series[0].candles[10].t;
  const to = series[0].candles[79].t;

  it('an impossible venue minimum produces no trades and rejected orders (was: traded anyway)', () => {
    const r = simulateXs(series, q, from, to, { ...ZERO, minOrderUsd: 1_000_000 }, 0, 1000);
    expect(r.trades).toBe(0);
    expect(r.rejectedOrders).toBeGreaterThan(0);
    expect(r.netReturn).toBe(0);
  });

  it('fixed costs reduce returns, more for small accounts', () => {
    const cost = { ...ZERO, fixedCostUsd: 0.5 };
    const big = simulateXs(series, q, from, to, cost, 0, 1000).netReturn;
    const small = simulateXs(series, q, from, to, cost, 0, 50).netReturn;
    const none = simulateXs(series, q, from, to, ZERO, 0, 1000).netReturn;
    expect(big).toBeLessThan(none);
    expect(small).toBeLessThan(big);
  });

  it('a tier where orders are rejected is reported infeasible', () => {
    const u = [0, 1, 2, 3].map((k) => ({ symbol: `X${k}`, candles: asDaily(randomWalk(1500, 30 + k, 0.02), Date.UTC(2019, 0, 1)) }));
    const r = evaluateCrossSectional(u, { ...COST_PRESETS.coinbase_taker, minOrderUsd: 30 }, DAY, 3);
    expect(r.capitalTiers!.map((t) => t.capitalUsd)).toEqual([...CAPITAL_TIERS]);
    const t20 = r.capitalTiers!.find((t) => t.capitalUsd === 20)!;
    expect(t20.rejectedOrders).toBeGreaterThan(0);
    expect(t20.feasible).toBe(false);
  });
});

// ------------------------------------------------------------------------------------------- AUD-205
describe('AUD-205 inference: dependence-aware, explicit tail resolution', () => {
  it('Student-t quantiles match published tables', () => {
    expect(studentTQuantile(0.975, 10)).toBeCloseTo(2.228, 3);
    expect(studentTQuantile(0.995, 30)).toBeCloseTo(2.75, 2);
    expect(studentTQuantile(0.95, 1)).toBeCloseTo(6.314, 3);
  });

  it('resamples are sized so >= 100 draws fall in the Bonferroni tail (N=199 → ~796k)', () => {
    const alpha = 0.05 / 199;
    const it = requiredBootstrapIterations(alpha);
    expect(it * (alpha / 2)).toBeGreaterThanOrEqual(100);
    expect(Math.floor(4000 * (alpha / 2))).toBe(0); // the baseline used the sample minimum
  });

  it('monthly returns compound inside UTC months and chain across them', () => {
    const eq = [
      { t: Date.UTC(2024, 0, 10), v: 110 }, { t: Date.UTC(2024, 0, 31), v: 121 },
      { t: Date.UTC(2024, 1, 1), v: 100 }, { t: Date.UTC(2024, 1, 29), v: 110 }
    ];
    const m = monthlyReturns(eq, 100);
    expect(m.map((x) => x.month)).toEqual(['2024-01', '2024-02']);
    expect(m[0].ret).toBeCloseTo(0.21, 12);
    expect(m[1].ret).toBeCloseTo(110 / 121 - 1, 12);
  });

  it('fewer than 12 months can never pass, however good', () => {
    const r = monthlyInference(Array(11).fill(0.05), 0.05, 12);
    expect(r.pass).toBe(false);
    expect(r.reasons[0]).toMatch(/months 11 < 12/);
  });

  it('zero-mean noise fails; a strong consistent edge passes at the Bonferroni alpha', () => {
    const rnd = mulberry32(3);
    const noise = Array.from({ length: 36 }, () => (rnd() - 0.5) * 0.2);
    expect(monthlyInference(noise, 0.05 / 199, 12).pass).toBe(false);
    const edge = Array.from({ length: 36 }, () => 0.04 + (rnd() - 0.5) * 0.02);
    const r = monthlyInference(edge, 0.05 / 199, 12);
    expect(r.reasons).toEqual([]);
    expect(r.bootstrap.map((b) => b.blockMonths)).toEqual([1, 2, 3]);
    for (const b of r.bootstrap) expect(b.iterations).toBeGreaterThanOrEqual(requiredBootstrapIterations(0.05 / 199));
  });

  it('positive autocorrelation shrinks the effective sample', () => {
    const trending = Array.from({ length: 36 }, (_, i) => 0.01 + 0.05 * Math.sin(i / 6));
    const r = monthlyInference(trending, 0.05, 12);
    expect(r.rho1).toBeGreaterThan(0.5);
    expect(r.nEff).toBeLessThan(r.months / 2);
  });
});

// ------------------------------------------------------------------------------------------- 4.1
describe('4.1 embargo covers the full dependency horizon', () => {
  it('is never shorter than warm-up and adds nested windows / holds', () => {
    for (const f of Object.keys(PARAM_GRID) as StrategyFamily[])
      for (const params of PARAM_GRID[f]) expect(dependencyHorizon({ family: f, params })).toBeGreaterThanOrEqual(warmup({ family: f, params }));
    expect(dependencyHorizon({ family: 'vol_filtered_trend', params: { trend: 100, vol: 20, lookback: 250 } })).toBe(271);
    expect(dependencyHorizon({ family: 'vol_compression_breakout', params: { n: 20, lookback: 120, pct: 0.1 } })).toBe(141);
    expect(dependencyHorizon({ family: 'rsi_reversion', params: { n: 14, lo: 30, hi: 55, maxHold: 24 } })).toBe(4 * 14 + 24 + 1);
  });
});
