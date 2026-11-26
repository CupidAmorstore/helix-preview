import type { BacktestResult, Candle, CandidateStatus, CostModel, StrategyFamily, StrategySpec } from './types';
import { backtest } from './backtest';
import { PARAM_GRID, dependencyHorizon, neighbours, specKey } from './strategies';
import { walkForwardCore, walkForwardRejections, type WalkForward } from './walkForward';
export type { WalkForward } from './walkForward';
import { scaleCosts } from './costs';
import { bootstrapMeanCI, monthlyInference, windowCompleteMonths, profitFactor, requiredBootstrapIterations, winRate, MAX_BOOTSTRAP_ITERATIONS, type Inference } from './stats';

/**
 * Qualification gates. Fixed BEFORE looking at results and version-controlled.
 * Changing them requires a documented decision in docs/trading-bot/RISK_POLICY.md — never to rescue a candidate.
 */
export const GATES = {
  // v2 = v1 + walk-forward re-estimation with embargo.
  // v3 (2026-11-25, independent audit AUD-201..208) = v2 + walk-forward mandatory and fail-closed for EVERY
  // evaluator, embargo = full dependency horizon, final liquidation in drawdown, event-driven capital-aware
  // cross-sectional simulation, dependence-aware inference on monthly portfolio returns with an explicit
  // tail-resolution policy, cross-category holdout provenance. Nothing relaxed.
  version: 'gates-v4', // v4 (P0 2026-11-26): monthly inference on complete calendar months only
  split: { train: 0.5, validation: 0.25, test: 0.25 },
  minTradesValidation: 15,
  minTradesTest: 15,
  minTradesOos: 30,
  familyAlpha: 0.05, // two-sided, Bonferroni-adjusted by number of OOS candidates
  maxTestDrawdown: 0.25,
  costStressFactor: 2,
  delayStressBars: 1,
  minNeighbourPassShare: 0.5,
  walkForwardFolds: 4,
  /** at least this share of walk-forward folds must be profitable after costs */
  minWalkForwardPositiveShare: 0.5,
  /** minimum calendar months of out-of-sample (validation + test) portfolio returns for inference */
  minOosMonths: 12
} as const;

/**
 * Single-market walk-forward on bar indices (see walkForward.ts). Fold/training bounds are reported as
 * candle timestamps. Fail-closed: use walkForwardRejections() on the result.
 */
export function walkForward(
  candles: Candle[],
  family: StrategyFamily,
  cost: CostModel,
  s: Split,
  embargo: number,
  select: (a: number, b: number) => StrategySpec,
  folds: number = GATES.walkForwardFolds
): WalkForward {
  const wf = walkForwardCore(
    { trainStart: s.trainStart, valEnd: Math.min(s.valEnd, candles.length), embargo, folds, step: 1 },
    (a, b) => select(a, b).params,
    (params, a, b) => {
      const r = backtest(candles, { family, params }, { start: a, end: b, cost, capitalUsd: CAPITAL });
      return { netReturn: r.netReturn, trades: r.trades.length };
    }
  );
  const t = (i: number) => candles[Math.max(0, Math.min(i, candles.length - 1))]?.t ?? NaN;
  return {
    ...wf,
    folds: wf.folds.map((f) => ({ ...f, from: t(f.from), to: t(f.to - 1), trainFrom: t(f.trainFrom), trainTo: t(f.trainTo - 1) }))
  };
}

export type Split = { trainStart: number; trainEnd: number; valEnd: number; testEnd: number };

export function chronologicalSplit(n: number, warm: number): Split {
  const usable = n - warm;
  const trainEnd = warm + Math.floor(usable * GATES.split.train);
  const valEnd = trainEnd + Math.floor(usable * GATES.split.validation);
  return { trainStart: warm, trainEnd, valEnd, testEnd: n };
}

