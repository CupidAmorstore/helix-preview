import { describe, expect, it } from 'vitest';
import { rankMarkets, scanMarket } from '../../bot/opportunityScanner';
import type { Candle } from '../../bot/types';
import { mulberry32 } from '../../bot/stats';

const DAY = 86_400_000;
const T0 = Date.UTC(2025, 2, 1); // series end late 2026, inside the fee-evidence validity window
function daily(n: number, vol: number, seed = 1, usdVol = 5e6): Candle[] {
  const r = mulberry32(seed); let px = 100;
  return Array.from({ length: n }, (_, i) => { const o = px; const c = o * Math.exp(vol * (r() - 0.5) * 2); px = c; return { t: T0 + i * DAY, o, h: Math.max(o, c), l: Math.min(o, c), c, v: usdVol / c }; });
}
const now = (k: Candle[]) => k[k.length - 1].t + DAY + 3600_000;

describe('Watchbot v2 opportunity screen', () => {
  it('a liquid, volatile, clean market is eligible for research — never a signal', () => {
    const k = daily(600, 0.05);
    const r = scanMarket({ symbol: 'X', venue: 'kraken', region: 'CA', daily: k, forwardRegistered: true }, 1000, now(k));
    expect(r.status).toBe('eligible_for_research');
    expect(r.unknowns.join(' ')).toMatch(/predictive edge/);
  });
  it('low volatility fails the economics (break-even vs typical weekly move)', () => {
    const k = daily(600, 0.002);
    expect(scanMarket({ symbol: 'X', venue: 'kraken', region: 'CA', daily: k, forwardRegistered: true }, 1000, now(k)).blocking.join(' ')).toMatch(/economics/);
  });
  it('thin, gapped, stale or short markets are rejected with named reasons', () => {
    const thin = daily(600, 0.05, 2, 10_000);
    expect(scanMarket({ symbol: 'T', venue: 'kraken', region: 'CA', daily: thin, forwardRegistered: false }, 1000, now(thin)).blocking.join(' ')).toMatch(/median daily volume/);
    const gapped = daily(600, 0.05); gapped.splice(500, 3);
    expect(scanMarket({ symbol: 'G', venue: 'kraken', region: 'CA', daily: gapped, forwardRegistered: false }, 1000, now(gapped)).blocking.join(' ')).toMatch(/gap/);
    const k = daily(600, 0.05);
    expect(scanMarket({ symbol: 'S', venue: 'kraken', region: 'CA', daily: k, forwardRegistered: false }, 1000, now(k) + 10 * DAY).blocking.join(' ')).toMatch(/stale/);
    const short = daily(120, 0.05);
    expect(scanMarket({ symbol: 'H', venue: 'kraken', region: 'CA', daily: short, forwardRegistered: false }, 1000, now(short)).status).toBe('rejected');
  });
  it('missing fee evidence fails closed (Coinbase, region CA)', () => {
    const k = daily(600, 0.05);
    expect(scanMarket({ symbol: 'X', venue: 'coinbase', region: 'CA', daily: k, forwardRegistered: true }, 1000, now(k)).blocking.join(' ')).toMatch(/no fee evidence|only superseded/);
  });
  it('ranking: eligible first by headroom, rejected last; deterministic', () => {
    const a = daily(600, 0.08, 3), b = daily(600, 0.04, 4), c = daily(600, 0.001, 5);
    const rows = rankMarkets([c, b, a].map((k, i) => scanMarket({ symbol: `M${i}`, venue: 'kraken', region: 'CA', daily: k, forwardRegistered: true }, 1000, now(k))));
    expect(rows.map((r) => r.status)).toEqual(['eligible_for_research', 'eligible_for_research', 'rejected']);
    expect(rows[0].headroom!).toBeGreaterThan(rows[1].headroom!);
  });
});
