import type { Candle, CostModel, MarketRef } from './types';
import type { ValidationReport } from './candles';
import type { Quote } from './sources';
import { efficiencyRatio, logReturns } from './indicators';
import { sideCostFrac } from './costs';
import { stdev } from './stats';

export type Regime = {
  trend: 'up' | 'down' | 'range';
  volatility: 'low' | 'normal' | 'high';
  efficiency: number;
  realizedVolAnnPct: number;
  volPercentile: number;
};

/** Regime from the last `n` completed bars only. */
export function classifyRegime(candles: Candle[], barsPerYear: number, n = 48): Regime | null {
  if (candles.length < n * 6) return null;
  const close = candles.map((c) => c.c);
  const er = efficiencyRatio(close, n);
  const lr = logReturns(close);
  const last = close.length - 1;
  const window = (end: number) => stdev(lr.slice(end - n + 1, end + 1));
  const cur = window(last);
  const hist: number[] = [];
  for (let e = n * 2; e <= last; e += Math.max(1, Math.floor(n / 4))) hist.push(window(e));
  const pct = hist.filter((h) => h < cur).length / hist.length;
  const net = close[last] / close[last - n] - 1;
  const eff = er[last];
  return {
    trend: eff > 0.3 ? (net > 0 ? 'up' : 'down') : 'range',
    volatility: pct > 0.8 ? 'high' : pct < 0.2 ? 'low' : 'normal',
    efficiency: eff,
    realizedVolAnnPct: cur * Math.sqrt(barsPerYear) * 100,
    volPercentile: pct
  };
}

export type DataQuality = {
  score: number; // 0..100
  bars: number;
  gaps: number;
  missingBars: number;
  stale: boolean;
  longestContiguous: number;
  reasons: string[];
};

export function scoreDataQuality(v: ValidationReport, minBars: number): DataQuality {
  const gaps = v.issues.filter((i) => i.kind === 'gap');
  const missing = gaps.reduce((s, g) => s + (g.kind === 'gap' ? g.missingBars : 0), 0);
  const reasons: string[] = [];
  let score = 100;
  if (v.stale) {
    score -= 50;
    reasons.push('stale: last completed bar too old');
  }
  if (v.candles.length < minBars) {
    score -= 40;
    reasons.push(`only ${v.candles.length} bars (< ${minBars})`);
  }
  const missFrac = v.candles.length ? missing / (v.candles.length + missing) : 1;
  if (missFrac > 0.01) {
    score -= Math.min(30, missFrac * 300);
    reasons.push(`${(missFrac * 100).toFixed(2)}% bars missing (gaps not filled)`);
  }
  const dups = v.issues.filter((i) => i.kind === 'duplicate' || i.kind === 'misaligned' || i.kind === 'invalid_ohlc').length;
  if (dups) {
    score -= Math.min(10, dups);
    reasons.push(`${dups} duplicate/misaligned/invalid bars removed`);
  }
  return {
    score: Math.max(0, Math.round(score)),
    bars: v.candles.length,
    gaps: gaps.length,
    missingBars: missing,
    stale: v.stale,
    longestContiguous: v.longestContiguous,
    reasons
  };
}

export type Discrepancy = {
  base: string;
  buyVenue: string;
  sellVenue: string;
  grossEdgePct: number;
  roundTripCostPct: number;
  netEdgePct: number;
  status: 'detected_opportunity' | 'rejected';
  reasons: string[];
  observedAt: number;
};

/**
 * Cross-venue quote comparison. A positive net edge is only a DETECTED OPPORTUNITY: it ignores transfer
 * time, withdrawal fees, inventory on both venues, depth beyond top-of-book, and quote staleness.
 * It is never labelled arbitrage or profit.
 */
export function crossVenueDiscrepancies(
  base: string,
  quotes: Quote[],
  costs: Record<string, CostModel>,
  maxQuoteAgeMs = 10_000
): Discrepancy[] {
  const out: Discrepancy[] = [];
  for (const buy of quotes)
    for (const sell of quotes) {
      if (buy.venue === sell.venue) continue;
      const gross = sell.bid / buy.ask - 1;
      const rt = sideCostFrac(costs[buy.venue]) + sideCostFrac(costs[sell.venue]) - (costs[buy.venue].halfSpreadBps + costs[sell.venue].halfSpreadBps) / 10_000; // spread already in quotes
      const net = gross - rt;
      const reasons: string[] = [];
      if (net <= 0) reasons.push('edge does not cover taker fees + slippage on both venues');
      if (Math.abs(buy.observedAt - sell.observedAt) > maxQuoteAgeMs) reasons.push('quotes not simultaneous');
      reasons.push('unmodelled: transfer delay, withdrawal fee, inventory, depth');
      out.push({
        base,
        buyVenue: buy.venue,
        sellVenue: sell.venue,
        grossEdgePct: gross * 100,
        roundTripCostPct: rt * 100,
        netEdgePct: net * 100,
        status: net > 0 && reasons.length === 1 ? 'detected_opportunity' : 'rejected',
        reasons,
        observedAt: Math.max(buy.observedAt, sell.observedAt)
      });
    }
  return out.sort((a, b) => b.netEdgePct - a.netEdgePct);
}

/** Same base asset on several venues/chains is ONE exposure. */
export function dedupeByBase(markets: MarketRef[]): Map<string, MarketRef[]> {
  const m = new Map<string, MarketRef[]>();
  for (const x of markets) m.set(x.base, [...(m.get(x.base) ?? []), x]);
  return m;
}
