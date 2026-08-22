import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  FiCheckCircle,
  FiFlag,
  FiRefreshCw,
  FiAlertTriangle,
} from 'react-icons/fi';
import { Activity, ShieldAlert, ShieldCheck, AlertCircle, XCircle } from 'lucide-react';
import { AlertCard, type AlertItem, type AlertSeverity } from '@/components/AlertCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorComponent } from '@/components/ErrorComponent';
import { AnimatedCounter } from '@/components/motion/AnimatedCounter';
import { useAppData } from '@/hooks/useAppData';
import { deriveAlerts, deriveOnChainActivity } from '@/utils/deriveData';
import { cn, shortAddress } from '@/utils/format';
import { flagBridge, getSecurityStatus, getLiquidityHealth } from '@/services/midnight';

type Filter = 'all' | AlertSeverity;

const FILTERS: Filter[] = ['all', 'critical', 'high', 'medium', 'low'];

const STATUS_OPTIONS = [
  { value: 0, label: 'ACTIVE' },
  { value: 1, label: 'FLAGGED' },
  { value: 2, label: 'COMPROMISED' },
];

export function Security() {
  const { state, loading, error, refresh } = useAppData();
  const [filter, setFilter] = useState<Filter>('all');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [flagBridgeId, setFlagBridgeId] = useState('');
  const [flagStatus, setFlagStatus] = useState(1);
  const [flagging, setFlagging] = useState(false);

  const derivedAlerts = useMemo(() => (state ? deriveAlerts(state) : []), [state]);
  const activity = useMemo(() => (state ? deriveOnChainActivity(state) : []), [state]);

  useEffect(() => {
    setAlerts(derivedAlerts);
  }, [derivedAlerts]);

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

  const visibleAlerts = filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter);
  const openCount = alerts.filter((a) => a.status === 'open').length;

  const onWatchCount = useMemo(
    () => (state?.ledger.bridges ?? []).filter((b) => Number(b.status) !== 0).length,
    [state],
  );

  const unauditedCount = useMemo(
    () => (state?.ledger.bridges ?? []).filter((b) => Number(b.audited) === 0).length,
    [state],
  );

  // Bridge security scores for breakdown section
  const bridgeSecurityScores = useMemo(() => {
    if (!state) return [];
    return state.ledger.bridges.map((b) => {
      const security = getSecurityStatus(b);
      const liquidity = getLiquidityHealth(b);
      const verdictNum = state.ledger.latestVerdicts.find((v) => v.key === b.id)?.value ?? 0;
      
      // Calculate score breakdown
      const auditScore = Number(b.audited) === 1 ? 100 : 60;
      const incidentScore = Math.max(0, 100 - Number(b.incidents) * 15);
      const statusScore = Number(b.status) === 0 ? 100 : Number(b.status) === 1 ? 50 : 10;
      const liquidityScore = liquidity.score;
      
      const overallScore = Math.round(
        (auditScore * 0.3 + incidentScore * 0.3 + statusScore * 0.2 + liquidityScore * 0.2)
      );
      
      return {
        bridge: b,
        security,
        liquidity,
        verdictNum: Number(verdictNum),
        overallScore,
        auditScore,
        incidentScore,
        statusScore,
        liquidityScore,
        verdictLabel: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Number(verdictNum)] ?? '—',
      };
    }).sort((a, b) => a.overallScore - b.overallScore); // Worst first
  }, [state]);

  // Why risky explanations for high/critical bridges
  const whyRisky = useMemo(() => {
    if (!state) return [];
    return state.ledger.bridges
      .filter((b) => {
        const verdictNum = state.ledger.latestVerdicts.find((v) => v.key === b.id)?.value ?? 0;
        return Number(verdictNum) >= 2; // HIGH or CRITICAL
      })
      .map((b) => {
        const verdictNum = state.ledger.latestVerdicts.find((v) => v.key === b.id)?.value ?? 0;
        const reasons: string[] = [];
        
        if (Number(b.status) === 2) reasons.push('Bridge marked COMPROMISED on-chain');
        else if (Number(b.status) === 1) reasons.push('Bridge flagged for elevated risk');
        
        if (Number(b.incidents) >= 5) reasons.push(`${Number(b.incidents)} public incidents recorded`);
        else if (Number(b.incidents) >= 3) reasons.push(`${Number(b.incidents)} public incidents recorded`);
        
        if (Number(b.audited) !== 1) reasons.push('No independent audit on record');
        
        const liquidity = getLiquidityHealth(b);
        if (liquidity.status === 'Thin') reasons.push('Liquidity is thin relative to typical transfer sizes');
        
        if (reasons.length === 0) {
          reasons.push('Risk score elevated due to combined factors');
        }
        
        return {
          bridge: b,
          verdictLabel: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Number(verdictNum)] ?? '—',
          reasons,
        };
      });
  }, [state]);

  const acknowledgeAll = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, status: 'acknowledged' as const })));
    toast.success('All security alerts acknowledged');
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
      <EmptyState title="Reading ZeroBridge state…" body="Fetching live bridge state directly from the Midnight contract indexer." />
    ) : (
      <ErrorComponent message={error ?? 'Unable to reach the ZeroBridge backend.'} onRetry={refresh} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>Open Security Alerts</span>
            <ShieldAlert className="size-4 text-rose-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-white">
            <AnimatedCounter value={openCount} />
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">sourced from registry and intel feed</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>Bridges On Watch</span>
            <FiFlag className="size-4 text-amber-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-white">
            <AnimatedCounter value={onWatchCount} />
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">flagged or compromised status</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>Unaudited Bridges</span>
            <FiAlertTriangle className="size-4 text-amber-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-white">
            <AnimatedCounter value={unauditedCount} />
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">lacking formal audit verification</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>On-Chain Activity</span>
            <Activity className="size-4 text-cyan-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-white">
            <AnimatedCounter value={activity.length} />
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">tracked state changes</p>
        </motion.div>
      </section>

      {/* Security Alerts Section */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Security Alerts & Incident Feed</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live threat intelligence, audit flags, and threshold warnings from the Midnight contract state
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-1 dark:border-white/10">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                    filter === f
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
                  )}
                >
                  {f} ({counts[f]})
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={acknowledgeAll} disabled={alerts.length === 0}>
              <FiCheckCircle className="size-3.5" />
              Ack All
            </Button>
          </div>
        </div>

        {visibleAlerts.length === 0 ? (
          <EmptyState
            icon={FiCheckCircle}
            title="All clear"
            body="No active security alerts match your selected filter."
          />
        ) : (
          <div className="space-y-3">
            {visibleAlerts.map((a) => (
              <AlertCard key={a.id} alert={a} />
            ))}
          </div>
        )}
      </section>

      {/* Authority Bridge Flagging Form */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/[0.08]">
          <div className="flex items-center gap-2">
            <FiFlag className="size-4 text-cyan-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
              Bridge Security Flagging Authority
            </h2>
          </div>
          <Badge tone="violet">Contract Authority Action</Badge>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Execute an authorized on-chain state update to flag a bridge as <code className="text-cyan-400">ACTIVE</code>, <code className="text-amber-400">FLAGGED</code>, or <code className="text-rose-400">COMPROMISED</code>.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={flagBridgeId}
            onChange={(e) => setFlagBridgeId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 dark:border-white/10 dark:bg-midnight-900 dark:text-white"
          >
            {state.ledger.bridges.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.id})
              </option>
            ))}
          </select>

          <select
            value={flagStatus}
            onChange={(e) => setFlagStatus(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 dark:border-white/10 dark:bg-midnight-900 dark:text-white"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                Set Status: {s.label}
              </option>
            ))}
          </select>

          <Button
            size="sm"
            loading={flagging}
            onClick={runFlag}
            className="border-cyan-400/40 bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20 dark:text-cyan-300"
          >
            <FiFlag className="size-3.5" />
            Update Status On-Chain
          </Button>

          <Button size="sm" variant="ghost" onClick={refresh}>
            <FiRefreshCw className="size-3.5" />
            Refresh State
          </Button>
        </div>
      </section>

      {/* Bridge Security Score Breakdown */}
      {bridgeSecurityScores.length > 0 && (
        <section className="card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/[0.08]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-cyan-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                Bridge Security Score
              </h2>
            </div>
            <Badge tone="cyan">from registry data</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Composite score derived from on-chain registry: contract risk, incident history, liquidity, registry status, and audit status.
            Lower score = higher risk. Scores show when data is available; "Data unavailable" when insufficient on-chain data.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 dark:border-white/[0.08] dark:text-slate-400">
                  <th className="px-4 py-3 font-medium">Bridge</th>
                  <th className="px-4 py-3 font-medium text-center">Overall</th>
                  <th className="px-4 py-3 font-medium text-center">Contract Risk</th>
                  <th className="px-4 py-3 font-medium text-center">Incident History</th>
                  <th className="px-4 py-3 font-medium text-center">Liquidity</th>
                  <th className="px-4 py-3 font-medium text-center">Registry Status</th>
                  <th className="px-4 py-3 font-medium text-center">Audit Status</th>
                  <th className="px-4 py-3 font-medium text-center">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06]">
                {bridgeSecurityScores.map((item) => (
                  <tr key={item.bridge.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.bridge.name}</td>
                    <td className="px-4 py-3 text-center font-mono font-bold">
                      {item.overallScore}/100
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge tone={item.auditScore >= 80 ? 'success' : item.auditScore >= 50 ? 'warning' : 'critical'}>
                        {item.auditScore}/100
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge tone={item.incidentScore >= 80 ? 'success' : item.incidentScore >= 50 ? 'warning' : 'critical'}>
                        {item.incidentScore}/100
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge tone={item.liquidityScore >= 60 ? 'success' : item.liquidityScore >= 35 ? 'warning' : 'critical'}>
                        {item.liquidityScore}/100
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge tone={item.statusScore >= 80 ? 'success' : item.statusScore >= 50 ? 'warning' : 'critical'}>
                        {item.statusScore}/100
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge tone={Number(item.bridge.audited) === 1 ? 'success' : 'warning'}>
                        {Number(item.bridge.audited) === 1 ? 'Audited' : 'Unaudited'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge tone={item.verdictNum === 0 ? 'success' : item.verdictNum === 1 ? 'warning' : item.verdictNum === 2 ? 'danger' : 'critical'}>
                        {item.verdictLabel}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Why This Is Risky - for HIGH/CRITICAL verdicts */}
      {whyRisky.length > 0 && (
        <section className="card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/[0.08]">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 text-rose-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                Why This Is Risky
              </h2>
            </div>
            <Badge tone="critical">HIGH/CRITICAL verdicts only</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Human-readable explanations for every bridge with a HIGH or CRITICAL verdict. The system does not guarantee safety — these are risk indicators derived from on-chain data.
          </p>
          <div className="space-y-3">
            {whyRisky.map((item, i) => (
              <motion.div
                key={item.bridge.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="rounded-xl border border-rose-400/30 bg-rose-400/5 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900 dark:text-white">{item.bridge.name}</p>
                  <Badge tone={item.verdictLabel === 'HIGH' ? 'danger' : 'critical'}>
                    {item.verdictLabel}
                  </Badge>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {item.reasons.map((reason, ri) => (
                    <li key={ri} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <XCircle className="size-4 shrink-0 text-rose-500 mt-0.5" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* On-Chain Activity & Transfer Security Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Bridge On-Chain Activity & Verification Log
          </h2>
          <Badge tone="cyan">{activity.filter((a) => a.txId).length} verified transactions</Badge>
        </div>

        {activity.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity recorded"
            body="No bridge activities recorded in the indexer yet."
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
                  <th className="px-5 py-3.5 font-medium">Last Tx Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06]">
                {activity.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                    <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                      {row.bridgeName}
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                      {row.route}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-xs font-bold text-slate-900 dark:text-white">
                      ${row.tvl.toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        tone={
                          row.status === 'ACTIVE'
                            ? 'success'
                            : row.status === 'FLAGGED'
                              ? 'warning'
                              : 'critical'
                        }
                      >
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-xs font-mono">
                      <span className={cn('font-semibold', row.verdict === 'LOW' ? 'text-emerald-500' : row.verdict === 'MEDIUM' ? 'text-amber-500' : 'text-rose-500')}>
                        {row.verdict ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {row.txId ? shortAddress(row.txId, 8, 8) : 'Genesis'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
