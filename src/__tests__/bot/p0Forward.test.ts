import { describe, expect, it } from 'vitest';
import { evaluateForward, forwardDataProblems, registrationHash, snapshotOf, type ForwardRegistration } from '../../bot/forward';
import { completeMonthlyReturns, monthlyReturns } from '../../bot/stats';
import { COST_PRESETS } from '../../bot/costs';
import { mulberry32 } from '../../bot/stats';
import type { Candle } from '../../bot/types';
import committed from '../../../research/forward/registration.json';

const DAY = 86_400_000;
const START = Date.UTC(2027, 0, 15); // mid-month start
function series(seed: number, drift: number, days: number): Candle[] {
  const r = mulberry32(seed); let px = 100; const t0 = START - 400 * DAY;
  return Array.from({ length: days + 400 }, (_, i) => { const o = px; const c = o * Math.exp(drift + 0.01 * (r() - 0.5)); px = c; return { t: t0 + i * DAY, o, h: Math.max(o, c), l: Math.min(o, c), c, v: 1e6 }; });
}
const mk = (o: Partial<ForwardRegistration> = {}): ForwardRegistration => {
  const b: ForwardRegistration = { id: 't', status: 'active', registeredAt: '2026-12-01T00:00:00Z', startAt: START, capitalUsd: 1000, costPreset: 'coinbase_taker', rules: [{ id: 'R', kind: 'pooled', family: 'ts_momentum', params: { lookback: 30, threshold: 0 }, markets: ['A', 'B'], intervalMs: DAY }], evaluation: { minMonths: 12, familyAlpha: 0.05 }, rulesHash: '', rationale: [], disclosures: [], ...o };
  return { ...b, rulesHash: registrationHash(b) };
};

describe('P0 forward evaluation fixes', () => {
  it('partial first and in-progress last months are not counted (legacy counted both)', () => {
    const eq = Array.from({ length: 80 }, (_, i) => ({ t: START + i * DAY, v: 1000 + i }));
    expect(monthlyReturns(eq, 1000).length).toBe(4); // Jan (partial), Feb, Mar, Apr (partial)
    expect(completeMonthlyReturns(eq, 1000, START, START + 80 * DAY).map((m) => m.month)).toEqual(['2027-02', '2027-03']);
  });
  it('forwardMonths counts complete months only', () => {
    const r = evaluateForward(mk(), { A: series(1, 0.002, 100), B: series(2, 0.002, 100) }, COST_PRESETS.coinbase_taker, START + 100 * DAY).results[0];
    // Jan 15 -> Apr 25: Feb and Mar complete
    expect(r.forwardMonths).toBe(2);
  });
  it('a gap inside the forward window refuses evaluation (never bridged)', () => {
    const a = series(1, 0, 60); a.splice(420, 2);
    const rep = evaluateForward(mk(), { A: a, B: series(2, 0, 60) }, COST_PRESETS.coinbase_taker, START + 60 * DAY);
    expect(rep.state).toMatch(/refused/);
    expect(rep.problems.join(' ')).toMatch(/gap/);
  });
  it('stale data refuses evaluation', () => {
    expect(forwardDataProblems('A', series(1, 0, 10), DAY, START, START + 30 * DAY).join(' ')).toMatch(/stale/);
  });
  it('cost values bound by snapshot: drift is refused; v2 hash covers the values', () => {
    const base = mk({ costSnapshot: snapshotOf(COST_PRESETS.coinbase_taker), hashVersion: 2 });
    const reg = { ...base, rulesHash: registrationHash(base) };
    const drifted = { ...COST_PRESETS.coinbase_taker, takerFeeBps: 30 };
    expect(evaluateForward(reg, {}, drifted, START - DAY).problems.join(' ')).toMatch(/cost values differ/);
    const tampered = { ...reg, costSnapshot: { ...reg.costSnapshot!, takerFeeBps: 30 } };
    expect(registrationHash(tampered)).not.toBe(reg.rulesHash);
  });
  it('open positions are reported as unrealized; equity = capital + realized + unrealized', () => {
    const r = evaluateForward(mk(), { A: series(1, 0.004, 90), B: series(2, 0.004, 90) }, COST_PRESETS.coinbase_taker, START + 90 * DAY).results[0];
    expect(r.unrealizedPnlUsd).not.toBe(0);
    expect(1000 * (1 + r.netReturn)).toBeCloseTo(1000 + r.realizedPnlUsd! + r.unrealizedPnlUsd!, 6);
  });
  it('re-evaluation is deterministic and append-only: an earlier ledger is a prefix of a later one', () => {
    const a = series(1, 0.003, 120), b = series(2, -0.002, 120);
    const early = evaluateForward(mk(), { A: a, B: b }, COST_PRESETS.coinbase_taker, START + 60 * DAY).results[0].ledger!;
    const late = evaluateForward(mk(), { A: a, B: b }, COST_PRESETS.coinbase_taker, START + 120 * DAY).results[0].ledger!;
    // events that were final at the early evaluation (fills, rejections) are unchanged later
    for (const m of early) {
      const fin = m.events.filter((e) => e.kind === 'fill');
      expect(late.find((x) => x.market === m.market)!.events.filter((e) => e.kind === 'fill').slice(0, fin.length)).toEqual(fin);
    }
  });
  it('committed registration a: costs frozen at the values it was activated with', () => {
    const r = committed as unknown as ForwardRegistration;
    expect(registrationHash(r)).toBe(r.rulesHash);
    expect(r.costSnapshot).toEqual(snapshotOf(COST_PRESETS.coinbase_taker));
  });
});

