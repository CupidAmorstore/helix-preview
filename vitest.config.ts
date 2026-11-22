import { defineConfig } from 'vitest/config';

// Tests run on plain Node modules. The app's vite.config.ts swaps node built-ins (buffer, crypto)
// for browser polyfills; mixing those with libraries that use Node's real Buffer breaks type checks
// such as bitcoinjs-lib's isPoint.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
});
