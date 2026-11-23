import { Link } from 'react-router-dom';

export default function TopBar() {
  return (
    <header className="app-topbar sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6 lg:px-10">
      <Link to="/" className="flex min-h-[48px] items-center gap-2.5" aria-label="HELIX home">
        <img src={`${import.meta.env.BASE_URL}assets/helix_logo.png`} alt="" className="h-8 w-8" />
        <span className="text-base font-semibold tracking-wide text-white">HELIX</span>
      </Link>
      <span className="rounded-md border border-dashed border-amber-500/70 px-2 py-1 text-[11px] font-semibold tracking-wider text-amber-400">
        PAPER TRADING ONLY
      </span>
    </header>
  );
}
