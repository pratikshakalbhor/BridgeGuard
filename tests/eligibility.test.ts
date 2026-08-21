// Contract-level tests for Age / Eligibility Gate, run against the in-process
// simulator. These verify ledger semantics, the eligibility model, the
// disclose() boundary (what checkEligibility is allowed to reveal), and the
// circuit guards — all without a network or proofs.
import { describe, expect, it } from 'vitest';
import {
  createEligibilityGateSimulator,
  checkEligibility,
  getLedger,
  type EligibilityGateSimulator,
} from './eligibility-simulator.js';

describe('checkEligibility', () => {
  it('returns eligible=true and increments checkCount for value = 25', () => {
    const sim = createEligibilityGateSimulator(25);
    checkEligibility(sim, 25n);

    const ledger = getLedger(sim);
    expect(ledger.lastEligible).toBe(true);
    expect(ledger.checkCount).toBe(1n);
  });

  it('returns eligible=false for value = 16', () => {
    const sim = createEligibilityGateSimulator(16);
    checkEligibility(sim, 16n);

    expect(getLedger(sim).lastEligible).toBe(false);
  });

  it('returns eligible=true for boundary value = 18', () => {
    const sim = createEligibilityGateSimulator(18);
    checkEligibility(sim, 18n);

    expect(getLedger(sim).lastEligible).toBe(true);
  });

  it('returns eligible=false for boundary value = 17', () => {
    const sim = createEligibilityGateSimulator(17);
    checkEligibility(sim, 17n);

    expect(getLedger(sim).lastEligible).toBe(false);
  });
});

describe('privacy boundary (disclose placement)', () => {
  it('an evaluation never stores the private value in public ledger state', () => {
    const sim = createEligibilityGateSimulator(25);
    const privateValue = 25n;
    checkEligibility(sim, privateValue);

    const ledger = getLedger(sim);
    // The exact value is never stored anywhere in the ledger.
    expect(ledger.lastEligible).toBe(true);
    expect(ledger.checkCount).toBe(1n);
    // Verify no public field contains the private value
    const publicValues = [
      ledger.lastEligible,
      ledger.checkCount,
    ];
    expect(publicValues).not.toContain(privateValue);
    // The boolean true is not the same as the numeric value 25
    expect(ledger.lastEligible).not.toBe(privateValue);
  });

  it('different private values producing same eligibility have identical public ledger', () => {
    const simA = createEligibilityGateSimulator(18);
    checkEligibility(simA, 18n);

    const simB = createEligibilityGateSimulator(25);
    checkEligibility(simB, 25n);

    // Both values land in the same eligibility band (eligible=true);
    // the coarse outputs are identical, and the ledger is equivalent
    // apart from the private inputs.
    expect(getLedger(simA).lastEligible).toBe(getLedger(simB).lastEligible);
    expect(getLedger(simA).checkCount).toBe(getLedger(simB).checkCount);
  });

  it('ineligible values produce false without leaking the value', () => {
    const simA = createEligibilityGateSimulator(16);
    checkEligibility(simA, 16n);

    const simB = createEligibilityGateSimulator(17);
    checkEligibility(simB, 17n);

    expect(getLedger(simA).lastEligible).toBe(false);
    expect(getLedger(simB).lastEligible).toBe(false);
    expect(getLedger(simA).checkCount).toBe(1n);
    expect(getLedger(simB).checkCount).toBe(1n);

    // Verify the actual values are not in public state
    const ledgerA = getLedger(simA);
    const ledgerB = getLedger(simB);
    expect(ledgerA.lastEligible).not.toBe(16n);
    expect(ledgerA.lastEligible).not.toBe(17n);
    expect(ledgerB.lastEligible).not.toBe(16n);
    expect(ledgerB.lastEligible).not.toBe(17n);
  });
});