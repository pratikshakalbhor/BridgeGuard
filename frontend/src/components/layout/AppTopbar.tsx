import { useRef, useEffect, useState } from 'react';
import { FiLink, FiPower } from 'react-icons/fi';
import { Menu, Moon, Sun, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/Button';
import { WalletSelectModal } from '@/components/WalletSelectModal';
import { cn, shortAddress } from '@/utils/format';

interface AppTopbarProps {
  title: string;
  subtitle?: string;
  live: boolean;
  onMenuClick: () => void;
  onOpenSettings?: () => void;
}

export function AppTopbar({ title, subtitle, live, onMenuClick, onOpenSettings }: AppTopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { session, status, error, wallets, connect, disconnect } = useWallet();
  const connectFromTopbar = useRef(false);
  const [selectOpen, setSelectOpen] = useState(false);

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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-xl dark:border-white/[0.08] dark:bg-midnight-950/80 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
        <div>
          <h1 className="text-base font-bold leading-tight text-slate-900 dark:text-white sm:text-lg">
            {title}
          </h1>
          {subtitle && (
            <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Network status badge */}
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
            live
              ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300'
              : 'border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-300',
          )}
        >
          <span className={cn('size-1.5 rounded-full', live ? 'bg-emerald-400' : 'bg-amber-400')} />
          <span className="hidden sm:inline">{live ? 'Preprod' : 'Connecting…'}</span>
        </span>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="grid size-9 sm:size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300 transition-colors hover:border-cyan-400/50 hover:text-cyan-500"
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
            <span
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-300"
            >
              <span className="size-1.5 rounded-full bg-emerald-400" />
              {session.walletName}
            </span>
            <span className="hidden md:inline font-mono text-xs text-slate-600 dark:text-slate-300">
              {shortAddress(session.address ?? '', 5, 5)}
            </span>
          </>
        ) : (
          <Button size="sm" onClick={handleConnect} className="border-cyan-400/40 bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20 dark:text-cyan-300">
            <FiLink className="size-4" />
            <span className="hidden sm:inline">Connect</span>
          </Button>
        )}

        {/* Settings Icon */}
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open settings"
          title="Settings & Privacy Config"
          className="grid size-9 sm:size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:border-cyan-400/50 hover:text-cyan-500 dark:border-white/10 dark:text-slate-300"
        >
          <Settings className="size-4" />
        </button>

        {/* Disconnect button if connected */}
        {connected && (
          <button
            type="button"
            onClick={disconnect}
            aria-label="Disconnect wallet"
            title="Disconnect wallet"
            className="grid size-9 sm:size-10 place-items-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-red-400/50 hover:text-red-500 dark:border-white/10 dark:text-slate-400"
          >
            <FiPower className="size-4" />
          </button>
        )}
      </div>

      <WalletSelectModal open={selectOpen} wallets={wallets} onClose={() => setSelectOpen(false)} onSelect={handleSelectWallet} />
    </header>
  );
}
