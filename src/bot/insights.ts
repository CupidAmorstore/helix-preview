// Plain-language summaries of the bundled research results, shared by Home and the Bot page.
import type { BotSummary, CandidateRow } from './summary';
import type { Regime } from './watchbot';

export function allCandidates(s: BotSummary): (CandidateRow & { scope: string; intervalMs: number })[] {
  return s.runs.flatMap((r) => {
    const iv = r.markets[0]?.intervalMs ?? 0;
    return [
      ...r.markets.flatMap((m) => m.candidates.map((c) => ({ ...c, scope: m.symbol, intervalMs: m.intervalMs }))),
      ...(r.pooled ?? []).map((c) => ({ ...c, scope: `Universe (${c.markets?.length ?? 0})`, intervalMs: iv }))
    ];
  });
}

/** Rejection reasons rewritten for people, grouped and counted (most common first). */
export function plainReasons(s: BotSummary, n = 3): { text: string; count: number }[] {
  const rules: [RegExp, string][] = [
    [/trades \d+ < \d+|out-of-sample trades/, 'Too few test trades to trust the result'],
    [/not profitable after costs/, 'Lost money after trading fees'],
    [/(validation|test) net return <= 0/, 'Lost money on data it had not seen'],
    [/drawdown/, 'Losses from a peak were too deep'],
    [/2x cost stress/, 'Fails if fees are a bit higher'],
    [/delay stress/, 'Fails if orders fill a little late'],
    [/neighbours unstable/, 'Only works with one exact setting'],
    [/bootstrap/, 'Result could be luck'],
    [/profit factor/, 'Losing trades outweigh winners']
  ];
  const counts = new Map<string, number>();
  for (const c of allCandidates(s)) {
    const seen = new Set<string>();
    for (const r of c.rejectionReasons) {
      const hit = rules.find(([re]) => re.test(r));
      const text = hit ? hit[1] : r;
      if (seen.has(text)) continue;
      seen.add(text);
      counts.set(text, (counts.get(text) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count).slice(0, n);
}

export function botHeadline(s: BotSummary) {
  const c = allCandidates(s);
  const qualified = c.filter((x) => x.status === 'qualified_paper_strategy').length;
  const reachedTest = c.filter((x) => x.test).length;
  return { tested: c.length, qualified, reachedTest, holdingCash: qualified === 0 };
}

export function dailyRegimes(s: BotSummary): { base: string; regime: Regime }[] {
  return s.runs
    .flatMap((r) => r.markets)
    .filter((m) => m.intervalMs === 86_400_000 && m.regime)
    .map((m) => ({ base: m.base, regime: m.regime as Regime }));
}

export function snapshotAgeHours(s: BotSummary, now = Date.now()) {
  return Math.max(0, (now - new Date(s.generatedAt).getTime()) / 3_600_000);
}

// ---------------------------------------------------------------- strategy catalogue (plain language)
export type StrategyInfo = { family: string; name: string; objective: string; risk: 'Medium' | 'Medium-high' | 'High'; style: string };

export const STRATEGIES: StrategyInfo[] = [
  { family: 'sma_cross', name: 'Trend following (moving averages)', objective: 'Hold a coin while its short-term average is above its long-term average.', risk: 'Medium', style: 'Trend' },
  { family: 'trend_filtered_momentum', name: 'Momentum with trend filter', objective: 'Buy recent strength, but only when the long-term trend is up.', risk: 'Medium', style: 'Trend' },
  { family: 'ts_momentum', name: 'Momentum', objective: 'Hold a coin after it has risen over a recent period.', risk: 'Medium-high', style: 'Trend' },
  { family: 'donchian_breakout', name: 'Breakout', objective: 'Buy when price breaks above its recent range; exit when it breaks below.', risk: 'Medium-high', style: 'Trend' },
  { family: 'vol_compression_breakout', name: 'Calm-before-the-move breakout', objective: 'Buy a breakout that follows an unusually quiet period.', risk: 'Medium-high', style: 'Volatility' },
  { family: 'bollinger_reversion', name: 'Buy the dip (Bollinger bands)', objective: 'Buy after an unusually sharp drop and sell when price returns to average.', risk: 'High', style: 'Mean reversion' },
  { family: 'rsi_reversion', name: 'Oversold bounce (RSI)', objective: 'Buy when the RSI says a coin is oversold; sell when it recovers.', risk: 'High', style: 'Mean reversion' },
  { family: 'vol_filtered_trend', name: 'Calm-market trend', objective: 'Follow the trend only while volatility is below its usual level; stay in cash in turbulent markets.', risk: 'Medium', style: 'Risk-managed trend' },
  { family: 'xs_momentum', name: 'Strongest coins rotation', objective: 'Each week hold the 1–3 coins that rose most over recent weeks; hold cash if none rose.', risk: 'Medium-high', style: 'Cross-sectional momentum' },
  { family: 'regime_switch', name: 'Regime switcher', objective: 'Use trend following when the market trends and dip-buying when it moves sideways.', risk: 'Medium-high', style: 'Hybrid' },
  { family: 'weekly_trend', name: 'Weekly trend check', objective: 'Once a week, hold a coin only if it is above its long-term average; otherwise cash. Few trades, so fees matter less.', risk: 'Medium', style: 'Multi-week trend' },
  { family: 'monthly_momentum', name: 'Monthly momentum', objective: 'Every four weeks, hold a coin only if it rose over the past 3–6 months.', risk: 'Medium-high', style: 'Multi-month momentum' }
];

export type StrategyEvidence = {
  info: StrategyInfo;
  tested: number;
  reachedTest: number;
  qualified: number;
  /** one rule across all coins on daily bars: the most robust single summary */
  pooledDaily?: { trainNet: number; valNet: number; valTrades: number; testNet?: number; testTrades?: number; reasons: string[] };
  reasons: { text: string; count: number }[];
};

export function strategyEvidence(s: BotSummary): StrategyEvidence[] {
  const all = allCandidates(s);
  return STRATEGIES.map((info) => {
    const mine = all.filter((c) => c.family === info.family);
    const pooled = mine.find((c) => c.key.startsWith('POOLED:') && c.intervalMs === 86_400_000);
    const sub: BotSummary = { ...s, runs: s.runs.map((r) => ({ ...r, markets: r.markets.map((m) => ({ ...m, candidates: m.candidates.filter((c) => c.family === info.family) })), pooled: (r.pooled ?? []).filter((c) => c.family === info.family) })) };
    return {
      info,
      tested: mine.length,
      reachedTest: mine.filter((c) => c.test).length,
      qualified: mine.filter((c) => c.status === 'qualified_paper_strategy').length,
      pooledDaily: pooled && pooled.validation
        ? { trainNet: pooled.train.netReturn, valNet: pooled.validation.netReturn, valTrades: pooled.validation.trades, testNet: pooled.test?.netReturn, testTrades: pooled.test?.trades, reasons: pooled.rejectionReasons }
        : undefined,
      reasons: plainReasons(sub, 3)
    };
  });
}
