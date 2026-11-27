// P0 capital-specific feasibility. A $20 account is not a scaled-down $1,000 account: venue minimums, fixed network
// costs and the position-fraction policy bind differently at each size. Nothing here raises exposure to beat fees.
import { admit, type AdmissionResult } from './admission';
import type { FeeEvidence } from './feeEvidence';

export const CAPITAL_TIERS = [20, 50, 100, 250, 500, 1000] as const;
export const HORIZONS = ['1h', '4h', '12h', '1d', '1w', '1m'] as const;
export type Horizon = (typeof HORIZONS)[number];

export type TierProfile = {
  capitalUsd: number;
  /** pre-declared policy, not optimised on results */
  maxPositionFraction: number;
  maxOpenPositions: number;
  maxDrawdownKill: number;
  note: string;
};

/** Smaller accounts get FEWER simultaneous positions, never larger fractions than the global 25% cap. */
export function tierProfile(capitalUsd: number): TierProfile {
  const maxOpen = capitalUsd < 50 ? 1 : capitalUsd < 250 ? 2 : 3;
  return {
    capitalUsd,
    maxPositionFraction: 0.25,
    maxOpenPositions: maxOpen,
    maxDrawdownKill: 0.15,
    note: capitalUsd < 50 ? 'one position at a time; diversification impossible — 75%+ stays in cash'
      : capitalUsd < 250 ? 'at most two positions; correlated coins (rho ~0.70) count as one bet'
      : 'up to three positions; still ~1.8 effectively independent assets in the coin universe'
  };
}

export type FeasibilityCell = {
  capitalUsd: number;
  venue: FeeEvidence['venue'];
  allocation: number;
  horizon: Horizon;
  notionalUsd: number;
  result: AdmissionResult;
};

export function feasibilityGrid(typicalMoves: Record<Horizon, number>, nowMs: number, region = 'CA', venues: FeeEvidence['venue'][] = ['coinbase', 'kraken', 'solana_dex', 'base_dex', 'arbitrum_dex', 'ethereum_dex'], allocations = [0.05, 0.25]): FeasibilityCell[] {
  const out: FeasibilityCell[] = [];
  for (const capitalUsd of CAPITAL_TIERS) for (const venue of venues) for (const allocation of allocations) for (const horizon of HORIZONS) {
    const notionalUsd = capitalUsd * allocation;
    // Coinbase has no CA-specific evidence: research uses the most expensive documented schedule (US) as the bound
    const reg = venue === 'coinbase' && region === 'CA' ? 'US' : region;
    out.push({ capitalUsd, venue, allocation, horizon, notionalUsd, result: admit({ venue, region: reg, capitalUsd, notionalUsd, execution: 'taker', typicalAbsMove: typicalMoves[horizon], edgeSource: 'none', nowMs, researchLane: true, maxPositionFraction: 0.25 }) });
  }
  return out;
}

/** Shortest economically feasible holding horizon per tier x venue x allocation (null = none). */
export function shortestFeasibleHorizon(cells: FeasibilityCell[]) {
  const key = (c: FeasibilityCell) => `${c.capitalUsd}|${c.venue}|${c.allocation}`;
  const m = new Map<string, Horizon | null>();
  for (const c of cells) {
    if (!m.has(key(c))) m.set(key(c), null);
    if (c.result.economicallyFeasible && m.get(key(c)) === null) m.set(key(c), c.horizon);
  }
  return [...m].map(([k, h]) => { const [cap, venue, alloc] = k.split('|'); return { capitalUsd: +cap, venue, allocation: +alloc, shortestFeasibleHorizon: h }; });
}
