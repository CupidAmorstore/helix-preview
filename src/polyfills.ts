// Browser globals some wallet libraries expect from Node (see vite.config.ts). Imported before anything else.
import { Buffer } from 'buffer';
import process from 'process/browser.js';

const g = globalThis as unknown as { Buffer?: typeof Buffer; process?: unknown };
if (!g.Buffer) g.Buffer = Buffer;
if (!g.process) g.process = process;
