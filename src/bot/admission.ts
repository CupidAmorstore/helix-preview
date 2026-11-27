// P0 economic opportunity admission layer. Runs BEFORE execution: decides whether a proposed trade can plausibly
// earn a net profit given verified costs, the account size and liquidity. FAIL CLOSED.
// Passing ECONOMIC feasibility is not evidence of predictive value: `admitted` additionally requires the edge
// estimate to come from forward-validated evidence. Today no strategy has that, so nothing is admitted (cash).
import { lookupFee, spreadSlippageBps, type FeeEvidence } from './feeEvidence';
import { assertPaperOnly, DEFAULT_RISK } from './risk';

export type EdgeSource = 'none' | 'historical_diagnostic' | 'forward_validated';

export type AdmissionRequest = {
  venue: FeeEvidence['venue'];
  region: string;
  capitalUsd: number;
  notionalUsd: number;
  execution: 'taker' | 'maker';
  /** maker fills need a verified fill model; without it maker requests are rejected */
  makerFillModelVerified?: boolean;
  /** median absolute price move over the intended holding horizon (data-derived, from completed bars) */
  typicalAbsMove: number;
  /** expected gross move of the trade and where that estimate comes from */
  expectedGrossMove?: number;
  edgeSource: EdgeSource;
  /** adverse move at the 95th percentile over the horizon (for potential loss) */
  adverseMove95?: number;
  /** live book for this notional, if available */
  book?: { observedAt: number; halfSpreadBps: number; slippageBps: number; visibleDepthUsd: number };
  nowMs: number;
  maxBookAgeMs?: number;
  maxPositionFraction?: number;
  /** research lanes may evaluate 'assumed' fee evidence; production admission never does */
  researchLane?: boolean;
};

export type AdmissionResult = {
  economicallyFeasible: boolean;
  admitted: boolean;
  reasons: string[];
  warnings: string[];
  evidenceId?: string;
  costs?: { feeBpsPerSide: number; spreadSlippageBpsPerSide: number; fixedUsdPerFill: number; roundTripPct: number };
  breakEvenMove?: number;
  stressedBreakEvenMove?: number;
  breakEvenVsTypicalMove?: number;
  expectedNetMove?: number;
  potentialLossUsd?: number;
  riskAdjustedReturn?: number;
};

/** Gross price move needed for a long round trip to break even. */
export function breakEven(sidePct: number, fixedUsd: number, notionalUsd: number): number {
  return ((1 + (2 * fixedUsd) / notionalUsd) * (1 + sidePct)) / (1 - sidePct) - 1;
}

/** Economic policy (pre-declared; not tuned on results). */
export const ADMISSION_POLICY = {
  /** break-even must not exceed this share of the typical move over the holding horizon */
  maxBreakEvenShareOfTypicalMove: 0.5,
  /** stressed (2x proportional, stressed fixed) break-even must stay below the typical move */
  maxStressedBreakEvenShareOfTypicalMove: 1.0,
  /** an order may take at most this share of visible depth */
  maxDepthShare: 0.1,
  maxBookAgeMs: 60 * 60 * 1000,
  stressFactor: 2
} as const;

