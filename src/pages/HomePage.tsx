import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import raw from '../bot/data/latest.json';
import type { BotSummary } from '../bot/summary';
import { botHeadline, plainReasons, snapshotAgeHours } from '../bot/insights';
import { MARKET_COINS, fetchCandles } from '../services/market';
import { listAddresses, listSnapshots } from '../services/storage';
import type { SnapshotRecord } from '../types';
import { usePaper } from '../paper/PaperProvider';
import { STARTING_CAPITAL_OPTIONS } from '../paper/engine';
import { useWatchlist } from '../hooks/useWatchlist';
import { Button, Change, CoinBadge, Money, Note, Panel } from '../components/ui';
import { fmtAge, fmtUsd } from '../services/marketData';

const S = raw as unknown as BotSummary;
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
      <polyline fill="none" stroke={up ? '#35C48F' : '#F26E6E'} strokeWidth="1.6" points={pts} />
    </svg>
  );
}

const more = 'inline-flex min-h-[44px] items-center text-sm font-medium text-helix-400';

function OpenAccount() {
  const { start } = usePaper();
  const [cap, setCap] = useState<number>(1000);
  const [busy, setBusy] = useState(false);
  return (
    <section className="space-y-4 rounded-2xl border border-ink-600 bg-ink-800 p-4">
      <div className="space-y-1">
        <span className="rounded-md border border-dashed border-paper px-2 py-0.5 text-[11px] font-bold tracking-wider text-paper">PAPER MONEY</span>
        <h1 className="pt-2 text-xl font-semibold text-white">Practise trading without risking money</h1>
        <p className="text-sm text-slate-400">
          A paper account uses simulated dollars at live prices, with real fees modelled. Nothing is sent to an exchange.
        </p>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm text-slate-300">Starting balance</legend>
        <div className="grid grid-cols-3 gap-2">
          {STARTING_CAPITAL_OPTIONS.map((c) => (
            <button key={c} type="button" aria-pressed={cap === c} onClick={() => setCap(c)}
              className={`min-h-[48px] rounded-xl border font-mono text-sm ${cap === c ? 'border-helix-400 bg-helix-400/15 text-helix-300' : 'border-ink-600 text-slate-300'}`}>
              ${c.toLocaleString()}
            </button>
          ))}
        </div>
      </fieldset>
      <Button kind="primary" className="w-full" disabled={busy} onClick={async () => { setBusy(true); await start(cap); setBusy(false); }}>
        Open paper account
      </Button>
    </section>
  );
}

