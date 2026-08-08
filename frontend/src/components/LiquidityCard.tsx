import { Waves } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn, fmtCompact } from '@/utils/format';

type LiquidityHealth = 'Healthy' | 'Stretched' | 'Thin';

interface LiquidityCardProps {
  tvl: string;
  health?: LiquidityHealth;
  utilization?: number; // 0..100
  poolShare?: number;
}

function healthTone(health?: LiquidityHealth) {
  if (health === 'Thin') return 'critical';
  if (health === 'Stretched') return 'warning';
  return 'success';
}

export function LiquidityCard({ tvl, health = 'Healthy', utilization, poolShare }: LiquidityCardProps) {
  const tone = healthTone(health);
  const utilizationValue = utilization ?? (health === 'Thin' ? 92 : health === 'Stretched' ? 68 : 34);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Waves className="size-4 text-cyan-400" />
          Liquidity health
        </div>
        <Badge tone={tone}>{health}</Badge>
      </div>

      <div className="mt-4">
        <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white">
          ${fmtCompact(tvl)}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">Total value locked</div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">Pool utilization</span>
          <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
            {utilizationValue}%
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700',
              tone === 'success' && 'bg-gradient-to-r from-emerald-400 to-cyan-400',
              tone === 'warning' && 'bg-gradient-to-r from-amber-400 to-orange-400',
              tone === 'critical' && 'bg-gradient-to-r from-orange-400 to-red-400',
            )}
            style={{ width: `${utilizationValue}%` }}
          />
        </div>
      </div>

      {poolShare !== undefined && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs dark:border-white/[0.07]">
          <span className="text-slate-500 dark:text-slate-400">Share of bridge market</span>
          <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
            {poolShare.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
