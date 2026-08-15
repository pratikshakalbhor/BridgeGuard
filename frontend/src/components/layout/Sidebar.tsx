import { NavLink, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell,
  BrainCircuit,
  Fish,
  FlaskConical,
  Info,
  LayoutDashboard,
  Settings,
  Wallet,
  Waves,
  X,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/utils/format';
import { Moon, Sun } from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/analyze', label: 'Bridge Analysis', icon: FlaskConical },
  { to: '/app/advisor', label: 'AI Transfer Advisor', icon: BrainCircuit },
  { to: '/app/liquidity', label: 'Liquidity Monitor', icon: Waves },
  { to: '/app/whales', label: 'Whale Activity', icon: Fish },
  { to: '/app/alerts', label: 'Security Alerts', icon: Bell },
  { to: '/app/wallet', label: 'Wallet', icon: Wallet },
  { to: '/app/settings', label: 'Settings', icon: Settings },
  { to: '/app/about', label: 'About', icon: Info },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white/90 backdrop-blur-xl transition-transform duration-300 dark:border-white/[0.08] dark:bg-midnight-900/90',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5 dark:border-white/[0.08]">
          <Link to="/app" onClick={onClose}>
            <Logo />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5 lg:hidden"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {NAV_ITEMS.map((item, i) => (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + i * 0.04, duration: 0.35, ease: 'easeOut' }}
            >
              <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/15 to-violet-500/10 text-cyan-600 dark:text-cyan-300 shadow-glow'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'size-4.5 transition-colors',
                      isActive
                        ? 'text-cyan-500'
                        : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200',
                    )}
                  />
                  {item.label}
                </>
              )}
              </NavLink>
            </motion.div>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4 dark:border-white/[0.08]">
          <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white/60 px-3.5 py-2.5 dark:border-white/[0.08] dark:bg-midnight-800/60">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Theme</span>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300 transition-colors hover:border-cyan-400/50 hover:text-cyan-500"
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-violet-400/20 bg-violet-400/5 px-3.5 py-3">
            <span className="size-2 animate-pulse rounded-full bg-violet-400" />
            <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">
              Midnight · Zero-knowledge verified
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
