import { motion } from 'framer-motion';
import { cn } from '@/utils/format';

interface SecurityScoreProps {
  score: number;
  label: string;
  size?: number;
  className?: string;
}

function scoreTone(score: number): { color: string; bg: string; text: string; label: string } {
  if (score >= 80) return { color: '#34d399', bg: 'bg-emerald-400', text: 'text-emerald-400', label: 'LOW RISK' };
  if (score >= 60) return { color: '#fbbf24', bg: 'bg-amber-400', text: 'text-amber-400', label: 'ELEVATED' };
  if (score >= 40) return { color: '#fb923c', bg: 'bg-orange-400', text: 'text-orange-400', label: 'HIGH RISK' };
  return { color: '#f87171', bg: 'bg-red-400', text: 'text-red-400', label: 'CRITICAL' };
}

export function SecurityScore({ score, label, size = 200, className }: SecurityScoreProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const tone = scoreTone(clamped);
  const radius = size / 2 - 16;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = Math.max(6, size / 30);
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className={cn('inline-flex flex-col items-center', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`Security score: ${clamped} out of 100`}>
          <defs>
            <linearGradient id="score-track" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="score-fill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={tone.color} />
              <stop offset="100%" stopColor={tone.color} stopOpacity="0.6" />
            </linearGradient>
          </defs>
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth={strokeWidth}
          />
          {/* Subtle glow track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#score-track)"
            strokeOpacity="0.15"
            strokeWidth={strokeWidth}
          />
          {/* Animated fill */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#score-fill)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ filter: `drop-shadow(0 0 ${strokeWidth * 1.5}px ${tone.color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center"
          >
            <span className={cn('font-mono font-extrabold tabular-nums', `text-[${size / 5}px]`, tone.text)}>
              {clamped}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">
              / 100
            </span>
          </motion.div>
        </div>
      </div>
      <div className="mt-4 text-center">
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.3 }}
          className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider', `border-${tone.bg.replace('bg-', '')}/40 bg-${tone.bg.replace('bg-', '')}/10`, tone.text)}
        >
          <span className="size-1.5 rounded-full" style={{ backgroundColor: tone.color }} />
          {tone.label}
        </motion.span>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">{label}</p>
      </div>
    </div>
  );
}