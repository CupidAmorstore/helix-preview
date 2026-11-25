// Section 6 — research bottleneck analysis on the STORED daily datasets (offline, no new hypotheses tested,
// no test window opened). Writes research/research-bottleneck-study.json.
//   npx vite-node --config scripts/vite.node.config.ts scripts/research-bottleneck-study.ts
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { backtest } from '../src/bot/backtest';
import { COST_PRESETS } from '../src/bot/costs';
import { buildSignal, PARAM_GRID } from '../src/bot/strategies';
import { simulateXs, CAPITAL_TIERS } from '../src/bot/crossSectional';
import { GATES } from '../src/bot/validation';
import { mean, stdev, studentTQuantile } from '../src/bot/stats';
import type { Candle, StrategyFamily } from '../src/bot/types';
import prov from '../research/provenance.json';

const DAY = 86_400_000;
const load = (f: string): Candle[] =>
  gunzipSync(readFileSync(`research/data/${f}`)).toString().trim().split('\n').slice(1).map((l) => {
    const [t, o, h, lo, c, v] = l.split(',').map(Number);
    return { t, o, h, l: lo, c, v };
  });
const files = readdirSync('research/data').filter((f) => f.endsWith('_1d.csv.gz')).sort();
const sets = files.map((f) => ({ symbol: f.replace('coinbase_', '').replace('_1d.csv.gz', ''), candles: load(f) }));
const out: Record<string, unknown> = { generatedAt: new Date().toISOString(), datasets: sets.map((s) => ({ symbol: s.symbol, bars: s.candles.length, from: new Date(s.candles[0].t).toISOString().slice(0, 10), to: new Date(s.candles.at(-1)!.t).toISOString().slice(0, 10) })) };
const N = (prov as { records: unknown[] }).records.length; // evaluations so far (Bonferroni basis: registry 199)
const alpha = GATES.familyAlpha / 199;

// ---- 1. statistical power of the monthly-return test at the current multiple-testing burden ----------
const monthly = (c: Candle[]) => {
  const m = new Map<string, number>();
  for (const k of c) { const d = new Date(k.t); m.set(`${d.getUTCFullYear()}-${d.getUTCMonth()}`, k.c); }
  const v = [...m.values()];
  return v.slice(1).map((x, i) => x / v[i] - 1);
};
const bhMonthlySd = sets.map((s) => stdev(monthly(s.candles)));
const sigma = mean(bhMonthlySd);
const zA = studentTQuantile(1 - alpha / 2, 1e6);
const zB = studentTQuantile(0.8, 1e6);
const monthsNeeded = (edge: number, sd: number) => Math.ceil(((zA + zB) * sd / edge) ** 2);
out.power = {
  bonferroniN: 199, alphaTwoSided: alpha, zAlpha: zA, zPower80: zB,
  medianBuyHoldMonthlySd: sigma,
  note: 'months of out-of-sample returns needed for 80% power, by true mean monthly edge and strategy volatility (fraction of buy-and-hold volatility)',
  table: [0.25, 0.5, 1].map((volShare) => ({
    strategyMonthlySd: sigma * volShare,
    monthsNeeded: Object.fromEntries([0.005, 0.01, 0.02, 0.05].map((e) => [`edge ${e * 100}%/month`, monthsNeeded(e, sigma * volShare)]))
  })),
  oosMonthsAvailable: Math.floor(mean(sets.map((s) => s.candles.length)) / 30.4 * 0.5),
  atBonferroni1: Object.fromEntries([0.005, 0.01, 0.02].map((e) => [`edge ${e * 100}%/month`, Math.ceil(((studentTQuantile(0.975, 1e6) + zB) * sigma * 0.5 / e) ** 2)])),
  evaluationsRecordedInProvenance: N
};

// ---- 2. structural trade counts: how many position changes can each family make? -------------------
const minWarm = 300;
out.tradeCounts = (Object.keys(PARAM_GRID) as StrategyFamily[]).map((f) => {
  const perYear = sets.map((s) => {
    const p = PARAM_GRID[f][0];
    const sig = buildSignal({ family: f, params: p }, s.candles);
    let pos: 0 | 1 = 0, entries = 0;
    for (let i = 0; i < s.candles.length; i++) { const w = sig(i, pos); if (w === 1 && pos === 0 && i >= minWarm) entries++; pos = w; }
    return entries / ((s.candles.length - minWarm) / 365);
  });
  const ev = mean(perYear);
  const valYears = (mean(sets.map((s) => s.candles.length)) - minWarm) * GATES.split.validation / 365;
  return { family: f, entriesPerYear: +ev.toFixed(2), expectedValidationTrades: +(ev * valYears).toFixed(1), minRequired: GATES.minTradesValidation, structurallyPossible: ev * valYears >= GATES.minTradesValidation };
});

