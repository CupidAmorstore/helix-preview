import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import MarketChart from '../components/MarketChart';
import TradeSheet from '../components/TradeSheet';
import { Button, Change, CoinBadge, Money, Note, PageHeader, Panel } from '../components/ui';
import { fetchCoinbaseProducts, fetchCoinbaseStats, fetchTopCoins, fmtAge, fmtUsd, type CoinGeckoCoin, type CoinStats } from '../services/marketData';
import { TIMEFRAMES } from '../services/market';
import { useLiveFeed } from '../hooks/useLivePrices';
import { useWatchlist } from '../hooks/useWatchlist';
import { usePaper } from '../paper/PaperProvider';
import { listSnapshots } from '../services/storage';

export default function AssetPage() {
  const { symbol = '' } = useParams();
  const sym = symbol.toUpperCase();
  const [coin, setCoin] = useState<CoinGeckoCoin | null>(null);
  const [cgAt, setCgAt] = useState<number | null>(null);
  const [product, setProduct] = useState<string | null | undefined>(undefined);
  const [stats, setStats] = useState<CoinStats | null>(null);
  const [statsAt, setStatsAt] = useState<number | null>(null);
  const [tf, setTf] = useState('1d');
  const [watchedQty, setWatchedQty] = useState<number | null>(null);
  const [sheet, setSheet] = useState<null | 'buy' | 'sell'>(null);
  const watch = useWatchlist();
  const { account } = usePaper();

  useEffect(() => {
    fetchTopCoins().then((r) => { setCoin(r.data.find((c) => c.symbol === sym) ?? null); setCgAt(r.fetchedAt); }).catch(() => undefined);
    fetchCoinbaseProducts().then((r) => setProduct(r.data.find((p) => p.base === sym)?.id ?? null)).catch(() => setProduct(null));
    listSnapshots().then((s) => {
      const latest = [...s].sort((a, b) => a.date.localeCompare(b.date)).pop();
      setWatchedQty(latest?.assets?.[sym] ?? null);
    }).catch(() => undefined);
  }, [sym]);

  useEffect(() => {
    if (!product) return;
    fetchCoinbaseStats(product).then((r) => { setStats(r.data); setStatsAt(r.fetchedAt); }).catch(() => undefined);
  }, [product]);

  const feed = useLiveFeed(product ? [product] : []);
  const live = feed.prices[sym];
  const [liveTs, setLiveTs] = useState<number | null>(null);
  useEffect(() => { if (live) setLiveTs(Date.now()); }, [live]);

  const price = live ?? stats?.last ?? coin?.current_price ?? null;
  const open = feed.open24h[sym] ?? stats?.open ?? null;
  const pct = price && open ? ((price - open) / open) * 100 : coin?.price_change_percentage_24h ?? null;
  const name = coin?.name ?? sym;
  const position = account?.positions[sym];
  const posValue = position && price ? position.qty * price : null;
  const posPnl = position && posValue !== null ? posValue - position.costUsd : null;
  const feedLabel = useMemo(() => (feed.status === 'live' ? 'Live' : feed.status === 'stale' ? 'Delayed' : feed.status === 'reconnecting' ? 'Reconnecting…' : 'Connecting…'), [feed.status]);

  return (
    <div className="mx-auto max-w-xl space-y-4 fade-in">
      <PageHeader
        back
        title={name}
        subtitle={sym}
        action={
          <button type="button" onClick={() => watch.toggle(sym)} aria-pressed={watch.has(sym)} aria-label={watch.has(sym) ? 'Remove from watchlist' : 'Add to watchlist'}
            className={`grid h-11 w-11 place-items-center rounded-xl text-xl ${watch.has(sym) ? 'text-helix-400' : 'text-slate-400'}`}>
            {watch.has(sym) ? '★' : '☆'}
          </button>
        }
      />

      <section className="space-y-1">
        <div className="flex items-center gap-3">
          <CoinBadge symbol={sym} image={coin?.image} size={40} />
          <div className="font-mono text-3xl font-medium tracking-tight text-white tabular-nums">{fmtUsd(price)}</div>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 text-sm">
          <Change pct={pct} abs={price && open ? price - open : null} />
          <span className="text-slate-400">24h</span>
          {product && <span className={`text-xs ${feed.status === 'live' ? 'text-up' : 'text-amber-400'}`} role="status">· {feedLabel} · Coinbase</span>}
        </div>
      </section>

      {product ? (
        <Panel>
          <MarketChart symbol={product} timeframe={tf} />
          <div role="radiogroup" aria-label="Chart timeframe" className="flex justify-between">
            {TIMEFRAMES.map((t) => (
              <button key={t} type="button" role="radio" aria-checked={tf === t} onClick={() => setTf(t)}
                className={`min-h-[40px] min-w-[40px] rounded-lg font-mono text-xs ${tf === t ? 'bg-ink-700 text-white' : 'text-slate-400'}`}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </Panel>
      ) : product === null ? (
        <Panel><p className="text-sm text-slate-300">{sym} has no Coinbase USD market, so live charts and paper trading are not available. Prices shown come from CoinGecko.</p></Panel>
      ) : null}

      {product && (
        <div className="grid grid-cols-2 gap-2">
          <Button kind="primary" onClick={() => setSheet('buy')}>Paper buy</Button>
          <Button onClick={() => setSheet('sell')} disabled={!position}>Paper sell</Button>
        </div>
      )}

      <Panel title="Your holdings">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-slate-400">Paper position</dt>
          <dd className="text-right font-mono text-white">{position ? `${position.qty.toFixed(8)} ${sym}` : 'None'}</dd>
          {position && (
            <>
              <dt className="text-slate-400">Value · cost</dt>
              <dd className="text-right"><Money v={posValue} className="text-white" /> · <Money v={position.costUsd} className="text-slate-400" /></dd>
              <dt className="text-slate-400">Unrealized P&amp;L</dt>
              <dd className="text-right">{posPnl === null ? '—' : <Change pct={(posPnl / position.costUsd) * 100} abs={posPnl} />}</dd>
            </>
          )}
          <dt className="text-slate-400">Watched addresses</dt>
          <dd className="text-right font-mono text-white">{watchedQty ? `${watchedQty} ${sym}` : 'None'}</dd>
        </dl>
        <Note>Paper positions are simulated. Watched addresses are tracked read-only and can't be traded here.</Note>
      </Panel>

      <Panel title="Market stats">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-slate-400">24h high</dt><dd className="text-right font-mono text-white">{fmtUsd(stats?.high)}</dd>
          <dt className="text-slate-400">24h low</dt><dd className="text-right font-mono text-white">{fmtUsd(stats?.low)}</dd>
          <dt className="text-slate-400">24h volume (Coinbase)</dt><dd className="text-right font-mono text-white">{stats ? `${Intl.NumberFormat(undefined, { notation: 'compact' }).format(stats.volume)} ${sym}` : '—'}</dd>
          <dt className="text-slate-400">Market cap</dt><dd className="text-right font-mono text-white">{fmtUsd(coin?.market_cap, { compact: true })}</dd>
          <dt className="text-slate-400">Rank</dt><dd className="text-right font-mono text-white">{coin?.market_cap_rank ? `#${coin.market_cap_rank}` : '—'}</dd>
          <dt className="text-slate-400">Market type</dt><dd className="text-right text-white">{product ? 'Exchange (Coinbase)' : 'Price data only'}</dd>
        </dl>
        <Note>
          {statsAt ? `Coinbase stats ${fmtAge(statsAt)}` : 'Coinbase stats unavailable'}
          {cgAt ? ` · CoinGecko ${fmtAge(cgAt)}` : ''}. Network and liquidity-pool data are not available yet.
        </Note>
      </Panel>

      <Link to={`/alerts?symbol=${sym}`} className="flex min-h-[48px] items-center justify-center rounded-xl bg-ink-700 text-sm font-semibold text-white">
        Set a price alert for {sym}
      </Link>

      {product && (
        <TradeSheet open={sheet !== null} onClose={() => setSheet(null)} initialSide={sheet ?? 'buy'} symbol={sym} product={product} name={name} price={price} priceTs={live ? liveTs : null} />
      )}
    </div>
  );
}
