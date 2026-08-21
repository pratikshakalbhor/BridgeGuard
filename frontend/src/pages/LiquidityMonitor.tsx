import { useMemo } from 'react';
import { AlertTriangle, Waves } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';
import { TvlSnapshotChart } from '@/components/charts/TvlSnapshotChart';
import { EmptyState } from '@/components/EmptyState';
import { ErrorComponent } from '@/components/ErrorComponent';
import { AnimatedCounter } from '@/components/motion/AnimatedCounter';
import { useAppData } from '@/hooks/useAppData';
import { chainName } from '@/utils/constants';
import { fmtCompact } from '@/utils/format';
import { deriveTvlSnapshot } from '@/utils/deriveData';
import { getLiquidityHealth } from '@/services/midnight';

export function LiquidityMonitor() {
  const { state, loading, error, refresh } = useAppData();

  const tvlSnapshot = useMemo(() => (state ? deriveTvlSnapshot(state) : []), [state]);

  const totalTvl = useMemo(
    () => (state?.ledger.bridges ?? []).reduce((acc, b) => acc + Number(b.tvl), 0),
    [state],
  );
  const thinCount = useMemo(
    () => (state?.ledger.bridges ?? []).filter((b) => getLiquidityHealth(b).status !== 'Healthy').length,
    [state],
  );
  const flaggedCount = useMemo(
    () => (state?.ledger.bridges ?? []).filter((b) => Number(b.status) !== 0).length,
    [state],
  );

  if (!state) {
    return loading ? (
      <EmptyState title="Reading BridgeGuard state…" body="Fetching live bridge state directly from the Midnight contract indexer." />
    ) : (
      <ErrorComponent message={error ?? 'Unable to reach the BridgeGuard backend.'} onRetry={refresh} />
    );
  }

  const bridges = state.ledger.bridges;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total TVL across bridges', value: `$${fmtCompact(String(totalTvl))}`, animate: false },
          { label: 'Bridges needing attention', value: String(thinCount), animate: true },
          { label: 'Bridges flagged on-chain', value: String(flaggedCount), animate: true },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="card p-5"
          >
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {s.label}
            </div>
            <div className="mt-1.5 font-mono text-2xl font-bold text-slate-900 dark:text-white">
              {s.animate ? <AnimatedCounter value={Number(s.value)} /> : s.value}
            </div>
          </motion.div>
        ))}
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Waves className="size-4 text-cyan-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              TVL by bridge
            </h2>
          </div>
          <Badge tone="cyan">on-chain snapshot</Badge>
        </div>
        <div className="mt-4">
          {loading ? (
            <EmptyState title="Loading…" body="Fetching bridge liquidity from the indexer." />
          ) : tvlSnapshot.length === 0 ? (
            <EmptyState
              icon={Waves}
              title="No data available"
              body="No bridges registered on-chain yet. Register a bridge to see its TVL here."
            />
          ) : (
            <TvlSnapshotChart data={tvlSnapshot} />
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Bridge liquidity snapshot
        </h2>
        {loading ? (
          <EmptyState title="Loading…" body="Fetching bridge liquidity from the indexer." />
        ) : bridges.length === 0 ? (
          <EmptyState icon={Waves} title="No bridges" body="Register a bridge to begin monitoring liquidity." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {bridges.map((b, i) => {
              const h = getLiquidityHealth(b);
              const tone = h.status === 'Thin' ? 'critical' : h.status === 'Stretched' ? 'warning' : 'success';
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -4 }}
                  className="card group p-5 transition-shadow duration-300 hover:shadow-glow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{b.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {chainName(b.srcChain)} → {chainName(b.dstChain)}
                      </p>
                    </div>
                    <Badge tone={tone}>{h.status}</Badge>
                  </div>

                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="font-mono text-xl font-bold text-slate-900 dark:text-white">
                        ${fmtCompact(b.tvl)}
                      </div>
                      <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        TVL
                      </div>
                    </div>
                    <div className="w-1/2">
                      <div className="mb-1 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Health score</span>
                        <span className="font-mono">{h.score}/100</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                        <div
                          className={`h-full rounded-full ${
                            h.status === 'Thin'
                              ? 'bg-gradient-to-r from-orange-400 to-red-400'
                              : h.status === 'Stretched'
                                ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                                : 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                          }`}
                          style={{ width: `${h.score}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {h.status !== 'Healthy' && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/5 px-3.5 py-2.5 text-xs text-amber-600 dark:text-amber-300">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                      {h.status === 'Thin'
                        ? 'Thin pool — large transfers risk significant price impact or loss.'
                        : 'Stretched liquidity — monitor before moving large amounts.'}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
