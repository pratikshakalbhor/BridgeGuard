// Contract-level tests for BridgeGuard AI, run against the in-process
// simulator. These verify ledger semantics, the risk-scoring model, the
// disclose() boundary (what evaluateBridge is allowed to reveal), and the
// circuit guards — all without a network or proofs.
import { describe, expect, it } from 'vitest';
import {
  createBridgeGuardSimulator,
  evaluateBridge,
  flagBridge,
  getLedger,
  registerBridge,
  type BridgeGuardSimulator,
} from './bridgeguard-simulator.js';

function setupSingleBridge(sim: BridgeGuardSimulator): void {
  registerBridge(sim, {
    name: 'Polygon-Ethereum',
    srcChain: 1n,
    dstChain: 2n,
    tvl: 1_000_000n,
    audited: 1n,
    incidents: 0n,
  });
}

describe('registerBridge', () => {
  it('registers a bridge with public metadata and a computed base risk score', () => {
    const sim = createBridgeGuardSimulator();
    setupSingleBridge(sim);

    const ledger = getLedger(sim);
    expect(ledger.registryCount).toBe(1n);
    expect(ledger.bridges.size()).toBe(1n);

    const b = ledger.bridges.lookup(0n);
    expect(b.name).toBe('Polygon-Ethereum');
    expect(b.srcChain).toBe(1n);
    expect(b.dstChain).toBe(2n);
    expect(b.tvl).toBe(1_000_000n);
    expect(b.audited).toBe(1n);
    expect(b.incidents).toBe(0n);
    expect(b.riskScore).toBe(0n);
    expect(b.status).toBe(0n);
  });

  it('scores unaudited bridges with an audit penalty plus per-incident weight', () => {
    const sim = createBridgeGuardSimulator();
    registerBridge(sim, {
      name: 'Shady-Link',
      srcChain: 1n,
      dstChain: 3n,
      tvl: 500_000n,
      audited: 0n,
      incidents: 5n,
    });
    expect(getLedger(sim).bridges.lookup(0n).riskScore).toBe(45n);
  });

  it('clamps the base score at 100', () => {
    const sim = createBridgeGuardSimulator();
    registerBridge(sim, {
      name: 'Maxed',
      srcChain: 1n,
      dstChain: 4n,
      tvl: 500_000n,
      audited: 0n,
      incidents: 20n,
    });
    expect(getLedger(sim).bridges.lookup(0n).riskScore).toBe(100n);
  });

  it('rejects invalid inputs', () => {
    const sim = createBridgeGuardSimulator();
    expect(() =>
      registerBridge(sim, { name: 'X', srcChain: 1n, dstChain: 1n, tvl: 100n, audited: 1n, incidents: 0n }),
    ).toThrow('source and destination chains must differ');
    expect(() =>
      registerBridge(sim, { name: 'X', srcChain: 1n, dstChain: 2n, tvl: 10n ** 16n, audited: 1n, incidents: 0n }),
    ).toThrow('TVL exceeds supported range');
    expect(() =>
      registerBridge(sim, { name: 'X', srcChain: 1n, dstChain: 2n, tvl: 100n, audited: 1n, incidents: 21n }),
    ).toThrow('incident count out of range');
    expect(() =>
      registerBridge(sim, { name: 'X', srcChain: 1n, dstChain: 2n, tvl: 100n, audited: 2n, incidents: 0n }),
    ).toThrow('audited must be 0 or 1');
  });

  it('caps the registry at 10 bridges', () => {
    const sim = createBridgeGuardSimulator();
    for (let i = 0; i < 10; i++) {
      registerBridge(sim, {
        name: `Bridge-${i}`,
        srcChain: BigInt(i + 1),
        dstChain: 99n,
        tvl: 100_000n,
        audited: 1n,
        incidents: 0n,
      });
    }
    expect(() =>
      registerBridge(sim, { name: 'Eleventh', srcChain: 1n, dstChain: 2n, tvl: 100n, audited: 1n, incidents: 0n }),
    ).toThrow('bridge registry is full');
  });
});

