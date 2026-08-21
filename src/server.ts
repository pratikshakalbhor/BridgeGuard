/**
 * BridgeGuard AI v2 — local API server + static frontend host.
 *
 * Wraps the same wallet/proof plumbing used by deploy-v2.ts in a small Node
 * http server (no new dependencies) and serves the static UI from frontend/.
 *
 *   npx tsx src/server.ts            # default port 3000
 *   PORT=8080 npx tsx src/server.ts
 *
 * REST API (same-origin, JSON):
 *   GET  /api/state            -> full ledger snapshot + wallet meta (wallet-independent)
 *   GET  /api/balance          -> tNight + DUST balances (requires backend wallet)
 *   POST /api/register         -> registerBridge (requires backend wallet)
 *   POST /api/evaluate         -> feed intel, then evaluateBridge (private; requires backend wallet)
 *   POST /api/flag             -> flagBridge (requires backend wallet)
 *   *                          -> static assets from frontend/
 *
 * The backend wallet is an OPTIONAL background capability. /api/state and the
 * static frontend stay available even when createWallet()/waitForSyncedState()
 * fail, and even when no wallet credentials are configured at all. Endpoints
 * that actually require the backend wallet answer 503 ("wallet not ready")
 * until the background wallet is up.
 */
// ─── Global crash-guards (must be first, before any async code) ────────────────
// Wallet.Sync and other Midnight SDK internal loops can:
//   (a) throw unhandled promise rejections → caught by unhandledRejection
//   (b) throw synchronous errors           → caught by uncaughtException
//   (c) explicitly call process.exit()     → intercepted below
// All three paths are neutralised so Render never sees "Detected service
// running on port 10000" again just because of a Midnight SDK fiber failure.

// (c) Intercept explicit process.exit() calls from Effect-TS / Midnight SDK
const _realExit = process.exit.bind(process);
(process as any).exit = (code?: number): never => {
  // Only allow exit if WE call _realExit (e.g. SIGTERM shutdown). All others
  // are SDK-internal panics — log them and keep the server alive.
  console.error(`🔥 [process.exit(${code ?? ''}) INTERCEPTED] — keeping server alive. Stack:`);
  console.trace();
  // Return as if nothing happened (server stays up)
  return undefined as never;
};

// (a) Unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  console.error('🔥 [UNHANDLED REJECTION] A promise was rejected without a .catch():');
  if (reason instanceof Error) {
    console.error('   Message:', reason.message);
    console.error('   Stack:', reason.stack);
    if ((reason as any).cause) console.error('   Cause:', (reason as any).cause);
  } else {
    console.error('   Reason:', reason);
  }
  // Do NOT exit — keep the server alive
});

// (b) Uncaught synchronous exceptions
process.on('uncaughtException', (err: Error, origin: string) => {
  console.error(`🔥 [UNCAUGHT EXCEPTION] origin=${origin}`);
  console.error('   Error:', err?.message ?? err);
  console.error('   Stack:', err?.stack);
  if ((err as any).cause) console.error('   Cause:', (err as any).cause);
  // Do NOT exit — keep the server alive so /api/state 503 fallback works
});

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';
import * as Rx from 'rxjs';

