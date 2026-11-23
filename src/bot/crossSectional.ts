// Cross-sectional momentum (portfolio rule), evaluated with the same gates as single-coin rules.
// Hypothesis: coins that outperformed their peers over the last weeks tend to keep outperforming for
// a while; an absolute-momentum filter (only hold coins with a positive lookback return) keeps the
// portfolio in cash during broad declines. Weekly rebalancing keeps fee drag low for small accounts.
import type { Candle, CandidateStatus, CostModel } from './types';
import { GATES, commonCutoffs, monthBlockBootstrap } from './validation';
import { scaleCosts, sideCostFrac } from './costs';

export type XsParams = { lookback: number; topK: number; rebalance: number };
export const XS_GRID: XsParams[] = [7, 14, 28].flatMap((lookback) => [1, 2, 3].map((topK) => ({ lookback, topK, rebalance: 7 })));

type Series = { symbol: string; candles: Candle[] };

export type XsWindow = { periods: number; trades: number; netReturn: number; grossReturn: number; maxDrawdown: number; buyHoldReturn: number; periodReturns: { entryT: number; netRet: number }[] };

export type XsReport = {
  key: string;
  params: XsParams;
  status: CandidateStatus;
  rejectionReasons: string[];
  cutoffs: { trainStart: number; trainEnd: number; valEnd: number; testEnd: number };
  train: XsWindow;
  validation?: XsWindow;
  test?: XsWindow;
  stress?: { doubleCostTestNet: number; delayedTestNet: number; neighbourPassShare: number };
  ci?: { lo: number; hi: number; mean: number; alpha: number; n: number; blocks: number };
  configsTriedOnTrain: number;
};

/** Align all series on a common daily calendar (only days every market has). */
function align(series: Series[]) {
  const sets = series.map((s) => new Map(s.candles.map((k) => [k.t, k])));
  const days = [...sets[0].keys()].filter((t) => sets.every((m) => m.has(t))).sort((a, b) => a - b);
  return { days, rows: days.map((t) => sets.map((m) => m.get(t)!)) };
}

/**
 * Simulate the portfolio between two calendar cut-offs. Decision at the close of a rebalance day using
 * closes up to that day; trades at the next day's open; held until the next rebalance's following open.
 */
export function simulateXs(series: Series[], p: XsParams, from: number, to: number, cost: CostModel, delay = 0): XsWindow {
  const { days, rows } = align(series);
  const side = sideCostFrac(cost);
  let equity = 1;
  let peak = 1;
  let maxDd = 0;
  let held: number[] = [];
  let trades = 0;
  let gross = 1;
  const periodReturns: { entryT: number; netRet: number }[] = [];
  const start = days.findIndex((t) => t >= from);
  const end = days.findIndex((t) => t >= to);
  const last = end === -1 ? days.length - 1 : end - 1;
  if (start < 0) return { periods: 0, trades: 0, netReturn: 0, grossReturn: 0, maxDrawdown: 0, buyHoldReturn: 0, periodReturns };
  for (let i = Math.max(start, p.lookback); i + 1 + delay < last; i += p.rebalance) {
    const ret = rows[i].map((k, j) => k.c / rows[i - p.lookback][j].c - 1);
    const pick = ret.map((r, j) => [r, j] as const).filter(([r]) => r > 0).sort((a, b) => b[0] - a[0]).slice(0, p.topK).map(([, j]) => j);
    const enterAt = i + 1 + delay;
    const exitAt = Math.min(i + p.rebalance + 1 + delay, last);
    // turnover cost: positions leaving and entering (equal weights of 1/topK)
    const leaving = held.filter((j) => !pick.includes(j)).length;
    const entering = pick.filter((j) => !held.includes(j)).length;
    trades += entering;
    const turnover = (leaving + entering) / p.topK;
    const periodGross = pick.length ? pick.reduce((s, j) => s + rows[exitAt][j].o / rows[enterAt][j].o - 1, 0) / p.topK : 0;
    const net = (1 + periodGross) * (1 - turnover * side) - 1;
    gross *= 1 + periodGross;
    equity *= 1 + net;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, (peak - equity) / peak);
    if (pick.length || held.length) periodReturns.push({ entryT: days[enterAt], netRet: net });
    held = pick;
  }
  const bh = series.length ? rows[last].reduce((s, k, j) => s + k.c / rows[start][j].c - 1, 0) / series.length : 0;
  return { periods: periodReturns.length, trades, netReturn: equity - 1, grossReturn: gross - 1, maxDrawdown: maxDd, buyHoldReturn: bh, periodReturns };
}

