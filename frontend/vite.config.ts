import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import { fileURLToPath, URL } from 'node:url';

// BridgeGuard AI frontend.
// /api/* is proxied to the BridgeGuard backend server (src/server.ts) so the
// dev experience is same-origin. Run the backend with:
//   npx tsx ../src/server.ts   (from the repo root)
//
// Midnight.js ledger WASM: vite-plugin-wasm handles the .wasm imports from
// @midnight-ntwrk/ledger-v8. Top-level await from the WASM runtime is preserved
// natively via esbuild `supported` + build.target esnext, so the (Vite-6
// incompatible) top-level-await Babel plugin is intentionally not used.
// isomorphic-ws resolves to the browser shim below in the browser build.
export default defineConfig({
  plugins: [react(), wasm()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'isomorphic-ws': fileURLToPath(new URL('./src/shim/isomorphic-ws.ts', import.meta.url)),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
      supported: { 'top-level-await': true },
    },
  },
  esbuild: {
    supported: { 'top-level-await': true },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext',
  },
});