// Midnight contract service layer.
//
// Bridges the UI to every function available on the BridgeGuard smart contract
// (contracts/bridgeguard-v2.compact) via the local API server (src/server.ts):
//
//   registerBridge(name, srcChain, dstChain, tvl, audited, incidents)
//   evaluateBridge(bridgeId, amount, maxRisk)   — consumes getRiskIntel witness
//   flagBridge(bridgeId, status)
//
// Contract functions with no on-chain equivalent in the deployed circuit (price
// impact, liquidity health, security status) are derived deterministically from
// the real on-chain registry fields so the UI always reflects live data.

import { api } from '@/services/api';
import type { Bridge, TxResult } from '@/services/api';

export interface RegisterInput {
  name: string;
  srcChain: string;
  dstChain: string;
  tvl: string;
  audited: number;
  incidents: string;
}

export type BridgeStatusLabel = 'SAFE' | 'MEDIUM' | 'DANGEROUS';

export interface PriceImpactEstimate {
  pct: number; // expected price impact on the amount
  slippage: number; // high-water slippage bound
  thin: boolean;
}

export interface SecurityStatus {
  label: BridgeStatusLabel;
  tone: 'success' | 'warning' | 'critical';
  detail: string;
}

// ─── On-chain contract functions (via backend) ───────────────────────────────

/** Registers a new bridge on the Midnight ledger. */
export async function registerBridge(input: RegisterInput & { walletAddress?: string }): Promise<TxResult> {
  return api.registerBridge(input);
}

/** Runs a private zero-knowledge evaluation for a transfer. */
export async function evaluateBridge(payload: {
  bridgeId: string;
  amount: string;
  maxRisk: number;
  intel: number;
  walletAddress?: string;
}) {
  return api.evaluateBridge(payload);
}

/** Flags a bridge with a new on-chain status (0 ACTIVE / 1 FLAGGED / 2 COMPROMISED). */
export async function flagBridge(payload: { bridgeId: string; status: number; walletAddress?: string }): Promise<TxResult> {
  return api.flagBridge(payload);
}

// ─── Deterministic analytics (derived from real on-chain registry fields) ───

/**
 * Expected price impact for transferring `amount` across `bridge`.
 * Simple constant-product model: impact ≈ amount / (tvl + amount). Derived
 * entirely from the bridge's on-chain TVL.
 */
export function getPriceImpact(bridge: Bridge, amount: number): PriceImpactEstimate {
  const tvl = Number(bridge.tvl);
  const safe = Math.max(1, tvl);
  const pct = Math.min(35, (amount / (safe + amount)) * 100);
  const thin = amount > tvl * 0.25;
  return {
    pct: Number(pct.toFixed(2)),
    slippage: Number((pct * 1.6).toFixed(2)),
    thin,
  };
}

/**
 * Security status derived from the on-chain registry fields.
 * SAFE → audited + low incidents, MEDIUM → moderate exposure, DANGEROUS → compromised/flagged.
 */
export function getSecurityStatus(bridge: Bridge): SecurityStatus {
  const audited = Number(bridge.audited) === 1;
  const incidents = Number(bridge.incidents);
  const status = Number(bridge.status);

  if (status === 2 || incidents >= 5) {
    return {
      label: 'DANGEROUS',
      tone: 'critical',
      detail: status === 2 ? 'Bridge marked COMPROMISED on-chain.' : 'High incident count and elevated risk score.',
    };
  }
  if (status === 1 || incidents >= 3 || !audited) {
    return {
      label: 'MEDIUM',
      tone: 'warning',
      detail: !audited ? 'No independent audit on record.' : 'Bridge is flagged or shows elevated exposure.',
    };
  }
  return {
    label: 'SAFE',
    tone: 'success',
    detail: 'Audited, low incident count and active status.',
  };
}

/**
 * Liquidity health for a bridge, derived deterministically from its real
 * on-chain registry fields: depth from TVL, plus penalties for being flagged,
 * compromised, unaudited or having public incidents. No fabricated figures.
 */
export function getLiquidityHealth(bridge: Bridge): { score: number; status: 'Healthy' | 'Stretched' | 'Thin' } {
  const tvl = Number(bridge.tvl);
  const depth = Math.min(100, Math.round(Math.log10(Math.max(1, tvl)) * 10));
  let score = depth;

  if (Number(bridge.audited) !== 1) score -= 8;
  score -= Number(bridge.incidents) * 4;
  if (Number(bridge.status) === 1) score -= 15;
  if (Number(bridge.status) === 2) score -= 30;

  score = Math.max(0, Math.min(99, score));

  const status: 'Healthy' | 'Stretched' | 'Thin' =
    score >= 60 ? 'Healthy' : score >= 35 ? 'Stretched' : 'Thin';
  return { score, status };
}