// Midnight SDK imports
import { createUnprovenCallTx, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { Transaction } from '@midnight-ntwrk/ledger-v8';

// @ts-expect-error Required for wallet sync
globalThis.WebSocket = WebSocket;

import { resolveNetwork, getOrCreateWallet, formatWalletBackupNotice, getDeployment, loadState } from './network';
import { createWallet, persistWalletState, unshieldedToken, type WalletContext } from './wallet';
import { witnessesV2 } from './witnesses-v2';

const PRIVATE_STATE_ID = 'bridgeGuardPrivateStateV2';
const FRONTEND_DIR = path.resolve(fileURLToPath(import.meta.url), '..', '..', 'frontend', 'dist');
const PORT = Number(process.env.PORT) || 3000;

const VERDICT_LABELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const STATUS_LABELS = ['ACTIVE', 'FLAGGED', 'COMPROMISED'] as const;

// Optional attribution: the browser may pass the connected Midnight wallet
// address (mn_… Bech32m) so on-chain actions are tagged with the real account.
function attributionAddress(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^mn_[a-z0-9_]+$/i.test(trimmed) ? trimmed : null;
}

const { network, config: networkConfig } = resolveNetwork();

// The backend wallet is an OPTIONAL background capability. /api/state and the
// static frontend are served independently of it; only endpoints that submit
// transactions through the backend wallet require it. In production, when no
// wallet credentials are configured (env vars or persisted state), the
// capability is disabled and the server still boots and serves /api/state +
// the frontend. In dev (NODE_ENV !== 'production') the previous behavior is
// preserved: a wallet is generated on demand when none exists.
const walletCredentialsAvailable =
  process.env.NODE_ENV === 'production'
    ? Boolean(process.env.MIDNIGHT_WALLET_MNEMONIC || process.env.MIDNIGHT_WALLET_SEED) ||
      (() => {
        try {
          return Boolean(loadState()?.wallets?.[network]?.seed);
        } catch {
          return false;
        }
      })()
    : true;

const WALLET = walletCredentialsAvailable ? getOrCreateWallet(network) : null;
const SEED = WALLET ? WALLET.seed : null;
const walletDisabled = WALLET === null;
if (WALLET) {
  const notice = formatWalletBackupNotice(WALLET, network);
  if (notice) console.log(notice);
}
if (walletDisabled) {
  console.warn('  ⚠ Backend wallet capability disabled: no MIDNIGHT_WALLET_MNEMONIC / MIDNIGHT_WALLET_SEED and no persisted wallet on file.');
  console.warn('    /api/state and the frontend remain available; wallet-dependent endpoints (/api/balance, /api/register, /api/evaluate, /api/flag, /api/poc/*) will return 503.');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const zkConfigPath = path.resolve(__dirname, '..', 'contracts', 'managed', 'bridgeguard-v2');
const contractPath = path.join(zkConfigPath, 'contract', 'index.js');

if (!fs.existsSync(contractPath)) {
  console.error('\n❌ Contract not compiled! Run: compact compile contracts/bridgeguard-v2.compact contracts/managed/bridgeguard-v2\n');
  process.exit(1);
}

const BridgeGuardV2 = await import(pathToFileURL(contractPath).href);

const compiledContract = CompiledContract.make('bridgeguard', BridgeGuardV2.Contract).pipe(
  CompiledContract.withWitnesses(witnessesV2 as never),
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);

// ─── Providers ─────────────────────────────────────────────────────────────────

async function createProviders(walletCtx: WalletContext) {
  const privateStatePassword = process.env.PRIVATE_STATE_PASSWORD?.trim() || 'Local-Devnet-Development-Placeholder-1';

  const walletProvider = {
    getCoinPublicKey: () => walletCtx.shieldedSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => walletCtx.shieldedSecretKeys.encryptionPublicKey,
    async balanceTx(tx: any, ttl?: Date) {
      const recipe = await walletCtx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: walletCtx.shieldedSecretKeys, dustSecretKey: walletCtx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      return walletCtx.wallet.finalizeRecipe(recipe);
    },
    submitTx: (tx: any) => walletCtx.wallet.submitTransaction(tx) as any,
  };

  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  const accountId = walletCtx.unshieldedKeystore.getBech32Address().toString();

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'bridgeguard-state-v2',
      accountId,
      privateStoragePasswordProvider: () => privateStatePassword,
    }),
    publicDataProvider: indexerPublicDataProvider(networkConfig.indexer, networkConfig.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(networkConfig.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
}

// ─── Ledger serialization ──────────────────────────────────────────────────────

function serializeBridge(b: any) {
  return {
    id: b.id.toString(),
    name: b.name,
    srcChain: b.srcChain.toString(),
    dstChain: b.dstChain.toString(),
    tvl: b.tvl.toString(),
    audited: b.audited.toString(),
    incidents: b.incidents.toString(),
    riskScore: b.riskScore.toString(),
    status: Number(b.status),
    statusLabel: STATUS_LABELS[Number(b.status)] ?? String(b.status),
  };
}

function mapToArray(map: any): Array<{ key: string; value: string; label?: string }> {
  const out: Array<{ key: string; value: string; label?: string }> = [];
  for (const [k, v] of map) {
    out.push({ key: k.toString(), value: v.toString(), label: VERDICT_LABELS[Number(v)] ?? String(v) });
  }
  return out;
}

function serializeLedger(ledger: any) {
  try {
    const bridges: any[] = [];
    for (const [, b] of ledger.bridges) bridges.push(serializeBridge(b));
    const withinArray: Array<{ key: string; value: string; label?: string }> = [];
    for (const [k, v] of ledger.latestWithin) withinArray.push({ key: k.toString(), value: v.toString(), label: v ? 'WITHIN' : 'EXCEEDS' });
    return {
      bridges,
      registryCount: ledger.registryCount.toString(),
      assessmentCount: ledger.assessmentCount.toString(),
      lastVerdict: ledger.lastVerdict.toString(),
      lastVerdictLabel: VERDICT_LABELS[Number(ledger.lastVerdict)] ?? String(ledger.lastVerdict),
      lastWithinTolerance: ledger.lastWithinTolerance,
      lastBridgeId: ledger.lastBridgeId.toString(),
      latestVerdicts: mapToArray(ledger.latestVerdicts),
      latestWithin: withinArray,
      latestTxIds: [...lastTxByBridge.entries()].map(([key, value]) => ({ key, value })),
    };
  } catch (serErr: any) {
    console.error('[/api/state] serializeLedger CRASHED:', serErr?.message ?? serErr);
    console.dir(serErr, { depth: 3 });
    throw serErr; // re-throw so the route's catch block returns 500
  }
}

// ─── App state ─────────────────────────────────────────────────────────────────

let walletCtx: WalletContext | null = null;
let providers: Awaited<ReturnType<typeof createProviders>> | null = null;
let deployed: any = null;
let deploymentAddress = '';
let isInitializing = false;
let initError: any = null;
let lastSyncCheck = 'Not started';
// Real on-chain transaction ids for the last contract action per bridge, so the
// UI can show a genuine "last on-chain tx" reference instead of placeholder data.
const lastTxByBridge = new Map<string, string>();

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

const standalonePublicDataProvider = indexerPublicDataProvider(networkConfig.indexer, networkConfig.indexerWS);

// ─── Public ledger state (indexer-only, wallet-independent) ──────────────────
// /api/state serves public contract state straight from the Midnight indexer.
// It NEVER depends on the backend wallet, its credentials, or the proof server.
// The last successful snapshot is cached in memory: a transient indexer failure
// serves the cache (marked stale) instead of 503, and the server never crashes
// on indexer unavailability.

const INDEXER_TIMEOUT_MS = 8_000;
const INDEXER_MAX_ATTEMPTS = 2;
const INDEXER_RETRY_DELAYS_MS = [1_000];

let ledgerCache: { ledger: any; fetchedAt: string } | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Bounded retry with exponential backoff for transient indexer/network failures.
// Never retries forever and never blocks server startup (all callers are on the
// request path — the boot sequence never touches the indexer).
async function queryContractStateWithRetry(address: string) {
  const dataProvider = providers?.publicDataProvider ?? standalonePublicDataProvider;
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= INDEXER_MAX_ATTEMPTS; attempt += 1) {
    try {
      const contractState = await withTimeout(
        dataProvider.queryContractState(address),
        INDEXER_TIMEOUT_MS,
        null,
      );
      if (contractState) return contractState;
      lastErr = new Error('indexer returned no contract state for the configured address');
    } catch (err) {
      lastErr = err;
    }
    if (attempt < INDEXER_MAX_ATTEMPTS) {
      const delay = INDEXER_RETRY_DELAYS_MS[attempt - 1] ?? 800;
      console.warn(
        `  ⚠ [readLedger] indexer attempt ${attempt}/${INDEXER_MAX_ATTEMPTS} failed — retrying in ${delay}ms:`,
        (lastErr as Error)?.message ?? lastErr,
      );
      await sleep(delay);
    }
  }
  throw lastErr;
}

// Fresh ledger state from the indexer (caching the last successful snapshot),
// or null when the indexer is temporarily unavailable. Never throws.
async function readLedger(): Promise<{ ledger: any; fetchedAt: string } | null> {
  try {
    const contractState = await queryContractStateWithRetry(deploymentAddress);
    const ledger = BridgeGuardV2.ledger(contractState.data);
    ledgerCache = { ledger, fetchedAt: new Date().toISOString() };
    return { ledger, fetchedAt: ledgerCache.fetchedAt };
  } catch (err) {
    console.warn('  ⚠ [readLedger] Error querying contract state from indexer:', (err as Error)?.message ?? err);
    return null;
  }
}


async function currentBalance() {
  const s = await Rx.firstValueFrom(walletCtx!.wallet.state());
  const tn = s?.unshielded?.balances?.[unshieldedToken().raw] ?? 0n;
  const dust = s?.dust?.balance(new Date()) ?? 0n;
  return { tNight: tn.toString(), dust: dust.toString() };
}

// ─── Wallet-capability guard ───────────────────────────────────────────────────
// Endpoints that submit transactions through the backend wallet require the
// background wallet runtime (walletCtx + providers + deployed contract). When
// the runtime is unavailable (capability disabled, still initializing, or init
// failed), those endpoints answer 503 instead of crashing on null derefs.
// /api/state and the static frontend never go through this guard.

class WalletNotReadyError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super('Backend wallet not ready');
    this.name = 'WalletNotReadyError';
    this.detail = detail;
  }
}