export type WindowMetrics = {
  trades: number;
  grossReturn: number;
  netReturn: number;
  totalCostUsd: number;
  maxDrawdown: number;
  profitFactor: number | null;
  winRate: number | null;
  exposure: number;
  buyHoldReturn: number;
  meanTradeNet: number | null;
  rejectedOrders: number;
};

function metrics(r: BacktestResult): WindowMetrics {
  return {
    trades: r.trades.length,
    grossReturn: r.grossReturn,
    netReturn: r.netReturn,
    totalCostUsd: r.totalCostUsd,
    maxDrawdown: r.maxDrawdown,
    profitFactor: profitFactor(r.trades),
    winRate: winRate(r.trades),
    exposure: r.exposure,
    buyHoldReturn: r.buyHoldReturn,
    meanTradeNet: r.trades.length ? r.trades.reduce((a, t) => a + t.netRet, 0) / r.trades.length : null,
    rejectedOrders: r.rejectedOrders
  };
}

export type CandidateReport = {
  key: string;
  spec: StrategySpec;
  status: CandidateStatus;
  rejectionReasons: string[];
  train: WindowMetrics;
  validation?: WindowMetrics;
  test?: WindowMetrics;
  stress?: { doubleCostTestNet: number; delayedTestNet: number; neighbourPassShare: number };
  ci?: { lo: number; hi: number; mean: number; alpha: number; n: number };
  periods: { train: [number, number]; validation: [number, number]; test: [number, number] };
  configsTriedOnTrain: number;
  walkForward?: WalkForward;
  inference?: Inference;
};

const CAPITAL = 1000; // research normalisation; account-size feasibility is evaluated separately

/**
 * Stage 2–5 for one market/family:
 *   train: evaluate every grid config, select best by TRAIN net return only
 *   validation: selected config must pass
 *   test: untouched until validation passes; must pass incl. stresses
 *   statistics: bootstrap CI over OOS trades with Bonferroni-adjusted alpha
 */
