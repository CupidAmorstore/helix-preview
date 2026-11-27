import { Link } from 'react-router-dom';
import { useT } from '../i18n';

/** Slim brand bar. The money type is always visible as a strip, not a badge. */
export default function TopBar() {
  const t = useT();
  return (
    <header className="app-topbar sticky top-0 z-20 sm:px-6 lg:px-10" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), var(--safe-area-inset-top, 0px))' }}>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <Link to="/" className="flex min-h-[44px] items-center gap-2" aria-label={t('HELIX home', 'Accueil HELIX')}>
          <img src={`${import.meta.env.BASE_URL}assets/helix-mark.svg`} alt="" className="h-6 w-6" />
          <span className="text-[15px] font-semibold tracking-[0.28em] text-white">HELIX</span>
        </Link>
        <span className="flex items-center gap-1.5 text-xs font-medium text-paper">
          <span className="h-1.5 w-1.5 rounded-full bg-paper" aria-hidden="true" />
          {t('Paper money · no real orders', 'Argent fictif · aucun ordre réel')}
        </span>
      </div>
      <div className="h-px bg-paper/40" aria-hidden="true" />
    </header>
  );
}
