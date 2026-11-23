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

describe('live ticker reconnection', () => {
  it('backs off 1s, 2s, 4s… capped at 30s', async () => {
    const { reconnectDelay } = await import('../services/market');
    expect([0, 1, 2, 3, 4, 5, 6].map(reconnectDelay)).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000]);
  });

  it('reconnects after the socket drops and stops after close()', async () => {
    vi.useFakeTimers();
    const { connectTicker } = await import('../services/market');
    type Fake = { onopen?: () => void; onclose?: () => void; onmessage?: (e: { data: string }) => void; onerror?: () => void; send: () => void; close: () => void };
    const sockets: Fake[] = [];
    const make = () => {
      const s: Fake = { send: vi.fn(), close: vi.fn(() => s.onclose?.()) };
      sockets.push(s);
      return s as unknown as WebSocket;
    };
    const statuses: string[] = [];
    const got: string[] = [];
    const h = connectTicker(['BTC-USD'], (sym, px) => got.push(`${sym}:${px}`), (st) => statuses.push(st), make);
    sockets[0].onopen?.();
    sockets[0].onmessage?.({ data: JSON.stringify({ type: 'ticker', product_id: 'BTC-USD', price: '60000.5' }) });
    sockets[0].onclose?.(); // network drop
    expect(statuses.at(-1)).toBe('reconnecting');
    await vi.advanceTimersByTimeAsync(1000);
    expect(sockets).toHaveLength(2);
    sockets[1].onopen?.();
    expect(statuses.at(-1)).toBe('live');
    h.close();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sockets).toHaveLength(2); // no reconnect after close()
    expect(got).toEqual(['BTC:60000.5']);
    vi.useRealTimers();
  });
});