function requireWalletRuntime() {
  if (walletDisabled) {
    throw new WalletNotReadyError(
      'Backend wallet capability is disabled: no MIDNIGHT_WALLET_MNEMONIC / MIDNIGHT_WALLET_SEED configured.',
    );
  }
  if (!walletCtx || !providers || !deployed || !deploymentAddress) {
    if (!isInitializing && !initError) {
      // Trigger lazy background wallet initialization on demand when required
      initializeBackground().catch((err) => {
        console.error('On-demand wallet initialization error:', err);
      });
    }
    const detail = initError
      ? `Backend wallet initialization failed: ${initError.message || String(initError)}`
      : isInitializing
        ? `Backend wallet is initializing. Status: ${lastSyncCheck}`
        : 'Backend wallet initialization started on demand.';
    throw new WalletNotReadyError(detail);
  }
  return { walletCtx, providers, deployed };
}

// ─── HTTP helpers ──────────────────────────────────────────────────────────────

function json(res: any, code: number, payload: unknown) {
  const body = JSON.stringify(payload, (_, v) => (typeof v === 'bigint' ? v.toString() : v));
  // Merge any headers already queued via res.setHeader() (e.g. CORS headers set at the
  // top of each request) into writeHead(). Node.js drops setHeader() calls when
  // writeHead() is invoked with an explicit headers object — merging prevents that.
  const existingHeaders: Record<string, string | string[]> = res.getHeaders ? res.getHeaders() : {};
  res.writeHead(code, { ...existingHeaders, 'Content-Type': 'application/json' });
  res.end(body);
}

// ─── CORS middleware (Node.js equivalent of Express app.use) ──────────────────
// Single canonical place for all CORS logic.
// Call applyCors(req, res) as the VERY FIRST line of every request handler so
// Access-Control-Allow-Origin is present on every response — including errors.

const ALLOWED_ORIGINS = new Set([
  'https://bridge-guard-umber.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
]);

function applyCors(req: any, res: any): void {
  const origin = req.headers.origin as string | undefined;
  // Reflect the exact origin back if whitelisted, otherwise use the primary prod origin.
  const allowedOrigin = origin && ALLOWED_ORIGINS.has(origin)
    ? origin
    : 'https://bridge-guard-umber.vercel.app';

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Vary', 'Origin'); // tells CDNs/proxies to cache per-origin
}

function readBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => (data += chunk.toString()));
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.png': 'image/png',
};

async function serveStatic(req: any, res: any, pathname: string) {
  let rel = decodeURIComponent(pathname === '/' ? 'index.html' : pathname.slice(1));
  const resolved = path.resolve(FRONTEND_DIR, rel);
  if (!resolved.startsWith(FRONTEND_DIR + path.sep) && resolved !== FRONTEND_DIR) {
    return json(res, 403, { error: 'Forbidden' });
  }
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    rel = path.join(rel, 'index.html');
  }
  const file = path.join(FRONTEND_DIR, rel);
  if (!fs.existsSync(file)) {
    // SPA history fallback: client-side routes (e.g. /app, /app/analyze) have no
    // matching file on disk, so hand them to the router via index.html. Only fall
    // back for extensionless paths — genuinely missing assets still 404.
    if (!path.extname(pathname)) {
      const indexFile = path.join(FRONTEND_DIR, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        return res.end(fs.readFileSync(indexFile));
      }
    }
    return json(res, 404, { error: 'Not found' });
  }
  const ext = path.extname(file);
  res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
  res.end(fs.readFileSync(file));
}

// ─── API handlers ──────────────────────────────────────────────────────────────