import { windowCompleteMonths } from '../../bot/stats';
describe('gates-v4: historical monthly inference', () => {
  it('validation + test windows split mid-month no longer double-count the boundary month', () => {
    const D = 86_400_000;
    const v = Array.from({ length: 200 }, (_, i) => ({ t: Date.UTC(2025, 0, 10) + i * D, v: 1000 + i }));
    const tStart = v[v.length - 1].t + D;
    const t = Array.from({ length: 200 }, (_, i) => ({ t: tStart + i * D, v: 1000 + i }));
    const legacy = [...monthlyReturns(v, 1000), ...monthlyReturns(t, 1000)].map((m) => m.month);
    const v4 = [...windowCompleteMonths(v, 1000), ...windowCompleteMonths(t, 1000)].map((m) => m.month);
    expect(legacy.length).toBeGreaterThan(new Set(legacy).size); // boundary month counted twice
    expect(new Set(v4).size).toBe(v4.length);
    expect(v4.length).toBeLessThan(legacy.length);
  });
});

import { simulateXs } from '../../bot/crossSectional';
import { completeMonthlyReturns as cmr } from '../../bot/stats';
describe('P0 D-9: cross-sectional forward evidence does not depend on the evaluation date', () => {
  const D = 86_400_000;
  const s0 = Date.UTC(2027, 0, 1);
  const mk = (seed: number, drift: number) => { const r = mulberry32(seed); let px = 100; return Array.from({ length: 200 }, (_, i) => { const o = px; const c = o * Math.exp(drift + 0.03 * (r() - 0.5)); px = c; return { t: s0 - 60 * D + i * D, o, h: Math.max(o, c), l: Math.min(o, c), c, v: 1e6 }; }); };
  const series = [mk(1, 0.004), mk(2, 0.002), mk(3, -0.001), mk(4, 0.003)].map((c, i) => ({ symbol: `S${i}`, candles: c }));
  const evalAt = (now: number, terminal: 'mark' | 'liquidate') => {
    const done = series.map((x) => ({ ...x, candles: x.candles.filter((k) => k.t + D <= now) }));
    const w = simulateXs(done, { lookback: 14, topK: 2, rebalance: 7 }, s0, now + D, COST_PRESETS.coinbase_taker, 0, 1000, { terminal });
    return cmr(w.equity, 1000, s0, now).find((m) => m.month === '2027-02')?.ret;
  };
  const mar1 = Date.UTC(2027, 2, 1), mar2 = Date.UTC(2027, 2, 2);
  it('mark mode: February is identical whether evaluated on Mar 1 or Mar 2', () => {
    expect(evalAt(mar1, 'mark')).toBeDefined();
    expect(evalAt(mar1, 'mark')).toBeCloseTo(evalAt(mar2, 'mark')!, 12);
  });
  it('legacy liquidate mode differed (documents the defect)', () => {
    expect(Math.abs(evalAt(mar1, 'liquidate')! - evalAt(mar2, 'liquidate')!)).toBeGreaterThan(1e-6);
  });
});

import { barsAgree } from '../../bot/candles';
describe('P0 D-10: new bars must be confirmed by an independent ranged read', () => {
  const stored = { o: 71369.9, h: 71429.46, l: 67555, c: 68236.54 };
  it('rejects the observed broken row (BTC 2026-11-13, −604 bps close)', () => {
    expect(barsAgree(stored, { ...stored, c: 68236.54 * (1 - 0.0604263) })).toBe(false);
  });
  it('accepts the observed benign jitter (ADA 2026-11-25 close 0.14575 vs 0.14563, ~8 bps)', () => {
    expect(barsAgree({ o: 0.14437, h: 0.1478, l: 0.13538, c: 0.14575 }, { o: 0.14438, h: 0.1478, l: 0.13538, c: 0.14563 })).toBe(true);
  });
  it('rejects non-positive prices', () => {
    expect(barsAgree(stored, { ...stored, l: 0 })).toBe(false);
  });
});
