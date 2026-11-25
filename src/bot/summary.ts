// Shape of src/bot/data/latest.json (written by scripts/bot-research.ts). Loose on purpose: it is data.
import type { Regime, DataQuality, Discrepancy } from './watchbot';
import type { Feasibility } from './risk';
import type { PaperDecision, PaperFill } from './paper';
import type { MeasuredCost } from './orderbook';

export type Window = {
  trades: number;
  grossReturn: number;
  netReturn: number;
  totalCostUsd: number;
  maxDrawdown?: number;
  maxDrawdownBound?: number;
  profitFactor: number | null;
  winRate: number | null;
  buyHoldReturn: number;
  exposure?: number;
  perMarketNet?: Record<string, number>;
};

export type CandidateRow = {
  key: string;
  family: string;
  status: string;
  rejectionReasons: string[];
  periods?: { train: [number, number]; validation: [number, number]; test: [number, number] };
  cutoffs?: { trainStart: number; trainEnd: number; valEnd: number; testEnd: number };
  markets?: string[];
  train: Window;
  validation?: Window;
  test?: Window;
  stress?: { doubleCostTestNet: number | null; delayedTestNet: number | null; neighbourPassShare: number };
  ci?: { lo: number; hi: number; mean: number; alpha: number; n: number; blocks?: number };
  /** walk-forward re-estimation on pre-test data (gates-v2 and later runs only) */
  walkForward?: { compoundedNet: number; positiveFolds: number; folds: number; embargoBars: number };
};

export type MarketRow = {
  symbol: string;
  base: string;
  venue: string;
  intervalMs: number;
  datasetId: string;
  quality: DataQuality;
  regime: Regime | null;
  costBps: { fee: number; halfSpread: number; slippage: number; minOrderUsd: number };
  skipped: { family: string; reason: string }[];
  candidates: CandidateRow[];
};

export type RunRow = {
  runId: string;
  totals: { markets: number; marketsEvaluated: number; configsTried: number; oosCandidates: number; qualified: number; rejected: number };
  gates: string;
  assumptions: string[];
  markets: MarketRow[];
  pooled: CandidateRow[];
  feasibility: Feasibility[];
};

export type PaperRow = {
  id: string;
  label: string;
  kind: 'qualified' | 'diagnostic';
  createdAt: number;
  lastProcessedT: number | null;
  initialCash: number;
  equity: number;
  realizedPnl: number;
  unrealizedPnl: number;
  netReturnPct: number;
  trades: number;
  entries: number;
  openPosition: boolean;
  totalCostUsd: number;
  barsProcessed: number;
  killSwitch: boolean;
  recentDecisions: PaperDecision[];
  fills: PaperFill[];
};

export type BotSummary = {
  generatedAt: string;
  codeVersion: string;
  mode: 'paper';
  runs: RunRow[];
  watchbot: Discrepancy[];
  paper: PaperRow[];
  costs?: {
    placeholder: { halfSpreadBps: number; slippageBps: number };
    collectionDays: number;
    snapshots: number;
    requiredDays: number;
    measured: MeasuredCost[];
  };
  datasets: string[];
};
