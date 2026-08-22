import { motion } from 'framer-motion';
import { cn } from '@/utils/format';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose';
  trend?: { value: number; label: string };
  className?: string;
  loading?: boolean;
}

const toneStyles: Record<NonNullable<MetricCardProps['tone']>, { icon: string; text: string; border: string; bg: string }> = {
  cyan: { icon: 'text-cyan-500', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-400/30', bg: 'bg-cyan-400/10' },
  violet: { icon: 'text-violet-500', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-400/30', bg: 'bg-violet-400/10' },
  emerald: { icon: 'text-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-400/30', bg: 'bg-emerald-400/10' },
  amber: { icon: 'text-amber-500', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-400/30', bg: 'bg-amber-400/10' },
  rose: { icon: 'text-rose-500', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-400/30', bg: 'bg-rose-400/10' },
};

export function MetricCard({ label, value, icon: Icon, tone = 'cyan', trend, className, loading }: MetricCardProps) {
  const styles = toneStyles[tone];

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('card p-5', className)}
      >
        <div className="flex items-center justify-between">
          <div className="h-4 w-12 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
          <div className="size-10 animate-pulse rounded-xl" style={{ backgroundColor: styles.icon.replace('text-', 'bg-').replace('500', '100') }} />
        </div>
        <div className="mt-3 h-8 w-24 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
        <div className="mt-2 h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('card p-5 transition-all hover:shadow-glow hover:border-cyan-400/20', className)}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
        <div className={cn('grid size-10 place-items-center rounded-xl', styles.bg, styles.border)}>
          <Icon className={cn('size-5', styles.icon)} />
        </div>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</span>
        {trend && (
          <span className={cn('font-mono text-xs font-semibold mb-1', trend.value >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </span>
        )}
      </div>
    </motion.div>
  );
}