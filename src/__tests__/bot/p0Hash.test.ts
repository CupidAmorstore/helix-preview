import { describe, expect, it } from 'vitest';
import { registrationHash, type ForwardRegistration } from '../../bot/forward';
import a from '../../../research/forward/registration.json';
import b from '../../../research/forward/registration-b.json';
import e1 from '../../../research/forward/registration-e1.json';
import e2 from '../../../research/forward/registration-e2.json';
import proposal from '../../../research/experimental/screen-2026-11-27/registration-experimental.PROPOSAL.json';

const reg = (x: unknown) => x as ForwardRegistration;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

describe('registration hashes: existing protocols unchanged', () => {
  it('registration a (v1) and b (v2) keep their recorded hashes', () => {
    expect(registrationHash(reg(a))).toBe(reg(a).rulesHash);
    expect(registrationHash(reg(b))).toBe(reg(b).rulesHash);
    expect(reg(b).rulesHash).toBe('9daf74dbeaca54c538d6b2e37110c3cb5b1c2ba9b635d751e8232a8a60093f2e');
  });
});

describe('experimental registrations (v3)', () => {
  it('e1 and e2 hashes verify and are distinct from each other and from a and b', () => {
    expect(registrationHash(reg(e1))).toBe(reg(e1).rulesHash);
    expect(registrationHash(reg(e2))).toBe(reg(e2).rulesHash);
    const all = [a, b, e1, e2].map((x) => registrationHash(reg(x)));
    expect(new Set(all).size).toBe(4);
  });
  it('any change to identity, timestamps, costs, policy, parameters or market changes the hash', () => {
    const base = reg(e1);
    const h = registrationHash(base);
    const mutations: Array<(r: ForwardRegistration) => void> = [
      (r) => { r.id = 'other'; },
      (r) => { r.registeredAt = '2026-11-20T00:00:00Z'; },
      (r) => { r.startAt = Date.UTC(2026, 11, 1); },
      (r) => { r.policy = { ...r.policy!, positionFraction: 0.06 }; },
      (r) => { r.costSnapshot = { ...r.costSnapshot!, takerFeeBps: 90 }; },
      (r) => { (r.rules[0] as { params: Record<string, number> }).params.k = 2.5; },
      (r) => { r.rules[0].markets = ['ETH-USD']; },
      (r) => { r.capitalUsd = 500; },
      (r) => { r.evaluation = { ...r.evaluation, familyAlpha: 0.05 }; }
    ];
    for (const m of mutations) {
      const r = clone(base);
      m(r);
      expect(registrationHash(r)).not.toBe(h);
    }
  });
  it('canonical hashing does not depend on property order', () => {
    const r = clone(reg(e1));
    const reordered = Object.fromEntries(Object.entries(r).reverse()) as ForwardRegistration;
    expect(registrationHash(reordered)).toBe(registrationHash(r));
  });
});

describe('investigation: the proposal hash claim', () => {
  it('the archived proposal does NOT match registration b; the earlier PASS checked the build script reference copy', () => {
    const p = reg(proposal);
    expect(registrationHash(p)).toBe(p.rulesHash);
    expect(p.rulesHash).not.toBe(reg(b).rulesHash);
  });
  it('legacy v2 limitation, documented: b.startAt is not committed by its hash (fixed for v3 registrations)', () => {
    const moved = clone(reg(b));
    moved.startAt = 1;
    expect(registrationHash(moved)).toBe(registrationHash(reg(b)));
  });
});
