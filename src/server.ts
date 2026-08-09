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
 *   GET  /api/state            -> full ledger snapshot + wallet meta
 *   GET  /api/balance          -> tNight + DUST balances
 *   POST /api/register         -> registerBridge
 *   POST /api/evaluate         -> feed intel, then evaluateBridge (private)
 *   POST /api/flag             -> flagBridge
 *   *                          -> static assets from frontend/
 */
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

import { resolveNetwork, getOrCreateWallet, formatWalletBackupNotice, getDeployment } from './network';
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
const WALLET = getOrCreateWallet(network);
const SEED = WALLET.seed;
{
  const notice = formatWalletBackupNotice(WALLET, network);
  if (notice) console.log(notice);
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
}

// ─── App state ─────────────────────────────────────────────────────────────────

let walletCtx: WalletContext | null = null;
let providers: Awaited<ReturnType<typeof createProviders>> | null = null;
let deployed: any = null;
let deploymentAddress = '';
let isInitializing = true;
let initError: any = null;
let lastSyncCheck = 'Not started';
// Real on-chain transaction ids for the last contract action per bridge, so the
// UI can show a genuine "last on-chain tx" reference instead of placeholder data.
const lastTxByBridge = new Map<string, string>();

async function readLedger() {
  const contractState = await providers!.publicDataProvider.queryContractState(deploymentAddress);
  if (!contractState) return null;
  return BridgeGuardV2.ledger(contractState.data);
}

async function currentBalance() {
  const s = await Rx.firstValueFrom(walletCtx!.wallet.state());
  const tn = s?.unshielded?.balances?.[unshieldedToken().raw] ?? 0n;
  const dust = s?.dust?.balance(new Date()) ?? 0n;
  return { tNight: tn.toString(), dust: dust.toString() };
}

// ─── HTTP helpers ──────────────────────────────────────────────────────────────

function json(res: any, code: number, payload: unknown) {
  const body = JSON.stringify(payload, (_, v) => (typeof v === 'bigint' ? v.toString() : v));
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(body);
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
    for (const [, b] of ledgerState.bridges) {
      const n = Number(b.id);
      if (n > maxId) maxId = n;
    }
    bridgeId = maxId >= 0 ? String(maxId) : null;
  }
  if (bridgeId) lastTxByBridge.set(bridgeId, tx.public.txId);
  return { txId: tx.public.txId, blockHeight: tx.public.blockHeight, bridgeId, walletAddress: attributionAddress(body.walletAddress) };
}

async function handlerEvaluate(body: any) {
  const bridgeId = BigInt(body.bridgeId);
  const amount = BigInt(body.amount);
  const maxRisk = BigInt(body.maxRisk);
  const intel = Math.max(0, Math.min(20, Math.floor(Number(body.intel ?? 0))));

  // Feed fresh confidential intel into the private state backing getRiskIntel.
  providers!.privateStateProvider.setContractAddress(deploymentAddress);
  await providers!.privateStateProvider.set(PRIVATE_STATE_ID, { intel });

  const tx = await deployed.callTx.evaluateBridge(bridgeId, amount, maxRisk);
  lastTxByBridge.set(bridgeId.toString(), tx.public.txId);

  // Read the (public) coarse verdict that the proof just disclosed.
  const ledgerState = await readLedger();
  let verdict = null;
  let within = null;
  if (ledgerState) {
    const id = bridgeId.toString();
    if (ledgerState.latestVerdicts.member(bridgeId)) {
      const v = ledgerState.latestVerdicts.lookup(bridgeId);
      const w = ledgerState.latestWithin.lookup(bridgeId);
      verdict = v.toString();
      within = Boolean(w);
    }
  }
  return { txId: tx.public.txId, blockHeight: tx.public.blockHeight, bridgeId: bridgeId.toString(), intel, verdict, within, verdictLabel: verdict ? (VERDICT_LABELS[Number(verdict)] ?? verdict) : null, walletAddress: attributionAddress(body.walletAddress) };
}

async function handlerFlag(body: any) {
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
  const bridgeId = BigInt(body.bridgeId);
  const amount = BigInt(body.amount);
  const maxRisk = BigInt(body.maxRisk);
  const intel = Math.max(0, Math.min(20, Math.floor(Number(body.intel ?? 0))));

  console.log('[POC] ── prepare evaluateBridge ──');
  console.log('[POC] 1) creating unproven call tx (circuit: evaluateBridge)');
  providers!.privateStateProvider.setContractAddress(deploymentAddress);
  await providers!.privateStateProvider.set(PRIVATE_STATE_ID, { intel });

  const callTxData = await createUnprovenCallTx(providers!, {
    compiledContract: compiledContract as never,
    contractAddress: deploymentAddress,
    circuitId: 'evaluateBridge',
    privateStateId: PRIVATE_STATE_ID,
    args: [bridgeId, amount, maxRisk],
  });

  console.log('[POC] 2) generating proof (proof server)');
  const provenTx = await providers!.proofProvider.proveTx(callTxData.private.unprovenTx);

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
// watches the indexer for on-chain confirmation (steps 7-8).
async function handlerPocFinalize(body: any) {
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
    providers!.publicDataProvider.watchForTxData(txId),
    120_000,
    null as never,
  );
  if (!data) {
    console.log('[POC] 8) not confirmed on the indexer within 120s');
    return { txId, txHash, status: 'pending', note: 'not yet confirmed on the indexer within 120s' };
  }
  console.log(
    `[POC] 8) confirmed: blockHeight=${data.blockHeight} blockHash=${data.blockHash} txStatus=${String(data.status)}`,
  );
  return {
    txId,
    txHash,
    blockHeight: data.blockHeight,
    blockHash: data.blockHash,
    txStatus: String(data.status),
    blockTimestamp: data.blockTimestamp,
  };
}

