import type { Candle, CostModel, MarketRef, StrategySpec } from './types';
import { buildSignal } from './strategies';
import { sideCostFrac } from './costs';
import { DEFAULT_RISK, RiskPolicy, RiskState, assertPaperOnly, checkEntry, updateRiskState } from './risk';

export type PaperFill = {
  t: number;
  side: 'buy' | 'sell';
  rawPx: number;
  fillPx: number;
  units: number;
  notional: number;
  costUsd: number;
  realizedPnl?: number;
};

export type PaperDecision = { t: number; action: 'enter' | 'exit' | 'hold' | 'blocked' | 'flat'; reason: string };

export type PaperAccount = {
  id: string;
  label: string;
  /** 'qualified' = passed all gates; 'diagnostic' = rejected candidate tracked to test the rejection */
  kind: 'qualified' | 'diagnostic';
  market: MarketRef;
  intervalMs: number;
  spec: StrategySpec;
  cost: CostModel;
  policy: RiskPolicy;
  initialCash: number;
  cash: number;
  units: number;
  entryNotional: number;
  /** ms; bars whose OPEN time is earlier than this are never traded (forward-only) */
  createdAt: number;
  lastProcessedT: number | null;
  pendingOrder: 'buy' | 'sell' | null;
  posHistory: [number, 0 | 1][];
  fills: PaperFill[];
  decisions: PaperDecision[];
  equity: [number, number][];
  risk: RiskState;
  realizedPnl: number;
  totalCostUsd: number;
};

export function createPaperAccount(a: {
  id: string;
  label: string;
  kind: PaperAccount['kind'];
  market: MarketRef;
  intervalMs: number;
  spec: StrategySpec;
  cost: CostModel;
  initialCash: number;
  createdAt: number;
  policy?: RiskPolicy;
}): PaperAccount {
  assertPaperOnly();
  return {
    ...a,
    policy: a.policy ?? DEFAULT_RISK,
    cash: a.initialCash,
    units: 0,
    entryNotional: 0,
    lastProcessedT: null,
    pendingOrder: null,
    posHistory: [],
    fills: [],
    decisions: [],
    equity: [],
    risk: { equityPeak: a.initialCash, dayStartEquity: a.initialCash, weekStartEquity: a.initialCash, killSwitch: false },
    realizedPnl: 0,
    totalCostUsd: 0
  };
}

export function accountEquity(acc: PaperAccount, markPx: number): number {
  return acc.cash + acc.units * markPx;
}

/**
 * Advance a paper account through newly COMPLETED bars (candles must already be validated).
 * Pure: returns a new account object. Same rules as the backtester: decide at close, fill next open.
 */
export function stepPaper(prev: PaperAccount, candles: Candle[], opts: { dataStale: boolean; openBases?: string[] }): PaperAccount {
  assertPaperOnly();
  const acc: PaperAccount = structuredClone(prev);
  const signal = buildSignal(acc.spec, candles);
  const posAt = new Map(acc.posHistory);
  const side = sideCostFrac(acc.cost);
  let lastT = acc.lastProcessedT ?? -Infinity;

  for (let i = 0; i < candles.length; i++) {
    const k = candles[i];
    const forward = k.t >= acc.createdAt && k.t > lastT;
    if (!forward) {
      // replay signal state for history (position = recorded paper position, else flat)
      signal(i, posAt.get(k.t) ?? 0);
      continue;
    }
    // 1) fill pending order at this bar's open
    if (acc.pendingOrder === 'buy' && acc.units === 0) {
      const notional = Math.min(acc.cash, accountEquity(acc, k.o) * acc.policy.maxPositionFraction);
      const fillPx = k.o * (1 + side);
      const units = (notional - acc.cost.fixedCostUsd) / fillPx;
      const cost = notional - units * k.o;
      acc.cash -= notional;
      acc.units = units;
      acc.entryNotional = notional;
      acc.totalCostUsd += cost;
      acc.fills.push({ t: k.t, side: 'buy', rawPx: k.o, fillPx, units, notional, costUsd: cost });
    } else if (acc.pendingOrder === 'sell' && acc.units > 0) {
      const fillPx = k.o * (1 - side);
      const proceeds = acc.units * fillPx - acc.cost.fixedCostUsd;
      const cost = acc.units * k.o - proceeds;
      const pnl = proceeds - acc.entryNotional;
      acc.cash += proceeds;
      acc.realizedPnl += pnl;
      acc.totalCostUsd += cost;
      acc.fills.push({ t: k.t, side: 'sell', rawPx: k.o, fillPx, units: acc.units, notional: proceeds, costUsd: cost, realizedPnl: pnl });
      acc.units = 0;
      acc.entryNotional = 0;
    }
    acc.pendingOrder = null;

    // 2) mark + risk state at close
    const eq = accountEquity(acc, k.c);
    acc.risk = updateRiskState(acc.risk, eq, acc.policy, k.t, lastT === -Infinity ? k.t : lastT);
    acc.equity.push([k.t, eq]);

    // 3) decide at close
    const pos: 0 | 1 = acc.units > 0 ? 1 : 0;
    const want = signal(i, pos);
    const isLast = i === candles.length - 1;
    if (want === 1 && pos === 0) {
      const notional = Math.min(acc.cash, eq * acc.policy.maxPositionFraction);
      const chk = checkEntry({
        policy: acc.policy,
        state: acc.risk,
        equity: eq,
        notional,
        cost: acc.cost,
        openPositionBases: opts.openBases ?? [],
        base: acc.market.base,
        dataStale: opts.dataStale && isLast
      });
      if (chk.allowed) {
        acc.pendingOrder = 'buy';
        acc.decisions.push({ t: k.t, action: 'enter', reason: `${acc.spec.family} entry signal; buy at next open` });
      } else {
        acc.decisions.push({ t: k.t, action: 'blocked', reason: chk.reasons.join('; ') });
      }
    } else if (want === 0 && pos === 1) {
      acc.pendingOrder = 'sell';
      acc.decisions.push({ t: k.t, action: 'exit', reason: `${acc.spec.family} exit signal; sell at next open` });
    } else if (acc.risk.killSwitch && pos === 1) {
      acc.pendingOrder = 'sell';
      acc.decisions.push({ t: k.t, action: 'exit', reason: `kill switch: ${acc.risk.killReason}` });
    }
    acc.posHistory.push([k.t, pos]);
    lastT = k.t;
    acc.lastProcessedT = k.t;
  }
  // keep stored history bounded
  acc.decisions = acc.decisions.slice(-500);
  acc.equity = acc.equity.slice(-5000);
  acc.posHistory = acc.posHistory.slice(-5000);
  return acc;
}

export function paperSummary(acc: PaperAccount, markPx: number) {
  const eq = accountEquity(acc, markPx);
  const unrealized = acc.units > 0 ? acc.units * markPx - acc.entryNotional : 0;
  return {
    equity: eq,
    realizedPnl: acc.realizedPnl,
    unrealizedPnl: unrealized,
    netReturnPct: (eq / acc.initialCash - 1) * 100,
    trades: acc.fills.filter((f) => f.side === 'sell').length,
    entries: acc.fills.filter((f) => f.side === 'buy').length,
    openPosition: acc.units > 0,
    totalCostUsd: acc.totalCostUsd,
    barsProcessed: acc.equity.length
  };
}
