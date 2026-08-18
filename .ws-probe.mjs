import { WebSocket } from 'ws';

const url = process.argv[2] || 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws';
const query = process.argv[3] || 'subscription ZswapLedgerEvents($id: BigInt) { zswapLedgerEvents(id: $id) { id raw protocolVersion maxId } }';
const vars = { id: null };

const ws = new WebSocket(url, ['graphql-transport-ws'], { handshakeTimeout: 20000 });
let count = 0;
let firstId = null;
let lastId = null;
let started = Date.now();
const maxWait = 60000;

ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'connection_init', payload: {} }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === 'connection_ack') {
    console.log('connected, subscribing with id=null (full replay)');
    ws.send(JSON.stringify({ type: 'subscribe', id: '1', payload: { query, variables: vars } }));
  } else if (msg.type === 'next') {
    count++;
    if (msg.payload.errors) { console.log('payload errors:', JSON.stringify(msg.payload.errors)); return; }
    const e = msg.payload.data && msg.payload.data.zswapLedgerEvents;
    if (firstId === null) firstId = e.id;
    lastId = e.id;
    if (count % 1000 === 0) {
      const rate = Math.round((count * 1000) / (Date.now() - started));
      console.log(`received ${count} events, last id=${lastId}, rate ~${rate}/s`);
    }
  } else if (msg.type === 'error') {
    console.log('SUB ERROR:', JSON.stringify(msg.payload));
    process.exit(1);
  } else if (msg.type === 'complete') {
    console.log('SUB COMPLETE');
    process.exit(0);
  }
});

ws.on('close', (code, reason) => {
  console.log(`closed code=${code} reason=${reason}`);
  process.exit(0);
});

ws.on('error', (err) => {
  console.log('WS ERROR:', err.message);
  process.exit(1);
});

setTimeout(() => {
  const rate = Math.round((count * 1000) / (Date.now() - started));
  console.log(`\n=== after ${(Date.now() - started) / 1000}s: received ${count} events, first=${firstId}, last=${lastId}, avg rate ~${rate}/s`);
  ws.close();
  process.exit(0);
}, maxWait);