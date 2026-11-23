import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CoinBadge, Change, Segmented, Note } from '../components/ui';
import { fetchCoinbaseProducts, fetchTopCoins, fmtAge, fmtUsd, type CoinbaseProduct, type CoinGeckoCoin, type Sourced } from '../services/marketData';
import { useWatchlist } from '../hooks/useWatchlist';
import { usePaper } from '../paper/PaperProvider';

type Tab = 'all' | 'watch' | 'gainers' | 'losers';
type Sort = 'cap' | 'volume' | 'change';

type Row = { symbol: string; name: string; image?: string; price: number | null; change: number | null; cap: number | null; volume: number | null; tradable: boolean; live: boolean };

export default function MarketsPage() {
  const [top, setTop] = useState<Sourced<CoinGeckoCoin[]> | null>(null);
  const [topErr, setTopErr] = useState('');
  const [products, setProducts] = useState<CoinbaseProduct[]>([]);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [sort, setSort] = useState<Sort>('cap');
  const { list: watch } = useWatchlist();
  const { feed } = usePaper();

  useEffect(() => {
    fetchTopCoins().then(setTop).catch((e) => setTopErr((e as Error).message));
    fetchCoinbaseProducts().then((p) => setProducts(p.data)).catch(() => undefined);
  }, []);

  const tradable = useMemo(() => new Set(products.map((p) => p.base)), [products]);

  const rows: Row[] = useMemo(() => {
    const base: Row[] = (top?.data ?? []).map((c) => {
      const live = feed.prices[c.symbol];
      const open = feed.open24h[c.symbol];
      return {
        symbol: c.symbol, name: c.name, image: c.image,
        price: live ?? c.current_price,
        change: live && open ? ((live - open) / open) * 100 : c.price_change_percentage_24h,
        cap: c.market_cap, volume: c.total_volume, tradable: tradable.has(c.symbol), live: !!live
      };
    });
    // search also covers Coinbase markets outside the top 100
    if (q.trim()) {
      const s = q.trim().toUpperCase();
      const known = new Set(base.map((r) => r.symbol));
      for (const p of products) if (!known.has(p.base) && p.base.includes(s)) base.push({ symbol: p.base, name: p.base, price: null, change: null, cap: null, volume: null, tradable: true, live: false });
    }
    return base;
  }, [top, feed.prices, feed.open24h, tradable, products, q]);

  const shown = useMemo(() => {
    const s = q.trim().toUpperCase();
    let r = rows.filter((x) => !s || x.symbol.includes(s) || x.name.toUpperCase().includes(s));
    if (tab === 'watch') r = r.filter((x) => watch.includes(x.symbol));
    if (tab === 'gainers') r = r.filter((x) => (x.change ?? -Infinity) > 0).sort((a, b) => (b.change ?? 0) - (a.change ?? 0));
    else if (tab === 'losers') r = r.filter((x) => (x.change ?? Infinity) < 0).sort((a, b) => (a.change ?? 0) - (b.change ?? 0));
    else if (sort === 'volume') r = [...r].sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1));
    else if (sort === 'change') r = [...r].sort((a, b) => (b.change ?? -999) - (a.change ?? -999));
    return r.slice(0, 100);
  }, [rows, q, tab, sort, watch]);

  return (
    <div className="mx-auto max-w-xl space-y-4 fade-in">
      <h1 className="text-xl font-semibold text-white">Markets</h1>
      <label className="flex min-h-[48px] items-center gap-2 rounded-xl border border-ink-600 bg-ink-800 px-3">
        <span aria-hidden="true" className="text-slate-400">⌕</span>
        <span className="sr-only">Search coins</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search coins (400 Coinbase markets)"
          className="min-h-[46px] flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
        />
      </label>
      <Segmented
        label="Market lists"
        value={tab}
        onChange={setTab}
        options={[{ value: 'all', label: 'All' }, { value: 'watch', label: 'Watchlist' }, { value: 'gainers', label: 'Gainers' }, { value: 'losers', label: 'Losers' }]}
      />
      {tab === 'all' && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span id="sort-label">Sort</span>
          <div role="radiogroup" aria-labelledby="sort-label" className="flex gap-1">
            {([['cap', 'Market cap'], ['volume', 'Volume'], ['change', '24h change']] as const).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={sort === v} onClick={() => setSort(v)}
                className={`min-h-[36px] rounded-full px-3 ${sort === v ? 'bg-helix-400/15 text-helix-300' : 'text-slate-400'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {!top && !topErr && <div className="space-y-2" aria-label="Loading markets">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-ink-800" />)}</div>}
      {topErr && !top && <p role="alert" className="rounded-xl bg-down/15 p-3 text-sm text-[#F7A3A3]">Market list unavailable: {topErr}. Live prices for the main coins still work below in Home.</p>}

      {top && (
        <ul className="divide-y divide-ink-600 rounded-2xl border border-ink-600 bg-ink-800">
          {shown.length === 0 && <li className="p-4 text-sm text-slate-400">{tab === 'watch' ? 'Your watchlist is empty. Open a coin and tap ☆ to add it.' : 'No coins match.'}</li>}
          {shown.map((r) => (
            <li key={r.symbol}>
              <Link to={`/markets/${r.symbol}`} className="flex min-h-[60px] items-center gap-3 px-3 py-2">
                <CoinBadge symbol={r.symbol} image={r.image} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{r.name}</span>
                  <span className="block text-xs text-slate-500">
                    {r.symbol}
                    {r.cap ? ` · ${fmtUsd(r.cap, { compact: true })}` : ''}
                    {!r.tradable ? ' · not on Coinbase' : ''}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-mono text-sm text-white tabular-nums">{fmtUsd(r.price)}</span>
                  <span className="block text-xs"><Change pct={r.change} /></span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {top && (
        <Note>
          List: {top.source}{top.fromCache ? ' (saved copy)' : ''}, updated {fmtAge(top.fetchedAt)}. Main coins use live Coinbase prices; 24h change from Coinbase where live.
          Exchange markets only; decentralized pools and network filters are not available yet.
        </Note>
      )}
    </div>
  );
}
