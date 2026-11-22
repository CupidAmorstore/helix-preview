import type { BacktestResult, Candle, CandidateStatus, CostModel, StrategyFamily, StrategySpec } from './types';
import { backtest } from './backtest';
import { PARAM_GRID, neighbours, specKey, warmup } from './strategies';
import { scaleCosts } from './costs';
import { bootstrapMeanCI, profitFactor, winRate } from './stats';

/**
 * Qualification gates. Fixed BEFORE looking at results and version-controlled.
 * Changing them requires a documented decision in docs/trading-bot/RISK_POLICY.md — never to rescue a candidate.
 */
export const GATES = {
  version: 'gates-v1',
  split: { train: 0.5, validation: 0.25, test: 0.25 },
  minTradesValidation: 15,
  minTradesTest: 15,
  minTradesOos: 30,
  familyAlpha: 0.05, // two-sided, Bonferroni-adjusted by number of OOS candidates
  maxTestDrawdown: 0.25,
  costStressFactor: 2,
  delayStressBars: 1,
  minNeighbourPassShare: 0.5
} as const;

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
  const maxWarm = Math.max(...grid.map((p) => warmup({ family, params: p })));
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
  for (const params of grid) {
    const spec = { family, params };
    const r = run(spec, s.trainStart, s.trainEnd);
    if (!best || better(r, best.r)) best = { spec, r };
  }
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

  const v = run(spec, s.trainEnd, s.valEnd);
  report.validation = metrics(v);
  if (v.trades.length < GATES.minTradesValidation)
    reject(`validation trades ${v.trades.length} < ${GATES.minTradesValidation}`);
  if (v.netReturn <= 0) reject('validation net return <= 0 after costs');

  const nb = neighbours(family, spec.params);
  const nbPass = nb.filter((p) => run({ family, params: p }, s.trainEnd, s.valEnd).netReturn > 0).length;
  const nbShare = nb.length ? nbPass / nb.length : 0;

  // The test window is only "opened" for candidates that survived validation.
  if (report.status === 'rejected') {
    report.stress = { doubleCostTestNet: NaN, delayedTestNet: NaN, neighbourPassShare: nbShare };
    return report;
  }

  const t = run(spec, s.valEnd, s.testEnd);
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
  const ci = bootstrapMeanCI(oos, alpha);
  report.ci = { ...ci, alpha, n: oos.length };
  if (oos.length < GATES.minTradesOos) reject(`out-of-sample trades ${oos.length} < ${GATES.minTradesOos}`);
  if (!(ci.lo > 0)) reject('bootstrap lower bound of mean OOS trade return <= 0 (multiple-testing adjusted)');

  if (report.status !== 'rejected') report.status = 'qualified_paper_strategy';
  return report;
}
