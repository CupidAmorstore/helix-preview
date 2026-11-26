// P0 execution-assumption diagnostic (DIAGNOSTIC ONLY — validation windows were already inspected; nothing here can
// qualify a strategy and no test window is opened). For every training-selected candidate in the stored run records,
// replays its VALIDATION window under fill {next_open, next_close} x costs {real, zero} x terminal {liquidate, mark}
// with exec-v1, so fill timing, costs and terminal-position treatment are isolated from each other.
//   npx vite-node --config scripts/vite.node.config.ts scripts/p0/execution-diagnostic.ts
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { contractFor, replay } from '../../src/bot/execution';
import { COST_PRESETS } from '../../src/bot/costs';
import type { Candle, CostModel, StrategySpec } from '../../src/bot/types';

const ZERO: CostModel = { ...COST_PRESETS.coinbase_taker, takerFeeBps: 0, halfSpreadBps: 0, slippageBps: 0, provenance: 'zero-cost diagnostic' };
const cache = new Map<string, Candle[]>();
const load = (sym: string, iv: number): Candle[] => {
  const k = `${sym}-${iv}`;
  if (!cache.has(k)) {
    const p = `research/data/coinbase_${sym}_${iv === 86_400_000 ? '1d' : '1h'}.csv.gz`;
    cache.set(k, gunzipSync(readFileSync(p)).toString().trim().split('\n').slice(1).map((l) => { const [t, o, h, lo, c, v] = l.split(',').map(Number); return { t, o, h, l: lo, c, v }; }));
  }
  return cache.get(k)!;
};

type Cand = { id: string; runId: string; symbol: string; intervalMs: number; spec: StrategySpec; val: [number, number]; costPreset: string };
const latest = new Map<string, Cand>();
for (const f of readdirSync('research/runs').sort()) {
  const run = JSON.parse(readFileSync(`research/runs/${f}`, 'utf8'));
  for (const m of run.markets ?? []) {
    for (const c of m.candidates ?? []) {
      if (!c.spec || !c.periods?.validation) continue;
      const id = `${c.spec.family}|${m.market.symbol}|${m.intervalMs}`;
      latest.set(id, { id, runId: run.runId, symbol: m.market.symbol, intervalMs: m.intervalMs, spec: c.spec, val: c.periods.validation, costPreset: 'coinbase_taker' });
    }
  }
}

const CAP = 1000;
const cells = ['next_open', 'next_close'].flatMap((fill) => ['real', 'zero'].flatMap((cost) => ['liquidate', 'mark'].map((terminal) => ({ fill, cost, terminal }))));
const rows: Record<string, unknown>[] = [];
const beta = { gross: 0, passive: 0, beatPassive: 0, n: 0 };
const agg = new Map<string, { profitable: number; pnl: number; n: number; failed: number; forced: number }>();
for (const c of latest.values()) {
  const k = load(c.symbol, c.intervalMs);
  const start = k.findIndex((b) => b.t >= c.val[0]);
  const endIdx = k.findIndex((b) => b.t > c.val[1]);
  const end = endIdx === -1 ? k.length : endIdx;
  if (start < 0 || end - start < 10) continue;
  const bh = k[end - 1].c / k[start].c - 1;
  const z = replay(k.slice(0, end), c.spec, contractFor(ZERO, c.intervalMs, { terminal: 'mark' }), start, end, CAP);
  // exposure-matched passive control: hold `exposure` of capital in the asset for the whole window, zero cost
  const passive = z.exposure * bh * CAP;
  beta.gross += z.netReturn * CAP; beta.passive += passive; if (z.netReturn * CAP > passive) beta.beatPassive++; beta.n++;
  const row: Record<string, unknown> = { id: c.id, runId: c.runId, spec: c.spec, buyHold: bh, exposure: z.exposure, passiveExposureMatchedPnl: passive };
  for (const cell of cells) {
    const r = replay(k.slice(0, end), c.spec, contractFor(cell.cost === 'real' ? COST_PRESETS[c.costPreset] : ZERO, c.intervalMs, { fill: cell.fill as 'next_open', terminal: cell.terminal as 'mark' }), start, end, CAP);
    const key = `${cell.fill}|${cell.cost}|${cell.terminal}`;
    const pnl = r.netReturn * CAP;
    row[key] = { pnl, trades: r.trades.length, forced: r.forcedExits, failed: r.failedOrders, cost: r.totalCostUsd };
    const a = agg.get(key) ?? { profitable: 0, pnl: 0, n: 0, failed: 0, forced: 0 };
    a.n++; a.pnl += pnl; if (pnl > 0) a.profitable++; a.failed += r.failedOrders; a.forced += r.forcedExits;
    agg.set(key, a);
  }
  rows.push(row);
}
const summary = Object.fromEntries([...agg].map(([k, v]) => [k, { ...v, pnl: +v.pnl.toFixed(2) }]));
// effect decomposition on totals (separate hypothetical $1,000 accounts per candidate, NOT a portfolio)
const tot = (k: string) => agg.get(k)!.pnl;
const decomposition = {
  costDragAtNextOpenLiquidate: tot('next_open|zero|liquidate') - tot('next_open|real|liquidate'),
  fillTimingEffectRealCostsMark: tot('next_close|real|mark') - tot('next_open|real|mark'),
  terminalEffectNextOpenReal: tot('next_open|real|liquidate') - tot('next_open|real|mark'),
};
mkdirSync('research/p0', { recursive: true });
writeFileSync('research/p0/execution-diagnostic.json', JSON.stringify({
  generatedAt: new Date().toISOString(), contract: 'exec-v1', capitalPerCandidateUsd: CAP,
  note: 'Diagnostic on already-inspected validation windows; separate hypothetical accounts per candidate, not a portfolio; cannot qualify anything.',
  candidates: rows.length, summary, decomposition, exposureControl: beta, rows }, null, 1));
console.log('candidates', rows.length);
for (const [k, v] of Object.entries(summary)) console.log(k.padEnd(28), `${v.profitable}/${v.n} profitable`, `P&L $${v.pnl}`, `forced ${v.forced}`, `failed ${v.failed}`);
console.log(decomposition, beta);
