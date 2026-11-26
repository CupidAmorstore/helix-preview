// P0 permanent research failure registry + novelty guard. Every rejected experiment is classified by WHY it failed,
// and new hypotheses are checked against prior failures before any data is touched, so the search space cannot grow
// by renaming rejected ideas.
import type { StrategyFamily } from './types';

export type FailureCategory =
  | 'cost_dominated'        // positive gross, non-positive net after realistic costs
  | 'beta_only'             // gross gain does not exceed an exposure-matched passive holding (no timing skill)
  | 'no_gross_edge'         // loses money even at zero cost
  | 'insufficient_sample'   // too few trades / months to be testable
  | 'unstable'              // walk-forward / neighbour instability
  | 'oos_loss';             // lost on the unseen test window

export type FailureRecord = {
  id: string;
  hypothesisId: string;
  family: string;
  version: string;
  params: Record<string, number>;
  dataset: { market: string; intervalMs: number; window: [number, number]; kind: 'validation' | 'test' };
  costPreset: string;
  grossPnlUsd: number;
  netPnlUsd: number;
  passiveExposureMatchedPnlUsd: number;
  trades: number;
  categories: FailureCategory[];
  primaryCause: FailureCategory;
  confirmed: boolean;
  limitations: string[];
  correctiveAction: string;
  retestEligible: boolean;
};

/** Classification is mechanical and pre-declared (no discretion). Order = precedence of the primary cause. */
export function classifyFailure(x: { grossPnlUsd: number; netPnlUsd: number; passivePnlUsd: number; trades: number; minTrades: number; registryReasons: string[] }): { categories: FailureCategory[]; primary: FailureCategory } {
  const c: FailureCategory[] = [];
  if (x.grossPnlUsd <= 0) c.push('no_gross_edge');
  else if (x.grossPnlUsd <= x.passivePnlUsd) c.push('beta_only');
  if (x.grossPnlUsd > 0 && x.netPnlUsd <= 0) c.push('cost_dominated');
  if (x.trades < x.minTrades || x.registryReasons.some((r) => /trades \d+ < \d+|months \d+ </.test(r))) c.push('insufficient_sample');
  if (x.registryReasons.some((r) => /walk-forward|neighbour/.test(r))) c.push('unstable');
  if (x.registryReasons.some((r) => /^test /.test(r))) c.push('oos_loss');
  const order: FailureCategory[] = ['no_gross_edge', 'beta_only', 'cost_dominated', 'oos_loss', 'unstable', 'insufficient_sample'];
  return { categories: c, primary: order.find((o) => c.includes(o)) ?? 'insufficient_sample' };
}

export const CORRECTIVE: Record<FailureCategory, { action: string; retest: boolean }> = {
  no_gross_edge: { action: 'abandon the signal; no cost or execution change can rescue a negative gross result', retest: false },
  beta_only: { action: 'abandon as a timing rule; the gross gain is market exposure — benchmark against passive exposure', retest: false },
  cost_dominated: { action: 'only retest with a structurally lower-turnover version or VERIFIED lower costs (never assumed)', retest: true },
  oos_loss: { action: 'abandon this parameterisation; the test window is spent', retest: false },
  unstable: { action: 'abandon; parameter/period sensitivity indicates overfitting', retest: false },
  insufficient_sample: { action: 'only testable on new, unseen data (forward paper) or a larger point-in-time universe', retest: true }
};

/** Mechanism fingerprint: two hypotheses with the same fingerprint are the same idea under a different name. */
export type Fingerprint = { signal: 'trend' | 'momentum' | 'mean_reversion' | 'volatility' | 'cross_sectional' | 'microstructure' | 'onchain' | 'sentiment' | 'other'; horizon: 'intraday' | 'daily' | 'weekly' | 'monthly'; information: string };

export const FAMILY_FINGERPRINT: Record<StrategyFamily, Fingerprint> = {
  sma_cross: { signal: 'trend', horizon: 'daily', information: 'own price' },
  donchian_breakout: { signal: 'trend', horizon: 'daily', information: 'own price' },
  ts_momentum: { signal: 'momentum', horizon: 'daily', information: 'own price' },
  trend_filtered_momentum: { signal: 'momentum', horizon: 'daily', information: 'own price' },
  bollinger_reversion: { signal: 'mean_reversion', horizon: 'daily', information: 'own price' },
  rsi_reversion: { signal: 'mean_reversion', horizon: 'daily', information: 'own price' },
  vol_compression_breakout: { signal: 'volatility', horizon: 'daily', information: 'own price' },
  vol_filtered_trend: { signal: 'trend', horizon: 'daily', information: 'own price' },
  regime_switch: { signal: 'trend', horizon: 'daily', information: 'own price' },
  weekly_trend: { signal: 'trend', horizon: 'weekly', information: 'own price' },
  monthly_momentum: { signal: 'momentum', horizon: 'monthly', information: 'own price' }
};

export type NoveltyVerdict = { allowed: boolean; reasons: string[]; priorFailures: number };

/**
 * Consult the registry BEFORE generating/testing a hypothesis. Refused when an identical mechanism (same signal,
 * horizon and information set) already failed for a non-retestable cause, or has failed >= maxPrior times overall.
 * New information (a data source never used) is the legitimate way past the guard.
 */
export function noveltyCheck(fp: Fingerprint, registry: FailureRecord[], maxPrior = 10): NoveltyVerdict {
  const same = registry.filter((r) => {
    const f = FAMILY_FINGERPRINT[r.family as StrategyFamily];
    return f && f.signal === fp.signal && f.horizon === fp.horizon && f.information === fp.information;
  });
  const reasons: string[] = [];
  const terminal = same.filter((r) => !r.retestEligible);
  if (terminal.length) reasons.push(`${terminal.length} prior failures of this mechanism were non-retestable (${[...new Set(terminal.map((t) => t.primaryCause))].join(', ')})`);
  if (same.length >= maxPrior) reasons.push(`${same.length} prior failures of the same mechanism (limit ${maxPrior}) — requires new information, not a new name`);
  return { allowed: reasons.length === 0, reasons, priorFailures: same.length };
}
