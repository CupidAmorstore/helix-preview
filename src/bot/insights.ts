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
