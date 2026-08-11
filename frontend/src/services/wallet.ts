// Midnight wallet integration (Midnight DApp Connector API).
//
// BridgeGuard runs on Midnight. Midnight browser wallets (1AM, Lace) inject the
// Midnight DApp Connector API (NOT the Cardano CIP-30 API) into the global
// `window.midnight` object — 1AM under `window.midnight['1am']`, Lace
// historically under `window.midnight.mnLace` (see the DApp Connector API
// reference at https://docs.midnight.network/blog/connect-dapp-lace-wallet).
// A regular Cardano Lace wallet (`window.cardano.lace`) is NOT a Midnight
// wallet and is intentionally not treated as one.
//
// The integration is deliberately wallet-neutral: any wallet exposing the
// standard DApp Connector `connect(networkId) → ConnectedAPI` entry point
// works, with 1AM preferred when several extensions are installed.
//
// There is deliberately NO demo fallback: without the extension the UI reports
// the wallet as disconnected rather than fabricating a session.

import '@midnight-ntwrk/dapp-connector-api';
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';

export interface WalletServiceConfig {
  indexerUri?: string;
  indexerWsUri?: string;
  proverServerUri?: string;
  substrateNodeUri?: string;
  networkId?: string;
}

export interface WalletSession {
  /** Unshielded Midnight address (mn_1…) in Bech32m format. */
  address: string | null;
  shieldedAddress: string | null;
  network: string;
  networkId: string;
  installed: boolean;
  connected: boolean;
  /** Display name reported by the wallet extension (e.g. "1AM"). */
  walletName: string;
  /** Injection key under `window.midnight` (e.g. "1am", "mnLace"). */
  walletId: string;
  /** Reverse-DNS identifier reported by the wallet, if any. */
  rdns: string | null;
  apiVersion: string;
  serviceConfig: WalletServiceConfig | null;
}

// The BridgeGuard backend runs against Midnight Preview.
export const BRIDGEGUARD_NETWORK_ID = 'preview';

const STORAGE_KEY = 'bridgeguard-wallet-session';

export function networkLabel(networkId: string): string {
  switch (networkId) {
    case 'undeployed':
      return 'Local devnet (undeployed)';
    case 'preview':
      return 'Midnight preview';
    case 'preprod':
      return 'Midnight preprod';
    case 'mainnet':
      return 'Midnight mainnet';
    default:
      return `Midnight network (${networkId})`;
  }
}

interface FoundWallet {
  id: string;
  wallet: InitialAPI;
}

/**
 * Locate the Midnight wallet injected by the browser wallet extension. Prefers
 * the 1AM wallet (`window.midnight['1am']`), then the legacy Lace injection
 * ids (`mnLace` / `lace` / `midnight`), and otherwise accepts any compatible
 * wallet exposing the DApp Connector `connect` method. When several extensions
 * are installed, the preferred list ensures the wallet the user actually uses
 * (1AM, on Midnight Preview) is the one that gets connected.
 */
export function findMidnightWallet(): FoundWallet | null {
  if (typeof window === 'undefined' || !window.midnight) return null;
  const entries = Object.entries(window.midnight);
  if (entries.length === 0) return null;
  const compatible = ([, w]: [string, InitialAPI]) =>
    !!w && typeof w.connect === 'function';
  for (const key of ['1am', 'mnLace', 'lace', 'midnight']) {
    const entry = entries.find(([id]) => id === key);
    if (entry && compatible(entry)) return { id: entry[0], wallet: entry[1] };
  }
  for (const entry of entries) {
    if (compatible(entry)) return { id: entry[0], wallet: entry[1] };
  }
  return null;
}

export function walletInstalled(): boolean {
  return findMidnightWallet() !== null;
}

// The live ConnectedAPI from the wallet must be RETAINED in memory for the whole
// session (same rule as the Phase 0 POC): balanceUnsealedTransaction and
// submitTransaction only exist on this object, and re-resolving the wallet each
// call would drop the pending approval context. Cleared only on explicit
// disconnect.
let retainedApi: ConnectedAPI | null = null;

