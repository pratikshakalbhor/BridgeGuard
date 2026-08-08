// Midnight Lace wallet integration (Midnight DApp Connector API).
//
// BridgeGuard runs on Midnight. The Midnight Lace browser extension injects the
// Midnight DApp Connector API (NOT the Cardano CIP-30 API) into the global
// `window.midnight` object — historically under `window.midnight.mnLace`
// (see https://docs.midnight.network/blog/connect-dapp-lace-wallet and the
// DApp Connector API reference). A regular Cardano Lace wallet
// (`window.cardano.lace`) is NOT a Midnight wallet and is intentionally not
// treated as one.
//
// There is deliberately NO demo fallback: without the extension the UI reports
// the wallet as disconnected rather than fabricating a session.

import '@midnight-ntwrk/dapp-connector-api';
import type { InitialAPI } from '@midnight-ntwrk/dapp-connector-api';

export interface LaceServiceConfig {
  indexerUri?: string;
  indexerWsUri?: string;
  proverServerUri?: string;
  substrateNodeUri?: string;
  networkId?: string;
}

export interface LaceSession {
  /** Unshielded Midnight address (mn_1…) in Bech32m format. */
  address: string | null;
  shieldedAddress: string | null;
  network: string;
  networkId: string;
  installed: boolean;
  connected: boolean;
  walletName: string;
  apiVersion: string;
  serviceConfig: LaceServiceConfig | null;
}

// The BridgeGuard backend runs against Midnight Preview.
export const BRIDGEGUARD_NETWORK_ID = 'preview';

const STORAGE_KEY = 'bridgeguard-lace-session';

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

export function laceInstalled(): boolean {
  return findMidnightWallet() !== null;
}

function readStored(): LaceSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LaceSession) : null;
  } catch {
    return null;
  }
}

function writeStored(session: LaceSession) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // localStorage may be unavailable; the in-memory session still works.
  }
}

function buildSession(
  found: FoundWallet,
  address: string,
  shielded: string | null,
  networkId: string,
  serviceConfig: LaceServiceConfig | null,
): LaceSession {
  return {
    address,
    shieldedAddress: shielded,
    network: networkLabel(networkId),
    networkId,
    installed: true,
    connected: true,
    walletName: (found.wallet as { name?: string }).name ?? found.id,
    apiVersion: (found.wallet as { apiVersion?: string }).apiVersion ?? 'unknown',
    serviceConfig,
  };
}

async function connectModern(
  found: FoundWallet,
  networkId: string,
): Promise<LaceSession> {
  const connected = await found.wallet.connect(networkId);

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

  const config = (await connected.getConfiguration().catch(() => null)) as LaceServiceConfig | null;
  const actualNetwork =
    status && status.status === 'connected' ? status.networkId : config?.networkId ?? networkId;

  return buildSession(found, address, shieldedRes?.shieldedAddress ?? null, actualNetwork, config ? { ...config } : null);
}

async function connectLegacy(
  found: FoundWallet,
  networkId: string,
): Promise<LaceSession> {
  // Older Midnight Lace builds exposed enable()/state()/serviceUriConfig().
  const api = found.wallet as unknown as {
    enable?: () => Promise<{
      state?: () => Promise<{ address?: string; shieldedAddress?: string }>;
      getUnshieldedAddress?: () => Promise<{ unshieldedAddress?: string }>;
    }>;
    serviceUriConfig?: () => Promise<LaceServiceConfig>;
  };
  if (typeof api.enable !== 'function') {
    throw new Error('Wallet does not expose a usable connection API.');
  }
  const walletApi = await api.enable();
  const state = typeof walletApi?.state === 'function' ? await walletApi.state() : null;
  const address =
    state?.address ??
    (typeof walletApi?.getUnshieldedAddress === 'function'
      ? (await walletApi.getUnshieldedAddress())?.unshieldedAddress ?? null
      : null);
  if (!address) throw new Error('Wallet connected but returned no address.');
  const config =
    typeof api.serviceUriConfig === 'function' ? await api.serviceUriConfig().catch(() => null) : null;
  return buildSession(found, address, state?.shieldedAddress ?? null, networkId, config ? { ...config } : null);
}

/** Connect to the Midnight Lace wallet for the given network. Throws on failure. */
export async function connectLace(networkId: string = BRIDGEGUARD_NETWORK_ID): Promise<LaceSession> {
  const found = findMidnightWallet();
  if (!found) {
    throw new Error('Lace Wallet not detected. Please install/open Lace Wallet.');
  }
  try {
    const modern = typeof (found.wallet as { connect?: unknown }).connect === 'function';
    const session = modern ? await connectModern(found, networkId) : await connectLegacy(found, networkId);
    writeStored(session);
    return session;
  } catch (err) {
    throw new Error(err instanceof Error ? `Lace connection failed: ${err.message}` : 'Lace connection failed.');
  }
}

/**
 * Return the stored session only when the Midnight wallet extension is actually
 * injected AND an address is on record. A stored entry by itself is never
 * enough to claim "connected" — the caller must re-verify against the wallet.
 */
export function restoreLaceSession(): LaceSession | null {
  if (!laceInstalled()) return null;
  const stored = readStored();
  if (!stored?.address) return null;
  return stored;
}

export function disconnectLace(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage may be unavailable.
  }
}
