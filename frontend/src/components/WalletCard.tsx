import { ArrowDownUp, Copy, RefreshCw, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn, fmtCompact, shortAddress } from '@/utils/format';

interface WalletCardProps {
  address: string;
  tNight: string;
  dust: string;
  network: string;
  contractAddress?: string;
  live?: boolean;
  walletAddress?: string | null;
  onRefresh?: () => void;
}

export function WalletCard({
  address,
  tNight,
  dust,
  network,
  contractAddress,
  live,
  walletAddress,
  onRefresh,
}: WalletCardProps) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="card relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 text-cyan-400">
              <ArrowDownUp className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                BridgeGuard service wallet
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                  {shortAddress(address, 10, 8)}
                </span>
                <button
                  type="button"
                  onClick={copy}
                  className="text-slate-400 transition-colors hover:text-cyan-400"
                  aria-label="Copy address"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={live ? 'success' : 'warning'}>{live ? 'Synced' : 'Connecting…'}</Badge>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-cyan-400/50 hover:text-cyan-500 dark:border-white/10 dark:text-slate-400"
                aria-label="Refresh balance"
              >
                <RefreshCw className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-white/[0.07] dark:bg-midnight-900/50">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              tNight balance
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-white">
              {fmtCompact(tNight)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-white/[0.07] dark:bg-midnight-900/50">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              DUST
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-white">
              {fmtCompact(dust)}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Network</span>
            <span className="font-medium text-slate-700 dark:text-slate-200">{network}</span>
          </div>
          {contractAddress && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Contract</span>
              <span className="font-mono text-slate-700 dark:text-slate-200">
                {shortAddress(contractAddress, 8, 6)}
              </span>
            </div>
          )}
          {walletAddress && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Connected wallet</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-300">
                {shortAddress(walletAddress, 8, 6)}
              </span>
            </div>
          )}
        </div>

        <div
          className={cn(
            'mt-5 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs',
            live
              ? 'border-emerald-400/30 bg-emerald-400/5 text-emerald-600 dark:text-emerald-300'
              : 'border-violet-400/30 bg-violet-400/5 text-violet-600 dark:text-violet-300',
          )}
        >
          <ShieldCheck className="size-4 shrink-0" />
          {live
            ? 'Wallet synced with the Midnight indexer — private state encrypted.'
            : 'Connecting to the BridgeGuard backend…'}
        </div>
      </div>
    </div>
  );
}
