import type { Bridge } from '@/services/api';
import { verdictTone } from '@/utils/constants';

// Client-side mirror of the on-chain risk model (contracts/bridgeguard-v2.compact).
// Used by the analysis/advisor flows to render the score breakdown alongside the
// verdict produced on-chain by the evaluateBridge circuit.

const AUDIT_PENALTY = 20;
const INCIDENT_WEIGHT = 5;
const INTEL_WEIGHT = 8;
const EXPOSURE_OVER_TVL = 8;
const EXPOSURE_OVER_2X_TVL = 15;

export interface Assessment {
  bridgeId: string;
  bridgeName: string;
  amount: number;
  maxRisk: number;
  intel: number;
  baseScore: number;
  incidentScore: number;
  intelScore: number;
  exposure: number;
  total: number;
  verdict: number;
  verdictLabel: string;
  within: boolean;
  transferSafety: number;
  liquidityStatus: 'Healthy' | 'Stretched' | 'Thin';
  tone: ReturnType<typeof verdictTone>;
}

export function computeBaseScore(audited: number, incidents: number): number {
  const auditPenalty = audited === 1 ? 0 : AUDIT_PENALTY;
  return Math.min(100, auditPenalty + incidents * INCIDENT_WEIGHT);
}

export function assessBridge(
  bridge: Bridge,
  amount: number,
  maxRisk: number,
  intel: number,
): Assessment {
  const tvl = Number(bridge.tvl);
  const baseScore = Number(bridge.riskScore);
  const incidentScore = Number(bridge.incidents) * INCIDENT_WEIGHT;
  const intelScore = intel * INTEL_WEIGHT;
  const exposure = amount > tvl * 2 ? EXPOSURE_OVER_2X_TVL : amount > tvl ? EXPOSURE_OVER_TVL : 0;
  const total = baseScore + incidentScore + intelScore + exposure;

  const verdict = total >= 75 ? 3 : total >= 55 ? 2 : total >= 30 ? 1 : 0;
  const within = verdict <= maxRisk;

  const liquidityStatus: Assessment['liquidityStatus'] =
    amount > tvl * 2 ? 'Thin' : amount > tvl ? 'Stretched' : 'Healthy';

  const safetyByVerdict = [96, 74, 46, 18];
  const transferSafety = Math.max(5, Math.min(99, safetyByVerdict[verdict] - exposure * 0.6));

  const labels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  return {
    bridgeId: bridge.id,
    bridgeName: bridge.name,
    amount,
    maxRisk,
    intel,
    baseScore,
    incidentScore,
    intelScore,
    exposure,
    total,
    verdict,
    verdictLabel: labels[verdict],
    within,
    transferSafety: Math.round(transferSafety),
    liquidityStatus,
    tone: verdictTone(verdict),
  };
}

export interface Recommendation {
  action: 'Transfer now' | 'Transfer with caution' | 'Avoid — high risk' | 'Blocked';
  headline: string;
  reason: string;
  points: string[];
}

export function recommendationFor(a: Assessment): Recommendation {
  switch (a.verdict) {
    case 0:
      return {
        action: 'Transfer now',
        headline: 'Bridge is in good standing',
        reason: 'The combined risk score is LOW and within your tolerance.',
        points: [
          `Base risk score ${a.baseScore}/100 — ${a.bridgeName} is audited.`,
          'Liquidity is healthy for the requested amount.',
          `Intelligence feed contributes ${a.intelScore} pts — no elevated threat.`,
        ],
      };
    case 1:
      return {
        action: 'Transfer with caution',
        headline: 'Proceed carefully',
        reason: 'Elevated risk but still within your stated tolerance.',
        points: [
          `Incident exposure adds ${a.incidentScore} pts to the base score.`,
          a.exposure > 0
            ? `Amount is large relative to liquidity (${a.exposure} pts exposure).`
            : 'Amount stays within pooled liquidity.',
          `Your tolerance (${a.maxRisk}) still covers a MEDIUM verdict.`,
        ],
      };
    case 2:
      return {
        action: 'Avoid — high risk',
        headline: 'Risk exceeds comfort levels',
        reason: 'HIGH verdict with meaningful exposure or intelligence pressure.',
        points: [
          `Public incidents push the score to ${a.total}.`,
          a.intel > 0 ? `Confidential intel feed adds ${a.intelScore} pts.` : 'No intel pressure.',
          `Exceeds your tolerance of ${a.maxRisk}.`,
        ],
      };
    default:
      return {
        action: 'Blocked',
        headline: 'Do not transfer through this bridge',
        reason: 'CRITICAL verdict. Consider a safer route or smaller amount.',
        points: [
          'CRITICAL total risk score — comparable to past exploit conditions.',
          a.liquidityStatus === 'Thin'
            ? 'Pool is thin relative to your amount; price impact and loss risk are high.'
            : 'Multiple compounding risk factors detected.',
          'Recommend an alternative bridge until status improves.',
        ],
      };
  }
}

// Privacy-safe recommendation for the AI Transfer Advisor. Built from disclosed
// information only (on-chain risk score, verdict, TVL, audit status, incidents).
// Never references the private amount, intel feed, exposure, or tolerance.
export function publicRecommendationFor(
  bridge: Bridge,
  verdict: number,
  baseScore: number,
  incidentScore: number,
): Recommendation {
  switch (verdict) {
    case 0:
      return {
        action: 'Transfer now',
        headline: 'Bridge is in good standing',
        reason: 'The on-chain verdict for this route is LOW.',
        points: [
          `${bridge.name} carries a disclosed risk score of ${baseScore}/100 and is audited.`,
          'No public incidents elevate the score.',
          'Public liquidity (TVL) comfortably backs this route.',
        ],
      };
    case 1:
      return {
        action: 'Transfer with caution',
        headline: 'Proceed carefully',
        reason: 'The on-chain verdict for this route is MEDIUM.',
        points: [
          `Public incidents add ${incidentScore} pts to the disclosed risk score (${baseScore}/100).`,
          'Prefer a bridge with a LOW verdict if one is available.',
          'Monitor the bridge status before and after transferring.',
        ],
      };
    case 2:
      return {
        action: 'Avoid — high risk',
        headline: 'Risk exceeds comfort levels',
        reason: 'The on-chain verdict for this route is HIGH.',
        points: [
          `Public incidents push the disclosed score to ${baseScore}/100.`,
          'Choose a lower-verdict route when available.',
        ],
      };
    default:
      return {
        action: 'Blocked',
        headline: 'Do not transfer through this bridge',
        reason: 'The on-chain verdict for this route is CRITICAL.',
        points: [
          'CRITICAL verdict — comparable to past exploit conditions.',
          'Recommend an alternative bridge until status improves.',
        ],
      };
  }
}
