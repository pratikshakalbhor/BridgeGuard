import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type AppState } from '@/services/api';

interface UseBridgeDataResult {
  data: AppState | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Polls /api/state every `intervalMs` and exposes the latest snapshot.
 * Data is also refreshed on window focus so the dashboard stays current.
 */
export function useBridgeData(intervalMs = 5000): UseBridgeDataResult {
  const [data, setData] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const state = await api.getState();
      setData(state);
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

  return { data, loading, error, refresh };
}
