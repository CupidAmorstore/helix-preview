import type { Candle, SignalFn, StrategyFamily, StrategySpec } from './types';
import { efficiencyRatio, priorHigh, priorLow, rollingStd, rsi, sma } from './indicators';

/**
 * Long-only spot strategy families. No shorting, no leverage (spot accounts cannot short without margin).
 * Each builder precomputes indicators over the full array; value at i only uses data <= i
 * (enforced by tests/bot/lookahead.test.ts which mutates future bars and checks signals are unchanged).
 */
const builders: Record<StrategyFamily, (c: Candle[], p: Record<string, number>) => SignalFn> = {
  sma_cross(c, p) {
    const close = c.map((x) => x.c);
    const f = sma(close, p.fast);
    const s = sma(close, p.slow);
    return (i) => (f[i] > s[i] ? 1 : 0);
  },
  donchian_breakout(c, p) {
    const hi = priorHigh(c, p.entry);
    const lo = priorLow(c, p.exit);
    return (i, pos) => {
      if (pos === 0) return c[i].c > hi[i] ? 1 : 0;
      return c[i].c < lo[i] ? 0 : 1;
    };
  },
  ts_momentum(c, p) {
    return (i) => (i >= p.lookback && c[i].c / c[i - p.lookback].c - 1 > (p.threshold ?? 0) ? 1 : 0);
  },
  trend_filtered_momentum(c, p) {
    const close = c.map((x) => x.c);
    const filt = sma(close, p.filter);
    return (i) =>
      i >= p.lookback && close[i] > filt[i] && close[i] / close[i - p.lookback] - 1 > 0 ? 1 : 0;
  },
  bollinger_reversion(c, p) {
    const close = c.map((x) => x.c);
    const m = sma(close, p.n);
    const sd = rollingStd(close, p.n);
    let held = 0;
    return (i, pos) => {
      if (pos === 0) {
        held = 0;
        return close[i] < m[i] - p.k * sd[i] ? 1 : 0;
      }
      held++;
      return close[i] >= m[i] || held >= p.maxHold ? 0 : 1;
    };
  },
  rsi_reversion(c, p) {
    const close = c.map((x) => x.c);
    const r = rsi(close, p.n);
    let held = 0;
    return (i, pos) => {
      if (pos === 0) {
        held = 0;
        return r[i] < p.lo ? 1 : 0;
      }
      held++;
      return r[i] > p.hi || held >= p.maxHold ? 0 : 1;
    };
  },
  vol_compression_breakout(c, p) {
    const close = c.map((x) => x.c);
    const m = sma(close, p.n);
    const sd = rollingStd(close, p.n);
    const bw = close.map((x, i) => (2 * sd[i]) / m[i]);
    const er = efficiencyRatio(close, p.n);
    return (i, pos) => {
      if (pos === 1) return close[i] < m[i] ? 0 : 1;
      if (i < p.lookback) return 0;
      // bandwidth in the lowest `pct` of its trailing lookback window => compression
      let below = 0;
      let count = 0;
      for (let j = i - p.lookback; j < i; j++) {
        if (Number.isFinite(bw[j])) {
          count++;
          if (bw[j] < bw[i]) below++;
        }
      }
      const compressed = count > 0 && below / count <= p.pct;
      return compressed && close[i] > m[i] + sd[i] && er[i] > 0.2 ? 1 : 0;
    };
  }
};

export function buildSignal(spec: StrategySpec, candles: Candle[]): SignalFn {
  return builders[spec.family](candles, spec.params);
}

/** Warm-up bars needed before a strategy's signal is defined. */
export function warmup(spec: StrategySpec): number {
  const p = spec.params;
  return Math.max(p.slow ?? 0, p.entry ?? 0, p.exit ?? 0, p.lookback ?? 0, p.filter ?? 0, p.n ?? 0) + 1;
}

/** Small, pre-declared parameter grids. Kept deliberately coarse to limit data snooping. */
export const PARAM_GRID: Record<StrategyFamily, Record<string, number>[]> = {
  sma_cross: cartesian({ fast: [10, 20, 50], slow: [100, 200] }),
  donchian_breakout: cartesian({ entry: [20, 55], exit: [10, 20] }),
  ts_momentum: cartesian({ lookback: [24, 72, 168], threshold: [0] }),
  trend_filtered_momentum: cartesian({ lookback: [24, 72], filter: [200] }),
  bollinger_reversion: cartesian({ n: [20, 50], k: [2, 2.5], maxHold: [24] }),
  rsi_reversion: cartesian({ n: [14], lo: [25, 30], hi: [55], maxHold: [24] }),
  vol_compression_breakout: cartesian({ n: [20], lookback: [120], pct: [0.1, 0.2] })
};

function cartesian(grid: Record<string, number[]>): Record<string, number>[] {
  let out: Record<string, number>[] = [{}];
  for (const [k, vs] of Object.entries(grid)) out = out.flatMap((o) => vs.map((v) => ({ ...o, [k]: v })));
  return out;
}

/** Neighbouring parameter sets (one parameter moved one grid step) — used for stability checks. */
export function neighbours(family: StrategyFamily, params: Record<string, number>): Record<string, number>[] {
  const grid = PARAM_GRID[family];
  return grid.filter((g) => {
    const keys = Object.keys(params);
    const diff = keys.filter((k) => g[k] !== params[k]);
    return diff.length === 1;
  });
}

export function specKey(spec: StrategySpec): string {
  const p = Object.keys(spec.params)
    .sort()
    .map((k) => `${k}=${spec.params[k]}`)
    .join(',');
  return `${spec.family}(${p})`;
}
