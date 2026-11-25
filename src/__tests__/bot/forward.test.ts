import { describe, expect, it } from 'vitest';
import { evaluateForward, registrationHash, type ForwardRegistration } from '../../bot/forward';
import { COST_PRESETS } from '../../bot/costs';
import type { Candle } from '../../bot/types';
import { mulberry32 } from '../../bot/stats';
import proposed from '../../../research/forward/registration.json';

const DAY = 86_400_000;
const START = Date.UTC(2027, 0, 1);
const LOW = { ...COST_PRESETS.coinbase_taker, takerFeeBps: 1, halfSpreadBps: 0, slippageBps: 0 };

function series(seed: number, drift: number, days: number, vol = 0.01): Candle[] {
  const r = mulberry32(seed);
  let px = 100;
  const t0 = START - 400 * DAY; // history before the start for indicators
  return Array.from({ length: days + 400 }, (_, i) => {
    const o = px;
    const c = o * Math.exp(drift + vol * (r() - 0.5));
    px = c;
    return { t: t0 + i * DAY, o, h: Math.max(o, c), l: Math.min(o, c), c, v: 1 };
  });
}
const reg = (o: Partial<ForwardRegistration> = {}): ForwardRegistration => {
  const base: ForwardRegistration = {
    id: 't', status: 'active', registeredAt: '2026-12-01T00:00:00Z', startAt: START, capitalUsd: 1000, costPreset: 'coinbase_taker',
    rules: [{ id: 'R1', kind: 'pooled', family: 'ts_momentum', params: { lookback: 30, threshold: 0 }, markets: ['A', 'B'], intervalMs: DAY }],
    evaluation: { minMonths: 12, familyAlpha: 0.05 }, rulesHash: '', rationale: [], disclosures: [], ...o
  };
  return { ...base, rulesHash: o.rulesHash ?? registrationHash(base) };
};

describe('forward paper-trading protocol', () => {
  it('the committed registration is a PROPOSAL with a valid hash and trades nothing', () => {
    const r = proposed as unknown as ForwardRegistration;
    expect(r.status).toBe('proposed');
    expect(r.startAt).toBeNull();
    expect(registrationHash(r)).toBe(r.rulesHash);
    const rep = evaluateForward(r, {}, COST_PRESETS.coinbase_taker, Date.now());
    expect(rep.results).toHaveLength(0);
    expect(rep.problems[0]).toMatch(/owner activates/);
  });

  it('a rule changed after registration is refused (clock must restart)', () => {
    const r = reg();
    const tampered = { ...r, rules: [{ ...r.rules[0], params: { lookback: 60, threshold: 0 } }] } as ForwardRegistration;
    expect(evaluateForward(tampered, {}, LOW, START + 400 * DAY).problems[0]).toMatch(/hash mismatch/);
  });

  it('only bars after startAt are traded or counted', () => {
    const data = { A: series(1, 0.003, 500), B: series(2, 0.003, 500) };
    const rep = evaluateForward(reg(), data, LOW, START + 500 * DAY);
    expect(rep.results[0].equity.every((p) => p.t >= START)).toBe(true);
    // ~16 calendar months after the start are evaluated; nothing before startAt is in the equity curve
    expect(rep.results[0].forwardMonths).toBeGreaterThanOrEqual(16);
  });

  it('fewer than 12 forward months: still collecting, never qualified', () => {
    const data = { A: series(1, 0.004, 200), B: series(2, 0.004, 200) };
    const r = evaluateForward(reg(), data, LOW, START + 200 * DAY).results[0];
    expect(r.status).toBe('collecting');
  });

  it('a strong persistent forward edge can qualify; driftless noise cannot', () => {
    const strong = evaluateForward(reg(), { A: series(1, 0.004, 760), B: series(2, 0.004, 760) }, LOW, START + 760 * DAY).results[0];
    expect(strong.status).toBe('forward_qualified');
    const noise = evaluateForward(reg(), { A: series(3, 0, 760, 0.05), B: series(4, 0, 760, 0.05) }, COST_PRESETS.coinbase_taker, START + 760 * DAY).results[0];
    expect(noise.status).not.toBe('forward_qualified');
  });

  it('startAt must follow registration', () => {
    const r = reg({ registeredAt: '2027-06-01T00:00:00Z' });
    expect(evaluateForward(r, {}, LOW, START + 100 * DAY).problems[0]).toMatch(/startAt must be after/);
  });
});
