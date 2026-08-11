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

export interface EvaluateResult extends TxResult {
  bridgeId: string;
  intel: number;
  verdict: string | null;
  verdictLabel: string | null;
  within: boolean | null;
}

export interface FlagResult extends TxResult {
  bridgeId: string;
  status: string;
}

/**
 * Result of the backend half of the wallet-signed evaluation pipeline
 * (`/api/poc/prepare-evaluate`): the backend builds the unproven call
 * transaction and generates the zero-knowledge proof, then hands the serialized
 * PUBLIC unbound transaction to the browser wallet for balancing/signing.
 * The private amount/maxRisk/intel never leave the backend.
 */
export interface PrepareEvaluateResult {
  circuit: string;
  bridgeId: string;
  serializedTxHex: string;
  serializedTxBytes: number;
  encoding: string;
  note: string;
}

/** Result of `/api/poc/finalize` — tx identifier + indexer confirmation. */
export interface FinalizeEvaluateResult {
  txId: string;
  txHash: string;
  status: 'confirmed' | 'pending';
  bridgeId: string | null;
  blockHeight?: string;
  blockHash?: string;
  txStatus?: string;
  blockTimestamp?: string;
  verdict?: string | null;
  verdictLabel?: string | null;
  within?: boolean | null;
  note?: string;
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
  evaluateBridge: (payload: {
    bridgeId: string;
    amount: string;
    maxRisk: number;
    intel: number;
    walletAddress?: string;
  }) =>
    request<EvaluateResult>('/api/evaluate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  flagBridge: (payload: { bridgeId: string; status: number; walletAddress?: string }) =>
    request<FlagResult>('/api/flag', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  /**
   * Backend half of the wallet-signed evaluation: prove + serialize. The
   * returned hex is the PUBLIC unbound transaction the browser wallet then
   * balances, signs and submits (amount/maxRisk/intel stay server-side).
   */
  prepareEvaluate: (payload: { bridgeId: string; amount: string; maxRisk: number; intel: number }) =>
    request<PrepareEvaluateResult>('/api/poc/prepare-evaluate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  /**
   * Finalize half of the wallet-signed evaluation: derive the tx identifier from
   * the balanced sealed tx hex and watch the indexer for confirmation.
   */
  finalizeEvaluate: (payload: { balancedTxHex: string; bridgeId?: string }) =>
    request<FinalizeEvaluateResult>('/api/poc/finalize', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
