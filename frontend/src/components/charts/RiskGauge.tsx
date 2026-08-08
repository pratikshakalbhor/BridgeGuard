import { motion } from 'framer-motion';
import { cn } from '@/utils/format';

interface RiskGaugeProps {
  value: number; // 0..100
  label?: string;
  size?: number;
  className?: string;
}

function toneOf(value: number): { color: string; text: string } {
  if (value >= 75) return { color: '#f87171', text: 'text-red-400' };
  if (value >= 55) return { color: '#fb923c', text: 'text-orange-400' };
  if (value >= 30) return { color: '#fbbf24', text: 'text-amber-400' };
  return { color: '#34d399', text: 'text-emerald-400' };
}

/** Animated circular risk gauge with a sweep fill and live percentage. */
export function RiskGauge({ value, label, size = 180, className }: RiskGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const tone = toneOf(clamped);

  return (
    <div className={cn('inline-flex flex-col items-center', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id="risk-gauge-track" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="10"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#risk-gauge-track)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            whileInView={{ strokeDashoffset: circumference * (1 - clamped / 100) }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-mono text-3xl font-extrabold', tone.text)}>{clamped}</span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400">
            / 100
          </span>
        </div>
      </div>
      {label && (
        <div className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{label}</div>
      )}
    </div>
  );
}
