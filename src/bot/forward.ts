// Forward paper-trading protocol (section 6 study 7). The only route to fresh evidence once the stored history is
// inspected (provenance blocks it). PAPER ONLY.
//
// - Rules are pre-registered with fixed parameters BEFORE the start date. The registration is content-hashed;
//   any change to a rule produces a different hash and must be a NEW registration with a new start date (the
//   clock restarts). The evaluator refuses a registration whose stored hash does not match its rules.
// - A registration does nothing until the owner sets status 'active' and a startAt (owner decision).
// - Only bars whose open time is >= startAt are traded; indicators may use earlier bars (past data).
// - Evaluation: gates-v3 monthly inference on COMPLETE forward calendar months only (P0 fix: the partial first and
//   in-progress last month are never counted as evidence), Bonferroni over the registered rules, >= minMonths.
// P0 (exec-v1): pooled rules run on the unified execution engine. Orders whose fill bar is missing FAIL instead of
// filling across a gap; open positions are reported as UNREALIZED (not force-liquidated at every evaluation);
// stale or gapped data refuses evaluation; the cost VALUES are bound to the registration via `costSnapshot`.
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import type { Candle, CostModel, StrategyFamily } from './types';
import { simulateXs, type XsParams } from './crossSectional';
import { completeMonthlyReturns, monthlyInference, type Inference } from './stats';
import { assertPaperOnly } from './risk';
import { buildSignal, dependencyHorizon } from './strategies';
import { closeWindow, contractFor, initialState, runBar, summarize, type LedgerEvent } from './execution';
import { EXPERIMENTAL_POLICY, runExperimentalAccount } from './experimental';

export type ForwardRule =
  | { id: string; kind: 'pooled'; family: StrategyFamily; params: Record<string, number>; markets: string[]; intervalMs: number }
  | { id: string; kind: 'xs'; params: XsParams; markets: string[]; intervalMs: number };

export type CostSnapshot = Pick<CostModel, 'takerFeeBps' | 'halfSpreadBps' | 'slippageBps' | 'fixedCostUsd' | 'minOrderUsd'>;

export type ForwardRegistration = {
  id: string;
  status: 'proposed' | 'active' | 'stopped';
  registeredAt: string;
  /** epoch ms; required when active. Bars opening before it are never traded. */
  startAt: number | null;
  capitalUsd: number;
  costPreset: string;
  rules: ForwardRule[];
  evaluation: { minMonths: number; familyAlpha: number };
  rulesHash: string;
  rationale: string[];
  disclosures: string[];
  /** P0: the exact cost values frozen with the experiment. The preset NAME alone does not bind its values. */
  costSnapshot?: CostSnapshot;
  /** hashVersion 2 also covers costSnapshot; 3 also covers id, timestamps and the experimental policy */
  hashVersion?: 2 | 3;
  /** experimental lane (hashVersion 3 only): one hypothesis per account, 5% per position, drawdown guard */
  policy?: { version: 'experimental-v1'; positionFraction: number; maxDrawdown: number };
};

const canonical = (x: unknown): string =>
  Array.isArray(x) ? `[${x.map(canonical).join(',')}]`
  : x && typeof x === 'object' ? `{${Object.keys(x as object).sort().map((k) => `${JSON.stringify(k)}:${canonical((x as Record<string, unknown>)[k])}`).join(',')}}`
  : JSON.stringify(x);

export type RegistrationHashInput = Pick<ForwardRegistration, 'rules' | 'capitalUsd' | 'costPreset' | 'evaluation'> &
  Partial<Pick<ForwardRegistration, 'id' | 'registeredAt' | 'startAt' | 'costSnapshot' | 'hashVersion' | 'policy'>>;

/**
 * Hash over everything that defines the experiment.
 * v1 (no hashVersion): rules, capital, cost preset, evaluation. Registration a.
 * v2: also the cost VALUES. Registration b. Unchanged, so both keep their recorded hashes.
 * v3 (P0 2026-11-27): also id, registeredAt, startAt and the experimental policy. Without startAt in the hash a start
 * date could be moved after registration without changing the hash; v3 closes that gap for new registrations.
 */
export function registrationHash(r: RegistrationHashInput): string {
  const body: Record<string, unknown> = { rules: r.rules, capitalUsd: r.capitalUsd, costPreset: r.costPreset, evaluation: r.evaluation };
  if (r.hashVersion === 2) body.costSnapshot = r.costSnapshot ?? null;
  if (r.hashVersion === 3) Object.assign(body, { id: r.id ?? null, registeredAt: r.registeredAt ?? null, startAt: r.startAt ?? null, costSnapshot: r.costSnapshot ?? null, policy: r.policy ?? null });
  return bytesToHex(sha256(utf8ToBytes(canonical(body))));
}

