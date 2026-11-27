// Verbatim copy of src/bot/crossSectional.ts at 886d4b2 (pre-audit), kept ONLY as a reference oracle for
// regression tests: at zero delay and zero fixed cost/minimum the event-driven simulator must match it.
// Cross-sectional momentum (portfolio rule), evaluated with the same gates as single-coin rules.
// Hypothesis: coins that outperformed their peers over the last weeks tend to keep outperforming for
// a while; an absolute-momentum filter (only hold coins with a positive lookback return) keeps the
// portfolio in cash during broad declines. Weekly rebalancing keeps fee drag low for small accounts.
import type { Candle, CandidateStatus, CostModel } from '../../../bot/types';
import { GATES, commonCutoffs, monthBlockBootstrap } from '../../../bot/validation';
import { scaleCosts, sideCostFrac } from '../../../bot/costs';

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
 * Portfolio simulation with real accounting (cash + quantities per coin), between two calendar cut-offs.
 * - Decision at the CLOSE of rebalance day i using closes <= i only; trades execute at the OPEN of day i+1(+delay).
 * - Target: equal weight 1/topK for each pick (fewer picks → the rest stays in cash). Weights drift between rebalances.
 * - Sells first (proceeds net of per-side cost), then buys from available cash (value received net of cost).
 * - Marked to market at every close for drawdown; everything liquidated (with cost) at the window's last open.
 * - periodReturns: equity change from one execution to the next (costs of that rebalance included).
 */
export function simulateXs(series: Series[], p: XsParams, from: number, to: number, cost: CostModel, delay = 0): XsWindow {
  const { days, rows } = align(series);
  const side = sideCostFrac(cost);
  const empty: XsWindow = { periods: 0, trades: 0, netReturn: 0, grossReturn: 0, maxDrawdown: 0, buyHoldReturn: 0, periodReturns: [] };
  const start = days.findIndex((t) => t >= from);
  const end = days.findIndex((t) => t >= to);
  const last = end === -1 ? days.length - 1 : end - 1;
  if (start < 0 || last <= start) return empty;
  const run = (c: number) => {
    const n = series.length;
    let cash = 1;
    const qty = new Array<number>(n).fill(0);
    let entries = 0;
    let peak = 1;
    let maxDd = 0;
    const periodReturns: { entryT: number; netRet: number }[] = [];
    let prevExecValue: number | null = null;
    let prevExecT = 0;
    const valueAt = (d: number, field: 'o' | 'c') => cash + qty.reduce((s, q, j) => s + q * rows[d][j][field], 0);
    const mark = (d: number) => { const v = valueAt(d, 'c'); peak = Math.max(peak, v); maxDd = Math.max(maxDd, (peak - v) / peak); };
    let nextDecision = Math.max(start, p.lookback);
    for (let d = start; d < last; d++) {
      mark(d); // holdings during day d (trades decided today execute at a later open)
      if (d === nextDecision && d + 1 + delay < last) {
        const e = d + 1 + delay;
        if (!(days[e] > days[d])) throw new Error('look-ahead: execution not after decision');
        const ret = rows[d].map((k, j) => k.c / rows[d - p.lookback][j].c - 1);
        const picks = ret.map((r, j) => [r, j] as const).filter(([r]) => r > 0).sort((a, b) => b[0] - a[0]).slice(0, p.topK).map(([, j]) => j);
        const V = valueAt(e, 'o');
        if (prevExecValue !== null) periodReturns.push({ entryT: prevExecT, netRet: V / prevExecValue - 1 });
        const target = (j: number) => (picks.includes(j) ? V / p.topK : 0);
        for (let j = 0; j < n; j++) {
          const cur = qty[j] * rows[e][j].o;
          if (cur > target(j) + 1e-12) {
            const sellVal = cur - target(j);
            qty[j] -= sellVal / rows[e][j].o;
            if (qty[j] < 1e-15) qty[j] = 0;
            cash += sellVal * (1 - c);
          }
        }
        for (const j of picks) {
          const cur = qty[j] * rows[e][j].o;
          const need = target(j) - cur;
          if (need <= 1e-12) continue;
          const spend = Math.min(cash, need / (1 - c));
          if (spend <= 0) continue;
          if (cur === 0) entries++;
          cash -= spend;
          qty[j] += (spend * (1 - c)) / rows[e][j].o;
        }
        // measured from the PRE-trade value so each period includes the costs of its own rebalance
        prevExecValue = V;
        prevExecT = days[e];
        nextDecision = d + p.rebalance;
      } else if (d === nextDecision) {
        nextDecision = Number.POSITIVE_INFINITY; // no room left to execute inside the window
      }
    }
    // final liquidation at the last open of the window
    for (let j = 0; j < n; j++) if (qty[j] > 0) { cash += qty[j] * rows[last][j].o * (1 - c); qty[j] = 0; }
    if (prevExecValue !== null) periodReturns.push({ entryT: prevExecT, netRet: cash / prevExecValue - 1 });
    peak = Math.max(peak, cash);
    maxDd = Math.max(maxDd, (peak - cash) / peak);
    return { equity: cash, entries, maxDd, periodReturns };
  };
  const net = run(side);
  const gross = run(0);
  const bh = rows[last].reduce((s, k, j) => s + k.o / rows[start][j].o - 1, 0) / series.length;
  return { periods: net.periodReturns.length, trades: net.entries, netReturn: net.equity - 1, grossReturn: gross.equity - 1, maxDrawdown: net.maxDd, buyHoldReturn: bh, periodReturns: net.periodReturns };
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
