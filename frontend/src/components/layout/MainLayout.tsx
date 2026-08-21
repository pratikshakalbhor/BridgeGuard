import { useState } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { AppTopbar } from '@/components/layout/AppTopbar';
import { SettingsDrawer } from '@/components/layout/SettingsDrawer';

interface MainLayoutProps {
  title: string;
  subtitle?: string;
  live: boolean;
  children: ReactNode;
}

export function MainLayout({ title, subtitle, live, children }: MainLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-grid-faint">
      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <AppTopbar
          title={title}
          subtitle={subtitle}
          live={live}
          onMenuClick={() => setMenuOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <footer className="border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:border-white/[0.08] dark:text-slate-400">
          <div>
            BridgeGuard AI · Privacy-preserving cross-chain bridge security on Midnight
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="text-cyan-500 hover:underline cursor-pointer"
            >
              About & Settings
            </button>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </footer>
      </div>
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
