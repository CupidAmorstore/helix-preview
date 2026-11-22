import { describe, expect, it } from 'vitest';
import { LIVE_TRADING_ENABLED, accountFeasibility, checkEntry, DEFAULT_RISK, updateRiskState } from '../../bot/risk';
import { COST_PRESETS } from '../../bot/costs';
import { createPaperAccount, stepPaper, paperSummary, accountEquity } from '../../bot/paper';
import { ACCOUNT_SIZES } from '../../bot/research';
import { HOUR } from '../../bot/candles';
import { randomWalk } from './helpers';

describe('paper-only lock', () => {
  it('live trading is disabled', () => {
    expect(LIVE_TRADING_ENABLED).toBe(false);
  });

  it('bot source contains no authenticated/order endpoints', () => {
    const files = import.meta.glob('../../bot/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    expect(Object.keys(files).length).toBeGreaterThan(8);
    const src = Object.values(files).join('\n');
    for (const bad of ['/orders', 'CB-ACCESS', 'API-Sign', '/0/private', 'X-GEMINI-APIKEY', 'signTransaction', 'sendTransaction'])
      expect(src.includes(bad)).toBe(false);
  });
});

describe('small-capital feasibility ($20–$1,000)', () => {
  it.each(ACCOUNT_SIZES)('$%i produces an explicit verdict per venue', (cap) => {
    for (const k of ['coinbase_taker', 'kraken_taker', 'dex_solana', 'dex_ethereum_l1']) {
      const f = accountFeasibility(cap, COST_PRESETS[k]);
      expect(['tradable', 'single_position_only', 'not_tradable']).toContain(f.verdict);
    }
  });

  it('$20 with an $8 venue minimum cannot hold a 25% slice; $20 on Ethereum L1 is not tradable', () => {
    expect(accountFeasibility(20, { ...COST_PRESETS.kraken_taker, minOrderUsd: 8 }).verdict).toBe('single_position_only');
    expect(accountFeasibility(20, COST_PRESETS.kraken_taker).verdict).toBe('tradable'); // $5 slice == $5 min
    expect(accountFeasibility(20, COST_PRESETS.dex_ethereum_l1).verdict).toBe('not_tradable');
    expect(accountFeasibility(1000, COST_PRESETS.kraken_taker).verdict).toBe('tradable');
  });
});

describe('risk checks', () => {
  const base = { policy: DEFAULT_RISK, equity: 1000, notional: 200, cost: COST_PRESETS.coinbase_taker, openPositionBases: [] as string[], base: 'BTC', dataStale: false };
  const st = { equityPeak: 1000, dayStartEquity: 1000, weekStartEquity: 1000, killSwitch: false };
  it('allows a normal entry', () => expect(checkEntry({ ...base, state: st }).allowed).toBe(true));
  it('blocks stale data, duplicate base exposure, oversize and kill switch', () => {
    expect(checkEntry({ ...base, state: st, dataStale: true }).allowed).toBe(false);
    expect(checkEntry({ ...base, state: st, openPositionBases: ['BTC'] }).reasons.join()).toMatch(/duplicate/);
    expect(checkEntry({ ...base, state: st, notional: 600 }).allowed).toBe(false);
    expect(checkEntry({ ...base, state: { ...st, killSwitch: true } }).allowed).toBe(false);
  });
  it('daily loss limit blocks entries; drawdown trips kill switch', () => {
    expect(checkEntry({ ...base, state: st, equity: 960 }).reasons.join()).toMatch(/daily loss/);
    const s2 = updateRiskState(st, 840, DEFAULT_RISK, 0, 0);
    expect(s2.killSwitch).toBe(true);
  });
});

describe('paper accounts (forward only)', () => {
  const c = randomWalk(1500, 31);
  const mk = (createdAt: number) =>
    createPaperAccount({
      id: 'a', label: 'test', kind: 'diagnostic', intervalMs: HOUR, initialCash: 1000, createdAt,
      market: { venue: 'coinbase', symbol: 'TEST-USD', base: 'TEST', quote: 'USD' },
      spec: { family: 'ts_momentum', params: { lookback: 24, threshold: 0 } },
      cost: COST_PRESETS.coinbase_taker
    });

  it('never trades bars that opened before the account was created', () => {
    const created = c[1000].t;
    const acc = stepPaper(mk(created), c, { dataStale: false });
    expect(acc.fills.every((f) => f.t > created)).toBe(true);
    expect(acc.equity[0][0]).toBe(created);
  });

  it('an account created after the last bar processes nothing ($0 P&L, 0 trades — not a success)', () => {
    const acc = stepPaper(mk(c[1499].t + HOUR), c, { dataStale: false });
    const s = paperSummary(acc, c[1499].c);
    expect(s.barsProcessed).toBe(0);
    expect(s.trades).toBe(0);
    expect(s.netReturnPct).toBe(0);
  });

  it('is restart-safe: processing in two chunks equals processing once', () => {
    const created = c[800].t;
    const once = stepPaper(mk(created), c, { dataStale: false });
    const half = stepPaper(mk(created), c.slice(0, 1200), { dataStale: false });
    const resumed = stepPaper(JSON.parse(JSON.stringify(half)), c, { dataStale: false });
    expect(resumed.fills).toEqual(once.fills);
    expect(resumed.cash).toBeCloseTo(once.cash, 9);
  });

  it('accounting identity: cash change = realized P&L when flat; costs recorded', () => {
    const acc = stepPaper(mk(c[200].t), c, { dataStale: false });
    const last = c[c.length - 1].c;
    if (acc.units === 0) expect(acc.cash - 1000).toBeCloseTo(acc.realizedPnl, 8);
    expect(accountEquity(acc, last)).toBeCloseTo(acc.cash + acc.units * last, 10);
    if (acc.fills.length) expect(acc.totalCostUsd).toBeGreaterThan(0);
    expect(acc.fills.filter((f) => f.side === 'buy').every((f) => f.notional <= 250 + 1e-6)).toBe(true); // 25% cap
  });
});
