import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import MarketChart from '../components/MarketChart';
import TradeSheet from '../components/TradeSheet';
import { Button, Change, CoinBadge, Money, Note, PageHeader, Panel } from '../components/ui';
import { fetchCoinbaseProducts, fetchCoinbaseStats, fetchTopCoins, fmtAge, fmtUsd, type CoinGeckoCoin, type CoinStats } from '../services/marketData';
import { MARKET_COINS, TIMEFRAMES } from '../services/market';
import { useLiveFeed } from '../hooks/useLivePrices';
import { useWatchlist } from '../hooks/useWatchlist';
import { usePaper } from '../paper/PaperProvider';
import { listSnapshots } from '../services/storage';
import { useT } from '../i18n';

export default function AssetPage() {
  const { symbol = '' } = useParams();
  const sym = symbol.toUpperCase();
  const [coin, setCoin] = useState<CoinGeckoCoin | null>(null);
  const [cgAt, setCgAt] = useState<number | null>(null);
  const [product, setProduct] = useState<string | null | undefined>(undefined);
  const [cgDone, setCgDone] = useState(false);
  const [loadErr, setLoadErr] = useState(false);
  const [stats, setStats] = useState<CoinStats | null>(null);
  const [statsAt, setStatsAt] = useState<number | null>(null);
  const [tf, setTf] = useState('1d');
  const [watchedQty, setWatchedQty] = useState<number | null>(null);
  const [sheet, setSheet] = useState<null | 'buy' | 'sell'>(null);
  const [cgErr, setCgErr] = useState(false);
  const [retry, setRetry] = useState(0);
  const watch = useWatchlist();
  const { account } = usePaper();
  const t = useT();

  useEffect(() => {
    setCgDone(false);
    setLoadErr(false);
    setCgErr(false);
    // a failed ranking request is NOT "coin not found" (audit MD-2)
    fetchTopCoins().then((r) => { setCoin(r.data.find((c) => c.symbol === sym) ?? null); setCgAt(r.fetchedAt); }).catch(() => setCgErr(true)).finally(() => setCgDone(true));
    fetchCoinbaseProducts().then((r) => setProduct(r.data.find((p) => p.base === sym)?.id ?? null)).catch(() => { setLoadErr(true); setProduct(null); });
    listSnapshots().then((s) => {
      const latest = [...s].sort((a, b) => a.date.localeCompare(b.date)).pop();
      setWatchedQty(latest?.assets?.[sym] ?? null);
    }).catch(() => undefined);
  }, [sym, retry]);

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
  const feedLabel = useMemo(() => (feed.status === 'live' ? t('Live', 'En direct') : feed.status === 'stale' ? t('Delayed', 'Retardé') : feed.status === 'offline' ? t('Offline', 'Hors ligne') : feed.status === 'reconnecting' ? t('Reconnecting…', 'Reconnexion…') : t('Connecting…', 'Connexion…')), [feed.status, t]);

  // unknown symbol: no Coinbase market and not in the ranked list → say so instead of an empty page
  if (product === null && cgDone && !coin) {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <PageHeader title={sym} back />
        <section className="space-y-3 border-t border-ink-600 pt-5">
          <p className="text-[15px] text-slate-200">
            {loadErr
              ? t('Market data could not be loaded. Check your connection and try again.', 'Les données de marché n’ont pas pu être chargées. Vérifiez votre connexion et réessayez.')
              : cgErr
                ? t(`${sym} has no Coinbase market, and coin ranking data (CoinGecko) is temporarily unavailable, so HELIX cannot show it right now.`, `${sym} n’a pas de marché sur Coinbase et les données de classement (CoinGecko) sont momentanément indisponibles; HELIX ne peut donc pas l’afficher pour l’instant.`)
                : t(`We couldn't find a coin called ${sym} on Coinbase or in the top 100 by market cap.`, `Aucune cryptomonnaie nommée ${sym} sur Coinbase ni dans les 100 premières par capitalisation.`)}
          </p>
          {(cgErr || loadErr) && (
            <button type="button" onClick={() => setRetry((n) => n + 1)} className="inline-flex min-h-[48px] items-center rounded-full border border-ink-500 px-5 text-sm font-semibold text-white">{t('Try again', 'Réessayer')}</button>
          )}
          <Link to="/markets" className="inline-flex min-h-[48px] items-center rounded-full bg-white px-5 text-sm font-semibold text-ink-900">{t('Search markets', 'Rechercher un marché')}</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 fade-in">
      <PageHeader
        back
        title={name}
        subtitle={sym}
        action={
          <button type="button" onClick={() => watch.toggle(sym)} aria-pressed={watch.has(sym)} aria-label={watch.has(sym) ? t('Remove from watchlist', 'Retirer des favoris') : t('Add to watchlist', 'Ajouter aux favoris')}
            className={`grid h-11 w-11 place-items-center rounded-xl text-xl ${watch.has(sym) ? 'text-helix-400' : 'text-slate-400'}`}>
            {watch.has(sym) ? '★' : '☆'}
          </button>
        }
      />

      <section className="space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <CoinBadge symbol={sym} image={coin?.image} size={40} />
          <div className="min-w-0 font-mono text-3xl font-medium tracking-tight text-white tabular-nums">{fmtUsd(price)}</div>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 text-sm">
          <Change pct={pct} abs={price && open ? price - open : null} />
          <span className="text-slate-400">{t('24h', '24 h')}</span>
          {product && <span className={`text-xs ${feed.status === 'live' ? 'text-up' : 'text-amber-400'}`} role="status">· {feedLabel} · Coinbase</span>}
        </div>
      </section>

      {product ? (
        <Panel>
          <MarketChart symbol={product} timeframe={tf} livePrice={live ? price : null} />
          <div role="radiogroup" aria-label={t('Chart timeframe', 'Période du graphique')} className="flex justify-between">
            {TIMEFRAMES.map((f) => (
              <button key={f} type="button" role="radio" aria-checked={tf === f} onClick={() => setTf(f)}
                className={`min-h-[40px] min-w-[40px] rounded-lg font-mono text-xs ${tf === f ? 'bg-ink-700 text-white' : 'text-slate-400'}`}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </Panel>
      ) : product === null ? (
        <Panel><p className="text-sm text-slate-300">{t(`${sym} has no Coinbase USD market, so live charts and paper trading are not available.`, `${sym} n’a pas de marché USD sur Coinbase : graphiques en direct et négociation fictive indisponibles.`)}{coin ? t(' Prices shown come from CoinGecko.', ' Les prix affichés proviennent de CoinGecko.') : ''}</p></Panel>
      ) : null}

      {product && (
        <div className="grid grid-cols-2 gap-2">
          <Button kind="primary" onClick={() => setSheet('buy')}>{t('Paper buy', 'Achat fictif')}</Button>
          <Button onClick={() => setSheet('sell')} disabled={!position}>{t('Paper sell', 'Vente fictive')}</Button>
        </div>
      )}

      <Panel title={t('Your holdings', 'Vos avoirs')}>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-slate-400">{t('Paper position', 'Position fictive')}</dt>
          <dd className="text-right font-mono text-white">{position ? `${position.qty.toFixed(8)} ${sym}` : t('None', 'Aucune')}</dd>
          {position && (
            <>
              <dt className="text-slate-400">{t('Value · cost', 'Valeur · coût')}</dt>
              <dd className="text-right"><Money v={posValue} className="text-white" /> · <Money v={position.costUsd} className="text-slate-400" /></dd>
              <dt className="text-slate-400">{t('Unrealized P&L', 'Gain/perte latent')}</dt>
              <dd className="text-right">{posPnl === null ? '—' : <Change pct={(posPnl / position.costUsd) * 100} abs={posPnl} />}</dd>
            </>
          )}
          <dt className="text-slate-400">{t('Watched addresses', 'Adresses suivies')}</dt>
          <dd className="text-right font-mono text-white">{watchedQty ? `${watchedQty} ${sym}` : t('None', 'Aucune')}</dd>
        </dl>
        <Note>{t("Paper positions are simulated. Watched addresses are tracked read-only and can't be traded here.", 'Les positions fictives sont simulées. Les adresses suivies sont en lecture seule et ne peuvent pas être négociées ici.')}</Note>
      </Panel>

      <Panel title={t('Market stats', 'Statistiques du marché')}>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-slate-400">{t('24h high', 'Haut 24 h')}</dt><dd className="text-right font-mono text-white">{fmtUsd(stats?.high)}</dd>
          <dt className="text-slate-400">{t('24h low', 'Bas 24 h')}</dt><dd className="text-right font-mono text-white">{fmtUsd(stats?.low)}</dd>
          <dt className="text-slate-400">{t('24h volume (Coinbase)', 'Volume 24 h (Coinbase)')}</dt><dd className="text-right font-mono text-white">{stats ? `${Intl.NumberFormat(undefined, { notation: 'compact' }).format(stats.volume)} ${sym}` : '—'}</dd>
          <dt className="text-slate-400">{t('Market cap', 'Capitalisation')}</dt><dd className="text-right font-mono text-white">{fmtUsd(coin?.market_cap, { compact: true })}</dd>
          <dt className="text-slate-400">{t('Rank', 'Rang')}</dt><dd className="text-right font-mono text-white">{coin?.market_cap_rank ? `#${coin.market_cap_rank}` : '—'}</dd>
          <dt className="text-slate-400">{t('Market type', 'Type de marché')}</dt><dd className="text-right text-white">{product ? t('Exchange (Coinbase)', 'Plateforme (Coinbase)') : t('Price data only', 'Prix seulement')}</dd>
        </dl>
        <Note>
          {statsAt ? `${t('Coinbase stats', 'Statistiques Coinbase')} ${fmtAge(statsAt)}` : t('Coinbase stats unavailable', 'Statistiques Coinbase indisponibles')}
          {cgAt ? ` · CoinGecko ${fmtAge(cgAt)}` : ''}. {t('Network and liquidity-pool data are not available yet.', 'Les données de réseau et de pools de liquidité ne sont pas encore offertes.')}
        </Note>
      </Panel>

      {MARKET_COINS.some((c) => c.symbol === sym) ? (
        <Link to={`/alerts?symbol=${sym}`} className="flex min-h-[48px] items-center justify-center rounded-full border border-ink-500 text-sm font-semibold text-white">
          {t('Set a price alert for', 'Créer une alerte de prix pour')} {sym}
        </Link>
      ) : (
        <Note>{t('Price alerts are available for', 'Les alertes de prix sont offertes pour')} {MARKET_COINS.map((c) => c.symbol).join(', ')}.</Note>
      )}

      {product && (
        <TradeSheet open={sheet !== null} onClose={() => setSheet(null)} initialSide={sheet ?? 'buy'} symbol={sym} product={product} name={name} price={price} priceTs={live ? liveTs : null} />
      )}
    </div>
  );
}
