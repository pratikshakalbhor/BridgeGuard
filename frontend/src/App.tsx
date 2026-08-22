import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Landing } from '@/pages/Landing';
import { Dashboard } from '@/pages/Dashboard';
import { Analyze } from '@/pages/Analyze';
import { Security } from '@/pages/Security';
import { Wallet } from '@/pages/Wallet';
import { NotFound } from '@/pages/NotFound';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/motion/PageTransition';
import { AppDataProvider, useAppData } from '@/hooks/useAppData';
import { WalletProvider } from '@/hooks/useWallet';

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Bridge health overview, risk status & zero-knowledge security stats',
  },
  analyze: {
    title: 'Analyze',
    subtitle: 'Confidential zero-knowledge risk evaluation & security verdicts',
  },
  security: {
    title: 'Security',
    subtitle: 'Alerts, incident feed, status flags & on-chain activity',
  },
  wallet: {
    title: 'Wallet',
    subtitle: 'Midnight testnet connection, balances & network state',
  },
};

function AppPage({
  page,
  children,
}: {
  page: keyof typeof PAGE_META;
  children: React.ReactNode;
}) {
  const { live } = useAppData();
  const meta = PAGE_META[page];
  return (
    <MainLayout title={meta.title} subtitle={meta.subtitle} live={live}>
      <PageTransition key={page}>{children}</PageTransition>
    </MainLayout>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageTransition key="landing">
              <Landing />
            </PageTransition>
          }
        />
        <Route
          path="/app"
          element={
            <AppPage page="dashboard">
              <Dashboard />
            </AppPage>
          }
        />
        <Route
          path="/app/analyze"
          element={
            <AppPage page="analyze">
              <Analyze />
            </AppPage>
          }
        />
        <Route
          path="/app/security"
          element={
            <AppPage page="security">
              <Security />
            </AppPage>
          }
        />
        <Route
          path="/app/wallet"
          element={
            <AppPage page="wallet">
              <Wallet />
            </AppPage>
          }
        />

        {/* Redirect legacy routes */}
        <Route path="/app/analyze/*" element={<Navigate to="/app/analyze" replace />} />
        <Route path="/app/advisor" element={<Navigate to="/app/analyze" replace />} />
        <Route path="/app/alerts" element={<Navigate to="/app/security" replace />} />
        <Route path="/app/whales" element={<Navigate to="/app/security" replace />} />
        <Route path="/app/liquidity" element={<Navigate to="/app/analyze" replace />} />
        <Route path="/app/settings" element={<Navigate to="/app" replace />} />
        <Route path="/app/about" element={<Navigate to="/app" replace />} />
        <Route path="/app/wallet-connection" element={<Navigate to="/app/wallet" replace />} />

        <Route path="/app/*" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AppDataProvider>
      <WalletProvider>
        <AnimatedRoutes />
      </WalletProvider>
    </AppDataProvider>
  );
}