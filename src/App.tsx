import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import AppShell from './components/AppShell';
import DashboardPage from './pages/DashboardPage';
import PortfolioPage from './pages/PortfolioPage';
import ConnectionsPage from './pages/ConnectionsPage';
import AlertsPage from './pages/AlertsPage';
import WalletPage from './pages/WalletPage';
import AccessPage from './pages/AccessPage';
import LegalPage from './pages/LegalPage';
import { VaultProvider } from './services/vault';

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
          <Routes>
            <Route path="/" element={<DashboardPage />} />
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
        </AppShell>
      </VaultProvider>
    </BrowserRouter>
  );
}

