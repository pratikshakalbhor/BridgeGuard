// Browser-local ZK proof generation for BridgeGuard AI.
//
// The reviewer requirement: "Proof generation must happen locally in the
// browser using the Midnight.js SDK. No server-side proof generation."
//
// This module implements that flow with the official Midnight.js browser
// provider stack (all verified against the installed 4.1.1 package typings):
//
//   - FetchZkConfigProvider    -> serves prover/verifier keys + .bzkir from
//                                 /zk/* on this origin (public artifacts only)
//   - dappConnectorProofProvider -> delegates proving to the CONNECTED WALLET
//                                 (1AM/Lace extension running on the user's
//                                 device) via WalletConnectedAPI.getProvingProvider.
//                                 No HTTP request is ever made to a proof server;
//                                 the wallet generates the proof locally.
//   - in-memory private state    -> the confidential intel feed stays in this
//                                 tab's memory; it is never sent to the backend.
//   - indexerPublicDataProvider  -> reads public on-chain state (browser-safe).
//   - findDeployedContract(...).callTx.evaluateBridge(...)
//                                 -> create unproven tx -> prove (wallet, local)
//                                    -> balance (wallet) -> submit (wallet).
//
// Private witness values (amount, maxRisk, intel) never leave the browser.

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { dappConnectorProofProvider } from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { Transaction, Proof, SignatureEnabled, Binding, CostModel, ContractAddress, type FinalizedTransaction, type TransactionId } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-utils';
import type {
  MidnightProviders,
  PrivateStateProvider,
  PrivateStateId,
  UnboundTransaction,
} from '@midnight-ntwrk/midnight-js-types';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import { Contract, type Ledger } from '@/generated/contract';
import { api } from '@/services/api';
import { BRIDGEGUARD_NETWORK_ID } from '@/services/wallet';

export const PRIVATE_STATE_ID = 'bridgeGuardPrivateStateV2';

export interface BridgeGuardV2PrivateState {
  intel: number;
}

export type BridgeGuardCircuitKeys = 'registerBridge' | 'evaluateBridge' | 'flagBridge';

// Same witness the backend registers in src/witnesses-v2.ts: the contract
// reads the confidential intel feed from private state on the user's device.
const witnesses: {
  getRiskIntel(context: WitnessContext<Ledger, BridgeGuardV2PrivateState>): [BridgeGuardV2PrivateState, bigint];
} = {
  getRiskIntel: ({ privateState }: WitnessContext<Ledger, BridgeGuardV2PrivateState>): [
    BridgeGuardV2PrivateState,
    bigint,
  ] => [privateState, BigInt(privateState.intel)],
};

const compiledContract = CompiledContract.make('bridgeguard', Contract).pipe(
  CompiledContract.withWitnesses(witnesses),
);

// Fallback public network endpoints (same values as src/network.ts preprod).
const DEFAULT_INDEXER = 'https://indexer.preprod.midnight.network/api/v4/graphql';
const DEFAULT_INDEXER_WS = 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws';

let providersPromise: Promise<MidnightProviders<BridgeGuardCircuitKeys, PrivateStateId, BridgeGuardV2PrivateState>> | null = null;

function inMemoryPrivateStateProvider(): PrivateStateProvider<PrivateStateId, BridgeGuardV2PrivateState> {
  const store = new Map<PrivateStateId, BridgeGuardV2PrivateState>();
  const signingKeys = new Map<ContractAddress, string>();
  return {
    setContractAddress() {},
    async set(privateStateId: PrivateStateId, state: BridgeGuardV2PrivateState) {
      store.set(privateStateId, state);
    },
    async get(privateStateId: PrivateStateId) {
      return store.get(privateStateId) ?? null;
    },
    async remove(privateStateId: PrivateStateId) {
      store.delete(privateStateId);
    },
    async clear() {
      store.clear();
    },
    async setSigningKey(address: ContractAddress, signingKey: string) {
      signingKeys.set(address, signingKey);
    },
    async getSigningKey(address: ContractAddress) {
      return signingKeys.get(address) ?? null;
    },
    async removeSigningKey(address: ContractAddress) {
      signingKeys.delete(address);
    },
    async clearSigningKeys() {
      signingKeys.clear();
    },
    // The in-memory store is intentionally not persistent: export/import
    // return empty payloads so the interface contract is satisfied without
    // implying durable storage that a fresh page load would lose.
    async exportPrivateStates() {
      return { format: 'midnight-private-state-export', encryptedPayload: '', salt: '' };
    },
    async importPrivateStates() {
      return { imported: 0, skipped: 0, overwritten: 0 };
    },
    async exportSigningKeys() {
      return { format: 'midnight-signing-key-export', encryptedPayload: '', salt: '' };
    },
    async importSigningKeys() {
      return { imported: 0, skipped: 0, overwritten: 0 };
    },
  };
}

