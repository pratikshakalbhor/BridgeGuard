// Midnight contract service layer.
//
// Bridges the UI to every function available on the BridgeGuard smart contract
// (contracts/bridgeguard-v2.compact):
//
//   registerBridge(name, srcChain, dstChain, tvl, audited, incidents)
//   evaluateBridge(bridgeId, amount, maxRisk)   — consumes getRiskIntel witness
//   flagBridge(bridgeId, status)
//
// ZK proof generation for evaluateBridge happens LOCALLY IN THE BROWSER through
// the connected Midnight wallet (see services/browserProof.ts). The private
// witness values (amount, maxRisk, intel) never leave the browser and are never
// sent to the backend or a proof server.
//
// Contract functions with no on-chain equivalent in the deployed circuit (price
// impact, liquidity health, security status) are derived deterministically from
// the real on-chain registry fields so the UI always reflects live data.

import { api } from '@/services/api';
import { getConnectedApi } from '@/services/wallet';
import { evaluateBridgeInBrowser, waitForConfirmationAndVerdict } from '@/services/browserProof';
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

// ─── On-chain contract functions ─────────────────────────────────────────────

/** Registers a new bridge on the Midnight ledger. */
export async function registerBridge(input: RegisterInput & { walletAddress?: string }): Promise<TxResult> {
  return api.registerBridge(input);
}

// ─── Wallet-signed, browser-proven evaluation ────────────────────────────────
//
// The whole ZK pipeline runs locally in the browser via the connected Midnight
// wallet (Midnight.js SDK):
//   browser createUnprovenCallTx → wallet proves (local) → wallet balances
//   (user approval + DUST fee) → wallet submits → browser watches the indexer.
// The private amount/maxRisk/intel stay inside the in-memory private state and
// the ZK proof on the user's device; they are never sent to the backend, never
// logged and never returned.

export type WalletSignStep =
  | 'prepare'
  | 'approve'
  | 'submit'
  | 'confirm';

export interface WalletEvaluateResult {
  signing: 'wallet';
  txId: string;
  txHash: string;
  status: 'confirmed' | 'pending';
  bridgeId: string;
  blockHeight?: string | null;
  verdict: string | null;
  verdictLabel: string | null;
  within: boolean | null;
  note?: string;
}

export async function evaluateBridgeWithWallet(
  payload: { bridgeId: string; amount: string; maxRisk: number; intel: number },
  onStep?: (step: WalletSignStep, message: string) => void,
): Promise<WalletEvaluateResult> {
  const wallet = getConnectedApi();
  if (!wallet) {
    throw new Error('Connect your Midnight wallet first — local proof generation is unavailable.');
  }

  // Steps 1-4 (browser): write the confidential intel to in-memory private
  // state, create the unproven call tx, generate the ZK proof through the
  // connected wallet, and balance + submit the transaction through the wallet.
  onStep?.('prepare', 'Generating the zero-knowledge proof locally in your browser…');
  try {
    await wallet.hintUsage(['getProvingProvider', 'balanceUnsealedTransaction', 'submitTransaction']);
  } catch {
    // hintUsage is a permission hint; a failure must not abort the flow.
  }

  // The wallet's approval prompt appears during balanceUnsealedTransaction
  // inside evaluateBridgeInBrowser (the wallet pays the DUST fee).
  onStep?.('approve', 'Approve the transaction in your Midnight wallet — the wallet pays the DUST fee.');

  const result = await evaluateBridgeInBrowser({
    bridgeId: payload.bridgeId,
    amount: payload.amount,
    maxRisk: payload.maxRisk,
    intel: payload.intel,
    wallet,
  });

  // Steps 5-6 (browser): watch the public indexer for confirmation and read
  // the disclosed coarse verdict from the public ledger state.
  const fin = await waitForConfirmationAndVerdict(
    payload.bridgeId,
    result.txId,
    (message) => onStep?.('confirm', message),
  );

  return {
    signing: 'wallet',
    txId: result.txId,
    txHash: result.txId,
    status: fin.status,
    bridgeId: payload.bridgeId,
    blockHeight: fin.blockHeight ?? null,
    verdict: fin.verdict ?? null,
    verdictLabel: fin.verdictLabel ?? null,
    within: fin.within ?? null,
    note: fin.status === 'pending' ? 'submitted — awaiting indexer confirmation' : undefined,
  };
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
