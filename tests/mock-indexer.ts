import http from 'node:http';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FIXTURE_ADDRESS, FIXTURE_STATE_HEX } from './fixtures/preprod-contract-state';

export type MockMode = 'ok' | 'fail';

/**
 * Local mock Midnight indexer. Serves the exact GraphQL response shape the
 * midnight-js indexer public data provider parses:
 *   { data: { contractAction: { state: "<hex>" } } }
 * `setMode('fail')` makes every request fail (HTTP 500) to simulate an
 * indexer outage deterministically.
 */
export function createMockIndexer(port: number) {
  const state = { mode: 'ok' as MockMode };
  const hits: Array<{ url: string; when: string }> = [];
  const server = http.createServer((req, res) => {
    hits.push({ url: req.url ?? '', when: new Date().toISOString() });
    if (state.mode === 'fail') {
      // HTTP 200 + GraphQL errors: the SDK's Apollo RetryLink only retries on
      // TRANSPORT errors, so this fails the query instantly (like an indexer
      // with no data / a failing GraphQL layer) instead of triggering Apollo's
      // internal 5-attempt jittered backoff.
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ errors: [{ message: 'simulated indexer outage' }] }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: { contractAction: { state: FIXTURE_STATE_HEX } } }));
  });
  return {
    server,
    hits,
    setMode(mode: MockMode) {
      state.mode = mode;
    },
    listen(): Promise<void> {
      return new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
    },
    close(): Promise<void> {
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}

export interface SpawnedServer {
  child: ChildProcess;
  url: string;
  logs: () => string;
  kill: () => Promise<void>;
}

/**
 * Boots the real production server (src/server.ts) in a throwaway directory so
 * no persisted wallet file exists on disk (deterministic wallet-disabled state
 * unless MIDNIGHT_WALLET_MNEMONIC is supplied). Blocks until /api/health
 * responds or `bootTimeoutMs` elapses (tsx + wallet-sdk import takes ~3 min).
 */
export async function spawnServer(
  env: Record<string, string>,
  port: number,
  bootTimeoutMs = 300_000,
): Promise<SpawnedServer> {
  const repoRoot = path.resolve(__dirname, '..');
  const cwd = mkdtempSync(path.join(os.tmpdir(), 'bridgeguard-test-'));
  let logs = '';
  const child = spawn(path.join(repoRoot, 'node_modules', '.bin', 'tsx'), [
    path.join(repoRoot, 'src', 'server.ts'),
  ], {
    cwd,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      MIDNIGHT_NETWORK: 'preprod',
      MIDNIGHT_CONTRACT_ADDRESS: FIXTURE_ADDRESS,
      PORT: String(port),
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (d) => (logs += d.toString()));
  child.stderr?.on('data', (d) => (logs += d.toString()));

  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + bootTimeoutMs;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (child.exitCode !== null) {
      throw new Error(`server exited early (code ${child.exitCode})\n--- logs ---\n${logs}`);
    }
    if (Date.now() > deadline) {
      throw new Error(`server did not boot within ${bootTimeoutMs}ms\n--- logs ---\n${logs}`);
    }
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) break;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 3_000));
  }
  return {
    child,
    url,
    logs: () => logs,
    kill: async () => {
      if (child.exitCode !== null) return;
      child.kill('SIGTERM');
      await Promise.race([
        new Promise<void>((resolve) => child.once('exit', () => resolve())),
        new Promise((r) => setTimeout(r, 8_000)),
      ]);
      if (child.exitCode === null) child.kill('SIGKILL');
    },
  };
}

export async function getStateJson(url: string): Promise<{ status: number; body: any }> {
  const res = await fetch(`${url}/api/state`);
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

export async function postJson(url: string, pathname: string, body: unknown) {
  const res = await fetch(`${url}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}