async function buildProviders(apiConn: ConnectedAPI): Promise<MidnightProviders<BridgeGuardCircuitKeys, PrivateStateId, BridgeGuardV2PrivateState>> {
  setNetworkId(BRIDGEGUARD_NETWORK_ID as 'undeployed' | 'preview' | 'preprod' | 'mainnet');

  const config = await apiConn.getConfiguration().catch(() => null);
  const indexerUri = config?.indexerUri ?? DEFAULT_INDEXER;
  const indexerWsUri = config?.indexerWsUri ?? DEFAULT_INDEXER_WS;
  const shielded = await apiConn.getShieldedAddresses();

  const zkConfigProvider = new FetchZkConfigProvider<BridgeGuardCircuitKeys>(
    `${window.location.origin}/zk`,
    fetch.bind(window),
  );

  // Delegates proving to the connected wallet extension (runs locally on the
  // user's device). Returns a transaction-level ProofProvider.
  const proofProvider = await dappConnectorProofProvider(
    apiConn,
    zkConfigProvider,
    CostModel.initialCostModel(),
  );

  const walletProvider = {
    getCoinPublicKey: () => shielded.shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shielded.shieldedEncryptionPublicKey,
    async balanceTx(tx: UnboundTransaction): Promise<FinalizedTransaction> {
      const balanced = await apiConn.balanceUnsealedTransaction(toHex(tx.serialize()), { payFees: true });
      return Transaction.deserialize<SignatureEnabled, Proof, Binding>('signature', 'proof', 'binding', fromHex(balanced.tx));
    },
  };

  const midnightProvider = {
    async submitTx(tx: FinalizedTransaction): Promise<TransactionId> {
      await apiConn.submitTransaction(toHex(tx.serialize()));
      return tx.identifiers()[0];
    },
  };

  return {
    privateStateProvider: inMemoryPrivateStateProvider(),
    publicDataProvider: indexerPublicDataProvider(indexerUri, indexerWsUri),
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
  };
}

async function resolveContractAddress(): Promise<string> {
  const fromEnv = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_CONTRACT_ADDRESS;
  if (fromEnv) return fromEnv;
  const state = await api.getState().catch(() => null);
  if (state?.contractAddress) return state.contractAddress;
  throw new Error('Contract address unavailable. Set VITE_CONTRACT_ADDRESS or start the BridgeGuard backend.');
}

export interface BrowserEvaluateInput {
  bridgeId: string;
  amount: string;
  maxRisk: number;
  intel: number;
  wallet: ConnectedAPI;
}

export interface BrowserEvaluateResult {
  txId: string;
  blockHeight: string | null;
}

/**
 * Runs the full private evaluation locally: writes the confidential intel into
 * the in-memory private state, creates the unproven call transaction, proves it
 * through the connected wallet (local proving), balances it via the wallet
 * (approval + DUST fee) and submits it through the wallet. None of the private
 * witness values are sent to the BridgeGuard backend or any proof server.
 */
export async function evaluateBridgeInBrowser(input: BrowserEvaluateInput): Promise<BrowserEvaluateResult> {
  const contractAddress = await resolveContractAddress();
  const providers = await (providersPromise ?? (providersPromise = buildProviders(input.wallet)));

  providers.privateStateProvider.setContractAddress(contractAddress as ContractAddress);
  await providers.privateStateProvider.set(PRIVATE_STATE_ID, { intel: input.intel });

  const deployed = await findDeployedContract(providers as never, {
    compiledContract: compiledContract as never,
    contractAddress: contractAddress as ContractAddress,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: { intel: 0 },
  });

  const tx = await deployed.callTx.evaluateBridge(
    BigInt(input.bridgeId),
    BigInt(input.amount),
    BigInt(input.maxRisk),
  );

  return { txId: tx.public.txId, blockHeight: String(tx.public.blockHeight) };
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

/**
 * Watches the public indexer for the submitted transaction and then reads the
 * coarse disclosed verdict from the public ledger state. No private inputs are
 * involved: the verdict is the public disclosure produced by the proof.
 */
export async function waitForConfirmationAndVerdict(bridgeId: string, txId: string, onPending?: (message: string) => void): Promise<{
  status: 'confirmed' | 'pending';
  blockHeight?: string;
  verdict?: string | null;
  verdictLabel?: string | null;
  within?: boolean | null;
}> {
  onPending?.('Watching the indexer for on-chain confirmation…');
  const data = await withTimeout(providersPromise
    ? providersPromise.then((p) => p.publicDataProvider.watchForTxData(txId as never))
    : Promise.resolve(null), 60_000, null as never);

  if (!data) {
    return { status: 'pending' };
  }

  let verdict: string | null = null;
  let within: boolean | null = null;
  for (let i = 0; i < 10; i += 1) {
    const state = await api.getState().catch(() => null);
    const entry = state?.ledger.latestVerdicts.find((e) => e.key === bridgeId);
    if (entry && state) {
      verdict = entry.value;
      within = state.ledger.latestWithin.find((e) => e.key === bridgeId)?.value === 'true';
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  return {
    status: 'confirmed',
    blockHeight: String((data as { blockHeight: number }).blockHeight),
    verdict,
    verdictLabel: verdict !== null ? ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Number(verdict)] ?? verdict : null,
    within,
  };
}