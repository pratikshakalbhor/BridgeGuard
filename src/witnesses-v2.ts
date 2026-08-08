// Witnesses for BridgeGuard AI v2.
//
// Identical shape to src/witnesses.ts but typed against the v2 compiled
// contract (contracts/managed/bridgeguard-v2). The witness, getRiskIntel,
// reads the confidential intel feed from the contract's private state; the
// frontend/server rewrites that private state via the private-state provider
// before each evaluateBridge call so each evaluation can use fresh intel.
import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import type { Ledger } from '../contracts/managed/bridgeguard-v2/contract/index.js';

export interface BridgeGuardV2PrivateState {
  intel: number;
}

export const witnessesV2 = {
  getRiskIntel: ({ privateState }: WitnessContext<Ledger, BridgeGuardV2PrivateState>): [
    BridgeGuardV2PrivateState,
    bigint,
  ] => [privateState, BigInt(privateState.intel)],
};