export function evaluateFamily(
  candles: Candle[],
  family: StrategyFamily,
  cost: CostModel,
  oosCandidatesInRun: number
): CandidateReport {
  const grid = PARAM_GRID[family];
  const maxWarm = Math.max(...grid.map((p) => dependencyHorizon({ family, params: p })));
  const s = chronologicalSplit(candles.length, maxWarm);
  const run = (spec: StrategySpec, a: number, b: number, c: CostModel = cost, delayBars = 0) =>
    backtest(candles, spec, { start: a, end: b, cost: c, capitalUsd: CAPITAL, delayBars });

  // Selection uses TRAIN data only. Configs with too few train trades to ever pass the OOS trade gates are
  // ranked below testable ones (train window is 2x validation, so require 2x the validation minimum).
  const minTrainTrades = GATES.minTradesValidation * 2;
  let best: { spec: StrategySpec; r: BacktestResult } | null = null;
  const better = (a: BacktestResult, b: BacktestResult) => {
    const ta = a.trades.length >= minTrainTrades;
    const tb = b.trades.length >= minTrainTrades;
    if (ta !== tb) return ta;
    return a.netReturn > b.netReturn;
  };
  const selectOn = (a: number, b: number) => {
    let top: { spec: StrategySpec; r: BacktestResult } | null = null;
    for (const params of grid) {
      const sp = { family, params };
      const r = run(sp, a, b);
      if (!top || better(r, top.r)) top = { spec: sp, r };
    }
    return top!;
  };
  best = selectOn(s.trainStart, s.trainEnd);
  const spec = best!.spec;
  const tc = (i: number) => candles[Math.min(i, candles.length - 1)].t;
  const report: CandidateReport = {
    key: specKey(spec),
    spec,
    status: 'backtested_candidate',
    rejectionReasons: [],
    train: metrics(best!.r),
    periods: {
      train: [tc(s.trainStart), tc(s.trainEnd - 1)],
      validation: [tc(s.trainEnd), tc(s.valEnd - 1)],
      test: [tc(s.valEnd), tc(s.testEnd - 1)]
    },
    configsTriedOnTrain: grid.length
  };
  const reject = (why: string) => {
    report.rejectionReasons.push(why);
    report.status = 'rejected';
  };

  if (best!.r.netReturn <= 0) reject('best training config is not profitable after costs');

  const v = backtest(candles, spec, { start: s.trainEnd, end: s.valEnd, cost, capitalUsd: CAPITAL, recordEquity: true });
  report.validation = metrics(v);
  if (v.trades.length < GATES.minTradesValidation)
    reject(`validation trades ${v.trades.length} < ${GATES.minTradesValidation}`);
  if (v.netReturn <= 0) reject('validation net return <= 0 after costs');

  // walk-forward re-estimation (pre-test data only, embargoed by the longest indicator look-back)
  const wf = walkForward(candles, family, cost, s, maxWarm, (a, b) => selectOn(a, b).spec);
  report.walkForward = wf;
  for (const why of walkForwardRejections(wf, GATES.minWalkForwardPositiveShare)) reject(why);

  const nb = neighbours(family, spec.params);
  const nbPass = nb.filter((p) => run({ family, params: p }, s.trainEnd, s.valEnd).netReturn > 0).length;
  const nbShare = nb.length ? nbPass / nb.length : 0;

  // The test window is only "opened" for candidates that survived validation.
  if ((report.status as CandidateStatus) === 'rejected') {
    report.stress = { doubleCostTestNet: NaN, delayedTestNet: NaN, neighbourPassShare: nbShare };
    return report;
  }

  const t = backtest(candles, spec, { start: s.valEnd, end: s.testEnd, cost, capitalUsd: CAPITAL, recordEquity: true });
  report.test = metrics(t);
  const t2 = run(spec, s.valEnd, s.testEnd, scaleCosts(cost, GATES.costStressFactor));
  const td = run(spec, s.valEnd, s.testEnd, cost, GATES.delayStressBars);
  report.stress = { doubleCostTestNet: t2.netReturn, delayedTestNet: td.netReturn, neighbourPassShare: nbShare };

  if (t.trades.length < GATES.minTradesTest) reject(`test trades ${t.trades.length} < ${GATES.minTradesTest}`);
  if (t.netReturn <= 0) reject('test net return <= 0 after costs');
  // profit factor is undefined (null) when there are no losing trades; that passes only if there are winners
  const pf = report.test.profitFactor;
  const pfOk = pf === null ? t.trades.some((x) => x.netRet > 0) : pf > 1;
  if (!pfOk) reject('test profit factor <= 1');
  if (t.maxDrawdown > GATES.maxTestDrawdown) reject(`test max drawdown ${(t.maxDrawdown * 100).toFixed(1)}% > 25%`);
  if (t2.netReturn <= 0) reject('fails 2x cost stress');
  if (td.netReturn <= 0) reject('fails +1 bar execution delay stress');
  if (nbShare < GATES.minNeighbourPassShare) reject('parameter neighbours unstable on validation');

  const oos = [...v.trades, ...t.trades].map((x) => x.netRet);
  const alpha = GATES.familyAlpha / Math.max(1, oosCandidatesInRun);
  const ci = bootstrapMeanCI(oos, alpha, Math.min(MAX_BOOTSTRAP_ITERATIONS, requiredBootstrapIterations(alpha)));
  report.ci = { ...ci, alpha, n: oos.length };
  if (oos.length < GATES.minTradesOos) reject(`out-of-sample trades ${oos.length} < ${GATES.minTradesOos}`);
  if (!(ci.lo > 0)) reject('bootstrap lower bound of mean OOS trade return <= 0 (multiple-testing adjusted)');
  // AUD-205: dependence-aware inference on monthly equity returns (trades are not independent)
  const monthly = [...windowCompleteMonths(v.equity ?? [], CAPITAL), ...windowCompleteMonths(t.equity ?? [], CAPITAL)].map((m) => m.ret);
  report.inference = monthlyInference(monthly, alpha, GATES.minOosMonths);
  for (const why of report.inference.reasons) reject(why);

  if (report.status !== 'rejected') report.status = 'qualified_paper_strategy';
  return report;
}

