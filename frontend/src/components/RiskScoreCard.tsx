import { Gauge } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { RiskMeter } from '@/components/RiskMeter';
import { cn } from '@/utils/format';
import { riskLevel, verdictTone } from '@/utils/constants';
import type { VerdictTone } from '@/utils/constants';

interface RiskScoreCardProps {
  score: number;
  verdict?: number;
  verdictLabel?: string;
  incidents?: number;
  audited?: boolean;
  compact?: boolean;
}

const toneBadge: Record<VerdictTone, 'success' | 'warning' | 'danger' | 'critical' | 'neutral'> = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  critical: 'critical',
  neutral: 'neutral',
};

export function RiskScoreCard({
  score,
  verdict,
  verdictLabel,
  incidents,
  audited,
  compact,
}: RiskScoreCardProps) {
  const level = riskLevel(score);
  const tone = verdict !== undefined ? verdictTone(verdict) : level.tone;

  return (
    <div className="card relative overflow-hidden p-6">
      <div
        className={cn(
          'pointer-events-none absolute -right-14 -top-14 size-40 rounded-full blur-3xl',
          tone === 'critical' && 'bg-red-400/10',
          tone === 'danger' && 'bg-orange-400/10',
          tone === 'warning' && 'bg-amber-400/10',
          (tone === 'success' || tone === 'neutral') && 'bg-emerald-400/10',
        )}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Gauge className="size-4 text-cyan-400" />
            Risk score
          </div>
          <Badge tone={toneBadge[tone]}>
            {verdictLabel ?? level.label}
          </Badge>
        </div>

        <div className="mt-4 flex justify-center">
          <RiskMeter score={score} size={compact ? 'sm' : 'md'} label="Composite risk" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          {incidents !== undefined && (
            <div className="rounded-xl border border-slate-200 bg-white/60 py-2.5 dark:border-white/[0.07] dark:bg-midnight-900/50">
              <div className="font-mono text-lg font-bold text-slate-900 dark:text-white">{incidents}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Public incidents
              </div>
            </div>
          )}
          {audited !== undefined && (
            <div className="rounded-xl border border-slate-200 bg-white/60 py-2.5 dark:border-white/[0.07] dark:bg-midnight-900/50">
              <div className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                {audited ? 'Yes' : 'No'}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Audited
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
