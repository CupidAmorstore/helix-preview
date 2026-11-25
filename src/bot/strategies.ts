import type { Candle, SignalFn, StrategyFamily, StrategySpec } from './types';
import { efficiencyRatio, priorHigh, priorLow, rollingStd, rsi, sma } from './indicators';

/**
 * Long-only spot strategy families. No shorting, no leverage (spot accounts cannot short without margin).
 * Each builder precomputes indicators over the full array; value at i only uses data <= i
 * (enforced by tests/bot/lookahead.test.ts which mutates future bars and checks signals are unchanged).
 */
const DAY_MS = 86_400_000;
/** true when bar i closes the last UTC day of a `period`-day calendar block (pure calendar, no future data) */
const rebalanceDay = (c: Candle[], i: number, period: number) => (Math.floor(c[i].t / DAY_MS) + 1) % period === 0;

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
  // Hypothesis: trends are more reliable in calm regimes; stand aside when realized volatility is
  // above its own trailing median (risk-managed trend following).
  vol_filtered_trend(c, p) {
    const close = c.map((x) => x.c);
    const trend = sma(close, p.trend);
    const r = close.map((x, i) => (i ? Math.log(x / close[i - 1]) : 0));
    const vol = rollingStd(r, p.vol);
    return (i) => {
      if (!(close[i] > trend[i]) || !Number.isFinite(vol[i]) || i < p.lookback) return 0;
      const hist = vol.slice(i - p.lookback, i).filter(Number.isFinite).sort((a, b) => a - b);
      const median = hist[Math.floor(hist.length / 2)];
      return vol[i] <= median ? 1 : 0;
    };
  },
  // Hypothesis: use trend rules when the market trends and dip-buying when it ranges, chosen by
  // the efficiency ratio measured on data up to the decision bar only.
  regime_switch(c, p) {
    const close = c.map((x) => x.c);
    const er = efficiencyRatio(close, p.er);
    const trend = sma(close, p.trend);
    const m = sma(close, p.n);
    const sd = rollingStd(close, p.n);
    let mode: 'trend' | 'revert' | null = null;
    let held = 0;
    return (i, pos) => {
      if (pos === 0) {
        held = 0;
        if (er[i] >= p.erTrend && close[i] > trend[i]) { mode = 'trend'; return 1; }
        if (er[i] < p.erTrend && close[i] < m[i] - p.k * sd[i]) { mode = 'revert'; return 1; }
        return 0;
      }
      held++;
      if (mode === 'trend') return close[i] < trend[i] ? 0 : 1;
      return close[i] >= m[i] || held >= p.maxHold ? 0 : 1;
    };
  },
  // Hypothesis (pre-registered 2026-11-24): a slow trend filter checked only once a week captures
  // multi-week moves (median weekly move ≈ 5× round-trip cost) with few trades.
  weekly_trend(c, p) {
    const close = c.map((x) => x.c);
    const m = sma(close, p.n);
    return (i, pos) => (rebalanceDay(c, i, p.period) ? (close[i] > m[i] ? 1 : 0) : pos);
  },
  // Hypothesis (pre-registered 2026-11-24): time-series momentum over months, rebalanced every 4 weeks.
  monthly_momentum(c, p) {
    return (i, pos) =>
      rebalanceDay(c, i, p.period) ? (i >= p.lookback && c[i].c / c[i - p.lookback].c - 1 > 0 ? 1 : 0) : pos;
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
  return Math.max(p.slow ?? 0, p.entry ?? 0, p.exit ?? 0, p.lookback ?? 0, p.filter ?? 0, p.n ?? 0, p.trend ?? 0, p.er ?? 0, p.vol ?? 0) + 1;
}

/**
 * Dependency horizon in bars (audit 4.1): how far back the decision at bar i can depend on data, including
 * nested rolling windows (a window over another rolling statistic adds both lengths), the memory of
 * exponential smoothing (Wilder RSI: 4n bars ≈ 98% of the weight) and stateful holds (a position opened
 * up to maxHold / one rebalance period earlier is still determined by data from that time).
 * Used as warm-up and as the walk-forward embargo; never shorter than warmup().
 */
export function dependencyHorizon(spec: StrategySpec): number {
  const p = spec.params;
  const h = (() => {
    switch (spec.family) {
      case 'sma_cross': return p.slow;
      case 'donchian_breakout': return Math.max(p.entry, p.exit);
      case 'ts_momentum': return p.lookback;
      case 'trend_filtered_momentum': return Math.max(p.lookback, p.filter);
      case 'bollinger_reversion': return p.n + p.maxHold;
      case 'rsi_reversion': return 4 * p.n + p.maxHold;
      case 'vol_compression_breakout': return p.lookback + p.n;
      case 'vol_filtered_trend': return Math.max(p.trend, p.lookback + p.vol);
      case 'regime_switch': return Math.max(p.er, p.trend, p.n) + p.maxHold;
      case 'weekly_trend': return p.n + p.period;
      case 'monthly_momentum': return p.lookback + p.period;
    }
  })();
  return Math.max(warmup(spec), h + 1);
}

/** Small, pre-declared parameter grids. Kept deliberately coarse to limit data snooping. */
export const PARAM_GRID: Record<StrategyFamily, Record<string, number>[]> = {
  sma_cross: cartesian({ fast: [10, 20, 50], slow: [100, 200] }),
  donchian_breakout: cartesian({ entry: [20, 55], exit: [10, 20] }),
  ts_momentum: cartesian({ lookback: [24, 72, 168], threshold: [0] }),
  trend_filtered_momentum: cartesian({ lookback: [24, 72], filter: [200] }),
  bollinger_reversion: cartesian({ n: [20, 50], k: [2, 2.5], maxHold: [24] }),
  rsi_reversion: cartesian({ n: [14], lo: [25, 30], hi: [55], maxHold: [24] }),
  vol_compression_breakout: cartesian({ n: [20], lookback: [120], pct: [0.1, 0.2] }),
  vol_filtered_trend: cartesian({ trend: [50, 100], vol: [20], lookback: [250] }),
  regime_switch: cartesian({ er: [20], erTrend: [0.3, 0.4], trend: [50], n: [20], k: [2], maxHold: [20] }),
  weekly_trend: cartesian({ n: [100, 200], period: [7] }),
  monthly_momentum: cartesian({ lookback: [90, 180], period: [28] })
};

/** Families defined only for daily bars (multi-day horizons); never run on intraday data. */
export const DAILY_ONLY: ReadonlySet<StrategyFamily> = new Set<StrategyFamily>(['weekly_trend', 'monthly_momentum']);
export const familyAllowed = (f: StrategyFamily, intervalMs: number) => !DAILY_ONLY.has(f) || intervalMs === DAY_MS;

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
