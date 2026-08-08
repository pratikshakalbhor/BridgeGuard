import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { FiCheckCircle, FiFlag, FiRefreshCw } from 'react-icons/fi';
import { AlertCard, type AlertItem, type AlertSeverity } from '@/components/AlertCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorComponent } from '@/components/ErrorComponent';
import { useAppData } from '@/hooks/useAppData';
import { deriveAlerts } from '@/utils/deriveData';
import { cn } from '@/utils/format';
import { flagBridge } from '@/services/midnight';

type Filter = 'all' | AlertSeverity;

const FILTERS: Filter[] = ['all', 'critical', 'high', 'medium', 'low'];

const STATUS_OPTIONS = [
  { value: 0, label: 'ACTIVE' },
  { value: 1, label: 'FLAGGED' },
  { value: 2, label: 'COMPROMISED' },
];

export function Alerts() {
  const { state, loading, error, refresh } = useAppData();
  const [filter, setFilter] = useState<Filter>('all');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [flagBridgeId, setFlagBridgeId] = useState('');
  const [flagStatus, setFlagStatus] = useState(1);
  const [flagging, setFlagging] = useState(false);

  const derived = useMemo(() => (state ? deriveAlerts(state) : []), [state]);

  useEffect(() => {
    setAlerts(derived);
  }, [derived]);

  useEffect(() => {
    if (!flagBridgeId && state?.ledger.bridges.length) {
      setFlagBridgeId(state.ledger.bridges[0].id);
    }
  }, [state, flagBridgeId]);

  const counts = useMemo(() => {
    const out: Record<Filter, number> = { all: alerts.length, critical: 0, high: 0, medium: 0, low: 0 };
    for (const a of alerts) out[a.severity] += 1;
    return out;
  }, [alerts]);

  const visible = filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter);
  const openCount = alerts.filter((a) => a.status === 'open').length;

  const acknowledgeAll = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, status: 'acknowledged' as const })));
    toast.success('All alerts acknowledged');
  };

  const runFlag = async () => {
    if (!flagBridgeId) return;
    setFlagging(true);
    const bridge = state!.ledger.bridges.find((b) => b.id === flagBridgeId);
    const statusLabel = STATUS_OPTIONS.find((s) => s.value === flagStatus)?.label ?? 'ACTIVE';
    try {
      const result = await flagBridge({ bridgeId: flagBridgeId, status: flagStatus });
      toast.success(`${bridge?.name ?? 'Bridge'} flagged ${statusLabel}`, {
        description: `Tx ${result.txId} · block ${result.blockHeight}`,
      });
      await refresh();
    } catch (err) {
      toast.error('Flag failed', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setFlagging(false);
    }
  };

  if (!state) {
    return loading ? (
      <EmptyState title="Loading registry…" body="Fetching the on-chain registry and incidents." />
    ) : (
      <ErrorComponent message={error ?? 'Unable to reach the BridgeGuard backend.'} onRetry={refresh} />
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Security alerts & incidents</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {openCount} open · sourced from the on-chain registry and intel feed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-1 rounded-xl border border-slate-200 p-1 dark:border-white/10"
          >
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                  filter === f
                    ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
                )}
              >
                {f}
                <span className="ml-1 font-mono opacity-70">{counts[f]}</span>
              </button>
            ))}
          </motion.div>
          <Button variant="outline" onClick={acknowledgeAll} disabled={openCount === 0}>
            <FiCheckCircle className="size-4" />
            Acknowledge all
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Critical', value: counts.critical, tone: 'text-red-400' },
          { label: 'High', value: counts.high, tone: 'text-orange-400' },
          { label: 'Open now', value: openCount, tone: 'text-cyan-400' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="card flex items-center gap-4 p-5"
          >
            <div className={cn('grid size-11 place-items-center rounded-xl bg-white/5', s.tone)}>
              <span className="font-mono text-lg font-bold">{s.value}</span>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white">{s.value}</div>
              <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {s.label}
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      {visible.length === 0 ? (
        <EmptyState
          icon={FiCheckCircle}
          title="No alerts"
          body="No alerts match this filter. You are up to date."
        />
      ) : (
        <section className="space-y-3">
          {visible.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <AlertCard alert={a} />
            </motion.div>
          ))}
        </section>
      )}

      {/* Flag bridge — integrates the flagBridge contract function */}
      <section className="card p-6">
        <div className="flex items-center gap-2">
          <FiFlag className="size-4 text-red-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Update on-chain bridge status
          </h2>
          <Badge tone="success">flagBridge</Badge>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <label>
            <span className="label">Bridge</span>
            <select
              className="input"
              value={flagBridgeId}
              onChange={(e) => setFlagBridgeId(e.target.value)}
            >
              {state.ledger.bridges.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Status</span>
            <select
              className="input"
              value={flagStatus}
              onChange={(e) => setFlagStatus(Number(e.target.value))}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button onClick={runFlag} loading={flagging}>
              <FiRefreshCw className="size-4" />
              Flag on-chain
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Writes a new status through the <code className="font-mono">flagBridge</code> circuit.
          Flagging is a public registry action — everyone can verify the change.
        </p>
      </section>

      <div className="flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/5 px-4 py-3 text-xs text-violet-600 dark:text-violet-300">
        <Badge tone="violet">On-chain transparency</Badge>
        Status flags and coarse verdicts are written to the Midnight ledger and are
        visible to every observer — alerts here are derived from that public state.
      </div>
    </div>
  );
}
