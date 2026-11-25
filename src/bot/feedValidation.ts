// Strict validation of a research summary (bundled or downloaded). Returns a list of problems; empty = valid.
// Used by the app before accepting the daily feed and by CI before publishing it.

import { GATES } from './validation';

export const MAX_FEED_BYTES = 5_000_000;
const STATUSES = new Set(['detected_opportunity', 'research_hypothesis', 'backtested_candidate', 'rejected', 'qualified_paper_strategy']);
const INTERVALS = new Set([3_600_000, 86_400_000]);
const EARLIEST = Date.UTC(2020, 0, 1);

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => !!x && typeof x === 'object' && !Array.isArray(x);
const fin = (x: unknown) => typeof x === 'number' && Number.isFinite(x);
const int0 = (x: unknown) => fin(x) && Number.isInteger(x) && (x as number) >= 0;

function window(w: unknown, path: string, errs: string[], optional = false) {
  if (w === undefined || w === null) {
    if (!optional) errs.push(`${path}: missing`);
    return;
  }
  if (!isObj(w)) return void errs.push(`${path}: not an object`);
  if (!int0(w.trades)) errs.push(`${path}.trades: not a non-negative integer`);
  for (const k of ['netReturn', 'grossReturn']) {
    if (!fin(w[k])) errs.push(`${path}.${k}: not a finite number`);
    else if ((w[k] as number) < -1 - 1e-9) errs.push(`${path}.${k}: below −100% (impossible long-only)`);
  }
  for (const k of ['maxDrawdown', 'maxDrawdownBound']) {
    if (w[k] !== undefined && w[k] !== null && (!fin(w[k]) || (w[k] as number) < 0 || (w[k] as number) > 1 + 1e-9)) errs.push(`${path}.${k}: outside 0–100%`);
  }
}

/**
 * Audit 4.3/4.6: a "qualified" label is display data from an external feed. It is accepted only when produced
 * under the gate version this app enforces, with a complete walk-forward (all pre-declared folds, positive).
 * Anything else (older gates, missing evidence) is rejected so a stale or forged feed cannot show a promotion.
 */
function qualifiedEvidence(c: Obj, runGates: unknown, path: string, errs: string[]) {
  if (c.status !== 'qualified_paper_strategy') return;
  if (runGates !== GATES.version) errs.push(`${path}: qualified under '${String(runGates)}', app enforces '${GATES.version}' (revalidation required)`);
  const wf = c.walkForward;
  if (!isObj(wf) || wf.folds !== GATES.walkForwardFolds || !fin(wf.compoundedNet) || !((wf.compoundedNet as number) > 0) || !int0(wf.positiveFolds) || (wf.positiveFolds as number) < GATES.walkForwardFolds * GATES.minWalkForwardPositiveShare)
    errs.push(`${path}: qualified without complete walk-forward evidence`);
}

function candidate(c: unknown, path: string, errs: string[], runGates?: unknown) {
  if (!isObj(c)) return void errs.push(`${path}: not an object`);
  if (typeof c.key !== 'string' || !c.key) errs.push(`${path}.key: missing`);
  if (typeof c.family !== 'string' || !c.family) errs.push(`${path}.family: missing`);
  if (!STATUSES.has(c.status as string)) errs.push(`${path}.status: '${String(c.status)}' is not an allowed status`);
  if (!Array.isArray(c.rejectionReasons) || !c.rejectionReasons.every((r) => typeof r === 'string')) errs.push(`${path}.rejectionReasons: not a string list`);
  if (c.status === 'qualified_paper_strategy' && Array.isArray(c.rejectionReasons) && c.rejectionReasons.length) errs.push(`${path}: qualified but has rejection reasons`);
  qualifiedEvidence(c, runGates, path, errs);
  window(c.train, `${path}.train`, errs);
  window(c.validation, `${path}.validation`, errs, true);
  window(c.test, `${path}.test`, errs, true);
}

export function validateSummary(x: unknown, now = Date.now(), bytes?: number): string[] {
  const errs: string[] = [];
  if (bytes !== undefined && bytes > MAX_FEED_BYTES) return [`payload ${bytes} bytes > ${MAX_FEED_BYTES}`];
  if (!isObj(x)) return ['not an object'];
  if (x.mode !== 'paper') errs.push(`mode '${String(x.mode)}' is not 'paper'`);
  const t = typeof x.generatedAt === 'string' ? Date.parse(x.generatedAt) : NaN;
  if (!Number.isFinite(t)) errs.push('generatedAt: invalid');
  else if (t < EARLIEST || t > now + 5 * 60_000) errs.push('generatedAt: outside plausible range (future or too old)');
  if (!Array.isArray(x.runs) || x.runs.length === 0 || x.runs.length > 20) errs.push('runs: must be 1–20 items');
  if (!Array.isArray(x.paper) || x.paper.length > 200) errs.push('paper: must be a list of ≤200');
  if (errs.length) return errs;
  (x.runs as unknown[]).forEach((r, i) => {
    const p = `runs[${i}]`;
    if (!isObj(r)) return void errs.push(`${p}: not an object`);
    if (typeof r.runId !== 'string') errs.push(`${p}.runId: missing`);
    const tot = r.totals;
    if (!isObj(tot) || !['markets', 'oosCandidates', 'qualified', 'rejected'].every((k) => int0(tot[k]))) errs.push(`${p}.totals: invalid counts`);
    if (!Array.isArray(r.markets) || r.markets.length > 200) return void errs.push(`${p}.markets: invalid`);
    let qualified = 0;
    r.markets.forEach((m: unknown, j: number) => {
      const mp = `${p}.markets[${j}]`;
      if (!isObj(m)) return void errs.push(`${mp}: not an object`);
      if (typeof m.symbol !== 'string' || !m.symbol) errs.push(`${mp}.symbol: missing`);
      if (!INTERVALS.has(m.intervalMs as number)) errs.push(`${mp}.intervalMs: unsupported`);
      if (!Array.isArray(m.candidates) || m.candidates.length > 500) return void errs.push(`${mp}.candidates: invalid`);
      m.candidates.forEach((c: unknown, k: number) => {
        candidate(c, `${mp}.candidates[${k}]`, errs, r.gates);
        if (isObj(c) && c.status === 'qualified_paper_strategy') qualified++;
      });
    });
    if (r.pooled !== undefined) {
      if (!Array.isArray(r.pooled) || r.pooled.length > 100) errs.push(`${p}.pooled: invalid`);
      else r.pooled.forEach((c: unknown, k: number) => {
        candidate(c, `${p}.pooled[${k}]`, errs, r.gates);
        if (isObj(c) && c.status === 'qualified_paper_strategy') qualified++;
      });
    }
    if (isObj(tot) && int0(tot.qualified) && tot.qualified !== qualified) errs.push(`${p}.totals.qualified (${String(tot.qualified)}) ≠ qualified candidates (${qualified})`);
  });
  (x.paper as unknown[]).forEach((a, i) => {
    if (!isObj(a)) return void errs.push(`paper[${i}]: not an object`);
    if (!fin(a.equity) || (a.equity as number) < 0) errs.push(`paper[${i}].equity: invalid`);
    if (!fin(a.netReturnPct)) errs.push(`paper[${i}].netReturnPct: invalid`);
    if (!int0(a.trades)) errs.push(`paper[${i}].trades: invalid`);
  });
  return errs.slice(0, 50);
}
