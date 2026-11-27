import { describe, expect, it } from 'vitest';
import raw from '../../bot/data/latest.json';
import { validateSummary } from '../../bot/feedValidation';

const B = raw as unknown as Record<string, unknown>;
const clone = () => JSON.parse(JSON.stringify(B));
const now = Date.parse(B.generatedAt as string) + 60_000;

describe('research feed validation', () => {
  it('the bundled snapshot is valid', () => expect(validateSummary(B, now)).toEqual([]));
  it('rejects live mode, future and invalid timestamps', () => {
    expect(validateSummary({ ...clone(), mode: 'live' }, now)[0]).toMatch(/not 'paper'/);
    expect(validateSummary({ ...clone(), generatedAt: new Date(now + 86_400_000).toISOString() }, now)[0]).toMatch(/future/);
    expect(validateSummary({ ...clone(), generatedAt: 'yesterday' }, now)[0]).toMatch(/invalid/);
  });
  it('rejects NaN/Infinity, impossible returns and drawdowns', () => {
    const a = clone(); a.runs[0].markets[0].candidates[0].train.netReturn = null;
    expect(validateSummary(a, now).join()).toMatch(/netReturn: not a finite/);
    const b = clone(); b.runs[0].markets[0].candidates[0].train.netReturn = -1.5;
    expect(validateSummary(b, now).join()).toMatch(/below −100%/);
    const c = clone(); c.runs[0].markets[0].candidates[0].train.maxDrawdown = 3;
    expect(validateSummary(c, now).join()).toMatch(/outside 0–100%/);
  });
  it('rejects unknown or live statuses and inconsistent qualified counts', () => {
    const a = clone(); a.runs[0].markets[0].candidates[0].status = 'owner_approved_live_candidate';
    expect(validateSummary(a, now).join()).toMatch(/not an allowed status/);
    const b = clone(); b.runs[0].markets[0].candidates[0].status = 'qualified_paper_strategy'; b.runs[0].markets[0].candidates[0].rejectionReasons = [];
    expect(validateSummary(b, now).join()).toMatch(/totals.qualified/);
  });
  it('rejects malformed markets, oversized payloads and non-objects', () => {
    const a = clone(); a.runs[0].markets[0].intervalMs = 60_000;
    expect(validateSummary(a, now).join()).toMatch(/intervalMs/);
    expect(validateSummary(B, now, 9_000_000)[0]).toMatch(/bytes/);
    expect(validateSummary('x', now)).toEqual(['not an object']);
  });
});
