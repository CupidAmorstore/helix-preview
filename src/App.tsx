import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Suspense, useEffect, type ReactNode } from 'react';
import AppShell from './components/AppShell';
import HomePage from './pages/HomePage';
import { VaultProvider } from './services/vault';
import { PaperProvider } from './paper/PaperProvider';
import { lazyScreen, prefetchScreens, ScreenBoundary } from './components/ScreenGuard';

// Home loads eagerly; every other page is code-split so the wallet/crypto
// libraries only download when the Wallet page is opened.
const loadMarketsPage = () => import('./pages/MarketsPage');
const MarketsPage = lazyScreen(loadMarketsPage);
const loadAssetPage = () => import('./pages/AssetPage');
const AssetPage = lazyScreen(loadAssetPage);
const loadBotPage = () => import('./pages/BotPage');
const BotPage = lazyScreen(loadBotPage);
const loadResearchLabPage = () => import('./pages/ResearchLabPage');
const ResearchLabPage = lazyScreen(loadResearchLabPage);
const loadPortfolioPage = () => import('./pages/PortfolioPage');
const PortfolioPage = lazyScreen(loadPortfolioPage);
const loadConnectionsPage = () => import('./pages/ConnectionsPage');
const ConnectionsPage = lazyScreen(loadConnectionsPage);
const loadAlertsPage = () => import('./pages/AlertsPage');
const AlertsPage = lazyScreen(loadAlertsPage);
const loadWalletPage = () => import('./pages/WalletPage');
const WalletPage = lazyScreen(loadWalletPage);
const loadAccessPage = () => import('./pages/AccessPage');
const AccessPage = lazyScreen(loadAccessPage);
const loadLegalPage = () => import('./pages/LegalPage');
const LegalPage = lazyScreen(loadLegalPage);
const loadMorePage = () => import('./pages/MorePage');
const MorePage = lazyScreen(loadMorePage);

function Guarded({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <ScreenBoundary key={pathname}>{children}</ScreenBoundary>;
}

export default function App() {
  // most-used screens are fetched in the background so they open offline later (wallet libraries are large: on demand)
  useEffect(() => prefetchScreens([loadMarketsPage, loadAssetPage, loadBotPage, loadMorePage, loadAlertsPage, loadPortfolioPage, loadLegalPage]), []);
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
      <PaperProvider>
        <AppShell>
          <Guarded>
          <Suspense fallback={<div className="mx-auto max-w-xl animate-pulse space-y-3 pt-2" aria-label="Loading"><div className="h-7 w-40 bg-ink-800" /><div className="h-24 bg-ink-800" /><div className="h-24 bg-ink-800" /></div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/markets" element={<MarketsPage />} />
            <Route path="/markets/:symbol" element={<AssetPage />} />
            <Route path="/bot" element={<BotPage />} />
            <Route path="/bot/research" element={<ResearchLabPage />} />
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
          </Guarded>
        </AppShell>
      </PaperProvider>
      </VaultProvider>
    </BrowserRouter>
  );
}

