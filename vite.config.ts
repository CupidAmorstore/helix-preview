import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const base = process.env.VITE_BASE || '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    // Only the Node built-ins the wallet libraries actually need. Excluding `crypto` keeps
    // crypto-browserify / elliptic (unused, with open advisories) out of the shipped bundle;
    // the app uses WebCrypto and @noble / secp256k1 implementations instead.
    nodePolyfills({
      include: ['buffer', 'process', 'stream', 'util', 'events'],
      globals: { Buffer: true, process: true, global: true },
      protocolImports: true
    })
  ],
  define: {
    global: 'globalThis'
  },
  build: {
    target: 'es2020'
  }
});
