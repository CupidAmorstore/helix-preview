import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FEED_NOT_PUBLISHED, bot, useBotData } from '../bot/botData';
import { STRATEGIES, botHeadline, dailyRegimes, localizeLabel, plainAccountLabel, plainReasons, plural, researchAgeHours, researchRunAt, stratName, stratObjective, stratRisk, stratStyle, strategyEvidence } from '../bot/insights';
import { useT } from '../i18n';
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
  const t = useT();

  return (
    <div className="space-y-8">
      <section className="space-y-4" aria-labelledby="bot-state">
        <div className="space-y-2">
          <p className="eyebrow flex items-center gap-2 text-paper"><span className="h-1.5 w-1.5 rounded-full bg-paper" aria-hidden="true" />{t('Holding cash', 'En liquidités')}</p>
          <h2 id="bot-state" className="text-[22px] font-semibold leading-tight tracking-tight text-white">
            {head.qualified === 0 ? t('No strategy has earned the right to trade yet.', 'Aucune stratégie n’a encore mérité le droit de négocier.') : t(`${head.qualified} strategies approved for paper trading.`, `${head.qualified} stratégies approuvées pour la négociation fictive.`)}
          </h2>
          <p className="text-[15px] leading-relaxed text-slate-400">
            {t('Every idea is tested on data it has never seen, with realistic trading costs (0.60% fee plus spread).', 'Chaque idée est testée sur des données jamais vues, avec des coûts réalistes (frais de 0,60 % plus l’écart).')} {head.qualified === 0 ? t('None passed every test, so the bot places no trades.', 'Aucune n’a réussi tous les tests; le robot ne passe donc aucune transaction.') : ''}
          </p>
        </div>
        {/* research funnel: the one number set that explains the bot */}
        <dl className="grid grid-cols-3 border-t border-ink-600">
          {[
            [t('Strategy tests', 'Tests de stratégies'), head.tested, 'text-white'],
            [t('Reached final test', 'Test final atteint'), head.reachedTest, 'text-white'],
            [t('Approved', 'Approuvées'), head.qualified, head.qualified ? 'text-up' : 'text-paper']
          ].map(([k, v, c]) => (
            <div key={k as string} className="py-3 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-ink-600 [&:not(:first-child)]:pl-3">
              <dd className={`font-mono text-[28px] font-semibold leading-none ${c}`}>{v as number}</dd>
              <dt className="mt-1.5 text-xs text-slate-500">{k as string}</dt>
            </div>
          ))}
        </dl>
        <Note>
          {t(
            `${plural(head.tested, 'test')} = ${STRATEGIES.length} strategy types, each tried on up to 10 coins (daily and/or hourly data) and on all 10 together. ${head.reachedTest} passed the earlier checks and reached the final unseen data; ${head.qualified} passed everything. What would change this: a strategy must pass every test and then make money on new data for at least ${fwd?.minMonths ?? 12} months of forward paper trading`,
            `${plural(head.tested, 'test', 'tests', 'test', 'tests')} = ${STRATEGIES.length} types de stratégies, chacun essayé sur jusqu’à 10 cryptomonnaies (données quotidiennes ou horaires) et sur les 10 ensemble. ${head.reachedTest} ont franchi les premières étapes et atteint les données finales jamais vues; ${head.qualified} ont tout réussi. Ce qui changerait la situation : une stratégie doit réussir tous les tests, puis gagner de l’argent sur de nouvelles données pendant au moins ${fwd?.minMonths ?? 12} mois de négociation fictive prospective`
          )}
          {fwd?.status === 'active' ? t(` — ${plural(fwd.rules.length, 'rule')} are being tracked since ${new Date(fwd.startAt ?? 0).toISOString().slice(0, 10)} (see Activity)`, ` — ${plural(fwd.rules.length, 'rule', 'rules', 'règle', 'règles')} suivies depuis le ${new Date(fwd.startAt ?? 0).toISOString().slice(0, 10)} (voir Activité)`) : ''}.
        </Note>
      </section>

      <Panel title={t('Research data', 'Données de recherche')}>
        <dl className="divide-y divide-ink-600">
          <Row k={t('Last research run (strategies tested)', 'Dernière recherche (stratégies testées)')} v={utc(researchRunAt(bot()))} />
          <Row k={t('Research age', 'Âge de la recherche')} v={ageH < 48 ? `${Math.floor(ageH)} h` : `${Math.floor(ageH / 24)} ${t('days', 'jours')}`} vClass={ageH > 24 * 7 ? 'text-amber-400' : 'text-white'} />
          <Row k={t('Prices & forward accounts refreshed', 'Prix et comptes prospectifs actualisés')} v={utc(new Date(bot().generatedAt).getTime())} vClass="text-slate-200" />
          <Row k={t('How it updates', 'Mise à jour')} v={t("Automatically once a day on GitHub's servers, not on this phone · scheduled 04:41 UTC, GitHub may start it hours late", 'Automatiquement une fois par jour sur les serveurs de GitHub, pas sur ce téléphone · prévue à 04 h 41 UTC, GitHub peut la lancer avec des heures de retard')} vClass="text-slate-200" />
          <Row
            k={t('Data on this phone', 'Données sur ce téléphone')}
            v={data.source === 'published' ? t('Daily feed', 'Flux quotidien') : data.source === 'cached' ? t('Saved copy of daily feed', 'Copie enregistrée du flux quotidien') : t('Built into the app', 'Intégrées à l’application')}
            vClass="text-slate-200"
          />
          <Row k={t('Data sources', 'Sources de données')} v={t('Coinbase · Kraken · Gemini (public)', 'Coinbase · Kraken · Gemini (publiques)')} vClass="text-slate-200" />
          <Row k={t('Mode', 'Mode')} v={LIVE_TRADING_ENABLED ? t('LIVE', 'RÉEL') : t('Paper only · real money locked', 'Fictif seulement · argent réel verrouillé')} vClass="text-paper" />
        </dl>
        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-400" aria-live="polite">
            {data.loading
              ? t('Checking for new research…', 'Recherche de nouveaux résultats…')
              : data.error === FEED_NOT_PUBLISHED
                ? t('No online research feed is published yet. Showing the copy built into this app.', 'Aucun flux de recherche n’est encore publié en ligne. Affichage de la copie intégrée à l’application.')
                : data.error
                ? t('Could not reach the research feed. Showing the latest copy on this phone.', 'Flux de recherche inaccessible. Affichage de la dernière copie sur ce téléphone.')
                : data.checkedAt
                  ? `${t('Up to date · checked', 'À jour · vérifié')} ${fmtAge(data.checkedAt)}`
                  : t('Not checked yet', 'Pas encore vérifié')}
          </p>
          <button type="button" onClick={() => void data.refresh()} disabled={data.loading} className="min-h-[44px] shrink-0 rounded-full border border-ink-500 px-4 text-sm font-medium text-white disabled:opacity-50">
            {t('Check now', 'Vérifier')}
          </button>
        </div>
      </Panel>

      <Panel title={t('Bot capital & results', 'Capital et résultats du robot')}>
        <dl className="divide-y divide-ink-600">
          <Row k={t('Paper capital allocated', 'Capital fictif alloué')} v="$0.00" />
          <Row k={t('Open positions', 'Positions ouvertes')} v="0" />
          <Row k={t('Realized / unrealized P&L', 'Gains/pertes réalisés / latents')} v="$0.00 / $0.00" />
          <Row k={t('Fees paid', 'Frais payés')} v="$0.00" />
          <Row k={t('Drawdown', 'Baisse maximale')} v="0%" />
        </dl>
        <Note>
          {t(
            `These are zero because the bot has not traded, not because it broke even. ${diag.length} tracking accounts follow rejected strategies forward to check the decisions; they have processed ${plural(forwardBars, 'closed daily bar')} so far. An equity curve will appear once there is forward data.`,
            `Ces valeurs sont nulles parce que le robot n’a pas négocié, pas parce qu’il est à l’équilibre. ${diag.length} comptes de suivi appliquent des stratégies rejetées sur de nouvelles données pour vérifier ces décisions; ils ont traité ${plural(forwardBars, '', '', 'barre quotidienne clôturée', 'barres quotidiennes clôturées')} jusqu’ici. Une courbe de valeur apparaîtra lorsqu’il y aura des données prospectives.`
          )}
        </Note>
      </Panel>

      <Panel title={t("Why it isn't trading", 'Pourquoi il ne négocie pas')} action={<Link to="/bot?tab=strategies" className="inline-flex min-h-[44px] items-center text-sm text-helix-400">{t('Strategies', 'Stratégies')}</Link>}>
        <ul className="space-y-2">
          {reasons.map((r) => (
            <li key={r.text} className="flex gap-3 text-sm">
              <span className="w-12 shrink-0 font-mono text-slate-400 tabular-nums">{r.count}×</span>
              <span className="text-slate-200">{r.text}</span>
            </li>
          ))}
        </ul>
        <Note>{t('Counts are strategy tests that failed for that reason (one test can fail for several).', 'Nombre de tests ayant échoué pour cette raison (un test peut échouer pour plusieurs).')}</Note>
      </Panel>

      <Panel title={t('Protections', 'Protections')}>
        <dl className="divide-y divide-ink-600">
          <Row k={t('Real-money trading', 'Négociation en argent réel')} v={t('Locked (no order code)', 'Verrouillée (aucun code d’ordre)')} vClass="text-paper" />
          <Row k={t('Max size per position (bot)', 'Taille max. par position (robot)')} v={`${DEFAULT_RISK.maxPositionFraction * 100}%`} />
          <Row k={t('Daily / weekly loss stop', 'Arrêt sur perte quotidienne / hebdo.')} v={`${DEFAULT_RISK.maxDailyLossFraction * 100}% / ${DEFAULT_RISK.maxWeeklyLossFraction * 100}%`} />
          <Row k={t('Drawdown kill switch', 'Arrêt d’urgence sur baisse')} v={`${DEFAULT_RISK.maxDrawdownKill * 100}%`} />
          <Row k={t('Leverage · borrowing', 'Levier · emprunt')} v={t('None', 'Aucun')} />
        </dl>
        {account && (
          <div className="space-y-2 pt-2">
            <p className="text-sm text-white">{t('Your paper account:', 'Votre compte fictif :')} {account.halted ? t('trading paused', 'négociation en pause') : t('trading allowed', 'négociation permise')}</p>
            <Button kind={account.halted ? 'primary' : 'danger'} className="w-full" onClick={() => pause(!account.halted)}>
              {account.halted ? t('Resume paper trading', 'Reprendre la négociation fictive') : t('Pause all paper trading', 'Suspendre toute la négociation fictive')}
            </Button>
          </div>
        )}
      </Panel>

      <Panel title={t('Market mood · daily', 'Humeur du marché · quotidien')}>
        <ul className="grid grid-cols-2 gap-x-6">
          {regimes.map(({ base, regime }) => (
            <li key={base} className="flex min-h-[36px] items-center justify-between border-b border-ink-600 text-sm">
              <span className="font-semibold text-white">{base}</span>
              <span className={regime.trend === 'down' ? 'text-down' : regime.trend === 'up' ? 'text-up' : 'text-slate-400'}>
                {regime.trend === 'up' ? t('▲ Up', '▲ Hausse') : regime.trend === 'down' ? t('▼ Down', '▼ Baisse') : t('— Sideways', '— Latéral')}
              </span>
            </li>
          ))}
        </ul>
        <Note>{t('From the last research run. The strategies only buy (no short selling), so downtrends mean fewer entries.', 'Selon la dernière recherche. Les stratégies ne font qu’acheter (pas de vente à découvert); une tendance baissière signifie donc moins d’entrées.')}</Note>
      </Panel>

      <Link to="/bot/research" className="flex min-h-[52px] items-center justify-between border-y border-ink-600 text-sm text-white">
        <span>{t('Research Lab', 'Labo de recherche')} <span className="text-slate-400">{t('· advanced: every test, dataset and run', '· avancé : chaque test, jeu de données et exécution')}</span></span>
        <span aria-hidden="true" className="text-slate-400">›</span>
      </Link>
    </div>
  );
}