const DAY_MS = 86_400_000;

export const snapshotOf = (c: CostModel): CostSnapshot => ({ takerFeeBps: c.takerFeeBps, halfSpreadBps: c.halfSpreadBps, slippageBps: c.slippageBps, fixedCostUsd: c.fixedCostUsd, minOrderUsd: c.minOrderUsd });

export type ForwardRuleResult = {
  ruleId: string;
  /** complete calendar months of forward evidence */
  forwardMonths: number;
  netReturn: number;
  realizedPnlUsd?: number;
  unrealizedPnlUsd?: number;
  totalCostUsd?: number;
  fills?: number;
  /** experimental lane only */
  experimental?: { policy: string; suspendedAt: number | null; suspendedBars: number; entriesRejectedBySuspension: number; doubleCostNetReturn: number; doubleCostDeltaPctPoints: number; openPositionAtEnd: boolean };
  failedOrders?: number;
  rejectedOrders?: number;
  maxDrawdown?: number;
  equity: { t: number; v: number }[];
  ledger?: { market: string; events: LedgerEvent[] }[];
  inference: Inference;
  status: 'collecting' | 'rejected' | 'forward_qualified';
};

export type ForwardReport = { registrationId: string; evaluatedAt: number; state: string; results: ForwardRuleResult[]; problems: string[]; warnings?: string[] };

/** Identity of a registration as first seen by the forward runner, stored in its append-only ledger. */
export type RegistrationPin = { rulesHash: string; startAt: number | null; registeredAt: string; pinnedAt: string };

/**
 * External integrity anchor (P0 Phase III). `rulesHash` only proves a registration is consistent with ITSELF: an edit
 * that also rewrites `rulesHash` passes `evaluateForward`. The ledger lives on the forward-ledger branch, which only the
 * daily job writes, so the identity pinned there on first evaluation cannot be changed by editing the registration.
 * The pin also covers `startAt` and `registeredAt`, which hash v1/v2 (registrations a and b) do not commit to.
 * Legacy ledgers without a pin are pinned on their next run (trust on first use, disclosed as a warning).
 */
export function checkRegistrationPin(
  reg: Pick<ForwardRegistration, 'rulesHash' | 'startAt' | 'registeredAt'>,
  pin: RegistrationPin | undefined,
  nowIso: string
): { pin: RegistrationPin; problems: string[]; warnings: string[] } {
  const current = { rulesHash: reg.rulesHash, startAt: reg.startAt ?? null, registeredAt: reg.registeredAt };
  if (!pin) return { pin: { ...current, pinnedAt: nowIso }, problems: [], warnings: ['registration identity pinned now (first evaluation with pinning; earlier runs were not pinned)'] };
  const changed = (Object.keys(current) as (keyof typeof current)[]).filter((k) => pin[k] !== current[k]);
  if (!changed.length) return { pin, problems: [], warnings: [] };
  return {
    pin,
    problems: [`registration changed after it was pinned (${changed.join(', ')}): a changed experiment is a NEW registration — stored ledger kept, nothing evaluated`],
    warnings: []
  };
}

/** Data checks for one market inside the forward window: completed bars only, no gaps, not stale. */
export function forwardDataProblems(market: string, candles: Candle[], intervalMs: number, fromMs: number, nowMs: number, maxStaleBars = 2): string[] {
  const p: string[] = [];
  const done = candles.filter((k) => k.t + intervalMs <= nowMs);
  if (!done.length) return [`${market}: no completed bars`];
  for (let i = 1; i < done.length; i++) {
    if (done[i].t <= done[i - 1].t) { p.push(`${market}: duplicate/out-of-order bar at ${new Date(done[i].t).toISOString()}`); break; }
    if (done[i].t >= fromMs && done[i].t - done[i - 1].t !== intervalMs) { p.push(`${market}: data gap before ${new Date(done[i].t).toISOString()} inside the forward window (never forward-filled)`); break; }
  }
  const lastEnd = done[done.length - 1].t + intervalMs;
  if (nowMs - lastEnd > maxStaleBars * intervalMs) p.push(`${market}: data stale — last completed bar ended ${new Date(lastEnd).toISOString()}`);
  return p;
}

