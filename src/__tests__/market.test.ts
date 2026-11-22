import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchCandles, MARKET_COINS } from '../services/market';

const H = 3600;
// Coinbase rows: [time_s, low, high, open, close, volume], newest first
const rows = (n: number, stepSec: number, start = 1_700_006_400) =>
  Array.from({ length: n }, (_, i) => {
    const t = start + i * stepSec;
    return [t, 99 + i, 101 + i, 100 + i, 100.5 + i, 1];
  }).reverse();

afterEach(() => vi.unstubAllGlobals());

describe('market service (Coinbase)', () => {
  it('requests the native granularity and returns oldest-first candles', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => rows(5, H) });
    vi.stubGlobal('fetch', fetchMock);
    const c = await fetchCandles('BTC-USD', '1h');
    expect(fetchMock.mock.calls[0][0]).toContain('/products/BTC-USD/candles?granularity=3600');
    expect(c).toHaveLength(5);
    expect(c[0].t).toBeLessThan(c[4].t);
    expect(c[0].o).toBe(100);
  });

  it('builds 4h from complete 1h candles only', async () => {
    // start is 4h-aligned (1_700_006_400 % 14_400 === 0); 10 hourly bars -> 2 complete 4h bars
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => rows(10, H) }));
    const c = await fetchCandles('ETH-USD', '4h');
    expect(c).toHaveLength(2);
    expect(c[0].o).toBe(100);
    expect(c[0].c).toBe(103.5);
    expect(c[0].h).toBe(104);
  });

  it('throws on HTTP errors instead of returning fabricated data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 451, json: async () => ({}) }));
    await expect(fetchCandles('BTC-USD', '1h')).rejects.toThrow(/451/);
  });

  it('every tracked coin uses a Coinbase USD product id', () => {
    for (const c of MARKET_COINS) expect(c.product).toMatch(/^[A-Z]+-USD$/);
  });
});