async function handlerRegister(body: any) {
  const { deployed } = requireWalletRuntime();
  const name = String(body.name ?? '').trim();
  const srcChain = BigInt(body.srcChain);
  const dstChain = BigInt(body.dstChain);
  const tvl = BigInt(body.tvl);
  const audited = BigInt(body.audited === '1' || body.audited === 1 || body.audited === true ? 1 : 0);
  const incidents = BigInt(body.incidents);
  if (!name) throw new Error('name is required');

  const tx = await deployed.callTx.registerBridge(name, srcChain, dstChain, tvl, audited, incidents);

  // Resolve the id the contract assigned to the new bridge (highest numeric id).
  let bridgeId: string | null = null;
  const ledgerState = await readLedger();
  if (ledgerState) {
    let maxId = -1;
    for (const [, b] of ledgerState.ledger.bridges) {
      const n = Number(b.id);
      if (n > maxId) maxId = n;
    }
    bridgeId = maxId >= 0 ? String(maxId) : null;
  }
  if (bridgeId) lastTxByBridge.set(bridgeId, tx.public.txId);
  return { txId: tx.public.txId, blockHeight: tx.public.blockHeight, bridgeId, walletAddress: attributionAddress(body.walletAddress) };
}

async function handlerEvaluate(body: any) {
  const { providers, deployed } = requireWalletRuntime();
  const bridgeId = BigInt(body.bridgeId);
  const amount = BigInt(body.amount);
  const maxRisk = BigInt(body.maxRisk);
  const intel = Math.max(0, Math.min(20, Math.floor(Number(body.intel ?? 0))));

  // Feed fresh confidential intel into the private state backing getRiskIntel.
  providers.privateStateProvider.setContractAddress(deploymentAddress);
  await providers.privateStateProvider.set(PRIVATE_STATE_ID, { intel });

  const tx = await deployed.callTx.evaluateBridge(bridgeId, amount, maxRisk);
  lastTxByBridge.set(bridgeId.toString(), tx.public.txId);

  // Read the (public) coarse verdict that the proof just disclosed.
  const ledgerState = await readLedger();
  let verdict = null;
  let within = null;
  if (ledgerState) {
    const id = bridgeId.toString();
    if (ledgerState.ledger.latestVerdicts.member(bridgeId)) {
      const v = ledgerState.ledger.latestVerdicts.lookup(bridgeId);
      const w = ledgerState.ledger.latestWithin.lookup(bridgeId);
      verdict = v.toString();
      within = Boolean(w);
    }
  }
  return { txId: tx.public.txId, blockHeight: tx.public.blockHeight, bridgeId: bridgeId.toString(), intel, verdict, within, verdictLabel: verdict ? (VERDICT_LABELS[Number(verdict)] ?? verdict) : null, walletAddress: attributionAddress(body.walletAddress) };
}

async function handlerFlag(body: any) {
  const { deployed } = requireWalletRuntime();
  const bridgeId = BigInt(body.bridgeId);
  const status = BigInt(body.status);
  const tx = await deployed.callTx.flagBridge(bridgeId, status);
  lastTxByBridge.set(bridgeId.toString(), tx.public.txId);
  return { txId: tx.public.txId, blockHeight: tx.public.blockHeight, bridgeId: bridgeId.toString(), status: status.toString(), walletAddress: attributionAddress(body.walletAddress) };
}

// ─── Phase 0 POC: Lace as signer/funder ─────────────────────────────────────
//
// Proves the split pipeline:
//   backend createUnprovenCallTx → backend proveTx → serialize(unbound, hex)
//   → Lace balanceUnsealedTransaction (user approval + DUST fee)
//   → Lace submitTransaction → Preview → indexer confirmation.
//
// These endpoints build + prove ONLY. Balancing, signing, fee payment and
// submission happen in the user's Lace wallet. The private bridge-analysis
// inputs (amount, maxRisk, intel) never leave this process and are never
// logged; only the serialized PUBLIC transaction transcript is returned.

// Diagnostic logging for steps 1-3 (create → prove → serialize). No private
// inputs are ever written to the log or the HTTP response.
async function handlerPocPrepareEvaluate(body: any) {
  const { providers } = requireWalletRuntime();
  const bridgeId = BigInt(body.bridgeId);
  const amount = BigInt(body.amount);
  const maxRisk = BigInt(body.maxRisk);
  const intel = Math.max(0, Math.min(20, Math.floor(Number(body.intel ?? 0))));

  console.log('[POC] ── prepare evaluateBridge ──');
  console.log('[POC] 1) creating unproven call tx (circuit: evaluateBridge)');
  providers.privateStateProvider.setContractAddress(deploymentAddress);
  await providers.privateStateProvider.set(PRIVATE_STATE_ID, { intel });

  const callTxData = await createUnprovenCallTx(providers, {
    compiledContract: compiledContract as never,
    contractAddress: deploymentAddress,
    circuitId: 'evaluateBridge',
    privateStateId: PRIVATE_STATE_ID,
    args: [bridgeId, amount, maxRisk],
  });

  console.log('[POC] 2) generating proof (proof server)');
  const provenTx = await providers.proofProvider.proveTx(callTxData.private.unprovenTx);

  const serializedTxHex = toHex(provenTx.serialize());
  console.log(
    `[POC] 3) serialized proven unbound tx: encoding=hex bytes=${serializedTxHex.length / 2} hexChars=${serializedTxHex.length} ` +
    `(Transaction<SignatureEnabled, Proof, PreBinding>)`,
  );
  console.log('[POC] 4) handing serialized tx to Lace balanceUnsealedTransaction...');

  return {
    circuit: 'evaluateBridge',
    bridgeId: bridgeId.toString(),
    serializedTxHex,
    serializedTxBytes: serializedTxHex.length / 2,
    encoding: 'hex',
    note: 'amount/maxRisk/intel remain private inside the ZK proof and are not returned.',
  };
}

