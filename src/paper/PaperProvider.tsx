import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getSetting, setSetting } from '../services/storage';
import { MARKET_COINS } from '../services/market';
import { useLiveFeed, type LiveFeed } from '../hooks/useLivePrices';
import { fetchBook } from './book';
import { createSerialStore, type Mutation } from './serialStore';
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
  // Single source of truth for writes: updated synchronously inside the mutation queue (never from render),
  // so two quick orders or an order + valuation snapshot can never start from the same stale account.
  const store = useRef(createSerialStore<PaperAccount | null>(null, (a) => setSetting(KEY, a), setAccount)).current;

  useEffect(() => {
    getSetting<PaperAccount>(KEY)
      .then((a) => store.hydrate(a && a.version === 1 ? a : null))
      .catch(() => setAccount(null))
      .finally(() => setLoading(false));
  }, [store]);

  // track when each price last changed (used to refuse stale quotes)
  useEffect(() => {
    const now = Date.now();
    const changed: Record<string, number> = {};
    for (const [s, p] of Object.entries(feed.prices)) if (prev.current[s] !== p) changed[s] = now;
    prev.current = feed.prices;
    if (Object.keys(changed).length) setPriceTs((t) => ({ ...t, ...changed }));
  }, [feed.prices]);

  const mutate = useCallback(<T,>(fn: Mutation<PaperAccount | null, T>) => store.mutate(fn), [store]);

  // hourly valuation point for the equity chart (only with live prices for every position)
  useEffect(() => {
    if (!account || feed.status !== 'live') return;
    mutate((a) => {
      if (!a) return null;
      const v = valueAccount(a, feed.prices);
      if (v.missingPrice) return null;
      return { next: recordEquity(a, v.equity, Date.now()), result: undefined };
    }).catch(() => undefined);
  }, [account, feed.prices, feed.status, mutate]);

  const start = useCallback(async (cash: number) => {
    await mutate(() => ({ next: createAccount(cash, Date.now()), result: undefined }));
  }, [mutate]);

  const place = useCallback(
    async (req: OrderRequest, price: number, ts: number) => {
      if (!store.get()) throw new Error('Open a paper account first');
      const book = await fetchBook(req.product); // network outside the lock
      const order = await mutate((a) => {
        if (!a) return null;
        const r = placeOrder(a, req, { symbol: req.symbol, product: req.product, price, ts, book: book ?? undefined }, Date.now());
        return { next: r.duplicate ? a : r.account, result: r.order };
      });
      if (!order) throw new Error('Open a paper account first');
      return order;
    },
    [mutate, store]
  );

  const pause = useCallback(async (halted: boolean) => {
    await mutate((a) => (a ? { next: setHalted(a, halted), result: undefined } : null));
  }, [mutate]);

  const value = useMemo(() => (account ? valueAccount(account, feed.prices) : null), [account, feed.prices]);

  return <Ctx.Provider value={{ account, loading, feed, priceTs, value, start, place, pause }}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is co-located with its provider
export function usePaper() {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePaper must be used inside PaperProvider');
  return c;
}
