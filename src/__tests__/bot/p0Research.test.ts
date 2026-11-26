import { describe, expect, it } from 'vitest';
import { classifyFailure, noveltyCheck, FAMILY_FINGERPRINT, type FailureRecord } from '../../bot/failureRegistry';
import { HYPOTHESES } from '../../bot/hypotheses';
import { assetRegime, marketRegime } from '../../bot/regime';
import { makerStudy } from '../../bot/maker';
import { replay, contractFor } from '../../bot/execution';
import { mulberry32 } from '../../bot/stats';
import type { Candle, CostModel } from '../../bot/types';
import { asDaily, randomWalk } from './helpers';

const ZERO: CostModel = { venue: 'coinbase', takerFeeBps: 0, halfSpreadBps: 0, slippageBps: 0, fixedCostUsd: 0, minOrderUsd: 0, provenance: 't' };

describe('failure registry', () => {
  it('classifies mechanically with fixed precedence', () => {
    expect(classifyFailure({ grossPnlUsd: -5, netPnlUsd: -20, passivePnlUsd: 0, trades: 30, minTrades: 15, registryReasons: [] }).primary).toBe('no_gross_edge');
    expect(classifyFailure({ grossPnlUsd: 50, netPnlUsd: -5, passivePnlUsd: 80, trades: 30, minTrades: 15, registryReasons: [] }).primary).toBe('beta_only');
    expect(classifyFailure({ grossPnlUsd: 50, netPnlUsd: -5, passivePnlUsd: 10, trades: 30, minTrades: 15, registryReasons: [] }).primary).toBe('cost_dominated');
    expect(classifyFailure({ grossPnlUsd: 50, netPnlUsd: 5, passivePnlUsd: 10, trades: 3, minTrades: 15, registryReasons: [] }).primary).toBe('insufficient_sample');
  });
  it('novelty guard blocks a renamed rejected mechanism, allows genuinely new information', () => {
    const rec = (family: string): FailureRecord => ({ id: family, hypothesisId: family, family, version: 'v', params: {}, dataset: { market: 'X', intervalMs: 1, window: [0, 0], kind: 'validation' }, costPreset: 'c', grossPnlUsd: -1, netPnlUsd: -1, passiveExposureMatchedPnlUsd: 0, trades: 20, categories: ['no_gross_edge'], primaryCause: 'no_gross_edge', confirmed: true, limitations: [], correctiveAction: '', retestEligible: false });
    const reg = [rec('sma_cross'), rec('donchian_breakout')];
    expect(noveltyCheck({ ...FAMILY_FINGERPRINT.sma_cross }, reg).allowed).toBe(false); // "new" trend rule on own price, daily
    expect(noveltyCheck({ signal: 'onchain', horizon: 'weekly', information: 'chain data' }, reg).allowed).toBe(true);
  });
  it('every hypothesis states mechanism, cost survival, small-account fit and invalidation', () => {
    for (const h of HYPOTHESES) for (const k of ['mechanism', 'survivesCosts', 'smallAccount', 'invalidation', 'evidence'] as const) expect(h[k].length, `${h.id}.${k}`).toBeGreaterThan(5);
    expect(HYPOTHESES.filter((h) => h.status === 'forward_registered').length).toBeLessThanOrEqual(3);
  });
});

describe('regime module is point-in-time', () => {
  it('future-data mutation does not change a past classification', () => {
    const k = asDaily(randomWalk(800, 5, 0.03));
    const a = assetRegime(k, 600);
    const mut = k.map((b, i) => (i > 600 ? { ...b, c: b.c * 5, o: b.o * 5, h: b.h * 5, l: b.l * 5 } : b));
    expect(assetRegime(mut, 600)).toEqual(a);
  });
  it('no history -> unknown regime -> no new entries (fail closed)', () => {
    const k = asDaily(randomWalk(100, 1));
    const m = marketRegime({ A: k }, k[50].t);
    expect(m.allowNewEntries).toBe(false);
  });
});

describe('maker model', () => {
  it('is always labelled unverified and requires a trade-through, not a touch', () => {
    const k: Candle[] = Array.from({ length: 20 }, (_, i) => ({ t: i, o: 100, h: 100, l: 99.9, c: 100, v: 1 })); // low = limit exactly (10 bps)
    const s = makerStudy(k, [2, 5, 8], { offsetBps: 10, waitBars: 1, throughBps: 5, onMiss: 'skip' }, 40, 80, 3);
    expect(s.classification).toBe('unverified_candle_model');
    expect(s.fillRate).toBe(0);
  });
});

describe('random-entry null control', () => {
  it('random timing at zero cost has ~zero mean excess over exposure-matched passive on a driftless walk', () => {
    const r = mulberry32(3);
    let ex = 0; const N = 200;
    for (let d = 0; d < N; d++) {
      const k = randomWalk(300, d + 1, 0.01);
      const on = () => (r() < 0.5 ? 1 : 0) as 0 | 1;
      const res = replay(k, on, contractFor(ZERO, 3600_000, { terminal: 'mark' }), 10);
      ex += res.netReturn - res.exposure * (k[299].c / k[10].c - 1);
    }
    expect(Math.abs(ex / N)).toBeLessThan(0.02);
  });
});