export function evaluateCrossSectional(series: Series[], cost: CostModel, intervalMs: number, oosCandidatesInRun: number): XsReport {
  const warm = Math.max(...XS_GRID.map((g) => g.lookback)) + 1;
  const cut = commonCutoffs(series, warm, intervalMs);
  let best: { p: XsParams; w: XsWindow } | null = null;
  for (const p of XS_GRID) {
    const w = simulateXs(series, p, cut.trainStart, cut.trainEnd, cost);
    const ok = w.trades >= GATES.minTradesValidation * 2;
    const bestOk = best ? best.w.trades >= GATES.minTradesValidation * 2 : false;
    if (!best || (ok && !bestOk) || (ok === bestOk && w.netReturn > best.w.netReturn)) best = { p, w };
  }
  const p = best!.p;
  const rep: XsReport = {
    key: `XS_MOMENTUM(lookback=${p.lookback},topK=${p.topK},rebalance=${p.rebalance})`,
    params: p, status: 'backtested_candidate', rejectionReasons: [], cutoffs: cut, train: best!.w, configsTriedOnTrain: XS_GRID.length
  };
  const reject = (why: string) => { rep.rejectionReasons.push(why); rep.status = 'rejected'; };
  if (best!.w.netReturn <= 0) reject('best training config is not profitable after costs');
  const v = simulateXs(series, p, cut.trainEnd, cut.valEnd, cost);
  rep.validation = v;
  if (v.trades < GATES.minTradesValidation) reject(`validation trades ${v.trades} < ${GATES.minTradesValidation}`);
  if (v.netReturn <= 0) reject('validation net return <= 0 after costs');
  const nb = XS_GRID.filter((g) => (g.lookback === p.lookback) !== (g.topK === p.topK));
  const nbShare = nb.filter((g) => simulateXs(series, g, cut.trainEnd, cut.valEnd, cost).netReturn > 0).length / Math.max(1, nb.length);
  if ((rep.status as CandidateStatus) === 'rejected') {
    rep.stress = { doubleCostTestNet: NaN, delayedTestNet: NaN, neighbourPassShare: nbShare };
    return rep;
  }
  const t = simulateXs(series, p, cut.valEnd, cut.testEnd, cost);
  rep.test = t;
  const t2 = simulateXs(series, p, cut.valEnd, cut.testEnd, scaleCosts(cost, GATES.costStressFactor)).netReturn;
  const td = simulateXs(series, p, cut.valEnd, cut.testEnd, cost, GATES.delayStressBars).netReturn;
  rep.stress = { doubleCostTestNet: t2, delayedTestNet: td, neighbourPassShare: nbShare };
  if (t.trades < GATES.minTradesTest) reject(`test trades ${t.trades} < ${GATES.minTradesTest}`);
  if (t.netReturn <= 0) reject('test net return <= 0 after costs');
  if (t.maxDrawdown > GATES.maxTestDrawdown) reject(`test drawdown ${(t.maxDrawdown * 100).toFixed(1)}% > 25%`);
  if (t2 <= 0) reject('fails 2x cost stress');
  if (td <= 0) reject('fails +1 bar execution delay stress');
  if (nbShare < GATES.minNeighbourPassShare) reject('parameter neighbours unstable on validation');
  const oos = [...v.periodReturns, ...t.periodReturns];
  const alpha = GATES.familyAlpha / Math.max(1, oosCandidatesInRun);
  const ci = monthBlockBootstrap(oos, alpha);
  rep.ci = { ...ci, alpha, n: oos.length };
  if (oos.length < GATES.minTradesOos) reject(`out-of-sample periods ${oos.length} < ${GATES.minTradesOos}`);
  if (!(ci.lo > 0)) reject('month-block bootstrap lower bound of mean period return <= 0 (multiple-testing adjusted)');
  if (rep.status !== 'rejected') rep.status = 'qualified_paper_strategy';
  return rep;
}
