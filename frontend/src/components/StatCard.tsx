import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/format';

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: string;
  icon: LucideIcon;
  tone?: 'cyan' | 'violet' | 'success' | 'warning' | 'danger';
  loading?: boolean;
}

const toneClasses: Record<NonNullable<StatCardProps['tone']>, string> = {
  cyan: 'from-cyan-400/20 to-cyan-400/5 text-cyan-500',
  violet: 'from-violet-400/20 to-violet-400/5 text-violet-400',
  success: 'from-emerald-400/20 to-emerald-400/5 text-emerald-400',
  warning: 'from-amber-400/20 to-amber-400/5 text-amber-400',
  danger: 'from-red-400/20 to-red-400/5 text-red-400',
};

export function StatCard({ label, value, sub, icon: Icon, tone = 'cyan', loading }: StatCardProps) {
  return (
    <div className="card group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </p>
          {loading ? (
            <div className="mt-2 h-7 w-24 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
          ) : (
            <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 dark:text-white">
              {value}
            </p>
          )}
          {sub && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
        </div>
        <div
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110',
            toneClasses[tone],
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}
