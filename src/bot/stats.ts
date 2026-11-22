import type { Trade } from './types';

/** Deterministic PRNG (mulberry32) so bootstrap results are reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}

export function stdev(xs: number[]): number {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

/**
 * Percentile bootstrap CI of the mean. `alpha` is the TWO-sided error rate, already adjusted for
 * multiple testing by the caller (e.g. Bonferroni alpha/m).
 */
export function bootstrapMeanCI(xs: number[], alpha: number, iterations = 4000, seed = 42) {
  if (xs.length < 2) return { lo: NaN, hi: NaN, mean: mean(xs) };
  const rnd = mulberry32(seed);
  const means = new Array<number>(iterations);
  for (let b = 0; b < iterations; b++) {
    let s = 0;
    for (let i = 0; i < xs.length; i++) s += xs[Math.floor(rnd() * xs.length)];
    means[b] = s / xs.length;
  }
  means.sort((a, b) => a - b);
  const q = (p: number) => means[Math.min(iterations - 1, Math.max(0, Math.floor(p * iterations)))];
  return { lo: q(alpha / 2), hi: q(1 - alpha / 2), mean: mean(xs) };
}

export function profitFactor(trades: Trade[]): number | null {
  const wins = trades.filter((t) => t.netRet > 0).reduce((a, t) => a + t.netRet * t.notional, 0);
  const losses = -trades.filter((t) => t.netRet < 0).reduce((a, t) => a + t.netRet * t.notional, 0);
  if (losses === 0) return null; // undefined: no losing trades (or no trades) — callers must handle explicitly
  return wins / losses;
}

export function winRate(trades: Trade[]): number | null {
  return trades.length ? trades.filter((t) => t.netRet > 0).length / trades.length : null;
}

/** Per-trade t-statistic of the mean net return (descriptive; trades are not iid). */
export function tStat(xs: number[]): number | null {
  if (xs.length < 3) return null;
  const s = stdev(xs);
  return s > 0 ? mean(xs) / (s / Math.sqrt(xs.length)) : null;
}
