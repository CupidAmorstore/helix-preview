import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import TopBar from './TopBar';
import { legalItems, navItems } from './navigation';

type AppShellProps = {
  children: React.ReactNode;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
};

export default function AppShell({ children, theme, onToggleTheme }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell bg-ink-900 text-slate-100">
      <aside className="hidden lg:flex flex-col gap-6 border-r border-white/10 px-6 py-8">
        <div className="flex items-center gap-3">
          <img src="/assets/helix_logo.png" alt="HELIX" className="h-8 w-8" />
          <div>
            <div className="text-lg font-semibold tracking-wide">HELIX</div>
            <div className="text-xs text-slate-400">Market Intelligence</div>
          </div>
        </div>
        <nav className="flex flex-col gap-2 text-sm">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 transition ${isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`
              }
              end={item.path === '/'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3 text-xs text-slate-500">
          <div className="rounded-lg border border-white/10 px-3 py-2">
            <div className="text-slate-400">Mode</div>
            <div className="text-slate-200">Read-only / No custody</div>
          </div>
          <div className="rounded-lg border border-white/10 px-3 py-2">
            <div className="text-slate-400">Default network</div>
            <div className="text-slate-200">Testnets first</div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <TopBar
          theme={theme}
          onToggleTheme={onToggleTheme}
          mobileOpen={mobileOpen}
          onMobileToggle={() => setMobileOpen((prev) => !prev)}
        />
        {mobileOpen && (
          <div className="lg:hidden border-b border-white/10 bg-ink-800/90 px-4 py-3">
            <nav className="flex flex-col gap-2 text-sm">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 transition ${isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`
                  }
                  end={item.path === '/'}
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="h-px bg-white/10" />
              {legalItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-slate-400 hover:text-white"
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
        <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>
        <footer className="section-divider px-6 py-6 text-xs text-slate-500 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>HELIX is a read-only market intelligence platform. No custody. No trading.</div>
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
    </div>
  );
}

