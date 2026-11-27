// Cross-sectional momentum (portfolio rule), evaluated with the same gates as single-coin rules.
// Hypothesis: coins that outperformed their peers over the last weeks tend to keep outperforming for
// a while; an absolute-momentum filter (only hold coins with a positive lookback return) keeps the
// portfolio in cash during broad declines. Weekly rebalancing keeps fee drag low for small accounts.
import type { Candle, CandidateStatus, CostModel } from './types';
import { GATES, commonCutoffs, monthBlockBootstrap } from './validation';
import { scaleCosts, sideCostFrac } from './costs';
import { exitProceeds } from './backtest';
import { monthlyInference, windowCompleteMonths, requiredBootstrapIterations, MAX_BOOTSTRAP_ITERATIONS, type Inference } from './stats';
import { walkForwardCore, walkForwardRejections, type WalkForward } from './walkForward';

export type XsParams = { lookback: number; topK: number; rebalance: number };
export const XS_GRID: XsParams[] = [7, 14, 28].flatMap((lookback) => [1, 2, 3].map((topK) => ({ lookback, topK, rebalance: 7 })));

type Series = { symbol: string; candles: Candle[] };

export type XsWindow = {
  periods: number;
  trades: number;
  netReturn: number;
  grossReturn: number;
  maxDrawdown: number;
  buyHoldReturn: number;
  periodReturns: { entryT: number; netRet: number }[];
  /** entries/full exits refused (below venue minimum or not covering 2x fixed cost): makes a tier infeasible */
  rejectedOrders: number;
  /** sub-minimum rebalancing trims of positions that stay held: not executed, weights drift (not a rejection) */
  skippedTrims: number;
  exposure: number;
  /** equity marked at each close, ending with the liquidated value */
  equity: { t: number; v: number }[];
};

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
  walkForward?: WalkForward;
  inference?: Inference;
  /** selected rule on the validation window at each account size (orders below venue minimums rejected) */
  capitalTiers?: { capitalUsd: number; netReturn: number; rejectedOrders: number; feasible: boolean }[];
};

/** Align all series on a common daily calendar (only days every market has). */
function align(series: Series[]) {
  const sets = series.map((s) => new Map(s.candles.map((k) => [k.t, k])));
  const days = [...sets[0].keys()].filter((t) => sets.every((m) => m.has(t))).sort((a, b) => a - b);
  return { days, rows: days.map((t) => sets.map((m) => m.get(t)!)) };
}

/**
 * Chronological, event-driven portfolio simulation (AUD-203) with capital-aware execution (AUD-208).
 * At every day d of the window, in this order:
 *   1. execute orders scheduled for d at d's OPEN (sells first, then buys from available cash);
 *   2. mark holdings to market at d's CLOSE (equity curve, peak, drawdown, exposure);
 *   3. on a rebalance day, decide from closes <= d and SCHEDULE orders for the open of d+1+delay.
 * Holdings and cash never change before the simulated execution time.
 * Costs per fill: proportional side cost (fee + half-spread + slippage) and the fixed cost (gas etc.). An order
 * below the venue minimum (or not covering twice the fixed cost) is REJECTED and counted, never resized up.
 * Quantity precision: not modelled (no verified per-venue increments in the stored data) — documented limit.
 * The window's last open liquidates everything (costs applied, minimums not applied — accounting close-out);
 * that liquidation value is the final equity and enters peak/drawdown.
 */
