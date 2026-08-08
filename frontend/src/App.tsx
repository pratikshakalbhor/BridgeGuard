import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Landing } from '@/pages/Landing';
import { Dashboard } from '@/pages/Dashboard';
import { BridgeAnalysis } from '@/pages/BridgeAnalysis';
import { Advisor } from '@/pages/Advisor';
import { LiquidityMonitor } from '@/pages/LiquidityMonitor';
import { WhaleActivity } from '@/pages/WhaleActivity';
import { Alerts } from '@/pages/Alerts';
import { WalletConnection } from '@/pages/WalletConnection';
import { Settings } from '@/pages/Settings';
import { About } from '@/pages/About';
import { NotFound } from '@/pages/NotFound';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/motion/PageTransition';
import { AppDataProvider, useAppData } from '@/hooks/useAppData';
import { WalletProvider } from '@/hooks/useWallet';

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Registry, verdicts and liquidity at a glance',
  },
  analyze: {
    title: 'Bridge Analysis',
    subtitle: 'Confidential zero-knowledge risk evaluation',
  },
  advisor: {
    title: 'AI Transfer Advisor',
    subtitle: 'Find the safest route without revealing your amount',
  },
  liquidity: {
    title: 'Liquidity Monitor',
    subtitle: 'Pool health and utilization across bridges',
  },
  whales: {
    title: 'Whale Activity',
    subtitle: 'Large cross-chain transfers in the last 24 hours',
  },
  alerts: {
    title: 'Security Alerts',
    subtitle: 'Incidents and intelligence from the on-chain registry',
  },
  wallet: {
    title: 'Wallet',
    subtitle: 'Lace wallet connection and balances',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Preferences, notifications and local privacy',
  },
  about: {
    title: 'About',
    subtitle: 'The project, the contract, and the stack',
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
              <BridgeAnalysis />
            </AppPage>
          }
        />
        <Route
          path="/app/advisor"
          element={
            <AppPage page="advisor">
              <Advisor />
            </AppPage>
          }
        />
        <Route
          path="/app/liquidity"
          element={
            <AppPage page="liquidity">
              <LiquidityMonitor />
            </AppPage>
          }
        />
        <Route
          path="/app/whales"
          element={
            <AppPage page="whales">
              <WhaleActivity />
            </AppPage>
          }
        />
        <Route
          path="/app/alerts"
          element={
            <AppPage page="alerts">
              <Alerts />
            </AppPage>
          }
        />
        <Route
          path="/app/wallet"
          element={
            <AppPage page="wallet">
              <WalletConnection />
            </AppPage>
          }
        />
        <Route
          path="/app/settings"
          element={
            <AppPage page="settings">
              <Settings />
            </AppPage>
          }
        />
        <Route
          path="/app/about"
          element={
            <AppPage page="about">
              <About />
            </AppPage>
          }
        />
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
