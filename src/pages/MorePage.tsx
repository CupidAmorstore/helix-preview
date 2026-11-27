import { Link } from 'react-router-dom';
import { legalItems, secondaryNav } from '../components/navigation';
import { setLang, useLang, useT } from '../i18n';

export default function MorePage() {
  const t = useT();
  const lang = useLang();
  return (
    <div className="mx-auto max-w-xl space-y-6 fade-in">
      <h1 className="text-2xl font-semibold text-white">{t('More', 'Plus')}</h1>
      <nav aria-label={t('More', 'Plus')} className="overflow-hidden border-t border-ink-600/60">
        {secondaryNav.map((item) => (
          <Link key={item.path} to={item.path} className="flex min-h-[64px] items-center justify-between gap-3 border-b border-ink-600 px-4 py-3 last:border-b-0">
            <span>
              <span className="block text-sm font-semibold text-white">{lang === 'fr' ? item.fr : item.label}</span>
              <span className="block text-xs text-slate-400">{lang === 'fr' ? item.descFr : item.description}</span>
            </span>
            <span aria-hidden="true" className="text-slate-400">›</span>
          </Link>
        ))}
      </nav>
      <section className="space-y-2">
        <h2 className="text-xs eyebrow text-slate-400">{t('Help & legal', 'Aide et mentions légales')}</h2>
        <nav aria-label={t('Help and legal', 'Aide et mentions légales')} className="overflow-hidden border-t border-ink-600/60">
          {legalItems.map((item) => (
            <Link key={item.path} to={item.path} className="flex min-h-[52px] items-center justify-between border-b border-ink-600 px-4 text-sm text-slate-200 last:border-b-0">
              {lang === 'fr' ? item.fr : item.label}
              <span aria-hidden="true" className="text-slate-400">›</span>
            </Link>
          ))}
        </nav>
      </section>
      <section className="space-y-2">
        <h2 id="lang-label" className="text-xs eyebrow text-slate-400">{t('Language', 'Langue')}</h2>
        <div role="radiogroup" aria-labelledby="lang-label" className="flex gap-2">
          {([['en', 'English'], ['fr', 'Français']] as const).map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={lang === v} onClick={() => setLang(v)}
              className={`min-h-[44px] rounded-full border px-4 text-sm ${lang === v ? 'border-white bg-white font-semibold text-ink-900' : 'border-ink-500 text-slate-300'}`}>
              {l}
            </button>
          ))}
        </div>
        {lang === 'fr' && <p className="text-xs text-slate-500">La traduction française couvre l’accueil, la navigation, les ordres fictifs et les pages d’aide et légales; les autres écrans sont encore en anglais.</p>}
      </section>
      <p className="text-xs text-slate-400">
        {t('HELIX does not hold your funds. The Trading Bot uses simulated money only; real-money trading is disabled.',
          'HELIX ne détient pas vos fonds. Le robot de trading utilise uniquement de l’argent fictif; le trading avec de l’argent réel est désactivé.')}
      </p>
    </div>
  );
}
