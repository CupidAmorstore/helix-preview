import type { CostModel } from './types';
import { roundTripCostFrac } from './costs';

/**
 * PAPER-ONLY LOCK.
 * There is no live order code anywhere in src/bot. This constant exists so UI and tests can assert the
 * mode; flipping it does nothing by itself because no exchange-order adapter exists. Adding one requires
 * explicit owner authorization (see docs/trading-bot/RISK_POLICY.md).
 */
export const LIVE_TRADING_ENABLED = false as const;
export const EXECUTION_MODE = 'paper' as const;

export function assertPaperOnly(): void {
  if ((LIVE_TRADING_ENABLED as boolean) !== false) throw new Error('Live trading is not authorized');
}

export type RiskPolicy = {
  maxPositionFraction: number; // of equity per position
  maxOpenPositions: number;
  maxCorrelatedPositionsPerBase: number; // same base asset across venues/chains counts once
  maxDailyLossFraction: number;
  maxWeeklyLossFraction: number;
  maxDrawdownKill: number; // from equity peak; trips the kill switch
  maxStaleBars: number;
  leverage: 1;
  allowAveragingDown: false;
  allowMartingale: false;
};

export const DEFAULT_RISK: RiskPolicy = {
  maxPositionFraction: 0.25,
  maxOpenPositions: 3,
  maxCorrelatedPositionsPerBase: 1,
  maxDailyLossFraction: 0.03,
  maxWeeklyLossFraction: 0.06,
  maxDrawdownKill: 0.15,
  maxStaleBars: 2,
  leverage: 1,
  allowAveragingDown: false,
  allowMartingale: false
};

export type Feasibility = {
  capitalUsd: number;
  positionNotionalUsd: number;
  meetsMinimum: boolean;
  roundTripCostPct: number;
  maxConcurrentPositions: number;
  verdict: 'tradable' | 'single_position_only' | 'not_tradable';
  note: string;
};

/** A $20 account is not a scaled-down $1,000 account: minimums and fixed costs bind. */
export function accountFeasibility(capitalUsd: number, cost: CostModel, policy = DEFAULT_RISK): Feasibility {
  let fraction = policy.maxPositionFraction;
  let notional = capitalUsd * fraction;
  let maxPos = Math.min(policy.maxOpenPositions, Math.floor(1 / fraction));
  // if a policy-sized slice is below venue minimum, see whether ONE full-size position would pass
  if (notional < cost.minOrderUsd) {
    maxPos = Math.floor(capitalUsd / Math.max(cost.minOrderUsd, 1e-9));
    notional = capitalUsd;
    fraction = 1;
  }
  const meets = notional >= cost.minOrderUsd && notional > 2 * cost.fixedCostUsd;
  const rt = roundTripCostFrac(cost, notional);
  let verdict: Feasibility['verdict'] = 'tradable';
  let note = 'policy sizing fits venue minimum';
  if (!meets || rt >= 0.05) {
    verdict = 'not_tradable';
    note = !meets ? 'position below venue minimum or fixed costs' : 'round-trip cost >= 5% of position';
  } else if (fraction === 1) {
    verdict = 'single_position_only';
    note = 'policy slice below venue minimum; would need 100% in one position — blocked by policy';
  }
  return {
    capitalUsd,
    positionNotionalUsd: notional,
    meetsMinimum: meets,
    roundTripCostPct: rt * 100,
    maxConcurrentPositions: Math.max(0, maxPos),
    verdict,
    note
  };
}

export type RiskState = {
  equityPeak: number;
  dayStartEquity: number;
  weekStartEquity: number;
  killSwitch: boolean;
  killReason?: string;
};

export type OrderCheck = { allowed: boolean; reasons: string[] };

/** Pre-trade checks for a paper ENTRY. Exits are always allowed (risk-reducing). */
export function checkEntry(args: {
  policy: RiskPolicy;
  state: RiskState;
  equity: number;
  notional: number;
  cost: CostModel;
  openPositionBases: string[];
  base: string;
  dataStale: boolean;
}): OrderCheck {
  const { policy, state, equity, notional, cost } = args;
  const reasons: string[] = [];
  assertPaperOnly();
  if (state.killSwitch) reasons.push(`kill switch active: ${state.killReason ?? 'manual'}`);
  if (args.dataStale) reasons.push('market data stale — entries blocked');
  if (notional < cost.minOrderUsd) reasons.push(`order $${notional.toFixed(2)} below venue minimum $${cost.minOrderUsd}`);
  if (notional > equity * policy.maxPositionFraction + 1e-9) reasons.push('exceeds max position fraction');
  if (args.openPositionBases.length >= policy.maxOpenPositions) reasons.push('max open positions reached');
  if (args.openPositionBases.filter((b) => b === args.base).length >= policy.maxCorrelatedPositionsPerBase)
    reasons.push(`already exposed to ${args.base} (cross-venue/chain duplicate)`);
  if (equity < state.dayStartEquity * (1 - policy.maxDailyLossFraction)) reasons.push('daily loss limit hit');
  if (equity < state.weekStartEquity * (1 - policy.maxWeeklyLossFraction)) reasons.push('weekly loss limit hit');
  return { allowed: reasons.length === 0, reasons };
}

export function updateRiskState(state: RiskState, equity: number, policy: RiskPolicy, nowMs: number, lastMs: number): RiskState {
  const next = { ...state };
  const day = (ms: number) => Math.floor(ms / 86_400_000);
  const week = (ms: number) => Math.floor((ms / 86_400_000 + 3) / 7); // ISO-ish week (Mon start)
  if (day(nowMs) !== day(lastMs)) next.dayStartEquity = equity;
  if (week(nowMs) !== week(lastMs)) next.weekStartEquity = equity;
  next.equityPeak = Math.max(next.equityPeak, equity);
  if (!next.killSwitch && equity < next.equityPeak * (1 - policy.maxDrawdownKill)) {
    next.killSwitch = true;
    next.killReason = `drawdown > ${(policy.maxDrawdownKill * 100).toFixed(0)}% from peak`;
  }
  return next;
}
