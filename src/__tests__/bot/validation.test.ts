import { describe, expect, it } from 'vitest';
import { evaluateFamily, chronologicalSplit } from '../../bot/validation';
import { runResearchCycle, ALL_FAMILIES } from '../../bot/research';
import { COST_PRESETS } from '../../bot/costs';
import { HOUR, datasetHash } from '../../bot/candles';
import type { CostModel, Dataset } from '../../bot/types';
import { randomWalk, trendingRegimes } from './helpers';

const LOW: CostModel = { ...COST_PRESETS.coinbase_taker, takerFeeBps: 1, halfSpreadBps: 0, slippageBps: 0 };
const mkDataset = (candles: Dataset['candles'], symbol = 'TEST-USD'): Dataset => ({
  id: datasetHash(candles),
  market: { venue: 'coinbase', symbol, base: symbol.split('-')[0], quote: 'USD' },
  intervalMs: HOUR,
  candles,
  fetchedAt: 0,
  source: 'synthetic'
});

describe('walk-forward split (stage 3)', () => {
  it('is chronological and non-overlapping', () => {
    const s = chronologicalSplit(1000, 200);
    expect(s.trainStart).toBe(200);
    expect(s.trainStart < s.trainEnd && s.trainEnd < s.valEnd && s.valEnd < s.testEnd).toBe(true);
    expect(s.testEnd).toBe(1000);
  });
});

describe('false-positive control', () => {
  it('nothing qualifies on driftless random walks (5 seeds x all families, realistic costs)', () => {
    let qualified = 0;
    for (const seed of [11, 12, 13, 14, 15]) {
      const c = randomWalk(4000, seed);
      for (const f of ALL_FAMILIES) {
        const r = evaluateFamily(c, f, COST_PRESETS.coinbase_taker, 35);
        if (r.status === 'qualified_paper_strategy') qualified++;
      }
    }
    expect(qualified).toBe(0);
  });

  it('nothing qualifies on random walks even with near-zero costs', () => {
    let qualified = 0;
    for (const seed of [21, 22, 23]) {
      const c = randomWalk(4000, seed);
      for (const f of ALL_FAMILIES) if (evaluateFamily(c, f, LOW, 21).status === 'qualified_paper_strategy') qualified++;
    }
    expect(qualified).toBe(0);
  });
});

describe('power check (pipeline is not impossible)', () => {
  it('a genuine persistent-trend edge with low costs can qualify', () => {
    const c = trendingRegimes(8000, 7, 60);
    const r = evaluateFamily(c, 'ts_momentum', LOW, 1);
    expect(r.rejectionReasons).toEqual([]);
    expect(r.status).toBe('qualified_paper_strategy');
  });

  it('the same edge is rejected when retail taker costs exceed it (Nov-21 failure mode: costs)', () => {
    const c = trendingRegimes(8000, 7, 12); // short regimes => many small trades
    const r = evaluateFamily(c, 'sma_cross', { ...COST_PRESETS.coinbase_taker, takerFeeBps: 150 }, 1);
    expect(r.status).toBe('rejected');
  });
});

describe('November 21 regression cases', () => {
  it('markets without enough contiguous history are skipped, not scored (5 of 16 lacked 160 bars)', () => {
    const short = mkDataset(randomWalk(159, 2), 'SHORT-USD');
    const { record } = runResearchCycle({
      datasets: [short], costFor: () => COST_PRESETS.coinbase_taker, nowMs: short.candles[158].t + HOUR,
      codeVersion: 'test', registry: {}, minBars: 160
    });
    expect(record.markets[0].candidates).toHaveLength(0);
    expect(record.markets[0].skipped[0].reason).toMatch(/contiguous history 159 < 160/);
  });

  it('gaps are not bridged: only the trailing contiguous run is used', () => {
    const c = randomWalk(3000, 4);
    const withGap = [...c.slice(0, 1000), ...c.slice(1010)];
    const d = mkDataset(withGap);
    const { record } = runResearchCycle({
      datasets: [d], costFor: () => COST_PRESETS.coinbase_taker, nowMs: c[2999].t + HOUR,
      codeVersion: 'test', registry: {}, minBars: 2500
    });
    expect(record.markets[0].quality.gaps).toBe(1);
    expect(record.markets[0].skipped.every((s) => /contiguous history 1990/.test(s.reason))).toBe(true);
  });

  it('re-running on an identical dataset does not re-test (no repeated snooping)', () => {
    const d = mkDataset(randomWalk(2000, 8));
    const args = { datasets: [d], costFor: () => COST_PRESETS.coinbase_taker, nowMs: d.candles[1999].t + HOUR, codeVersion: 't', minBars: 1500 };
    const first = runResearchCycle({ ...args, registry: {} });
    expect(first.record.totals.oosCandidates).toBe(ALL_FAMILIES.length);
    const second = runResearchCycle({ ...args, registry: first.registry });
    expect(second.record.totals.oosCandidates).toBe(0);
    expect(second.record.markets[0].skipped[0].reason).toMatch(/no new evidence/);
  });

  it('stale data blocks evaluation', () => {
    const d = mkDataset(randomWalk(2000, 9));
    const { record } = runResearchCycle({
      datasets: [d], costFor: () => COST_PRESETS.coinbase_taker, nowMs: d.candles[1999].t + 100 * HOUR,
      codeVersion: 't', registry: {}, minBars: 1500
    });
    expect(record.markets[0].candidates).toHaveLength(0);
    expect(record.markets[0].skipped[0].reason).toBe('data stale');
  });
});
