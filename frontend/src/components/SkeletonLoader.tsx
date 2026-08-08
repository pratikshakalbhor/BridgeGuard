import { cn } from '@/utils/format';

interface SkeletonLoaderProps {
  className?: string;
  rows?: number;
  variant?: 'card' | 'text' | 'chart';
}

export function SkeletonLoader({ className, rows = 1, variant = 'text' }: SkeletonLoaderProps) {
  if (variant === 'card') {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-3 w-full rounded bg-slate-200 dark:bg-white/[0.06]" />
        <div className="h-3 w-5/6 rounded bg-slate-200 dark:bg-white/[0.06]" />
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className={cn('flex h-48 flex-col justify-end gap-2', className)}>
        {[70, 45, 90, 60, 80, 50, 65, 95].map((h, i) => (
          <div
            key={i}
            className="w-full rounded bg-slate-200 dark:bg-white/[0.07]"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-3 animate-pulse rounded bg-slate-200 dark:bg-white/[0.07]"
          style={{ width: `${100 - i * 12}%` }}
        />
      ))}
    </div>
  );
}
