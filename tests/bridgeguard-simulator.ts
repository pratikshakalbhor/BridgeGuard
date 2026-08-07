// In-process simulator harness for the BridgeGuard AI contract.
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
} from '../contracts/managed/bridgeguard/contract/index.js';
import type { BridgeGuardPrivateState } from '../src/witnesses.js';

export interface BridgeGuardSimulator {
  contract: Contract<BridgeGuardPrivateState>;
  circuitContext: CircuitContext<BridgeGuardPrivateState>;
}

export interface RegisterBridgeArgs {
  name: string;
  srcChain: bigint;
  dstChain: bigint;
  tvl: bigint;
  audited: bigint;
  incidents: bigint;
}

export function createBridgeGuardSimulator(intelValue = 0): BridgeGuardSimulator {
  const initialPrivateState: BridgeGuardPrivateState = { intel: intelValue };
  const contract = new Contract<BridgeGuardPrivateState>({
    getRiskIntel: (): [BridgeGuardPrivateState, bigint] => [initialPrivateState, BigInt(initialPrivateState.intel)],
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

export function getLedger(sim: BridgeGuardSimulator): Ledger {
  return parseLedger(sim.circuitContext.currentQueryContext.state);
}

export function registerBridge(sim: BridgeGuardSimulator, args: RegisterBridgeArgs) {
  const result = sim.contract.circuits.registerBridge(
    sim.circuitContext,
    args.name,
    args.srcChain,
    args.dstChain,
    args.tvl,
    args.audited,
    args.incidents,
  );
  sim.circuitContext = result.context;
  return result;
}

export function evaluateBridge(sim: BridgeGuardSimulator, bridgeId: bigint, amount: bigint, maxRisk: bigint) {
  const result = sim.contract.circuits.evaluateBridge(sim.circuitContext, bridgeId, amount, maxRisk);
  sim.circuitContext = result.context;
  return result;
}

export function flagBridge(sim: BridgeGuardSimulator, bridgeId: bigint, newStatus: bigint) {
  const result = sim.contract.circuits.flagBridge(sim.circuitContext, bridgeId, newStatus);
  sim.circuitContext = result.context;
  return result;
}
