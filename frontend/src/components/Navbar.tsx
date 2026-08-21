import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Moon, Sun, X, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/utils/format';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Privacy', href: '#privacy' },
];

const PAGE_LINKS = [{ label: 'About', to: '/app/about' }];

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
        <a href="#top" aria-label="ZeroBridge home">
          <Logo />
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-cyan-500 dark:text-slate-300 dark:hover:text-cyan-300"
            >
              {link.label}
            </a>
          ))}
          {PAGE_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-cyan-500 dark:text-slate-300 dark:hover:text-cyan-300"
            >
              {link.label}
            </Link>
          ))}
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
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
              >
                {link.label}
              </a>
            ))}
            {PAGE_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/app"
              onClick={() => setMenuOpen(false)}
              className="btn-primary mt-3 w-full"
            >
              <ShieldCheck className="size-4" />
              Launch App
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