// ---------------------------------------------------------------------------------------------
// Pooled (universe) evaluation: ONE rule applied to every market, equal-weight, COMMON calendar
// cut-offs (no market's test period may overlap another market's training period).
// Cross-market correlation is handled with a block bootstrap over calendar months.
// ---------------------------------------------------------------------------------------------

export type PooledReport = {
  key: string;
  spec: StrategySpec;
  status: CandidateStatus;
  rejectionReasons: string[];
  markets: string[];
  cutoffs: { trainStart: number; trainEnd: number; valEnd: number; testEnd: number };
  train: PooledWindow;
  validation?: PooledWindow;
  test?: PooledWindow;
  stress?: { doubleCostTestNet: number; delayedTestNet: number; neighbourPassShare: number };
  ci?: { lo: number; hi: number; mean: number; alpha: number; n: number; blocks: number };
  configsTriedOnTrain: number;
  walkForward?: WalkForward;
  inference?: Inference;
};

export type PooledWindow = {
  trades: number;
  netReturn: number; // equal-weight portfolio
  grossReturn: number;
  buyHoldReturn: number;
  maxDrawdownBound: number; // max single-market DD — an upper bound on the equal-weight portfolio DD
  profitFactor: number | null;
  winRate: number | null;
  totalCostUsd: number;
  perMarketNet: Record<string, number>;
};

type Series = { symbol: string; candles: Candle[] };

function indexAtOrAfter(c: Candle[], t: number): number {
  let lo = 0;
  let hi = c.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (c[m].t < t) lo = m + 1;
    else hi = m;
  }
  return lo;
}

/** Common calendar cut-offs from the period ALL markets cover (after warm-up). */
export function commonCutoffs(series: Series[], warm: number, intervalMs: number) {
  const start = Math.max(...series.map((s) => s.candles[Math.min(warm, s.candles.length - 1)].t));
  const end = Math.min(...series.map((s) => s.candles[s.candles.length - 1].t)) + intervalMs;
  const span = end - start;
  const trainEnd = start + Math.floor(span * GATES.split.train / intervalMs) * intervalMs;
  const valEnd = trainEnd + Math.floor(span * GATES.split.validation / intervalMs) * intervalMs;
  return { trainStart: start, trainEnd, valEnd, testEnd: end };
}

function pooledWindow(
  series: Series[],
  spec: StrategySpec,
  a: number,
  b: number,
  cost: CostModel,
  delayBars = 0,
  recordEquity = false
): { w: PooledWindow; trades: BacktestResult['trades']; equity?: { t: number; v: number }[] } {
  const all: BacktestResult['trades'] = [];
  const curves: { t: number; v: number }[][] = [];
  const per: Record<string, number> = {};
  let net = 0;
  let gross = 0;
  let bh = 0;
  let dd = 0;
  let costUsd = 0;
  for (const s of series) {
    const r = backtest(s.candles, spec, {
      start: indexAtOrAfter(s.candles, a),
      end: indexAtOrAfter(s.candles, b),
      cost,
      capitalUsd: CAPITAL / series.length,
      delayBars,
      recordEquity
    });
    if (r.equity) curves.push(r.equity);
    per[s.symbol] = r.netReturn;
    net += r.netReturn / series.length;
    gross += r.grossReturn / series.length;
    bh += r.buyHoldReturn / series.length;
    dd = Math.max(dd, r.maxDrawdown);
    costUsd += r.totalCostUsd;
    all.push(...r.trades);
  }
  // equal-weight portfolio curve: sum of per-market equity; a market without a bar at a timestamp keeps its
  // last value (its own capital before its first bar). Values are carried, prices are never filled.
  let equity: { t: number; v: number }[] | undefined;
  if (recordEquity) {
    const ts = [...new Set(curves.flatMap((c) => c.map((p) => p.t)))].sort((x, y) => x - y);
    const idx = curves.map(() => 0);
    const lastV = curves.map(() => CAPITAL / series.length);
    equity = ts.map((t) => {
      curves.forEach((c, k) => { while (idx[k] < c.length && c[idx[k]].t <= t) lastV[k] = c[idx[k]++].v; });
      return { t, v: lastV.reduce((a, b) => a + b, 0) + (series.length - curves.length) * (CAPITAL / series.length) };
    });
  }
  return {
    equity,
    w: {
      trades: all.length,
      netReturn: net,
      grossReturn: gross,
      buyHoldReturn: bh,
      maxDrawdownBound: dd,
      profitFactor: profitFactor(all),
      winRate: winRate(all),
      totalCostUsd: costUsd,
      perMarketNet: per
    },
    trades: all
  };
}

