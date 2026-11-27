// P0 capital-tier feasibility study. Typical moves come from research/p0/claims-reproduction.json (independent Python
// reproduction on the stored Coinbase data). Writes research/p0/capital-feasibility.json.
//   npx vite-node --config scripts/vite.node.config.ts scripts/p0/capital-feasibility.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { feasibilityGrid, shortestFeasibleHorizon, tierProfile, CAPITAL_TIERS, HORIZONS, type Horizon } from '../../src/bot/capitalTiers';

const rep = JSON.parse(readFileSync('research/p0/claims-reproduction.json', 'utf8'));
const moves = Object.fromEntries(HORIZONS.map((h) => [h, rep.claims.horizonTable[h].medianAbsMove])) as Record<Horizon, number>;
const now = Date.parse('2026-11-26T12:00:00Z');
const cells = feasibilityGrid(moves, now);
const shortest = shortestFeasibleHorizon(cells);
const compact = cells.map((c) => ({ capitalUsd: c.capitalUsd, venue: c.venue, allocation: c.allocation, horizon: c.horizon, notionalUsd: c.notionalUsd, feasible: c.result.economicallyFeasible, evidence: c.result.evidenceId ?? null, roundTripPct: c.result.costs?.roundTripPct ?? null, breakEvenPct: c.result.breakEvenMove !== undefined ? c.result.breakEvenMove * 100 : null, breakEvenVsTypicalMove: c.result.breakEvenVsTypicalMove ?? null, reasons: c.result.reasons.filter((r) => !r.startsWith('edge evidence') && !r.startsWith('no expected')), warnings: c.result.warnings }));
writeFileSync('research/p0/capital-feasibility.json', JSON.stringify({ generatedAt: new Date().toISOString(), evaluatedAtMs: now, region: 'CA (Coinbase bounded by US schedule)', typicalMoves: moves, profiles: CAPITAL_TIERS.map(tierProfile), shortest, cells: compact }, null, 1));
for (const venue of ['coinbase', 'kraken', 'solana_dex', 'base_dex', 'arbitrum_dex', 'ethereum_dex']) {
  for (const alloc of [0.05, 0.25]) {
    console.log(venue.padEnd(13), `alloc ${alloc}`, CAPITAL_TIERS.map((cap) => `$${cap}:${shortest.find((s) => s.capitalUsd === cap && s.venue === venue && s.allocation === alloc)?.shortestFeasibleHorizon ?? '—'}`).join('  '));
  }
}
const ex = compact.find((c) => c.capitalUsd === 20 && c.venue === 'coinbase' && c.allocation === 0.05 && c.horizon === '1d');
console.log('example $20 coinbase 5% 1d', ex);