export function simulateXs(series: Series[], p: XsParams, from: number, to: number, cost: CostModel, delay = 0, capitalUsd = 1000, opts: { terminal?: 'liquidate' | 'mark' } = {}): XsWindow {
  // P0 D-9: 'mark' (forward use) marks every completed day INCLUDING the last at its close and never liquidates, so a
  // month's recorded return does not depend on the evaluation date. 'liquidate' (default) is the unchanged research rule.
  const mark = opts.terminal === 'mark';
  const { days, rows } = align(series);
  const empty: XsWindow = { periods: 0, trades: 0, netReturn: 0, grossReturn: 0, maxDrawdown: 0, buyHoldReturn: 0, periodReturns: [], rejectedOrders: 0, skippedTrims: 0, exposure: 0, equity: [] };
  const start = days.findIndex((t) => t >= from);
  const end = days.findIndex((t) => t >= to);
  const last = end === -1 ? days.length - 1 : end - 1;
  if (start < 0 || last <= start || !(capitalUsd > 0) || !(delay >= 0)) return empty;
  const run = (side: number, fixed: number, minOrder: number) => {
    const n = series.length;
    let cash = capitalUsd;
    const qty = new Array<number>(n).fill(0);
    let entries = 0;
    let rejected = 0;
    let skippedTrims = 0;
    let peak = capitalUsd;
    let maxDd = 0;
    let investedDays = 0;
    const equity: { t: number; v: number }[] = [];
    const periodReturns: { entryT: number; netRet: number }[] = [];
    let prevExecValue: number | null = null;
    let prevExecT = 0;
    const pending = new Map<number, number[]>(); // execution day index -> picks
    const value = (d: number, f: 'o' | 'c') => cash + qty.reduce((s, q, j) => s + q * rows[d][j][f], 0);
    const execute = (e: number, picks: number[]) => {
      const V = value(e, 'o');
      if (prevExecValue !== null) periodReturns.push({ entryT: prevExecT, netRet: V / prevExecValue - 1 });
      const target = (j: number) => (picks.includes(j) ? V / p.topK : 0);
      for (let j = 0; j < n; j++) {
        const px = rows[e][j].o;
        const cur = qty[j] * px;
        if (cur > target(j) + 1e-9) {
          const sellVal = cur - target(j);
          if (sellVal < minOrder || sellVal * (1 - side) <= fixed) {
            // a sub-minimum TRIM of a position that stays held is simply not done (weights drift); a full exit
            // that cannot be executed is a rejected order (the position stays open against the rule)
            if (target(j) > 0) skippedTrims++; else rejected++;
            continue;
          }
          qty[j] -= sellVal / px;
          if (qty[j] * px < 1e-9) qty[j] = 0;
          cash += exitProceeds(sellVal * (1 - side), fixed);
        }
      }
      for (const j of picks) {
        const px = rows[e][j].o;
        const need = target(j) - qty[j] * px;
        if (need <= 1e-9) continue;
        const notional = Math.min(cash, need / (1 - side) + fixed); // value received = need
        if (notional < minOrder || notional <= 2 * fixed) { if (qty[j] > 0) skippedTrims++; else rejected++; continue; }
        if (qty[j] === 0) entries++;
        cash -= notional;
        qty[j] += ((notional - fixed) * (1 - side)) / px;
      }
      prevExecValue = V; // pre-trade value: each period includes the costs of its own rebalance
      prevExecT = days[e];
    };
    let nextDecision = Math.max(start, p.lookback);
    const endExcl = mark ? last + 1 : last;
    for (let d = start; d < endExcl; d++) {
      const due = pending.get(d);
      if (due) { pending.delete(d); execute(d, due); }
      const v = value(d, 'c');
      equity.push({ t: days[d], v });
      peak = Math.max(peak, v);
      maxDd = Math.max(maxDd, peak > 0 ? (peak - v) / peak : 0);
      if (qty.some((q) => q > 0)) investedDays++;
      if (d === nextDecision) {
        const e = d + 1 + delay;
        if (e < endExcl) {
          if (!(days[e] > days[d])) throw new Error('look-ahead: execution not after decision');
          const ret = rows[d].map((k, j) => k.c / rows[d - p.lookback][j].c - 1);
          const picks = ret.map((r, j) => [r, j] as const).filter(([r]) => r > 0).sort((a, b) => b[0] - a[0]).slice(0, p.topK).map(([, j]) => j);
          pending.set(e, picks);
          nextDecision = d + p.rebalance;
        } else nextDecision = Number.POSITIVE_INFINITY; // no room left to execute inside the window
      }
    }
    if (mark) {
      // forward: positions stay open (unrealized); pending orders for days not yet observed are not executed
      const v = value(last, 'c');
      if (prevExecValue !== null) periodReturns.push({ entryT: prevExecT, netRet: v / prevExecValue - 1 });
      return { equity: v, entries, rejected, skippedTrims, maxDd, periodReturns, curve: equity, exposure: investedDays / Math.max(1, last + 1 - start) };
    }
    // final liquidation at the last open of the window (orders still pending are dropped: never executed)
    for (let j = 0; j < series.length; j++) if (qty[j] > 0) { cash += exitProceeds(qty[j] * rows[last][j].o * (1 - side), fixed); qty[j] = 0; }
    if (prevExecValue !== null) periodReturns.push({ entryT: prevExecT, netRet: cash / prevExecValue - 1 });
    equity.push({ t: days[last], v: cash });
    peak = Math.max(peak, cash);
    maxDd = Math.max(maxDd, peak > 0 ? (peak - cash) / peak : 0);
    return { equity: cash, entries, rejected, skippedTrims, maxDd, periodReturns, curve: equity, exposure: investedDays / Math.max(1, last - start) };
  };
  const net = run(sideCostFrac(cost), cost.fixedCostUsd, cost.minOrderUsd);
  const gross = run(0, 0, 0);
  const bh = rows[last].reduce((s, k, j) => s + k.o / rows[start][j].o - 1, 0) / series.length;
  return {
    periods: net.periodReturns.length,
    trades: net.entries,
    netReturn: net.equity / capitalUsd - 1,
    grossReturn: gross.equity / capitalUsd - 1,
    maxDrawdown: net.maxDd,
    buyHoldReturn: bh,
    periodReturns: net.periodReturns,
    rejectedOrders: net.rejected,
    skippedTrims: net.skippedTrims,
    exposure: net.exposure,
    equity: net.curve
  };
}

