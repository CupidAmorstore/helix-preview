import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
// the research summary (~400 KB) is loaded after first paint, in its own chunk (audit PERF-1)
type BotGlance = { tested: number; qualified: number; holdingCash: boolean; ageH: number; reason?: { text: string; count: number } };
function useBotGlance(): BotGlance | null {
  const [g, setG] = useState<BotGlance | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.all([import('../bot/botData'), import('../bot/insights')]).then(([d, i]) => {
      if (!alive) return;
      const s = d.bot();
      const h = i.botHeadline(s);
      setG({ tested: h.tested, qualified: h.qualified, holdingCash: h.holdingCash, ageH: i.researchAgeHours(s), reason: i.plainReasons(s, 1)[0] });
    });
    return () => {
      alive = false;
    };
  }, []);
  return g;
}
import { MARKET_COINS, fetchCandles } from '../services/market';
import { listAddresses, listSnapshots } from '../services/storage';
import type { SnapshotRecord } from '../types';
import { usePaper } from '../paper/PaperProvider';
import { STARTING_CAPITAL_OPTIONS } from '../paper/engine';
import { useWatchlist } from '../hooks/useWatchlist';
import { Button, Change, CoinBadge, Money, Note, Panel } from '../components/ui';
import { fmtAge, fmtUsd } from '../services/marketData';
import StartHere from '../components/StartHere';
import { useT } from '../i18n';

const RANGES = [
  { key: '1D', ms: 86_400_000 },
  { key: '1W', ms: 7 * 86_400_000 },
  { key: '1M', ms: 30 * 86_400_000 },
  { key: 'All', ms: Infinity }
] as const;

