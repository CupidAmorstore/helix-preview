// P0 unified execution engine (exec-v1). ONE execution contract shared by historical replay and forward paper
// trading. PAPER ONLY — there is no exchange adapter.
//
// Contract (explicit, versioned, part of every result):
//   * A decision is taken at the CLOSE of a COMPLETED bar i from data <= i.
//   * It fills on bar j = i + 1 + latencyBars at a declared PRICE PROXY:
//       - 'next_open'  : open of bar j. For 24/7 crypto the open of j is the first trade after close i, so this proxy
//                        is the price available `latencyBars` after the decision. It is a PROXY, not a quote: the
//                        result is labelled `priceSource: 'candle_proxy'`.
//       - 'next_close' : close of bar j (one full bar later — what a forward bot that acts only after the next bar
//                        completes would get). Used to isolate fill-timing effects.
//   * Missing data: if bar j's open time is not exactly decisionT + (1 + latencyBars) * intervalMs the order FAILS
//     (counted, logged). Prices are never forward-filled.
//   * Proportional cost (fee + half-spread + slippage) and the fixed cost per fill (gas) are applied on every fill.
//   * Orders below the venue minimum (or not covering 2x the fixed cost) are REJECTED, never resized up.
//   * Quantity precision: units are floored to `lotStepUnits` when given (remainder stays in cash / position).
//   * Liquidity: with `maxParticipation`, a fill is capped at participation x bar USD volume; the rest of an entry is
//     cancelled (partial fill), the rest of an exit stays pending and is retried on the next bar.
//   * Window end: 'liquidate' = forced exit at the last close with costs (flagged forcedExit); 'mark' = position left
//     open and reported as UNREALIZED. Natural exits and forced exits are always distinguished.
//   * Duplicate / out-of-order bars are ignored (idempotent), so a forward process can replay safely after a crash.
import type { Candle, CostModel, SignalFn, StrategySpec, Trade } from './types';
import { buildSignal } from './strategies';
import { sideCostFrac } from './costs';
import { exitProceeds } from './backtest';
import { assertPaperOnly } from './risk';

export const EXECUTION_CONTRACT_VERSION = 'exec-v1' as const;

/** Ledger reason for an entry blocked by a risk guard (experimental lane). Exits are never blocked. */
export const ENTRY_SUSPENDED_REASON = 'entries suspended by experimental drawdown guard';

export type ExecutionContract = {
  version: typeof EXECUTION_CONTRACT_VERSION;
  fill: 'next_open' | 'next_close';
  latencyBars: number;
  intervalMs: number;
  cost: CostModel;
  /** fraction of equity committed per entry */
  positionFraction: number;
  lotStepUnits?: number;
  /** max fraction of a bar's USD volume one fill may take (partial fills). Omit = unlimited (legacy). */
  maxParticipation?: number;
  terminal: 'liquidate' | 'mark';
  /** optional entry guard (risk control). Returning false blocks a NEW entry only; exits always proceed. */
  allowEntry?: (s: EngineState) => boolean;
};

export type LedgerEvent =
  | { kind: 'decision'; t: number; want: 0 | 1; execAt: number }
  | { kind: 'fill'; t: number; side: 'buy' | 'sell'; rawPx: number; fillPx: number; units: number; usd: number; costUsd: number; partial: boolean }
  | { kind: 'rejected'; t: number; side: 'buy' | 'sell'; reason: string }
  | { kind: 'failed'; t: number; side: 'buy' | 'sell'; reason: string }
  | { kind: 'forced_exit'; t: number; px: number; usd: number; costUsd: number };

type Pending = { execT: number; want: 0 | 1 };

