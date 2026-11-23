import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { bot, useBotData } from '../bot/botData';
import type { CandidateRow, MarketRow } from '../bot/summary';
import { Card, Pill, Stat } from '../components/bot/ui';
import { PageHeader } from '../components/ui';
import { STATUS_LABEL, date, dateTime, ivLabel, pct, usd } from '../components/bot/format';
import { DEFAULT_RISK, EXECUTION_MODE, LIVE_TRADING_ENABLED } from '../bot/risk';
import { GATES } from '../bot/validation';
import { COST_PRESETS } from '../bot/costs';
import { crossVenueDiscrepancies, Discrepancy } from '../bot/watchbot';
import { fetchQuote, KRAKEN_SYMBOLS, Quote } from '../bot/sources';
import type { MarketRef } from '../bot/types';


const TABS = [
  ['overview', 'Overview'],
  ['strategies', 'Strategies'],
  ['lab', 'Research Lab'],
  ['watchbot', 'Watchbot'],
  ['risk', 'Risk Center'],
  ['activity', 'Activity & Audit'],
  ['settings', 'Settings']
] as const;
type Tab = (typeof TABS)[number][0];

export default function ResearchLabPage() {
  useBotData();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'overview';
  return (
    <div className="mx-auto max-w-6xl space-y-5 fade-in">
      <ModeBanner />
      <header className="space-y-1">
        <PageHeader back title="Research Lab" subtitle="Advanced · every test, dataset and run behind the bot" />
        <p className={`text-sm ${isStale() ? 'text-amber-400' : 'text-slate-400'}`}>
          Research data from {dateTime(bot().generatedAt)} · {ageLabel()}
          {isStale() && ' · not refreshed since'}
        </p>
      </header>
      <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Trading bot sections">
        <div className="flex w-max gap-1 rounded-xl border border-ink-600 bg-ink-800/60 p-1">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setParams({ tab: id })}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${tab === id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>
      {tab === 'overview' && <Overview />}
      {tab === 'strategies' && <Strategies />}
      {tab === 'lab' && <Lab />}
      {tab === 'watchbot' && <Watchbot />}
      {tab === 'risk' && <Risk />}
      {tab === 'activity' && <Activity />}
      {tab === 'settings' && <Settings />}
    </div>
  );
}

const ageMs = () => Date.now() - new Date(bot().generatedAt).getTime();
const isStale = () => ageMs() > 24 * 3600_000;
/** Human age of the bundled research snapshot, e.g. "3 h old", "2 days old". */
function ageLabel() {
  const h = Math.max(0, Math.floor(ageMs() / 3600_000));
  if (h < 1) return 'less than 1 h old';
  if (h < 48) return `${h} h old`;
  return `${Math.floor(h / 24)} days old`;
}

function ModeBanner() {
  return (
    <p className="border-l-2 border-paper py-1 pl-3 text-xs text-slate-300">
      Simulated money only. Simulated results are not earnings. Real-money trading is disabled.
    </p>
  );
}

