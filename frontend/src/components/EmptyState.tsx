import type { ComponentType } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  body: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white/50 px-6 py-14 text-center dark:border-white/10 dark:bg-midnight-800/40">
      <div className="grid size-14 place-items-center rounded-2xl bg-slate-200/60 text-slate-500 dark:bg-white/5 dark:text-slate-400">
        <Icon className="size-7" />
      </div>
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{body}</p>
      </div>
      {action}
    </div>
  );
}
