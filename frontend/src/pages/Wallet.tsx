import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiLink, FiRefreshCw, FiPower, FiXCircle } from 'react-icons/fi';
import { Lock } from 'lucide-react';
import { WalletCard } from '@/components/WalletCard';
import { WalletSelectModal } from '@/components/WalletSelectModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { AnimatedSuccess } from '@/components/motion/AnimatedSuccess';
import { EmptyState } from '@/components/EmptyState';
import { ErrorComponent } from '@/components/ErrorComponent';
import { useAppData } from '@/hooks/useAppData';
import { useHealth } from '@/hooks/useHealth';
import { useWallet } from '@/hooks/useWallet';
import { BRIDGEGUARD_NETWORK_ID, networkLabel } from '@/services/wallet';
import { shortAddress } from '@/utils/format';
import { cn } from '@/utils/format';

export function Wallet() {
  const { state, loading, error, refresh } = useAppData();
  const { report: health, refresh: refreshHealth } = useHealth();
  const {
    session: wallet,
    status: walletStatus,
    installed,
    wallets,
    connect: connectWallet,
    disconnect,
  } = useWallet();
  const [syncing, setSyncing] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);

  const connecting = walletStatus === 'connecting' || walletStatus === 'checking';

  const connect = async (walletId?: string) => {
    if (!walletId && wallets.length > 1) {
      // Several Midnight wallets are installed — let the user pick one.
      setSelectOpen(true);
      return;
    }
    const { session, error: connectError } = await connectWallet(walletId);
    if (session) {
      toast.success(`${session.walletName} wallet connected`, {
        description: `${shortAddress(session.address ?? '', 10, 8)} · ${session.network}`,
      });
    } else {
      toast.error('Could not connect wallet', {
        description: connectError ?? 'The wallet refused the connection.',
      });
    }
  };

  const confirmDisconnect = () => {
    disconnect();
    setDisconnectOpen(false);
    toast.info('Wallet disconnected');
  };

  const refreshBalance = async () => {
    setSyncing(true);
    await Promise.all([refresh(), refreshHealth()]);
    setSyncing(false);
    toast.success('Balances synced');
  };

  if (!state) {
    return loading ? (
      <EmptyState title="Reading ZeroBridge state…" body="Fetching live bridge state directly from the Midnight contract indexer." />
    ) : (
      <ErrorComponent message={error ?? 'Unable to reach the ZeroBridge backend.'} onRetry={refresh} />
    );
  }

  const services = health?.services ?? [];
  const allHealthy = services.length > 0 && services.every((s) => s.healthy);
  const backendOffline = services.length === 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <WalletCard
            address={state.walletAddress}
            tNight={state.balance.tNight}
            dust={state.balance.dust}
            network={state.network}
            contractAddress={state.contractAddress}
            live={true}
            walletAddress={wallet?.address ?? null}
            onRefresh={refreshBalance}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="card relative overflow-hidden p-6"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <FiLink className="size-4 text-violet-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Midnight wallet
              </h2>
            </div>

            {wallet?.connected ? (
              <div className="mt-5 space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3">
                  <AnimatedSuccess size={34} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-emerald-500 dark:text-emerald-300">
                      Connected
                    </p>
                    <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                      {wallet.address ? shortAddress(wallet.address, 12, 10) : '—'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Wallet</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {wallet.walletName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Network</span>
                    <span className="font-medium text-slate-900 dark:text-white">{wallet.network}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Extension detected</span>
                    <Badge tone={wallet.installed ? 'success' : 'warning'}>
                      {wallet.installed ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Full address</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">
                      {wallet.address ? shortAddress(wallet.address, 6, 6) : '—'}
                    </span>
                  </div>
                </div>
                {/* Privacy Indicator */}
                <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/5 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-cyan-600 dark:text-cyan-400">
                    <Lock className="size-3.5 shrink-0" />
                    <span>Private proving enabled</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Your confidential witness data is processed locally in the browser. Private inputs never leave your device.
                  </p>
                </div>
                {wallet.networkId !== BRIDGEGUARD_NETWORK_ID && (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-xs text-amber-500 dark:text-amber-300">
                    The wallet is on {wallet.network}, but ZeroBridge runs on {networkLabel(BRIDGEGUARD_NETWORK_ID)}.
                    Switch your Midnight wallet (Lace or 1AM) to the ZeroBridge network so contract
                    transactions match the deployed contract.
                  </div>
                )}
                <Button variant="outline" className="w-full border-red-400/40 text-red-500 hover:bg-red-400/10 dark:text-red-400" onClick={() => setDisconnectOpen(true)}>
                  <FiPower className="size-4" />
                  Disconnect wallet
                </Button>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-white/[0.07]">
                  <FiXCircle className="size-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Not connected</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {installed
                        ? 'Midnight wallet extension detected — ready to connect.'
                        : 'No Midnight wallet extension found. Install the Midnight Lace wallet (or another Midnight wallet) to connect.'}
                    </p>
                  </div>
                </div>
                <Button onClick={() => connect()} loading={connecting} className="w-full">
                  <FiLink className="size-4" />
                  {connecting ? 'Connecting…' : 'Connect Midnight wallet'}
                </Button>
                {wallet?.networkId && wallet.networkId !== BRIDGEGUARD_NETWORK_ID && (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-xs text-amber-500 dark:text-amber-300">
                    The wallet is on {wallet.network}, but ZeroBridge runs on {networkLabel(BRIDGEGUARD_NETWORK_ID)}.
                    Switch your Midnight wallet (Lace or 1AM) to the ZeroBridge network to send contract
                    transactions.
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="card p-6 xl:col-span-2"
        >
          <div className="flex items-center gap-2">
            <FiLink className="size-4 text-cyan-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Connection status
            </h2>
            <Badge tone={allHealthy ? 'success' : 'warning'}>
              {backendOffline ? 'no data' : allHealthy ? 'all systems online' : 'degraded'}
            </Badge>
          </div>
          <div className="mt-5 space-y-3">
            {backendOffline ? (
              <div className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-white/[0.07] dark:text-slate-400">
                No data available — the ZeroBridge backend is offline.
              </div>
            ) : (
              services.map((s, i) => (
                <motion.div
                  key={s.name}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-white/[0.07]"
                >
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                      {s.name}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">{s.url}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden text-[11px] text-slate-400 dark:text-slate-500 sm:inline">
                      {s.detail}
                    </span>
                    <span
                      className={cn(
                        'flex items-center gap-1.5 text-xs font-semibold',
                        s.healthy ? 'text-emerald-400' : 'text-red-400',
                      )}
                    >
                      <span
                        className={cn(
                          'size-2 rounded-full',
                          s.healthy ? 'animate-pulse bg-emerald-400' : 'bg-red-400',
                        )}
                      />
                      {s.healthy ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            How the wallet connects
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            {[
              'BIP-39 wallet derived from a 24-word recovery phrase.',
              'Your Midnight wallet signs transactions via the browser extension.',
              'Private state is encrypted with a wallet-scoped password in LevelDB.',
              'Only coarse verdicts ever reach the public ledger.',
              'ZK proofs are generated locally in your browser — never on a server.',
              'Private witness values (amount, tolerance, intel) stay in browser memory.',
            ].map((row) => (
              <li key={row} className="flex items-start gap-2.5">
                <FiCheckCircle className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                {row}
              </li>
            ))}
          </ul>
        </motion.div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6">
        <div className="flex items-center gap-4">
          <div className="grid size-11 place-items-center rounded-xl bg-cyan-400/15 text-cyan-400">
            <FiRefreshCw className="size-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">Resync wallet state</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Re-read balances, on-chain state and service health from the Midnight indexer.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={allHealthy ? 'success' : 'warning'}>
            {backendOffline ? 'backend offline' : allHealthy ? 'indexer synced' : 'partial sync'}
          </Badge>
          <Button onClick={refreshBalance} loading={syncing || loading}>
            <FiRefreshCw className="size-4" />
            Resync now
          </Button>
        </div>
      </section>

      <p className="font-mono text-center text-xs text-slate-400 dark:text-slate-500">
        {shortAddress(state.walletAddress, 12, 12)}
      </p>

      <Modal open={disconnectOpen} onClose={() => setDisconnectOpen(false)} title="Disconnect wallet">
        <p className="text-sm text-slate-400">
          Your wallet session will be removed from this device. Private state stays encrypted
          on disk and can be reconnected at any time.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDisconnectOpen(false)}>
            Cancel
          </Button>
          <Button variant="outline" className="border-red-400/40 text-red-500 hover:bg-red-400/10 dark:text-red-400" onClick={confirmDisconnect}>
            <FiPower className="size-4" />
            Disconnect
          </Button>
        </div>
      </Modal>

      <WalletSelectModal open={selectOpen} wallets={wallets} onClose={() => setSelectOpen(false)} onSelect={connect} />
    </div>
  );
}

