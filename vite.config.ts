import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [react(), nodePolyfills({ protocolImports: true })],
  define: {
    global: 'globalThis'
  },
  build: {
    target: 'es2020'
  }
});

