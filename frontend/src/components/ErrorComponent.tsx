import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ErrorComponentProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorComponent({ message, onRetry }: ErrorComponentProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-400/30 bg-red-400/5 px-6 py-12 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-red-400/15 text-red-400">
        <AlertTriangle className="size-7" />
      </div>
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">Connection issue</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
