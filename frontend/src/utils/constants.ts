export const VERDICT_LABELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const STATUS_LABELS = ['ACTIVE', 'FLAGGED', 'COMPROMISED'] as const;

export type VerdictTone = 'success' | 'warning' | 'danger' | 'critical' | 'neutral';

export function verdictTone(verdict: number): VerdictTone {
  switch (verdict) {
    case 0:
      return 'success';
    case 1:
      return 'warning';
    case 2:
      return 'danger';
    case 3:
      return 'critical';
    default:
      return 'neutral';
  }
}

export function riskLevel(score: number): { label: string; tone: VerdictTone } {
  if (score >= 75) return { label: 'Critical risk', tone: 'critical' };
  if (score >= 55) return { label: 'High risk', tone: 'danger' };
  if (score >= 30) return { label: 'Elevated risk', tone: 'warning' };
  return { label: 'Low risk', tone: 'success' };
}

export interface ChainMeta {
  name: string;
  symbol: string;
}

// Common chain ids (contract uses Uint<64> chain ids).
const CHAINS: Record<string, ChainMeta> = {
  '1': { name: 'Ethereum', symbol: 'ETH' },
  '10': { name: 'Optimism', symbol: 'OP' },
  '56': { name: 'BNB Chain', symbol: 'BNB' },
  '137': { name: 'Polygon', symbol: 'MATIC' },
  '42161': { name: 'Arbitrum', symbol: 'ARB' },
  '43114': { name: 'Avalanche', symbol: 'AVAX' },
  '8453': { name: 'Base', symbol: 'BASE' },
  '99': { name: 'Midnight', symbol: 'NIGHT' },
};

export const CHAIN_IDS = Object.keys(CHAINS);

export function chainName(id: string): string {
  return CHAINS[id]?.name ?? `Chain ${id}`;
}

export function chainSymbol(id: string): string {
  return CHAINS[id]?.symbol ?? '';
}
