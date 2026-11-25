// Walk-forward re-estimation shared by every evaluator (single market, pooled, cross-sectional).
//
// Fail-closed (AUD-202): the full pre-declared number of folds must complete with finite results, or the
// candidate is rejected. Shared by all evaluators (AUD-201) so the qualification policy is identical.
//
// Coordinates are abstract and monotone: bar indices for one market, epoch milliseconds for multi-asset
// evaluations on a common calendar. Only the PRE-TEST region [trainStart, valEnd) is used; the final test
// window is never touched. Before each fold, parameters are re-selected on [trainStart, foldStart - embargo).
//
// Embargo: forward-only walk-forward cannot leak fold information into its own training (training ends
// before the fold). The embargo removes the dependency horizon of the indicators (+ the longest stateful
// hold) between the training data and the fold, so fold results are not driven by the same bars that
// selected the parameters. It is not a purge of overlapping labels: these rules have no multi-bar labels,
// and every training backtest is force-closed at its window end.

export type WalkForwardFold = {
  from: number;
  to: number;
  trainFrom: number;
  trainTo: number;
  params: Record<string, number>;
  netReturn: number;
  trades: number;
};

export type WalkForward = {
  folds: WalkForwardFold[];
  requiredFolds: number;
  skipped: { fold: number; reason: string }[];
  compoundedNet: number;
  positiveFolds: number;
  /** embargo in the evaluator's coordinate unit (bars, or ms for calendar-based evaluators) */
  embargoBars: number;
  complete: boolean;
};

export type WalkForwardPlan = {
  trainStart: number;
  valEnd: number;
  embargo: number;
  folds: number;
  /** grid step of the coordinate (1 for bar indices, intervalMs for calendar times) */
  step: number;
  /** minimum re-selection history, in coordinate units (default 2 × embargo) */
  minTrain?: number;
};

export function walkForwardCore<P extends Record<string, number>>(
  plan: WalkForwardPlan,
  select: (a: number, b: number) => P,
  trade: (params: P, a: number, b: number) => { netReturn: number; trades: number }
): WalkForward {
  const { trainStart, valEnd, embargo, folds, step } = plan;
  const skipped: WalkForward['skipped'] = [];
  const out: WalkForwardFold[] = [];
  const bad = (why: string) => {
    for (let k = 0; k < Math.max(1, folds); k++) skipped.push({ fold: k, reason: why });
  };
  if (!Number.isInteger(folds) || folds < 1) bad(`invalid fold count ${folds}`);
  else if (![trainStart, valEnd, embargo, step].every(Number.isFinite)) bad('non-finite boundaries');
  else if (!(step > 0)) bad('non-positive grid step');
  else if (!(embargo >= 0)) bad(`invalid embargo ${embargo}`);
  else if (!(valEnd > trainStart)) bad('empty pre-test region');
  else {
    const minTrain = plan.minTrain ?? 2 * embargo;
    const snap = (x: number) => trainStart + Math.floor((x - trainStart) / step) * step;
    const first = snap(trainStart + (valEnd - trainStart) / 2);
    const size = Math.floor((valEnd - first) / folds / step) * step;
    for (let k = 0; k < folds; k++) {
      if (!(size >= step)) { skipped.push({ fold: k, reason: 'fold shorter than one bar (insufficient history)' }); continue; }
      const a = first + k * size;
      const b = k === folds - 1 ? valEnd : a + size;
      const trainTo = a - embargo;
      if (!(b > a) || a < trainStart || b > valEnd) { skipped.push({ fold: k, reason: 'invalid fold boundaries' }); continue; }
      if (trainTo - trainStart < Math.max(minTrain, step)) {
        skipped.push({ fold: k, reason: `re-selection history ${trainTo - trainStart} < required ${Math.max(minTrain, step)} (insufficient history)` });
        continue;
      }
      const params = select(trainStart, trainTo);
      const r = trade(params, a, b);
      if (!Number.isFinite(r.netReturn) || !Number.isFinite(r.trades)) { skipped.push({ fold: k, reason: 'non-finite fold result' }); continue; }
      out.push({ from: a, to: b, trainFrom: trainStart, trainTo, params, netReturn: r.netReturn, trades: r.trades });
    }
  }
  // chronology: folds strictly ordered, contiguous, inside the pre-test region, each after its training
  const chronologyOk = out.every((f, i) =>
    f.trainTo <= f.from - embargo && f.from >= trainStart && f.to <= valEnd && f.to > f.from && (i === 0 || f.from >= out[i - 1].to));
  if (!chronologyOk) skipped.push({ fold: -1, reason: 'fold chronology violated' });
  const compoundedNet = out.reduce((m, f) => m * (1 + f.netReturn), 1) - 1;
  return {
    folds: out,
    requiredFolds: Math.max(0, Number.isInteger(folds) ? folds : 0),
    skipped,
    compoundedNet,
    positiveFolds: out.filter((f) => f.netReturn > 0).length,
    embargoBars: embargo,
    complete: chronologyOk && out.length === folds && skipped.length === 0 && Number.isFinite(compoundedNet)
  };
}

/** Rejection reasons from a walk-forward result. Empty only when every pre-declared fold completed AND passed. */
export function walkForwardRejections(wf: WalkForward | undefined, minPositiveShare: number): string[] {
  if (!wf) return ['walk-forward missing (mandatory)'];
  const r: string[] = [];
  if (!wf.complete) {
    const why = wf.skipped[0]?.reason ?? 'unknown';
    r.push(`walk-forward incomplete: ${wf.folds.length}/${wf.requiredFolds} folds (${why})`);
    return r;
  }
  if (!(wf.compoundedNet > 0)) r.push('walk-forward (re-estimated, embargoed) net return <= 0 after costs');
  if (wf.positiveFolds / wf.requiredFolds < minPositiveShare) r.push('walk-forward unstable: too few profitable folds');
  return r;
}
