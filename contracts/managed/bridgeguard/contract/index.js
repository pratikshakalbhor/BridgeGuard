import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

const _descriptor_0 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_1 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_2 = __compactRuntime.CompactTypeOpaqueString;

class _Bridge_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()))))))));
  }
  fromValue(value_0) {
    return {
      id: _descriptor_1.fromValue(value_0),
      name: _descriptor_2.fromValue(value_0),
      srcChain: _descriptor_1.fromValue(value_0),
      dstChain: _descriptor_1.fromValue(value_0),
      tvl: _descriptor_1.fromValue(value_0),
      audited: _descriptor_0.fromValue(value_0),
      incidents: _descriptor_0.fromValue(value_0),
      riskScore: _descriptor_0.fromValue(value_0),
      status: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.id).concat(_descriptor_2.toValue(value_0.name).concat(_descriptor_1.toValue(value_0.srcChain).concat(_descriptor_1.toValue(value_0.dstChain).concat(_descriptor_1.toValue(value_0.tvl).concat(_descriptor_0.toValue(value_0.audited).concat(_descriptor_0.toValue(value_0.incidents).concat(_descriptor_0.toValue(value_0.riskScore).concat(_descriptor_0.toValue(value_0.status)))))))));
  }
}

const _descriptor_3 = new _Bridge_0();

const _descriptor_4 = __compactRuntime.CompactTypeBoolean;

const _descriptor_5 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_6 = new __compactRuntime.CompactTypeBytes(32);

class _Either_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_6.alignment().concat(_descriptor_6.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_4.fromValue(value_0),
      left: _descriptor_6.fromValue(value_0),
      right: _descriptor_6.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.is_left).concat(_descriptor_6.toValue(value_0.left).concat(_descriptor_6.toValue(value_0.right)));
  }
}

const _descriptor_7 = new _Either_0();

const _descriptor_8 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_6.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_6.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_6.toValue(value_0.bytes);
  }
}