function Sparkline({ values, up }: { values: number[]; up: boolean }) {
  if (values.length < 2) return <span className="inline-block h-6 w-14" aria-hidden="true" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 56},${22 - ((v - min) / (max - min || 1)) * 20}`).join(' ');
  return (
    <svg viewBox="0 0 56 24" className="h-6 w-14" aria-hidden="true">
      <polyline fill="none" stroke={up ? '#4CC38A' : '#F07A6A'} strokeWidth="1.4" points={pts} />
    </svg>
  );
}

const more = 'inline-flex min-h-[44px] items-center text-sm font-medium text-helix-400 underline-offset-4 hover:underline';

function OpenAccount() {
  const t = useT();
  const { start } = usePaper();
  const [cap, setCap] = useState<number>(1000);
  const [busy, setBusy] = useState(false);
  return (
    <section className="space-y-5 pb-2">
      <div className="space-y-2">
        <p className="eyebrow text-paper">{t('Paper account', 'Compte fictif')}</p>
        <h1 className="text-[30px] font-semibold leading-[1.1] tracking-tight text-white">{t('Practise trading without risking money.', 'Exercez-vous à trader sans risquer d’argent.')}</h1>
        <p className="text-[15px] leading-relaxed text-slate-400">
          {t('A paper account uses simulated dollars at live prices, with real fees modelled. Nothing is sent to an exchange.', 'Un compte fictif utilise des dollars simulés aux prix en direct, avec des frais réalistes. Rien n’est envoyé à une plateforme.')}
        </p>
      </div>
      <fieldset className="space-y-2">
        <legend className="eyebrow pb-1 text-slate-400">{t('Starting balance', 'Solde de départ')}</legend>
        <div className="grid grid-cols-3 border-l border-t border-ink-600">
          {STARTING_CAPITAL_OPTIONS.map((c) => (
            <button key={c} type="button" aria-pressed={cap === c} onClick={() => setCap(c)}
              className={`min-h-[52px] border-b border-r border-ink-600 font-mono text-[15px] ${cap === c ? 'bg-white text-ink-900 font-semibold' : 'text-slate-300'}`}>
              ${c.toLocaleString()}
            </button>
          ))}
        </div>
      </fieldset>
      <Button kind="primary" className="w-full" disabled={busy} onClick={async () => { setBusy(true); await start(cap); setBusy(false); }}>
        {t('Open paper account', 'Ouvrir un compte fictif')}
      </Button>
    </section>
  );
}

export default function HomePage() {
  const t = useT();
  const glance = useBotGlance();
  const { account, loading, value, feed } = usePaper();
  const { list: watchlist } = useWatchlist();
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('1W');
  const [spark, setSpark] = useState<Record<string, number[]>>({});
  const [watched, setWatched] = useState<{ snap: SnapshotRecord | null; addresses: number } | null>(null);

  useEffect(() => {
    Promise.all([listSnapshots(), listAddresses()])
      .then(([s, a]) => setWatched({ snap: [...s].sort((x, y) => x.date.localeCompare(y.date)).pop() ?? null, addresses: a.length }))
      .catch(() => setWatched({ snap: null, addresses: 0 }));
  }, []);

  useEffect(() => {
    let alive = true;
    watchlist.forEach((sym) => {
      const c = MARKET_COINS.find((m) => m.symbol === sym);
      if (!c || spark[sym]) return;
      fetchCandles(c.product, '1h').then((k) => alive && setSpark((p) => ({ ...p, [sym]: k.slice(-24).map((x) => x.c) }))).catch(() => undefined);
    });
    return () => { alive = false; };
  }, [watchlist]); // eslint-disable-line react-hooks/exhaustive-deps -- spark is a cache

  const chart = useMemo(() => {
    if (!account) return null;
    const span = RANGES.find((r) => r.key === range)!.ms;
    const pts = account.equity.filter(([t]) => Date.now() - t <= span);
    if (value && feed.status === 'live' && !value.missingPrice) pts.push([Date.now(), value.equity]);
    if (pts.length < 2) return null;
    const v = pts.map((p) => p[1]);
    // Vertical range spans at least 2% of the starting balance so tiny moves (e.g. fees) don't look like crashes.
    const lo = Math.min(...v, account.startingCash);
    const hi = Math.max(...v, account.startingCash);
    const pad = Math.max(0, account.startingCash * 0.02 - (hi - lo)) / 2;
    const min = lo - pad;
    const max = hi + pad;
    const y = (x: number) => 84 - ((x - min) / (max - min || 1)) * 72;
    const t0 = pts[0][0];
    const t1 = pts[pts.length - 1][0];
    const line = pts.map(([t, e]) => `${((t - t0) / (t1 - t0 || 1)) * 300},${y(e)}`).join(' ');
    return { line, base: y(account.startingCash), up: v[v.length - 1] >= v[0] };
  }, [account, range, value, feed.status]);

  const movers = useMemo(() => {
    const r = MARKET_COINS.map((c) => {
      const p = feed.prices[c.symbol];
      const o = feed.open24h[c.symbol];
      return { sym: c.symbol, name: c.name, pct: p && o ? ((p - o) / o) * 100 : null };
    }).filter((x) => x.pct !== null) as { sym: string; name: string; pct: number }[];
    r.sort((a, b) => b.pct - a.pct);
    return r.length ? { top: r[0], bottom: r[r.length - 1] } : null;
  }, [feed.prices, feed.open24h]);

  const recent = account ? [...account.orders].reverse().slice(0, 4) : [];
  const positions = account ? Object.values(account.positions) : [];
  const showWatched = watched && (watched.addresses > 0 || (watched.snap && watched.snap.totalUsd > 0));

  return (
    <div className="mx-auto max-w-xl space-y-7">
      <StartHere />
      {/* 1. Paper account: what you have, what it did, what you can do */}
      {loading ? (
        <div className="h-48 animate-pulse bg-ink-800" aria-label={t('Loading account', 'Chargement du compte')} />
      ) : !account || !value ? (
        <OpenAccount />
      ) : (
        <section className="space-y-3" aria-labelledby="acct">
          <div className="flex items-center justify-between">
            <h1 id="acct" className="eyebrow text-slate-400">{t('Paper account · simulated money', 'Compte fictif · argent simulé')}</h1>
            {account.halted && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">{t('Paused', 'En pause')}</span>}
          </div>
          <div>
            <div className="font-mono text-[44px] font-semibold leading-none tracking-tight text-white">
              <Money v={value.equity} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm">
              <Change pct={value.returnPct} abs={value.totalPnl} />
              <span className="text-slate-400">since you started with ${account.startingCash.toLocaleString()}</span>
            </div>
            {value.missingPrice && <Note tone="warn">{t('Some positions are valued at cost until live prices arrive.', 'Certaines positions sont évaluées au coût en attendant les prix en direct.')}</Note>}
            {account.halted && account.haltReason?.startsWith('ledger') && (
              <p role="alert" className="mt-2 border-l-2 border-down pl-3 text-sm text-slate-200">
                Paper trading is paused: the saved account did not match its own order history ({account.haltReason}). No new paper orders are accepted until this is resolved.
              </p>
            )}
          </div>
          {chart ? (
            <svg viewBox="0 0 300 90" preserveAspectRatio="none" className="h-24 w-full" role="img" aria-label={`Paper account value, ${range}`}>
              <line x1="0" x2="300" y1={chart.base} y2={chart.base} stroke="#46443D" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
              <polyline fill="none" stroke={chart.up ? '#4CC38A' : '#F07A6A'} strokeWidth="1.75" points={chart.line} vectorEffect="non-scaling-stroke" />
            </svg>
          ) : (
            <p className="border-y border-ink-600 py-3 text-xs text-slate-400">
              The value chart builds up as your account is valued (about once an hour while the app is open).
            </p>
          )}
          <div role="radiogroup" aria-label="Chart range" className="flex gap-6">
            {RANGES.map((r) => (
              <button key={r.key} type="button" role="radio" aria-checked={range === r.key} onClick={() => setRange(r.key)}
                className={`min-w-[44px] min-h-[44px] font-mono text-xs ${range === r.key ? 'font-semibold text-white underline decoration-2 underline-offset-[10px]' : 'text-slate-500'}`}>
                {r.key}
              </button>
            ))}
          </div>
          <dl className="grid grid-cols-2 border-t border-ink-600 text-sm">
            {[
              [t('Cash available', 'Liquidités disponibles'), value.cash],
              [t('Invested', 'Investi'), value.positionsValue],
              [t('Realized P&L (paper)', 'Gains/pertes réalisés (fictifs)'), value.realized],
              [t('Fees paid', 'Frais payés'), value.fees]
            ].map(([l, v]) => (
              <div key={l as string} className="border-b border-ink-600 py-2.5 odd:pr-3 even:border-l even:pl-3">
                <dt className="text-xs text-slate-500">{l}</dt>
                <dd className="font-mono text-base text-white"><Money v={v as number} /></dd>
              </div>
            ))}
          </dl>
          <div className="flex gap-2">
            <Link to="/markets" className="flex min-h-[48px] flex-1 items-center justify-center rounded-full bg-white text-sm font-semibold text-ink-900">{t('Trade', 'Trader')}</Link>
            <Link to="/alerts" className="flex min-h-[48px] flex-1 items-center justify-center rounded-full border border-ink-500 text-sm font-semibold text-white">{t('Set alert', 'Créer une alerte')}</Link>
            <Link to="/wallet" className="flex min-h-[48px] flex-1 items-center justify-center rounded-full border border-ink-500 text-sm font-semibold text-white">{t('Wallet', 'Portefeuille')}</Link>
          </div>
        </section>
      )}

      {positions.length > 0 && (
        <Panel title={t('Your paper positions', 'Vos positions fictives')}>
          <ul className="divide-y divide-ink-600">
            {positions.map((p) => {
              const px = feed.prices[p.symbol];
              const val = px ? p.qty * px : null;
              return (
                <li key={p.symbol}>
                  <Link to={`/markets/${p.symbol}`} className="flex min-h-[56px] items-center gap-3 py-2">
                    <CoinBadge symbol={p.symbol} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-white">{p.symbol}</span>
                      <span className="block font-mono text-xs text-slate-500">{p.qty.toFixed(6)}</span>
                    </span>
                    <span className="text-right text-sm">
                      <span className="block"><Money v={val ?? p.costUsd} className="text-white" /></span>
                      <span className="block text-xs">{val === null ? <span className="text-slate-500">at cost</span> : <Change pct={((val - p.costUsd) / p.costUsd) * 100} />}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {/* 2. Market: highlights + watchlist */}
      {movers && (
        <section aria-label="Market today" className="grid grid-cols-2 border-y border-ink-600">
          {[[t('Strongest 24h', 'Plus forte hausse 24 h'), movers.top], [t('Weakest 24h', 'Plus faible 24 h'), movers.bottom]].map(([label, m]) => {
            const x = m as { sym: string; name: string; pct: number };
            return (
              <Link key={label as string} to={`/markets/${x.sym}`} className="min-h-[64px] py-3 even:border-l even:border-ink-600 even:pl-4">
                <span className="eyebrow block text-slate-500">{label as string}</span>
                <span className="mt-1 flex items-baseline gap-2">
                  <span className="text-[15px] font-semibold text-white">{x.sym}</span>
                  <Change pct={x.pct} className="text-sm" />
                </span>
              </Link>
            );
          })}
        </section>
      )}

      <Panel title={t('Watchlist', 'Liste de suivi')} action={<Link to="/markets" className={more}>{t('All markets', 'Tous les marchés')}</Link>}>
        {watchlist.length === 0 ? (
          <p className="text-sm text-slate-400">{t('Open any coin in Markets and tap ☆ to watch it.', 'Ouvrez une crypto dans Marchés et touchez ☆ pour la suivre.')}</p>
        ) : (
          <ul className="divide-y divide-ink-600">
            {watchlist.map((sym) => {
              const c = MARKET_COINS.find((m) => m.symbol === sym);
              const p = feed.prices[sym];
              const o = feed.open24h[sym];
              const pct = p && o ? ((p - o) / o) * 100 : null;
              return (
                <li key={sym}>
                  <Link to={`/markets/${sym}`} className="flex min-h-[56px] items-center gap-3 py-2">
                    <CoinBadge symbol={sym} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-white">{c?.name ?? sym}</span>
                      <span className="block text-xs text-slate-500">{sym}</span>
                    </span>
                    <Sparkline values={spark[sym] ?? []} up={(pct ?? 0) >= 0} />
                    <span className="w-[100px] text-right">
                      <span className="block font-mono text-sm text-white tabular-nums">{p ? fmtUsd(p) : c ? '…' : 'Open'}</span>
                      <span className="block text-xs"><Change pct={pct} /></span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <Note>{feed.status === 'live' ? t('Live Coinbase prices · 24h change', 'Prix Coinbase en direct · variation 24 h') : feed.status === 'offline' ? t('No connection · showing the last prices received', 'Hors connexion · derniers prix reçus') : feed.status === 'stale' ? t('Prices delayed', 'Prix retardés') : feed.status === 'reconnecting' ? t('Connection lost · retrying, showing the last prices received', 'Connexion perdue · nouvelle tentative, derniers prix reçus') : t('Connecting to live prices…', 'Connexion aux prix en direct…')}</Note>
      </Panel>

      {/* 3. Bot: honest one-glance status */}
      <Panel title={t('Trading Bot', 'Robot de trading')} action={<Link to="/bot" className={more}>{t('Open', 'Ouvrir')}</Link>}>
        <div className="flex items-start gap-3">
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-paper" aria-hidden="true" />
          {!glance ? (
            <div className="h-12 w-full animate-pulse bg-ink-800/60" aria-label={t('Loading bot status', 'Chargement du statut du robot')} />
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">
                {glance.holdingCash ? t('No strategy approved · holding cash', 'Aucune stratégie approuvée · en liquidités') : t(`${glance.qualified} strategies approved for paper trading`, `${glance.qualified} stratégies approuvées pour le trading fictif`)}
              </p>
              <p className="text-xs text-slate-400">
                {t(
                  `${glance.tested} strategy tests · last research run ${glance.ageH < 48 ? `${Math.floor(glance.ageH)} h` : `${Math.floor(glance.ageH / 24)} days`} ago · no bot trades yet`,
                  `${glance.tested} tests de stratégies · dernière recherche il y a ${glance.ageH < 48 ? `${Math.floor(glance.ageH)} h` : `${Math.floor(glance.ageH / 24)} jours`} · aucune transaction du robot`
                )}
              </p>
              {glance.holdingCash && glance.reason && <p className="text-xs text-slate-300">{t('Main reason', 'Raison principale')} : {glance.reason.text.toLowerCase()} ({glance.reason.count}×)</p>}
            </div>
          )}
        </div>
      </Panel>

      {/* 4. Activity */}
      {account && (
        <Panel title={t('Recent activity', 'Activité récente')} action={<Link to="/orders" className={more}>{t('All orders', 'Tous les ordres')}</Link>}>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-400">{t('No paper orders yet. Open a coin in Markets and tap Paper buy.', 'Aucun ordre fictif pour l’instant. Ouvrez une crypto dans Marchés et touchez Achat fictif.')}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recent.map((o) => (
                <li key={o.id} className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-white">
                      Paper {o.side} {o.symbol} {o.status === 'rejected' && <span className="text-[#F7A3A3]">· refused</span>}
                    </span>
                    <span className="block text-xs text-slate-500">{o.status === 'rejected' ? o.reason : `${o.qty.toFixed(6)} @ ${fmtUsd(o.fillPx)}`} · {fmtAge(o.ts)}</span>
                  </span>
                  {o.status === 'filled' && <Money v={o.side === 'buy' ? -o.cashUsd : o.cashUsd} className={o.side === 'buy' ? 'text-slate-300' : 'text-white'} />}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {/* 5. Watched (read-only) holdings, only when the user tracks addresses */}
      {showWatched && (
        <Panel title={t('Watched addresses · read-only', 'Adresses suivies · lecture seule')} action={<Link to="/portfolio" className={more}>{t('Details', 'Détails')}</Link>}>
          {watched?.snap ? (
            <p className="text-sm text-slate-300">
              <Money v={watched.snap.totalUsd} className="text-lg text-white" /> <span className="text-xs text-slate-500">· updated {watched.snap.date}</span>
            </p>
          ) : (
            <p className="text-sm text-slate-400">Open Details and tap Refresh balances to value your {watched?.addresses} watched address{watched?.addresses === 1 ? '' : 'es'}.</p>
          )}
          <Note>{t('Tracked from public blockchain data. Not part of your paper account and not tradable here.', 'Suivi à partir des données publiques de la blockchain. Ne fait pas partie de votre compte fictif et ne peut pas être échangé ici.')}</Note>
        </Panel>
      )}
    </div>
  );
}
