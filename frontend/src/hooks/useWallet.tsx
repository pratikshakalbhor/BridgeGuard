import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  BRIDGEGUARD_NETWORK_ID,
  connectWallet,
  disconnectWallet,
  walletInstalled,
  restoreWalletSession,
} from '@/services/wallet';
import type { WalletSession } from '@/services/wallet';

export type WalletStatus = 'idle' | 'checking' | 'connecting' | 'connected' | 'error';

export interface WalletConnectResult {
  /** Live session on success, null on failure. */
  session: WalletSession | null;
  /** Exact error message from the wallet connect attempt (never a generic stub). */
  error: string | null;
}

interface WalletValue {
  /** Live session, set only after the wallet actually answered connect(). */
  session: WalletSession | null;
  status: WalletStatus;
  error: string | null;
  installed: boolean;
  /** Real unshielded Midnight address, or null while not connected. */
  address: string | null;
  connect: () => Promise<WalletConnectResult>;
  disconnect: () => void;
  clearError: () => void;
}

const WalletContext = createContext<WalletValue | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  // The BridgeGuard backend and contract run on Midnight Preprod (overridable
  // at build time via VITE_NETWORK_ID); the browser wallet must always be
  // requested on that same network. Deriving the network from transient
  // backend state caused the wallet to be asked for the wrong network
  // (e.g. "undeployed" from a stale backend), which never produced the
  // wallet authorization popup.
  const networkId = BRIDGEGUARD_NETWORK_ID;

  const [session, setSession] = useState<WalletSession | null>(null);
  const [status, setStatus] = useState<WalletStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const attempt = useRef(0);

  // Restore a prior session on load: only claim "connected" after the wallet
  // actually confirms the connection (never trust localStorage alone).
  useEffect(() => {
    if (!walletInstalled()) return;
    const stored = restoreWalletSession();
    if (!stored) return;
    if (stored.networkId !== networkId) {
      // Stale session persisted on another network — drop it so it can neither
      // fake a connection nor trigger an automatic connect on the wrong network.
      disconnectWallet();
      return;
    }
    const run = ++attempt.current;
    setStatus('checking');
    let settled = false;
    const timer = setTimeout(() => {
      if (settled || run !== attempt.current) return;
      settled = true;
      setSession(null);
      setStatus('idle');
    }, 12_000);
    connectWallet(networkId)
      .then((fresh) => {
        if (settled || run !== attempt.current) return;
        settled = true;
        clearTimeout(timer);
        setSession(fresh);
        setStatus('connected');
        setError(null);
      })
      .catch(() => {
        if (settled || run !== attempt.current) return;
        settled = true;
        clearTimeout(timer);
        setSession(null);
        setStatus('idle');
      });
    return () => {
      settled = true;
      clearTimeout(timer);
    };
  }, [networkId]);

  const connect = useCallback(async (): Promise<WalletConnectResult> => {
    setStatus('connecting');
    setError(null);
    try {
      const s = await connectWallet(networkId);
      setSession(s);
      setStatus('connected');
      return { session: s, error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSession(null);
      setStatus('error');
      setError(msg);
      // Return the exact error so callers can show it immediately, without
      // waiting for this state update to flush.
      return { session: null, error: msg };
    }
  }, [networkId]);

  const disconnect = useCallback(() => {
    disconnectWallet();
    setSession(null);
    setStatus('idle');
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<WalletValue>(
    () => ({
      session,
      status,
      error,
      installed: walletInstalled(),
      address: session?.address ?? null,
      connect,
      disconnect,
      clearError,
    }),
    [session, status, error, connect, disconnect, clearError],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