// Receives the Lace-balanced sealed tx, derives its identifier locally, and
// watches the indexer for on-chain confirmation (steps 7-8). Once confirmed,
// the disclosed coarse verdict is read back from the ledger (same pattern as
// handlerEvaluate) so the wallet-signed UI can show the real on-chain verdict
// without the private amount/tolerance/intel ever leaving this process.
async function handlerPocFinalize(body: any) {
  const { providers } = requireWalletRuntime();
  const balancedTxHex = String(body.balancedTxHex ?? '').trim();
  if (!/^(?:[0-9a-f]{2})+$/i.test(balancedTxHex)) {
    throw new Error('balancedTxHex must be a hex-encoded transaction');
  }

  console.log('[POC] 7) deriving transaction identifier from balanced sealed tx');
  const finalizedTx = Transaction.deserialize('signature', 'proof', 'binding', fromHex(balancedTxHex));
  const txId = finalizedTx.identifiers()[0];
  const txHash = finalizedTx.transactionHash();
  console.log(`[POC] 7) txId=${txId} txHash=${txHash}`);

  console.log('[POC] 8) watching indexer for confirmation');
  const data = await withTimeout(
    providers.publicDataProvider.watchForTxData(txId),
    120_000,
    null as never,
  );

  const bridgeIdRaw = typeof body.bridgeId === 'string' || typeof body.bridgeId === 'number' ? body.bridgeId : null;
  const bridgeId = bridgeIdRaw !== null && String(bridgeIdRaw).trim() !== '' ? BigInt(bridgeIdRaw) : null;

  // Read the (public) coarse verdict the proof disclosed, when the tx confirmed
  // and a bridge was identified.
  let verdict: string | null = null;
  let within: boolean | null = null;
  if (data && bridgeId !== null) {
    const ledgerState = await readLedger();
    if (ledgerState && ledgerState.ledger.latestVerdicts.member(bridgeId)) {
      const v = ledgerState.ledger.latestVerdicts.lookup(bridgeId);
      const w = ledgerState.ledger.latestWithin.lookup(bridgeId);
      verdict = v.toString();
      within = w === true || w === 1n;
      console.log(`[POC] 8) disclosed verdict read from ledger: verdict=${verdict} within=${within}`);
    }
  }

  if (!data) {
    console.log('[POC] 8) not confirmed on the indexer within 120s');
    return {
      txId,
      txHash,
      status: 'pending',
      bridgeId: bridgeId !== null ? bridgeId.toString() : null,
      verdict,
      within,
      verdictLabel: verdict !== null ? VERDICT_LABELS[Number(verdict)] ?? verdict : null,
      note: 'not yet confirmed on the indexer within 120s',
    };
  }
  console.log(
    `[POC] 8) confirmed: blockHeight=${data.blockHeight} blockHash=${data.blockHash} txStatus=${String(data.status)}`,
  );
  return {
    txId,
    txHash,
    status: 'confirmed',
    bridgeId: bridgeId !== null ? bridgeId.toString() : null,
    blockHeight: data.blockHeight,
    blockHash: data.blockHash,
    txStatus: String(data.status),
    blockTimestamp: data.blockTimestamp,
    verdict,
    within,
    verdictLabel: verdict !== null ? VERDICT_LABELS[Number(verdict)] ?? verdict : null,
  };
}

// ─── Health probe (real connectivity, no placeholders) ───────────────────────

