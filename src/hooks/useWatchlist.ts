import { useCallback, useEffect, useState } from 'react';
import { getSetting, setSetting } from '../services/storage';

export const DEFAULT_WATCHLIST = ['BTC', 'ETH', 'SOL'];

/** Shared watchlist (symbols), persisted on the device. */
export function useWatchlist() {
  const [list, setList] = useState<string[]>(DEFAULT_WATCHLIST);
  useEffect(() => {
    getSetting<string[]>('watchlist').then((w) => Array.isArray(w) && setList(w)).catch(() => undefined);
  }, []);
  const toggle = useCallback((sym: string) => {
    setList((prev) => {
      const next = prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym];
      setSetting('watchlist', next).catch(() => undefined);
      return next;
    });
  }, []);
  return { list, toggle, has: (s: string) => list.includes(s) };
}