/** The live connected wallet API (signing/funding handle), or null. */
export function getConnectedApi(): ConnectedAPI | null {
  return retainedApi;
}

function readStored(): WalletSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WalletSession) : null;
  } catch {
    return null;
  }
}

function clearStored() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage may be unavailable.
  }
}

function writeStored(session: WalletSession) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // localStorage may be unavailable; the in-memory session still works.
  }
}

const DISPLAY_NAMES: Record<string, string> = {
  '1am': '1AM',
  mnLace: 'Lace',
  lace: 'Lace',
  midnight: 'Lace',
};

function buildSession(
  found: FoundWallet,
  address: string,
  shielded: string | null,
  networkId: string,
  serviceConfig: WalletServiceConfig | null,
): WalletSession {
  return {
    address,
    shieldedAddress: shielded,
    network: networkLabel(networkId),
    networkId,
    installed: true,
    connected: true,
    // The wallet's own reported name (e.g. "1AM"); fall back to the injection
    // id normalized to a human-readable form for known extensions.
    walletName: found.wallet.name ?? DISPLAY_NAMES[found.id] ?? found.id,
    walletId: found.id,
    rdns: found.wallet.rdns ?? null,
    apiVersion: found.wallet.apiVersion ?? 'unknown',
    serviceConfig,
  };
}

/**
 * Connect to the injected Midnight wallet for the given network via the
 * standard DApp Connector `connect(networkId)` entry point. Throws on failure.
 */
export async function connectWallet(networkId: string = BRIDGEGUARD_NETWORK_ID): Promise<WalletSession> {
  const found = findMidnightWallet();
  if (!found) {
    throw new Error('No Midnight wallet detected. Open 1AM (or another Midnight wallet extension) first.');
  }
  try {
    const connected = await found.wallet.connect(networkId);
    // Retain the connected API for wallet-signed transactions (Phase 0 POC
    // rule: the object must not be discarded after connect resolves).
    retainedApi = connected;

    const status = await connected.getConnectionStatus().catch(() => null);
    const [unshieldedRes, shieldedRes] = await Promise.all([
      connected.getUnshieldedAddress().catch(() => ({ unshieldedAddress: '' as string })),
      connected.getShieldedAddresses().catch(() => null),
    ]);
    const address = unshieldedRes?.unshieldedAddress ?? '';
    if (!address) throw new Error('Wallet connected but returned no unshielded address.');

    if (status && status.status !== 'connected') {
      throw new Error(`Wallet connection is not active (status: ${status.status}).`);
    }

    const config = (await connected.getConfiguration().catch(() => null)) as WalletServiceConfig | null;
    const actualNetwork =
      status && status.status === 'connected' ? status.networkId : config?.networkId ?? networkId;

    const session = buildSession(found, address, shieldedRes?.shieldedAddress ?? null, actualNetwork, config ? { ...config } : null);
    writeStored(session);
    return session;
  } catch (err) {
    throw new Error(err instanceof Error ? `Wallet connection failed: ${err.message}` : 'Wallet connection failed.');
  }
}

/**
 * Return the stored session only when the Midnight wallet extension is actually
 * injected, an address is on record, and the same wallet extension is still the
 * one injected (a session persisted by a different wallet is dropped). A stored
 * entry by itself is never enough to claim "connected" — the caller must
 * re-verify against the wallet.
 */
export function restoreWalletSession(): WalletSession | null {
  const found = findMidnightWallet();
  if (!found) return null;
  const stored = readStored();
  if (!stored?.address) return null;
  if (stored.walletId && stored.walletId !== found.id) {
    // The persisted session belongs to a different wallet extension — drop it
    // so it can neither fake a connection nor be reused by the wrong wallet.
    clearStored();
    return null;
  }
  return stored;
}

export function disconnectWallet(): void {
  retainedApi = null;
  clearStored();
}
