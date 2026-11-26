// P0 Watchbot v2: explainable opportunity screen. Ranks markets by DATA QUALITY → ECONOMIC FEASIBILITY → REGIME →
// strategy relevance, with every unknown named. A rank is economic headroom (how far the typical move exceeds the
// stressed break-even), NOT an expected return and NOT a trade signal. Fails closed: a market with any blocking
// reason is "rejected" and listed after all eligible markets. Paper only.
import type { Candle } from './types';
import { validateCandles } from './candles';
import { admit } from './admission';
import { assetRegime } from './regime';
import type { FeeEvidence } from './feeEvidence';
import { assertPaperOnly } from './risk';

const DAY = 86_400_000;

export type ScanInput = {
  symbol: string;
  venue: FeeEvidence['venue'];
  region: string;
  daily: Candle[];
  /** markets used by an active/proposed forward registration */
  forwardRegistered: boolean;
};

export type ScanRow = {
  symbol: string;
  venue: string;
  status: 'eligible_for_research' | 'rejected';
  headroom: number | null; // typical weekly move ÷ stressed break-even
  blocking: string[];
  warnings: string[];
  unknowns: string[];
  facts: {
    lastBar: string | null;
    gapsLast400: number;
    zeroVolumeBarsLast90: number;
    medianDailyUsdVolume30: number | null;
    typicalWeeklyMovePct: number | null;
    stressedBreakEvenPct: number | null;
    regime: string | null;
    abnormal: boolean | null;
    liquidity: string | null;
  };
};

export const SCAN_POLICY = {
  minHistoryBars: 400,
  minMedianDailyUsdVolume: 1_000_000, // thin markets: fills and candles become unreliable
  maxZeroVolumeBars90: 0,
  horizonBars: 7
} as const;

export function scanMarket(x: ScanInput, capitalUsd: number, nowMs: number): ScanRow {
  assertPaperOnly();
  const blocking: string[] = [];
  const warnings: string[] = [];
  const unknowns: string[] = ['live order-book depth (dated snapshot used)', 'delisting risk (no point-in-time universe)', 'predictive edge (no forward-validated evidence)'];
  const v = validateCandles(x.daily, DAY, nowMs);
  const k = v.candles.slice(v.trailingContiguousStart);
  const last400 = v.candles.slice(-SCAN_POLICY.minHistoryBars);
  const gaps = v.issues.filter((i) => i.kind === 'gap' && i.from >= (last400[0]?.t ?? 0)).length;
  if (v.stale) blocking.push('data stale');
  if (gaps) blocking.push(`${gaps} gap(s) in the last ${SCAN_POLICY.minHistoryBars} bars`);
  if (k.length < SCAN_POLICY.minHistoryBars) blocking.push(`only ${k.length} contiguous daily bars (< ${SCAN_POLICY.minHistoryBars})`);
  const recent = k.slice(-90);
  const zeroVol = recent.filter((b) => !(b.v > 0)).length;
  if (zeroVol > SCAN_POLICY.maxZeroVolumeBars90) blocking.push(`${zeroVol} zero-volume bars in 90 days (suspicious)`);
  const usd30 = k.slice(-30).map((b) => b.v * b.c).sort((a, b) => a - b);
  const medUsd = usd30.length ? usd30[Math.floor(usd30.length / 2)] : null;
  if (medUsd !== null && medUsd < SCAN_POLICY.minMedianDailyUsdVolume) blocking.push(`median daily volume $${Math.round(medUsd).toLocaleString('en-US')} < $${SCAN_POLICY.minMedianDailyUsdVolume.toLocaleString('en-US')}`);

  let typical: number | null = null;
  if (k.length > 60) {
    const moves = [];
    for (let i = Math.max(SCAN_POLICY.horizonBars, k.length - 365); i < k.length; i++) moves.push(Math.abs(k[i].c / k[i - SCAN_POLICY.horizonBars].c - 1));
    moves.sort((a, b) => a - b);
    typical = moves[Math.floor(moves.length / 2)];
  }
  let sbe: number | null = null;
  if (typical) {
    const r = admit({ venue: x.venue, region: x.region, capitalUsd, notionalUsd: capitalUsd * 0.25, execution: 'taker', typicalAbsMove: typical, edgeSource: 'none', nowMs });
    sbe = r.stressedBreakEvenMove ?? null;
    if (!r.economicallyFeasible) blocking.push(...r.reasons.filter((s) => !s.startsWith('edge evidence') && !s.startsWith('no expected')).map((s) => `economics: ${s}`));
    warnings.push(...r.warnings);
  } else blocking.push('typical move unknown');

  const reg = k.length ? assetRegime(k, k.length - 1) : null;
  if (!reg) unknowns.push('regime (insufficient history)');
  else {
    if (reg.abnormal) blocking.push('abnormal last-bar move (> 5σ) — wait for confirmation');
    if (reg.liquidity === 'deteriorating') blocking.push('liquidity deteriorating (30-day volume < 40% of 180-day average)');
    if (reg.trend === 'bear') warnings.push('bear regime: labels have no directional power (P0 study) — informational only');
  }
  if (!x.forwardRegistered) warnings.push('not part of any forward registration: no strategy is being validated here');
  return {
    symbol: x.symbol,
    venue: x.venue,
    status: blocking.length ? 'rejected' : 'eligible_for_research',
    headroom: typical && sbe ? typical / sbe : null,
    blocking,
    warnings,
    unknowns,
    facts: {
      lastBar: k.length ? new Date(k[k.length - 1].t).toISOString().slice(0, 10) : null,
      gapsLast400: gaps,
      zeroVolumeBarsLast90: zeroVol,
      medianDailyUsdVolume30: medUsd,
      typicalWeeklyMovePct: typical !== null ? typical * 100 : null,
      stressedBreakEvenPct: sbe !== null ? sbe * 100 : null,
      regime: reg?.trend ?? null,
      abnormal: reg?.abnormal ?? null,
      liquidity: reg?.liquidity ?? null
    }
  };
}

/** Eligible first (by headroom, descending), then rejected (by number of blocking reasons). Deterministic ties by symbol. */
export function rankMarkets(rows: ScanRow[]): ScanRow[] {
  return [...rows].sort((a, b) =>
    a.status !== b.status ? (a.status === 'eligible_for_research' ? -1 : 1)
    : a.status === 'eligible_for_research' ? (b.headroom ?? 0) - (a.headroom ?? 0) || a.symbol.localeCompare(b.symbol)
    : a.blocking.length - b.blocking.length || a.symbol.localeCompare(b.symbol));
}
