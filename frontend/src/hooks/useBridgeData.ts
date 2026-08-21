import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type AppState } from '@/services/api';
import { nextBackoffDelayMs } from '@/utils/backoff';

interface UseBridgeDataResult {
  data: AppState | null;
  /** True ONLY before the very first successful fetch — never goes back to true */
  loading: boolean;
  /** True when data is present (ledger received at least once) */
  hasData: boolean;
  /** Non-null when the latest poll failed. data is still the last good snapshot. */
  error: string | null;
  /** True while polls are failing — UI should show a "reconnecting" state */
  retrying: boolean;
  /** True when the snapshot shown was served from the backend's cache (stale) */
  stale: boolean;
  refresh: () => Promise<void>;
}

// After 2 consecutive failures on the FIRST load (approx 3s total),
// stop the loading spinner and surface the error + retry button so the user is never stuck buffering.
const MAX_FIRST_LOAD_FAILURES = 2;

/**
 * Polls /api/state and exposes the latest snapshot with bounded exponential
 * backoff (1s → 2s → 4s → 8s → 15s max — never a request storm).
 *
 * Key production-grade behaviour:
 *  - `loading` is true ONLY while we are waiting for the very first response.
 *    After MAX_FIRST_LOAD_FAILURES retries it flips to false so the UI shows
 *    an error + retry button instead of hanging indefinitely.
 *  - Bounded backoff on EVERY failure, including after the first load.
 *  - Single-flight: a new poll aborts the previous in-flight request, and the
 *    AbortController is aborted on unmount so no zombie requests keep polling.
 *  - `error` is set on poll failure but `data` keeps the last good snapshot so
 *    the dashboard stays populated during transient network glitches.
 *  - `stale` reflects the backend's `stale` flag (indexer down, cached state
 *    served) or a locally-observed poll failure.
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
  const abortRef = useRef<AbortController | null>(null);

  // Forward-declare poll so scheduleNext can reference it.
  const pollRef = useRef<() => Promise<void>>();

  const scheduleNext = useCallback(
    (consecutiveFails: number) => {
      if (timer.current) clearTimeout(timer.current);
      // Fixed cadence while healthy; bounded exponential backoff while failing.
      const delay = consecutiveFails === 0 ? intervalMs : nextBackoffDelayMs(consecutiveFails);
      timer.current = setTimeout(() => void pollRef.current?.(), delay);
    },
    [intervalMs],
  );

  const poll = useCallback(async () => {
    // Single-flight: cancel any in-flight request before starting a new one.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const state = await api.getState(controller.signal);
      if (controller.signal.aborted) return; // unmounted/superseded — never schedule
      setData(state);
      setError(null);
      failCount.current = 0;
      if (!hasLoadedOnce.current) {
        hasLoadedOnce.current = true;
        setLoadedFlag(true);
      }
      scheduleNext(0);
    } catch (err) {
      if (controller.signal.aborted) return; // unmounted — do not schedule, do not flip states
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
      abortRef.current?.abort();
    };
  }, [poll]);

  const loading = !hasLoadedOnce.current && !loadedFlag;
  const hasData = !!data?.ledger;
  const retrying = error !== null;
  const stale = data?.stale === true || (hasData && error !== null);

  return { data, loading, hasData, error, retrying, stale, refresh };
}