// ─── Health probe (real connectivity, no placeholders) ───────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function handlerHealth() {
  const services: Array<{ name: string; url: string; healthy: boolean; detail: string }> = [
    { name: 'BridgeGuard API', url: `http://localhost:${PORT}`, healthy: true, detail: 'responding' },
  ];

  // Contract + indexer share one real query path: reading live ledger state.
  let ledgerOk = false;
  try {
    ledgerOk = providers ? ((await withTimeout(readLedger(), 4000, null)) !== null) : false;
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

async function initializeBackground() {
  try {
    console.log('  [Async Init] Connecting to wallet...');
    lastSyncCheck = 'Connecting...';
    walletCtx = await createWallet({ network, networkConfig, seed: SEED });

    console.log('  [Async Init] Syncing with network (this can take several minutes)...');
    lastSyncCheck = 'Syncing...';
    await walletCtx.wallet.waitForSyncedState();
    await persistWalletState(network, walletCtx);
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
  } catch (err: any) {
    console.error('❌ Background Initialization Failed:', err);
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
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  BridgeGuard AI v2 server — network: ${network}`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  if (process.env.NODE_ENV === 'production') {
    const hasEnvWallet = !!(process.env.MIDNIGHT_WALLET_MNEMONIC || process.env.MIDNIGHT_WALLET_SEED);
    if (!hasEnvWallet) {
      console.error('\n❌ Production Startup Error: MIDNIGHT_WALLET_MNEMONIC or MIDNIGHT_WALLET_SEED must be configured in environment variables for production deployments to ensure persistent wallet state.');
      process.exit(1);
    }
    const pwd = (process.env.PRIVATE_STATE_PASSWORD || '').trim();
    if (!pwd || pwd === 'Local-Devnet-Development-Placeholder-1' || pwd.length < 16) {
      console.error('\n❌ Production Startup Error: PRIVATE_STATE_PASSWORD must be configured and be at least 16 characters long in production environments.');
      process.exit(1);
    }
  }

  let deploymentAddressResolved = process.env.MIDNIGHT_CONTRACT_ADDRESS;
  if (!deploymentAddressResolved) {
    const deployment = getDeployment(network);
    if (!deployment) {
      console.error(`❌ No deploy on file for network ${network}. Run \`npx tsx src/deploy-v2.ts --network ${network}\` first, or set MIDNIGHT_CONTRACT_ADDRESS.`);
      process.exit(1);
    }
    deploymentAddressResolved = deployment.address;
  }
  deploymentAddress = deploymentAddressResolved;
  console.log(`  Contract: ${deploymentAddress}`);
  console.log(`  Network ID: ${network}`);
  console.log(`  Indexer URL: ${networkConfig.indexer}`);
  console.log(`  Indexer WS URL: ${networkConfig.indexerWS}`);
  console.log(`  Node URL: ${networkConfig.node}`);
  console.log(`  Proof Server: ${networkConfig.proofServer}\n`);

  const server = http.createServer(async (req: any, res: any) => {
      // Enable CORS for frontend API clients
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
        });
        res.end();
        return;
      }

      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      const pathname = url.pathname;
      try {
        if (req.method === 'GET' && pathname === '/api/health') {
          const health = await handlerHealth();
          const allHealthy = health.services.every((s) => s.healthy);
          return json(res, allHealthy ? 200 : 503, health);
        }

        if (isInitializing) {
          if (pathname.startsWith('/api/')) {
            const statusDetail = initError 
              ? `Initialization failed: ${initError.message || String(initError)}`
              : `Service is currently syncing/initializing. Status: ${lastSyncCheck}`;
            return json(res, 503, { 
              error: 'Service unavailable', 
              detail: statusDetail,
              initializing: true
            });
          }
          return serveStatic(req, res, pathname);
        }

        if (req.method === 'GET' && pathname === '/api/state') {
          const ledger = await readLedger();
          if (!ledger) return json(res, 503, { error: 'Contract state not available yet' });
          return json(res, 200, {
            contractAddress: deploymentAddress,
            network,
            walletAddress: walletCtx!.unshieldedKeystore.getBech32Address().toString(),
            balance: await currentBalance(),
            ledger: serializeLedger(ledger),
          });
        }
        if (req.method === 'GET' && pathname === '/api/balance') {
          await walletCtx!.wallet.waitForSyncedState();
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
        console.error('API Error in server.ts:', err);
        const msg = err?.message || String(err);
        return json(res, 500, { error: msg });
      }
  });

  await new Promise<void>((resolve) => server.listen(PORT, '0.0.0.0', resolve));
  console.log(`  🚀 Server listening on http://0.0.0.0:${PORT}\n`);
  console.log(`  Frontend:  http://0.0.0.0:${PORT}/`);
  console.log(`  API:       http://0.0.0.0:${PORT}/api/state`);

  // Start background sync/initialization
  initializeBackground().catch((err) => {
    console.error('Fatal initialization error in background task:', err);
  });

  const shutdown = async () => {
    console.log('\n  Shutting down...');
    try {
      if (walletCtx) await persistWalletState(network, walletCtx);
      await walletCtx?.wallet.stop();
    } catch (e) {
      console.error('  Shutdown error:', e);
    }
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