// ------------------------------------------------------------------ helpers over the summary
function allCandidates(): (CandidateRow & { scope: string; intervalMs: number })[] {
  return bot().runs.flatMap((r) => {
    const iv = r.markets[0]?.intervalMs ?? 0;
    return [
      ...r.markets.flatMap((m) => m.candidates.map((c) => ({ ...c, scope: m.symbol, intervalMs: m.intervalMs }))),
      ...(r.pooled ?? []).map((c) => ({ ...c, scope: `Universe (${c.markets?.length ?? 0})`, intervalMs: iv }))
    ];
  });
}
function allMarkets(): MarketRow[] {
  return bot().runs.flatMap((r) => r.markets);
}
function topReasons(n = 4) {
  const counts = new Map<string, number>();
  for (const c of allCandidates())
    for (const r of c.rejectionReasons) {
      const k = r.replace(/\d+ < \d+/, 'below minimum').replace(/[\d.]+% > 25%/, 'over 25%');
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

// ------------------------------------------------------------------ Overview
function Overview() {
  const cands = allCandidates();
  const qualified = cands.filter((c) => c.status === 'qualified_paper_strategy');
  const reachedTest = cands.filter((c) => c.test).length;
  const paper = bot().paper.filter((a) => a.kind === 'qualified');
  const diagnostic = bot().paper.filter((a) => a.kind === 'diagnostic');
  const initial = paper.reduce((s, a) => s + a.initialCash, 0);
  const equity = paper.reduce((s, a) => s + a.equity, 0);
  const realized = paper.reduce((s, a) => s + a.realizedPnl, 0);
  const unrealized = paper.reduce((s, a) => s + a.unrealizedPnl, 0);
  const open = paper.filter((a) => a.openPosition).length;
  const fills = paper.reduce((s, a) => s + a.entries, 0);
  const regimes = allMarkets().filter((m) => m.intervalMs === 86_400_000 && m.regime);
  const trading = qualified.length > 0;

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-start gap-3">
          <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${trading ? 'bg-mint-500' : 'bg-amber-500'}`} />
          <div className="space-y-1">
            <div className="text-base font-semibold text-white">
              {trading ? `Paper trading ${qualified.length} qualified strateg${qualified.length === 1 ? 'y' : 'ies'}` : 'Holding 100% cash — no strategy has qualified'}
            </div>
            <p className="text-sm text-slate-400">
              {cands.length} candidates were tested on chronologically separated data with costs. {reachedTest} survived validation and
              were opened on the untouched test period. {qualified.length} passed every gate.
              {!trading && ' Staying in cash is the correct outcome until evidence supports a strategy.'}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Real-money capital" value="$0.00" sub="live trading disabled" />
        <Stat label="Bot paper capital" value={usd(initial)} sub={`${paper.length} qualified paper accounts`} />
        <Stat label="Paper equity" value={usd(equity)} sub="simulated, after costs" />
        <Stat label="Paper net P&L" value={usd(equity - initial)} tone={equity - initial >= 0 ? 'default' : 'bad'} sub="simulated — not earned" />
        <Stat label="Realized (paper)" value={usd(realized)} />
        <Stat label="Unrealized (paper)" value={usd(unrealized)} />
        <Stat label="Open positions" value={open} sub={`${fills} entries · ${diagnostic.length} diagnostic accounts tracked separately`} />
        <Stat label="Qualified strategies" value={`${qualified.length} / ${cands.length}`} tone={qualified.length ? 'good' : 'warn'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Why the bot is not trading">
          <ul className="space-y-2 text-sm">
            {topReasons().map(([r, n]) => (
              <li key={r} className="flex justify-between gap-3">
                <span className="text-slate-300">{r}</span>
                <span className="font-mono text-slate-500">{n}×</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Costs modelled at {COST_PRESETS.coinbase_taker.takerFeeBps / 100}% taker fee per side plus spread and slippage. On hourly bars
            gross edges were consumed by costs; daily rules produced too few trades to be statistically meaningful.
          </p>
        </Card>
        <Card title="Market conditions (daily, last 48 bars)">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {regimes.map((m) => (
              <div key={m.symbol} className="rounded-lg border border-ink-600 px-3 py-2 text-xs">
                <div className="font-semibold text-slate-200">{m.base}</div>
                <div className={m.regime!.trend === 'up' ? 'text-up' : m.regime!.trend === 'down' ? 'text-rose-400' : 'text-slate-400'}>
                  {m.regime!.trend === 'range' ? 'Range' : m.regime!.trend === 'up' ? 'Uptrend' : 'Downtrend'}
                </div>
                <div className="text-slate-500">vol {m.regime!.volatility} · {m.regime!.realizedVolAnnPct.toFixed(0)}% ann.</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Research funnel">
        <Funnel />
      </Card>
    </div>
  );
}

function Funnel() {
  const c = allCandidates();
  const steps = [
    ['Hypotheses (family × market × timeframe)', c.length + allMarkets().reduce((s, m) => s + m.skipped.filter((x) => !/no new evidence/.test(x.reason)).length, 0)],
    ['Backtested after costs', c.length],
    ['Profitable on training', c.filter((x) => x.train.netReturn > 0).length],
    ['Passed validation → test opened', c.filter((x) => x.test).length],
    ['Qualified for paper trading', c.filter((x) => x.status === 'qualified_paper_strategy').length],
    ['Owner-approved live', 0]
  ] as const;
  const max = steps[0][1] || 1;
  return (
    <div className="space-y-2">
      {steps.map(([label, n]) => (
        <div key={label} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300">{label}</span>
            <span className="font-mono text-slate-400">{n}</span>
          </div>
          <div className="h-2 rounded-full bg-ink-800">
            <div className="h-2 rounded-full bg-mint-500/70" style={{ width: `${Math.max(1, (n / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Strategies
function Strategies() {
  const [iv, setIv] = useState<'all' | '1h' | '1d'>('all');
  const [status, setStatus] = useState<'all' | 'qualified' | 'tested'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const rows = allCandidates()
    .filter((c) => iv === 'all' || ivLabel(c.intervalMs) === iv)
    .filter((c) => status === 'all' || (status === 'qualified' ? c.status === 'qualified_paper_strategy' : !!c.test))
    .sort((a, b) => (b.test ? 1 : 0) - (a.test ? 1 : 0) || (b.validation?.netReturn ?? -9) - (a.validation?.netReturn ?? -9));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        {(['all', '1h', '1d'] as const).map((x) => (
          <Chip key={x} on={iv === x} onClick={() => setIv(x)}>{x === 'all' ? 'All timeframes' : x}</Chip>
        ))}
        <span className="w-px bg-white/10" />
        <Chip on={status === 'all'} onClick={() => setStatus('all')}>All</Chip>
        <Chip on={status === 'tested'} onClick={() => setStatus('tested')}>Reached test</Chip>
        <Chip on={status === 'qualified'} onClick={() => setStatus('qualified')}>Qualified</Chip>
      </div>
      <p className="text-xs text-slate-500">
        {rows.length} candidates · {GATES.version}: ≥{GATES.minTradesValidation} validation & ≥{GATES.minTradesTest} test trades, net &gt; 0
        after costs, survives 2× costs and +1 bar delay, drawdown ≤ {GATES.maxTestDrawdown * 100}%, bootstrap lower bound &gt; 0 (Bonferroni).
      </p>
      <div className="space-y-2">
        {rows.slice(0, 200).map((c) => {
          const id = `${c.scope}|${c.intervalMs}|${c.key}`;
          return (
            <div key={id} className="rounded-xl border border-ink-600 bg-ink-800/60">
              <button type="button" onClick={() => setOpen(open === id ? null : id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-slate-100">{c.key.replace('POOLED:', '')}</div>
                  <div className="text-xs text-slate-500">
                    {c.scope} · {ivLabel(c.intervalMs)} · validation {pct(c.validation?.netReturn)} net ({c.validation?.trades ?? 0} trades)
                    {c.test && ` · test ${pct(c.test.netReturn)}`}
                  </div>
                </div>
                <Pill status={c.status} />
              </button>
              {open === id && <CandidateDetail c={c} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full border px-3 py-1 ${on ? 'border-mint-500/60 bg-mint-500/10 text-helix-400' : 'border-ink-600 text-slate-400'}`}>
      {children}
    </button>
  );
}

function CandidateDetail({ c }: { c: CandidateRow }) {
  const per = c.periods
    ? [c.periods.train, c.periods.validation, c.periods.test]
    : c.cutoffs
      ? [[c.cutoffs.trainStart, c.cutoffs.trainEnd], [c.cutoffs.trainEnd, c.cutoffs.valEnd], [c.cutoffs.valEnd, c.cutoffs.testEnd]]
      : [];
  const cols = [
    ['Training', c.train],
    ['Validation', c.validation],
    ['Test (untouched)', c.test]
  ] as const;
  const dd = (w?: CandidateRow['train']) => (w ? (w.maxDrawdown ?? w.maxDrawdownBound) : undefined);
  return (
    <div className="space-y-3 border-t border-ink-600 px-4 py-3 text-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left">
          <thead className="text-slate-500">
            <tr>
              <th className="py-1 font-normal">Metric</th>
              {cols.map(([l], i) => (
                <th key={l} className="py-1 font-normal">
                  {l}
                  <div className="text-[10px] text-slate-600">{per[i] ? `${date(per[i][0])} → ${date(per[i][1])}` : ''}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono text-slate-300">
            {(
              [
                ['Trades', (w: CandidateRow['train']) => w.trades],
                ['Gross return', (w: CandidateRow['train']) => pct(w.grossReturn)],
                ['Modelled costs', (w: CandidateRow['train']) => usd(w.totalCostUsd)],
                ['Net return', (w: CandidateRow['train']) => pct(w.netReturn)],
                ['Buy & hold', (w: CandidateRow['train']) => pct(w.buyHoldReturn)],
                [c.cutoffs ? 'Max drawdown (bound)' : 'Max drawdown', (w: CandidateRow['train']) => pct(dd(w) != null ? -(dd(w) as number) : null)],
                ['Profit factor', (w: CandidateRow['train']) => (w.profitFactor == null ? (w.trades ? 'n/a (no losses)' : '—') : w.profitFactor.toFixed(2))],
                ['Win rate', (w: CandidateRow['train']) => (w.winRate == null ? '—' : `${(w.winRate * 100).toFixed(0)}%`)]
              ] as const
            ).map(([label, f]) => (
              <tr key={label} className="border-t border-white/5">
                <td className="py-1 font-display text-slate-500">{label}</td>
                {cols.map(([l, w]) => (
                  <td key={l} className="py-1">{w ? f(w) : <span className="text-slate-600">not opened</span>}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {c.stress && c.test && (
        <div className="text-slate-400">
          Robustness: 2× costs {pct(c.stress.doubleCostTestNet)} · +1 bar delay {pct(c.stress.delayedTestNet)} · neighbour params positive{' '}
          {(c.stress.neighbourPassShare * 100).toFixed(0)}%
        </div>
      )}
      {c.ci && (
        <div className="text-slate-400">
          Mean OOS trade {pct(c.ci.mean, 2)}; {((1 - c.ci.alpha) * 100).toFixed(2)}% CI [{pct(c.ci.lo, 2)}, {pct(c.ci.hi, 2)}] over {c.ci.n} trades
          {c.ci.blocks ? ` (${c.ci.blocks} monthly blocks)` : ''}
        </div>
      )}
      <div>
        <div className="mb-1 text-slate-500">Decision</div>
        {c.rejectionReasons.length ? (
          <ul className="list-inside list-disc space-y-0.5 text-rose-300">
            {c.rejectionReasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
        ) : (
          <div className="text-helix-400">Passed all gates → forward paper trading. Not approved for real money.</div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Research Lab
function Lab() {
  return (
    <div className="space-y-5">
      <Card title="Research runs">
        <div className="space-y-3">
          {bot().runs.map((r) => (
            <div key={r.runId} className="rounded-lg border border-ink-600 p-3 text-xs">
              <div className="font-code text-slate-200">{r.runId}</div>
              <div className="mt-1 text-slate-400">
                {r.totals.markets} markets · {r.totals.oosCandidates} new candidates · {r.totals.configsTried} parameter sets on training ·{' '}
                <span className={r.totals.qualified ? 'text-up' : 'text-amber-400'}>{r.totals.qualified} qualified</span> · gates {r.gates}
              </div>
            </div>
          ))}
        </div>
        <details className="mt-3 text-xs text-slate-400">
          <summary className="cursor-pointer text-slate-300">Assumptions</summary>
          <ul className="mt-2 list-inside list-disc space-y-1">{bot().runs[0]?.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
        </details>
      </Card>
      <Card title="Datasets">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="text-slate-500">
              <tr><th className="py-1 font-normal">Market</th><th className="font-normal">TF</th><th className="font-normal">Bars</th><th className="font-normal">Quality</th><th className="font-normal">Dataset id</th><th className="font-normal">Notes</th></tr>
            </thead>
            <tbody className="text-slate-300">
              {allMarkets().map((m) => (
                <tr key={m.symbol + m.intervalMs} className="border-t border-white/5">
                  <td className="py-1.5">{m.symbol}</td>
                  <td>{ivLabel(m.intervalMs)}</td>
                  <td className="font-mono">{m.quality.bars}</td>
                  <td className={`font-mono ${m.quality.score >= 90 ? 'text-up' : m.quality.score >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>{m.quality.score}</td>
                  <td className="font-code text-slate-500">{m.datasetId}</td>
                  <td className="text-slate-500">{m.quality.reasons.join('; ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Source: Coinbase Exchange public candles (no key). Gaps are never filled; only the trailing contiguous run is tested. Datasets are
          stored in <span className="font-code">research/data/</span> with content hashes for reproducibility.
        </p>
      </Card>
      <Card title="Run research yourself">
        <pre className="overflow-x-auto rounded-lg bg-ink-900 p-3 font-mono text-xs text-slate-300">{`npm run bot:research               # fetch data + new research + paper update
npm run bot:research -- --watch-only  # data, quotes, paper only (no re-testing)
npm run bot:research -- --offline     # stored data only`}</pre>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------ Watchbot
const QUOTE_BASES = ['BTC', 'ETH', 'SOL'];
function Watchbot() {
  const [live, setLive] = useState<Discrepancy[] | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [err, setErr] = useState('');
  const shown = live ?? bot().watchbot;
  const costs = useMemo(
    () => ({ coinbase: COST_PRESETS.coinbase_taker, kraken: COST_PRESETS.kraken_taker, gemini: { ...COST_PRESETS.coinbase_taker, venue: 'gemini' as const, takerFeeBps: 40 } }),
    []
  );
  async function refresh() {
    setState('loading');
    setErr('');
    try {
      const out: Discrepancy[] = [];
      for (const base of QUOTE_BASES) {
        const refs: MarketRef[] = [
          { venue: 'coinbase', symbol: `${base}-USD`, base, quote: 'USD' },
          { venue: 'kraken', symbol: KRAKEN_SYMBOLS[base], base, quote: 'USD' },
          { venue: 'gemini', symbol: `${base.toLowerCase()}usd`, base, quote: 'USD' }
        ];
        const qs = (await Promise.allSettled(refs.map((r) => fetchQuote(r)))).flatMap((r) => (r.status === 'fulfilled' ? [r.value as Quote] : []));
        out.push(...crossVenueDiscrepancies(base, qs, costs));
      }
      setLive(out);
      setState('idle');
    } catch (e) {
      setErr((e as Error).message);
      setState('error');
    }
  }
  const markets = allMarkets().filter((m) => m.intervalMs === 3_600_000);
  return (
    <div className="space-y-5">
      <Card title="Lifecycle (never merged)">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {['detected_opportunity', 'research_hypothesis', 'backtested_candidate', 'qualified_paper_strategy', 'owner_approved_live_candidate'].map((s, i, a) => (
            <span key={s} className="flex items-center gap-2">
              <Pill status={s} />
              {i < a.length - 1 && <span className="text-slate-600">→</span>}
            </span>
          ))}
        </div>
      </Card>
      <Card
        title="Cross-venue price check"
        right={
          <button type="button" onClick={refresh} disabled={state === 'loading'} className="rounded-lg border border-ink-600 px-3 py-1.5 text-xs text-slate-200">
            {state === 'loading' ? 'Checking…' : 'Check live quotes'}
          </button>
        }
      >
        <p className="mb-3 text-xs text-slate-500">
          Compares best bid/ask on Coinbase, Kraken and Gemini. Even a positive net edge is only a <em>detected opportunity</em>: it ignores
          transfer time, withdrawal fees, inventory on both venues and order-book depth. It is never shown as profit.
        </p>
        {state === 'error' && <div className="mb-2 text-xs text-rose-400">{err}</div>}
        {!shown.length ? (
          <div className="text-xs text-slate-500">No quote snapshot stored yet — press “Check live quotes”.</div>
        ) : (
          <div className="space-y-1.5">
            {shown.slice(0, 18).map((d) => (
              <div key={d.base + d.buyVenue + d.sellVenue} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 px-3 py-2 text-xs">
                <span className="text-slate-300">
                  {d.base}: buy {d.buyVenue} → sell {d.sellVenue}
                </span>
                <span className="font-mono text-slate-400">
                  gross {d.grossEdgePct.toFixed(3)}% · fees {d.roundTripCostPct.toFixed(2)}% ·{' '}
                  <span className={d.netEdgePct > 0 ? 'text-amber-400' : 'text-rose-400'}>net {d.netEdgePct.toFixed(3)}%</span>
                </span>
              </div>
            ))}
            <div className="pt-1 text-[11px] text-slate-500">{live ? `Live check ${dateTime(Date.now())}` : `Stored snapshot ${dateTime(bot().generatedAt)}`}</div>
          </div>
        )}
      </Card>
      <Card title="Market coverage (hourly)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="text-slate-500">
              <tr><th className="py-1 font-normal">Market</th><th className="font-normal">Data quality</th><th className="font-normal">Regime</th><th className="font-normal">Volatility</th><th className="font-normal">Min order</th></tr>
            </thead>
            <tbody className="text-slate-300">
              {markets.map((m) => (
                <tr key={m.symbol} className="border-t border-white/5">
                  <td className="py-1.5">{m.symbol}</td>
                  <td className="font-mono">{m.quality.score}/100</td>
                  <td>{m.regime ? m.regime.trend : '—'}</td>
                  <td>{m.regime ? `${m.regime.volatility} (${m.regime.realizedVolAnnPct.toFixed(0)}%)` : '—'}</td>
                  <td className="font-mono">{usd(m.costBps.minOrderUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Same asset on several venues or chains counts as one exposure. DEX/multichain discovery is not yet implemented in this section.
        </p>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------ Risk Center
function Risk() {
  const feas = bot().runs[0]?.feasibility ?? [];
  const caps = [...new Set(feas.map((f) => f.capitalUsd))];
  const venues = [...new Set(feas.map((f) => f.note.split(':')[0]))];
  const p = DEFAULT_RISK;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Execution mode" value={EXECUTION_MODE.toUpperCase()} tone="warn" />
        <Stat label="Live trading" value={LIVE_TRADING_ENABLED ? 'ON' : 'LOCKED'} tone={LIVE_TRADING_ENABLED ? 'bad' : 'good'} sub="no order adapter exists" />
        <Stat label="Kill switches tripped" value={bot().paper.filter((a) => a.killSwitch).length} />
        <Stat label="Leverage" value="1× (none)" sub="no margin, no shorting" />
      </div>
      <Card title="Enforced limits (per paper account)">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          {[
            ['Max position size', `${p.maxPositionFraction * 100}% of equity`],
            ['Max open positions', p.maxOpenPositions],
            ['Same asset across venues/chains', `${p.maxCorrelatedPositionsPerBase} position`],
            ['Daily loss limit', `${p.maxDailyLossFraction * 100}% → entries blocked`],
            ['Weekly loss limit', `${p.maxWeeklyLossFraction * 100}% → entries blocked`],
            ['Drawdown kill switch', `${p.maxDrawdownKill * 100}% from peak → exit & stop`],
            ['Stale data', `> ${p.maxStaleBars} bars old → entries blocked`],
            ['Averaging down / martingale', 'disabled']
          ].map(([k, v]) => (
            <div key={String(k)} className="flex justify-between gap-3 rounded-lg border border-white/5 px-3 py-2">
              <span className="text-slate-400">{k}</span>
              <span className="text-right text-slate-200">{v}</span>
            </div>
          ))}
        </div>
      </Card>
      <MeasuredCosts />
      <Card title="Small-account feasibility">
        <p className="mb-3 text-xs text-slate-500">
          A $20 account is not a scaled-down $1,000 account: venue minimums and fixed costs (gas) bind. Round-trip cost shown for one
          policy-sized position.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="text-slate-500">
              <tr>
                <th className="py-1 font-normal">Capital</th>
                {venues.map((v) => <th key={v} className="font-normal">{v.replace('_', ' ')}</th>)}
              </tr>
            </thead>
            <tbody>
              {caps.map((cap) => (
                <tr key={cap} className="border-t border-white/5">
                  <td className="py-1.5 font-mono text-slate-200">${cap}</td>
                  {venues.map((v) => {
                    const f = feas.find((x) => x.capitalUsd === cap && x.note.startsWith(v + ':'))!;
                    const tone = f.verdict === 'tradable' ? 'text-up' : f.verdict === 'single_position_only' ? 'text-amber-400' : 'text-rose-400';
                    return (
                      <td key={v} className={tone}>
                        {f.verdict.replace(/_/g, ' ')}
                        <div className="text-[10px] text-slate-500">{f.roundTripCostPct.toFixed(2)}% round trip</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------ Activity & Audit
function Activity() {
  return (
    <div className="space-y-5">
      <Card title={`Paper accounts (${bot().paper.length})`}>
        <p className="mb-3 text-xs text-slate-500">
          Forward-only: an account never trades bars that opened before it was created. “Diagnostic” accounts track rejected candidates to
          check whether rejecting them was right — they are not strategies the bot endorses.
        </p>
        <div className="space-y-2">
          {bot().paper.map((a) => (
            <details key={a.id} className="rounded-lg border border-ink-600 px-3 py-2 text-xs">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                <span className="min-w-0 truncate text-slate-200">{a.label}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-slate-400">{usd(a.equity)}</span>
                  <Pill status={a.kind} />
                </span>
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-2 text-slate-400 sm:grid-cols-4">
                <div>Started {dateTime(a.createdAt)}</div>
                <div>Bars processed {a.barsProcessed}</div>
                <div>Entries {a.entries} · exits {a.trades}</div>
                <div>Costs {usd(a.totalCostUsd)}</div>
              </div>
              {a.barsProcessed === 0 && <div className="mt-2 text-amber-400">No forward bar has completed since creation — $0 P&amp;L is not performance.</div>}
              {a.recentDecisions.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {a.recentDecisions.map((d, i) => (
                    <li key={i} className="text-slate-400"><span className="font-mono text-slate-500">{dateTime(d.t)}</span> {d.action}: {d.reason}</li>
                  ))}
                </ul>
              )}
            </details>
          ))}
        </div>
      </Card>
      <Card title="Audit trail">
        <ul className="space-y-1.5 text-xs text-slate-400">
          <li><span className="font-mono text-slate-500">{dateTime(bot().generatedAt)}</span> snapshot written by code {bot().codeVersion.slice(0, 12)}</li>
          {bot().runs.map((r) => (
            <li key={r.runId}><span className="font-code text-slate-500">{r.runId}</span> — {r.totals.oosCandidates} evaluated, {r.totals.qualified} qualified</li>
          ))}
          <li>{bot().datasets.length} stored datasets in research/data</li>
        </ul>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------ Settings
function Settings() {
  return (
    <div className="space-y-5">
      <Card title="Mode">
        <div className="space-y-2 text-sm text-slate-300">
          <div className="flex items-center justify-between rounded-lg border border-ink-600 px-3 py-2">
            <span>Paper trading</span>
            <Pill status="qualified">On (locked)</Pill>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-ink-600 px-3 py-2">
            <span>Real-money trading</span>
            <Pill status="rejected">Off (locked)</Pill>
          </div>
          <p className="text-xs text-slate-500">
            Enabling real money is not a switch in this app. It requires the owner’s written approval, a strategy with forward paper evidence,
            a new reviewed exchange-order adapter and a code change to the lock in <span className="font-mono">src/bot/risk.ts</span>.
          </p>
        </div>
      </Card>
      <Card title="Exchange connections">
        <p className="text-sm text-slate-400">
          The bot uses public market data only and needs no API keys. Read-only portfolio connections are managed on the{' '}
          <Link to="/connections" className="text-up underline">Connections</Link> page and are never used for orders.
        </p>
      </Card>
      <Card title="Research configuration">
        <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
          <div>Gates: <span className="font-mono text-slate-200">{GATES.version}</span></div>
          <div>Split: {GATES.split.train * 100}/{GATES.split.validation * 100}/{GATES.split.test * 100} train/validation/test (chronological)</div>
          <div>Cost model: {COST_PRESETS.coinbase_taker.takerFeeBps}bps fee + {COST_PRESETS.coinbase_taker.halfSpreadBps}bps half-spread + {COST_PRESETS.coinbase_taker.slippageBps}bps slippage per side</div>
          <div>Statuses: {Object.keys(STATUS_LABEL).length} lifecycle labels, never merged</div>
        </div>
      </Card>
    </div>
  );
}

function MeasuredCosts() {
  const c = bot().costs;
  const [size, setSize] = useState(1000);
  if (!c) return null;
  const rows = c.measured.filter((m) => m.notionalUsd === size).sort((a, b) => a.symbol.localeCompare(b.symbol) || a.venue.localeCompare(b.venue));
  const total = c.placeholder.halfSpreadBps + c.placeholder.slippageBps;
  return (
    <Card
      title="Measured execution costs (order books)"
      right={
        <div className="flex gap-1 text-xs">
          {[20, 100, 1000, 5000].map((n) => (
            <Chip key={n} on={size === n} onClick={() => setSize(n)}>${n}</Chip>
          ))}
        </div>
      }
    >
      <p className="mb-3 text-xs text-slate-500">
        Spread + book-walk slippage per side for a market order, 75th percentile of {c.snapshots} public order-book snapshots over{' '}
        {c.collectionDays} day{c.collectionDays === 1 ? '' : 's'}. Research still uses the {total} bps placeholder until {c.requiredDays} days are
        collected (pre-registered). Exchange fees are separate and dominate: {COST_PRESETS.coinbase_taker.takerFeeBps} bps Coinbase taker.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-xs">
          <thead className="text-slate-500">
            <tr><th className="py-1 font-normal">Market</th><th className="font-normal">Venue</th><th className="font-normal">Half-spread</th><th className="font-normal">Slippage</th><th className="font-normal">Total vs {total} bps</th></tr>
          </thead>
          <tbody className="font-mono text-slate-300">
            {rows.map((m) => {
              const t = m.halfSpreadBpsP75 + (Number.isFinite(m.slippageBpsP75) ? m.slippageBpsP75 : NaN);
              return (
                <tr key={m.venue + m.symbol} className="border-t border-white/5">
                  <td className="py-1.5 font-display">{m.symbol}</td>
                  <td className="font-display text-slate-400">{m.venue}</td>
                  <td>{m.halfSpreadBpsP75.toFixed(2)}</td>
                  <td>{m.unfilledShare > 0 ? <span className="text-rose-400">depth short</span> : m.slippageBpsP75.toFixed(2)}</td>
                  <td className={!Number.isFinite(t) ? 'text-rose-400' : t <= total ? 'text-up' : 'text-amber-400'}>{Number.isFinite(t) ? t.toFixed(2) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
