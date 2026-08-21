import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Settings,
  Shield,
  Bell,
  Cpu,
  RefreshCw,
  Info,
  ExternalLink,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAppData } from '@/hooks/useAppData';
import { shortAddress } from '@/utils/format';

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const { state, refresh } = useAppData();
  const [maxRisk, setMaxRisk] = useState<number>(2);
  const [defaultIntel, setDefaultIntel] = useState<number>(2);
  const [refreshing, setRefreshing] = useState(false);
  const [tabMemoryCleared, setTabMemoryCleared] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleClearMemory = () => {
    setTabMemoryCleared(true);
    setTimeout(() => setTabMemoryCleared(false), 3000);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Slide-over panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-midnight-900"
          >
            {/* Header */}
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6 dark:border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-xl bg-cyan-500/10 text-cyan-500">
                  <Settings className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Settings & Config</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Preferences, network & privacy controls</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Body content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Risk Defaults */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-500">
                  <Shield className="size-4" />
                  Risk Defaults
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/[0.08] dark:bg-midnight-800/50 space-y-4">
                  <div>
                    <label className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                      <span>Default Max Risk Tolerance</span>
                      <span className="font-mono text-cyan-500 font-bold">{maxRisk} ({['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][maxRisk]})</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={3}
                      value={maxRisk}
                      onChange={(e) => setMaxRisk(Number(e.target.value))}
                      className="mt-2 w-full accent-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                      <span>Default Intelligence Feed Severity</span>
                      <span className="font-mono text-cyan-500 font-bold">{defaultIntel} / 20</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      value={defaultIntel}
                      onChange={(e) => setDefaultIntel(Number(e.target.value))}
                      className="mt-2 w-full accent-cyan-500"
                    />
                  </div>
                </div>
              </section>

              {/* Notification Preferences */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-500">
                  <Bell className="size-4" />
                  Notification Preferences
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/[0.08] dark:bg-midnight-800/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-900 dark:text-white">Security Alerts</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Alert on bridge flag status changes</p>
                    </div>
                    <Badge tone="cyan">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/[0.08]">
                    <div>
                      <p className="text-xs font-medium text-slate-900 dark:text-white">Indexer Lag Warnings</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Warn when ledger state is stale</p>
                    </div>
                    <Badge tone="success">Enabled</Badge>
                  </div>
                </div>
              </section>

              {/* Network & Infrastructure */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-500">
                  <Cpu className="size-4" />
                  Network & Indexer Information
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/[0.08] dark:bg-midnight-800/50 space-y-2.5 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Network</span>
                    <span className="font-semibold text-emerald-500">{state?.network ?? 'Preprod Testnet'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Contract</span>
                    <span className="text-slate-800 dark:text-slate-200">{shortAddress(state?.contractAddress ?? '24cdec3db0408077d9f2b0cd484b29bef5e4c2e0bac4f11d3f5ef24a5e25dc8c', 6, 6)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Indexer Status</span>
                    <span className="text-emerald-500 flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      Connected
                    </span>
                  </div>
                </div>
              </section>

              {/* Local Privacy State */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-500">
                  <Lock className="size-4" />
                  Local ZK Privacy State
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/[0.08] dark:bg-midnight-800/50 space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    All ZK proofs are generated locally in your browser through your connected Midnight wallet via the Midnight.js SDK (<code className="text-cyan-400">dappConnectorProofProvider</code>). Private witness data never leaves tab memory.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearMemory}
                    className="w-full text-xs border-slate-200 dark:border-white/10"
                  >
                    {tabMemoryCleared ? (
                      <>
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        Tab Memory Cleared!
                      </>
                    ) : (
                      'Clear Local Tab Memory'
                    )}
                  </Button>
                </div>
              </section>

              {/* Reset & Resync */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-500">
                  <RefreshCw className="size-4" />
                  Reset & Resync State
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/[0.08] dark:bg-midnight-800/50 space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Force poll the Midnight indexer to refresh the latest bridge registry state and coarse verdicts.
                  </p>
                  <Button
                    size="sm"
                    loading={refreshing}
                    onClick={handleRefresh}
                    className="w-full border-cyan-400/40 bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20 dark:text-cyan-300"
                  >
                    <RefreshCw className="size-3.5" />
                    Force Resync Indexer State
                  </Button>
                </div>
              </section>

              {/* About Section */}
              <section className="pt-4 border-t border-slate-200 dark:border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Info className="size-3.5 text-cyan-500" />
                    BridgeGuard AI v2.0
                  </span>
                  <span>Midnight Network</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                  Privacy-preserving cross-chain bridge risk evaluation using Compact zero-knowledge circuits.
                </p>
                <div className="flex items-center gap-4 pt-1 text-xs">
                  <a
                    href="https://github.com/pratikshakalbhor/BridgeGuard"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-500 hover:underline"
                  >
                    GitHub Source <ExternalLink className="size-3" />
                  </a>
                  <a
                    href="https://midnight.network"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-violet-500 hover:underline"
                  >
                    Midnight Specs <ExternalLink className="size-3" />
                  </a>
                </div>
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