function Strategies() {
  const ev = strategyEvidence(bot());
  const [open, setOpen] = useState<string | null>(null);
  const t = useT();
  return (
    <div className="space-y-4">
      <Note>{t('Each strategy type was tested on up to 10 coins, on daily and/or hourly data (some types use daily data only), with a 0.60% fee plus spread, on data split into training, validation and a final unseen test. None qualified for paper trading.', 'Chaque type de stratégie a été testé sur jusqu’à 10 cryptomonnaies, sur données quotidiennes ou horaires (certains types n’utilisent que des données quotidiennes), avec des frais de 0,60 % plus l’écart, sur des données divisées en entraînement, validation et test final jamais vu. Aucune ne s’est qualifiée pour la négociation fictive.')}</Note>
      {ev.map((e) => {
        const p = e.pooledDaily;
        const isOpen = open === e.info.family;
        return (
          <section key={e.info.family} className="border-t border-ink-600 last-of-type:border-b">
            <button type="button" onClick={() => setOpen(isOpen ? null : e.info.family)} aria-expanded={isOpen} className="flex w-full items-start gap-3 py-4 text-left">
              <span className="min-w-0 flex-1 space-y-1">
                <span className="block text-sm font-semibold text-white">{stratName(e.info)}</span>
                <span className="block text-xs text-slate-400">{stratObjective(e.info)}</span>
                <span className="block text-xs text-slate-500">{stratStyle(e.info)} · {stratRisk(e.info)} · {plural(e.tested, 'test', 'tests', 'test', 'tests')} · {e.reachedTest} {t('reached the final test', 'au test final')}</span>
              </span>
              <span className={`shrink-0 text-xs font-semibold ${e.qualified ? 'text-up' : e.tested ? 'text-down' : 'text-slate-400'}`}>
                {e.qualified ? t('Approved', 'Approuvée') : e.tested ? t('Rejected', 'Rejetée') : t('Not tested', 'Non testée')} <span aria-hidden="true" className="text-slate-500">{isOpen ? '−' : '+'}</span>
              </span>
            </button>
            {isOpen && (
              <div className="space-y-3 pb-4">
                {p && (
                  <dl className="divide-y divide-ink-600">
                    <Row k={t('Training (all 10 coins, daily)', 'Entraînement (10 cryptomonnaies, quotidien)')} v={pct(p.trainNet)} vClass={tone(p.trainNet)} />
                    <Row k={`${t('Validation', 'Validation')} · ${plural(p.valTrades, 'trade', 'trades', 'transaction', 'transactions')}`} v={pct(p.valNet)} vClass={tone(p.valNet)} />
                    <Row k={`${t('Unseen test', 'Test jamais vu')}${p.testTrades !== undefined ? ` · ${plural(p.testTrades, 'trade', 'trades', 'transaction', 'transactions')}` : ''}`} v={p.testNet === undefined ? t('Not reached', 'Non atteint') : pct(p.testNet)} vClass={tone(p.testNet)} />
                    <Row k={t('Paper trading results', 'Résultats en négociation fictive')} v={t('Not started', 'Pas commencé')} vClass="text-slate-400" />
                    <Row k={t('Costs assumed', 'Coûts supposés')} v={t('0.60% fee + 0.05% per trade', 'frais de 0,60 % + 0,05 % par transaction')} vClass="text-slate-200" />
                  </dl>
                )}
                <div>
                  <p className="eyebrow text-slate-500">{t('Why it was rejected', 'Raisons du rejet')}</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {e.reasons.map((r) => (
                      <li key={r.text} className="flex gap-3"><span className="w-10 shrink-0 font-mono text-slate-400">{r.count}×</span><span className="text-slate-200">{r.text}</span></li>
                    ))}
                  </ul>
                </div>
                <Link to="/bot/research?tab=strategies" className="inline-flex min-h-[44px] items-center text-sm text-helix-400">{t('See every test in the Research Lab', 'Voir chaque test dans le Labo de recherche')}</Link>
              </div>
            )}
          </section>
        );
      })}
      <Note>{t('A strategy is never moved to live trading automatically. Real money stays locked until you explicitly authorise it after forward paper results.', 'Une stratégie n’est jamais passée automatiquement en négociation réelle. L’argent réel reste verrouillé jusqu’à ce que vous l’autorisiez explicitement après des résultats fictifs prospectifs.')}</Note>
    </div>
  );
}

