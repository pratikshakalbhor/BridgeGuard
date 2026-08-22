import { motion } from 'framer-motion';
import { cn } from '@/utils/format';

interface RiskSegment {
  label: string;
  value: number; // 0-100
  color: string;
  bgColor: string;
}

interface RiskRingProps {
  segments: RiskSegment[];
  size?: number;
  className?: string;
}

export function RiskRing({ segments, size = 280, className }: RiskRingProps) {
  const radius = size / 2 - 20;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div className={cn('inline-flex flex-col items-center', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label="Risk distribution by category">
          {segments.map((segment, index) => {
            const segmentLength = (segment.value / 100) * circumference;
            const dashArray = `${segmentLength} ${circumference - segmentLength}`;
            const dashOffset = -currentOffset;
            currentOffset += segmentLength;

            return (
              <motion.circle
                key={segment.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset + circumference}
                initial={{ strokeDashoffset: dashOffset + circumference, opacity: 0 }}
                animate={{ strokeDashoffset: dashOffset, opacity: 1 }}
                transition={{ delay: 0.1 + index * 0.08, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                style={{ filter: `drop-shadow(0 0 ${strokeWidth * 0.8}px ${segment.color})` }}
              />
            );
          })}
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Risk Distribution
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-white">
              {segments.reduce((sum, s) => sum + s.value, 0)}%
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Aggregate</p>
          </motion.div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm">
        {segments.map((segment) => (
          <motion.div
            key={segment.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + segments.indexOf(segment) * 0.05 }}
            className="flex items-center gap-1.5"
          >
            <span className="size-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="font-medium text-slate-700 dark:text-slate-300">{segment.label}</span>
            <span className="font-mono text-slate-500 dark:text-slate-400">{segment.value}%</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}