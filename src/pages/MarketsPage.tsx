import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CoinBadge, Change, Segmented, Note } from '../components/ui';
import { fetchCoinbaseProducts, fetchTopCoins, fmtAge, fmtUsd, type CoinbaseProduct, type CoinGeckoCoin, type Sourced } from '../services/marketData';
import { useWatchlist } from '../hooks/useWatchlist';
import { usePaper } from '../paper/PaperProvider';
import { MARKET_COINS } from '../services/market';
import { useT } from '../i18n';

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
  const t = useT();

  const loadTop = () => {
    setTopErr('');
    fetchTopCoins().then(setTop).catch((e) => setTopErr((e as Error).message));
  };
  useEffect(() => {
    loadTop();
    fetchCoinbaseProducts().then((p) => setProducts(p.data)).catch(() => undefined);
  }, []);

  const tradable = useMemo(() => new Set(products.map((p) => p.base)), [products]);

  const rows: Row[] = useMemo(() => {
    // When the ranked list is unavailable, fall back to the main coins with live Coinbase prices
    // instead of an empty screen. Nothing is estimated: missing fields stay empty.
    const src = top?.data ?? (topErr ? MARKET_COINS.map((c) => ({ symbol: c.symbol, name: c.name, image: undefined, current_price: null, price_change_percentage_24h: null, market_cap: null, total_volume: null })) : []);
    const base: Row[] = src.map((c) => {
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
  }, [top, topErr, feed.prices, feed.open24h, tradable, products, q]);

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
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-[26px] font-semibold tracking-tight text-white">{t('Markets', 'Marchés')}</h1>
      <label className="flex min-h-[48px] min-w-0 items-center gap-2 rounded-full border border-ink-500 bg-ink-800 px-4">
        <span aria-hidden="true" className="text-slate-400">⌕</span>
        <span className="sr-only">{t('Search coins', 'Rechercher une cryptomonnaie')}</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('Search coins (all Coinbase markets)', 'Rechercher (tous les marchés Coinbase)')}
          className="min-h-[46px] flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
        />
      </label>
      <Segmented
        label={t('Market lists', 'Listes de marchés')}
        value={tab}
        onChange={setTab}
        options={[{ value: 'all', label: t('All', 'Tous') }, { value: 'watch', label: t('Watchlist', 'Favoris') }, { value: 'gainers', label: t('Gainers', 'En hausse') }, { value: 'losers', label: t('Losers', 'En baisse') }]}
      />
      {tab === 'all' && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span id="sort-label">{t('Sort', 'Trier')}</span>
          <div role="radiogroup" aria-labelledby="sort-label" className="flex flex-wrap gap-1">
            {([['cap', t('Market cap', 'Capitalisation')], ['volume', t('Volume', 'Volume')], ['change', t('24h change', 'Variation 24 h')]] as const).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={sort === v} onClick={() => setSort(v)}
                className={`min-h-[44px] px-2 ${sort === v ? 'font-semibold text-white underline decoration-1 underline-offset-4' : 'text-slate-400'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {!top && !topErr && <div className="space-y-2" aria-label={t('Loading markets', 'Chargement des marchés')}>{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-14 animate-pulse border-b border-ink-600 bg-ink-800/60" />)}</div>}
      {topErr && !top && (
        <div role="status" className="flex items-start justify-between gap-3 border-l-2 border-paper py-1 pl-3">
          <p className="text-sm text-slate-300">{t('The full ranked list is busy right now. Showing the main coins with live prices; search still finds every Coinbase market.', 'Le classement complet est momentanément indisponible. Les principales cryptomonnaies sont affichées avec leurs prix en direct; la recherche trouve toujours tous les marchés Coinbase.')}</p>
          <button type="button" onClick={loadTop} className="min-h-[44px] shrink-0 rounded-full border border-ink-500 px-4 text-sm text-white">{t('Retry', 'Réessayer')}</button>
        </div>
      )}

      {(top || topErr) && (
        <ul className="divide-y divide-ink-600 border-t border-ink-600">
          {shown.length === 0 && <li className="p-4 text-sm text-slate-400">{tab === 'watch' ? t('Your watchlist is empty. Open a coin and tap ☆ to add it.', 'Votre liste de favoris est vide. Ouvrez une cryptomonnaie et touchez ☆ pour l’ajouter.') : t('No coins match.', 'Aucun résultat.')}</li>}
          {shown.map((r) => (
            <li key={r.symbol}>
              <Link to={`/markets/${r.symbol}`} className="flex min-h-[60px] items-center gap-3 py-2">
                <CoinBadge symbol={r.symbol} image={r.image} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{r.name}</span>
                  <span className="block text-xs text-slate-500">
                    {r.symbol}
                    {r.cap ? ` · ${fmtUsd(r.cap, { compact: true })}` : ''}
                    {!r.tradable ? (r.symbol === 'USDC' ? t(' · = USD on Coinbase (no pair)', ' · = USD sur Coinbase (aucune paire)') : t(' · no USD pair on Coinbase', ' · aucune paire USD sur Coinbase')) : ''}
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
          {t('List', 'Liste')} : {top.source}{top.fromCache ? t(' (saved copy)', ' (copie enregistrée)') : ''}, {t('updated', 'mise à jour')} {fmtAge(top.fetchedAt)}.{' '}
          {t('Main coins use live Coinbase prices; 24h change from Coinbase where live. Exchange markets only; decentralized pools and network filters are not available yet.',
            'Les principales cryptomonnaies utilisent les prix Coinbase en direct, et la variation sur 24 h de Coinbase lorsqu’elle est disponible. Marchés de plateformes seulement; les pools décentralisés et les filtres par réseau ne sont pas encore offerts.')}
        </Note>
      )}
    </div>
  );
}
