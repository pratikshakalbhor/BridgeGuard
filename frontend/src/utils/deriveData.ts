import type { AppState, Bridge } from '@/services/api';
import type { AlertItem } from '@/components/AlertCard';
import type { DistributionDatum } from '@/components/charts/RiskDonutChart';
import type { VerdictByBridgeDatum } from '@/components/charts/VerdictByBridgeChart';
import type { TvlSnapshotDatum } from '@/components/charts/TvlSnapshotChart';
import { chainName } from '@/utils/constants';

export interface BridgeEvent {
  id: number;
  type: 'register' | 'evaluate' | 'flag' | 'liquidity';
  bridgeId: string;
  title: string;
  detail: string;
  timeAgo: string;
}

// Deterministic dataset builders that turn the real on-chain registry (bridges,
// statuses, risk scores, verdicts, counters) into the dashboards and monitoring
// feeds. Every value below is derived directly from the deployed Midnight
// ledger — no fabricated series, seeded randomness, or sample data anywhere.
// If a dataset has no real source on-chain it is intentionally left empty and
// the UI renders "No data available".

// ─── Alerts ───────────────────────────────────────────────────────────────────

export function deriveAlerts(state: AppState): AlertItem[] {
  const out: AlertItem[] = [];
  const rank = (b: Bridge) => Number(b.riskScore) + Number(b.incidents) * 5;
  const bridges = [...state.ledger.bridges].sort((a, b) => rank(b) - rank(a));

  for (const b of bridges) {
    const status = Number(b.status);
    const incidents = Number(b.incidents);
    const risk = Number(b.riskScore);
    if (status === 2) {
      out.push({
        id: out.length + 1,
        severity: 'critical',
        title: `${b.name} marked compromised`,
        body: `Status changed on-chain to COMPROMISED. Locked funds reported; avoid all transfers through this bridge.`,
        source: b.name,
        timeAgo: 'on-chain',
        status: 'open',
      });
    } else if (status === 1 || incidents >= 5) {
      out.push({
        id: out.length + 1,
        severity: 'high',
        title: `${b.name} flagged for elevated incident count`,
        body: `${incidents} public incidents and a risk score of ${risk}. Withdrawals may face delays.`,
        source: b.name,
        timeAgo: 'on-chain',
        status: 'open',
      });
    } else if (risk >= 30 || incidents >= 3) {
      out.push({
        id: out.length + 1,
        severity: 'medium',
        title: `${b.name} exposure elevated`,
        body: `Registry risk score ${risk}/100 with ${incidents} public incidents. Monitor before moving large amounts.`,
        source: b.name,
        timeAgo: 'on-chain',
        status: 'open',
      });
    } else if (risk >= 10) {
      out.push({
        id: out.length + 1,
        severity: 'low',
        title: `${b.name} audit on watch`,
        body: `Moderate base score from the on-chain registry. No immediate action required.`,
        source: b.name,
        timeAgo: 'on-chain',
        status: 'acknowledged',
      });
    }
  }

  if (out.length === 0 && state.ledger.bridges.length > 0) {
    out.push({
      id: 1,
      severity: 'low',
      title: 'Registry healthy',
      body: 'All registered bridges are active with low risk scores. No open incidents.',
      source: 'BridgeGuard registry',
      timeAgo: 'on-chain',
      status: 'acknowledged',
    });
  }
  return out;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export function deriveEvents(state: AppState): BridgeEvent[] {
  const out: BridgeEvent[] = [];
  const nameOf = (id: string) => state.ledger.bridges.find((b) => b.id === id)?.name ?? `Bridge #${id}`;

  for (const id of state.ledger.latestVerdicts.map((v) => v.key)) {
    out.push({
      id: out.length + 1,
      type: 'evaluate',
      bridgeId: id,
      title: 'Private evaluation completed',
      detail: `${nameOf(id)} · verdict ${state.ledger.latestVerdicts.find((v) => v.key === id)?.label ?? '—'} · confidential`,
      timeAgo: 'on-chain',
    });
  }

  const flagged = state.ledger.bridges.filter((b) => Number(b.status) === 1);
  for (const b of flagged) {
    out.push({
      id: out.length + 1,
      type: 'flag',
      bridgeId: b.id,
      title: 'Bridge flagged',
      detail: `${b.name} status changed to FLAGGED on-chain`,
      timeAgo: 'on-chain',
    });
  }

  const compromised = state.ledger.bridges.filter((b) => Number(b.status) === 2);
  for (const b of compromised) {
    out.push({
      id: out.length + 1,
      type: 'flag',
      bridgeId: b.id,
      title: 'Bridge marked COMPROMISED',
      detail: `${b.name} status changed on-chain by registry authority`,
      timeAgo: 'on-chain',
    });
  }

  for (const b of state.ledger.bridges) {
    out.push({
      id: out.length + 1,
      type: 'register',
      bridgeId: b.id,
      title: 'Bridge registered',
      detail: `${b.name} · ${chainName(b.srcChain)} → ${chainName(b.dstChain)} · TVL $${Number(b.tvl).toLocaleString()}`,
      timeAgo: 'on-chain',
    });
  }
  return out;
}

// ─── Verdict charts (real per-bridge verdicts from the ledger) ───────────────

const DIST_COLORS: Record<string, string> = {
  LOW: '#34d399',
  MEDIUM: '#fbbf24',
  HIGH: '#fb923c',
  CRITICAL: '#f87171',
};

export function deriveVerdictDistribution(state: AppState): DistributionDatum[] {
  const counts = new Map<string, number>();
  for (const v of state.ledger.latestVerdicts) {
    const label = v.label ?? 'LOW';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const order = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  return order
    .filter((k) => (counts.get(k) ?? 0) > 0)
    .map((k) => ({ name: k, value: counts.get(k) ?? 0, color: DIST_COLORS[k] ?? '#8b98ad' }));
}

const SHORT_NAME_LEN = 14;

export function deriveVerdictByBridge(state: AppState): VerdictByBridgeDatum[] {
  const verdictFor = new Map(state.ledger.latestVerdicts.map((v) => [v.key, Number(v.value)]));
  return [...state.ledger.bridges]
    .sort((a, b) => (verdictFor.get(a.id) ?? 0) - (verdictFor.get(b.id) ?? 0))
    .map((b) => {
      const v = verdictFor.get(b.id) ?? 0;
      const name = b.name.length > SHORT_NAME_LEN ? `${b.name.slice(0, SHORT_NAME_LEN - 1)}…` : b.name;
      return {
        name,
        bridgeId: b.id,
        LOW: v === 0 ? 1 : 0,
        MEDIUM: v === 1 ? 1 : 0,
        HIGH: v === 2 ? 1 : 0,
        CRITICAL: v === 3 ? 1 : 0,
        label: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][v] ?? 'LOW',
      };
    });
}

// ─── TVL snapshot (real on-chain TVL per bridge) ─────────────────────────────

export function deriveTvlSnapshot(state: AppState): TvlSnapshotDatum[] {
  return [...state.ledger.bridges]
    .sort((a, b) => Number(b.tvl) - Number(a.tvl))
    .map((b) => ({
      name: b.name.length > SHORT_NAME_LEN ? `${b.name.slice(0, SHORT_NAME_LEN - 1)}…` : b.name,
      bridgeId: b.id,
      tvl: Number(b.tvl),
      audited: Number(b.audited) === 1,
      status: Number(b.status),
    }));
}

// ─── Latest on-chain activity (real tx references per bridge) ────────────────

export interface OnChainActivityRow {
  id: number;
  bridgeId: string;
  bridgeName: string;
  route: string;
  tvl: number;
  verdict: string | null;
  status: string;
  txId: string | null;
}

export function deriveOnChainActivity(state: AppState): OnChainActivityRow[] {
  const verdictFor = new Map(state.ledger.latestVerdicts.map((v) => [v.key, v.label ?? '—']));
  const txFor = new Map(state.ledger.latestTxIds.map((t) => [t.key, t.value]));
  const statusLabels = ['ACTIVE', 'FLAGGED', 'COMPROMISED'];
  return state.ledger.bridges.map((b, i) => ({
    id: i + 1,
    bridgeId: b.id,
    bridgeName: b.name,
    route: `${chainName(b.srcChain)} → ${chainName(b.dstChain)}`,
    tvl: Number(b.tvl),
    verdict: verdictFor.get(b.id) ?? null,
    status: statusLabels[Number(b.status)] ?? 'ACTIVE',
    txId: txFor.get(b.id) ?? null,
  }));
}
