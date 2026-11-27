// Forward paper-trading protocol (section 6 study 7). The only route to fresh evidence once the stored history is
// inspected (provenance blocks it). PAPER ONLY.
//
// - Rules are pre-registered with fixed parameters BEFORE the start date. The registration is content-hashed;
//   any change to a rule produces a different hash and must be a NEW registration with a new start date (the
//   clock restarts). The evaluator refuses a registration whose stored hash does not match its rules.
// - A registration does nothing until the owner sets status 'active' and a startAt (owner decision).
// - Only bars whose open time is >= startAt are traded; indicators may use earlier bars (past data).
// - Evaluation: gates-v3 monthly inference on forward months only, Bonferroni over the registered rules,
//   >= minMonths forward months. Nothing is "qualified" before that.
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import type { Candle, CostModel, StrategyFamily } from './types';
import { backtest } from './backtest';
import { simulateXs, type XsParams } from './crossSectional';
import { monthlyInference, monthlyReturns, type Inference } from './stats';
import { assertPaperOnly } from './risk';

export type ForwardRule =
  | { id: string; kind: 'pooled'; family: StrategyFamily; params: Record<string, number>; markets: string[]; intervalMs: number }
  | { id: string; kind: 'xs'; params: XsParams; markets: string[]; intervalMs: number };

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
};

const canonical = (x: unknown): string =>
  Array.isArray(x) ? `[${x.map(canonical).join(',')}]`
  : x && typeof x === 'object' ? `{${Object.keys(x as object).sort().map((k) => `${JSON.stringify(k)}:${canonical((x as Record<string, unknown>)[k])}`).join(',')}}`
  : JSON.stringify(x);

/** Hash over everything that defines the experiment (rules, capital, costs, evaluation). */
export function registrationHash(r: Pick<ForwardRegistration, 'rules' | 'capitalUsd' | 'costPreset' | 'evaluation'>): string {
  return bytesToHex(sha256(utf8ToBytes(canonical({ rules: r.rules, capitalUsd: r.capitalUsd, costPreset: r.costPreset, evaluation: r.evaluation }))));
}

export type ForwardRuleResult = {
  ruleId: string;
  forwardMonths: number;
  netReturn: number;
  equity: { t: number; v: number }[];
  inference: Inference;
  status: 'collecting' | 'rejected' | 'forward_qualified';
};

export type ForwardReport = { registrationId: string; evaluatedAt: number; state: string; results: ForwardRuleResult[]; problems: string[] };

export function evaluateForward(reg: ForwardRegistration, data: Record<string, Candle[]>, cost: CostModel, nowMs: number): ForwardReport {
  assertPaperOnly();
  const problems: string[] = [];
  if (registrationHash(reg) !== reg.rulesHash) problems.push('registration hash mismatch: rules changed after registration — create a new registration (clock restarts)');
  if (reg.status !== 'active') problems.push(`registration is '${reg.status}': nothing is traded until the owner activates it`);
  if (reg.status === 'active' && !(reg.startAt && reg.startAt > Date.parse(reg.registeredAt))) problems.push('startAt must be after registeredAt');
  if (problems.length) return { registrationId: reg.id, evaluatedAt: nowMs, state: 'not running', results: [], problems };
  const start = reg.startAt!;
  const alpha = reg.evaluation.familyAlpha / Math.max(1, reg.rules.length);
  const results = reg.rules.map((rule): ForwardRuleResult => {
    const series = rule.markets.map((m) => ({ symbol: m, candles: (data[m] ?? []).filter((k) => k.t + rule.intervalMs <= nowMs) }));
    let equity: { t: number; v: number }[] = [];
    if (rule.kind === 'xs') {
      const w = simulateXs(series, rule.params, start, nowMs, cost, 0, reg.capitalUsd);
      equity = w.equity;
    } else {
      const per = series.map((s) => {
        const i0 = s.candles.findIndex((k) => k.t >= start);
        if (i0 < 0) return [];
        const r = backtest(s.candles, { family: rule.family, params: rule.params }, { start: i0, end: s.candles.length, cost, capitalUsd: reg.capitalUsd / series.length, recordEquity: true });
        return r.equity ?? [];
      });
      const ts = [...new Set(per.flat().map((p) => p.t))].sort((a, b) => a - b);
      const idx = per.map(() => 0);
      const last = per.map(() => reg.capitalUsd / series.length);
      equity = ts.map((t) => {
        per.forEach((c, k) => { while (idx[k] < c.length && c[idx[k]].t <= t) last[k] = c[idx[k]++].v; });
        return { t, v: last.reduce((a, b) => a + b, 0) };
      });
    }
    const months = monthlyReturns(equity.filter((p) => p.t >= start), reg.capitalUsd);
    const inference = monthlyInference(months.map((m) => m.ret), alpha, reg.evaluation.minMonths);
    const status = months.length < reg.evaluation.minMonths ? 'collecting' : inference.pass ? 'forward_qualified' : 'rejected';
    return { ruleId: rule.id, forwardMonths: months.length, netReturn: equity.length ? equity[equity.length - 1].v / reg.capitalUsd - 1 : 0, equity, inference, status };
  });
  return { registrationId: reg.id, evaluatedAt: nowMs, state: 'running', results, problems };
}
