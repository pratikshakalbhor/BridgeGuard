// Midnight wallet integration (Midnight DApp Connector API).
//
// BridgeGuard runs on Midnight. Midnight browser wallets (1AM, Lace) inject the
// Midnight DApp Connector API (NOT the Cardano CIP-30 API) into the global
// `window.midnight` object. Per the DApp Connector spec the API is injected
// under a UUID key, so wallets are enumerated dynamically and identified by
// their rdns / display name / capabilities rather than by fixed keys alone
// (the legacy keys `mnLace` / `lace` / `midnight` are kept only as hints).
// A regular Cardano Lace wallet (`window.cardano.lace`) is NOT a Midnight
// wallet and is intentionally not treated as one.
//
// The integration is deliberately wallet-neutral: any wallet exposing the
// standard DApp Connector `connect(networkId) → ConnectedAPI` entry point
// works, with Midnight 1AM preferred over Lace when several extensions are
// installed so the demo always connects the intended wallet.
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

// The BridgeGuard backend and contract run on Midnight Preprod. The network is
// overridable at build time with VITE_NETWORK_ID (e.g. VITE_NETWORK_ID=preview
// for local testing against the preview deployment); the default is preprod.
const SUPPORTED_NETWORK_IDS = ['undeployed', 'preview', 'preprod', 'mainnet'] as const;

function resolveNetworkId(value: string | undefined): string {
  return value && (SUPPORTED_NETWORK_IDS as readonly string[]).includes(value) ? value : 'preprod';
}

export const BRIDGEGUARD_NETWORK_ID: string = resolveNetworkId(import.meta.env.VITE_NETWORK_ID as string | undefined);

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
 * Locate the Midnight wallet injected by the browser wallet extension. The
 * DApp Connector spec injects wallets under `window.midnight` keyed by UUID,
 * so all entries are enumerated and identified by capability, rdns and
 * display name rather than by fixed keys alone. Midnight 1AM is preferred
 * over Lace so the BridgeGuard demo always connects the intended wallet when
 * several extensions are installed.
 */
export function findMidnightWallet(): FoundWallet | null {
  if (typeof window === 'undefined' || !window.midnight) return null;
  const entries = Object.entries(window.midnight);
  if (entries.length === 0) return null;
  const compatible = ([, w]: [string, InitialAPI]) =>
    !!w && typeof w === 'object' && typeof w.connect === 'function';
  const candidates = entries.filter(compatible);

  // 1AM first: identified by rdns/display name, with the legacy injection id
  // (`1am`) kept as a fallback hint.
  const oneAm = candidates.find(([id, w]) => id === '1am' || isOneAmWallet(w));
  if (oneAm) return { id: oneAm[0], wallet: oneAm[1] };

  // Then Midnight Lace, identified the same way, with the legacy injection ids
  // (`mnLace` / `lace` / `midnight`) kept as fallback hints.
  const lace = candidates.find(
    ([id, w]) => isLaceWallet(w) || id === 'mnLace' || id === 'lace' || id === 'midnight',
  );
  if (lace) return { id: lace[0], wallet: lace[1] };

  // Otherwise accept the first compatible wallet exposed by any extension.
  if (candidates.length > 0) return { id: candidates[0][0], wallet: candidates[0][1] };
  return null;
}

export interface WalletOption {
  /** Injection key under `window.midnight` (e.g. "1am", "mnLace"). */
  id: string;
  /** Display name reported by the wallet extension (e.g. "1AM", "Lace"). */
  name: string;
  /** Reverse-DNS identifier reported by the wallet, if any. */
  rdns: string | null;
}

/**
 * Enumerate EVERY compatible Midnight wallet injected under `window.midnight`
 * (not just the preferred one) so the UI can let the user choose. Ordering is
 * stable: 1AM first, then Lace, then any other compatible extension.
 */
export function listMidnightWallets(): WalletOption[] {
  if (typeof window === 'undefined' || !window.midnight) return [];
  const entries = Object.entries(window.midnight) as [string, InitialAPI][];
  const compatible = ([, w]: [string, InitialAPI]) =>
    !!w && typeof w === 'object' && typeof w.connect === 'function';
  const rank = ([id, w]: [string, InitialAPI]) => {
    if (id === '1am' || isOneAmWallet(w)) return 0;
    if (id === 'mnLace' || id === 'lace' || id === 'midnight' || isLaceWallet(w)) return 1;
    return 2;
  };
  return entries
    .filter(compatible)
    .sort((a, b) => rank(a) - rank(b))
    .map(([id, w]) => ({
      id,
      name: w.name ?? DISPLAY_NAMES[id] ?? id,
      rdns: w.rdns ?? null,
    }));
}

/** Locate a specific injected wallet by its `window.midnight` injection key. */
export function findMidnightWalletById(id: string): FoundWallet | null {
  if (typeof window === 'undefined' || !window.midnight) return null;
  const wallet = window.midnight[id] as InitialAPI | undefined;
  if (!wallet || typeof wallet !== 'object' || typeof wallet.connect !== 'function') return null;
  return { id, wallet };
}

/** True when the injected API belongs to the Midnight Lace wallet (by rdns or display name). */
function isLaceWallet(wallet: InitialAPI): boolean {
  const rdns = (wallet.rdns ?? '').toLowerCase();
  const name = (wallet.name ?? '').toLowerCase();
  return rdns.includes('lace') || name.includes('lace');
}

/** True when the injected API belongs to the 1AM wallet (by rdns or display name). */
function isOneAmWallet(wallet: InitialAPI): boolean {
  const rdns = (wallet.rdns ?? '').toLowerCase();
  const name = (wallet.name ?? '').toLowerCase();
  return rdns.includes('1am') || name.includes('1am');
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
 * standard DApp Connector `connect(networkId)` entry point. When `walletId`
 * is given the connection targets that specific injected wallet; otherwise
 * the preferred wallet (1AM first, then Lace) is used. Throws on failure.
 */
export async function connectWallet(
  networkId: string = BRIDGEGUARD_NETWORK_ID,
  walletId?: string,
): Promise<WalletSession> {
  const found = walletId ? findMidnightWalletById(walletId) : findMidnightWallet();
  if (!found) {
    throw new Error('No Midnight wallet detected. Open the Midnight Lace wallet (or 1AM) extension first.');
  }
  const withTimeout = <T>(p: Promise<T>, ms: number, label: string): Promise<T> =>
    Promise.race([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
      ),
    ]);

  try {
    const connected = await withTimeout(found.wallet.connect(networkId), 30000, 'Wallet connect');
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
