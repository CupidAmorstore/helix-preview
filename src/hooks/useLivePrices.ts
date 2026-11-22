import { useEffect, useRef, useState } from 'react';
import { connectTicker } from '../services/market';

/** Live prices keyed by base symbol (BTC, ETH, ...). `products` are Coinbase product ids. */
export function useLivePrices(products: string[]) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const priceRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!products.length) return undefined;
    const ws = connectTicker(products, (symbol, price) => {
      priceRef.current = { ...priceRef.current, [symbol]: price };
    });

    const interval = setInterval(() => {
      setPrices({ ...priceRef.current });
    }, 500);

    return () => {
      ws.close();
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the joined list, not the array identity
  }, [products.join(',')]);

  return prices;
}

