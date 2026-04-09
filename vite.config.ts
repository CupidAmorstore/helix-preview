import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const base = process.env.VITE_BASE || '/';

export default defineConfig({
  base,
  plugins: [react(), nodePolyfills({ protocolImports: true })],
  define: {
    global: 'globalThis'
  },
  build: {
    target: 'es2020'
  }
});