/** One experimental account: one hypothesis, one market, its own $1,000 sleeve, full exec-v1 accounting. */
function evaluateExperimentalRule(
  reg: ForwardRegistration,
  rule: Extract<ForwardRule, { kind: 'pooled' }>,
  data: Record<string, Candle[]>,
  cost: CostModel,
  start: number,
  nowMs: number,
  alpha: number
): ForwardRuleResult {
  const market = rule.markets[0];
  const candles = (data[market] ?? []).filter((k) => k.t + rule.intervalMs <= nowMs);
  const startIndex = candles.findIndex((k) => k.t >= start);
  const args = { candles, spec: { family: rule.family, params: rule.params }, cost, intervalMs: rule.intervalMs, startIndex: startIndex < 0 ? candles.length : startIndex, capitalUsd: reg.capitalUsd };
  const run = runExperimentalAccount(args);
  const doubled = runExperimentalAccount({ ...args, costMultiplier: 2 });
  const equity = run.result.equity.filter((p) => p.t >= start);
  const lastBarEnd = equity.length ? equity[equity.length - 1].t + rule.intervalMs : start;
  const months = completeMonthlyReturns(equity, reg.capitalUsd, start, lastBarEnd);
  const inference = monthlyInference(months.map((m) => m.ret), alpha, reg.evaluation.minMonths);
  const status = months.length < reg.evaluation.minMonths ? 'collecting' : inference.pass ? 'forward_qualified' : 'rejected';
  let peak = reg.capitalUsd;
  let dd = 0;
  for (const p of equity) {
    peak = Math.max(peak, p.v);
    dd = Math.max(dd, (peak - p.v) / peak);
  }
  return {
    ruleId: rule.id,
    forwardMonths: months.length,
    netReturn: run.result.netReturn,
    realizedPnlUsd: run.result.realizedPnlUsd,
    unrealizedPnlUsd: run.result.unrealizedPnlUsd,
    totalCostUsd: run.result.totalCostUsd,
    fills: run.result.ledger.filter((e) => e.kind === 'fill').length,
    failedOrders: run.result.failedOrders,
    rejectedOrders: run.result.rejectedOrders,
    maxDrawdown: dd,
    equity,
    inference,
    status,
    ledger: [{ market, events: run.result.ledger.filter((e) => e.t >= start) }],
    experimental: {
      policy: EXPERIMENTAL_POLICY.version,
      suspendedAt: run.suspendedAt,
      suspendedBars: run.suspendedBars,
      entriesRejectedBySuspension: run.entriesRejectedBySuspension,
      doubleCostNetReturn: doubled.result.netReturn,
      doubleCostDeltaPctPoints: (doubled.result.netReturn - run.result.netReturn) * 100,
      openPositionAtEnd: run.result.openPositionAtEnd
    }
  };
}

