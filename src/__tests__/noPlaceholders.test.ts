// Audit TR-1: placeholder text must never reach users. Scans every page/component source for placeholder
// markers inside string literals or JSX text (code comments are ignored).
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
  });

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('no placeholder text in the UI', () => {
  const ui = [...files('src/pages'), ...files('src/components')];
  it.each(ui)('%s', (f) => {
    const code = stripComments(readFileSync(f, 'utf8'));
    expect(code).not.toMatch(/\[TODO|TODO:|Legal review required|lorem ipsum|coming soon/i);
  });
});