/** Block bootstrap of mean trade return, blocks = calendar month of trade entry. */
export function monthBlockBootstrap(trades: { entryT: number; netRet: number }[], alpha: number, iterations = 4000, seed = 7) {
  const blocks = new Map<string, number[]>();
  for (const t of trades) {
    const d = new Date(t.entryT);
    const k = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    blocks.set(k, [...(blocks.get(k) ?? []), t.netRet]);
  }
  const B = [...blocks.values()];
  if (B.length < 3) return { lo: NaN, hi: NaN, mean: NaN, blocks: B.length };
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const means: number[] = [];
  for (let i = 0; i < iterations; i++) {
    let s = 0;
    let n = 0;
    for (let j = 0; j < B.length; j++) {
      const blk = B[Math.floor(rnd() * B.length)];
      for (const x of blk) s += x;
      n += blk.length;
    }
    means.push(n ? s / n : 0);
  }
  means.sort((x, y) => x - y);
  const q = (p: number) => means[Math.min(iterations - 1, Math.max(0, Math.floor(p * iterations)))];
  const all = trades.map((t) => t.netRet);
  return { lo: q(alpha / 2), hi: q(1 - alpha / 2), mean: all.reduce((x, y) => x + y, 0) / all.length, blocks: B.length };
}

export function evaluatePooled(
  series: Series[],
  family: StrategyFamily,
  cost: CostModel,
  intervalMs: number,
  oosCandidatesInRun: number
): PooledReport {
  const grid = PARAM_GRID[family];
  const warm = Math.max(...grid.map((p) => dependencyHorizon({ family, params: p })));
  const cut = commonCutoffs(series, warm, intervalMs);
  const minTrainTrades = GATES.minTradesValidation * 2;
  const selectOn = (a: number, b: number) => {
    let top: { spec: StrategySpec; w: PooledWindow } | null = null;
    for (const params of grid) {
      const sp = { family, params };
      const { w } = pooledWindow(series, sp, a, b, cost);
      const ok = w.trades >= minTrainTrades;
      const topOk = top ? top.w.trades >= minTrainTrades : false;
      if (!top || (ok && !topOk) || (ok === topOk && w.netReturn > top.w.netReturn)) top = { spec: sp, w };
    }
    return top!;
  };
  const best = selectOn(cut.trainStart, cut.trainEnd);
  const spec = best.spec;
  const rep: PooledReport = {
    key: `POOLED:${specKey(spec)}`,
    spec,
    status: 'backtested_candidate',
    rejectionReasons: [],
    markets: series.map((s) => s.symbol),
    cutoffs: cut,
    train: best.w,
    configsTriedOnTrain: grid.length
  };
  const reject = (why: string) => {
    rep.rejectionReasons.push(why);
    rep.status = 'rejected';
  };
  if (best.w.netReturn <= 0) reject('best pooled training config is not profitable after costs');
  const v = pooledWindow(series, spec, cut.trainEnd, cut.valEnd, cost, 0, true);
  rep.validation = v.w;
  if (v.w.trades < GATES.minTradesValidation) reject(`validation trades ${v.w.trades} < ${GATES.minTradesValidation}`);
  if (v.w.netReturn <= 0) reject('pooled validation net return <= 0 after costs');
  // AUD-201: walk-forward on the common calendar (times), embargo = dependency horizon in calendar time
  const wf = walkForwardCore(
    { trainStart: cut.trainStart, valEnd: cut.valEnd, embargo: warm * intervalMs, folds: GATES.walkForwardFolds, step: intervalMs },
    (a, b) => selectOn(a, b).spec.params,
    (params, a, b) => { const { w } = pooledWindow(series, { family, params }, a, b, cost); return { netReturn: w.netReturn, trades: w.trades }; }
  );
  rep.walkForward = wf;
  for (const why of walkForwardRejections(wf, GATES.minWalkForwardPositiveShare)) reject(why);
  const nb = neighbours(family, spec.params);
  const nbShare = nb.length
    ? nb.filter((p) => pooledWindow(series, { family, params: p }, cut.trainEnd, cut.valEnd, cost).w.netReturn > 0).length / nb.length
    : 0;
  if ((rep.status as CandidateStatus) === 'rejected') {
    rep.stress = { doubleCostTestNet: NaN, delayedTestNet: NaN, neighbourPassShare: nbShare };
    return rep;
  }
  const t = pooledWindow(series, spec, cut.valEnd, cut.testEnd, cost, 0, true);
  rep.test = t.w;
  const t2 = pooledWindow(series, spec, cut.valEnd, cut.testEnd, scaleCosts(cost, GATES.costStressFactor)).w;
  const td = pooledWindow(series, spec, cut.valEnd, cut.testEnd, cost, GATES.delayStressBars).w;
  rep.stress = { doubleCostTestNet: t2.netReturn, delayedTestNet: td.netReturn, neighbourPassShare: nbShare };
  if (t.w.trades < GATES.minTradesTest) reject(`test trades ${t.w.trades} < ${GATES.minTradesTest}`);
  if (t.w.netReturn <= 0) reject('pooled test net return <= 0 after costs');
  const pf = t.w.profitFactor;
  if (!(pf === null ? t.trades.some((x) => x.netRet > 0) : pf > 1)) reject('test profit factor <= 1');
  if (t.w.maxDrawdownBound > GATES.maxTestDrawdown) reject(`test drawdown bound ${(t.w.maxDrawdownBound * 100).toFixed(1)}% > 25%`);
  if (t2.netReturn <= 0) reject('fails 2x cost stress');
  if (td.netReturn <= 0) reject('fails +1 bar execution delay stress');
  if (nbShare < GATES.minNeighbourPassShare) reject('parameter neighbours unstable on validation');
  const oos = [...v.trades, ...t.trades];
  const alpha = GATES.familyAlpha / Math.max(1, oosCandidatesInRun);
  const ci = monthBlockBootstrap(oos, alpha, Math.min(MAX_BOOTSTRAP_ITERATIONS, requiredBootstrapIterations(alpha)));
  rep.ci = { ...ci, alpha, n: oos.length };
  if (oos.length < GATES.minTradesOos) reject(`out-of-sample trades ${oos.length} < ${GATES.minTradesOos}`);
  if (!(ci.lo > 0)) reject('month-block bootstrap lower bound of mean OOS trade <= 0 (multiple-testing adjusted)');
  // AUD-205: synchronized monthly portfolio returns
  const monthly = [...windowCompleteMonths(v.equity ?? [], CAPITAL), ...windowCompleteMonths(t.equity ?? [], CAPITAL)].map((m) => m.ret);
  rep.inference = monthlyInference(monthly, alpha, GATES.minOosMonths);
  for (const why of rep.inference.reasons) reject(why);
  if (rep.status !== 'rejected') rep.status = 'qualified_paper_strategy';
  return rep;
}
