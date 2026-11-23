import { describe, expect, it } from 'vitest';
import { HOUR, resample, validateCandles } from '../../bot/candles';
import { backtest } from '../../bot/backtest';
import { buildSignal, PARAM_GRID } from '../../bot/strategies';
import { COST_PRESETS, roundTripCostFrac, sideCostFrac } from '../../bot/costs';
import type { CostModel, StrategyFamily } from '../../bot/types';
import { T0, flat, randomWalk } from './helpers';

const ZERO: CostModel = { venue: 'coinbase', takerFeeBps: 0, halfSpreadBps: 0, slippageBps: 0, fixedCostUsd: 0, minOrderUsd: 0, provenance: 'test' };

describe('data integrity (stage 1)', () => {
  it('drops duplicates, misaligned and invalid bars, records gaps without filling them', () => {
    const c = randomWalk(10);
    const raw = [...c, c[3], { ...c[4], t: c[4].t + 1 }, { ...c[5], t: T0 + 20 * HOUR, h: 0 }];
    raw.splice(6, 2); // remove 2 bars -> gap
    const v = validateCandles(raw, HOUR, T0 + 1000 * HOUR, 10_000);
    expect(v.issues.some((i) => i.kind === 'duplicate')).toBe(true);
    expect(v.issues.some((i) => i.kind === 'misaligned')).toBe(true);
    expect(v.issues.some((i) => i.kind === 'invalid_ohlc')).toBe(true);
    const gap = v.issues.find((i) => i.kind === 'gap');
    expect(gap && gap.kind === 'gap' && gap.missingBars).toBe(2);
    expect(v.candles.length).toBe(8);
    expect(v.candles.length + 2).toBe(10); // nothing invented
  });

  it('drops the still-forming bar and flags stale data', () => {
    const c = randomWalk(5);
    const now = c[4].t + HOUR / 2; // last bar not closed yet
    const v = validateCandles(c, HOUR, now);
    expect(v.candles.length).toBe(4);
    expect(v.issues[0].kind).toBe('incomplete_last_bar_dropped');
    const stale = validateCandles(c, HOUR, c[4].t + 10 * HOUR, 2);
    expect(stale.stale).toBe(true);
  });

  it('resample keeps only complete buckets', () => {
    const c = randomWalk(50); // T0 is midnight; 50h = 2 full days + 2h
    const d = resample(c, HOUR, 24 * HOUR);
    expect(d.length).toBe(2);
    expect(d[0].o).toBe(c[0].o);
    expect(d[0].c).toBe(c[23].c);
  });
});

describe('no look-ahead', () => {
  const families = Object.keys(PARAM_GRID) as StrategyFamily[];
  it.each(families)('%s signals up to i are unchanged when bars after i are altered', (family) => {
    const base = randomWalk(900, 3);
    for (const params of PARAM_GRID[family]) {
      const spec = { family, params };
      const cut = 600;
      const altered = base.map((k, i) => (i > cut ? { ...k, o: k.o * 3, h: k.h * 3, l: k.l * 3, c: k.c * 3 } : k));
      const a = buildSignal(spec, base);
      const b = buildSignal(spec, altered);
      let pa: 0 | 1 = 0;
      let pb: 0 | 1 = 0;
      for (let i = 0; i <= cut; i++) {
        pa = a(i, pa);
        pb = b(i, pb);
        expect(pb).toBe(pa);
      }
    }
  });
});

describe('backtest execution + costs (stage 2)', () => {
  it('fills at the NEXT bar open, not the signal bar close', () => {
    const c = randomWalk(400, 5);
    const r = backtest(c, { family: 'ts_momentum', params: { lookback: 24, threshold: 0 } }, { start: 30, end: 400, cost: ZERO, capitalUsd: 1000 });
    expect(r.trades.length).toBeGreaterThan(0);
    for (const t of r.trades) {
      const idx = c.findIndex((k) => k.t === t.entryT);
      expect(t.entryPx).toBeCloseTo(c[idx].o, 10);
    }
  });

  it('round trip on a flat market loses exactly the modelled cost', () => {
    const c = flat(300);
    // force one entry/exit with momentum threshold -1 (always long) — exit only via forced close
    const cost = COST_PRESETS.coinbase_taker;
    const r = backtest(c, { family: 'ts_momentum', params: { lookback: 1, threshold: -1 } }, { start: 5, end: 300, cost, capitalUsd: 1000 });
    expect(r.trades.length).toBe(1);
    const expected = (1 - sideCostFrac(cost)) / (1 + sideCostFrac(cost)) - 1;
    expect(r.netReturn).toBeCloseTo(expected, 10);
    expect(r.trades[0].forcedExit).toBe(true);
    expect(r.trades[0].grossRet).toBe(0);
  });

  it('rejects orders below venue minimum instead of resizing them', () => {
    const c = randomWalk(400, 9);
    const r = backtest(c, { family: 'ts_momentum', params: { lookback: 24, threshold: 0 } }, {
      start: 30, end: 400, cost: { ...ZERO, minOrderUsd: 50 }, capitalUsd: 20
    });
    expect(r.trades.length).toBe(0);
    expect(r.rejectedOrders).toBeGreaterThan(0);
    expect(r.netReturn).toBe(0);
  });

  it('fixed costs dominate small accounts on L1 DEX', () => {
    const m = COST_PRESETS.dex_ethereum_l1;
    expect(roundTripCostFrac(m, 20)).toBeGreaterThan(0.3); // $6 gas on $20 = 30%+
    expect(roundTripCostFrac(m, 1000)).toBeLessThan(0.02);
  });
});
