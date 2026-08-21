import { useRef, useEffect, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { FiLink, FiPower } from 'react-icons/fi';
import {
  Menu,
  Moon,
  Sun,
  Settings,
  X,
  LayoutDashboard,
  FlaskConical,
  BrainCircuit,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/Logo';
import { WalletSelectModal } from '@/components/WalletSelectModal';
import { cn, shortAddress } from '@/utils/format';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/analyze', label: 'Bridge Analysis', icon: FlaskConical },
  { to: '/app/advisor', label: 'Transfer Advisor', icon: BrainCircuit },
  { to: '/app/security', label: 'Security', icon: ShieldAlert },
  { to: '/app/wallet', label: 'Wallet', icon: Wallet },
];

interface AppNavbarProps {
  live: boolean;
  onOpenSettings: () => void;
}

export function AppNavbar({ live, onOpenSettings }: AppNavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { session, status, error, wallets, connect, disconnect } = useWallet();
  const connectFromTopbar = useRef(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const connecting = status === 'connecting' || status === 'checking';
  const connected = session?.connected === true && !!session.address;

  useEffect(() => {
    if (error && connectFromTopbar.current) {
      connectFromTopbar.current = false;
      toast.error('Wallet connection failed', { description: error });
    }
  }, [error]);

  const handleConnect = async () => {
    connectFromTopbar.current = false;
    if (wallets.length > 1) {
      setSelectOpen(true);
      return;
    }
    connectFromTopbar.current = true;
    await connect();
  };

  const handleSelectWallet = async (walletId: string) => {
    setSelectOpen(false);
    connectFromTopbar.current = true;
    await connect(walletId);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-white/[0.08] dark:bg-midnight-950/80">
        {/* Main bar */}
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Left: Logo */}
          <div className="flex items-center gap-6 shrink-0">
            <Link to="/app" className="flex items-center">
              <Logo />
            </Link>
          </div>

          {/* Center: Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'text-cyan-600 dark:text-cyan-300'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn('size-4', isActive ? 'text-cyan-500' : 'text-slate-400')} />
                    {item.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-indicator"
                        className="absolute inset-x-1 -bottom-[13px] h-[2px] rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right: Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Network status badge */}
            <span
              className={cn(
                'hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                live
                  ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300'
                  : 'border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-300',
              )}
            >
              <span className={cn('size-1.5 rounded-full', live ? 'bg-emerald-400' : 'bg-amber-400')} />
              {live ? 'Preprod' : 'Connecting…'}
            </span>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="hidden sm:grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300 transition-colors hover:border-cyan-400/50 hover:text-cyan-500"
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>

            {/* Wallet state */}
            {connecting ? (
              <Button size="sm" loading disabled className="border-cyan-400/30 bg-cyan-400/10 text-cyan-600 dark:text-cyan-300">
                Connecting…
              </Button>
            ) : connected ? (
              <>
                <span className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  {session.walletName}
                </span>
                <span className="hidden lg:inline font-mono text-xs text-slate-600 dark:text-slate-300">
                  {shortAddress(session.address ?? '', 5, 5)}
                </span>
                <button
                  type="button"
                  onClick={disconnect}
                  aria-label="Disconnect wallet"
                  title="Disconnect wallet"
                  className="hidden sm:grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-red-400/50 hover:text-red-500 dark:border-white/10 dark:text-slate-400"
                >
                  <FiPower className="size-4" />
                </button>
              </>
            ) : (
              <Button size="sm" onClick={handleConnect} className="border-cyan-400/40 bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20 dark:text-cyan-300">
                <FiLink className="size-4" />
                <span className="hidden sm:inline">Connect</span>
              </Button>
            )}

            {/* Settings gear */}
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Open settings"
              title="Settings & Privacy Config"
              className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-cyan-400/50 hover:text-cyan-500 dark:border-white/10 dark:text-slate-300"
            >
              <Settings className="size-4" />
            </button>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile slide-down menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-midnight-900"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/[0.08]">
                <Logo />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </button>
              </div>
              <nav className="p-3 space-y-1">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500/15 to-violet-500/10 text-cyan-600 dark:text-cyan-300 font-semibold'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={cn('size-5', isActive ? 'text-cyan-500' : 'text-slate-400')} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
              <div className="border-t border-slate-200 dark:border-white/[0.08] p-3 flex flex-wrap items-center gap-2">
                {/* Network badge */}
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                    live
                      ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300'
                      : 'border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-300',
                  )}
                >
                  <span className={cn('size-1.5 rounded-full', live ? 'bg-emerald-400' : 'bg-amber-400')} />
                  {live ? 'Preprod' : 'Connecting…'}
                </span>
                {/* Theme toggle */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                  className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300"
                >
                  {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
                </button>
                {/* Connected wallet info */}
                {connected && (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      {session.walletName}
                    </span>
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                      {shortAddress(session.address ?? '', 5, 5)}
                    </span>
                    <button
                      type="button"
                      onClick={() => { disconnect(); setMobileMenuOpen(false); }}
                      className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:border-red-400/50 hover:text-red-500 dark:border-white/10"
                    >
                      <FiPower className="size-3.5" />
                    </button>
                  </>
                )}
                {!connected && !connecting && (
                  <Button size="sm" onClick={() => { handleConnect(); setMobileMenuOpen(false); }} className="border-cyan-400/40 bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20 dark:text-cyan-300">
                    <FiLink className="size-3.5" />
                    Connect Wallet
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <WalletSelectModal open={selectOpen} wallets={wallets} onClose={() => setSelectOpen(false)} onSelect={handleSelectWallet} />
    </>
  );
}
