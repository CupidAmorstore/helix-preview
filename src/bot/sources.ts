import type { Candle, MarketRef } from './types';

/**
 * Free, keyless, public market-data adapters. READ-ONLY: no authenticated endpoints, no order endpoints.
 * Verified reachable 2026-11-22 from the research container; Binance returned HTTP 451 (restricted location)
 * and is intentionally not used by the bot.
 */
export type Fetcher = (url: string) => Promise<unknown>;

export const defaultFetcher: Fetcher = async (url) => {
  const res = await fetch(url, { cache: 'no-store' } as RequestInit);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Coinbase Exchange candles: max 300 per request, rows [time_s, low, high, open, close, volume], newest first. */
export async function fetchCoinbaseCandles(
  product: string,
  granularitySec: 3600 | 21600 | 86400,
  startMs: number,
  endMs: number,
  fetcher: Fetcher = defaultFetcher,
  throttleMs = 250
): Promise<Candle[]> {
  const step = 300 * granularitySec * 1000;
  const out: Candle[] = [];
  for (let a = startMs; a < endMs; a += step) {
    const b = Math.min(endMs, a + step);
    const url = `https://api.exchange.coinbase.com/products/${product}/candles?granularity=${granularitySec}&start=${new Date(a).toISOString()}&end=${new Date(b).toISOString()}`;
    const rows = (await fetcher(url)) as number[][];
    if (!Array.isArray(rows)) throw new Error(`unexpected Coinbase response for ${product}`);
    for (const r of rows) out.push({ t: r[0] * 1000, l: +r[1], h: +r[2], o: +r[3], c: +r[4], v: +r[5] });
    if (throttleMs) await sleep(throttleMs);
  }
  return out;
}

/** Kraken OHLC: returns at most the last 720 bars; the final row is the still-forming bar. */
export async function fetchKrakenOHLC(pair: string, intervalMin: 60 | 240 | 1440, fetcher: Fetcher = defaultFetcher): Promise<Candle[]> {
  const j = (await fetcher(`https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${intervalMin}`)) as {
    error: string[];
    result: Record<string, unknown>;
  };
  if (j.error?.length) throw new Error(`Kraken: ${j.error.join(',')}`);
  const key = Object.keys(j.result).find((k) => k !== 'last');
  if (!key) throw new Error('Kraken: empty result');
  return (j.result[key] as (string | number)[][]).map((r) => ({
    t: Number(r[0]) * 1000,
    o: +r[1],
    h: +r[2],
    l: +r[3],
    c: +r[4],
    v: +r[6]
  }));
}

export type Quote = { venue: string; symbol: string; bid: number; ask: number; observedAt: number };

export async function fetchQuote(m: MarketRef, fetcher: Fetcher = defaultFetcher): Promise<Quote> {
  const observedAt = Date.now();
  if (m.venue === 'coinbase') {
    const j = (await fetcher(`https://api.exchange.coinbase.com/products/${m.symbol}/ticker`)) as { bid: string; ask: string };
    return { venue: 'coinbase', symbol: m.symbol, bid: +j.bid, ask: +j.ask, observedAt };
  }
  if (m.venue === 'kraken') {
    const j = (await fetcher(`https://api.kraken.com/0/public/Ticker?pair=${m.symbol}`)) as {
      result: Record<string, { a: string[]; b: string[] }>;
    };
    const v = Object.values(j.result)[0];
    return { venue: 'kraken', symbol: m.symbol, bid: +v.b[0], ask: +v.a[0], observedAt };
  }
  const j = (await fetcher(`https://api.gemini.com/v1/pubticker/${m.symbol}`)) as { bid: string; ask: string };
  return { venue: 'gemini', symbol: m.symbol, bid: +j.bid, ask: +j.ask, observedAt };
}

/** Venue minimum order in USD from public metadata (null when unavailable). */
export async function fetchMinOrderUsd(m: MarketRef, refPx: number, fetcher: Fetcher = defaultFetcher): Promise<number | null> {
  try {
    if (m.venue === 'coinbase') {
      const j = (await fetcher(`https://api.exchange.coinbase.com/products/${m.symbol}`)) as {
        min_market_funds?: string;
        base_min_size?: string;
      };
      if (j.min_market_funds) return +j.min_market_funds;
      if (j.base_min_size) return +j.base_min_size * refPx;
      return null;
    }
    if (m.venue === 'kraken') {
      const j = (await fetcher(`https://api.kraken.com/0/public/AssetPairs?pair=${m.symbol}`)) as {
        result: Record<string, { ordermin?: string; costmin?: string }>;
      };
      const v = Object.values(j.result)[0];
      const byBase = v.ordermin ? +v.ordermin * refPx : 0;
      const byCost = v.costmin ? +v.costmin : 0;
      return Math.max(byBase, byCost) || null;
    }
  } catch {
    return null;
  }
  return null;
}

/** Research universe: liquid USD spot markets on Coinbase (long public history). */
export const RESEARCH_UNIVERSE: MarketRef[] = [
  'BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'LTC', 'DOT'
].map((b) => ({ venue: 'coinbase' as const, symbol: `${b}-USD`, base: b, quote: 'USD' }));

/** Kraken symbols for the same bases (for cross-venue comparison). */
export const KRAKEN_SYMBOLS: Record<string, string> = {
  BTC: 'XBTUSD', ETH: 'ETHUSD', SOL: 'SOLUSD', XRP: 'XRPUSD', DOGE: 'XDGUSD',
  ADA: 'ADAUSD', AVAX: 'AVAXUSD', LINK: 'LINKUSD', LTC: 'LTCUSD', DOT: 'DOTUSD'
};