function Activity() {
  const runs = bot().runs;
  const t = useT();
  return (
    <div className="space-y-8">
      <Panel title={t('Bot trades', 'Transactions du robot')}>
        <p className="text-sm text-slate-300">{t('No bot trades yet. The bot only trades strategies that pass every test, and none has.', 'Aucune transaction du robot pour l’instant. Le robot ne négocie que des stratégies qui réussissent tous les tests, et aucune n’y est parvenue.')}</p>
      </Panel>
      <Panel title={t('Research runs', 'Exécutions de recherche')}>
        <ul className="space-y-2 text-sm">
          {runs.map((r) => (
            <li key={r.runId} className="flex justify-between gap-3">
              <span className="text-slate-200">{r.markets[0]?.intervalMs === 86_400_000 ? t('Daily data', 'Données quotidiennes') : t('Hourly data', 'Données horaires')} · {plural(r.totals.markets, 'coin', 'coins', 'cryptomonnaie', 'cryptomonnaies')}</span>
              <span className="font-mono text-slate-400">{r.totals.oosCandidates} {t('tested', 'testées')} · {r.totals.qualified} {t('passed', 'réussies')}</span>
            </li>
          ))}
        </ul>
        <Note>{t('Last research run', 'Dernière recherche')} {fmtAge(researchRunAt(bot()))}.</Note>
      </Panel>
      <Panel title={t('Risk-control interventions', 'Interventions du contrôle des risques')}>
        <p className="text-sm text-slate-300">{t('None. No limit was hit because no trades were placed.', 'Aucune. Aucune limite n’a été atteinte, car aucune transaction n’a été passée.')}</p>
      </Panel>
      {bot().forward && (
        <Panel title={t('Forward paper trading (pre-registered)', 'Négociation fictive prospective (préenregistrée)')}>
          <p className="text-sm text-slate-300">
            {bot().forward!.status === 'active'
              ? t(`Started ${new Date(bot().forward!.startAt ?? 0).toISOString().slice(0, 10)}. These rules were fixed before the start date and trade simulated money on new data only. A verdict needs at least ${bot().forward!.minMonths} months.`, `Commencée le ${new Date(bot().forward!.startAt ?? 0).toISOString().slice(0, 10)}. Ces règles ont été fixées avant la date de début et négocient de l’argent simulé sur de nouvelles données seulement. Un verdict exige au moins ${bot().forward!.minMonths} mois.`)
              : t('Proposed, not started.', 'Proposée, pas commencée.')}
          </p>
          <ul className="divide-y divide-ink-600">
            {bot().forward!.rules.map((r) => (
              <li key={r.id} className="flex min-h-[52px] items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block text-slate-200">{localizeLabel(r.label)}</span>
                  <span className="block text-xs text-slate-500">{plural(r.forwardMonths, 'month', 'months', 'mois', 'mois')} {t('of', 'sur')} {bot().forward!.minMonths} · {r.status === 'forward_qualified' ? t('passed', 'réussie') : r.status === 'rejected' ? t('failed', 'échouée') : t('collecting evidence', 'collecte de preuves')}</span>
                </span>
                <span className={`shrink-0 font-mono ${r.netReturn > 0 ? 'text-up' : r.netReturn < 0 ? 'text-down' : 'text-slate-400'}`}>
                  {r.netReturn === 0 ? '0.00%' : `${r.netReturn > 0 ? '+' : '−'}${Math.abs(r.netReturn * 100).toFixed(2)}%`}
                </span>
              </li>
            ))}
          </ul>
          <Note>{t('Results after modelled fees. Not real trades and not a prediction.', 'Résultats après frais modélisés. Ni de vraies transactions ni une prévision.')}</Note>
        </Panel>
      )}
      <Panel title={`${t('Forward checks of rejected strategies', 'Suivi prospectif des stratégies rejetées')} (${bot().paper.length})`}>
        <p className="text-sm text-slate-300">{t('Each follows one rejected strategy forward with $1,000 of simulated money, to check that rejecting it was right. They act once each daily bar closes.', 'Chacun applique une stratégie rejetée sur de nouvelles données avec 1 000 $ d’argent simulé, pour vérifier que le rejet était justifié. Ils agissent à la clôture de chaque barre quotidienne.')}</p>
        <ul className="divide-y divide-ink-600">
          {bot().paper.map((a) => (
            <li key={a.id} className="flex min-h-[52px] items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="block text-slate-200">{plainAccountLabel(a.id).title}</span>
                <span className="block text-xs text-slate-500">
                  {plainAccountLabel(a.id).params} · {plural(a.barsProcessed, 'bar', 'bars', 'barre', 'barres')} · {plural(a.trades, 'trade', 'trades', 'transaction', 'transactions')} · {a.openPosition ? t('in a position', 'en position') : t('in cash', 'en liquidités')}{a.killSwitch ? t(' · stopped by kill switch', ' · arrêté par l’arrêt d’urgence') : ''}
                </span>
              </span>
              <span className={`shrink-0 font-mono ${a.netReturnPct > 0 ? 'text-up' : a.netReturnPct < 0 ? 'text-down' : 'text-slate-400'}`}>
                {a.netReturnPct === 0 ? '0.00%' : `${a.netReturnPct > 0 ? '+' : '−'}${Math.abs(a.netReturnPct).toFixed(2)}%`}
              </span>
            </li>
          ))}
        </ul>
        <Note>{t('Forward results after fees. Not real trades.', 'Résultats prospectifs après frais. Pas de vraies transactions.')}</Note>
      </Panel>
    </div>
  );
}

export default function BotPage() {
  useBotData();
  const [params, setParams] = useSearchParams();
  const t = useT();
  const tab = (['overview', 'strategies', 'activity'].includes(params.get('tab') ?? '') ? params.get('tab') : 'overview') as Tab;
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-[26px] font-semibold tracking-tight text-white">{t('Trading Bot', 'Robot de négociation')}</h1>
      <Segmented
        label={t('Bot sections', 'Sections du robot')}
        value={tab}
        onChange={(v) => setParams({ tab: v }, { replace: true })}
        options={[{ value: 'overview', label: t('Overview', 'Aperçu') }, { value: 'strategies', label: t('Strategies', 'Stratégies') }, { value: 'activity', label: t('Activity', 'Activité') }]}
      />
      {tab === 'overview' && <Overview />}
      {tab === 'strategies' && <Strategies />}
      {tab === 'activity' && <Activity />}
    </div>
  );
}
