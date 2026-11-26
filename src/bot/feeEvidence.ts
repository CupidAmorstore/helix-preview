// P0 fee evidence registry. Every fee the admission layer may use is a DATED, SOURCED observation. Missing, stale,
// assumed-only or superseded evidence FAILS CLOSED (no admission). Values are never lowered to rescue a strategy.
// Verified 2026-11-26 during the P0 recovery (see docs/P0_CAPITAL_FEASIBILITY_REPORT.md for the quotes).

export type EvidenceKind = 'official' | 'secondary' | 'assumed';

export type FeeEvidence = {
  id: string;
  venue: 'coinbase' | 'kraken' | 'solana_dex' | 'base_dex' | 'arbitrum_dex' | 'ethereum_dex';
  /** ISO country/region codes the schedule applies to; '*' = any */
  regions: string[];
  tier: string;
  makerBps: number;
  takerBps: number;
  /** network/gas cost per swap in USD (DEX); [typical, stressed] */
  fixedUsd?: [number, number];
  minOrderUsd: number;
  kind: EvidenceKind;
  sources: string[];
  effectiveFrom: string;
  verifiedAt: string;
  supersededBy?: string;
  note: string;
};

export const EVIDENCE_MAX_AGE_DAYS = 90;

export const FEE_EVIDENCE: FeeEvidence[] = [
  {
    id: 'kraken-pro-spot-tier1-2026-07-09',
    venue: 'kraken', regions: ['CA', 'US', 'NZ', '*'], tier: 'Tier 1 ($0+ 30-day spot volume)',
    makerBps: 40, takerBps: 80, minOrderUsd: 5, kind: 'official',
    sources: ['https://blog.kraken.com/product/pro/new-kraken-pro-fee-tiers', 'https://www.kraken.com/ca/pro/fees'],
    effectiveFrom: '2026-07-09', verifiedAt: '2026-11-26',
    note: 'Spot table "Tier 1 | 40.0 | 80.0" bps; Tier 2 ($2.5K+ spot) 30/60. Stable/FX pairs use a separate schedule.'
  },
  {
    id: 'kraken-pro-legacy-assumption',
    venue: 'kraken', regions: ['*'], tier: 'legacy HELIX preset (pre-2026-07-09 schedule)',
    makerBps: 25, takerBps: 40, minOrderUsd: 5, kind: 'assumed', sources: ['src/bot/costs.ts kraken_taker'],
    effectiveFrom: '2000-01-01', verifiedAt: '2026-11-22', supersededBy: 'kraken-pro-spot-tier1-2026-07-09',
    note: 'Understates the current entry-tier taker fee by half (40 vs 80 bps). Kept for replay comparison only.'
  },
  {
    id: 'coinbase-advanced-us-intro-2026-09-16',
    venue: 'coinbase', regions: ['US'], tier: 'Intro (< $10K 30-day volume)',
    makerBps: 50, takerBps: 90, minOrderUsd: 1, kind: 'secondary',
    sources: ['https://cryptodaily.co.uk/2026/09/coinbase-advanced-fees-usdc-vip-tiers', 'https://www.altrady.com/blog/crypto-trading-platforms/coinbase-advanced-trade (checked 2026-10-21)'],
    effectiveFrom: '2026-09-16', verifiedAt: '2026-11-26',
    note: 'Official help.coinbase.com page returned HTTP 403 to the research fetcher. Owner must confirm the account tier in Coinbase settings.'
  },
  {
    id: 'coinbase-advanced-eu-uk-intro-2026-09-16',
    venue: 'coinbase', regions: ['EU', 'GB'], tier: 'Intro', makerBps: 25, takerBps: 50, minOrderUsd: 1, kind: 'secondary',
    sources: ['https://cryptodaily.co.uk/2026/09/coinbase-advanced-fees-usdc-vip-tiers'], effectiveFrom: '2026-09-16', verifiedAt: '2026-11-26',
    note: 'Secondary source only.'
  },
  {
    id: 'coinbase-advanced-legacy-assumption',
    venue: 'coinbase', regions: ['*'], tier: 'legacy HELIX preset ($0-$10K, pre-2026-09-16)',
    makerBps: 40, takerBps: 60, minOrderUsd: 1, kind: 'assumed', sources: ['src/bot/costs.ts coinbase_taker'],
    effectiveFrom: '2000-01-01', verifiedAt: '2026-11-22', supersededBy: 'coinbase-advanced-us-intro-2026-09-16',
    note: 'Used by all 199 historical candidates and forward registration a. US intro taker is now reported at 90 bps.'
  },
  // DEX: pool fee tiers are protocol-documented (Uniswap v3-style 1/5/30/100 bps); 30 bps is the common volatile-pair
  // tier. Gas varies by block; no timestamped on-chain cost measurement exists yet -> 'assumed' -> fails closed.
  { id: 'solana-amm-assumed', venue: 'solana_dex', regions: ['*'], tier: 'AMM 0.25-0.30% pool', makerBps: 30, takerBps: 30, fixedUsd: [0.005, 0.05], minOrderUsd: 0, kind: 'assumed', sources: ['protocol docs; no measurement'], effectiveFrom: '2026-01-01', verifiedAt: '2026-11-26', note: 'Priority fees spike in congestion; MEV/sandwich not modelled.' },
  { id: 'base-amm-assumed', venue: 'base_dex', regions: ['*'], tier: 'AMM 0.30% pool', makerBps: 30, takerBps: 30, fixedUsd: [0.01, 0.25], minOrderUsd: 0, kind: 'assumed', sources: ['protocol docs; no measurement'], effectiveFrom: '2026-01-01', verifiedAt: '2026-11-26', note: 'L2 execution + L1 data fee.' },
  { id: 'arbitrum-amm-assumed', venue: 'arbitrum_dex', regions: ['*'], tier: 'AMM 0.30% pool', makerBps: 30, takerBps: 30, fixedUsd: [0.02, 0.4], minOrderUsd: 0, kind: 'assumed', sources: ['protocol docs; no measurement'], effectiveFrom: '2026-01-01', verifiedAt: '2026-11-26', note: 'L2 execution + L1 data fee.' },
  { id: 'ethereum-amm-assumed', venue: 'ethereum_dex', regions: ['*'], tier: 'AMM 0.30% pool', makerBps: 30, takerBps: 30, fixedUsd: [1, 15], minOrderUsd: 0, kind: 'assumed', sources: ['protocol docs; no measurement'], effectiveFrom: '2026-01-01', verifiedAt: '2026-11-26', note: 'L1 swap gas highly variable.' }
];

