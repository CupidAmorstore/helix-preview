import { describe, expect, it } from 'vitest';
import { EXPERIMENTAL_MIN_VALIDATION_TRADES, FINAL_MIN_VALIDATION_TRADES, MAX_ACTIVE_HYPOTHESES, paperExecutionPermitted, realMoneyExecutionPermitted, STRATEGY_STATUSES, statusFromScreen, transition } from '../../bot/strategyStatus';
import type { ForwardRegistration } from '../../bot/forward';
import a from '../../../research/forward/registration.json';
import b from '../../../research/forward/registration-b.json';
import e1 from '../../../research/forward/registration-e1.json';
import e2 from '../../../research/forward/registration-e2.json';

describe('thresholds', () => {
  it('final gates keep 15 validation trades; only the experimental lane drops the minimum', () => {
    expect(FINAL_MIN_VALIDATION_TRADES).toBe(15);
    expect(EXPERIMENTAL_MIN_VALIDATION_TRADES).toBe(1);
  });
});

describe('status transitions', () => {
  it('approval needs a passed experimental screen and verified safeguards', () => {
    expect(transition('insufficient_evidence', 'approved_experimental_paper', {}).ok).toBe(false);
    expect(transition('insufficient_evidence', 'approved_experimental_paper', { experimentalScreenPassed: true, safeguardsVerified: true }).ok).toBe(true);
  });
  it('collecting needs an active registration', () => {
    expect(transition('approved_experimental_paper', 'collecting_forward_evidence', {}).ok).toBe(false);
    expect(transition('approved_experimental_paper', 'collecting_forward_evidence', { registrationActive: true }).ok).toBe(true);
  });
  it('validation needs every final gate and 12 fresh forward months', () => {
    expect(transition('collecting_forward_evidence', 'validated_paper_strategy', { finalGatesPassed: true, freshForwardMonths: 11 }).ok).toBe(false);
    expect(transition('collecting_forward_evidence', 'validated_paper_strategy', { finalGatesPassed: false, freshForwardMonths: 24 }).ok).toBe(false);
    expect(transition('collecting_forward_evidence', 'validated_paper_strategy', { finalGatesPassed: true, freshForwardMonths: 12 }).ok).toBe(true);
  });
  it('no skipping stages and no leaving rejected', () => {
    expect(transition('insufficient_evidence', 'validated_paper_strategy', { finalGatesPassed: true, freshForwardMonths: 24 }).ok).toBe(false);
    expect(transition('rejected', 'approved_experimental_paper', { experimentalScreenPassed: true, safeguardsVerified: true }).ok).toBe(false);
  });
});

describe('real money is never permitted', () => {
  it('no status permits real money, and only the three evidence states permit paper observation', () => {
    for (const s of STRATEGY_STATUSES) expect(realMoneyExecutionPermitted(s)).toBe(false);
    const paper = STRATEGY_STATUSES.filter((s) => paperExecutionPermitted(s));
    expect(paper).toEqual(['approved_experimental_paper', 'collecting_forward_evidence', 'validated_paper_strategy']);
  });
});

describe('screen mapping', () => {
  it('eligible -> approved; substantive failures -> rejected; trade-count-only -> insufficient evidence', () => {
    expect(statusFromScreen({ state: 'experimental_research_eligible', reasons: [] })).toBe('approved_experimental_paper');
    expect(statusFromScreen({ state: 'research_deferred', reasons: ['historical drawdown above limit or missing'] })).toBe('rejected');
    expect(statusFromScreen({ state: 'research_deferred', reasons: ['parameter stability too weak or missing'] })).toBe('rejected');
    expect(statusFromScreen({ state: 'research_deferred', reasons: ['missing or inconsistent validation trade count'] })).toBe('insufficient_evidence');
  });
});

describe('active hypothesis cap', () => {
  it('a, b, e1, e2 together hold at most 5 distinct hypotheses', () => {
    const sig = (r: ForwardRegistration) => r.rules.map((x) => `${x.kind}|${(x as { family?: string }).family ?? ''}|${JSON.stringify(x.params)}|${x.markets.join(',')}`);
    const distinct = new Set([a, b, e1, e2].flatMap((x) => sig(x as unknown as ForwardRegistration)));
    expect(distinct.size).toBe(5);
    expect(distinct.size).toBeLessThanOrEqual(MAX_ACTIVE_HYPOTHESES);
  });
});