/** Capital tiers evaluated for feasibility (AUD-208); a tier with rejected orders is infeasible. */
export const CAPITAL_TIERS = [20, 50, 100, 250, 500, 1000] as const;

export function evaluateCrossSectional(series: Series[], cost: CostModel, intervalMs: number, oosCandidatesInRun: number): XsReport {
  // dependency horizon: lookback + one rebalance period (a holding is set by data up to one period earlier)
  const warm = Math.max(...XS_GRID.map((g) => g.lookback + g.rebalance)) + 1;
  const cut = commonCutoffs(series, warm, intervalMs);
  const selectOn = (a: number, b: number) => {
    let top: { p: XsParams; w: XsWindow } | null = null;
    for (const p of XS_GRID) {
      const w = simulateXs(series, p, a, b, cost);
      const ok = w.trades >= GATES.minTradesValidation * 2;
      const topOk = top ? top.w.trades >= GATES.minTradesValidation * 2 : false;
      if (!top || (ok && !topOk) || (ok === topOk && w.netReturn > top.w.netReturn)) top = { p, w };
    }
    return top!;
  };
  const best = selectOn(cut.trainStart, cut.trainEnd);
  const p = best.p;
  const rep: XsReport = {
    key: `XS_MOMENTUM(lookback=${p.lookback},topK=${p.topK},rebalance=${p.rebalance})`,
    params: p, status: 'backtested_candidate', rejectionReasons: [], cutoffs: cut, train: best.w, configsTriedOnTrain: XS_GRID.length
  };
  const reject = (why: string) => { rep.rejectionReasons.push(why); rep.status = 'rejected'; };
  if (best.w.netReturn <= 0) reject('best training config is not profitable after costs');
  const v = simulateXs(series, p, cut.trainEnd, cut.valEnd, cost);
  rep.validation = v;
  if (v.trades < GATES.minTradesValidation) reject(`validation trades ${v.trades} < ${GATES.minTradesValidation}`);
  if (v.netReturn <= 0) reject('validation net return <= 0 after costs');
  // AUD-201: walk-forward on the common calendar; parameters re-selected from earlier data only
  const wf = walkForwardCore(
    { trainStart: cut.trainStart, valEnd: cut.valEnd, embargo: warm * intervalMs, folds: GATES.walkForwardFolds, step: intervalMs },
    (a, b) => ({ ...selectOn(a, b).p }),
    (q, a, b) => { const w = simulateXs(series, q as XsParams, a, b, cost); return { netReturn: w.netReturn, trades: w.trades }; }
  );
  rep.walkForward = wf;
  for (const why of walkForwardRejections(wf, GATES.minWalkForwardPositiveShare)) reject(why);
  // AUD-208: capital tiers on the validation window
  rep.capitalTiers = CAPITAL_TIERS.map((cap) => {
    const w = simulateXs(series, p, cut.trainEnd, cut.valEnd, cost, 0, cap);
    return { capitalUsd: cap, netReturn: w.netReturn, rejectedOrders: w.rejectedOrders, feasible: w.rejectedOrders === 0 };
  });
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
  const ci = monthBlockBootstrap(oos, alpha, Math.min(MAX_BOOTSTRAP_ITERATIONS, requiredBootstrapIterations(alpha)));
  rep.ci = { ...ci, alpha, n: oos.length };
  if (oos.length < GATES.minTradesOos) reject(`out-of-sample periods ${oos.length} < ${GATES.minTradesOos}`);
  if (!(ci.lo > 0)) reject('month-block bootstrap lower bound of mean period return <= 0 (multiple-testing adjusted)');
  // AUD-205: synchronized monthly portfolio returns
  const monthly = [...windowCompleteMonths(v.equity, 1000), ...windowCompleteMonths(t.equity, 1000)].map((m) => m.ret);
  rep.inference = monthlyInference(monthly, alpha, GATES.minOosMonths);
  for (const why of rep.inference.reasons) reject(why);
  if (rep.status !== 'rejected') rep.status = 'qualified_paper_strategy';
  return rep;
}