export default function HomePage() {
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

  const head = botHeadline(S);
  const reason = plainReasons(S, 1)[0];
  const age = snapshotAgeHours(S);
  const recent = account ? [...account.orders].reverse().slice(0, 4) : [];
  const positions = account ? Object.values(account.positions) : [];
  const showWatched = watched && (watched.addresses > 0 || (watched.snap && watched.snap.totalUsd > 0));

  return (
    <div className="mx-auto max-w-xl space-y-4 fade-in">
      {/* 1. Paper account: what you have, what it did, what you can do */}
      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-ink-800" aria-label="Loading account" />
      ) : !account || !value ? (
        <OpenAccount />
      ) : (
        <section className="space-y-3" aria-labelledby="acct">
          <div className="flex items-center justify-between">
            <h1 id="acct" className="text-sm text-slate-400">Paper account · simulated money</h1>
            {account.halted && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">Paused</span>}
          </div>
          <div>
            <div className="font-mono text-4xl font-medium tracking-tight text-white tabular-nums">
              <Money v={value.equity} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm">
              <Change pct={value.returnPct} abs={value.totalPnl} />
              <span className="text-slate-400">since you started with ${account.startingCash.toLocaleString()}</span>
            </div>
            {value.missingPrice && <Note tone="warn">Some positions are valued at cost until live prices arrive.</Note>}
          </div>
          {chart ? (
            <svg viewBox="0 0 300 90" preserveAspectRatio="none" className="h-24 w-full" role="img" aria-label={`Paper account value, ${range}`}>
              <line x1="0" x2="300" y1={chart.base} y2={chart.base} stroke="#253142" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
              <polyline fill="none" stroke={chart.up ? '#35C48F' : '#F26E6E'} strokeWidth="2" points={chart.line} vectorEffect="non-scaling-stroke" />
            </svg>
          ) : (
            <p className="rounded-xl border border-dashed border-ink-600 p-3 text-xs text-slate-400">
              The value chart builds up as your account is valued (about once an hour while the app is open).
            </p>
          )}
          <div role="radiogroup" aria-label="Chart range" className="flex gap-1">
            {RANGES.map((r) => (
              <button key={r.key} type="button" role="radio" aria-checked={range === r.key} onClick={() => setRange(r.key)}
                className={`min-h-[36px] flex-1 rounded-lg font-mono text-xs ${range === r.key ? 'bg-ink-700 text-white' : 'text-slate-400'}`}>
                {r.key}
              </button>
            ))}
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {[
              ['Cash available', value.cash],
              ['Invested', value.positionsValue],
              ['Realized P&L', value.realized],
              ['Fees paid', value.fees]
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-xl bg-ink-800 px-3 py-2">
                <dt className="text-xs text-slate-400">{l}</dt>
                <dd className="font-mono text-white"><Money v={v as number} /></dd>
              </div>
            ))}
          </dl>
          <div className="grid grid-cols-3 gap-2">
            <Link to="/markets" className="flex min-h-[48px] items-center justify-center rounded-xl bg-helix-400 text-sm font-semibold text-ink-900">Trade</Link>
            <Link to="/alerts" className="flex min-h-[48px] items-center justify-center rounded-xl bg-ink-700 text-sm font-semibold text-white">Set alert</Link>
            <Link to="/wallet" className="flex min-h-[48px] items-center justify-center rounded-xl bg-ink-700 text-sm font-semibold text-white">Wallet</Link>
          </div>
        </section>
      )}

      {positions.length > 0 && (
        <Panel title="Your paper positions">
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
        <div className="grid grid-cols-2 gap-2">
          {[['Top mover', movers.top], ['Weakest', movers.bottom]].map(([label, m]) => {
            const x = m as { sym: string; name: string; pct: number };
            return (
              <Link key={label as string} to={`/markets/${x.sym}`} className="min-h-[64px] rounded-2xl border border-ink-600 bg-ink-800 p-3">
                <span className="block text-xs text-slate-400">{label as string} · 24h</span>
                <span className="block text-sm font-semibold text-white">{x.name}</span>
                <Change pct={x.pct} className="text-sm" />
              </Link>
            );
          })}
        </div>
      )}

      <Panel title="Watchlist" action={<Link to="/markets" className={more}>All markets</Link>}>
        {watchlist.length === 0 ? (
          <p className="text-sm text-slate-400">Open any coin in Markets and tap ☆ to watch it.</p>
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
        <Note>{feed.status === 'live' ? 'Live Coinbase prices · 24h change' : feed.status === 'stale' ? 'Prices delayed' : 'Connecting to live prices…'}</Note>
      </Panel>

      {/* 3. Bot: honest one-glance status */}
      <Panel title="Trading Bot" action={<Link to="/bot" className={more}>Open</Link>}>
        <div className="flex items-start gap-3">
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-paper" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">
              {head.holdingCash ? 'No strategy approved · holding cash' : `${head.qualified} strategies approved for paper trading`}
            </p>
            <p className="text-xs text-slate-400">
              {head.tested} strategies tested · research {age < 48 ? `${Math.floor(age)} h` : `${Math.floor(age / 24)} days`} old · no bot trades yet
            </p>
            {head.holdingCash && reason && <p className="text-xs text-slate-300">Main reason: {reason.text.toLowerCase()} ({reason.count}×)</p>}
          </div>
        </div>
      </Panel>

      {/* 4. Activity */}
      {account && (
        <Panel title="Recent activity">
          {recent.length === 0 ? (
            <p className="text-sm text-slate-400">No paper orders yet. Open a coin in Markets and tap Paper buy.</p>
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
        <Panel title="Watched addresses · read-only" action={<Link to="/portfolio" className={more}>Details</Link>}>
          {watched?.snap ? (
            <p className="text-sm text-slate-300">
              <Money v={watched.snap.totalUsd} className="text-lg text-white" /> <span className="text-xs text-slate-500">· updated {watched.snap.date}</span>
            </p>
          ) : (
            <p className="text-sm text-slate-400">Open Details and tap Refresh balances to value your {watched?.addresses} watched address{watched?.addresses === 1 ? '' : 'es'}.</p>
          )}
          <Note>Tracked from public blockchain data. Not part of your paper account and not tradable here.</Note>
        </Panel>
      )}
    </div>
  );
}
