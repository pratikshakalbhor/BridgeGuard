import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMockIndexer, getStateJson, postJson, spawnServer, type SpawnedServer } from './mock-indexer';

// Scenario B: production server WITH wallet credentials but an unreachable
// Midnight node → the background wallet init is running (or has failed), yet
// /api/state must still serve 200 from the indexer. This is the exact state
// Render was in: wallet initializing, indexer healthy → the public state API
// must never depend on the wallet runtime.

const SERVER_PORT = 3996;
const MOCK_PORT = 4196;

// Throwaway test wallet phrase (generated, valid BIP-39 24 words, no funds).
const VALID_24_WORD_MNEMONIC =
  'protect shine curious feed soap quote stand follow uniform sun quick very aerobic border skate bird canoe chief shadow reopen cream reduce round limb';

describe('server /api/state while the backend wallet initialization is failing', () => {
  let srv: SpawnedServer;
  const mock = createMockIndexer(MOCK_PORT);

  beforeAll(async () => {
    await mock.listen();
    srv = await spawnServer(
      {
        MIDNIGHT_WALLET_MNEMONIC: VALID_24_WORD_MNEMONIC,
        MIDNIGHT_INDEXER_URL: `http://127.0.0.1:${MOCK_PORT}/api/v4/graphql`,
        MIDNIGHT_INDEXER_WS_URL: `ws://127.0.0.1:${MOCK_PORT}/api/v4/graphql/ws`,
        // Unreachable node → wallet init can never succeed.
        MIDNIGHT_NODE_URL: 'http://127.0.0.1:9',
      },
      SERVER_PORT,
    );
  }, 320_000);

  afterAll(async () => {
    await srv?.kill();
    await mock.close();
  });

  it('serves 200 ledger state while the wallet init is running/failing', async () => {
    const { status, body } = await getStateJson(srv.url);
    expect(status).toBe(200);
    expect(body.ledger.bridges.length).toBeGreaterThan(0);
    expect(body.stale).toBe(false);
  });

  it('answers /api/register with "Backend wallet not ready" while the wallet is not ready', async () => {
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
  });
});