import type { ReactNode } from 'react';
import { cn } from '@/utils/format';

type Tone = 'cyan' | 'violet' | 'success' | 'warning' | 'danger' | 'critical' | 'neutral';

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

const toneClasses: Record<Tone, string> = {
  cyan: 'bg-cyan-400/10 text-cyan-600 dark:text-cyan-300 border-cyan-400/30',
  violet: 'bg-violet-400/10 text-violet-600 dark:text-violet-300 border-violet-400/30',
  success: 'bg-emerald-400/10 text-emerald-600 dark:text-emerald-300 border-emerald-400/30',
  warning: 'bg-amber-400/10 text-amber-600 dark:text-amber-300 border-amber-400/30',
  danger: 'bg-orange-400/10 text-orange-600 dark:text-orange-300 border-orange-400/30',
  critical: 'bg-red-400/10 text-red-600 dark:text-red-300 border-red-400/30',
  neutral: 'bg-slate-400/10 text-slate-600 dark:text-slate-300 border-slate-400/30',
};

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
