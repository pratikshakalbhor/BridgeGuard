// Witnesses for BridgeGuard AI.
//
// The contract declares a single witness, `getRiskIntel(): Uint<8>`, which
// represents a confidential incident-intelligence feed supplied by the
// off-chain DApp. Its value is consumed inside the zero-knowledge proof and is
// NEVER disclosed to the ledger. The private-state slot backing this witness
// holds the intel value itself, so the witness simply returns its own private
// state.
//
// NOTE: the private state is stored as a truthy object (`{ intel }`) rather
// than a bare number because midnight-js-contracts 4.1.1's `createCallOptions`
// drops `initialPrivateState` whenever it is falsy — a numeric intel of `0`
// would never reach the witness (see dist/index.mjs `createCallOptions`).
import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import type { Ledger } from '../contracts/managed/bridgeguard/contract/index.js';

export interface BridgeGuardPrivateState {
  intel: number;
}

export const witnesses = {
  getRiskIntel: ({ privateState }: WitnessContext<Ledger, BridgeGuardPrivateState>): [
    BridgeGuardPrivateState,
    bigint,
  ] => [privateState, BigInt(privateState.intel)],
};
