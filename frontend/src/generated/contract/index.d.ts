import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  getRiskIntel(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
}

export type ImpureCircuits<PS> = {
  registerBridge(context: __compactRuntime.CircuitContext<PS>,
                 name_0: string,
                 srcChain_0: bigint,
                 dstChain_0: bigint,
                 tvl_0: bigint,
                 audited_0: bigint,
                 incidents_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  evaluateBridge(context: __compactRuntime.CircuitContext<PS>,
                 bridgeId_0: bigint,
                 amount_0: bigint,
                 maxRisk_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  flagBridge(context: __compactRuntime.CircuitContext<PS>,
             bridgeId_0: bigint,
             newStatus_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  registerBridge(context: __compactRuntime.CircuitContext<PS>,
                 name_0: string,
                 srcChain_0: bigint,
                 dstChain_0: bigint,
                 tvl_0: bigint,
                 audited_0: bigint,
                 incidents_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  evaluateBridge(context: __compactRuntime.CircuitContext<PS>,
                 bridgeId_0: bigint,
                 amount_0: bigint,
                 maxRisk_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  flagBridge(context: __compactRuntime.CircuitContext<PS>,
             bridgeId_0: bigint,
             newStatus_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  registerBridge(context: __compactRuntime.CircuitContext<PS>,
                 name_0: string,
                 srcChain_0: bigint,
                 dstChain_0: bigint,
                 tvl_0: bigint,
                 audited_0: bigint,
                 incidents_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  evaluateBridge(context: __compactRuntime.CircuitContext<PS>,
                 bridgeId_0: bigint,
                 amount_0: bigint,
                 maxRisk_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  flagBridge(context: __compactRuntime.CircuitContext<PS>,
             bridgeId_0: bigint,
             newStatus_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  bridges: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): { id: bigint,
                             name: string,
                             srcChain: bigint,
                             dstChain: bigint,
                             tvl: bigint,
                             audited: bigint,
                             incidents: bigint,
                             riskScore: bigint,
                             status: bigint
                           };
    [Symbol.iterator](): Iterator<[bigint, { id: bigint,
  name: string,
  srcChain: bigint,
  dstChain: bigint,
  tvl: bigint,
  audited: bigint,
  incidents: bigint,
  riskScore: bigint,
  status: bigint
}]>
  };
  readonly registryCount: bigint;
  readonly assessmentCount: bigint;
  readonly lastVerdict: bigint;
  readonly lastWithinTolerance: boolean;
  readonly lastBridgeId: bigint;
  latestVerdicts: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  latestWithin: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): boolean;
    [Symbol.iterator](): Iterator<[bigint, boolean]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
