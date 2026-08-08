import { BrainCircuit, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/format';
import type { Recommendation } from '@/utils/riskEngine';

interface AiRecommendationCardProps {
  recommendation: Recommendation;
  transferSafety?: number;
}

export function AiRecommendationCard({ recommendation, transferSafety }: AiRecommendationCardProps) {
  const safe = recommendation.action === 'Transfer now';
  const caution = recommendation.action === 'Transfer with caution';

  return (
    <div className="card relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <BrainCircuit className="size-4 text-violet-400" />
          AI recommendation
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge tone={safe ? 'success' : caution ? 'warning' : 'critical'} className="px-3 py-1">
            {recommendation.action}
          </Badge>
          {transferSafety !== undefined && (
            <span
              className={cn(
                'font-mono text-sm font-bold',
                transferSafety >= 70 ? 'text-emerald-400' : transferSafety >= 45 ? 'text-amber-400' : 'text-red-400',
              )}
            >
              {transferSafety}% transfer safety
            </span>
          )}
        </div>

        <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
          {recommendation.headline}
        </h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{recommendation.reason}</p>

        <ul className="mt-5 space-y-2.5">
          {recommendation.points.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200">
              {safe ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-amber-400" />
              )}
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
