import { useState } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { AppTopbar } from '@/components/layout/AppTopbar';

interface MainLayoutProps {
  title: string;
  subtitle?: string;
  live: boolean;
  children: ReactNode;
}

export function MainLayout({ title, subtitle, live, children }: MainLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-grid-faint">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-h-screen flex-col lg:pl-72">
        <AppTopbar
          title={title}
          subtitle={subtitle}
          live={live}
          onMenuClick={() => setMenuOpen(true)}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <footer className="border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-400 dark:border-white/[0.08] dark:text-slate-500">
          BridgeGuard AI · privacy-preserving bridge security on Midnight ·{' '}
          {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}
