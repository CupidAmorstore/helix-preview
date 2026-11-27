// P0 experimental paper lane ("experimental-v1"). PAPER ONLY. One hypothesis per account; each account is a separate
// simulated $1,000 with its own ledger. Final qualification gates are NOT changed by this module: an experimental
// account can only be approved for paper observation, never qualified.
//
// Safeguards (all enforced in code and covered by tests):
//   * position size: at most 5% of account equity per position (positionFraction 0.05);
//   * one position per account, long only, no leverage, no averaging down (the engine only buys when flat);
//   * drawdown guard: once account drawdown from peak reaches 5% the guard LATCHES and blocks NEW entries until a
//     human resets it; existing positions keep their exits (the guard never blocks a sell);
//   * fills use the shared exec-v1 contract: next-open proxy, fee + half-spread + slippage on every fill;
//   * double-cost sensitivity is always computed alongside the base run.
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import {
  closeWindow,
  contractFor,
  ENTRY_SUSPENDED_REASON,
  initialState,
  stepBar,
  summarize,
  type EngineState,
  type ExecutionContract,
  type ExecutionResult,
  type LedgerEvent
} from './execution';
import { buildSignal } from './strategies';
import { scaleCosts } from './costs';
import { assertPaperOnly } from './risk';
import type { Candle, CostModel, SignalFn, StrategySpec } from './types';

export const EXPERIMENTAL_POLICY = {
  version: 'experimental-v1',
  positionFraction: 0.05,
  maxDrawdown: 0.05,
  leverage: 1,
  averaging: false,
  maxPositionsPerAccount: 1
} as const;

/** Drawdown of marked equity (cash + open position at the last close) from the running peak. */
export function drawdownOf(s: EngineState): number {
  const equity = s.cash + s.units * (s.lastClose ?? 0);
  return s.peak > 0 ? Math.max(0, (s.peak - equity) / s.peak) : 0;
}

/** Latched guard: once tripped it stays tripped until a human reset (never auto-resumes). */
export function nextLatch(latched: boolean, s: EngineState): boolean {
  return latched || drawdownOf(s) >= EXPERIMENTAL_POLICY.maxDrawdown;
}

export type ExperimentalRunArgs = {
  candles: Candle[];
  spec?: StrategySpec;
  /** test hook: custom signal instead of a registered family */
  signal?: SignalFn;
  cost: CostModel;
  intervalMs: number;
  /** index of the first bar whose decisions may trade and whose equity is recorded */
  startIndex: number;
  capitalUsd: number;
  /** 1 = as configured; 2 = double-cost sensitivity */
  costMultiplier?: number;
};

export type ExperimentalRun = {
  result: ExecutionResult;
  state: EngineState;
  suspendedAt: number | null;
  suspendedBars: number;
  entriesRejectedBySuspension: number;
  costUsed: CostModel;
};

export function runExperimentalAccount(a: ExperimentalRunArgs): ExperimentalRun {
  assertPaperOnly();
  if (!(a.capitalUsd > 0)) throw new Error('capital must be positive');
  const cost = a.costMultiplier && a.costMultiplier !== 1 ? scaleCosts(a.cost, a.costMultiplier) : a.cost;
  const k = a.candles;
  const sig = a.signal ?? buildSignal(a.spec!, k);
  let latched = false;
  let suspendedAt: number | null = null;
  let suspendedBars = 0;
  const c: ExecutionContract = contractFor(cost, a.intervalMs, {
    terminal: 'mark',
    positionFraction: EXPERIMENTAL_POLICY.positionFraction,
    allowEntry: () => !latched
  });
  const s = initialState(a.capitalUsd);
  for (let i = 0; i < k.length; i++) {
    const lastFillable = i + 1 + c.latencyBars < k.length;
    stepBar(
      s,
      k[i],
      c,
      (projected) => {
        // the signal is evaluated on every bar so stateful signals stay in sync with the position they see
        const want = sig(i, projected);
        if (i < a.startIndex || !lastFillable) return projected;
        if (want === 1 && projected === 0 && latched) return 0; // no new entry while the guard is latched
        return want;
      },
      i >= a.startIndex
    );
    if (i >= a.startIndex) {
      if (!latched && nextLatch(latched, s)) {
        latched = true;
        suspendedAt = k[i].t;
      }
      if (latched) suspendedBars++;
    }
  }
  const close = closeWindow(s, c);
  const result = summarize(s, c, close);
  return {
    result,
    state: s,
    suspendedAt,
    suspendedBars,
    entriesRejectedBySuspension: result.ledger.filter((e) => e.kind === 'rejected' && e.reason === ENTRY_SUSPENDED_REASON).length,
    costUsed: cost
  };
}

