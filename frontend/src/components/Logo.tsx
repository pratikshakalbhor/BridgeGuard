import { cn } from '@/utils/format';

interface LogoProps {
  className?: string;
  withText?: boolean;
}

export function Logo({ className, withText = true }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 shadow-glow">
        <svg viewBox="0 0 32 32" className="size-6" fill="none" aria-hidden="true">
          <path
            d="M7 9.5 16 6l9 3.5v6.2c0 4.6-3.4 8.4-9 10.3-5.6-1.9-9-5.7-9-10.3V9.5Z"
            stroke="#04060d"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path
            d="m11.5 15.5 3 3 6-6"
            stroke="#04060d"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {withText && (
        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          BridgeGuard<span className="text-cyan-500"> AI</span>
        </span>
      )}
    </span>
  );
}
