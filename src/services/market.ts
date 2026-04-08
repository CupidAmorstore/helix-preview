export type MarketCoin = {
  id: string;
  symbol: string;
  name: string;
  binance: string;
};

export const MARKET_COINS: MarketCoin[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', binance: 'BTCUSDT' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', binance: 'ETHUSDT' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', binance: 'SOLUSDT' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', binance: 'BNBUSDT' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', binance: 'XRPUSDT' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', binance: 'DOGEUSDT' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', binance: 'ADAUSDT' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', binance: 'AVAXUSDT' }
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

export type BinanceKline = [number, string, string, string, string, string, number, string, number, string, string, string];

export async function fetchBinanceKlines(symbol: string, interval: string, limit = 200): Promise<BinanceKline[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Binance kline fetch failed');
  return res.json();
}

export function connectBinanceTicker(symbols: string[], onMessage: (symbol: string, price: number) => void): WebSocket {
  const streams = symbols.map((s) => `${s.toLowerCase()}@miniTicker`).join('/');
  const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const payload = data.data ?? data;
      if (!payload || !payload.s) return;
      onMessage(payload.s.replace('USDT', ''), parseFloat(payload.c));
    } catch {
      // ignore
    }
  };
  return ws;
}

export function intervalLabelToBinance(tf: string): string {
  switch (tf) {
    case '1m':
      return '1m';
    case '5m':
      return '5m';
    case '15m':
      return '15m';
    case '1h':
      return '1h';
    case '4h':
      return '4h';
    case '1d':
      return '1d';
    case '1w':
      return '1w';
    default:
      return '1h';
  }
}

