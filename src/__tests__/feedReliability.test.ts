import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectTicker } from '../services/market';
import { simulateXs } from '../bot/crossSectional';
import { COST_PRESETS } from '../bot/costs';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

type Fake = { readyState: number; onopen?: () => void; onclose?: () => void; onmessage?: (e: { data: string }) => void; send: () => void; close: () => void };
function harness() {
  const sockets: Fake[] = [];
  const make = () => { const s: Fake = { readyState: 1, send: () => undefined, close: () => { s.readyState = 3; s.onclose?.(); } }; sockets.push(s); return s as unknown as WebSocket; };
  return { sockets, make };
}

describe('live ticker parsing', () => {
  it('maps product ids to symbols and ignores malformed, non-ticker, NaN and unknown frames', () => {
    const { sockets, make } = harness();
    const got: string[] = [];
    const h = connectTicker(['BTC-USD', 'ETH-USD'], (s, p, o) => got.push(`${s}:${p}:${o ?? '-'}`), () => undefined, make);
    sockets[0].onopen?.();
    const send = (d: unknown) => sockets[0].onmessage?.({ data: typeof d === 'string' ? d : JSON.stringify(d) });
    send('not json{');
    send({ type: 'heartbeat', product_id: 'BTC-USD' });
    send({ type: 'subscriptions' });
    send({ type: 'ticker', product_id: 'BTC-USD', price: 'abc' });
    send({ type: 'ticker', price: '1' });
    send({ type: 'ticker', product_id: 'BTC-USD', price: '60000.5', open_24h: '59000' });
    send({ type: 'ticker', product_id: 'BTC-USD', price: '60000.5', open_24h: '59000' }); // duplicate
    send({ type: 'ticker', product_id: 'ETH-USD', price: '1700', open_24h: 'x' });
    expect(got).toEqual(['BTC:60000.5:59000', 'BTC:60000.5:59000', 'ETH:1700:-']);
    h.close();
  });
});

describe('cached market data under rate limits / outages', () => {
  it('CoinGecko 429 → last good copy with its age; no copy → readable error', async () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) });
    const rows = [{ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', image: '', current_price: 1, market_cap: 1, market_cap_rank: 1, total_volume: 1, price_change_percentage_24h: 0 }];
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(rows))));
    vi.resetModules();
    const { fetchTopCoins } = await import('../services/marketData');
    const first = await fetchTopCoins();
    expect(first.fromCache).toBe(false);
    expect(first.data[0].symbol).toBe('BTC');
    // age the cache past its 5-minute freshness, then the source rate-limits
    const k = [...store.keys()][0];
    const c = JSON.parse(store.get(k)!); c.fetchedAt -= 10 * 60_000; store.set(k, JSON.stringify(c));
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 429 })));
    const second = await fetchTopCoins();
    expect(second.fromCache).toBe(true);
    expect(second.fetchedAt).toBe(c.fetchedAt);
    store.clear();
    await expect(fetchTopCoins()).rejects.toThrow(/rate limit/);
  });
});

describe('cross-market timestamp alignment (research)', () => {
  it('uses only days present in EVERY market (no forward fill, no misaligned rows)', () => {
    const DAY = 86_400_000;
    const mk = (days: number[], px: number) => days.map((d) => ({ t: Date.UTC(2024, 0, 1) + d * DAY, o: px, h: px, l: px, c: px, v: 1 }));
    // coin B is missing day 3: a decision needing day 3 must not use a filled-in price
    const A = mk([0, 1, 2, 3, 4, 5, 6, 7], 100);
    const B = mk([0, 1, 2, 4, 5, 6, 7], 50);
    const w = simulateXs([{ symbol: 'A', candles: A }, { symbol: 'B', candles: B }], { lookback: 1, topK: 1, rebalance: 1 }, A[1].t, A[7].t, COST_PRESETS.coinbase_taker);
    expect(w.periodReturns.every((p) => p.entryT !== A[3].t)).toBe(true);
    expect(w.netReturn).toBe(0); // flat prices → no positive momentum → stays in cash
  });
});
