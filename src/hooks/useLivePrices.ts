import { useEffect, useRef, useState } from 'react';
import { connectBinanceTicker } from '../services/market';

export function useLivePrices(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const priceRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!symbols.length) return undefined;
    const ws = connectBinanceTicker(symbols, (symbol, price) => {
      priceRef.current = { ...priceRef.current, [symbol]: price };
    });

    const interval = setInterval(() => {
      setPrices({ ...priceRef.current });
    }, 500);

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, [symbols.join(',')]);

  return prices;
}

