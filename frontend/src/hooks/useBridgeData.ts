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

// Exponential backoff caps: 3s → 5s → 10s → 20s
const BACKOFF_STEPS_MS = [3_000, 5_000, 10_000, 20_000];
// After 2 consecutive failures on the FIRST load (approx 3s total),
// stop the loading spinner and surface the error + retry button so the user is never stuck buffering.
const MAX_FIRST_LOAD_FAILURES = 2;

/**
 * Polls /api/state and exposes the latest snapshot with exponential backoff.
 *
 * Key production-grade behaviour:
 *  - `loading` is true ONLY while we are waiting for the very first response.
 *    After MAX_FIRST_LOAD_FAILURES retries it flips to false so the UI shows
 *    an error + retry button instead of hanging indefinitely.
 *  - Exponential backoff on failure: 5 → 10 → 20 → 30 s (avoids hammering
 *    the Render backend during cold starts / CORS-less 502 windows).
 *  - `error` is set on poll failure but `data` keeps the last good snapshot so
 *    the dashboard stays populated during transient network glitches.
 *  - `hasData` is true once `ledger` has been received at least once.
 *  - Window focus triggers a refresh so the dashboard stays current.
 */
export function useBridgeData(intervalMs = 30_000): UseBridgeDataResult {
  const [data, setData] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  // hasLoadedOnce tracks whether we have received ANY successful response yet.
  const hasLoadedOnce = useRef(false);
  // Force re-render when hasLoadedOnce flips.
  const [loadedFlag, setLoadedFlag] = useState(false);
  // Consecutive failure counter — resets to 0 on success.
  const failCount = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Forward-declare poll so scheduleNext can reference it.
  const pollRef = useRef<() => Promise<void>>();

  const scheduleNext = useCallback(
    (consecutiveFails: number) => {
      if (timer.current) clearTimeout(timer.current);
      // Use backoff only while we have no data yet; once live, keep fixed interval.
      const delay = hasLoadedOnce.current
        ? intervalMs
        : (BACKOFF_STEPS_MS[Math.min(consecutiveFails, BACKOFF_STEPS_MS.length - 1)] ?? intervalMs);
      timer.current = setTimeout(() => void pollRef.current?.(), delay);
    },
    [intervalMs],
  );

  const poll = useCallback(async () => {
    try {
      const state = await api.getState();
      setData(state);
      setError(null);
      failCount.current = 0;
      if (!hasLoadedOnce.current) {
        hasLoadedOnce.current = true;
        setLoadedFlag(true);
      }
      scheduleNext(0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failCount.current += 1;
      setError(msg);
      // After MAX_FIRST_LOAD_FAILURES on first load, surface the error
      // so the user sees a retry button instead of the spinner forever.
      if (!hasLoadedOnce.current && failCount.current >= MAX_FIRST_LOAD_FAILURES) {
        hasLoadedOnce.current = true;
        setLoadedFlag(true);
      }
      scheduleNext(failCount.current);
    }
  }, [scheduleNext]);

  // Keep ref up to date so the scheduled timeout always calls the latest version.
  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  const refresh = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    failCount.current = 0;
    await poll();
  }, [poll]);

  useEffect(() => {
    void poll();
    const onFocus = () => {
      if (timer.current) clearTimeout(timer.current);
      void poll();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener('focus', onFocus);
    };
  }, [poll]);

  const loading = !hasLoadedOnce.current && !loadedFlag;
  const hasData = !!data?.ledger;

  return { data, loading, hasData, error, refresh };
}
