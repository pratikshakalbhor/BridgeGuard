import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMockIndexer, getStateJson, postJson, spawnServer, type SpawnedServer } from './mock-indexer';

// Scenario A: production server WITHOUT wallet credentials (the common Render
// configuration). Asserts /api/state is fully wallet-independent:
//   1. indexer down + no cache  → structured 503 (not a wallet-init 503)
//   2. indexer up               → 200 fresh (stale:false)
//   3. indexer down again       → 200 cached (stale:true, cachedAt set)
//   4. /api/register            → 503 'Backend wallet not ready'
//   5. /api/health              → 200 even while the indexer is down

const SERVER_PORT = 3997;
const MOCK_PORT = 4197;

describe('server /api/state with backend wallet disabled', () => {
  let srv: SpawnedServer;
  const mock = createMockIndexer(MOCK_PORT);

  beforeAll(async () => {
    await mock.listen();
    // Boot the server while the indexer is "down" so no ledger cache exists
    // yet — test 1 must observe the no-cache 503 path. (/api/health still
    // answers 200 during boot thanks to process-up semantics.)
    mock.setMode('fail');
    srv = await spawnServer(
      {
        MIDNIGHT_INDEXER_URL: `http://127.0.0.1:${MOCK_PORT}/api/v4/graphql`,
        MIDNIGHT_INDEXER_WS_URL: `ws://127.0.0.1:${MOCK_PORT}/api/v4/graphql/ws`,
      },
      SERVER_PORT,
    );
  }, 320_000);

  afterAll(async () => {
    await srv?.kill();
    await mock.close();
  });

  it('returns a structured 503 when the indexer is down and there is no cache yet (wallet state is NOT the cause)', async () => {
    mock.setMode('fail');
    const { status, body } = await getStateJson(srv.url);
    expect(status).toBe(503);
    expect(body.error).toBe('Indexer temporarily unavailable');
    expect(body.stale).toBe(false);
    expect(body.cachedAt).toBeNull();
    expect(String(body.detail)).toContain('indexer');
  });

  it('serves 200 fresh ledger state once the indexer is reachable', async () => {
    mock.setMode('ok');
    const { status, body } = await getStateJson(srv.url);
    expect(status).toBe(200);
    expect(body.stale).toBe(false);
    expect(body.cachedAt).toBeNull();
    expect(body.ledger.bridges.length).toBeGreaterThan(0);
    expect(body.ledger.registryCount).toBeDefined();
  });

  it('serves the cached snapshot marked stale when the indexer goes down again', async () => {
    mock.setMode('fail');
    const { status, body } = await getStateJson(srv.url);
    expect(status).toBe(200);
    expect(body.stale).toBe(true);
    expect(typeof body.cachedAt).toBe('string');
    expect(body.ledger.bridges.length).toBeGreaterThan(0);
  });

  it('answers /api/register with a structured "Backend wallet not ready" 503 (wallet disabled)', async () => {
    const { status, body } = await postJson(srv.url, '/api/register', {
      name: 'Test Bridge',
      srcChain: '1',
      dstChain: '42161',
      tvl: '100000',
      audited: 1,
      incidents: '0',
    });
    expect(status).toBe(503);
    expect(body.error).toBe('Backend wallet not ready');
    expect(body.walletDisabled).toBe(true);
  });

  it('keeps /api/health answering 200 (process-up) even while the indexer is down', async () => {
    mock.setMode('fail');
    const res = await fetch(`${srv.url}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    const indexerRow = body.services.find((s: any) => s.name === 'Indexer');
    expect(indexerRow).toBeDefined();
    expect(indexerRow.healthy).toBe(false);
  });
});