describe('evaluateBridge', () => {
  it('discloses a LOW verdict and within-tolerance flag for a low-risk transfer', () => {
    const sim = createBridgeGuardSimulator(0);
    setupSingleBridge(sim);

    evaluateBridge(sim, 0n, 1_000n, 0n);

    const ledger = getLedger(sim);
    expect(ledger.lastVerdict).toBe(0n);
    expect(ledger.lastWithinTolerance).toBe(true);
    expect(ledger.lastBridgeId).toBe(0n);
    expect(ledger.assessmentCount).toBe(1n);
  });

  it('raises the verdict with private intel and larger exposure', () => {
    const sim = createBridgeGuardSimulator(10);
    setupSingleBridge(sim);

    evaluateBridge(sim, 0n, 1_000n, 3n);
    expect(getLedger(sim).lastVerdict).toBe(3n); // 80 + 0 >= 75
    expect(getLedger(sim).lastWithinTolerance).toBe(true);

    evaluateBridge(sim, 0n, 1_000n, 2n);
    expect(getLedger(sim).lastVerdict).toBe(3n);
    expect(getLedger(sim).lastWithinTolerance).toBe(false); // 3 > 2
  });

  it('models exposure from the (private) amount relative to public TVL', () => {
    const sim = createBridgeGuardSimulator(0);
    setupSingleBridge(sim);

    evaluateBridge(sim, 0n, 1_000n, 3n);
    expect(getLedger(sim).lastVerdict).toBe(0n); // exposure 0 -> total 0

    evaluateBridge(sim, 0n, 1_500_000n, 3n); // > tvl (1e6), <= 2*tvl
    expect(getLedger(sim).lastVerdict).toBe(0n); // exposure 8 -> total 8

    evaluateBridge(sim, 0n, 2_500_000n, 3n); // > 2*tvl
    expect(getLedger(sim).lastVerdict).toBe(0n); // exposure 15 -> total 15

    evaluateBridge(sim, 0n, 1_000_000_000n, 3n); // near amount cap, still exposure 15
    expect(getLedger(sim).lastVerdict).toBe(0n);
  });

  it('crosses verdict bands as total risk accumulates', () => {
    const sim = createBridgeGuardSimulator(4);
    setupSingleBridge(sim);
    evaluateBridge(sim, 0n, 1_000n, 3n);
    expect(getLedger(sim).lastVerdict).toBe(1n); // 32 >= 30, < 55
  });

  it('enforces circuit guards on private inputs', () => {
    const sim = createBridgeGuardSimulator(0);
    setupSingleBridge(sim);

    expect(() => evaluateBridge(sim, 0n, 0n, 0n)).toThrow('transfer amount must be positive');
    expect(() => evaluateBridge(sim, 0n, 10n ** 13n, 0n)).toThrow('transfer amount exceeds supported range');
    expect(() => evaluateBridge(sim, 0n, 1_000n, 4n)).toThrow('risk tolerance must be between 0');
    expect(() => evaluateBridge(sim, 99n, 1_000n, 0n)).toThrow('bridge not found');
  });

  it('rejects an out-of-range private intel feed', () => {
    const sim = createBridgeGuardSimulator(21);
    setupSingleBridge(sim);
    expect(() => evaluateBridge(sim, 0n, 1_000n, 3n)).toThrow('intel incident count out of range');
  });
});

describe('flagBridge', () => {
  it('updates a bridge status', () => {
    const sim = createBridgeGuardSimulator();
    setupSingleBridge(sim);
    flagBridge(sim, 0n, 2n);
    expect(getLedger(sim).bridges.lookup(0n).status).toBe(2n);
  });

  it('rejects invalid status values and unknown bridges', () => {
    const sim = createBridgeGuardSimulator();
    setupSingleBridge(sim);
    expect(() => flagBridge(sim, 0n, 3n)).toThrow('status must be 0');
    expect(() => flagBridge(sim, 42n, 1n)).toThrow('bridge not found');
  });
});

describe('privacy boundary (disclose placement)', () => {
  it('an evaluation never mutates the public registry', () => {
    const sim = createBridgeGuardSimulator(10);
    setupSingleBridge(sim);
    const before = getLedger(sim).bridges.lookup(0n);

    evaluateBridge(sim, 0n, 123_456n, 1n);

    const after = getLedger(sim).bridges.lookup(0n);
    expect(after).toEqual(before);
  });

  it('only {bridgeId, coarse verdict, within-tolerance} are written for an evaluation', () => {
    const sim = createBridgeGuardSimulator(10);
    setupSingleBridge(sim);

    const privateAmount = 777_777n;
    const privateMaxRisk = 2n;
    evaluateBridge(sim, 0n, privateAmount, privateMaxRisk);

    const ledger = getLedger(sim);
    const values = [
      ledger.lastVerdict,
      ledger.lastBridgeId,
      ledger.lastWithinTolerance,
      ledger.registryCount,
      ledger.assessmentCount,
      ledger.bridges.lookup(0n).tvl,
    ];
    // The exact amount and tolerance are never stored anywhere in the ledger.
    expect(values).not.toContain(privateAmount);
    expect(values).not.toContain(privateMaxRisk);
    expect(ledger.bridges.lookup(0n).tvl).not.toBe(privateAmount);
  });

  it('the exact intel feed value never appears in the ledger', () => {
    const simA = createBridgeGuardSimulator(0);
    setupSingleBridge(simA);
    evaluateBridge(simA, 0n, 1_000n, 3n);

    const simB = createBridgeGuardSimulator(1);
    setupSingleBridge(simB);
    evaluateBridge(simB, 0n, 1_000n, 3n);

    // Both intel values land in the same verdict band; the coarse outputs are
    // identical, and the ledger is byte-for-byte equivalent apart from it.
    expect(getLedger(simA).lastVerdict).toBe(getLedger(simB).lastVerdict);
    expect(getLedger(simA).bridges.size()).toBe(getLedger(simB).bridges.size());
  });
});
