import type { BacktestResult, Candle, CostModel, StrategySpec, Trade } from './types';
import { buildSignal } from './strategies';
import { sideCostFrac } from './costs';

export type BacktestOptions = {
  /** first bar index whose signal may open a trade (indicators may use earlier bars) */
  start: number;
  /** exclusive end index; any open position is closed at candles[end-1].c and flagged forcedExit */
  end: number;
  cost: CostModel;
  capitalUsd: number;
  /** fraction of equity committed per entry (risk policy decides; research default 1) */
  positionFraction?: number;
  /** extra bars of execution delay beyond next-open (robustness test) */
  delayBars?: number;
  /** record the marked equity curve (used for monthly inference) */
  recordEquity?: boolean;
};

/**
 * Event-driven long-only spot backtest.
 * - signal evaluated at CLOSE of bar i (data <= i)
 * - order fills at OPEN of bar i+1+delay, buy at open*(1+side cost), sell at open*(1-side cost)
 * - fixed costs charged per fill; orders below venue minimum are REJECTED (counted), not resized
 * - equity marked to close each bar; max drawdown on marked equity
 */
export function backtest(candles: Candle[], spec: StrategySpec, opt: BacktestOptions): BacktestResult {
  const signal = buildSignal(spec, candles);
  const frac = opt.positionFraction ?? 1;
  const delay = opt.delayBars ?? 0;
  const side = sideCostFrac(opt.cost);
  const end = Math.min(opt.end, candles.length);

  let cash = opt.capitalUsd;
  let units = 0;
  let pos: 0 | 1 = 0;
  let entry: { t: number; px: number; notional: number; cost: number; rawPx: number } | null = null;
  const trades: Trade[] = [];
  let totalCost = 0;
  let peak = opt.capitalUsd;
  let maxDd = 0;
  let inMarketBars = 0;
  let rejected = 0;
  const pending: { at: number; want: 0 | 1 }[] = [];
  const curve: { t: number; v: number }[] | undefined = opt.recordEquity ? [] : undefined;

  // Run the (possibly stateful) signal sequentially from bar 0 so state is identical across windows.
  for (let i = 0; i < end; i++) {
    // 1) execute orders scheduled for this bar's open
    while (pending.length && pending[0].at === i) {
      const { want } = pending.shift()!;
      const open = candles[i].o;
      if (want === 1 && pos === 0) {
        const notional = cash * frac;
        if (notional < opt.cost.minOrderUsd || notional <= opt.cost.fixedCostUsd * 2) {
          rejected++;
          continue;
        }
        const px = open * (1 + side);
        const fee = opt.cost.fixedCostUsd;
        units = (notional - fee) / px;
        cash -= notional;
        const costUsd = notional - units * open + 0; // proportional + fixed vs raw open
        totalCost += costUsd;
        entry = { t: candles[i].t, px, notional, cost: costUsd, rawPx: open };
        pos = 1;
      } else if (want === 0 && pos === 1 && entry) {
        const px = open * (1 - side);
        const proceeds = exitProceeds(units * px, opt.cost.fixedCostUsd);
        const exitCost = units * open - proceeds;
        totalCost += exitCost;
        cash += proceeds;
        trades.push(makeTrade(entry, candles[i].t, px, open, units, proceeds, exitCost, false));
        units = 0;
        pos = 0;
        entry = null;
      }
    }

    // 2) mark equity at close (only inside the evaluation window)
    if (i >= opt.start) {
      const eq = cash + units * candles[i].c;
      peak = Math.max(peak, eq);
      maxDd = Math.max(maxDd, peak > 0 ? (peak - eq) / peak : 0);
      if (pos === 1) inMarketBars++;
      curve?.push({ t: candles[i].t, v: eq });
    }

    // 3) evaluate the signal at this bar's close; it is ALWAYS called so stateful signals stay in sync
    const projected = pending.length ? pending[pending.length - 1].want : pos;
    const want = signal(i, projected);
    const execAt = i + 1 + delay;
    if (i >= opt.start && want !== projected && execAt < end) pending.push({ at: execAt, want });
  }

  // close at window end (flagged; mark at last close with exit costs applied)
  if (pos === 1 && entry && end > 0) {
    const last = candles[end - 1].c;
    const px = last * (1 - side);
    const proceeds = exitProceeds(units * px, opt.cost.fixedCostUsd);
    const exitCost = units * last - proceeds;
    totalCost += exitCost;
    cash += proceeds;
    trades.push(makeTrade(entry, candles[end - 1].t, px, last, units, proceeds, exitCost, true));
    units = 0;
  }
  // AUD-207: the liquidated equity is the final equity; it enters peak/drawdown like every marked bar
  if (end > opt.start) {
    peak = Math.max(peak, cash);
    maxDd = Math.max(maxDd, peak > 0 ? (peak - cash) / peak : 0);
    if (curve && curve.length) curve[curve.length - 1] = { t: curve[curve.length - 1].t, v: cash };
  }

  const startPx = candles[Math.min(opt.start, end - 1)]?.c ?? 1;
  const endPx = candles[end - 1]?.c ?? startPx;
  const gross = trades.reduce((acc, t) => acc * (1 + t.grossRet * frac), 1) - 1;
  return {
    trades,
    grossReturn: gross,
    netReturn: cash / opt.capitalUsd - 1,
    totalCostUsd: totalCost,
    maxDrawdown: maxDd,
    exposure: end - opt.start > 0 ? inMarketBars / (end - opt.start) : 0,
    bars: Math.max(0, end - opt.start),
    buyHoldReturn: endPx / startPx - 1,
    rejectedOrders: rejected,
    ...(curve ? { equity: curve } : {})
  };
}

/**
 * Sale proceeds after a fixed per-fill cost. If the fixed cost exceeds the position's value the position is
 * written off (proceeds 0) instead of paying more than it is worth: equity can fall to 0 but never below.
 */
export function exitProceeds(grossAfterProportional: number, fixedCostUsd: number): number {
  return Math.max(0, grossAfterProportional - fixedCostUsd);
}

function makeTrade(
  entry: { t: number; px: number; notional: number; cost: number; rawPx: number },
  exitT: number,
  exitPx: number,
  rawExit: number,
  units: number,
  proceeds: number,
  exitCost: number,
  forced: boolean
): Trade {
  return {
    entryT: entry.t,
    exitT,
    entryPx: entry.px,
    exitPx,
    notional: entry.notional,
    grossRet: rawExit / entry.rawPx - 1,
    netRet: proceeds / entry.notional - 1,
    costUsd: entry.cost + exitCost,
    forcedExit: forced
  };
}
