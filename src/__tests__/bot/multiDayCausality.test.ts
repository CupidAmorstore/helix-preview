// AUD-206 — exhaustive causality tests for the daily-only multi-day families.
// Calendar anchor (documented in strategies.ts): rebalance when (floor(t / 1 day) + 1) % period === 0, i.e. the
// CLOSE of every 7th / 28th UTC day counted from the Unix epoch. Weekly decisions fall on Wednesdays (UTC);
// the 28-day rule is a FIXED 28-day cycle (first: 1970-01-28), NOT a calendar month.
import { describe, expect, it } from 'vitest';
import { buildSignal, PARAM_GRID } from '../../bot/strategies';
import { validateCandles } from '../../bot/candles';
import type { Candle, StrategyFamily } from '../../bot/types';
import { mulberry32 } from '../../bot/stats';

const DAY = 86_400_000;
const FAMS: StrategyFamily[] = ['weekly_trend', 'monthly_momentum'];
const isRebalance = (t: number, period: number) => (Math.floor(t / DAY) + 1) % period === 0;

function walk(n: number, start: number, seed: number): Candle[] {
  const r = mulberry32(seed);
  let px = 100;
  return Array.from({ length: n }, (_, i) => {
    const o = px;
    const c = o * Math.exp(0.0005 + 0.03 * (r() - 0.5));
    px = c;
    return { t: start + i * DAY, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1 };
  });
}

/** Sequential position path exactly as the backtester drives it. */
function path(c: Candle[], f: StrategyFamily, params: Record<string, number>, upTo = c.length): (0 | 1)[] {
  const sig = buildSignal({ family: f, params }, c);
  const out: (0 | 1)[] = [];
  let pos: 0 | 1 = 0;
  for (let i = 0; i < upTo; i++) { pos = sig(i, pos); out.push(pos); }
  return out;
}

// 2019-12-01 → spans the 2020 leap day, month ends and three year boundaries
const START = Date.UTC(2019, 11, 1);
const C = walk(1300, START, 5);

describe('AUD-206 multi-day families: causality at every rebalance boundary', () => {
  for (const f of FAMS)
    for (const params of PARAM_GRID[f]) {
      const label = `${f}(${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',')})`;

      it(`${label}: makes real decisions (both entries and exits occur on rebalance days only)`, () => {
        const p = path(C, f, params);
        let changes = 0;
        for (let i = 1; i < p.length; i++) if (p[i] !== p[i - 1]) { changes++; expect(isRebalance(C[i].t, params.period)).toBe(true); }
        expect(changes).toBeGreaterThan(2);
        expect(p.includes(1) && p.slice(params.lookback ?? params.n).includes(0)).toBe(true);
      });

      it(`${label}: every rebalance decision is unchanged by extreme mutation of all later bars, flat and invested`, () => {
        const base = buildSignal({ family: f, params }, C);
        const rebal = C.map((k, i) => i).filter((i) => isRebalance(C[i].t, params.period));
        expect(rebal.length).toBeGreaterThan(40);
        for (const i of rebal) {
          for (const factor of [1e-6, 1e6]) {
            const mutated = C.map((k, j) => (j > i ? { ...k, o: k.o * factor, h: k.h * factor, l: k.l * factor, c: k.c * factor } : k));
            const sig = buildSignal({ family: f, params }, mutated);
            for (const pos of [0, 1] as const) expect(sig(i, pos)).toBe(base(i, pos));
          }
        }
      });

      it(`${label}: prefix-only data gives the same position path as the full dataset`, () => {
        const full = path(C, f, params);
        for (const cut of [400, 731, 1000, 1299]) {
          const prefix = path(C.slice(0, cut), f, params);
          expect(prefix).toEqual(full.slice(0, cut));
        }
      });
    }
});

describe('AUD-206 calendar edge cases', () => {
  it('the leap day 2020-02-29 is an ordinary day in the cycle (no skipped or doubled rebalance)', () => {
    const days = C.filter((k) => k.t >= Date.UTC(2020, 1, 20) && k.t <= Date.UTC(2020, 2, 10));
    const rebal = days.filter((k) => isRebalance(k.t, 7)).map((k) => k.t);
    for (let i = 1; i < rebal.length; i++) expect(rebal[i] - rebal[i - 1]).toBe(7 * DAY);
    expect(days.some((k) => k.t === Date.UTC(2020, 1, 29))).toBe(true);
  });

  it('weekly decisions are Wednesdays (UTC); 28-day decisions are exactly 28 days apart across month and year ends', () => {
    for (const k of C.filter((x) => isRebalance(x.t, 7))) expect(new Date(k.t).getUTCDay()).toBe(3);
    const r28 = C.filter((x) => isRebalance(x.t, 28)).map((x) => x.t);
    for (let i = 1; i < r28.length; i++) expect(r28[i] - r28[i - 1]).toBe(28 * DAY);
    // not calendar months: some 28-day decisions fall on different days of the month
    expect(new Set(r28.map((t) => new Date(t).getUTCDate())).size).toBeGreaterThan(1);
  });

  it('a missing candle on a rebalance day skips that decision (position held) instead of shifting it', () => {
    const params = PARAM_GRID.weekly_trend[0];
    const i = C.findIndex((k, j) => j > 300 && isRebalance(k.t, 7));
    const gap = [...C.slice(0, i), ...C.slice(i + 1)];
    const sig = buildSignal({ family: 'weekly_trend', params }, gap);
    // the bar after the gap is not a rebalance day → holds whatever position it is given
    expect(isRebalance(gap[i].t, 7)).toBe(false);
    expect(sig(i, 0)).toBe(0);
    expect(sig(i, 1)).toBe(1);
  });

  it('invalid and duplicate timestamps never reach a strategy: validation drops them', () => {
    const bad = [...C.slice(0, 50), { ...C[49] }, { ...C[50], t: C[50].t + 1234 }, { ...C[51], t: NaN }, ...C.slice(52, 60)];
    const v = validateCandles(bad, DAY, C[59].t + DAY, Infinity);
    const kinds = v.issues.map((x) => x.kind);
    expect(kinds).toContain('duplicate');
    expect(kinds.filter((k) => k === 'misaligned').length).toBeGreaterThanOrEqual(2);
    expect(v.candles.every((k, j) => j === 0 || k.t - v.candles[j - 1].t >= DAY)).toBe(true);
  });

  it('a NaN timestamp that bypassed validation can never trigger a rebalance (fails safe: hold)', () => {
    const c = C.slice(0, 400).map((k, i) => (i === 399 ? { ...k, t: NaN } : k));
    for (const f of FAMS) {
      const sig = buildSignal({ family: f, params: PARAM_GRID[f][0] }, c);
      expect(sig(399, 0)).toBe(0);
      expect(sig(399, 1)).toBe(1);
    }
  });
});
