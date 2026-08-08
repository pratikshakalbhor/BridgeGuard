import { AlertTriangle, BellRing, Info, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/format';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface AlertItem {
  id: number;
  severity: AlertSeverity;
  title: string;
  body: string;
  source: string;
  timeAgo: string;
  status?: 'open' | 'acknowledged';
}

const severityMeta: Record<AlertSeverity, { icon: typeof AlertTriangle; tone: 'critical' | 'danger' | 'warning' | 'neutral'; ring: string }> = {
  critical: { icon: ShieldAlert, tone: 'critical', ring: 'border-red-400/30 bg-red-400/10 text-red-400' },
  high: { icon: AlertTriangle, tone: 'danger', ring: 'border-orange-400/30 bg-orange-400/10 text-orange-400' },
  medium: { icon: BellRing, tone: 'warning', ring: 'border-amber-400/30 bg-amber-400/10 text-amber-400' },
  low: { icon: Info, tone: 'neutral', ring: 'border-slate-400/30 bg-slate-400/10 text-slate-400' },
};

interface AlertCardProps {
  alert: AlertItem;
}

export function AlertCard({ alert }: AlertCardProps) {
  const meta = severityMeta[alert.severity];
  return (
    <div
      className={cn(
        'card group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card',
        alert.status === 'acknowledged' && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn('grid size-10 shrink-0 place-items-center rounded-xl border', meta.ring)}>
          <meta.icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{alert.title}</h3>
            <Badge tone={meta.tone}>{alert.severity}</Badge>
            {alert.status === 'acknowledged' && <Badge tone="neutral">acknowledged</Badge>}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {alert.body}
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
              <ShieldAlert className="size-3.5" />
              {alert.source}
            </span>
            <span>{alert.timeAgo}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
