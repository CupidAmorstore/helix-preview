import type { CostModel } from './types';

/**
 * Cost presets. These are ASSUMPTIONS for the lowest retail fee tier, recorded with provenance.
 * `minOrderUsd` is overwritten by live venue metadata when the research runner can fetch it
 * (Coinbase /products, Kraken /AssetPairs). Spread/slippage are conservative placeholders until
 * measured order-book spreads are recorded per market.
 */
export const COST_PRESETS: Record<string, CostModel> = {
  coinbase_taker: {
    venue: 'coinbase',
    takerFeeBps: 60, // Coinbase Advanced lowest tier taker 0.60% (assumption — verify on account)
    halfSpreadBps: 2,
    slippageBps: 3,
    fixedCostUsd: 0,
    minOrderUsd: 1,
    provenance: 'assumed lowest-tier taker fee; spread/slippage placeholder'
  },
  kraken_taker: {
    venue: 'kraken',
    takerFeeBps: 40, // Kraken Pro lowest tier taker 0.40% (assumption — verify on account)
    halfSpreadBps: 2,
    slippageBps: 3,
    fixedCostUsd: 0,
    minOrderUsd: 5,
    provenance: 'assumed lowest-tier taker fee; spread/slippage placeholder'
  },
  // P0 (2026-11-26) evidence-based presets. See src/bot/feeEvidence.ts. Legacy presets above are kept unchanged so
  // historical runs and forward registration a replay identically.
  coinbase_taker_us_2026_09: {
    venue: 'coinbase',
    takerFeeBps: 90, // Coinbase Advanced US Intro taker since 2026-09-16 (secondary sources; official page 403)
    halfSpreadBps: 2,
    slippageBps: 3,
    fixedCostUsd: 0,
    minOrderUsd: 1,
    provenance: 'feeEvidence coinbase-advanced-us-intro-2026-09-16 (secondary); spread/slippage placeholder >= measured p75'
  },
  kraken_taker_tier1_2026_07: {
    venue: 'kraken',
    takerFeeBps: 80, // Kraken Pro Tier 1 taker since 2026-07-09 (official)
    halfSpreadBps: 2,
    slippageBps: 3,
    fixedCostUsd: 0,
    minOrderUsd: 5,
    provenance: 'feeEvidence kraken-pro-spot-tier1-2026-07-09 (official); spread/slippage placeholder >= measured p75'
  },
  // EXPERIMENTAL SIMULATION ONLY (2026-11-27). The owner's Coinbase fee tier could not be verified. 1.20% taker is the
  // highest Coinbase taker rate found in the research (a secondary guide's description of an earlier schedule), used as
  // a conservative bound. This is NOT a statement of the account's actual fees.
  coinbase_experimental_conservative_2026_11: {
    venue: 'coinbase',
    takerFeeBps: 120,
    halfSpreadBps: 2,
    slippageBps: 3,
    fixedCostUsd: 0,
    minOrderUsd: 1,
    provenance: 'UNVERIFIED conservative bound for simulation: 1.20% taker (secondary-source earlier schedule); account tier not verified'
  },
  kraken_maker: {
    venue: 'kraken',
    takerFeeBps: 25, // maker tier; assumes limit order fills — optimistic, used only as a sensitivity case
    halfSpreadBps: 0,
    slippageBps: 0,
    fixedCostUsd: 0,
    minOrderUsd: 5,
    provenance: 'optimistic maker case (fill not guaranteed)'
  },
  dex_solana: {
    venue: 'dex',
    takerFeeBps: 30, // typical AMM pool fee 0.25–0.30%
    halfSpreadBps: 5,
    slippageBps: 20,
    fixedCostUsd: 0.01,
    minOrderUsd: 0,
    provenance: 'assumed AMM pool fee + priority fee; no MEV modelling'
  },
  dex_ethereum_l1: {
    venue: 'dex',
    takerFeeBps: 30,
    halfSpreadBps: 5,
    slippageBps: 20,
    fixedCostUsd: 3,
    minOrderUsd: 0,
    provenance: 'assumed AMM fee + ~$3 gas per swap (highly variable)'
  }
};

export function scaleCosts(m: CostModel, factor: number): CostModel {
  return {
    ...m,
    takerFeeBps: m.takerFeeBps * factor,
    halfSpreadBps: m.halfSpreadBps * factor,
    slippageBps: m.slippageBps * factor,
    fixedCostUsd: m.fixedCostUsd * factor
  };
}

/** Proportional cost per side as a fraction (fee + half spread + slippage). */
export function sideCostFrac(m: CostModel): number {
  return (m.takerFeeBps + m.halfSpreadBps + m.slippageBps) / 10_000;
}

/** Round-trip cost as a fraction of a position of `notional` USD, including fixed costs. */
export function roundTripCostFrac(m: CostModel, notional: number): number {
  if (notional <= 0) return Infinity;
  return 2 * sideCostFrac(m) + (2 * m.fixedCostUsd) / notional;
}
