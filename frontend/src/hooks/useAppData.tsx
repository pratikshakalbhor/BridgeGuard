import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useBridgeData } from '@/hooks/useBridgeData';
import type { AppState } from '@/services/api';

interface AppDataValue {
  data: AppState | null;
  /** True once /api/state has responded with ledger data at least once. */
  live: boolean;
  /** True ONLY before the very first successful fetch — never resets to true after that. */
  loading: boolean;
  /** True when ledger data is present (data?.ledger exists). */
  hasData: boolean;
  /** Non-null when the latest poll failed. `data` still holds the last good snapshot. */
  error: string | null;
  /** True while polls are failing — the UI shows a "reconnecting" state. */
  retrying: boolean;
  /** True when the shown snapshot is stale (backend cache served, or last poll failed). */
  stale: boolean;
  refresh: () => Promise<void>;
  /** Alias for data — On-chain snapshot from the deployed Midnight contract. */
  state: AppState | null;
}

const AppDataContext = createContext<AppDataValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { data, loading, hasData, error, retrying, stale, refresh } = useBridgeData(15000);

  const value: AppDataValue = {
    data,
    live: hasData,
    loading,
    hasData,
    error,
    retrying,
    // stale = backend served its cache (stale flag) or the latest poll failed
    stale,
    refresh,
    state: data,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within an AppDataProvider');
  return ctx;
}
