import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getSetting, setSetting } from '../services/storage';
import { MARKET_COINS } from '../services/market';
import { useLiveFeed, type LiveFeed } from '../hooks/useLivePrices';
import { createAccount, placeOrder, recordEquity, setHalted, valueAccount, type OrderRequest, type PaperAccount, type PaperOrder } from './engine';

const KEY = 'paper_account_v1';
const CORE_PRODUCTS = MARKET_COINS.map((c) => c.product);

type PaperCtx = {
  account: PaperAccount | null;
  loading: boolean;
  feed: LiveFeed;
  /** last time each symbol's live price arrived (ms) */
  priceTs: Record<string, number>;
  value: ReturnType<typeof valueAccount> | null;
  start: (cash: number) => Promise<void>;
  place: (req: OrderRequest, price: number, priceTs: number) => Promise<PaperOrder>;
  pause: (halted: boolean) => Promise<void>;
};

const Ctx = createContext<PaperCtx | null>(null);

export function PaperProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const feed = useLiveFeed(CORE_PRODUCTS);
  const prev = useRef<Record<string, number>>({});
  const [priceTs, setPriceTs] = useState<Record<string, number>>({});
  const accRef = useRef<PaperAccount | null>(null);
  accRef.current = account;

  useEffect(() => {
    getSetting<PaperAccount>(KEY)
      .then((a) => setAccount(a && a.version === 1 ? a : null))
      .catch(() => setAccount(null))
      .finally(() => setLoading(false));
  }, []);

  // track when each price last changed (used to refuse stale quotes)
  useEffect(() => {
    const now = Date.now();
    const changed: Record<string, number> = {};
    for (const [s, p] of Object.entries(feed.prices)) if (prev.current[s] !== p) changed[s] = now;
    prev.current = feed.prices;
    if (Object.keys(changed).length) setPriceTs((t) => ({ ...t, ...changed }));
  }, [feed.prices]);

  const persist = useCallback(async (a: PaperAccount | null) => {
    setAccount(a);
    await setSetting(KEY, a);
  }, []);

  // hourly valuation point for the equity chart (only with live prices for every position)
  useEffect(() => {
    if (!account || feed.status !== 'live') return;
    const v = valueAccount(account, feed.prices);
    if (v.missingPrice) return;
    const next = recordEquity(account, v.equity, Date.now());
    if (next !== account) persist(next).catch(() => undefined);
  }, [account, feed.prices, feed.status, persist]);

  const start = useCallback(async (cash: number) => persist(createAccount(cash, Date.now())), [persist]);

  const place = useCallback(
    async (req: OrderRequest, price: number, ts: number) => {
      const acc = accRef.current;
      if (!acc) throw new Error('Open a paper account first');
      const r = placeOrder(acc, req, { symbol: req.symbol, product: req.product, price, ts }, Date.now());
      if (!r.duplicate) await persist(r.account);
      return r.order;
    },
    [persist]
  );

  const pause = useCallback(async (halted: boolean) => {
    if (accRef.current) await persist(setHalted(accRef.current, halted));
  }, [persist]);

  const value = useMemo(() => (account ? valueAccount(account, feed.prices) : null), [account, feed.prices]);

  return <Ctx.Provider value={{ account, loading, feed, priceTs, value, start, place, pause }}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is co-located with its provider
export function usePaper() {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePaper must be used inside PaperProvider');
  return c;
}
