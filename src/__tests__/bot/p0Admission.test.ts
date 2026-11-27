import { describe, expect, it } from 'vitest';
import { admit, breakEven } from '../../bot/admission';
import { FEE_EVIDENCE, lookupFee } from '../../bot/feeEvidence';
import { feasibilityGrid, shortestFeasibleHorizon, tierProfile } from '../../bot/capitalTiers';
import { COST_PRESETS, sideCostFrac } from '../../bot/costs';

const NOW = Date.parse('2026-11-26T12:00:00Z');
const base = { venue: 'kraken' as const, region: 'CA', capitalUsd: 1000, notionalUsd: 250, execution: 'taker' as const, typicalAbsMove: 0.065, edgeSource: 'none' as const, nowMs: NOW };

describe('fee evidence fails closed', () => {
  it('uses the verified Kraken Tier 1 schedule (80 bps taker), not the superseded 40 bps preset', () => {
    const f = lookupFee('kraken', 'CA', NOW);
    expect(f.ok && f.evidence.takerBps).toBe(80);
  });
  it('no evidence for the region -> reject', () => {
    expect(lookupFee('coinbase', 'CA', NOW).ok).toBe(false);
  });
  it('stale evidence (> 90 days since verification) -> reject', () => {
    expect(lookupFee('kraken', 'CA', NOW + 120 * 86_400_000).ok).toBe(false);
  });
  it('assumed-only evidence (DEX gas) is rejected outside research lanes', () => {
    expect(lookupFee('ethereum_dex', 'CA', NOW).ok).toBe(false);
    expect(lookupFee('ethereum_dex', 'CA', NOW, { allowAssumed: true }).ok).toBe(true);
  });
  it('every superseded entry points to an existing entry, and no current entry is cheaper than the one it supersedes', () => {
    for (const e of FEE_EVIDENCE.filter((x) => x.supersededBy)) {
      const next = FEE_EVIDENCE.find((x) => x.id === e.supersededBy)!;
      expect(next).toBeTruthy();
      expect(next.takerBps).toBeGreaterThanOrEqual(e.takerBps);
    }
  });
  it('documents that the legacy research presets understate verified/secondary fees', () => {
    expect(COST_PRESETS.kraken_taker.takerFeeBps).toBeLessThan(80);
    expect(COST_PRESETS.coinbase_taker.takerFeeBps).toBeLessThan(90);
  });
});

describe('admission', () => {
  it('break-even formula: zero cost -> 0; matches a direct round-trip simulation', () => {
    expect(breakEven(0, 0, 100)).toBe(0);
    const s = sideCostFrac(COST_PRESETS.coinbase_taker);
    const m = breakEven(s, 0, 100);
    expect((100 / (1 + s)) * (1 + m) * (1 - s)).toBeCloseTo(100, 10);
  });
  it('economically feasible weekly trade is still NOT admitted without forward-validated edge', () => {
    const r = admit(base);
    expect(r.economicallyFeasible).toBe(true);
    expect(r.admitted).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/not predictive evidence/);
  });
  it('hourly horizon is rejected: break-even exceeds the typical move', () => {
    const r = admit({ ...base, typicalAbsMove: 0.003 });
    expect(r.economicallyFeasible).toBe(false);
  });
  it('position above the tier limit is rejected (exposure is never raised to beat fees)', () => {
    expect(admit({ ...base, notionalUsd: 500 }).reasons.join(' ')).toMatch(/position limit/);
  });
  it('below venue minimum is rejected', () => {
    expect(admit({ ...base, capitalUsd: 20, notionalUsd: 1 }).reasons.join(' ')).toMatch(/below venue minimum/);
  });
  it('stale book and thin depth are rejected', () => {
    const stale = admit({ ...base, book: { observedAt: NOW - 2 * 3600_000, halfSpreadBps: 1, slippageBps: 1, visibleDepthUsd: 1e6 } });
    expect(stale.reasons.join(' ')).toMatch(/stale/);
    const thin = admit({ ...base, book: { observedAt: NOW, halfSpreadBps: 1, slippageBps: 1, visibleDepthUsd: 1000 } });
    expect(thin.reasons.join(' ')).toMatch(/visible depth/);
  });
  it('maker execution without a verified fill model fails closed', () => {
    expect(admit({ ...base, execution: 'maker' }).economicallyFeasible).toBe(false);
  });
  it('forward-validated edge that clears the stressed break-even is admitted', () => {
    const r = admit({ ...base, edgeSource: 'forward_validated', expectedGrossMove: 0.05, adverseMove95: 0.15 });
    expect(r.admitted).toBe(true);
    expect(r.potentialLossUsd).toBeGreaterThan(0);
  });
});

describe('capital tiers', () => {
  const moves = { '1h': 0.003, '4h': 0.0061, '12h': 0.0118, '1d': 0.0227, '1w': 0.0652, '1m': 0.1495 };
  const grid = feasibilityGrid(moves, NOW);
  it('no CEX horizon shorter than one day is feasible at any tier', () => {
    expect(grid.filter((c) => (c.venue === 'coinbase' || c.venue === 'kraken') && ['1h', '4h', '12h'].includes(c.horizon) && c.result.economicallyFeasible)).toEqual([]);
  });
  it('5% allocation of a $20 Kraken account is below the $5 minimum (micro-order infeasible)', () => {
    const s = shortestFeasibleHorizon(grid).find((x) => x.capitalUsd === 20 && x.venue === 'kraken' && x.allocation === 0.05);
    expect(s?.shortestFeasibleHorizon).toBeNull();
  });
  it('Ethereum L1 is infeasible for small accounts', () => {
    expect(grid.filter((c) => c.venue === 'ethereum_dex' && c.capitalUsd <= 500 && c.result.economicallyFeasible)).toEqual([]);
  });
  it('smaller tiers get fewer positions, never a larger fraction', () => {
    expect(tierProfile(20).maxOpenPositions).toBe(1);
    expect(tierProfile(1000).maxOpenPositions).toBe(3);
    expect(new Set([20, 50, 100, 250, 500, 1000].map((c) => tierProfile(c).maxPositionFraction)).size).toBe(1);
  });
});
