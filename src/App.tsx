import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import AppShell from './components/AppShell';
import HomePage from './pages/HomePage';
import { VaultProvider } from './services/vault';

// Home loads eagerly; every other page is code-split so the wallet/crypto
// libraries only download when the Wallet page is opened.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const BotPage = lazy(() => import('./pages/BotPage'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));
const ConnectionsPage = lazy(() => import('./pages/ConnectionsPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const AccessPage = lazy(() => import('./pages/AccessPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const MorePage = lazy(() => import('./pages/MorePage'));

export default function App() {
  const base = import.meta.env.BASE_URL;
  // Dark theme only until a complete, contrast-checked light token set exists: the old light mode left
  // dark cards with dark text in the Trading Bot (including the paper-mode warning).
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    try {
      localStorage.removeItem('helix_theme');
    } catch {
      // storage unavailable: nothing to clean up
    }
  }, []);

  return (
    <BrowserRouter basename={base}>
      <VaultProvider>
        <AppShell>
          <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/markets" element={<DashboardPage />} />
            <Route path="/bot" element={<BotPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/more" element={<MorePage />} />
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

