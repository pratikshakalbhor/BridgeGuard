// Witnesses for Age / Eligibility Gate.
//
// The contract declares a single witness, `getValue(): Uint<8>`, which
// represents the user's private age/value supplied by the off-chain DApp.
// Its value is consumed inside the zero-knowledge proof and is
// NEVER disclosed to the ledger. The private-state slot backing this witness
// holds the value itself, so the witness simply returns its own private state.
//
// NOTE: the private state is stored as a truthy object (`{ value }`) rather
// than a bare number because midnight-js-contracts 4.1.1's `createCallOptions`
// drops `initialPrivateState` whenever it is falsy — a numeric value of `0`
// would never reach the witness (see dist/index.mjs `createCallOptions`).
import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import type { Ledger } from '../contracts/managed/eligibility-gate/contract/index.js';

export interface EligibilityGatePrivateState {
  value: number;
}

export const witnessesEligibility = {
  getValue: ({ privateState }: WitnessContext<Ledger, EligibilityGatePrivateState>): [
    EligibilityGatePrivateState,
    bigint,
  ] => [privateState, BigInt(privateState.value)],
};