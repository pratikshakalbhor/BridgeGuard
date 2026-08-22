import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Moon, Sun, X, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/utils/format';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled || menuOpen
          ? 'glass-strong border-b border-slate-200 dark:border-white/10'
          : 'border-b border-transparent',
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label="ZeroBridge home" className="flex items-center gap-2">
          <Logo />
          <span className="text-xl font-bold text-slate-900 dark:text-white hidden sm:block">ZeroBridge</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link to="/app" className="text-sm font-medium text-slate-600 transition-colors hover:text-cyan-500 dark:text-slate-300 dark:hover:text-cyan-300">
            Dashboard
          </Link>
          <Link to="/app/analyze" className="text-sm font-medium text-slate-600 transition-colors hover:text-cyan-500 dark:text-slate-300 dark:hover:text-cyan-300">
            Analyze
          </Link>
          <Link to="/app/security" className="text-sm font-medium text-slate-600 transition-colors hover:text-cyan-500 dark:text-slate-300 dark:hover:text-cyan-300">
            Security
          </Link>
          <Link to="/app/wallet" className="text-sm font-medium text-slate-600 transition-colors hover:text-cyan-500 dark:text-slate-300 dark:hover:text-cyan-300">
            Wallet
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="grid size-10 place-items-center rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 transition-colors hover:border-cyan-400/50 hover:text-cyan-500"
          >
            {theme === 'dark' ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
          </button>
          <Link to="/app" className="btn-primary hidden sm:inline-flex">
            <ShieldCheck className="size-4" />
            Launch App
          </Link>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="glass-strong border-t border-slate-200 dark:border-white/10 px-5 pb-6 pt-4 md:hidden">
          <div className="flex flex-col gap-1">
            <Link to="/app" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5">
              Dashboard
            </Link>
            <Link to="/app/analyze" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5">
              Analyze
            </Link>
            <Link to="/app/security" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5">
              Security
            </Link>
            <Link to="/app/wallet" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5">
              Wallet
            </Link>
            <Link to="/app" onClick={() => setMenuOpen(false)} className="btn-primary mt-3 w-full">
              <ShieldCheck className="size-4" />
              Launch App
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