const _descriptor_9 = new _ContractAddress_0();

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    if (typeof(witnesses_0.getRiskIntel) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named getRiskIntel');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      registerBridge: (...args_1) => {
        if (args_1.length !== 7) {
          throw new __compactRuntime.CompactError(`registerBridge: expected 7 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const name_0 = args_1[1];
        const srcChain_0 = args_1[2];
        const dstChain_0 = args_1[3];
        const tvl_0 = args_1[4];
        const audited_0 = args_1[5];
        const incidents_0 = args_1[6];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('registerBridge',
                                     'argument 1 (as invoked from Typescript)',
                                     'bridgeguard.compact line 78 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(srcChain_0) === 'bigint' && srcChain_0 >= 0n && srcChain_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('registerBridge',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'bridgeguard.compact line 78 char 1',
                                     'Uint<0..18446744073709551616>',
                                     srcChain_0)
        }
        if (!(typeof(dstChain_0) === 'bigint' && dstChain_0 >= 0n && dstChain_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('registerBridge',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'bridgeguard.compact line 78 char 1',
                                     'Uint<0..18446744073709551616>',
                                     dstChain_0)
        }
        if (!(typeof(tvl_0) === 'bigint' && tvl_0 >= 0n && tvl_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('registerBridge',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'bridgeguard.compact line 78 char 1',
                                     'Uint<0..18446744073709551616>',
                                     tvl_0)
        }
        if (!(typeof(audited_0) === 'bigint' && audited_0 >= 0n && audited_0 <= 255n)) {
          __compactRuntime.typeError('registerBridge',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'bridgeguard.compact line 78 char 1',
                                     'Uint<0..256>',
                                     audited_0)
        }
        if (!(typeof(incidents_0) === 'bigint' && incidents_0 >= 0n && incidents_0 <= 255n)) {
          __compactRuntime.typeError('registerBridge',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'bridgeguard.compact line 78 char 1',
                                     'Uint<0..256>',
                                     incidents_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(name_0).concat(_descriptor_1.toValue(srcChain_0).concat(_descriptor_1.toValue(dstChain_0).concat(_descriptor_1.toValue(tvl_0).concat(_descriptor_0.toValue(audited_0).concat(_descriptor_0.toValue(incidents_0)))))),
            alignment: _descriptor_2.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment())))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._registerBridge_0(context,
                                                partialProofData,
                                                name_0,
                                                srcChain_0,
                                                dstChain_0,
                                                tvl_0,
                                                audited_0,
                                                incidents_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      evaluateBridge: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`evaluateBridge: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const bridgeId_0 = args_1[1];
        const amount_0 = args_1[2];
        const maxRisk_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('evaluateBridge',
                                     'argument 1 (as invoked from Typescript)',
                                     'bridgeguard.compact line 114 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(bridgeId_0) === 'bigint' && bridgeId_0 >= 0n && bridgeId_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('evaluateBridge',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'bridgeguard.compact line 114 char 1',
                                     'Uint<0..18446744073709551616>',
                                     bridgeId_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('evaluateBridge',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'bridgeguard.compact line 114 char 1',
                                     'Uint<0..18446744073709551616>',
                                     amount_0)
        }
        if (!(typeof(maxRisk_0) === 'bigint' && maxRisk_0 >= 0n && maxRisk_0 <= 255n)) {
          __compactRuntime.typeError('evaluateBridge',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'bridgeguard.compact line 114 char 1',
                                     'Uint<0..256>',
                                     maxRisk_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(bridgeId_0).concat(_descriptor_1.toValue(amount_0).concat(_descriptor_0.toValue(maxRisk_0))),
            alignment: _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_0.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._evaluateBridge_0(context,
                                                partialProofData,
                                                bridgeId_0,
                                                amount_0,
                                                maxRisk_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      flagBridge: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`flagBridge: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const bridgeId_0 = args_1[1];
        const newStatus_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('flagBridge',
                                     'argument 1 (as invoked from Typescript)',
                                     'bridgeguard.compact line 140 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(bridgeId_0) === 'bigint' && bridgeId_0 >= 0n && bridgeId_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('flagBridge',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'bridgeguard.compact line 140 char 1',
                                     'Uint<0..18446744073709551616>',
                                     bridgeId_0)
        }
        if (!(typeof(newStatus_0) === 'bigint' && newStatus_0 >= 0n && newStatus_0 <= 255n)) {
          __compactRuntime.typeError('flagBridge',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'bridgeguard.compact line 140 char 1',
                                     'Uint<0..256>',
                                     newStatus_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(bridgeId_0).concat(_descriptor_0.toValue(newStatus_0)),
            alignment: _descriptor_1.alignment().concat(_descriptor_0.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._flagBridge_0(context,
                                            partialProofData,
                                            bridgeId_0,
                                            newStatus_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      registerBridge: this.circuits.registerBridge,
      evaluateBridge: this.circuits.evaluateBridge,
      flagBridge: this.circuits.flagBridge
    };
    this.provableCircuits = {
      registerBridge: this.circuits.registerBridge,
      evaluateBridge: this.circuits.evaluateBridge,
      flagBridge: this.circuits.flagBridge
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialPrivateState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialPrivateState' in argument 1 (as invoked from Typescript)`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('registerBridge', new __compactRuntime.ContractOperation());
    state_0.setOperation('evaluateBridge', new __compactRuntime.ContractOperation());
    state_0.setOperation('flagBridge', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(1n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(2n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(3n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(4n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(false),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(5n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _getRiskIntel_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getRiskIntel(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0n && result_0 <= 255n)) {
      __compactRuntime.typeError('getRiskIntel',
                                 'return value',
                                 'bridgeguard.compact line 49 char 1',
                                 'Uint<0..256>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _registerBridge_0(context,
                    partialProofData,
                    name_0,
                    srcChain_0,
                    dstChain_0,
                    tvl_0,
                    audited_0,
                    incidents_0)
  {
    let t_0;
    __compactRuntime.assert((t_0 = _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                             partialProofData,
                                                                                             [
                                                                                              { dup: { n: 0 } },
                                                                                              { idx: { cached: false,
                                                                                                       pushPath: false,
                                                                                                       path: [
                                                                                                              { tag: 'value',
                                                                                                                value: { value: _descriptor_0.toValue(1n),
                                                                                                                         alignment: _descriptor_0.alignment() } }] } },
                                                                                              { popeq: { cached: true,
                                                                                                         result: undefined } }]).value),
                             t_0 < 10n),
                            'bridge registry is full');
    __compactRuntime.assert(!this._equal_0(srcChain_0, dstChain_0),
                            'source and destination chains must differ');
    __compactRuntime.assert(tvl_0 <= 1000000000000000n,
                            'TVL exceeds supported range');
    __compactRuntime.assert(incidents_0 <= 20n, 'incident count out of range');
    __compactRuntime.assert(this._equal_1(audited_0, 0n)
                            ||
                            this._equal_2(audited_0, 1n),
                            'audited must be 0 or 1');
    const id_0 = _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                           partialProofData,
                                                                           [
                                                                            { dup: { n: 0 } },
                                                                            { idx: { cached: false,
                                                                                     pushPath: false,
                                                                                     path: [
                                                                                            { tag: 'value',
                                                                                              value: { value: _descriptor_0.toValue(1n),
                                                                                                       alignment: _descriptor_0.alignment() } }] } },
                                                                            { popeq: { cached: true,
                                                                                       result: undefined } }]).value);
    const b_0 = { id: id_0,
                  name: name_0,
                  srcChain: srcChain_0,
                  dstChain: dstChain_0,
                  tvl: tvl_0,
                  audited: audited_0,
                  incidents: incidents_0,
                  riskScore: this._computeBaseScore_0(audited_0, incidents_0),
                  status: 0n };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_0.toValue(0n),
                                                                  alignment: _descriptor_0.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(id_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(b_0),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_0 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_0.toValue(1n),
                                                                  alignment: _descriptor_0.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_5.toValue(tmp_0),
                                                                alignment: _descriptor_5.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _evaluateBridge_0(context, partialProofData, bridgeId_0, amount_0, maxRisk_0)
  {
    __compactRuntime.assert(amount_0 > 0n, 'transfer amount must be positive');
    __compactRuntime.assert(amount_0 <= 1000000000000n,
                            'transfer amount exceeds supported range');
    __compactRuntime.assert(maxRisk_0 <= 3n,
                            'risk tolerance must be between 0 (low) and 3 (critical)');
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_0.toValue(0n),
                                                                                                                  alignment: _descriptor_0.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(bridgeId_0),
                                                                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'bridge not found');
    const intel_0 = this._getRiskIntel_0(context, partialProofData);
    __compactRuntime.assert(intel_0 <= 20n, 'intel incident count out of range');
    const b_0 = _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(0n),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_1.toValue(bridgeId_0),
                                                                                                      alignment: _descriptor_1.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    const verdict_0 = this._computeVerdict_0(b_0, amount_0, intel_0);
    const within_0 = verdict_0 <= maxRisk_0;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(3n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(verdict_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(4n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(within_0),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(5n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(bridgeId_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_0 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_0.toValue(2n),
                                                                  alignment: _descriptor_0.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_5.toValue(tmp_0),
                                                                alignment: _descriptor_5.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _flagBridge_0(context, partialProofData, bridgeId_0, newStatus_0) {
    __compactRuntime.assert(newStatus_0 <= 2n,
                            'status must be 0 (active), 1 (flagged), or 2 (compromised)');
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_0.toValue(0n),
                                                                                                                  alignment: _descriptor_0.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(bridgeId_0),
                                                                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'bridge not found');
    const b_0 = _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(0n),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_1.toValue(bridgeId_0),
                                                                                                      alignment: _descriptor_1.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    const updated_0 = { id: b_0.id,
                        name: b_0.name,
                        srcChain: b_0.srcChain,
                        dstChain: b_0.dstChain,
                        tvl: b_0.tvl,
                        audited: b_0.audited,
                        incidents: b_0.incidents,
                        riskScore: b_0.riskScore,
                        status: newStatus_0 };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_0.toValue(0n),
                                                                  alignment: _descriptor_0.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(bridgeId_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(updated_0),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _computeBaseScore_0(audited_0, incidents_0) {
    const auditPenalty_0 = this._equal_3(audited_0, 1n) ? 0n : 20n;
    const incidentScore_0 = ((t1) => {
                              if (t1 > 255n) {
                                throw new __compactRuntime.CompactError('bridgeguard.compact line 168 char 34: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                              }
                              return t1;
                            })(incidents_0 * 5n);
    const raw_0 = auditPenalty_0 + incidentScore_0;
    const clamped_0 = raw_0 > 100n ? 100n : raw_0;
    return ((t1) => {
             if (t1 > 255n) {
               throw new __compactRuntime.CompactError('bridgeguard.compact line 171 char 10: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
             }
             return t1;
           })(clamped_0);
  }
  _computeVerdict_0(b_0, amount_0, intel_0) {
    const exposure_0 = amount_0 > b_0.tvl * 2n ?
                       15n :
                       amount_0 > b_0.tvl ? 8n : 0n;
    const total_0 = b_0.riskScore
                    +
                    ((t1) => {
                      if (t1 > 255n) {
                        throw new __compactRuntime.CompactError('bridgeguard.compact line 181 char 6: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                      }
                      return t1;
                    })(b_0.incidents * 5n)
                    +
                    ((t1) => {
                      if (t1 > 255n) {
                        throw new __compactRuntime.CompactError('bridgeguard.compact line 182 char 6: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                      }
                      return t1;
                    })(intel_0 * 8n)
                    +
                    exposure_0;
    const verdict_0 = total_0 >= 75n ?
                      3n :
                      total_0 >= 55n ? 2n : total_0 >= 30n ? 1n : 0n;
    return verdict_0;
  }
  _equal_0(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_2(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_3(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    bridges: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(0n),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                                                                 alignment: _descriptor_1.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(0n),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'bridgeguard.compact line 67 char 1',
                                     'Uint<0..18446744073709551616>',
                                     key_0)
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(0n),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(key_0),
                                                                                                                                 alignment: _descriptor_1.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'bridgeguard.compact line 67 char 1',
                                     'Uint<0..18446744073709551616>',
                                     key_0)
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(0n),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(key_0),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[0];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_1.fromValue(key.value),      _descriptor_3.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    get registryCount() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_0.toValue(1n),
                                                                                                   alignment: _descriptor_0.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    },
    get assessmentCount() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_0.toValue(2n),
                                                                                                   alignment: _descriptor_0.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    },
    get lastVerdict() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_0.toValue(3n),
                                                                                                   alignment: _descriptor_0.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get lastWithinTolerance() {
      return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_0.toValue(4n),
                                                                                                   alignment: _descriptor_0.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get lastBridgeId() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_0.toValue(5n),
                                                                                                   alignment: _descriptor_0.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({ getRiskIntel: (...args) => undefined });
export const pureCircuits = {};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
