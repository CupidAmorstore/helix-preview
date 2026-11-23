export type MarketCoin = {
  id: string;
  symbol: string;
  name: string;
  /** Coinbase product id */
  product: string;
};

export const MARKET_COINS: MarketCoin[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', product: 'BTC-USD' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', product: 'ETH-USD' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', product: 'SOL-USD' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', product: 'LINK-USD' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', product: 'XRP-USD' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', product: 'DOGE-USD' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', product: 'ADA-USD' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', product: 'AVAX-USD' }
];

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

export async function fetchMarketOverview() {
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('CoinGecko market list failed');
  return res.json();
}

export async function fetchPriceMap(ids: string[]): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
  if (!ids.length) return {};
  const url = `${COINGECKO_BASE}/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('CoinGecko price map failed');
  return res.json();
}

// Live data: Coinbase Exchange public REST + WebSocket (keyless).
// Binance was replaced: api.binance.com returns HTTP 451 (restricted location) in several regions.
import { resample } from '../bot/candles';
import type { Candle } from '../bot/types';

const COINBASE_REST = 'https://api.exchange.coinbase.com';
const COINBASE_WS = 'wss://ws-feed.exchange.coinbase.com';

const NATIVE: Record<string, number> = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '6h': 21600, '1d': 86400 };
/** timeframes Coinbase lacks are built from complete smaller candles */
const DERIVED: Record<string, { base: string; targetSec: number }> = {
  '4h': { base: '1h', targetSec: 4 * 3600 },
  '1w': { base: '1d', targetSec: 7 * 86400 }
};

/** Completed + forming candles for a chart, oldest first (max ~300 base candles). */
export async function fetchCandles(product: string, timeframe: string): Promise<Candle[]> {
  const derived = DERIVED[timeframe];
  const gran = NATIVE[derived ? derived.base : timeframe] ?? 3600;
  const res = await fetch(`${COINBASE_REST}/products/${product}/candles?granularity=${gran}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Coinbase candles failed (${res.status})`);
  const rows = (await res.json()) as number[][];
  const candles = rows
    .map((r) => ({ t: r[0] * 1000, l: r[1], h: r[2], o: r[3], c: r[4], v: r[5] }))
    .sort((a, b) => a.t - b.t);
  return derived ? resample(candles, gran * 1000, derived.targetSec * 1000) : candles;
}

export type FeedStatus = 'connecting' | 'live' | 'reconnecting';

/** Delay before reconnect attempt n (0-based): 1 s, 2 s, 4 s … capped at 30 s. */
export function reconnectDelay(attempt: number): number {
  return Math.min(30_000, 1000 * 2 ** attempt);
}

/**
 * Live last-trade prices via the public ticker channel, with automatic reconnection.
 * Callback receives the base symbol (e.g. BTC). Returns a handle whose close() stops reconnecting.
 */
export function connectTicker(
  products: string[],
  onMessage: (symbol: string, price: number, open24h?: number) => void,
  onStatus: (status: FeedStatus) => void = () => undefined,
  makeSocket: (url: string) => WebSocket = (url) => new WebSocket(url)
): { close: () => void } {
  let ws: WebSocket | null = null;
  let attempt = 0;
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const open = () => {
    if (closed) return;
    onStatus(attempt === 0 ? 'connecting' : 'reconnecting');
    ws = makeSocket(COINBASE_WS);
    ws.onopen = () => {
      attempt = 0;
      ws?.send(JSON.stringify({ type: 'subscribe', product_ids: products, channels: ['ticker'] }));
      onStatus('live');
    };
    ws.onmessage = (event) => {
      try {
        const m = JSON.parse(event.data);
        if (m.type !== 'ticker' || !m.product_id) return;
        const price = parseFloat(m.price);
        const open24h = parseFloat(m.open_24h);
        if (Number.isFinite(price)) onMessage(String(m.product_id).split('-')[0], price, Number.isFinite(open24h) ? open24h : undefined);
      } catch {
        // ignore malformed frames
      }
    };
    ws.onclose = () => {
      if (closed) return;
      onStatus('reconnecting');
      timer = setTimeout(open, reconnectDelay(attempt));
      attempt += 1;
    };
    ws.onerror = () => ws?.close();
  };

  open();
  return {
    close: () => {
      closed = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    }
  };
}

export const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];
