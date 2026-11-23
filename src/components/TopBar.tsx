import { Link } from 'react-router-dom';

/** Slim brand bar. The money type is always visible as a strip, not a badge. */
export default function TopBar() {
  return (
    <header className="app-topbar sticky top-0 z-20 sm:px-6 lg:px-10">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <Link to="/" className="flex min-h-[44px] items-center gap-2" aria-label="HELIX home">
          <img src={`${import.meta.env.BASE_URL}assets/helix-mark.svg`} alt="" className="h-6 w-6" />
          <span className="text-[15px] font-semibold tracking-[0.28em] text-white">HELIX</span>
        </Link>
        <span className="flex items-center gap-1.5 text-xs font-medium text-paper">
          <span className="h-1.5 w-1.5 rounded-full bg-paper" aria-hidden="true" />
          Paper money · no real orders
        </span>
      </div>
      <div className="h-px bg-paper/40" aria-hidden="true" />
    </header>
  );
}
