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

// ------------------------------------------------------------------------------------------------
// AUD-205 — dependence-aware inference with an explicit tail-resolution policy.
//
// Unit of evidence: calendar-month returns of the strategy's (portfolio) equity curve over the
// out-of-sample windows. Monthly portfolio returns are synchronized across markets (one return per month
// for the whole portfolio), so correlated trades are not counted as independent observations, and a
// position spanning a month boundary contributes to each month it was held (no entry-month attribution).
//
// A candidate passes only if ALL hold:
//   1. at least GATES.minOosMonths months;
//   2. Student-t lower bound of the mean monthly return > 0 at the Bonferroni alpha, using an effective
//      sample size reduced for positive lag-1 autocorrelation n_eff = n(1-ρ)/(1+ρ);
//   3. for every block length L ∈ {1,2,3} months, a circular moving-block bootstrap lower bound > 0, where
//      the bootstrap uses enough resamples that at least MIN_TAIL_DRAWS land below the alpha/2 quantile,
//      and the bound is the conservative (99% binomial) order statistic below the nominal quantile.
// If the required resamples exceed MAX_BOOTSTRAP_ITERATIONS the result is "inconclusive" → rejected.
// ------------------------------------------------------------------------------------------------

export const MIN_TAIL_DRAWS = 100;
export const MAX_BOOTSTRAP_ITERATIONS = 2_000_000;

/** Resamples needed so that ~minTail draws fall below the two-sided alpha/2 quantile. */
export function requiredBootstrapIterations(alpha: number, minTail = MIN_TAIL_DRAWS): number {
  if (!(alpha > 0 && alpha < 1)) return Infinity;
  return Math.max(4000, Math.ceil(minTail / (alpha / 2)));
}

