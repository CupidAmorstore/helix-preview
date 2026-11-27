import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const base = process.env.VITE_BASE || '/';

// Node built-ins needed in the browser, mapped explicitly (no polyfill plugin): `buffer` (bitcoinjs-lib,
// safe-buffer, ripemd160, wallet.ts) and `stream` (cipher-base, via create-hash). `crypto` is deliberately NOT
// provided: the app uses WebCrypto and @noble implementations. Globals (Buffer, process) are set in
// src/polyfills.ts, imported first by main.tsx. Replaces vite-plugin-node-polyfills (2026-11-25): its
// crypto-browserify chain carried 6 low advisories (elliptic) even though crypto was never bundled.
export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    // exact-match aliases (a plain 'process' key would also rewrite 'process/browser.js')
    alias: [
      { find: /^(node:)?buffer$/, replacement: 'buffer/' },
      { find: /^(node:)?stream$/, replacement: 'stream-browserify' },
      { find: /^(node:)?events$/, replacement: 'events/' },
      { find: /^(node:)?util$/, replacement: 'util/' },
      { find: /^(node:)?process$/, replacement: 'process/browser.js' }
    ]
  },
  define: {
    global: 'globalThis'
  },
  optimizeDeps: {
    include: ['buffer', 'process/browser.js']
  },
  build: {
    target: 'es2020'
  }
});
