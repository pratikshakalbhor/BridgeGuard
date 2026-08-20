// Types and client for the BridgeGuard AI backend (src/server.ts in the repo root).
// During development Vite proxies /api to the backend; set VITE_API_BASE to
// override (e.g. a deployed API host).

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const payload = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(payload.error ?? `Request failed (${res.status})`);
  }
  return payload as T;
}

export interface Bridge {
  id: string;
  name: string;
  srcChain: string;
  dstChain: string;
  tvl: string;
  audited: string;
  incidents: string;
  riskScore: string;
  status: number;
  statusLabel: string;
}

export interface VerdictEntry {
  key: string;
  value: string;
  label?: string;
}

export interface LedgerState {
  bridges: Bridge[];
  registryCount: string;
  assessmentCount: string;
  lastVerdict: string;
  lastVerdictLabel: string;
  lastWithinTolerance: boolean;
  lastBridgeId: string;
  latestVerdicts: VerdictEntry[];
  latestWithin: VerdictEntry[];
  latestTxIds: VerdictEntry[];
}

export interface WalletMeta {
  tNight: string;
  dust: string;
}

export interface AppState {
  contractAddress: string;
  network: string;
  walletAddress: string;
  balance: WalletMeta;
  ledger: LedgerState;
}

export interface TxResult {
  txId: string;
  blockHeight: string;
  bridgeId?: string | null;
  /** Connected wallet address the transaction is attributed to (echoed by backend). */
  walletAddress?: string | null;
}

export interface FlagResult extends TxResult {
  bridgeId: string;
  status: string;
}

export interface ServiceHealth {
  name: string;
  url: string;
  healthy: boolean;
  detail: string;
}

export interface HealthReport {
  services: ServiceHealth[];
  checkedAt: string;
}

export const api = {
  getState: () => request<AppState>('/api/state'),
  getBalance: () => request<WalletMeta>('/api/balance'),
  getHealth: () => request<HealthReport>('/api/health'),
  registerBridge: (payload: {
    name: string;
    srcChain: string;
    dstChain: string;
    tvl: string;
    audited: number;
    incidents: string;
    walletAddress?: string;
  }) =>
    request<TxResult>('/api/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  flagBridge: (payload: { bridgeId: string; status: number; walletAddress?: string }) =>
    request<FlagResult>('/api/flag', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
