import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type AppState } from '@/services/api';

interface UseBridgeDataResult {
  data: AppState | null;
  /** True ONLY before the very first successful fetch — never goes back to true */
  loading: boolean;
  /** True when data is present (ledger received at least once) */
  hasData: boolean;
  /** Non-null when the latest poll failed. data is still the last good snapshot. */
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Polls /api/state every `intervalMs` and exposes the latest snapshot.
 *
 * Key production-grade behaviour:
 *  - `loading` is true ONLY while we are waiting for the very first response.
 *    After that it is permanently false — a later poll failure never resets the UI.
 *  - `error` is set on poll failure but `data` keeps the last good snapshot so
 *    the dashboard stays populated during transient network glitches.
 *  - `hasData` is true once `ledger` has been received at least once.
 *  - Window focus triggers a refresh so the dashboard stays current.
 */
export function useBridgeData(intervalMs = 5000): UseBridgeDataResult {
  const [data, setData] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  // hasLoadedOnce tracks whether we have received ANY successful response yet.
  const hasLoadedOnce = useRef(false);
  // Force re-render when hasLoadedOnce flips (useRef alone does not trigger renders).
  const [loadedFlag, setLoadedFlag] = useState(false);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const state = await api.getState();
      setData(state);
      setError(null);
      if (!hasLoadedOnce.current) {
        hasLoadedOnce.current = true;
        setLoadedFlag(true); // trigger re-render so isLoading flips to false
      }
    } catch (err) {
      // Keep previous data — only update the error banner
      setError(err instanceof Error ? err.message : String(err));
      // If this is the very first call and it failed, hasLoadedOnce stays false
      // so the loading screen remains (we have nothing to show yet).
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

  // Loading is true only while we have never received a successful response.
  const loading = !hasLoadedOnce.current && !loadedFlag;
  const hasData = !!data?.ledger;

  return { data, loading, hasData, error, refresh };
}