async function handlerHealth() {
  const services: Array<{ name: string; url: string; healthy: boolean; detail: string }> = [
    { name: 'BridgeGuard API', url: `http://localhost:${PORT}`, healthy: true, detail: 'responding' },
  ];

  // Contract + indexer share one real query path: reading live ledger state.
  // This uses the standalone indexer provider (wallet-independent), so the
  // health rows stay truthful even while the backend wallet is initializing.
  let ledgerOk = false;
  let ledgerDetail = 'no response';
  try {
    const fresh = await withTimeout(readLedger(), 60_000, null);
    if (fresh) {
      ledgerOk = true;
      ledgerDetail = fresh.fetchedAt;
    } else if (ledgerCache) {
      ledgerDetail = `indexer down — serving cached state from ${ledgerCache.fetchedAt}`;
    }
  } catch {
    ledgerOk = false;
  }
  services.push({
    name: 'Midnight contract',
    url: deploymentAddress || 'unknown',
    healthy: ledgerOk,
    detail: ledgerOk ? 'deployed & serving state' : 'no contract state available',
  });
  services.push({
    name: 'Indexer',
    url: networkConfig.indexer,
    healthy: ledgerOk,
    detail: ledgerOk ? 'serving ledger state' : 'no response',
  });

  // Midnight node — the wallet must be able to reach synced state.
  const nodeOk = walletCtx
    ? await withTimeout(
      walletCtx.wallet.waitForSyncedState().then(
        () => true,
        () => false,
      ),
      4000,
      false,
    )
    : false;
  services.push({
    name: 'Midnight node',
    url: networkConfig.node,
    healthy: nodeOk,
    detail: nodeOk ? 'wallet synced' : 'unreachable or unsynced',
  });

  // Proof server — direct HTTP health probe.
  const proofOk = await withTimeout(
    fetch(`${networkConfig.proofServer}/health`, { signal: AbortSignal.timeout(4000) }).then(
      (r) => (r.ok ? { ok: true, status: r.status } : { ok: false, status: r.status }),
      () => ({ ok: false, status: 0 }),
    ),
    4000,
    { ok: false, status: 0 },
  );
  services.push({
    name: 'Proof server',
    url: networkConfig.proofServer,
    healthy: proofOk.ok,
    detail: proofOk.ok ? `online (HTTP ${proofOk.status})` : 'unreachable',
  });

  return { services, checkedAt: new Date().toISOString() };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

let retryCount = 0;
const MAX_INIT_RETRIES = 15;
const RETRY_DELAY_MS = 15000;

async function initializeBackground() {
  if (!SEED) {
    // Wallet capability disabled (production without credentials). The server
    // keeps serving /api/state and the frontend; wallet-dependent endpoints
    // answer 503 via requireWalletRuntime().
    console.warn('  [Background Wallet] Disabled — no wallet credentials configured. Serving /api/state + frontend without the backend wallet.');
    lastSyncCheck = 'Disabled (no wallet credentials)';
    isInitializing = false;
    return;
  }
  if (isInitializing === false && walletCtx !== null) return; // already successfully initialized
  isInitializing = true;

  try {
    if (walletCtx) {
      console.log('  [Async Init] Stopping previous wallet instance to release connections...');
      // Checkpoint partial progress before stopping, so the next attempt
      // resumes from the last applied index instead of replaying genesis.
      try {
        await persistWalletState(network, walletCtx);
      } catch (cpErr) {
        console.warn('  [Async Init] Error checkpointing wallet state before stop:', cpErr);
      }
      try {
        await walletCtx.wallet.stop();
      } catch (stopErr) {
        console.warn('  [Async Init] Error stopping old wallet:', stopErr);
      }
      walletCtx = null;
    }

    console.log(`  [Async Init] Connecting to wallet (Attempt ${retryCount + 1}/${MAX_INIT_RETRIES})...`);
    lastSyncCheck = `Connecting (Attempt ${retryCount + 1})...`;
    walletCtx = await createWallet({ network, networkConfig, seed: SEED });

    console.log('  [Async Init] Syncing with network (this can take several minutes)...');
    lastSyncCheck = 'Syncing...';

    // A fresh wallet on a public network replays the full ledger from genesis,
    // which takes minutes and would be lost on failure/restart. Checkpoint the
    // wallet's sync progress every 60s (same pattern as deploy-v2.ts) so a
    // retry or instance restart resumes from the saved point. RPC
    // disconnection messages during sync are normal on public networks and can
    // be safely ignored — sync data comes from the indexer, not the node.
    const syncStart = Date.now();
    const checkpointIntervalMs = 60_000;
    let lastCheckpointAt = Date.now();
    let checkpointInFlight: Promise<void> | null = null;
    const checkpointWalletState = (reason: string): void => {
      if (!walletCtx || checkpointInFlight) return;
      checkpointInFlight = persistWalletState(network, walletCtx)
        .then(() => {
          const elapsed = Math.round((Date.now() - syncStart) / 1000);
          console.log(`  💾 Sync checkpoint saved (${reason}) at ${elapsed}s — a retry/restart resumes from here.`);
        })
        .catch((err: unknown) => {
          console.warn('  ⚠ [Async Init] Sync checkpoint failed:', err);
        })
        .finally(() => {
          checkpointInFlight = null;
        });
    };
    const checkpointTimer = setInterval(() => {
      if (Date.now() - lastCheckpointAt >= checkpointIntervalMs) {
        lastCheckpointAt = Date.now();
        checkpointWalletState('periodic');
      }
    }, 15_000);

    try {
      await walletCtx.wallet.waitForSyncedState();
    } finally {
      clearInterval(checkpointTimer);
      const inFlight = checkpointInFlight as Promise<void> | null;
      if (inFlight) await inFlight.catch(() => { });
      await persistWalletState(network, walletCtx);
    }
    lastSyncCheck = 'Synced.';
    console.log('  ✓ [Async Init] Synced.\n');

    if (network !== 'undeployed') {
      console.log('  [Async Init] Checking DUST...');
      const dustState = await Rx.firstValueFrom(walletCtx!.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
      const unregistered = dustState.unshielded.availableCoins.filter((c: any) => !c.meta?.registeredForDustGeneration);
      if (unregistered.length > 0) {
        console.log(`  [Async Init] Registering ${unregistered.length} NIGHT UTXO(s) for DUST generation...`);
        const recipe = await walletCtx!.wallet.registerNightUtxosForDustGeneration(
          unregistered,
          walletCtx!.unshieldedKeystore.getPublicKey(),
          (payload: Uint8Array) => walletCtx!.unshieldedKeystore.signData(payload),
        );
        const finalized = await walletCtx!.wallet.finalizeRecipe(recipe);
        await walletCtx!.wallet.submitTransaction(finalized);
      }
      if (dustState.dust.balance(new Date()) === 0n) {
        console.log('  [Async Init] Waiting for DUST to be minted...');
        const dustDeadline = Date.now() + 10 * 60 * 1000;
        await Rx.firstValueFrom(
          walletCtx!.wallet.state().pipe(
            Rx.throttleTime(5000),
            Rx.filter((s) => s.isSynced),
            Rx.filter((s) => s.dust.balance(new Date()) > 0n),
            Rx.takeUntil(Rx.timer(dustDeadline - Date.now())),
          ),
        ).catch(() => {
          console.warn('  ⚠ [Async Init] DUST not yet available — transactions will fail until it is minted.');
        });
      }
      const postDust = await Rx.firstValueFrom(walletCtx!.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
      console.log(`  ✓ [Async Init] DUST balance: ${postDust.dust.balance(new Date()).toLocaleString()}\n`);
    }

    console.log('  [Async Init] Setting up providers...');
    providers = await createProviders(walletCtx!);

    console.log('  [Async Init] Connecting to contract...');
    deployed = await findDeployedContract(providers, {
      compiledContract: compiledContract as any,
      contractAddress: deploymentAddress,
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState: { intel: 0 },
    });
    console.log('  ✅ [Async Init] Connected!\n');
    isInitializing = false;
    retryCount = 0; // reset on success
  } catch (err: any) {
    console.error(`❌ Background Initialization Attempt ${retryCount + 1} Failed:`, err);
    if (err && typeof err === 'object') {
      console.dir(err, { depth: null });
      if (err.cause) {
        console.error('Underlying cause details:', err.cause);
        if (typeof err.cause === 'object' && err.cause.cause) {
          console.error('Core error detail:', err.cause.cause);
        }
      }
    }

    initError = err;
    lastSyncCheck = `Failed: ${err.message || String(err)}`;

    // Stop current wallet instance on failure to ensure we release active ports/WS connections
    if (walletCtx) {
      // Persist partial sync progress first so the next attempt resumes from
      // the saved point instead of replaying the ledger from genesis.
      try {
        await persistWalletState(network, walletCtx);
      } catch (cpErr) {
        console.warn('  [Async Init] Error checkpointing wallet state on failure:', cpErr);
      }
      try {
        await walletCtx.wallet.stop();
      } catch (stopErr) {
        console.warn('  [Async Init] Error stopping wallet on failure:', stopErr);
      }
      walletCtx = null;
    }

    isInitializing = false;

    if (retryCount < MAX_INIT_RETRIES - 1) {
      retryCount++;
      const nextDelay = RETRY_DELAY_MS + (retryCount * 5000); // progressive delay to bypass quota rate limits
      console.log(`  [Async Init] Retrying in ${nextDelay / 1000}s...`);
      setTimeout(() => {
        initializeBackground().catch((retryErr) => {
          console.error('Error starting initialization retry:', retryErr);
        });
      }, nextDelay);
    } else {
      console.error('  [Async Init] Max validation/sync retry count limit reached. Stopping.');
    }
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  BridgeGuard AI v2 server — network: ${network}`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  if (process.env.NODE_ENV === 'production') {
    // Backend wallet credentials are OPTIONAL. /api/state and the frontend are
    // served without them; only wallet-dependent endpoints are affected. These
    // used to hard-fail production startup — they no longer do.
    if (!walletCredentialsAvailable) {
      console.warn('\n⚠ Production: no MIDNIGHT_WALLET_MNEMONIC / MIDNIGHT_WALLET_SEED and no persisted wallet on file.');
      console.warn('  Backend wallet capability is disabled. /api/state and the frontend remain available;');
      console.warn('  wallet-dependent endpoints (/api/balance, /api/register, /api/evaluate, /api/flag, /api/poc/*) return 503.');
    }
    const pwd = (process.env.PRIVATE_STATE_PASSWORD || '').trim();
    if (!pwd || pwd === 'Local-Devnet-Development-Placeholder-1' || pwd.length < 16) {
      console.warn('\n⚠ Production: PRIVATE_STATE_PASSWORD is missing or shorter than 16 characters.');
      console.warn('  The backend wallet private-state store (when enabled) will use the default devnet placeholder password.');
    }
    if (network === 'undeployed') {
      console.warn('\n⚠ Production: MIDNIGHT_NETWORK is not set to "preview" or "preprod" — running on "undeployed" (local devnet) defaults.');
      console.warn('  /api/state will query the local devnet indexer and likely fail. Set MIDNIGHT_NETWORK=preview|preprod for production.');
    }
  }

  let deploymentAddressResolved = process.env.MIDNIGHT_CONTRACT_ADDRESS;
  if (!deploymentAddressResolved) {
    const deployment = getDeployment(network);
    if (deployment) {
      deploymentAddressResolved = deployment.address;
    } else {
      // Non-fatal: the server still serves /api/state (503 with a clear
      // detail) and the frontend until a deployment is recorded.
      console.warn(`\n⚠ No deploy on file for network ${network} and MIDNIGHT_CONTRACT_ADDRESS is not set.`);
      console.warn(`  /api/state will report "contract state not available" (503). Run \`npx tsx src/deploy-v2.ts --network ${network}\` or set MIDNIGHT_CONTRACT_ADDRESS.`);
      deploymentAddressResolved = '';
    }
  }
  deploymentAddress = deploymentAddressResolved;
  console.log(`  Contract: ${deploymentAddress}`);
  console.log(`  Network ID: ${network}`);
  console.log(`  Indexer URL: ${networkConfig.indexer}`);
  console.log(`  Indexer WS URL: ${networkConfig.indexerWS}`);
  console.log(`  Node URL: ${networkConfig.node}`);
  console.log(`  Proof Server: ${networkConfig.proofServer}\n`);

  const server = http.createServer(async (req: any, res: any) => {
    // ── CORS ── single call sets headers on EVERY response (incl. errors & preflights)
    applyCors(req, res);

    if (req.method === 'OPTIONS') {
      // Preflight: read back the headers applyCors() just set so writeHead() includes them.
      res.writeHead(204, res.getHeaders());
      res.end();
      return;
    }

    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const pathname = url.pathname;
    try {
      if (req.method === 'GET' && pathname === '/api/health') {
        // Always 200 (process-up semantics): Render must not restart the
        // instance just because the indexer is down — availability of the
        // public state service is carried in the body, not the status code.
        const health = await handlerHealth();
        return json(res, 200, health);
      }

      if (req.method === 'GET' && pathname === '/api/state') {
        // /api/state is served independently of the backend wallet: it reads
        // public contract state from the indexer only. A bounded retry +
        // backoff covers transient indexer failures, and the last successful
        // snapshot is served (marked stale) when the indexer is unavailable.
        const fresh = await withTimeout(readLedger(), 18_000, null);
        if (fresh) {
          let serialized: any;
          try {
            serialized = serializeLedger(fresh.ledger);
          } catch (slErr: any) {
            console.error('[/api/state] serializeLedger() threw:', slErr?.message ?? slErr);
            return json(res, 500, { error: 'serializeLedger failed', detail: String(slErr?.message ?? slErr) });
          }
          return json(res, 200, {
            contractAddress: deploymentAddress,
            network,
            walletAddress: walletCtx ? walletCtx.unshieldedKeystore.getBech32Address().toString() : null,
            balance: walletCtx ? await withTimeout(currentBalance(), 500, { tNight: '0', dust: '0' }) : { tNight: '0', dust: '0' },
            ledger: serialized,
            initializing: isInitializing,
            stale: false,
            cachedAt: null,
          });
        }
        // Indexer unavailable after bounded retries → serve the cache if we
        // have one, otherwise a structured 503. Never a 503 because of wallet
        // state: /api/state is wallet-independent by design.
        if (ledgerCache) {
          let serialized: any;
          try {
            serialized = serializeLedger(ledgerCache.ledger);
          } catch (slErr: any) {
            serialized = null;
          }
          if (serialized) {
            console.warn('[/api/state] Indexer unavailable — serving cached ledger state from', ledgerCache.fetchedAt);
            return json(res, 200, {
              contractAddress: deploymentAddress,
              network,
              walletAddress: walletCtx ? walletCtx.unshieldedKeystore.getBech32Address().toString() : null,
              balance: { tNight: '0', dust: '0' },
              ledger: serialized,
              initializing: isInitializing,
              stale: true,
              cachedAt: ledgerCache.fetchedAt,
            });
          }
        }
        return json(res, 503, {
          error: 'Indexer temporarily unavailable',
          detail: `The Midnight indexer (${networkConfig.indexer}) did not respond and no cached ledger state is available yet. /api/state is wallet-independent: backend wallet state is not a factor.`,
          initializing: isInitializing,
          walletDisabled,
          stale: false,
          cachedAt: null,
        });
      }

      if (isInitializing) {
        if (pathname.startsWith('/api/')) {
          // Wallet-dependent endpoints report the actual wallet status with a
          // structured "Backend wallet is not ready" 503. /api/state and
          // /api/health short-circuit above and are never affected.
          const walletEndpoints = [
            '/api/balance',
            '/api/register',
            '/api/evaluate',
            '/api/flag',
            '/api/poc/prepare-evaluate',
            '/api/poc/finalize',
          ];
          if (walletEndpoints.includes(pathname)) {
            const detail = walletDisabled
              ? 'Backend wallet capability is disabled (no MIDNIGHT_WALLET_MNEMONIC / MIDNIGHT_WALLET_SEED configured). /api/state and the frontend remain available; only wallet-dependent endpoints are affected.'
              : initError
                ? `Backend wallet initialization failed: ${initError.message || String(initError)}`
                : `Backend wallet is still initializing. Status: ${lastSyncCheck}`;
            return json(res, 503, {
              error: 'Backend wallet not ready',
              detail,
              initializing: true,
              walletDisabled,
            });
          }
          return json(res, 503, {
            error: 'Service unavailable',
            detail: `Service is currently syncing/initializing. Status: ${lastSyncCheck}`,
            initializing: true,
            walletDisabled,
          });
        }
        return serveStatic(req, res, pathname);
      }
      if (req.method === 'GET' && pathname === '/api/balance') {
        const runtime = requireWalletRuntime();
        await runtime.walletCtx.wallet.waitForSyncedState();
        return json(res, 200, await currentBalance());
      }
      if (req.method === 'POST' && pathname === '/api/register') {
        const body = await readBody(req);
        const result = await handlerRegister(body);
        return json(res, 200, result);
      }
      if (req.method === 'POST' && pathname === '/api/evaluate') {
        const body = await readBody(req);
        const result = await handlerEvaluate(body);
        return json(res, 200, result);
      }
      if (req.method === 'POST' && pathname === '/api/flag') {
        const body = await readBody(req);
        const result = await handlerFlag(body);
        return json(res, 200, result);
      }
      if (req.method === 'POST' && pathname === '/api/poc/prepare-evaluate') {
        const body = await readBody(req);
        const result = await handlerPocPrepareEvaluate(body);
        return json(res, 200, result);
      }
      if (req.method === 'POST' && pathname === '/api/poc/finalize') {
        const body = await readBody(req);
        const result = await handlerPocFinalize(body);
        return json(res, 200, result);
      }
      if (req.method === 'GET' && pathname === '/poc.html') {
        const pocFile = path.resolve(__dirname, '..', 'poc', 'poc.html');
        if (!fs.existsSync(pocFile)) return json(res, 404, { error: 'poc.html not built' });
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        return res.end(fs.readFileSync(pocFile));
      }
      if (req.method === 'GET' && pathname.startsWith('/api/')) {
        return json(res, 404, { error: 'Unknown endpoint' });
      }
      return serveStatic(req, res, pathname);
    } catch (err: any) {
      if (err instanceof WalletNotReadyError) {
        console.warn('[server] Wallet-dependent endpoint requested while backend wallet unavailable:', err.detail);
        return json(res, 503, {
          error: err.message,
          detail: err.detail,
          initializing: isInitializing,
          walletDisabled,
        });
      }
      console.error('API Error in server.ts:', err);
      const msg = err?.message || String(err);
      return json(res, 500, { error: msg });
    }
  });

  await new Promise<void>((resolve) => server.listen(PORT, '0.0.0.0', resolve));
  console.log(`  🚀 Server listening on http://0.0.0.0:${PORT}\n`);
  console.log(`  Frontend:  http://0.0.0.0:${PORT}/`);
  console.log(`  API:       http://0.0.0.0:${PORT}/api/state`);

  // Background wallet initialization is disabled on server startup to keep boot non-blocking.
  // Wallet initialization runs lazily on demand when transaction endpoints are requested.
  // initializeBackground().catch((err) => {
  //   console.error('Fatal initialization error in background task:', err);
  // });

  const shutdown = async () => {
    console.log('\n  Shutting down...');
    try {
      if (walletCtx) await persistWalletState(network, walletCtx);
      await walletCtx?.wallet.stop();
    } catch (e) {
      console.error('  Shutdown error:', e);
    }
    _realExit(0); // use _realExit so the intercepted process.exit doesn't block graceful shutdown
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Fatal error in main():', err);
  _realExit(1); // genuine startup failure — do exit
});
