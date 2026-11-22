import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Suspense, lazy, useEffect, useState } from 'react';
import AppShell from './components/AppShell';
import DashboardPage from './pages/DashboardPage';
import { VaultProvider } from './services/vault';

// Markets (home) loads eagerly; every other page is code-split so the wallet/crypto
// libraries only download when the Wallet page is opened.
const BotPage = lazy(() => import('./pages/BotPage'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));
const ConnectionsPage = lazy(() => import('./pages/ConnectionsPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const AccessPage = lazy(() => import('./pages/AccessPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));

export default function App() {
  const base = import.meta.env.BASE_URL;
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem('helix_theme');
    return stored === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('helix_theme', theme);
  }, [theme]);

  return (
    <BrowserRouter basename={base}>
      <VaultProvider>
        <AppShell
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        >
          <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/bot" element={<BotPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/connections" element={<ConnectionsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/access" element={<AccessPage />} />
            <Route path="/support" element={<LegalPage kind="support" />} />
            <Route path="/privacy" element={<LegalPage kind="privacy" />} />
            <Route path="/terms" element={<LegalPage kind="terms" />} />
            <Route path="*" element={<LegalPage kind="notfound" />} />
          </Routes>
          </Suspense>
        </AppShell>
      </VaultProvider>
    </BrowserRouter>
  );
}

