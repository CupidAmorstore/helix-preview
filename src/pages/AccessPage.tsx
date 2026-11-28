import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui';
import { useT } from '../i18n';

/** There is no paid plan and no payment flow; this page says so instead of offering a checkout that cannot work. */
export default function AccessPage() {
  const t = useT();
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title={t('Access', 'Accès')} back />
      <section className="space-y-3 border-t border-ink-600 pt-5">
        <p className="text-[15px] leading-relaxed text-slate-300">
          {t('This HELIX preview is free. There is no subscription, no payment and no account to create. Paper trading, markets and the research results are available to everyone who opens the app.', 'Cet aperçu de HELIX est gratuit. Aucun abonnement, aucun paiement et aucun compte à créer. La négociation fictive, les marchés et les résultats de recherche sont offerts à tous ceux qui ouvrent l’application.')}
        </p>
        <p className="text-sm text-slate-400">
          {t('If paid features are ever offered, they will appear here only once a working, tested payment provider is connected.', 'Si des fonctions payantes sont un jour offertes, elles apparaîtront ici seulement une fois un fournisseur de paiement fonctionnel et testé branché.')}
        </p>
      </section>
      <section className="space-y-2 border-t border-ink-600 pt-5">
        <h2 className="eyebrow text-slate-400">{t('Questions or problems', 'Questions ou problèmes')}</h2>
        <a className="inline-flex min-h-[44px] items-center text-sm text-helix-400 underline underline-offset-4" href="https://github.com/CupidAmorstore/helix-preview/issues" target="_blank" rel="noreferrer">
          {t('Report an issue on GitHub', 'Signaler un problème sur GitHub')}
        </a>
        <p className="text-xs text-slate-500">
          {t('See also', 'Voir aussi')} <Link className="underline" to="/terms">{t('Terms', 'Conditions')}</Link> {t('and', 'et')} <Link className="underline" to="/privacy">{t('Privacy', 'Confidentialité')}</Link>.
        </p>
      </section>
    </div>
  );
}
