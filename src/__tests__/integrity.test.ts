import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? (f === '__tests__' ? [] : walk(join(d, f))) : [join(d, f)]));
const src = walk(join(__dirname, '..')).filter((f) => /\.(ts|tsx)$/.test(f)).map((f) => [f, readFileSync(f, 'utf8')] as const);

describe('product integrity (regressions)', () => {
  it('no payment or checkout flow that points at a non-existent server', () => {
    for (const [f, s] of src) expect(s.includes('/api/create-checkout-session') || s.includes('/api/stripe-status'), f).toBe(false);
  });
  it('no contact address on a domain the project does not control', () => {
    for (const [f, s] of src) expect(/@helix\.app\b/.test(s), f).toBe(false);
  });
  it('no leftover "Apex App" branding', () => {
    for (const [f, s] of src) expect(s.includes('Apex App'), f).toBe(false);
  });
});
