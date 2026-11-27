// P0 maker-order research model (CANDLE-BASED -> always classified UNVERIFIED). Never reported as execution evidence.
// A limit buy is posted at decisionClose x (1 - offset) for `waitBars` bars. Conservative fill rule: it fills only if
// the price trades THROUGH the limit by at least `throughBps` (being touched is not enough — queue position unknown).
// If unfilled, the strategy either skips the trade (missed opportunity) or crosses as a taker at the next open.
// Adverse selection: forward return after maker fills vs after all decisions.
import type { Candle } from './types';

export type MakerParams = { offsetBps: number; waitBars: number; throughBps: number; onMiss: 'skip' | 'taker' };

export type MakerStudy = {
  classification: 'unverified_candle_model';
  decisions: number;
  fillRate: number;
  takerFallbacks: number;
  missed: number;
  meanFwdRetAllDecisions: number;
  meanFwdRetMakerFills: number;
  adverseSelectionBps: number;
  feeSavingBpsPerFill: number;
  netBenefitBpsPerDecision: number;
};

export function makerStudy(candles: Candle[], decisionIdx: number[], p: MakerParams, makerBps: number, takerBps: number, horizonBars: number): MakerStudy {
  let fills = 0, fallbacks = 0, missed = 0;
  const fwdAll: number[] = [], fwdFill: number[] = [], benefit: number[] = [];
  for (const d of decisionIdx) {
    if (d + p.waitBars + horizonBars >= candles.length) continue;
    const limit = candles[d].c * (1 - p.offsetBps / 1e4);
    const through = limit * (1 - p.throughBps / 1e4);
    const end = candles[d + p.waitBars + horizonBars].c;
    const takerPx = candles[d + 1].o;
    fwdAll.push(end / takerPx - 1);
    let filled = false;
    for (let j = d + 1; j <= d + p.waitBars; j++) if (candles[j].l <= through) { filled = true; break; }
    if (filled) {
      fills++;
      fwdFill.push(end / limit - 1);
      // benefit vs taker at next open: price improvement + fee saving, measured to the same end point
      benefit.push(((end / limit - 1) - (end / takerPx - 1)) * 1e4 + (takerBps - makerBps));
    } else if (p.onMiss === 'taker') {
      fallbacks++;
      const late = candles[d + p.waitBars + 1]?.o ?? takerPx;
      benefit.push(((end / late - 1) - (end / takerPx - 1)) * 1e4); // pays taker fee anyway, later
    } else {
      missed++;
      benefit.push(-((end / takerPx - 1) * 1e4 - takerBps * 2)); // forgone net move of the taker trade
    }
  }
  const mean = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : NaN);
  const n = fwdAll.length;
  return {
    classification: 'unverified_candle_model',
    decisions: n,
    fillRate: n ? fills / n : 0,
    takerFallbacks: fallbacks,
    missed,
    meanFwdRetAllDecisions: mean(fwdAll),
    meanFwdRetMakerFills: mean(fwdFill),
    adverseSelectionBps: (mean(fwdAll) - mean(fwdFill)) * 1e4,
    feeSavingBpsPerFill: takerBps - makerBps,
    netBenefitBpsPerDecision: mean(benefit)
  };
}