/** Serializable engine state: a forward process persists this between runs (crash recovery). */
export type EngineState = {
  contractVersion: typeof EXECUTION_CONTRACT_VERSION;
  capitalUsd: number;
  cash: number;
  units: number;
  entry: { t: number; rawPx: number; fillPx: number; notional: number; costUsd: number } | null;
  pending: Pending[];
  lastT: number | null;
  lastClose: number | null;
  peak: number;
  maxDrawdown: number;
  barsMarked: number;
  barsInMarket: number;
  totalCostUsd: number;
  realizedPnlUsd: number;
  trades: Trade[];
  ledger: LedgerEvent[];
  rejected: number;
  failed: number;
  equity: { t: number; v: number }[];
};

export function initialState(capitalUsd: number): EngineState {
  return {
    contractVersion: EXECUTION_CONTRACT_VERSION,
    capitalUsd, cash: capitalUsd, units: 0, entry: null, pending: [], lastT: null, lastClose: null,
    peak: capitalUsd, maxDrawdown: 0, barsMarked: 0, barsInMarket: 0, totalCostUsd: 0, realizedPnlUsd: 0,
    trades: [], ledger: [], rejected: 0, failed: 0, equity: []
  };
}

const floorTo = (x: number, step?: number) => (step && step > 0 ? Math.floor(x / step + 1e-9) * step : x);

/**
 * Process ONE completed bar. `decide` is called at this bar's close with the projected position (position after
 * pending orders) and returns the desired exposure, or null when this bar is outside the decision window.
 * Returns false when the bar was a duplicate / out of order (ignored).
 */
