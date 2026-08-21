import { cn } from '@/utils/format';

interface LogoProps {
  className?: string;
  withText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, withText = true, size = 'md' }: LogoProps) {
  const iconSizes = {
    sm: 'size-7',
    md: 'size-9',
    lg: 'size-12',
  };

  const svgSizes = {
    sm: 'size-4',
    md: 'size-5.5',
    lg: 'size-7',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {/* Geometric Shield + Zero-Knowledge Node Bridge Symbol */}
      <span
        className={cn(
          'grid place-items-center rounded-xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-violet-600 shadow-glow transition-transform hover:scale-105',
          iconSizes[size],
        )}
      >
        <svg viewBox="0 0 32 32" className={cn(svgSizes[size])} fill="none" aria-hidden="true">
          {/* Outer Shield Outline */}
          <path
            d="M16 3L5 7.5V14.5C5 21.5 10 27.2 16 29C22 27.2 27 21.5 27 14.5V7.5L16 3Z"
            stroke="#04060d"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {/* Zero-Knowledge Privacy Ring */}
          <circle cx="16" cy="15" r="7" stroke="#04060d" strokeWidth="2" strokeDasharray="3 2" />
          {/* Bridge Connector Arc & Nodes */}
          <path d="M10 17C12 13 20 13 22 17" stroke="#04060d" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="10" cy="17" r="1.5" fill="#04060d" />
          <circle cx="22" cy="17" r="1.5" fill="#04060d" />
          <circle cx="16" cy="12" r="1.8" fill="#04060d" />
        </svg>
      </span>
      {withText && (
        <span className={cn('font-bold tracking-tight text-slate-900 dark:text-white', textSizes[size])}>
          Zero<span className="text-cyan-500">Bridge</span>
        </span>
      )}
    </span>
  );
}
