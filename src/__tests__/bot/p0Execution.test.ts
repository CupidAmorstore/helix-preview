// P0 unified execution engine (exec-v1): equivalence, accounting and contract tests.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { backtest } from '../../bot/backtest';
import { closeWindow, contractFor, initialState, replay, runBar, stepBar, summarize, type EngineState } from '../../bot/execution';
import { buildSignal, PARAM_GRID } from '../../bot/strategies';
import { COST_PRESETS } from '../../bot/costs';
import { HOUR } from '../../bot/candles';
import type { Candle, CostModel, StrategyFamily } from '../../bot/types';
import { flat, randomWalk, trendingRegimes } from './helpers';

const ZERO: CostModel = { venue: 'coinbase', takerFeeBps: 0, halfSpreadBps: 0, slippageBps: 0, fixedCostUsd: 0, minOrderUsd: 0, provenance: 'test' };
const DAY = 86_400_000;
const load = (sym: string, iv: '1h' | '1d'): Candle[] =>
  gunzipSync(readFileSync(`research/data/coinbase_${sym}_${iv}.csv.gz`)).toString().trim().split('\n').slice(1)
    .map((l) => { const [t, o, h, lo, c, v] = l.split(',').map(Number); return { t, o, h, l: lo, c, v }; });

describe('exec-v1 reproduces the legacy engine exactly on contiguous data (next_open, liquidate)', () => {
  const families = Object.keys(PARAM_GRID) as StrategyFamily[];
  for (const [sym, iv] of [['BTC-USD', '1d'], ['ETH-USD', '1h'], ['SOL-USD', '1d']] as const) {
    it(`${sym} ${iv}: every family, first grid config, real costs`, () => {
      const candles = load(sym, iv);
      const intervalMs = iv === '1d' ? DAY : HOUR;
      for (const family of families) {
        if ((family === 'weekly_trend' || family === 'monthly_momentum') && iv !== '1d') continue;
        const spec = { family, params: PARAM_GRID[family][0] };
        const start = Math.floor(candles.length / 2);
        const legacy = backtest(candles, spec, { start, end: candles.length, cost: COST_PRESETS.coinbase_taker, capitalUsd: 1000 });
        const unified = replay(candles, spec, contractFor(COST_PRESETS.coinbase_taker, intervalMs), start);
        expect(unified.trades.length, family).toBe(legacy.trades.length);
        expect(unified.netReturn, family).toBeCloseTo(legacy.netReturn, 10);
        expect(unified.totalCostUsd, family).toBeCloseTo(legacy.totalCostUsd, 6);
        expect(unified.maxDrawdown, family).toBeCloseTo(legacy.maxDrawdown, 10);
        expect(unified.rejectedOrders).toBe(legacy.rejectedOrders);
      }
    });
  }
});

describe('historical replay == forward incremental replay (identical events, identical accounting)', () => {
  it('chunked processing with JSON-serialised state between chunks (crash/restart) equals one batch pass', () => {
    const candles = trendingRegimes(900, 3);
    const spec = { family: 'ts_momentum' as const, params: { lookback: 24, threshold: 0 } };
    const c = contractFor(COST_PRESETS.coinbase_taker, HOUR, { terminal: 'mark' });
    const start = 100;
    const batchSig = buildSignal(spec, candles);
    const sb = initialState(1000);
    for (let i = 0; i < candles.length; i++) runBar(sb, candles, i, batchSig, c, start, Infinity);
    const batch = summarize(sb, c, closeWindow(sb, c));

    const fwdSig = buildSignal(spec, candles);
    let state: EngineState = initialState(1000);
    for (let from = 0; from < candles.length; from += 77) {
      state = JSON.parse(JSON.stringify(state)); // persisted to disk and reloaded
      for (let i = from; i < Math.min(from + 77, candles.length); i++) runBar(state, candles, i, fwdSig, c, start, Infinity);
    }
    const fwd = summarize(state, c, closeWindow(state, c));
    expect(fwd.ledger).toEqual(batch.ledger);
    expect(fwd.netReturn).toBe(batch.netReturn);
    expect(fwd.realizedPnlUsd).toBe(batch.realizedPnlUsd);
    expect(fwd.unrealizedPnlUsd).toBe(batch.unrealizedPnlUsd);
  });

  it('duplicate and out-of-order bars are ignored (idempotent), so replays after a crash cannot double-fill', () => {
    const k = randomWalk(50, 5);
    const c = contractFor(ZERO, HOUR);
    const s = initialState(100);
    const decide = () => 1 as const;
    for (const bar of k.slice(0, 10)) stepBar(s, bar, c, decide, true);
    const fills = s.ledger.filter((e) => e.kind === 'fill').length;
    expect(stepBar(s, k[5], c, decide, true)).toBe(false);
    expect(stepBar(s, k[9], c, decide, true)).toBe(false);
    expect(s.ledger.filter((e) => e.kind === 'fill').length).toBe(fills);
  });
});

