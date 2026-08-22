import { cn, fmtCompact, shortAddress } from '@/utils/format';
import type { OnChainActivityRow } from '@/utils/deriveData';
import { Badge } from '@/components/ui/Badge';

interface OnChainActivityTableProps {
  data: OnChainActivityRow[];
  loading?: boolean;
}

const STATUS_TONES: Record<string, 'success' | 'warning' | 'critical' | 'neutral'> = {
  ACTIVE: 'success',
  FLAGGED: 'warning',
  COMPROMISED: 'critical',
};

const VERDICT_TONES: Record<string, 'success' | 'warning' | 'danger' | 'critical' | 'neutral'> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'critical',
};

export function OnChainActivityTable({ data, loading }: OnChainActivityTableProps) {
  if (loading) {
    return (
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
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                <td className="px-5 py-4"><div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-white/10" /></td>
                <td className="px-5 py-4"><div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-white/10" /></td>
                <td className="px-5 py-4 text-right"><div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-white/10" /></td>
                <td className="px-5 py-4"><div className="h-5 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" /></td>
                <td className="px-5 py-4"><div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-white/10" /></td>
                <td className="px-5 py-4"><div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-white/10" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card flex items-center justify-center py-12 text-sm text-slate-500 dark:text-slate-400">
        No on-chain activity recorded yet.
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 dark:border-white/[0.08] dark:text-slate-400">
            <th className="px-5 py-3.5 font-medium">Bridge</th>
            <th className="px-5 py-3.5 font-medium">Route</th>
            <th className="px-5 py-3.5 text-right font-medium">TVL</th>
            <th className="px-5 py-3.5 font-medium">Status</th>
            <th className="px-5 py-3.5 font-medium">Risk Verdict</th>
            <th className="px-5 py-3.5 font-medium">Last Transaction</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06]">
          {data.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
              <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">{row.bridgeName}</td>
              <td className="px-5 py-4 text-xs font-medium text-slate-600 dark:text-slate-300">{row.route}</td>
              <td className="px-5 py-4 text-right font-mono text-xs font-bold text-slate-900 dark:text-white">${fmtCompact(row.tvl)}</td>
              <td className="px-5 py-4">
                <Badge tone={STATUS_TONES[row.status] ?? 'neutral'}>{row.status}</Badge>
              </td>
              <td className="px-5 py-4 text-xs font-mono">
                <span className={cn('font-semibold', VERDICT_TONES[row.verdict ?? ''] ? `text-${VERDICT_TONES[row.verdict ?? ''].replace('critical', 'red').replace('danger', 'orange')}-500` : 'text-slate-500')}>
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
  );
}