// ---- 3. correlation: effective number of independent assets ---------------------------------------
const common = (() => {
  const maps = sets.map((s) => new Map(s.candles.map((k) => [k.t, k.c])));
  const ts = [...maps[0].keys()].filter((t) => maps.every((m) => m.has(t))).sort((a, b) => a - b);
  return { ts, px: maps.map((m) => ts.map((t) => m.get(t)!)) };
})();
const rets = common.px.map((p) => p.slice(1).map((x, i) => Math.log(x / p[i])));
const corr = rets.map((a) => rets.map((b) => { const ma = mean(a), mb = mean(b); let n = 0, da = 0, db = 0; for (let i = 0; i < a.length; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return n / Math.sqrt(da * db); }));
// eigenvalues of the correlation matrix (Jacobi)
const eig = (() => {
  const n = corr.length; const A = corr.map((r) => [...r]);
  for (let sweep = 0; sweep < 100; sweep++) for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
    if (Math.abs(A[p][q]) < 1e-12) continue;
    const th = (A[q][q] - A[p][p]) / (2 * A[p][q]); const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)); const c = 1 / Math.sqrt(t * t + 1), s = t * c;
    for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
    for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
  }
  return A.map((r, i) => r[i]).sort((a, b) => b - a);
})();
const offDiag = corr.flatMap((r, i) => r.filter((_, j) => j > i));
out.correlation = {
  commonDays: common.ts.length, from: new Date(common.ts[0]).toISOString().slice(0, 10),
  meanPairwise: mean(offDiag), minPairwise: Math.min(...offDiag), maxPairwise: Math.max(...offDiag),
  firstEigenShare: eig[0] / eig.reduce((a, b) => a + b, 0),
  effectiveIndependentAssets: eig.reduce((a, b) => a + b, 0) ** 2 / eig.reduce((a, b) => a + b * b, 0)
};

// ---- 4. regime dependence: buy-and-hold by calendar year --------------------------------------------
out.regimes = [2021, 2022, 2023, 2024, 2025, 2026].map((y) => {
  const r = sets.map((s) => { const c = s.candles.filter((k) => new Date(k.t).getUTCFullYear() === y); return c.length > 30 ? c.at(-1)!.c / c[0].o - 1 : null; }).filter((x): x is number => x !== null);
  return { year: y, markets: r.length, medianBuyHold: r.sort((a, b) => a - b)[Math.floor(r.length / 2)], positive: r.filter((x) => x > 0).length };
});

// ---- 5. capital-tier feasibility (Coinbase taker preset; minimum order from preset — live minimums vary) ----
const btc = sets.find((s) => s.symbol === 'BTC-USD')!.candles;
const tiers = [...CAPITAL_TIERS];
const presets = ['coinbase_taker', 'kraken_taker', 'dex_solana', 'dex_ethereum_l1'] as const;
out.capitalTiers = {
  note: 'BTC daily, full stored history after warm-up; same rule at each account size. Rejected = orders below venue minimum or not covering 2x fixed cost.',
  singleMarket: presets.flatMap((k) => (['sma_cross', 'weekly_trend'] as StrategyFamily[]).map((f) => ({
    venue: k, family: f, byCapital: tiers.map((cap) => { const r = backtest(btc, { family: f, params: PARAM_GRID[f][0] }, { start: 300, end: btc.length, cost: COST_PRESETS[k], capitalUsd: cap }); return { capitalUsd: cap, netReturn: +r.netReturn.toFixed(4), trades: r.trades.length, rejectedOrders: r.rejectedOrders, costSharePct: +(100 * r.totalCostUsd / cap).toFixed(1) }; })
  }))),
  crossSectional: presets.map((k) => ({
    venue: k, byCapital: tiers.map((cap) => { const w = simulateXs(sets, { lookback: 28, topK: 3, rebalance: 7 }, common.ts[60], common.ts.at(-1)!, COST_PRESETS[k], 0, cap); return { capitalUsd: cap, netReturn: +w.netReturn.toFixed(4), rejectedOrders: w.rejectedOrders, skippedTrims: w.skippedTrims, feasible: w.rejectedOrders === 0 }; })
  }))
};

writeFileSync('research/research-bottleneck-study.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify({ power: out.power, tradeCounts: out.tradeCounts, correlation: out.correlation, regimes: out.regimes }, null, 1));
