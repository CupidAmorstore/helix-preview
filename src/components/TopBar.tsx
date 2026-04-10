type TopBarProps = {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  mobileOpen: boolean;
  onMobileToggle: () => void;
};

export default function TopBar({ theme, onToggleTheme, mobileOpen, onMobileToggle }: TopBarProps) {
  return (
    <header className="app-topbar sticky top-0 z-20 flex items-center justify-between border-b border-white/10 px-6 py-4 lg:px-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="lg:hidden rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300"
          onClick={onMobileToggle}
        >
          {mobileOpen ? 'Close' : 'Menu'}
        </button>
        <div>
          <div className="text-sm uppercase tracking-[0.2em] text-slate-500">HELIX (Apex App)</div>
          <div className="text-sm text-slate-200">Live market context + read-only tracking</div>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-mint-500"></span>
          Data feeds: live
        </div>
        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300"
        >
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
      </div>
    </header>
  );
}

