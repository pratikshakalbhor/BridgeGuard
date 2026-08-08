import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useBridgeData } from '@/hooks/useBridgeData';
import type { AppState } from '@/services/api';

interface AppDataValue {
  data: AppState | null;
  /** Live data source (backend reachable). True only once /api/state has responded. */
  live: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** On-chain snapshot from the deployed Midnight contract, or null while loading / on failure. */
  state: AppState | null;
}

const AppDataContext = createContext<AppDataValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, refresh } = useBridgeData(5000);

  const value: AppDataValue = {
    data,
    live: data !== null,
    loading,
    error,
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
