/// <reference types="vite/client" />

declare module 'process/browser.js' {
  const process: Record<string, unknown>;
  export default process;
}