describe('contract semantics', () => {
  it('missing fill bar: the order FAILS instead of filling at a later price (legacy bridged the gap)', () => {
    const k = flat(10);
    k[6] = { ...k[6], o: 200, h: 200, l: 200, c: 200 };
    const gapped = k.filter((_, i) => i !== 5); // bar 5 missing
    let calls = 0;
    const sig = (i: number) => { calls++; return (i === 4 ? 1 : i > 4 ? 1 : 0) as 0 | 1; };
    const r = replay(gapped, sig, contractFor(ZERO, HOUR), 0);
    expect(calls).toBeGreaterThan(0);
    expect(r.failedOrders).toBe(1);
    expect(r.ledger.find((e) => e.kind === 'failed')).toBeTruthy();
  });

  it('next_close fills one full bar later than next_open', () => {
    const k = randomWalk(30, 9);
    const sig = (i: number) => (i >= 3 ? 1 : 0) as 0 | 1;
    const a = replay(k, sig, contractFor(ZERO, HOUR, { fill: 'next_open' }), 0);
    const b = replay(k, sig, contractFor(ZERO, HOUR, { fill: 'next_close' }), 0);
    const fa = a.ledger.find((e) => e.kind === 'fill')!;
    const fb = b.ledger.find((e) => e.kind === 'fill')!;
    expect(fa.kind === 'fill' && fa.rawPx).toBe(k[4].o);
    expect(fb.kind === 'fill' && fb.rawPx).toBe(k[4].c);
  });

  it('terminal mark vs liquidate: same realized history, liquidation differs only by the exit cost', () => {
    const k = randomWalk(60, 2);
    const sig = (i: number) => (i >= 10 ? 1 : 0) as 0 | 1;
    const m = replay(k, sig, contractFor(COST_PRESETS.coinbase_taker, HOUR, { terminal: 'mark' }), 0);
    const l = replay(k, sig, contractFor(COST_PRESETS.coinbase_taker, HOUR, { terminal: 'liquidate' }), 0);
    expect(m.openPositionAtEnd).toBe(true);
    expect(m.forcedExits).toBe(0);
    expect(l.forcedExits).toBe(1);
    expect(l.naturalExits).toBe(0);
    const side = (60 + 2 + 3) / 10_000;
    expect((1 + m.netReturn) * (1 - side)).toBeCloseTo(1 + l.netReturn, 10);
  });

  it('venue minimum: orders below it are rejected and never resized up', () => {
    const k = randomWalk(20, 4);
    const cost = { ...ZERO, minOrderUsd: 10 };
    const r = replay(k, (i) => (i >= 2 ? 1 : 0), contractFor(cost, HOUR, { positionFraction: 0.05 }), 0, k.length, 100); // $5 < $10
    expect(r.trades.length).toBe(0);
    expect(r.rejectedOrders).toBeGreaterThan(0);
    expect(r.netReturn).toBe(0);
  });

  it('lot precision floors quantity; leftover stays in cash; accounting conserves value at zero cost', () => {
    const k = flat(10, 33.3);
    const r = replay(k, (i) => (i >= 1 && i < 5 ? 1 : 0), contractFor(ZERO, HOUR, { lotStepUnits: 1 }), 0, k.length, 100);
    const buy = r.ledger.find((e) => e.kind === 'fill' && e.side === 'buy');
    expect(buy && buy.kind === 'fill' && buy.units).toBe(3);
    expect(r.netReturn).toBeCloseTo(0, 12);
  });

  it('partial fills: entry capped by participation x bar volume; exit remainder retried next bar', () => {
    const k = flat(12, 10).map((b) => ({ ...b, v: 5 })); // $50 per bar of volume
    const r = replay(k, (i) => (i >= 1 && i < 5 ? 1 : 0), contractFor(ZERO, HOUR, { maxParticipation: 0.1 }), 0, k.length, 100);
    const fills = r.ledger.filter((e) => e.kind === 'fill');
    expect(fills[0].kind === 'fill' && fills[0].partial && fills[0].usd).toBeCloseTo(5, 10);
    expect(r.netReturn).toBeCloseTo(0, 12);
    expect(r.openPositionAtEnd).toBe(false);
  });

  it('future-data mutation: changing bars after t never changes fills at or before t', () => {
    const k = randomWalk(400, 11);
    const spec = { family: 'sma_cross' as const, params: { fast: 10, slow: 30 } };
    const base = replay(k, spec, contractFor(COST_PRESETS.coinbase_taker, HOUR, { terminal: 'mark' }), 50, 400);
    const cut = k[250].t;
    const mutated = k.map((b, i) => (i > 250 ? { ...b, o: b.o * 3, h: b.h * 3, l: b.l * 3, c: b.c * 3 } : b));
    const mut = replay(mutated, spec, contractFor(COST_PRESETS.coinbase_taker, HOUR, { terminal: 'mark' }), 50, 400);
    const before = (r: typeof base) => r.ledger.filter((e) => e.t <= cut);
    expect(before(mut)).toEqual(before(base));
  });

  it('accounting identity: final equity = capital + realized + unrealized', () => {
    const k = randomWalk(500, 21);
    const r = replay(k, { family: 'ts_momentum', params: { lookback: 24, threshold: 0 } }, contractFor(COST_PRESETS.kraken_taker, HOUR, { terminal: 'mark' }), 30, 500, 250);
    expect(250 * (1 + r.netReturn)).toBeCloseTo(250 + r.realizedPnlUsd + r.unrealizedPnlUsd, 8);
  });
});