export function evaluateForward(reg: ForwardRegistration, data: Record<string, Candle[]>, cost: CostModel, nowMs: number): ForwardReport {
  assertPaperOnly();
  const problems: string[] = [];
  const warnings: string[] = [];
  if (registrationHash(reg) !== reg.rulesHash) problems.push('registration hash mismatch: rules changed after registration — create a new registration (clock restarts)');
  if (reg.status !== 'active') problems.push(`registration is '${reg.status}': nothing is traded until the owner activates it`);
  if (reg.status === 'active' && !(reg.startAt && reg.startAt > Date.parse(reg.registeredAt))) problems.push('startAt must be after registeredAt');
  if (reg.costSnapshot) {
    const now = snapshotOf(cost);
    const drift = (Object.keys(reg.costSnapshot) as (keyof CostSnapshot)[]).filter((k) => reg.costSnapshot![k] !== now[k]);
    if (drift.length) problems.push(`cost values differ from the registered snapshot (${drift.join(', ')}): a cost change is a new registration`);
  } else warnings.push('legacy registration: cost values are not frozen (costSnapshot missing)');
  if (reg.policy) {
    if (reg.hashVersion !== 3) problems.push('experimental policy requires hashVersion 3');
    if (reg.policy.version !== EXPERIMENTAL_POLICY.version || reg.policy.positionFraction !== EXPERIMENTAL_POLICY.positionFraction || reg.policy.maxDrawdown !== EXPERIMENTAL_POLICY.maxDrawdown) problems.push('experimental policy values differ from experimental-v1');
    if (reg.rules.some((r) => r.kind !== 'pooled' || r.markets.length !== 1)) problems.push('an experimental account holds exactly one pooled hypothesis on one market');
  }
  if (problems.length) return { registrationId: reg.id, evaluatedAt: nowMs, state: 'not running', results: [], problems, warnings };
  const start = reg.startAt!;
  // data integrity: only checked once at least one forward bar can be complete
  for (const rule of reg.rules) {
    if (nowMs < start + rule.intervalMs) continue;
    for (const m of rule.markets) problems.push(...forwardDataProblems(m, data[m] ?? [], rule.intervalMs, start, nowMs));
  }
  if (problems.length) return { registrationId: reg.id, evaluatedAt: nowMs, state: 'evaluation refused: data problems', results: [], problems: [...new Set(problems)], warnings };

  const alpha = reg.evaluation.familyAlpha / Math.max(1, reg.rules.length);
  const results = reg.rules.map((rule): ForwardRuleResult => {
    if (reg.policy && rule.kind === 'pooled') return evaluateExperimentalRule(reg, rule, data, cost, start, nowMs, alpha);
    const series = rule.markets.map((m) => ({ symbol: m, candles: (data[m] ?? []).filter((k) => k.t + rule.intervalMs <= nowMs) }));
    const sleeve = reg.capitalUsd / series.length;
    let equity: { t: number; v: number }[] = [];
    let extra: Partial<ForwardRuleResult> = {};
    let lastBarEnd = start;
    if (rule.kind === 'xs') {
      const w = simulateXs(series, rule.params, start, nowMs + DAY_MS, cost, 0, reg.capitalUsd, { terminal: 'mark' });
      equity = w.equity;
      extra = { rejectedOrders: w.rejectedOrders };
      warnings.push(`${rule.id}: cross-sectional rule uses its own event-driven portfolio simulator (mark mode, same fill rules), not exec-v1`);
      lastBarEnd = Math.max(start, ...series.map((s) => (s.candles.length ? s.candles[s.candles.length - 1].t + rule.intervalMs : start)));
    } else {
      const contract = contractFor(cost, rule.intervalMs, { terminal: 'mark' });
      const per = series.map((s) => {
        const i0 = s.candles.findIndex((k) => k.t >= start);
        if (i0 < 0) return null;
        // the signal needs its full dependency horizon of contiguous history before the first forward decision
        if (i0 < dependencyHorizon({ family: rule.family, params: rule.params })) warnings.push(`${rule.id}/${s.symbol}: less than one dependency horizon of history before startAt`);
        const sig = buildSignal({ family: rule.family, params: rule.params }, s.candles);
        const st = initialState(sleeve);
        for (let i = 0; i < s.candles.length; i++) runBar(st, s.candles, i, sig, contract, i0, Infinity);
        return { symbol: s.symbol, r: summarize(st, contract, closeWindow(st, contract)) };
      });
      const ok = per.filter((x): x is NonNullable<typeof x> => x !== null);
      const ts = [...new Set(ok.flatMap((p) => p.r.equity.map((e) => e.t)))].sort((a, b) => a - b);
      const idx = ok.map(() => 0);
      const last = series.map(() => sleeve);
      equity = ts.map((t) => {
        ok.forEach((p, k) => { const c = p.r.equity; while (idx[k] < c.length && c[idx[k]].t <= t) last[series.findIndex((s) => s.symbol === p.symbol)] = c[idx[k]++].v; });
        return { t, v: last.reduce((a, b) => a + b, 0) };
      });
      extra = {
        realizedPnlUsd: ok.reduce((a, p) => a + p.r.realizedPnlUsd, 0),
        unrealizedPnlUsd: ok.reduce((a, p) => a + p.r.unrealizedPnlUsd, 0),
        totalCostUsd: ok.reduce((a, p) => a + p.r.totalCostUsd, 0),
        fills: ok.reduce((a, p) => a + p.r.ledger.filter((e) => e.kind === 'fill').length, 0),
        failedOrders: ok.reduce((a, p) => a + p.r.failedOrders, 0),
        rejectedOrders: ok.reduce((a, p) => a + p.r.rejectedOrders, 0),
        ledger: ok.map((p) => ({ market: p.symbol, events: p.r.ledger.filter((e) => e.t >= start) }))
      };
      if (ts.length) lastBarEnd = ts[ts.length - 1] + rule.intervalMs;
    }
    const fwd = equity.filter((p) => p.t >= start);
    const months = completeMonthlyReturns(fwd, reg.capitalUsd, start, lastBarEnd);
    const inference = monthlyInference(months.map((m) => m.ret), alpha, reg.evaluation.minMonths);
    const status = months.length < reg.evaluation.minMonths ? 'collecting' : inference.pass ? 'forward_qualified' : 'rejected';
    let peak = reg.capitalUsd; let dd = 0;
    for (const p of fwd) { peak = Math.max(peak, p.v); dd = Math.max(dd, (peak - p.v) / peak); }
    return { ruleId: rule.id, forwardMonths: months.length, netReturn: fwd.length ? fwd[fwd.length - 1].v / reg.capitalUsd - 1 : 0, maxDrawdown: dd, equity: fwd, inference, status, ...extra };
  });
  return { registrationId: reg.id, evaluatedAt: nowMs, state: 'running', results, problems, warnings };
}
