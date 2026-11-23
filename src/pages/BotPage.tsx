import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import raw from '../bot/data/latest.json';
import type { BotSummary } from '../bot/summary';
import { botHeadline, dailyRegimes, plainReasons, snapshotAgeHours, strategyEvidence } from '../bot/insights';
import { DEFAULT_RISK, LIVE_TRADING_ENABLED } from '../bot/risk';
import { usePaper } from '../paper/PaperProvider';
import { Button, Note, Panel, Segmented } from '../components/ui';
import { fmtAge } from '../services/marketData';

const S = raw as unknown as BotSummary;
type Tab = 'overview' | 'strategies' | 'activity';
const pct = (x: number | undefined) => (x === undefined || !Number.isFinite(x) ? '—' : `${x >= 0 ? '▲ +' : '▼ −'}${Math.abs(x * 100).toFixed(1)}%`);
const tone = (x: number | undefined) => (x === undefined ? 'text-slate-400' : x >= 0 ? 'text-up' : 'text-down');

function Row({ k, v, vClass = 'text-white' }: { k: string; v: React.ReactNode; vClass?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <dt className="text-slate-400">{k}</dt>
      <dd className={`text-right font-mono tabular-nums ${vClass}`}>{v}</dd>
    </div>
  );
}

function Overview() {
  const head = botHeadline(S);
  const reasons = plainReasons(S, 3);
  const regimes = dailyRegimes(S);
  const ageH = snapshotAgeHours(S);
  const diag = S.paper;
  const forwardBars = diag.reduce((s, a) => s + a.barsProcessed, 0);
  const { account, pause } = usePaper();

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex items-start gap-3">
          <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-paper" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-lg font-semibold text-white">Stopped · no approved strategy</p>
            <p className="text-sm text-slate-300">
              The bot researched {head.tested} strategies. {head.qualified === 0 ? 'None passed every safety test, so it holds 100% cash and places no trades.' : `${head.qualified} passed.`}
            </p>
          </div>
        </div>
        <dl className="divide-y divide-ink-600">
          <Row k="Last research run" v={`${new Date(S.generatedAt).toISOString().slice(0, 16).replace('T', ' ')} UTC`} />
          <Row k="Research data age" v={ageH < 48 ? `${Math.floor(ageH)} h` : `${Math.floor(ageH / 24)} days`} vClass={ageH > 24 ? 'text-amber-400' : 'text-white'} />
          <Row k="Where it runs" v="On a computer (not this phone)" vClass="text-slate-200" />
          <Row k="Data sources" v="Coinbase · Kraken · Gemini (public)" vClass="text-slate-200" />
          <Row k="Mode" v={LIVE_TRADING_ENABLED ? 'LIVE' : 'Paper only · real money locked'} vClass="text-paper" />
        </dl>
      </Panel>

      <Panel title="Bot capital & results">
        <dl className="divide-y divide-ink-600">
          <Row k="Paper capital allocated" v="$0.00" />
          <Row k="Open positions" v="0" />
          <Row k="Realized / unrealized P&L" v="$0.00 / $0.00" />
          <Row k="Fees paid" v="$0.00" />
          <Row k="Drawdown" v="0%" />
        </dl>
        <Note>
          These are zero because the bot has not traded, not because it broke even. {diag.length} tracking accounts follow rejected strategies forward to check the
          decisions; they have processed {forwardBars} closed {forwardBars === 1 ? 'bar' : 'bars'} so far. An equity curve will appear once there is forward data.
        </Note>
      </Panel>

      <Panel title="Why it isn't trading" action={<Link to="/bot?tab=strategies" className="inline-flex min-h-[44px] items-center text-sm text-helix-400">Strategies</Link>}>
        <ul className="space-y-2">
          {reasons.map((r) => (
            <li key={r.text} className="flex gap-3 text-sm">
              <span className="w-12 shrink-0 font-mono text-slate-400 tabular-nums">{r.count}×</span>
              <span className="text-slate-200">{r.text}</span>
            </li>
          ))}
        </ul>
        <Note>Counts are strategy tests that failed for that reason (one test can fail for several).</Note>
      </Panel>

      <Panel title="Protections">
        <dl className="divide-y divide-ink-600">
          <Row k="Real-money trading" v="Locked (no order code)" vClass="text-paper" />
          <Row k="Max size per position (bot)" v={`${DEFAULT_RISK.maxPositionFraction * 100}%`} />
          <Row k="Daily / weekly loss stop" v={`${DEFAULT_RISK.maxDailyLossFraction * 100}% / ${DEFAULT_RISK.maxWeeklyLossFraction * 100}%`} />
          <Row k="Drawdown kill switch" v={`${DEFAULT_RISK.maxDrawdownKill * 100}%`} />
          <Row k="Leverage · borrowing" v="None" />
        </dl>
        {account && (
          <div className="space-y-2 rounded-xl bg-ink-900 p-3">
            <p className="text-sm text-white">Your paper account: {account.halted ? 'trading paused' : 'trading allowed'}</p>
            <Button kind={account.halted ? 'primary' : 'danger'} className="w-full" onClick={() => pause(!account.halted)}>
              {account.halted ? 'Resume paper trading' : 'Pause all paper trading'}
            </Button>
          </div>
        )}
      </Panel>

      <Panel title="Market mood · daily">
        <div className="flex flex-wrap gap-2">
          {regimes.map(({ base, regime }) => (
            <span key={base} className={`rounded-full px-3 py-1.5 text-xs ${regime.trend === 'down' ? 'bg-down/15 text-[#F7A3A3]' : regime.trend === 'up' ? 'bg-up/15 text-[#7EE0B8]' : 'bg-ink-700 text-slate-300'}`}>
              {base} {regime.trend === 'up' ? '▲ uptrend' : regime.trend === 'down' ? '▼ downtrend' : 'range'}
            </span>
          ))}
        </div>
        <Note>From the last research run. The strategies only buy (no short selling), so downtrends mean fewer entries.</Note>
      </Panel>

      <Link to="/bot/research" className="flex min-h-[52px] items-center justify-between rounded-2xl border border-ink-600 bg-ink-800 px-4 text-sm text-white">
        <span>Research Lab <span className="text-slate-400">· advanced: every test, dataset and run</span></span>
        <span aria-hidden="true" className="text-slate-400">›</span>
      </Link>
    </div>
  );
}

