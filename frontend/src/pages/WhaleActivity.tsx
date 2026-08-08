import { useMemo } from 'react';
import { Activity, Fish, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/EmptyState';
import { ErrorComponent } from '@/components/ErrorComponent';
import { AnimatedCounter } from '@/components/motion/AnimatedCounter';
import { useAppData } from '@/hooks/useAppData';
import { fmtCompact } from '@/utils/format';
import { deriveOnChainActivity } from '@/utils/deriveData';
import { cn, shortAddress } from '@/utils/format';

export function WhaleActivity() {
  const { state, loading, error, refresh } = useAppData();

  const activity = useMemo(() => (state ? deriveOnChainActivity(state) : []), [state]);

  const registered = Number(state?.ledger.registryCount ?? 0);
  const assessments = Number(state?.ledger.assessmentCount ?? 0);
  const onWatch = useMemo(
    () => (state?.ledger.bridges ?? []).filter((b) => Number(b.status) !== 0).length,
    [state],
  );
  const withTx = activity.filter((a) => a.txId !== null).length;

  if (!state) {
    return loading ? (
      <EmptyState title="Loading registry…" body="Fetching activity from the indexer." />
    ) : (
      <ErrorComponent message={error ?? 'Unable to reach the BridgeGuard backend.'} onRetry={refresh} />
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Bridges registered', value: registered, animate: true },
          { label: 'Assessments on-chain', value: assessments, animate: true },
          { label: 'Bridges on watch', value: onWatch, animate: true },
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
              {s.animate ? <AnimatedCounter value={s.value} /> : s.value}
            </div>
          </motion.div>
        ))}
      </section>

      <section className="card p-6">
        <div className="flex items-center gap-2">
          <Fish className="size-4 text-cyan-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Whale flow monitoring
          </h2>
        </div>
        <div className="mt-4">
          <EmptyState
            icon={Fish}
            title="No data available"
            body="The BridgeGuard contract does not track whale transfers — only registry, verdict and flag state is stored on-chain. The table below shows the real on-chain activity BridgeGuard records for every registered bridge."
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Latest on-chain activity
          </h2>
          <Badge tone="cyan">
            {withTx} tx tracked
          </Badge>
        </div>
        {activity.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No data available"
            body="No bridges registered on-chain yet. Register a bridge to start tracking its activity."
          />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 dark:border-white/[0.08] dark:text-slate-400">
                  <th className="px-5 py-3.5 font-medium">Bridge</th>
                  <th className="px-5 py-3.5 font-medium">Route</th>
                  <th className="px-5 py-3.5 text-right font-medium">TVL</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium">Verdict</th>
                  <th className="px-5 py-3.5 font-medium">Last tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                {activity.map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                    <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                      {a.bridgeName}
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{a.route}</td>
                    <td className="px-5 py-4 text-right font-mono font-semibold text-slate-900 dark:text-white">
                      ${fmtCompact(String(a.tvl))}
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={a.status === 'ACTIVE' ? 'success' : a.status === 'FLAGGED' ? 'warning' : 'critical'}>
                        {a.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        tone={
                          a.verdict === 'LOW'
                            ? 'success'
                            : a.verdict === 'MEDIUM'
                              ? 'warning'
                              : a.verdict === 'HIGH'
                                ? 'danger'
                                : a.verdict === 'CRITICAL'
                                  ? 'critical'
                                  : 'neutral'
                        }
                      >
                        {a.verdict ?? '—'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          'font-mono text-xs',
                          a.txId ? 'text-cyan-600 dark:text-cyan-300' : 'text-slate-400 dark:text-slate-600',
                        )}
                        title={a.txId ?? undefined}
                      >
                        {a.txId ? shortAddress(a.txId, 10, 6) : 'No contract tx yet'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/5 px-4 py-3 text-xs text-violet-600 dark:text-violet-300">
        <ShieldAlert className="size-3.5 shrink-0" />
        Activity shown here is the real last transaction per bridge on the Midnight
        ledger (registration, evaluation or flag). Transactions reset when the backend
        restarts — run any contract call to repopulate them.
      </div>
    </div>
  );
}
