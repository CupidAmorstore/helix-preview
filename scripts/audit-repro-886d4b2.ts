// Reproduction of independent audit findings AUD-202/203/205/207/208 (+ 4.1 embargo horizon) against the
// BASELINE source 886d4b2. Run on that commit:
//   git checkout 886d4b2 -- src/bot && npx vite-node --config scripts/vite.node.config.ts scripts/audit-repro-886d4b2.ts
// Output is committed as research/audit/repro-886d4b2.json. This script is evidence only; it changes nothing.
import { writeFileSync, mkdirSync } from 'node:fs';
import { walkForward, chronologicalSplit } from '../src/bot/validation';
import { simulateXs } from '../src/bot/crossSectional';
import { backtest } from '../src/bot/backtest';
import { COST_PRESETS } from '../src/bot/costs';
import { warmup } from '../src/bot/strategies';
import type { Candle, CostModel } from '../src/bot/types';

const DAY = 86_400_000;
const T0 = Date.UTC(2024, 0, 1);
const out: Record<string, unknown> = { baseline: '886d4b2', ranAt: new Date().toISOString() };
const zero: CostModel = { ...COST_PRESETS.coinbase_taker, takerFeeBps: 0, halfSpreadBps: 0, slippageBps: 0, fixedCostUsd: 0, minOrderUsd: 0 };

// ---- AUD-202: walk-forward with zero completed folds produces no rejection ----------------------
{
  const c: Candle[] = Array.from({ length: 400 }, (_, i) => ({ t: T0 + i * DAY, o: 100, h: 100, l: 100, c: 100, v: 1 }));
  const s = chronologicalSplit(c.length, 10);
  const wf = walkForward(c, 'sma_cross', zero, s, 300, () => ({ family: 'sma_cross', params: { fast: 10, slow: 100 } }));
  // the exact gate expressions used by evaluateFamily at 886d4b2:
  const rejectNet = !!(wf.folds.length && !(wf.compoundedNet > 0));
  const rejectStab = !!(wf.folds.length && wf.positiveFolds / wf.folds.length < 0.5);
  out['AUD-202'] = { folds: wf.folds.length, compoundedNet: wf.compoundedNet, rejectedByWalkForward: rejectNet || rejectStab, reproduced: wf.folds.length === 0 && !rejectNet && !rejectStab };
}

// ---- AUD-203: delayed cross-sectional orders mutate holdings before execution -------------------
{
  // two coins; A rises steadily so it is picked; on the days between decision and execution A's CLOSE
  // collapses 50% and recovers before the execution open. While still in cash the portfolio must show 0 drawdown.
  const n = 60;
  const mk = (f: (i: number) => [number, number]): Candle[] =>
    Array.from({ length: n }, (_, i) => { const [o, cl] = f(i); return { t: T0 + i * DAY, o, h: Math.max(o, cl), l: Math.min(o, cl), c: cl, v: 1 }; });
  const decision = 30; // lookback 7, rebalance 7 → decisions on 7,14,21,28 relative to start… we only need one in the window
  const A = mk((i) => [100 + i, i === decision + 1 || i === decision + 2 ? (100 + i) * 0.5 : 100 + i + 0.5]);
  const B = mk(() => [100, 99.9]);
  const series = [{ symbol: 'A', candles: A }, { symbol: 'B', candles: B }];
  const from = A[decision].t;
  const to = A[decision + 10].t;
  const r0 = simulateXs(series, { lookback: 7, topK: 1, rebalance: 100 }, from, to, zero, 0);
  const r2 = simulateXs(series, { lookback: 7, topK: 1, rebalance: 100 }, from, to, zero, 2);
  // with delay 2 the fill is at the open of decision+3; the crash closes are decision+1/+2 → must not count
  out['AUD-203'] = { delay0MaxDrawdown: r0.maxDrawdown, delay2MaxDrawdown: r2.maxDrawdown, reproduced: r2.maxDrawdown > 0.3 };
}

// ---- AUD-205: bootstrap tail resolution at the cumulative Bonferroni N ---------------------------
{
  const N = 199;
  const tail = 0.05 / N / 2;
  const iterations = 4000;
  out['AUD-205'] = { tailProbability: tail, iterations, expectedDrawsBelowQuantile: tail * iterations, quantileIndexUsed: Math.floor(tail * iterations), note: 'index 0 = the single smallest of 4000 resamples, i.e. the sample minimum; Monte-Carlo SE of an order statistic with <1 expected exceedance is unbounded', reproduced: Math.floor(tail * iterations) === 0 };
}

// ---- AUD-207: final forced liquidation not included in drawdown ---------------------------------
{
  const c: Candle[] = Array.from({ length: 300 }, (_, i) => {
    const px = 100 + i * 0.01; // rising throughout: sma_cross enters once and is still long at the window end
    return { t: T0 + i * DAY, o: px, h: px, l: px, c: px, v: 1 };
  });
  const cost: CostModel = { ...zero, fixedCostUsd: 50, minOrderUsd: 0 }; // fixed exit cost makes the gap visible
  const r = backtest(c, { family: 'sma_cross', params: { fast: 10, slow: 100 } }, { start: 101, end: 300, cost, capitalUsd: 1000 });
  const finalEquity = 1 + r.netReturn;
  out['AUD-207'] = { trades: r.trades.length, forcedExit: r.trades.at(-1)?.forcedExit, reportedMaxDrawdown: r.maxDrawdown, finalEquityFraction: finalEquity, reproduced: r.trades.at(-1)?.forcedExit === true && 1 - finalEquity > r.maxDrawdown + 1e-9 };
}

// ---- AUD-208: cross-sectional ignores fixed costs and minimum order size ------------------------
{
  const n = 80;
  const up = (k: number): Candle[] => Array.from({ length: n }, (_, i) => ({ t: T0 + i * DAY, o: 100 * (1 + k) ** i, h: 100 * (1 + k) ** i, l: 100 * (1 + k) ** i, c: 100 * (1 + k) ** i, v: 1 }));
  const series = [{ symbol: 'A', candles: up(0.01) }, { symbol: 'B', candles: up(0.005) }, { symbol: 'C', candles: up(0.002) }];
  const huge: CostModel = { ...zero, fixedCostUsd: 1000, minOrderUsd: 1_000_000 };
  const a = simulateXs(series, { lookback: 7, topK: 3, rebalance: 7 }, series[0].candles[10].t, series[0].candles[79].t, zero);
  const b = simulateXs(series, { lookback: 7, topK: 3, rebalance: 7 }, series[0].candles[10].t, series[0].candles[79].t, huge);
  out['AUD-208'] = { netNoCost: a.netReturn, netWithImpossibleFixedCostAndMinimum: b.netReturn, tradesWithImpossibleMinimum: b.trades, reproduced: Math.abs(a.netReturn - b.netReturn) < 1e-12 && b.trades > 0 };
}

// ---- 4.1: warm-up (used as embargo) shorter than the true dependency horizon --------------------
{
  const vft = { family: 'vol_filtered_trend' as const, params: { trend: 100, vol: 20, lookback: 250 } };
  const vcb = { family: 'vol_compression_breakout' as const, params: { n: 20, lookback: 120, pct: 0.1 } };
  out['4.1-embargo'] = {
    vol_filtered_trend: { warmup: warmup(vft), trueHorizon: 250 + 20 + 1 },
    vol_compression_breakout: { warmup: warmup(vcb), trueHorizon: 120 + 20 + 1 },
    reproduced: warmup(vft) < 271 && warmup(vcb) < 141
  };
}

mkdirSync('research/audit', { recursive: true });
writeFileSync('research/audit/repro-886d4b2.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