export function stepBar(s: EngineState, k: Candle, c: ExecutionContract, decide: ((projected: 0 | 1) => 0 | 1) | null, mark: boolean): boolean {
  assertPaperOnly();
  if (s.lastT !== null && k.t <= s.lastT) return false;
  if (![k.o, k.h, k.l, k.c].every((x) => Number.isFinite(x) && x > 0)) throw new Error(`invalid candle at ${k.t}`);
  const side = sideCostFrac(c.cost);
  const fixed = c.cost.fixedCostUsd;
  // 1) fills due on this bar. A pending order whose fill bar is missing (gap) FAILS.
  const due = s.pending.filter((p) => p.execT <= k.t);
  s.pending = s.pending.filter((p) => p.execT > k.t);
  for (const p of due) {
    const sideName = p.want === 1 ? 'buy' : 'sell';
    if (p.execT !== k.t) {
      s.failed++;
      s.ledger.push({ kind: 'failed', t: k.t, side: sideName, reason: `fill bar ${new Date(p.execT).toISOString()} missing (data gap)` });
      continue;
    }
    const raw = c.fill === 'next_open' ? k.o : k.c;
    const capUsd = c.maxParticipation !== undefined ? c.maxParticipation * k.v * raw : Infinity;
    if (p.want === 1 && s.units === 0) {
      if (c.allowEntry && !c.allowEntry(s)) {
        s.rejected++;
        s.ledger.push({ kind: 'rejected', t: k.t, side: 'buy', reason: ENTRY_SUSPENDED_REASON });
        continue;
      }
      let notional = s.cash * c.positionFraction;
      let partial = false;
      if (notional > capUsd) { notional = capUsd; partial = true; }
      if (notional < c.cost.minOrderUsd || notional <= 2 * fixed) {
        s.rejected++;
        s.ledger.push({ kind: 'rejected', t: k.t, side: 'buy', reason: notional < c.cost.minOrderUsd ? `notional $${notional.toFixed(2)} < venue minimum $${c.cost.minOrderUsd}` : 'notional does not cover 2x fixed cost' });
        continue;
      }
      const fillPx = raw * (1 + side);
      const units = floorTo((notional - fixed) / fillPx, c.lotStepUnits);
      if (!(units > 0)) { s.rejected++; s.ledger.push({ kind: 'rejected', t: k.t, side: 'buy', reason: 'quantity rounds to zero at lot precision' }); continue; }
      const spent = units * fillPx + fixed;
      const costUsd = spent - units * raw;
      s.cash -= spent;
      s.units = units;
      s.totalCostUsd += costUsd;
      s.entry = { t: k.t, rawPx: raw, fillPx, notional: spent, costUsd };
      s.ledger.push({ kind: 'fill', t: k.t, side: 'buy', rawPx: raw, fillPx, units, usd: spent, costUsd, partial });
    } else if (p.want === 0 && s.units > 0 && s.entry) {
      let sellUnits = s.units;
      let partial = false;
      if (sellUnits * raw > capUsd) { sellUnits = floorTo(capUsd / raw, c.lotStepUnits); partial = true; }
      const fillPx = raw * (1 - side);
      const proceeds = exitProceeds(sellUnits * fillPx, fixed);
      const costUsd = sellUnits * raw - proceeds;
      s.totalCostUsd += costUsd;
      s.cash += proceeds;
      s.ledger.push({ kind: 'fill', t: k.t, side: 'sell', rawPx: raw, fillPx, units: sellUnits, usd: proceeds, costUsd, partial });
      const frac = sellUnits / s.units;
      const basis = s.entry.notional * frac;
      s.realizedPnlUsd += proceeds - basis;
      if (!partial) {
        s.trades.push({ entryT: s.entry.t, exitT: k.t, entryPx: s.entry.fillPx, exitPx: fillPx, notional: s.entry.notional, grossRet: raw / s.entry.rawPx - 1, netRet: proceeds / basis - 1, costUsd: s.entry.costUsd + costUsd, forcedExit: false });
        s.units = 0;
        s.entry = null;
      } else {
        s.units -= sellUnits;
        s.entry = { ...s.entry, notional: s.entry.notional - basis, costUsd: s.entry.costUsd * (1 - frac) };
        s.pending.unshift({ execT: k.t + c.intervalMs, want: 0 }); // remainder retried next bar
      }
    }
  }
  // 2) mark to the close
  if (mark) {
    const eq = s.cash + s.units * k.c;
    s.peak = Math.max(s.peak, eq);
    s.maxDrawdown = Math.max(s.maxDrawdown, s.peak > 0 ? (s.peak - eq) / s.peak : 0);
    s.barsMarked++;
    if (s.units > 0) s.barsInMarket++;
    s.equity.push({ t: k.t, v: eq });
  }
  // 3) decision at the close
  if (decide) {
    const projected: 0 | 1 = s.pending.length ? s.pending[s.pending.length - 1].want : s.units > 0 ? 1 : 0;
    const want = decide(projected);
    if (want !== projected) {
      const execT = k.t + (1 + c.latencyBars) * c.intervalMs;
      s.pending.push({ execT, want });
      s.ledger.push({ kind: 'decision', t: k.t, want, execAt: execT });
    }
  }
  s.lastT = k.t;
  s.lastClose = k.c;
  return true;
}

/** Close the window: forced liquidation (flagged) or leave open and report unrealized P&L. */
export function closeWindow(s: EngineState, c: ExecutionContract): { equity: number; unrealizedPnlUsd: number; openPosition: boolean } {
  s.pending = [];
  if (s.units > 0 && s.entry && s.lastClose !== null && s.lastT !== null) {
    if (c.terminal === 'liquidate') {
      const raw = s.lastClose;
      const fillPx = raw * (1 - sideCostFrac(c.cost));
      const proceeds = exitProceeds(s.units * fillPx, c.cost.fixedCostUsd);
      const costUsd = s.units * raw - proceeds;
      s.totalCostUsd += costUsd;
      s.cash += proceeds;
      s.realizedPnlUsd += proceeds - s.entry.notional;
      s.trades.push({ entryT: s.entry.t, exitT: s.lastT, entryPx: s.entry.fillPx, exitPx: fillPx, notional: s.entry.notional, grossRet: raw / s.entry.rawPx - 1, netRet: proceeds / s.entry.notional - 1, costUsd: s.entry.costUsd + costUsd, forcedExit: true });
      s.ledger.push({ kind: 'forced_exit', t: s.lastT, px: fillPx, usd: proceeds, costUsd });
      s.units = 0;
      s.entry = null;
      s.peak = Math.max(s.peak, s.cash);
      s.maxDrawdown = Math.max(s.maxDrawdown, s.peak > 0 ? (s.peak - s.cash) / s.peak : 0);
      if (s.equity.length) s.equity[s.equity.length - 1] = { t: s.equity[s.equity.length - 1].t, v: s.cash };
    } else {
      const mv = s.units * s.lastClose;
      return { equity: s.cash + mv, unrealizedPnlUsd: mv - s.entry.notional, openPosition: true };
    }
  }
  return { equity: s.cash, unrealizedPnlUsd: 0, openPosition: false };
}