export function admit(r: AdmissionRequest): AdmissionResult {
  assertPaperOnly();
  const reasons: string[] = [];
  const warnings: string[] = [];
  const fee = lookupFee(r.venue, r.region, r.nowMs, { allowAssumed: r.researchLane });
  if (!fee.ok) return { economicallyFeasible: false, admitted: false, reasons: fee.reasons, warnings };
  warnings.push(...fee.warnings);
  const ev = fee.evidence;
  if (!(r.notionalUsd > 0) || !(r.capitalUsd > 0)) return { economicallyFeasible: false, admitted: false, reasons: ['non-positive notional or capital'], warnings };
  if (!(r.typicalAbsMove > 0)) return { economicallyFeasible: false, admitted: false, reasons: ['typical move over the horizon unknown — fails closed'], warnings };

  // fees
  let feeBps = ev.takerBps;
  if (r.execution === 'maker') {
    if (!r.makerFillModelVerified) reasons.push('maker execution requested but no verified fill model (queue, fill probability, adverse selection) — fails closed');
    feeBps = ev.makerBps;
  }
  // spread + slippage: live book if fresh, else the dated measurement; unknown -> fail closed
  let ss: number | null = null;
  const maxAge = r.maxBookAgeMs ?? ADMISSION_POLICY.maxBookAgeMs;
  if (r.book) {
    if (r.nowMs - r.book.observedAt > maxAge) reasons.push(`order book ${(r.nowMs - r.book.observedAt) / 60000 | 0} min old (> ${maxAge / 60000} min) — stale`);
    else {
      ss = r.book.halfSpreadBps + r.book.slippageBps;
      if (r.notionalUsd > ADMISSION_POLICY.maxDepthShare * r.book.visibleDepthUsd) reasons.push(`order is ${(100 * r.notionalUsd / r.book.visibleDepthUsd).toFixed(1)}% of visible depth (> ${ADMISSION_POLICY.maxDepthShare * 100}%)`);
    }
  } else {
    ss = spreadSlippageBps(r.venue, r.notionalUsd);
    if (ss !== null) warnings.push('spread/slippage from dated snapshot measurement, not a live book');
  }
  if (ss === null) {
    if (r.venue.endsWith('_dex')) { ss = 25; warnings.push('DEX spread/price impact assumed 25 bps per side (no measurement)'); }
    else reasons.push('no spread/slippage evidence for this venue and size — fails closed');
  }
  const fixed = ev.fixedUsd?.[0] ?? 0;
  const fixedStress = ev.fixedUsd?.[1] ?? 0;
  const side = (feeBps + (ss ?? 0)) / 10_000;
  const be = breakEven(side, fixed, r.notionalUsd);
  const sbe = breakEven(Math.min(0.99, side * ADMISSION_POLICY.stressFactor), fixedStress, r.notionalUsd);
  const costs = { feeBpsPerSide: feeBps, spreadSlippageBpsPerSide: ss ?? NaN, fixedUsdPerFill: fixed, roundTripPct: (2 * side + (2 * fixed) / r.notionalUsd) * 100 };

  // capital constraints
  if (r.notionalUsd < ev.minOrderUsd) reasons.push(`notional $${r.notionalUsd.toFixed(2)} below venue minimum $${ev.minOrderUsd}`);
  const maxFrac = r.maxPositionFraction ?? DEFAULT_RISK.maxPositionFraction;
  if (r.notionalUsd > r.capitalUsd * maxFrac + 1e-9) reasons.push(`notional exceeds ${(maxFrac * 100).toFixed(0)}% position limit of $${r.capitalUsd} account — exposure is never raised to beat fees`);
  if (be > ADMISSION_POLICY.maxBreakEvenShareOfTypicalMove * r.typicalAbsMove) reasons.push(`break-even move ${(be * 100).toFixed(2)}% > ${ADMISSION_POLICY.maxBreakEvenShareOfTypicalMove * 100}% of the typical ${(r.typicalAbsMove * 100).toFixed(2)}% move over the horizon`);
  if (sbe > ADMISSION_POLICY.maxStressedBreakEvenShareOfTypicalMove * r.typicalAbsMove) reasons.push(`stressed break-even ${(sbe * 100).toFixed(2)}% exceeds the typical move`);
  const economicallyFeasible = reasons.length === 0;

  // predictive edge: only forward-validated evidence can admit a trade
  const edgeReasons: string[] = [];
  if (r.edgeSource !== 'forward_validated') edgeReasons.push(`edge evidence is '${r.edgeSource}': economic feasibility is not predictive evidence — no admission`);
  if (r.expectedGrossMove === undefined) edgeReasons.push('no expected gross move supplied');
  else if (r.expectedGrossMove <= sbe) edgeReasons.push(`expected gross move ${(r.expectedGrossMove * 100).toFixed(2)}% does not clear the stressed break-even ${(sbe * 100).toFixed(2)}%`);
  const net = r.expectedGrossMove !== undefined ? r.expectedGrossMove - be : undefined;
  const loss = r.adverseMove95 !== undefined ? r.notionalUsd * (r.adverseMove95 + be) : undefined;
  return {
    economicallyFeasible,
    admitted: economicallyFeasible && edgeReasons.length === 0,
    reasons: [...reasons, ...edgeReasons],
    warnings,
    evidenceId: ev.id,
    costs,
    breakEvenMove: be,
    stressedBreakEvenMove: sbe,
    breakEvenVsTypicalMove: be / r.typicalAbsMove,
    expectedNetMove: net,
    potentialLossUsd: loss,
    riskAdjustedReturn: net !== undefined && r.adverseMove95 ? net / (r.adverseMove95 + be) : undefined
  };
}