/** Measured per-side spread + book-walk slippage, p75 over 2 snapshots (research/costs/2026-11-2{2,5}.jsonl). */
export const MEASURED_SPREAD_SLIPPAGE_BPS: Record<string, { observedAt: string; byNotional: Record<number, number> }> = {
  coinbase: { observedAt: '2026-11-25', byNotional: { 20: 2.1, 50: 2.11, 100: 2.23, 250: 2.32, 500: 2.4, 1000: 3.08, 5000: 5.05 } },
  kraken: { observedAt: '2026-11-25', byNotional: { 20: 2.56, 50: 2.68, 100: 2.68, 250: 2.68, 500: 2.68, 1000: 3.07, 5000: 3.87 } }
};

export type EvidenceLookup =
  | { ok: true; evidence: FeeEvidence; warnings: string[] }
  | { ok: false; reasons: string[] };

/**
 * Pick the fee evidence for a venue+region at `nowMs`. Fails closed when: none exists; only superseded or 'assumed'
 * evidence exists (unless allowAssumed, research-lane only); evidence is older than EVIDENCE_MAX_AGE_DAYS.
 * When several current entries match, the most EXPENSIVE (highest taker) is used.
 */
export function lookupFee(venue: FeeEvidence['venue'], region: string, nowMs: number, opts: { allowAssumed?: boolean } = {}): EvidenceLookup {
  const all = FEE_EVIDENCE.filter((e) => e.venue === venue && (e.regions.includes(region) || e.regions.includes('*')));
  const current = all.filter((e) => !e.supersededBy && Date.parse(e.effectiveFrom) <= nowMs);
  if (!all.length) return { ok: false, reasons: [`no fee evidence for ${venue} in region ${region}`] };
  if (!current.length) return { ok: false, reasons: [`only superseded fee evidence for ${venue}/${region}`] };
  const usable = current.filter((e) => opts.allowAssumed || e.kind !== 'assumed');
  if (!usable.length) return { ok: false, reasons: [`fee evidence for ${venue}/${region} is assumed, not measured — fails closed`] };
  // prefer exact region over wildcard; then the most expensive
  const exact = usable.filter((e) => e.regions.includes(region));
  const pool = exact.length ? exact : usable;
  const ev = [...pool].sort((a, b) => b.takerBps - a.takerBps)[0];
  const ageDays = (nowMs - Date.parse(ev.verifiedAt)) / 86_400_000;
  if (ageDays > EVIDENCE_MAX_AGE_DAYS) return { ok: false, reasons: [`fee evidence ${ev.id} verified ${ageDays.toFixed(0)} days ago (> ${EVIDENCE_MAX_AGE_DAYS}) — re-verify`] };
  const warnings: string[] = [];
  if (ev.kind === 'secondary') warnings.push(`fee from secondary sources (${ev.id}); confirm on the account`);
  if (ev.kind === 'assumed') warnings.push(`fee is an ASSUMPTION (${ev.id}); research lane only`);
  return { ok: true, evidence: ev, warnings };
}

export function spreadSlippageBps(venue: string, notionalUsd: number): number | null {
  const m = MEASURED_SPREAD_SLIPPAGE_BPS[venue];
  if (!m) return null;
  const keys = Object.keys(m.byNotional).map(Number).sort((a, b) => a - b);
  const k = keys.find((x) => x >= notionalUsd);
  return k === undefined ? null : m.byNotional[k]; // above the largest measured size: unknown -> null
}