/** Net return at the configured costs and at double costs, reported side by side. */
export function doubleCostSensitivity(a: ExperimentalRunArgs): { netReturn: number; doubleCostNetReturn: number; deltaPctPoints: number } {
  const base = runExperimentalAccount(a).result.netReturn;
  const doubled = runExperimentalAccount({ ...a, costMultiplier: 2 }).result.netReturn;
  return { netReturn: base, doubleCostNetReturn: doubled, deltaPctPoints: (doubled - base) * 100 };
}

// ---------------------------------------------------------------------------------------------- persistence

export type AccountSnapshot = {
  schema: 'experimental-account-v1';
  registrationId: string;
  registrationHash: string;
  policy: typeof EXPERIMENTAL_POLICY;
  costUsed: CostModel;
  asOfT: number | null;
  barsProcessed: number;
  suspendedAt: number | null;
  netReturn: number;
  realizedPnlUsd: number;
  unrealizedPnlUsd: number;
  totalCostUsd: number;
  fills: number;
  ledger: LedgerEvent[];
  /** SHA-256 over the stable serialisation of every field above */
  digest: string;
};

/** Key-sorted JSON so the digest does not depend on property order. */
export function stableStringify(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(stableStringify).join(',')}]`;
  if (x && typeof x === 'object') return `{${Object.keys(x).sort().map((k) => `${JSON.stringify(k)}:${stableStringify((x as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(x ?? null);
}

const digestOf = (body: Omit<AccountSnapshot, 'digest'>): string => bytesToHex(sha256(utf8ToBytes(stableStringify(body))));

export function snapshotOf(run: ExperimentalRun, meta: { registrationId: string; registrationHash: string; candles: Candle[] }): AccountSnapshot {
  const last = meta.candles.length ? meta.candles[meta.candles.length - 1].t : null;
  const body: Omit<AccountSnapshot, 'digest'> = {
    schema: 'experimental-account-v1',
    registrationId: meta.registrationId,
    registrationHash: meta.registrationHash,
    policy: EXPERIMENTAL_POLICY,
    costUsed: run.costUsed,
    asOfT: last,
    barsProcessed: meta.candles.length,
    suspendedAt: run.suspendedAt,
    netReturn: run.result.netReturn,
    realizedPnlUsd: run.result.realizedPnlUsd,
    unrealizedPnlUsd: run.result.unrealizedPnlUsd,
    totalCostUsd: run.result.totalCostUsd,
    fills: run.result.ledger.filter((e) => e.kind === 'fill').length,
    ledger: run.result.ledger
  };
  return { ...body, digest: digestOf(body) };
}

export function verifySnapshot(snap: AccountSnapshot): boolean {
  const { digest, ...body } = snap;
  return digest === digestOf(body);
}

/**
 * A later snapshot must extend an earlier one: same registration, valid digests, and the earlier ledger is an exact
 * prefix of the later ledger. A restart that recomputes the account from data must pass this check.
 */
export function verifyContinuation(prev: AccountSnapshot, next: AccountSnapshot): { ok: true } | { ok: false; reason: string } {
  if (!verifySnapshot(prev)) return { ok: false, reason: 'previous snapshot digest invalid (tampered or corrupt)' };
  if (!verifySnapshot(next)) return { ok: false, reason: 'new snapshot digest invalid' };
  if (prev.registrationHash !== next.registrationHash) return { ok: false, reason: 'registration hash changed' };
  if ((next.asOfT ?? -Infinity) < (prev.asOfT ?? -Infinity)) return { ok: false, reason: 'time went backwards' };
  if (next.ledger.length < prev.ledger.length) return { ok: false, reason: 'ledger shrank' };
  for (let i = 0; i < prev.ledger.length; i++) {
    if (stableStringify(prev.ledger[i]) !== stableStringify(next.ledger[i])) return { ok: false, reason: `ledger event ${i} rewritten` };
  }
  return { ok: true };
}
