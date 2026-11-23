import { useEffect, useRef, useState } from 'react';
import { connectTicker, type FeedStatus } from '../services/market';

export type LiveFeed = {
  prices: Record<string, number>;
  /** Coinbase 24h opening price per symbol (for a real 24h change) */
  open24h: Record<string, number>;
  /** 'stale' = connected but no price update for STALE_MS */
  status: FeedStatus | 'stale';
  updatedAt: number | null;
};

export const STALE_MS = 30_000;

/** Live prices keyed by base symbol (BTC, ETH, ...), with honest connection status. */
export function useLiveFeed(products: string[]): LiveFeed {
  const [feed, setFeed] = useState<LiveFeed>({ prices: {}, open24h: {}, status: 'connecting', updatedAt: null });
  const priceRef = useRef<Record<string, number>>({});
  const openRef = useRef<Record<string, number>>({});
  const statusRef = useRef<FeedStatus>('connecting');
  const updatedRef = useRef<number | null>(null);
  const key = products.join(',');

  useEffect(() => {
    if (!key) return undefined;
    const handle = connectTicker(
      key.split(','),
      (symbol, price, open24h) => {
        priceRef.current = { ...priceRef.current, [symbol]: price };
        if (open24h) openRef.current = { ...openRef.current, [symbol]: open24h };
        updatedRef.current = Date.now();
      },
      (status) => {
        statusRef.current = status;
      }
    );
    const interval = setInterval(() => {
      const updatedAt = updatedRef.current;
      const base = statusRef.current;
      const stale = base === 'live' && updatedAt !== null && Date.now() - updatedAt > STALE_MS;
      setFeed({ prices: { ...priceRef.current }, open24h: { ...openRef.current }, status: stale ? 'stale' : base, updatedAt });
    }, 500);
    return () => {
      handle.close();
      clearInterval(interval);
    };
  }, [key]);

  return feed;
}

/** Backwards-compatible: prices only. */
export function useLivePrices(products: string[]) {
  return useLiveFeed(products).prices;
}
