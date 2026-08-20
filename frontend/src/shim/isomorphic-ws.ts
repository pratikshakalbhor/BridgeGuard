// Browser shim for `isomorphic-ws`.
//
// @midnight-ntwrk/midnight-js-indexer-public-data-provider imports WebSocket as
// `import * as ws from 'isomorphic-ws'` and reads `ws.WebSocket`. The package's
// browser build (`browser.js`) only exports a default binding, so Vite fails to
// find the named export. This alias exposes the browser-global WebSocket under
// both shapes.

const ws = globalThis.WebSocket;

export default ws;
export { ws as WebSocket };