function Strategies() {
  const ev = strategyEvidence(S);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <Note>Each strategy was tested on 10 coins (daily and hourly data) with 0.60% fees plus spread, on data split into training, validation and a final unseen test. None qualified for paper trading.</Note>
      {ev.map((e) => {
        const p = e.pooledDaily;
        const isOpen = open === e.info.family;
        return (
          <section key={e.info.family} className="rounded-2xl border border-ink-600 bg-ink-800">
            <button type="button" onClick={() => setOpen(isOpen ? null : e.info.family)} aria-expanded={isOpen} className="flex w-full items-start gap-3 p-4 text-left">
              <span className="min-w-0 flex-1 space-y-1">
                <span className="block text-sm font-semibold text-white">{e.info.name}</span>
                <span className="block text-xs text-slate-400">{e.info.objective}</span>
                <span className="block text-xs text-slate-500">{e.info.style} · risk {e.info.risk} · {e.tested} tests · {e.reachedTest} reached the final test</span>
              </span>
              <span className="shrink-0 rounded-full bg-down/15 px-2 py-0.5 text-xs text-[#F7A3A3]">{e.qualified ? 'Approved' : 'Rejected'}</span>
            </button>
            {isOpen && (
              <div className="space-y-3 border-t border-ink-600 p-4">
                {p && (
                  <dl className="divide-y divide-ink-600">
                    <Row k="Training (all 10 coins, daily)" v={pct(p.trainNet)} vClass={tone(p.trainNet)} />
                    <Row k={`Validation · ${p.valTrades} trades`} v={pct(p.valNet)} vClass={tone(p.valNet)} />
                    <Row k={`Unseen test${p.testTrades !== undefined ? ` · ${p.testTrades} trades` : ''}`} v={p.testNet === undefined ? 'Not reached' : pct(p.testNet)} vClass={tone(p.testNet)} />
                    <Row k="Paper trading results" v="Not started" vClass="text-slate-400" />
                    <Row k="Costs assumed" v="0.60% fee + 0.05% per trade" vClass="text-slate-200" />
                  </dl>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400">Why it was rejected</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {e.reasons.map((r) => (
                      <li key={r.text} className="flex gap-3"><span className="w-10 shrink-0 font-mono text-slate-400">{r.count}×</span><span className="text-slate-200">{r.text}</span></li>
                    ))}
                  </ul>
                </div>
                <Link to="/bot/research?tab=strategies" className="inline-flex min-h-[44px] items-center text-sm text-helix-400">See every test in the Research Lab</Link>
              </div>
            )}
          </section>
        );
      })}
      <Note>A strategy is never moved to live trading automatically. Real money stays locked until you explicitly authorise it after forward paper results.</Note>
    </div>
  );
}

function Activity() {
  const runs = S.runs;
  return (
    <div className="space-y-4">
      <Panel title="Bot trades">
        <p className="text-sm text-slate-300">No bot trades yet. The bot only trades strategies that pass every test, and none has.</p>
      </Panel>
      <Panel title="Research runs">
        <ul className="space-y-2 text-sm">
          {runs.map((r) => (
            <li key={r.runId} className="flex justify-between gap-3">
              <span className="text-slate-200">{r.markets[0]?.intervalMs === 86_400_000 ? 'Daily' : 'Hourly'} data · {r.totals.markets} coins</span>
              <span className="font-mono text-slate-400">{r.totals.oosCandidates} tested · {r.totals.qualified} passed</span>
            </li>
          ))}
        </ul>
        <Note>Last run {fmtAge(new Date(S.generatedAt).getTime())}.</Note>
      </Panel>
      <Panel title="Risk-control interventions">
        <p className="text-sm text-slate-300">None. No limit was hit because no trades were placed.</p>
      </Panel>
      <Panel title={`Tracking accounts (${S.paper.length})`}>
        <p className="text-sm text-slate-300">Each follows one rejected strategy forward with $1,000 of simulated money, to check that rejecting it was right.</p>
        <Note>{S.paper.reduce((s, a) => s + a.entries, 0)} entries so far · they act once each daily bar closes.</Note>
      </Panel>
    </div>
  );
}

export default function BotPage() {
  const [params, setParams] = useSearchParams();
  const tab = (['overview', 'strategies', 'activity'].includes(params.get('tab') ?? '') ? params.get('tab') : 'overview') as Tab;
  return (
    <div className="mx-auto max-w-xl space-y-4 fade-in">
      <h1 className="text-xl font-semibold text-white">Trading Bot</h1>
      <Segmented
        label="Bot sections"
        value={tab}
        onChange={(v) => setParams({ tab: v }, { replace: true })}
        options={[{ value: 'overview', label: 'Overview' }, { value: 'strategies', label: 'Strategies' }, { value: 'activity', label: 'Activity' }]}
      />
      {tab === 'overview' && <Overview />}
      {tab === 'strategies' && <Strategies />}
      {tab === 'activity' && <Activity />}
    </div>
  );
}
