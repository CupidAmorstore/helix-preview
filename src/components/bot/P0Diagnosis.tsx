// P0 profitability diagnosis: why the bot is not trading, in plain language, from committed evidence only.
// Every figure comes from src/bot/data/p0.json (built by scripts/p0/build-summary.ts from the study files).
import p0 from '../../bot/data/p0.json';
import { useT } from '../../i18n';
import { Card, Stat } from './ui';

const money = (x: number) => `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export function P0Diagnosis() {
  const t = useT();
  const e = p0.execution;
  const f = p0.failureCauses as Record<string, number>;
  const kraken = p0.costs.verified.find((v) => v.venue === 'kraken');
  const coinbase = p0.costs.verified.find((v) => v.venue === 'coinbase' && v.regions.includes('US'));
  const fwd = p0.forward.a;
  return (
    <Card title={t('Profitability diagnosis (P0 audit, 2026-11-26)', 'Diagnostic de rentabilité (audit P0, 2026-11-26)')}>
      <div className="space-y-4 text-sm">
        <p className="text-slate-300">
          {t('No profitable strategy has been established. The bot holds cash on purpose.', 'Aucune stratégie rentable n’a été établie. Le bot reste en liquidités volontairement.')}
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={t('Before costs', 'Avant frais')} value={money(e.zeroCost.pnl)} sub={t(`${e.zeroCost.profitable}/${e.candidates} profitable`, `${e.zeroCost.profitable}/${e.candidates} rentables`)} />
          <Stat label={t('Same exposure, no timing', 'Même exposition, sans timing')} value={money(e.passiveExposureMatchedPnl)} sub={t('passive holding', 'détention passive')} />
          <Stat label={t('After costs', 'Après frais')} value={money(e.realCost.pnl)} tone="bad" sub={t(`${e.realCost.profitable}/${e.candidates} profitable`, `${e.realCost.profitable}/${e.candidates} rentables`)} />
          <Stat label={t('Beat passive', 'Battent le passif')} value={`${e.beatPassive}/${e.candidates}`} tone="warn" sub={t('timing skill', 'habileté de timing')} />
        </div>
        <ul className="list-disc space-y-1 pl-5 text-slate-400">
          <li>{t('Costs are not the only problem: before costs, the strategies earned no more than simply holding the same amount of the coin. The gains were market exposure, not prediction.', 'Les frais ne sont pas le seul problème : avant frais, les stratégies n’ont pas fait mieux que détenir la même quantité de la crypto. Les gains venaient de l’exposition au marché, pas de la prédiction.')}</li>
          <li>{t(`Why each failed: ${f.no_gross_edge ?? 0} lost even with zero fees · ${f.beta_only ?? 0} only matched passive exposure · ${f.cost_dominated ?? 0} were destroyed by fees · ${f.insufficient_sample ?? 0} had too few trades to judge.`, `Causes : ${f.no_gross_edge ?? 0} perdent même sans frais · ${f.beta_only ?? 0} égalent l’exposition passive · ${f.cost_dominated ?? 0} détruites par les frais · ${f.insufficient_sample ?? 0} trop peu de transactions.`)}</li>
          <li>{t(`Verified fees are higher than earlier assumed: Kraken ${(kraken?.takerBps ?? 0) / 100}% taker (official), Coinbase US ${(coinbase?.takerBps ?? 0) / 100}% taker (secondary sources). Trades held less than about a week cannot cover them on any account size.`, `Les frais vérifiés sont plus élevés que prévu : Kraken ${(kraken?.takerBps ?? 0) / 100} % preneur (officiel), Coinbase É.-U. ${(coinbase?.takerBps ?? 0) / 100} % (sources secondaires). Une position de moins d’environ une semaine ne peut pas les couvrir, quelle que soit la taille du compte.`)}</li>
          <li>{t('Accounts of $20–$50 can hold only one position; Ethereum mainnet gas makes accounts under $1,000 uneconomic.', 'Les comptes de 20 $ à 50 $ ne peuvent détenir qu’une position ; les frais de gaz d’Ethereum rendent les comptes de moins de 1 000 $ non rentables.')}</li>
        </ul>
        {fwd && (
          <div className="rounded-lg border border-ink-600 px-3 py-2 text-xs text-slate-400">
            <div className="font-semibold text-slate-200">{t('Forward paper test (only source of new evidence)', 'Test papier prospectif (seule source de nouvelle preuve)')}</div>
            <div>
              {t(`Started ${fwd.startAt}. Complete months: ${Math.max(...fwd.results.map((r) => r.forwardMonths))} of ${p0.forward.minMonths} required. Data through ${fwd.dataThrough?.slice(0, 10) ?? '—'}. Simulated money only.`, `Démarré le ${fwd.startAt}. Mois complets : ${Math.max(...fwd.results.map((r) => r.forwardMonths))} sur ${p0.forward.minMonths} requis. Données jusqu’au ${fwd.dataThrough?.slice(0, 10) ?? '—'}. Argent fictif seulement.`)}
            </div>
            <div className="mt-1">{t('A result is historical, simulated or forward-observed — only forward-observed months count toward qualification.', 'Un résultat est historique, simulé ou observé en temps réel — seuls les mois observés comptent pour la qualification.')}</div>
          </div>
        )}
        {p0.marketScreen.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{t('Market screen ($1,000 account, weekly horizon)', 'Filtre de marchés (compte de 1 000 $, horizon hebdomadaire)')}</div>
            <ul className="divide-y divide-ink-600 rounded-lg border border-ink-600 text-xs">
              {p0.marketScreen.map((m) => (
                <li key={m.symbol} className="flex items-center justify-between gap-3 px-3 py-1.5">
                  <span className="font-semibold text-slate-200">{m.symbol.replace('-USD', '')}</span>
                  <span className={`min-w-0 flex-1 truncate ${m.status === 'rejected' ? 'text-rose-400' : 'text-slate-400'}`}>
                    {m.status === 'rejected' ? (m.firstBlocking ?? t('rejected', 'rejeté')) : t(`weekly move ${m.weeklyMovePct?.toFixed(1)}% · ${m.regime ?? '—'}`, `variation hebdo ${m.weeklyMovePct?.toFixed(1)} % · ${m.regime ?? '—'}`)}
                  </span>
                  <span className="font-mono text-slate-500">{m.headroom !== null ? `${m.headroom.toFixed(2)}×` : '—'}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-slate-500">{t('Headroom = typical weekly move ÷ stressed break-even. It measures whether costs can be covered, not whether the price will rise — volatile coins score high and were also the year’s biggest losers.', 'Marge = variation hebdomadaire typique ÷ seuil de rentabilité sous stress. Elle mesure si les frais peuvent être couverts, pas si le prix montera — les cryptos volatiles obtiennent un score élevé et ont aussi le plus perdu cette année.')}</p>
          </div>
        )}
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{t('Next required actions', 'Prochaines actions requises')}</div>
          <ol className="list-decimal space-y-1 pl-5 text-slate-400">
            {p0.nextActions.map((a) => <li key={a}>{a}</li>)}
          </ol>
        </div>
      </div>
    </Card>
  );
}
