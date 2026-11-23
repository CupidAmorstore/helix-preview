import { Link, NavLink, useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import NavIcon from './NavIcon';
import { isActive, legalItems, primaryNav, secondaryNav } from './navigation';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="app-shell bg-ink-900 text-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col gap-6 border-r border-white/10 px-6 py-8">
        <div className="flex items-center gap-3">
          <img src="/assets/helix_logo.png" alt="" className="h-8 w-8" />
          <div className="text-lg font-semibold tracking-wide">HELIX</div>
        </div>
        <nav className="flex flex-col gap-1 text-sm" aria-label="Main">
          {[...primaryNav.filter((i) => i.path !== '/more'), ...secondaryNav.map((i) => ({ ...i, icon: undefined }))].map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive: a }) => `flex min-h-[44px] items-center rounded-lg px-3 transition ${a ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-lg border border-white/10 px-3 py-2 text-xs">
          <div className="text-slate-300">Mode</div>
          <div className="text-amber-400">Paper trading only · no custody</div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        <TopBar />
        <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-10 lg:pb-8">{children}</main>
        <footer className="section-divider hidden px-6 py-6 text-xs text-slate-400 lg:block lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>HELIX is a market intelligence app. No custody. The Trading Bot runs in paper mode only — no real-money orders.</div>
            <div className="flex gap-4">
              {legalItems.map((item) => (
                <NavLink key={item.path} to={item.path} className="hover:text-slate-200">
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </footer>
      </div>

      {/* Phone bottom navigation: every primary area one tap away, in thumb reach */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/10 bg-ink-800/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {primaryNav.map((item) => {
          const active = isActive(item.path, pathname);
          return (
            // Plain Link: NavLink would override aria-current with its own path match, but a tab also
            // owns nested pages (More → Alerts), so the active state comes from isActive().
            <Link
              key={item.path}
              to={item.path}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] ${active ? 'text-mint-400' : 'text-slate-300'}`}
            >
              <NavIcon name={item.icon} />
              <span className={active ? 'font-semibold' : ''}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
