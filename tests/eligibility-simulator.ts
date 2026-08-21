// In-process simulator harness for the Age / Eligibility Gate contract.
//
// Runs the contract's circuits directly against an in-memory ledger using the
// compact-runtime execution context — no network, no wallet, no proofs. Each
// circuit call returns an updated context whose `currentQueryContext.state`
// reflects the post-transaction ledger, so consecutive calls chain together
// exactly like successive transactions on chain.
import {
  createCircuitContext,
  createConstructorContext,
  dummyContractAddress,
  type CircuitContext,
} from '@midnight-ntwrk/compact-runtime';
import { sampleCoinPublicKey } from '@midnight-ntwrk/ledger-v8';
import {
  Contract,
  ledger as parseLedger,
  type Ledger,
} from '../contracts/managed/eligibility-gate/contract/index.js';
import type { EligibilityGatePrivateState } from '../src/witnesses-eligibility.js';

export interface EligibilityGateSimulator {
  contract: Contract<EligibilityGatePrivateState>;
  circuitContext: CircuitContext<EligibilityGatePrivateState>;
}

export function createEligibilityGateSimulator(initialValue = 0): EligibilityGateSimulator {
  const initialPrivateState: EligibilityGatePrivateState = { value: initialValue };
  const contract = new Contract<EligibilityGatePrivateState>({
    getValue: (): [EligibilityGatePrivateState, bigint] => [initialPrivateState, BigInt(initialPrivateState.value)],
  });
  const constructorResult = contract.initialState(
    createConstructorContext(initialPrivateState, sampleCoinPublicKey()),
  );
  const circuitContext = createCircuitContext(
    dummyContractAddress(),
    sampleCoinPublicKey(),
    constructorResult.currentContractState,
    constructorResult.currentPrivateState,
  );
  return { contract, circuitContext };
}

export function getLedger(sim: EligibilityGateSimulator): Ledger {
  return parseLedger(sim.circuitContext.currentQueryContext.state);
}

export function checkEligibility(sim: EligibilityGateSimulator, value: bigint) {
  const result = sim.contract.circuits.checkEligibility(sim.circuitContext, value);
  sim.circuitContext = result.context;
  return result;
}