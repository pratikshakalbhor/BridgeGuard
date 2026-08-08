import { cn } from '@/utils/format';
import type { VerdictTone } from '@/utils/constants';

interface RiskMeterProps {
  score: number; // 0..100
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const toneColor: Record<VerdictTone, string> = {
  success: '#34d399',
  warning: '#fbbf24',
  danger: '#fb923c',
  critical: '#f87171',
  neutral: '#94a3b8',
};

const sizeMap = {
  sm: { w: 140, h: 82, stroke: 10, label: 'text-xs' },
  md: { w: 200, h: 116, stroke: 14, label: 'text-sm' },
  lg: { w: 260, h: 148, stroke: 18, label: 'text-base' },
};

function toneOf(score: number): VerdictTone {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'danger';
  if (score >= 30) return 'warning';
  return 'success';
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function RiskMeter({ score, label, size = 'md', className }: RiskMeterProps) {
  const { w, h, stroke, label: labelClass } = sizeMap[size];
  const cx = w / 2;
  const cy = h;
  const r = cx - stroke / 2 - 4;
  const start = polar(cx, cy, r, 180);
  const end = polar(cx, cy, r, 0);
  const clamped = Math.max(0, Math.min(100, score));
  const fraction = clamped / 100;
  const color = toneColor[toneOf(clamped)];

  // Background arc
  const bgArc = `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;

  // Foreground arc: only render when fraction > 0
  let fgArc = '';
  if (fraction > 0) {
    const p1 = polar(cx, cy, r, 180);
    const p2 = polar(cx, cy, r, 180 - fraction * 180);
    const largeArc = 0;
    fgArc = `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 0 ${p2.x} ${p2.y}`;
  }

  // Needle
  const needleAngle = 180 - fraction * 180;
  const needle = polar(cx, cy, r * 0.78, needleAngle);

  const ticks = Array.from({ length: 11 }, (_, i) => {
    const t = polar(cx, cy, r + 2, 180 - (i / 10) * 180);
    return { x: t.x, y: t.y - 8, v: i * 10 };
  });

  return (
    <div className={cn('inline-flex flex-col items-center', className)}>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[16rem]" role="img" aria-label={label ?? 'Risk score'}>
        <defs>
          <linearGradient id={`meter-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="38%" stopColor="#fbbf24" />
            <stop offset="66%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
        </defs>
        <path d={bgArc} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth={stroke} strokeLinecap="round" />
        {fraction > 0 && (
          <path
            d={fgArc}
            fill="none"
            stroke={`url(#meter-${size})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            style={{ transition: 'd 0.6s ease' }}
          />
        )}
        {ticks.map((t) => (
          <text
            key={t.v}
            x={t.x}
            y={t.y}
            textAnchor="middle"
            className="fill-slate-400 dark:fill-slate-500"
            fontSize="8"
            fontFamily="JetBrains Mono, monospace"
          >
            {t.v}
          </text>
        ))}
        <line
          x1={cx}
          y1={cy}
          x2={needle.x}
          y2={needle.y}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          style={{ transition: 'all 0.6s ease' }}
        />
        <circle cx={cx} cy={cy} r={7} fill={color} />
      </svg>
      <div className={cn('text-center', labelClass)}>
        <div className="font-mono text-xl font-bold text-slate-900 dark:text-white">{clamped}</div>
        {label && <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>}
      </div>
    </div>
  );
}