export type ExecutionResult = {
  contract: ExecutionContract;
  priceSource: 'candle_proxy';
  trades: Trade[];
  naturalExits: number;
  forcedExits: number;
  netReturn: number;
  grossReturn: number;
  realizedPnlUsd: number;
  unrealizedPnlUsd: number;
  openPositionAtEnd: boolean;
  totalCostUsd: number;
  maxDrawdown: number;
  exposure: number;
  rejectedOrders: number;
  failedOrders: number;
  ledger: LedgerEvent[];
  equity: { t: number; v: number }[];
};

export function summarize(s: EngineState, c: ExecutionContract, close: ReturnType<typeof closeWindow>): ExecutionResult {
  const forced = s.trades.filter((t) => t.forcedExit).length;
  return {
    contract: c,
    priceSource: 'candle_proxy',
    trades: s.trades,
    naturalExits: s.trades.length - forced,
    forcedExits: forced,
    netReturn: close.equity / s.capitalUsd - 1,
    grossReturn: s.trades.reduce((a, t) => a * (1 + t.grossRet * c.positionFraction), 1) - 1,
    realizedPnlUsd: s.realizedPnlUsd,
    unrealizedPnlUsd: close.unrealizedPnlUsd,
    openPositionAtEnd: close.openPosition,
    totalCostUsd: s.totalCostUsd,
    maxDrawdown: s.maxDrawdown,
    exposure: s.barsMarked ? s.barsInMarket / s.barsMarked : 0,
    rejectedOrders: s.rejected,
    failedOrders: s.failed,
    ledger: s.ledger,
    equity: s.equity
  };
}

/**
 * Batch replay over candles[0..end) with decisions from bar `start`. The signal is evaluated on EVERY bar so
 * stateful signals stay in sync (same as the legacy engine); only decisions with i >= start are acted on.
 */
export function replay(candles: Candle[], signal: SignalFn | StrategySpec, c: ExecutionContract, start: number, end = candles.length, capitalUsd = 1000): ExecutionResult {
  const sig: SignalFn = typeof signal === 'function' ? signal : buildSignal(signal, candles);
  const s = initialState(capitalUsd);
  const stop = Math.min(end, candles.length);
  for (let i = 0; i < stop; i++) runBar(s, candles, i, sig, c, start, stop);
  return summarize(s, c, closeWindow(s, c));
}

/** One bar of a replay; exported so a forward process can drive bars incrementally with persisted state. */
export function runBar(s: EngineState, candles: Candle[], i: number, sig: SignalFn, c: ExecutionContract, start: number, stop: number): boolean {
  const lastFillable = (i + 1 + c.latencyBars) < stop; // orders that cannot fill inside the window are not placed
  return stepBar(s, candles[i], c, (projected) => {
    const want = sig(i, projected);
    return i >= start && lastFillable ? want : projected;
  }, i >= start);
}

export function contractFor(cost: CostModel, intervalMs: number, over: Partial<ExecutionContract> = {}): ExecutionContract {
  return { version: EXECUTION_CONTRACT_VERSION, fill: 'next_open', latencyBars: 0, intervalMs, cost, positionFraction: 1, terminal: 'liquidate', ...over };
}
