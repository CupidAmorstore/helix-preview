import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import raw from '../bot/data/latest.json';
import type { BotSummary } from '../bot/summary';
import { botHeadline, dailyRegimes, plainReasons, snapshotAgeHours } from '../bot/insights';
import { MARKET_COINS, fetchCandles } from '../services/market';
import { useLiveFeed } from '../hooks/useLivePrices';
import { getSetting, listAlerts, listSnapshots, setSetting } from '../services/storage';
import type { AlertRecord, SnapshotRecord } from '../types';

const S = raw as unknown as BotSummary;
const DEFAULT_WATCHLIST = ['BTC', 'ETH', 'SOL'];
const COIN_COLOR: Record<string, string> = {
  BTC: '#F7A440', ETH: '#8A93F5', SOL: '#4BE3B4', LINK: '#5B8DEF', XRP: '#C9D3E0', DOGE: '#E6C35C', ADA: '#5AA7F0', AVAX: '#F07C7C'
};
const ALL_PRODUCTS = MARKET_COINS.map((c) => c.product);

const usd = (v: number, max = 2) => `$${v.toLocaleString(undefined, { minimumFractionDigits: max === 0 ? 0 : 2, maximumFractionDigits: max })}`;
const priceFmt = (v: number) => usd(v, v < 1 ? 4 : 2);

function Change({ pct }: { pct: number | null }) {
  if (pct === null || !Number.isFinite(pct)) return <span className="text-slate-500">—</span>;
  const up = pct >= 0;
  return (
    <span className={`font-mono tabular-nums ${up ? 'text-up' : 'text-down'}`}>
      {up ? '▲ +' : '▼ −'}
      {Math.abs(pct).toFixed(2)}%
    </span>
  );
}

