import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FEED_NOT_PUBLISHED, bot, useBotData } from '../bot/botData';
import { STRATEGIES, botHeadline, dailyRegimes, plainAccountLabel, plainReasons, plural, researchAgeHours, researchRunAt, strategyEvidence } from '../bot/insights';
import { DEFAULT_RISK, LIVE_TRADING_ENABLED } from '../bot/risk';
import { usePaper } from '../paper/PaperProvider';
import { Button, Note, Panel, Segmented } from '../components/ui';
import { fmtAge } from '../services/marketData';

type Tab = 'overview' | 'strategies' | 'activity';
const pct = (x: number | undefined) => (x === undefined || !Number.isFinite(x) ? '—' : `${x >= 0 ? '▲ +' : '▼ −'}${Math.abs(x * 100).toFixed(1)}%`);
const tone = (x: number | undefined) => (x === undefined ? 'text-slate-400' : x >= 0 ? 'text-up' : 'text-down');

function Row({ k, v, vClass = 'text-white' }: { k: string; v: React.ReactNode; vClass?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <dt className="text-slate-400">{k}</dt>
      <dd className={`text-right font-mono ${vClass}`}>{v}</dd>
    </div>
  );
}

function Overview() {
  const head = botHeadline(bot());
  const reasons = plainReasons(bot(), 3);
  const regimes = dailyRegimes(bot());
  const ageH = researchAgeHours(bot());
  const utc = (ms: number) => `${new Date(ms).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
  const fwd = bot().forward;
  const diag = bot().paper;
  const forwardBars = diag.reduce((s, a) => s + a.barsProcessed, 0);
  const { account, pause } = usePaper();
  const data = useBotData();

  return (
    <div className="space-y-8">
      <section className="space-y-4" aria-labelledby="bot-state">
        <div className="space-y-2">
          <p className="eyebrow flex items-center gap-2 text-paper"><span className="h-1.5 w-1.5 rounded-full bg-paper" aria-hidden="true" />Holding cash</p>
          <h2 id="bot-state" className="text-[22px] font-semibold leading-tight tracking-tight text-white">
            {head.qualified === 0 ? 'No strategy has earned the right to trade yet.' : `${head.qualified} strategies approved for paper trading.`}
          </h2>
          <p className="text-[15px] leading-relaxed text-slate-400">
            Every idea is tested on data it has never seen, with realistic trading costs (0.60% fee plus spread). {head.qualified === 0 ? 'None passed every test, so the bot places no trades.' : ''}
          </p>
        </div>
        {/* research funnel: the one number set that explains the bot */}
        <dl className="grid grid-cols-3 border-t border-ink-600">
          {[
            ['Strategy tests', head.tested, 'text-white'],
            ['Reached final test', head.reachedTest, 'text-white'],
            ['Approved', head.qualified, head.qualified ? 'text-up' : 'text-paper']
          ].map(([k, v, c]) => (
            <div key={k as string} className="py-3 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-ink-600 [&:not(:first-child)]:pl-3">
              <dd className={`font-mono text-[28px] font-semibold leading-none ${c}`}>{v as number}</dd>
              <dt className="mt-1.5 text-xs text-slate-500">{k as string}</dt>
            </div>
          ))}
        </dl>
        <Note>
          {plural(head.tested, 'test')} = {STRATEGIES.length} strategy types, each tried on up to 10 coins (daily and/or hourly data) and on all 10 together. {head.reachedTest} passed
          the earlier checks and reached the final unseen data; {head.qualified} passed everything. What would change this: a strategy must pass every test and then make
          money on new data for at least {fwd?.minMonths ?? 12} months of forward paper trading{fwd?.status === 'active' ? ` — ${plural(fwd.rules.length, 'rule')} are being tracked since ${new Date(fwd.startAt ?? 0).toISOString().slice(0, 10)} (see Activity)` : ''}.
        </Note>
      </section>

      <Panel title="Research data">
        <dl className="divide-y divide-ink-600">
          <Row k="Last research run (strategies tested)" v={utc(researchRunAt(bot()))} />
          <Row k="Research age" v={ageH < 48 ? `${Math.floor(ageH)} h` : `${Math.floor(ageH / 24)} days`} vClass={ageH > 24 * 7 ? 'text-amber-400' : 'text-white'} />
          <Row k="Prices & forward accounts refreshed" v={utc(new Date(bot().generatedAt).getTime())} vClass="text-slate-200" />
          <Row k="How it updates" v="Run by the developer on a computer, not on this phone · no automatic schedule yet" vClass="text-slate-200" />
          <Row
            k="Data on this phone"
            v={data.source === 'published' ? 'Daily feed' : data.source === 'cached' ? 'Saved copy of daily feed' : 'Built into the app'}
            vClass="text-slate-200"
          />
          <Row k="Data sources" v="Coinbase · Kraken · Gemini (public)" vClass="text-slate-200" />
          <Row k="Mode" v={LIVE_TRADING_ENABLED ? 'LIVE' : 'Paper only · real money locked'} vClass="text-paper" />
        </dl>
        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-400" aria-live="polite">
            {data.loading
              ? 'Checking for new research…'
              : data.error === FEED_NOT_PUBLISHED
                ? 'No online research feed is published yet. Showing the copy built into this app.'
                : data.error
                ? 'Could not reach the research feed. Showing the latest copy on this phone.'
                : data.checkedAt
                  ? `Up to date · checked ${fmtAge(data.checkedAt)}`
                  : 'Not checked yet'}
          </p>
          <button type="button" onClick={() => void data.refresh()} disabled={data.loading} className="min-h-[44px] shrink-0 rounded-full border border-ink-500 px-4 text-sm font-medium text-white disabled:opacity-50">
            Check now
          </button>
        </div>
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
          decisions; they have processed {plural(forwardBars, 'closed daily bar')} so far. An equity curve will appear once there is forward data.
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
          <div className="space-y-2 pt-2">
            <p className="text-sm text-white">Your paper account: {account.halted ? 'trading paused' : 'trading allowed'}</p>
            <Button kind={account.halted ? 'primary' : 'danger'} className="w-full" onClick={() => pause(!account.halted)}>
              {account.halted ? 'Resume paper trading' : 'Pause all paper trading'}
            </Button>
          </div>
        )}
      </Panel>

      <Panel title="Market mood · daily">
        <ul className="grid grid-cols-2 gap-x-6">
          {regimes.map(({ base, regime }) => (
            <li key={base} className="flex min-h-[36px] items-center justify-between border-b border-ink-600 text-sm">
              <span className="font-semibold text-white">{base}</span>
              <span className={regime.trend === 'down' ? 'text-down' : regime.trend === 'up' ? 'text-up' : 'text-slate-400'}>
                {regime.trend === 'up' ? '▲ Up' : regime.trend === 'down' ? '▼ Down' : '— Sideways'}
              </span>
            </li>
          ))}
        </ul>
        <Note>From the last research run. The strategies only buy (no short selling), so downtrends mean fewer entries.</Note>
      </Panel>

      <Link to="/bot/research" className="flex min-h-[52px] items-center justify-between border-y border-ink-600 text-sm text-white">
        <span>Research Lab <span className="text-slate-400">· advanced: every test, dataset and run</span></span>
        <span aria-hidden="true" className="text-slate-400">›</span>
      </Link>
    </div>
  );
}

function Strategies() {
  const ev = strategyEvidence(bot());
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <Note>Each strategy type was tested on up to 10 coins, on daily and/or hourly data (some types use daily data only), with a 0.60% fee plus spread, on data split into training, validation and a final unseen test. None qualified for paper trading.</Note>
      {ev.map((e) => {
        const p = e.pooledDaily;
        const isOpen = open === e.info.family;
        return (
          <section key={e.info.family} className="border-t border-ink-600 last-of-type:border-b">
            <button type="button" onClick={() => setOpen(isOpen ? null : e.info.family)} aria-expanded={isOpen} className="flex w-full items-start gap-3 py-4 text-left">
              <span className="min-w-0 flex-1 space-y-1">
                <span className="block text-sm font-semibold text-white">{e.info.name}</span>
                <span className="block text-xs text-slate-400">{e.info.objective}</span>
                <span className="block text-xs text-slate-500">{e.info.style} · {e.info.risk} risk · {plural(e.tested, 'test')} · {e.reachedTest} reached the final test</span>
              </span>
              <span className={`shrink-0 text-xs font-semibold ${e.qualified ? 'text-up' : e.tested ? 'text-down' : 'text-slate-400'}`}>
                {e.qualified ? 'Approved' : e.tested ? 'Rejected' : 'Not tested'} <span aria-hidden="true" className="text-slate-500">{isOpen ? '−' : '+'}</span>
              </span>
            </button>
            {isOpen && (
              <div className="space-y-3 pb-4">
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
                  <p className="eyebrow text-slate-500">Why it was rejected</p>
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
  const runs = bot().runs;
  return (
    <div className="space-y-8">
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
        <Note>Last research run {fmtAge(researchRunAt(bot()))}.</Note>
      </Panel>
      <Panel title="Risk-control interventions">
        <p className="text-sm text-slate-300">None. No limit was hit because no trades were placed.</p>
      </Panel>
      {bot().forward && (
        <Panel title="Forward paper trading (pre-registered)">
          <p className="text-sm text-slate-300">
            {bot().forward!.status === 'active'
              ? `Started ${new Date(bot().forward!.startAt ?? 0).toISOString().slice(0, 10)}. These rules were fixed before the start date and trade simulated money on new data only. A verdict needs at least ${bot().forward!.minMonths} months.`
              : 'Proposed, not started.'}
          </p>
          <ul className="divide-y divide-ink-600">
            {bot().forward!.rules.map((r) => (
              <li key={r.id} className="flex min-h-[52px] items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block text-slate-200">{r.label}</span>
                  <span className="block text-xs text-slate-500">{plural(r.forwardMonths, 'month')} of {bot().forward!.minMonths} · {r.status === 'forward_qualified' ? 'passed' : r.status === 'rejected' ? 'failed' : 'collecting evidence'}</span>
                </span>
                <span className={`shrink-0 font-mono ${r.netReturn > 0 ? 'text-up' : r.netReturn < 0 ? 'text-down' : 'text-slate-400'}`}>
                  {r.netReturn === 0 ? '0.00%' : `${r.netReturn > 0 ? '+' : '−'}${Math.abs(r.netReturn * 100).toFixed(2)}%`}
                </span>
              </li>
            ))}
          </ul>
          <Note>Results after modelled fees. Not real trades and not a prediction.</Note>
        </Panel>
      )}
      <Panel title={`Forward checks of rejected strategies (${bot().paper.length})`}>
        <p className="text-sm text-slate-300">Each follows one rejected strategy forward with $1,000 of simulated money, to check that rejecting it was right. They act once each daily bar closes.</p>
        <ul className="divide-y divide-ink-600">
          {bot().paper.map((a) => (
            <li key={a.id} className="flex min-h-[52px] items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="block text-slate-200">{plainAccountLabel(a.id).title}</span>
                <span className="block text-xs text-slate-500">
                  {plainAccountLabel(a.id).params} · {plural(a.barsProcessed, 'bar')} · {plural(a.trades, 'trade')} · {a.openPosition ? 'in a position' : 'in cash'}{a.killSwitch ? ' · stopped by kill switch' : ''}
                </span>
              </span>
              <span className={`shrink-0 font-mono ${a.netReturnPct > 0 ? 'text-up' : a.netReturnPct < 0 ? 'text-down' : 'text-slate-400'}`}>
                {a.netReturnPct === 0 ? '0.00%' : `${a.netReturnPct > 0 ? '+' : '−'}${Math.abs(a.netReturnPct).toFixed(2)}%`}
              </span>
            </li>
          ))}
        </ul>
        <Note>Forward results after fees. Not real trades.</Note>
      </Panel>
    </div>
  );
}

export default function BotPage() {
  useBotData();
  const [params, setParams] = useSearchParams();
  const tab = (['overview', 'strategies', 'activity'].includes(params.get('tab') ?? '') ? params.get('tab') : 'overview') as Tab;
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-[26px] font-semibold tracking-tight text-white">Trading Bot</h1>
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
