// Phase III independent verification (PAPER ONLY, read-only: writes one evidence file, never a registration).
//   npx vite-node --config scripts/vite.node.config.ts scripts/p0/phase3-verify.ts
// 1. Re-costs E1 (XRP Bollinger) and E2 (ETH RSI) on their recorded validation windows at 5% sizing, at every cost level.
// 2. Reports the worst single-position loss and whether the 5% drawdown latch could trip at 5% sizing, on real history.
// Already-inspected history: diagnostic only, never evidence for qualification.
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { runExperimentalAccount, EXPERIMENTAL_POLICY } from '../../src/bot/experimental';
import { COST_PRESETS } from '../../src/bot/costs';
import type { Candle, CostModel } from '../../src/bot/types';

const DAY = 86_400_000;
const load = (sym: string): Candle[] =>
  gunzipSync(readFileSync(`research/data/coinbase_${sym}_1d.csv.gz`)).toString().trim().split('\n').slice(1)
    .map((l) => { const [t, o, h, lo, c, v] = l.split(',').map(Number); return { t, o, h, l: lo, c, v }; });

const conservative = COST_PRESETS.coinbase_experimental_conservative_2026_11;
const levels: Record<string, CostModel> = {
  'conservative 1.20% (registered)': conservative,
  'secondary 0.90%': { ...conservative, takerFeeBps: 90 },
  'legacy 0.60%': { ...conservative, takerFeeBps: 60 },
  'double cost 2.40%': { ...conservative, takerFeeBps: 240, halfSpreadBps: 4, slippageBps: 6 }
};
const cands = [
  { id: 'E1', sym: 'XRP-USD', spec: { family: 'bollinger_reversion', params: { n: 20, k: 2, maxHold: 24 } }, from: '2025-04-12', to: '2026-01-30' },
  { id: 'E2', sym: 'ETH-USD', spec: { family: 'rsi_reversion', params: { n: 14, lo: 25, hi: 55, maxHold: 24 } }, from: '2023-12-01', to: '2025-05-26' }
] as const;

const out: Record<string, unknown> = { generatedAt: new Date().toISOString(), policy: EXPERIMENTAL_POLICY, note: 'diagnostic on already-inspected history; not evidence', candidates: {} };
for (const c of cands) {
  const all = load(c.sym);
  const end = Date.parse(c.to) + DAY;
  const candles = all.filter((k) => k.t < end);
  const startIndex = candles.findIndex((k) => k.t >= Date.parse(c.from));
  const rows: Record<string, unknown> = {};
  for (const [name, cost] of Object.entries(levels)) {
    const run = runExperimentalAccount({ candles, spec: c.spec as never, cost, intervalMs: DAY, startIndex, capitalUsd: 1000 });
    const fills = run.result.ledger.filter((e) => e.kind === 'fill') as { side: string; usd: number }[];
    const buys = fills.filter((f) => f.side === 'buy');
    const eq = run.result.equity.filter((p) => p.t >= Date.parse(c.from));
    let peak = 1000, dd = 0;
    for (const p of eq) { peak = Math.max(peak, p.v); dd = Math.max(dd, (peak - p.v) / peak); }
    rows[name] = {
      netReturnPct: +(run.result.netReturn * 100).toFixed(3),
      fills: fills.length,
      maxBuyNotionalUsd: buys.length ? Math.max(...buys.map((f) => f.usd)) : 0,
      maxDrawdownPct: +(dd * 100).toFixed(3),
      latchTripped: run.suspendedAt !== null,
      totalCostUsd: +run.result.totalCostUsd.toFixed(4)
    };
  }
  (out.candidates as Record<string, unknown>)[c.id] = { market: c.sym, spec: c.spec, window: [c.from, c.to], startIndex, results: rows };
}
writeFileSync('research/experimental/phase3-verification.json', JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(out.candidates, null, 1));