function Sparkline({ values, up }: { values: number[]; up: boolean }) {
  if (values.length < 2) return <span className="inline-block h-6 w-16" aria-hidden="true" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 64},${22 - ((v - min) / (max - min || 1)) * 20}`).join(' ');
  return (
    <svg viewBox="0 0 64 24" className="h-6 w-16" aria-hidden="true">
      <polyline fill="none" stroke={up ? '#35C48F' : '#F26E6E'} strokeWidth="1.6" points={pts} />
    </svg>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-ink-600 bg-ink-800 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const linkCls = 'inline-flex min-h-[44px] items-center text-sm font-medium text-helix-400';

export default function HomePage() {
  const [snapshots, setSnapshots] = useState<SnapshotRecord[] | null>(null);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);
  const [editing, setEditing] = useState(false);
  const [spark, setSpark] = useState<Record<string, number[]>>({});
  const feed = useLiveFeed(ALL_PRODUCTS);

  useEffect(() => {
    listSnapshots().then((s) => setSnapshots([...s].sort((a, b) => a.date.localeCompare(b.date)))).catch(() => setSnapshots([]));
    listAlerts().then(setAlerts).catch(() => undefined);
    getSetting<string[]>('watchlist').then((w) => w && w.length && setWatchlist(w)).catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    watchlist.forEach((sym) => {
      const coin = MARKET_COINS.find((c) => c.symbol === sym);
      if (!coin || spark[sym]) return;
      fetchCandles(coin.product, '1h')
        .then((c) => active && setSpark((prev) => ({ ...prev, [sym]: c.slice(-24).map((k) => k.c) })))
        .catch(() => undefined);
    });
    return () => {
      active = false;
    };
  }, [watchlist]); // eslint-disable-line react-hooks/exhaustive-deps -- spark is a cache, not a trigger

  const toggleCoin = (sym: string) => {
    const next = watchlist.includes(sym) ? watchlist.filter((s) => s !== sym) : [...watchlist, sym];
    setWatchlist(next);
    setSetting('watchlist', next).catch(() => undefined);
  };

  const latest = snapshots && snapshots.length ? snapshots[snapshots.length - 1] : null;
  const previous = snapshots && snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
  const holdingsChange = latest && previous && previous.totalUsd > 0 ? ((latest.totalUsd - previous.totalUsd) / previous.totalUsd) * 100 : null;
  const chart = useMemo(() => {
    if (!snapshots || snapshots.length < 2) return null;
    const v = snapshots.slice(-30).map((s) => s.totalUsd);
    const min = Math.min(...v);
    const max = Math.max(...v);
    return v.map((x, i) => `${(i / (v.length - 1)) * 300},${84 - ((x - min) / (max - min || 1)) * 72}`).join(' ');
  }, [snapshots]);

  const head = botHeadline(S);
  const reasons = plainReasons(S, 3);
  const regimes = dailyRegimes(S);
  const age = snapshotAgeHours(S);
  const ageText = age < 48 ? `${Math.floor(age)} h old` : `${Math.floor(age / 24)} days old`;
  const feedNote = feed.status === 'live' ? null : feed.status === 'stale' ? 'Prices delayed' : feed.status === 'reconnecting' ? 'Reconnecting…' : 'Connecting…';

  return (
    <div className="mx-auto max-w-xl space-y-4 fade-in">
      {/* Holdings: real watched value from the daily snapshot, never an example number */}
      <section className="space-y-3 pt-1" aria-labelledby="holdings-title">
        <div className="flex items-center justify-between">
          <h1 id="holdings-title" className="text-sm text-slate-400">
            Watched holdings
          </h1>
          {latest && (
            <Link to="/portfolio" className={linkCls}>
              Details
            </Link>
          )}
        </div>
        {snapshots === null ? (
          <div className="h-[120px] animate-pulse rounded-2xl bg-ink-800" aria-label="Loading holdings" />
        ) : latest ? (
          <>
            <div>
              <div className="font-mono text-4xl font-medium tracking-tight text-white tabular-nums">{usd(latest.totalUsd)}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm">
                <Change pct={holdingsChange} />
                <span className="text-slate-400">{holdingsChange === null ? 'Change shows after 2 days of history' : 'since previous day'}</span>
                <span className="text-slate-500">· updated {latest.date}</span>
              </div>
            </div>
            {chart && (
              <svg viewBox="0 0 300 90" preserveAspectRatio="none" className="h-24 w-full" role="img" aria-label={`Holdings value over the last ${Math.min(30, snapshots.length)} days`}>
                <polyline fill="none" stroke="#4CC9E8" strokeWidth="2" points={chart} vectorEffect="non-scaling-stroke" />
              </svg>
            )}
          </>
        ) : (
          <div className="space-y-3 rounded-2xl border border-dashed border-ink-600 p-4">
            <p className="text-base font-semibold text-white">See your crypto in one place</p>
            <p className="text-sm text-slate-400">Watch any public address, or create a testnet wallet. No exchange account or keys needed.</p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <Link to="/wallet" className="flex min-h-[48px] items-center justify-center rounded-xl bg-ink-700 text-sm font-semibold text-white">
            Receive
          </Link>
          <Link to="/alerts" className="flex min-h-[48px] items-center justify-center rounded-xl bg-helix-400 text-sm font-semibold text-ink-900">
            Set alert
          </Link>
          <Link to="/connections" className="flex min-h-[48px] items-center justify-center rounded-xl bg-ink-700 text-sm font-semibold text-white">
            Watch address
          </Link>
        </div>
      </section>

      <Card
        title="Watchlist"
        action={
          <button type="button" onClick={() => setEditing((e) => !e)} className={linkCls} aria-expanded={editing}>
            {editing ? 'Done' : 'Edit'}
          </button>
        }
      >
        {editing ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Choose coins for your watchlist">
            {MARKET_COINS.map((c) => {
              const on = watchlist.includes(c.symbol);
              return (
                <button
                  key={c.symbol}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleCoin(c.symbol)}
                  className={`min-h-[44px] rounded-full border px-4 text-sm ${on ? 'border-helix-400 bg-helix-400/15 text-helix-300' : 'border-ink-600 text-slate-300'}`}
                >
                  {on ? '✓ ' : '+ '}
                  {c.symbol}
                </button>
              );
            })}
          </div>
        ) : watchlist.length === 0 ? (
          <p className="text-sm text-slate-400">Tap Edit to add coins.</p>
        ) : (
          <ul className="divide-y divide-ink-600">
            {watchlist.map((sym) => {
              const coin = MARKET_COINS.find((c) => c.symbol === sym);
              if (!coin) return null;
              const price = feed.prices[sym];
              const open = feed.open24h[sym];
              const pct = price && open ? ((price - open) / open) * 100 : null;
              return (
                <li key={sym}>
                  <Link to="/markets" className="flex min-h-[56px] items-center gap-3 py-2">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[10px] font-bold text-ink-900" style={{ background: COIN_COLOR[sym] ?? '#C9D3E0' }}>
                      {sym}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-white">{coin.name}</span>
                      <span className="block text-xs text-slate-500">{sym}</span>
                    </span>
                    <Sparkline values={spark[sym] ?? []} up={(pct ?? 0) >= 0} />
                    <span className="w-[104px] text-right">
                      <span className="block font-mono text-sm text-white tabular-nums">{price ? priceFmt(price) : '…'}</span>
                      <span className="block text-xs">
                        <Change pct={pct} />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-slate-500" role="status">
          {feedNote ?? 'Live prices from Coinbase · 24h change'}
        </p>
      </Card>

      <Card
        title="Trading Bot"
        action={
          <Link to="/bot" className={linkCls}>
            Open
          </Link>
        }
      >
        <div className="flex items-start gap-3">
          <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${head.holdingCash ? 'bg-paper' : 'bg-up'}`} aria-hidden="true" />
          <div>
            <p className="text-base font-semibold text-white">{head.holdingCash ? 'Holding 100% cash' : `${head.qualified} strategies in paper trading`}</p>
            <p className="text-sm text-slate-400">
              {head.tested} strategies tested · {head.qualified} passed · research data {ageText}
            </p>
          </div>
        </div>
        <ol className="grid grid-cols-4 gap-1.5 text-[11px]" aria-label="Bot stages">
          {[
            ['Research', 'done'],
            ['Backtest', 'done'],
            ['Paper', 'now'],
            ['Live 🔒', 'locked']
          ].map(([label, st]) => (
            <li key={label} className={`space-y-1 ${st === 'locked' ? 'text-slate-500' : 'text-slate-300'}`}>
              <span className={`block h-1 rounded ${st === 'done' ? 'bg-helix-400' : st === 'now' ? 'bg-helix-400/50' : 'bg-ink-600'}`} />
              {label}
            </li>
          ))}
        </ol>
      </Card>

      {head.holdingCash && (
        <Card
          title="Why the bot isn't trading"
          action={
            <Link to="/bot?tab=strategies" className={linkCls}>
              Details
            </Link>
          }
        >
          <ul className="space-y-2">
            {reasons.map((r) => (
              <li key={r.text} className="flex gap-3 text-sm">
                <span className="w-10 shrink-0 font-mono text-slate-400 tabular-nums">{r.count}×</span>
                <span className="text-slate-200">{r.text}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">Staying in cash is the safe result until a strategy proves itself after fees.</p>
        </Card>
      )}

      <Card title="Market mood · daily">
        <div className="flex flex-wrap gap-2">
          {regimes.map(({ base, regime }) => (
            <span
              key={base}
              className={`rounded-full px-3 py-1.5 text-xs ${
                regime.trend === 'down' ? 'bg-down/15 text-[#F7A3A3]' : regime.trend === 'up' ? 'bg-up/15 text-[#7EE0B8]' : 'bg-ink-700 text-slate-300'
              }`}
            >
              {base} {regime.trend === 'up' ? '▲ uptrend' : regime.trend === 'down' ? '▼ downtrend' : 'range'}
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-500">From the bot&apos;s last research run ({ageText}). Long-only rules avoid buying in downtrends.</p>
      </Card>

      <Card
        title="Price alerts"
        action={
          <Link to="/alerts" className={linkCls}>
            {alerts.length ? 'Manage' : 'Add'}
          </Link>
        }
      >
        {alerts.length ? (
          <ul className="space-y-1 text-sm text-slate-200">
            {alerts.slice(0, 3).map((a) => (
              <li key={a.id}>
                {a.symbol} {a.direction} <span className="font-mono tabular-nums">{priceFmt(a.threshold)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No alerts yet. Alerts currently work while the app is open.</p>
        )}
      </Card>
    </div>
  );
}
