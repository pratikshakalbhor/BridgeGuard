import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type HealthReport } from '@/services/api';

interface UseHealthResult {
  report: HealthReport | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Polls /api/health (real connectivity probes for the node, indexer, proof
 * server and contract) and exposes the latest report. Null report means the
 * backend itself is unreachable.
 */
export function useHealth(intervalMs = 10000): UseHealthResult {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await api.getHealth();
      setReport(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    timer.current = setInterval(() => void refresh(), intervalMs);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      if (timer.current) clearInterval(timer.current);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh, intervalMs]);

  return { report, loading, error, refresh };
}
