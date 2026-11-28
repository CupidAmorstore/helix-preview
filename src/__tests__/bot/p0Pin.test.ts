// Phase III: external integrity anchor for forward registrations (see checkRegistrationPin).
import { describe, expect, it } from 'vitest';
import { checkRegistrationPin, registrationHash, type ForwardRegistration } from '../../bot/forward';
import a from '../../../research/forward/registration.json';
import b from '../../../research/forward/registration-b.json';
import e1 from '../../../research/forward/registration-e1.json';
import e2 from '../../../research/forward/registration-e2.json';

const reg = (x: unknown) => JSON.parse(JSON.stringify(x)) as ForwardRegistration;
const NOW = '2026-11-27T12:00:00.000Z';

describe('registration pin (identity anchored in the append-only ledger)', () => {
  it('first evaluation pins hash, startAt and registeredAt and says so', () => {
    for (const r of [a, b, e1, e2].map(reg)) {
      const c = checkRegistrationPin(r, undefined, NOW);
      expect(c.problems).toEqual([]);
      expect(c.pin).toEqual({ rulesHash: r.rulesHash, startAt: r.startAt, registeredAt: r.registeredAt, pinnedAt: NOW });
      expect(c.warnings[0]).toMatch(/pinned now/);
    }
  });
  it('an unchanged registration passes silently and keeps the original pin', () => {
    const r = reg(e1);
    const { pin } = checkRegistrationPin(r, undefined, NOW);
    const later = checkRegistrationPin(r, pin, '2027-01-01T00:00:00.000Z');
    expect(later).toEqual({ pin, problems: [], warnings: [] });
  });
  it('catches an edit that ALSO rewrites rulesHash (self-consistent, so the hash check alone passes)', () => {
    const r = reg(e1);
    const { pin } = checkRegistrationPin(r, undefined, NOW);
    (r.rules[0] as { params: Record<string, number> }).params.k = 1.5;
    r.rulesHash = registrationHash(r);
    expect(registrationHash(r)).toBe(r.rulesHash); // the old check would accept this
    const c = checkRegistrationPin(r, pin, NOW);
    expect(c.problems[0]).toMatch(/changed after it was pinned \(rulesHash\)/);
  });
  it('catches a moved start date on legacy v2 registration b, whose hash does not cover startAt', () => {
    const r = reg(b);
    const { pin } = checkRegistrationPin(r, undefined, NOW);
    r.startAt = Date.UTC(2026, 10, 20);
    expect(registrationHash(r)).toBe(r.rulesHash); // legacy gap: hash unchanged
    expect(checkRegistrationPin(r, pin, NOW).problems[0]).toMatch(/startAt/);
  });
  it('catches a back-dated registeredAt', () => {
    const r = reg(a);
    const { pin } = checkRegistrationPin(r, undefined, NOW);
    r.registeredAt = '2026-01-01T00:00:00.000Z';
    expect(checkRegistrationPin(r, pin, NOW).problems[0]).toMatch(/registeredAt/);
  });
});
