// P0 strategy status vocabulary (2026-11-27). Statuses describe EVIDENCE STATE. None of them is a profit claim, and
// no status enables real money: `realMoneyExecutionPermitted` is false for every status.
import { GATES } from './validation';

/** Final qualification (gates-v4) is unchanged. */
export const FINAL_MIN_VALIDATION_TRADES = GATES.minTradesValidation;
/** Experimental admission only: the 15-trade minimum is removed for this lane, nothing else. */
export const EXPERIMENTAL_MIN_VALIDATION_TRADES = 1;
/** Maximum distinct research hypotheses in active forward observation (owner decision 2026-11-27). */
export const MAX_ACTIVE_HYPOTHESES = 5;

export const STRATEGY_STATUSES = [
  'rejected',
  'insufficient_evidence',
  'approved_experimental_paper',
  'collecting_forward_evidence',
  'validated_paper_strategy',
  'real_money_eligible_disabled'
] as const;
export type StrategyStatus = (typeof STRATEGY_STATUSES)[number];

const NEXT: Record<StrategyStatus, readonly StrategyStatus[]> = {
  insufficient_evidence: ['approved_experimental_paper', 'rejected'],
  approved_experimental_paper: ['collecting_forward_evidence', 'rejected'],
  collecting_forward_evidence: ['validated_paper_strategy', 'rejected'],
  validated_paper_strategy: ['real_money_eligible_disabled', 'rejected'],
  rejected: [],
  real_money_eligible_disabled: []
};

export type TransitionEvidence = {
  experimentalScreenPassed?: boolean;
  safeguardsVerified?: boolean;
  registrationActive?: boolean;
  finalGatesPassed?: boolean;
  freshForwardMonths?: number;
  forwardMinMonths?: number;
};

export type TransitionResult = { ok: true; to: StrategyStatus } | { ok: false; reason: string };

export function transition(from: StrategyStatus, to: StrategyStatus, e: TransitionEvidence): TransitionResult {
  const fail = (reason: string): TransitionResult => ({ ok: false, reason });
  if (!NEXT[from].includes(to)) return fail(`${from} -> ${to} is not an allowed transition`);
  if (to === 'approved_experimental_paper' && !(e.experimentalScreenPassed && e.safeguardsVerified)) {
    return fail('experimental approval needs a passed experimental screen and verified safeguards');
  }
  if (to === 'collecting_forward_evidence' && !e.registrationActive) {
    return fail('collecting forward evidence needs an active, hashed registration with a future start');
  }
  if (to === 'validated_paper_strategy' && !(e.finalGatesPassed && (e.freshForwardMonths ?? 0) >= (e.forwardMinMonths ?? 12))) {
    return fail('validation needs every final gate passed and complete fresh forward months');
  }
  return { ok: true, to };
}

/** Paper observation is allowed for approved, collecting and validated strategies only. */
export function paperExecutionPermitted(s: StrategyStatus): boolean {
  return s === 'approved_experimental_paper' || s === 'collecting_forward_evidence' || s === 'validated_paper_strategy';
}

/** Real money is never permitted, whatever the status. Kept as a function so tests can assert it. */
export function realMoneyExecutionPermitted(s: StrategyStatus): false {
  void s;
  return false;
}

/**
 * Map an experimental screen result to a status. Passing the screen approves paper observation only. Failing on a
 * substantive criterion (drawdown, stability, returns, prior test use) is a rejection; anything else stays
 * insufficient evidence.
 */
export function statusFromScreen(r: { state: string; reasons: string[] }): StrategyStatus {
  if (r.state === 'experimental_research_eligible') return 'approved_experimental_paper';
  const substantive = r.reasons.some((x) => /drawdown|stability|net returns|already inspected|walk-forward failed/.test(x));
  return substantive ? 'rejected' : 'insufficient_evidence';
}