// log-gamma (Lanczos) and regularized incomplete beta (continued fraction) for the Student-t CDF
function lgamma(x: number): number {
  const g = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
  let a = 0.99999999999980993;
  const t = x + 7.5;
  for (let i = 0; i < 8; i++) a += g[i] / (x + i + 1);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 300, EPS = 3e-14, FPMIN = 1e-300;
  let c = 1, d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a - 1 + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + 1 + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
function ibeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}
/** Student-t CDF with (possibly non-integer) degrees of freedom df > 0. */
export function studentTCdf(t: number, df: number): number {
  const x = df / (df + t * t);
  const tail = 0.5 * ibeta(x, df / 2, 0.5);
  return t >= 0 ? 1 - tail : tail;
}
/** Upper quantile: q such that P(T <= q) = p (bisection; |q| < 1e6). */
export function studentTQuantile(p: number, df: number): number {
  if (!(p > 0 && p < 1) || !(df > 0)) return NaN;
  let lo = -1e6, hi = 1e6;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (studentTCdf(mid, df) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Compounded calendar-month (UTC) returns of an equity curve that starts at startValue. */
export function monthlyReturns(equity: { t: number; v: number }[], startValue: number): { month: string; ret: number }[] {
  const out: { month: string; ret: number }[] = [];
  let prev = startValue;
  let cur: string | null = null;
  let lastV = startValue;
  for (const p of equity) {
    const d = new Date(p.t);
    const m = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (cur !== null && m !== cur) {
      out.push({ month: cur, ret: prev > 0 ? lastV / prev - 1 : -1 });
      prev = lastV;
    }
    cur = m;
    lastV = p.v;
  }
  if (cur !== null) out.push({ month: cur, ret: prev > 0 ? lastV / prev - 1 : -1 });
  return out;
}

/**
 * P0: monthly returns restricted to COMPLETE calendar months inside [fromMs, toMs). The month containing `fromMs`
 * counts only if fromMs is its first instant; the month containing `toMs` counts only if toMs is the next month's
 * first instant. Returns stay chained (a month's base is the previous month's last mark), so nothing is lost —
 * partial months are just never counted as independent evidence.
 */
export function completeMonthlyReturns(equity: { t: number; v: number }[], startValue: number, fromMs: number, toMs: number): { month: string; ret: number }[] {
  const monthStart = (y: number, m: number) => Date.UTC(y, m, 1);
  return monthlyReturns(equity, startValue).filter(({ month }) => {
    const [y, m] = month.split('-').map(Number);
    return monthStart(y, m - 1) >= fromMs && monthStart(y, m) <= toMs;
  });
}

/**
 * gates-v4: complete calendar months of one evaluation window (bounds taken from its equity marks; the bar interval
 * is inferred from the last two marks). Concatenating validation + test windows no longer double-counts the
 * boundary month or counts partial months as independent observations.
 */
export function windowCompleteMonths(equity: { t: number; v: number }[], startValue: number): { month: string; ret: number }[] {
  if (equity.length < 2) return [];
  const iv = equity[equity.length - 1].t - equity[equity.length - 2].t;
  return completeMonthlyReturns(equity, startValue, equity[0].t, equity[equity.length - 1].t + iv);
}

export type Inference = {
  months: number;
  mean: number;
  rho1: number;
  nEff: number;
  tLower: number;
  bootstrap: { blockMonths: number; iterations: number; lo: number; loConservative: number }[];
  requiredIterations: number;
  pass: boolean;
  reasons: string[];
};

function circularBlockLower(xs: number[], L: number, alpha: number, iterations: number, seed: number) {
  const n = xs.length;
  const rnd = mulberry32(seed);
  const means = new Float64Array(iterations);
  const blocks = Math.ceil(n / L);
  for (let b = 0; b < iterations; b++) {
    let s = 0;
    let c = 0;
    for (let k = 0; k < blocks && c < n; k++) {
      const st = Math.floor(rnd() * n);
      for (let j = 0; j < L && c < n; j++, c++) s += xs[(st + j) % n];
    }
    means[b] = s / n;
  }
  means.sort();
  const k = Math.floor((alpha / 2) * iterations);
  const kc = Math.max(0, Math.floor(k - 2.576 * Math.sqrt(Math.max(k, 1))));
  return { lo: means[Math.min(iterations - 1, k)], loConservative: means[kc] };
}

/** Pass/fail inference on monthly OOS returns at a (Bonferroni-adjusted, two-sided) alpha. */
export function monthlyInference(monthly: number[], alpha: number, minMonths: number, seed = 11): Inference {
  const n = monthly.length;
  const reasons: string[] = [];
  const m = mean(monthly);
  const sd = stdev(monthly);
  let rho = 0;
  if (n >= 3 && sd > 0) {
    let num = 0;
    for (let i = 1; i < n; i++) num += (monthly[i] - m) * (monthly[i - 1] - m);
    rho = num / ((n - 1) * sd * sd);
  }
  const rhoPos = Math.min(0.95, Math.max(0, rho));
  const nEff = (n * (1 - rhoPos)) / (1 + rhoPos);
  const tq = nEff > 1 ? studentTQuantile(1 - alpha / 2, nEff - 1) : NaN;
  const tLower = nEff > 1 && sd > 0 ? m - (tq * sd) / Math.sqrt(nEff) : NaN;
  const required = requiredBootstrapIterations(alpha);
  const bootstrap: Inference['bootstrap'] = [];
  if (n < minMonths) reasons.push(`out-of-sample months ${n} < ${minMonths}: too little independent evidence`);
  if (!monthly.every(Number.isFinite)) reasons.push('non-finite monthly return');
  if (!(tLower > 0)) reasons.push('dependence-adjusted t lower bound of mean monthly return <= 0 (multiple-testing adjusted)');
  if (required > MAX_BOOTSTRAP_ITERATIONS) reasons.push(`bootstrap inconclusive: needs ${required} resamples for the alpha tail (> ${MAX_BOOTSTRAP_ITERATIONS})`);
  // the bootstrap is only computed when everything cheaper already passed (it is expensive at small alpha)
  if (!reasons.length) {
    for (const L of [1, 2, 3]) {
      const r = circularBlockLower(monthly, L, alpha, required, seed + L);
      bootstrap.push({ blockMonths: L, iterations: required, ...r });
      if (!(r.loConservative > 0)) reasons.push(`block bootstrap (${L}-month blocks) conservative lower bound <= 0`);
    }
  }
  return { months: n, mean: m, rho1: rho, nEff, tLower, bootstrap, requiredIterations: required, pass: reasons.length === 0, reasons };
}
