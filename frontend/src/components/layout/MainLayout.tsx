import type { ReactNode } from 'react';
import { AppNavbar } from '@/components/layout/AppNavbar';

interface MainLayoutProps {
  title: string;
  subtitle?: string;
  live: boolean;
  children: ReactNode;
}

export function MainLayout({ title, subtitle, live, children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-grid-faint">
      <AppNavbar live={live} />

      {/* Page header */}
      <div className="border-b border-slate-200 bg-white/50 backdrop-blur-sm dark:border-white/[0.06] dark:bg-midnight-950/50">
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Main content */}
      <main className="mx-auto max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="border-t border-slate-200 dark:border-white/[0.08]">
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div>ZeroBridge · Privacy-preserving security for cross-chain DeFi</div>
          <div className="flex items-center gap-4">
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}