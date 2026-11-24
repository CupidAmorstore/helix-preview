// Core types for the HELIX Trading Bot (research + paper only).

/** One OHLCV bar. `t` is the bar OPEN time in ms UTC. */
export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

export type Venue = 'coinbase' | 'kraken' | 'gemini';

export type MarketRef = {
  venue: Venue;
  /** venue-native symbol, e.g. BTC-USD (Coinbase), XBTUSD (Kraken) */
  symbol: string;
  /** canonical base asset used for cross-venue / cross-chain de-duplication */
  base: string;
  quote: string;
};

export type Dataset = {
  id: string; // content hash
  market: MarketRef;
  intervalMs: number;
  candles: Candle[];
  fetchedAt: number;
  source: string;
};

/**
 * Desired exposure decided at the CLOSE of bar i, using only data <= i, given the current position.
 * 0 = cash, 1 = long. Execution happens at the OPEN of bar i+1 (never at the same bar's close).
 */
export type SignalFn = (i: number, position: 0 | 1) => 0 | 1;

export type StrategyFamily =
  | 'sma_cross'
  | 'donchian_breakout'
  | 'ts_momentum'
  | 'trend_filtered_momentum'
  | 'bollinger_reversion'
  | 'rsi_reversion'
  | 'vol_compression_breakout'
  | 'vol_filtered_trend'
  | 'regime_switch'
  // multi-day horizon (registered 2026-11-24 after research/cost-horizon-study.json): daily data only,
  // decisions only on calendar rebalance days so turnover stays far below the 1.3% round-trip cost
  | 'weekly_trend'
  | 'monthly_momentum';

export type StrategySpec = {
  family: StrategyFamily;
  params: Record<string, number>;
};

/** Research pipeline lifecycle. These statuses are never merged. */
export type CandidateStatus =
  | 'detected_opportunity'
  | 'research_hypothesis'
  | 'backtested_candidate'
  | 'rejected'
  | 'qualified_paper_strategy'
  | 'owner_approved_live_candidate'; // unreachable in code: requires owner action + live unlock

export type CostModel = {
  venue: Venue | 'dex';
  takerFeeBps: number;
  halfSpreadBps: number;
  slippageBps: number;
  /** fixed USD cost per fill (gas, etc.). 0 for CEX. */
  fixedCostUsd: number;
  /** smallest order notional the venue accepts, USD */
  minOrderUsd: number;
  /** where the numbers came from; every preset is an assumption until verified */
  provenance: string;
};

export type Trade = {
  entryT: number;
  exitT: number;
  entryPx: number;
  exitPx: number;
  notional: number;
  grossRet: number;
  netRet: number;
  costUsd: number;
  forcedExit: boolean;
};

export type BacktestResult = {
  trades: Trade[];
  grossReturn: number;
  netReturn: number;
  totalCostUsd: number;
  maxDrawdown: number;
  exposure: number; // fraction of bars in market
  bars: number;
  buyHoldReturn: number;
  rejectedOrders: number;
};
