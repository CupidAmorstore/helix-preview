// P0 controlled research laboratory (DIAGNOSTIC — inspected history only; nothing here can qualify a strategy).
// 1) failure registry: classifies every diagnosed candidate (zero cost vs real cost vs exposure-matched passive)
// 2) regime reliability: point-in-time labels vs subsequent 30-day returns, persistence, stress consequences
// 3) maker study: candle-based fill model for weekly_trend entries (UNVERIFIED by construction)
// 4) mandatory benchmarks per market: cash, buy-and-hold after costs, random-entry control at matched exposure
//   npx vite-node --config scripts/vite.node.config.ts scripts/p0/research-lab.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { classifyFailure, CORRECTIVE, noveltyCheck, FAMILY_FINGERPRINT, type FailureRecord } from '../../src/bot/failureRegistry';
import { assetRegime, marketRegime } from '../../src/bot/regime';
import { makerStudy } from '../../src/bot/maker';
import { buildSignal } from '../../src/bot/strategies';
import { contractFor, replay } from '../../src/bot/execution';
import { COST_PRESETS } from '../../src/bot/costs';
import { mulberry32 } from '../../src/bot/stats';
import type { Candle, StrategyFamily } from '../../src/bot/types';

const DAY = 86_400_000;
const MARKETS = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'DOGE-USD', 'ADA-USD', 'AVAX-USD', 'LINK-USD', 'LTC-USD', 'DOT-USD'];
const load = (s: string): Candle[] => gunzipSync(readFileSync(`research/data/coinbase_${s}_1d.csv.gz`)).toString().trim().split('\n').slice(1).map((l) => { const [t, o, h, lo, c, v] = l.split(',').map(Number); return { t, o, h, l: lo, c, v }; });
const contiguous = (k: Candle[]) => { let s = 0; for (let i = 1; i < k.length; i++) if (k[i].t - k[i - 1].t !== DAY) s = i; return k.slice(s); };
const data = Object.fromEntries(MARKETS.map((m) => [m, contiguous(load(m))]));

// 1) failure registry ------------------------------------------------------------------------------------------
const diag = JSON.parse(readFileSync('research/p0/execution-diagnostic.json', 'utf8'));
const registry = JSON.parse(readFileSync('research/registry.json', 'utf8')) as Record<string, { status: string; reasons: string[]; runId: string }>;
const failures: FailureRecord[] = diag.rows.map((r: Record<string, any>) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const [family, market, iv] = r.id.split('|');
  const reg = Object.entries(registry).filter(([k]) => k.startsWith(`${family}|${market}|${iv}|`)).map(([, v]) => v).pop();
  const reasons = reg?.reasons ?? [];
  const gross = r['next_open|zero|mark'].pnl, net = r['next_open|real|liquidate'].pnl;
  const { categories, primary } = classifyFailure({ grossPnlUsd: gross, netPnlUsd: net, passivePnlUsd: r.passiveExposureMatchedPnl, trades: r['next_open|real|liquidate'].trades, minTrades: 15, registryReasons: reasons });
  return {
    id: `F-${r.id}`, hypothesisId: family, family, version: 'gates-v3 / exec-v1 replay', params: r.spec.params,
    dataset: { market, intervalMs: +iv, window: [0, 0], kind: 'validation' }, costPreset: 'coinbase_taker',
    grossPnlUsd: +gross.toFixed(2), netPnlUsd: +net.toFixed(2), passiveExposureMatchedPnlUsd: +r.passiveExposureMatchedPnl.toFixed(2), trades: r['next_open|real|liquidate'].trades,
    categories, primaryCause: primary, confirmed: true, limitations: ['validation window already inspected', 'single path; no point-in-time universe', 'legacy 60 bps cost (verified fees are higher → conservative for rejection)'],
    correctiveAction: CORRECTIVE[primary].action, retestEligible: CORRECTIVE[primary].retest
  } satisfies FailureRecord;
});
const byCause: Record<string, number> = {};
for (const f of failures) byCause[f.primaryCause] = (byCause[f.primaryCause] ?? 0) + 1;
const anyCat: Record<string, number> = {};
for (const f of failures) for (const c of f.categories) anyCat[c] = (anyCat[c] ?? 0) + 1;
const novelty = Object.fromEntries((Object.keys(FAMILY_FINGERPRINT) as StrategyFamily[]).map((f) => [f, noveltyCheck(FAMILY_FINGERPRINT[f], failures)]));
writeFileSync('research/p0/failure-registry.json', JSON.stringify({ generatedAt: new Date().toISOString(), n: failures.length, primaryCauseCounts: byCause, categoryCounts: anyCat, noveltyGuard: novelty, failures }, null, 1));
console.log('failures', failures.length, byCause, anyCat);
console.log('novelty: families still allowed without new information:', Object.entries(novelty).filter(([, v]) => v.allowed).map(([k]) => k));

// 2) regime reliability ------------------------------------------------------------------------------------------
const H = 30;
const stats: Record<string, { n: number; fwd: number[]; same7: number }> = {};
for (const m of MARKETS) {
  const k = data[m];
  for (let i = 365; i + H < k.length; i++) {
    const r = assetRegime(k, i)!;
    const r7 = i + 7 < k.length ? assetRegime(k, i + 7) : null;
    const s = (stats[r.trend] ??= { n: 0, fwd: [], same7: 0 });
    s.n++; s.fwd.push(k[i + H].c / k[i].c - 1); if (r7?.trend === r.trend) s.same7++;
  }
}
const med = (x: number[]) => { const y = [...x].sort((a, b) => a - b); return y[Math.floor(y.length / 2)]; };
const regimeTable = Object.fromEntries(Object.entries(stats).map(([k, s]) => [k, { n: s.n, meanFwd30d: s.fwd.reduce((a, b) => a + b, 0) / s.n, medianFwd30d: med(s.fwd), shareUp: s.fwd.filter((x) => x > 0).length / s.n, persistence7d: s.same7 / s.n }]));
// market stress days
const days = data['BTC-USD'].map((b) => b.t).filter((t) => MARKETS.every((m) => data[m].some((b) => b.t === t)));
let stressDays = 0; const fwdStress: number[] = [], fwdOther: number[] = [];
for (let d = 0; d + H < days.length; d += 3) {
  const mr = marketRegime(data, days[d]);
  const basket = MARKETS.map((m) => { const k = data[m]; const i = k.findIndex((b) => b.t === days[d]); return k[i + H] ? k[i + H].c / k[i].c - 1 : 0; });
  const avg = basket.reduce((a, b) => a + b, 0) / basket.length;
  if (mr.stress) { stressDays++; fwdStress.push(avg); } else fwdOther.push(avg);
}
const mean = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : NaN);
console.log('regime', regimeTable, { stressSamples: stressDays, fwd30AfterStress: mean(fwdStress), fwd30Otherwise: mean(fwdOther) });

// 3) maker study (Kraken verified fees: maker 40, taker 80) -------------------------------------------------------------
const maker = MARKETS.map((m) => {
  const k = data[m];
  const sig = buildSignal({ family: 'weekly_trend', params: { n: 200, period: 7 } }, k);
  const entries: number[] = []; let pos: 0 | 1 = 0;
  for (let i = 0; i < k.length; i++) { const w = sig(i, pos); if (w === 1 && pos === 0 && i > 200) entries.push(i); pos = w; }
  return { market: m, ...makerStudy(k, entries, { offsetBps: 10, waitBars: 1, throughBps: 5, onMiss: 'taker' }, 40, 80, 7) };
});
console.log('maker', maker.map((x) => `${x.market}: n=${x.decisions} fill ${(x.fillRate * 100).toFixed(0)}% adverse ${x.adverseSelectionBps.toFixed(0)}bps net ${x.netBenefitBpsPerDecision.toFixed(0)}bps`).join(' | '));

// 4) mandatory benchmarks on the last 365 days (already inspected; diagnostic) ------------------------------------------
const rnd = mulberry32(99);
const bench = MARKETS.map((m) => {
  const k = data[m]; const start = k.length - 365;
  const cost = COST_PRESETS.coinbase_taker_us_2026_09;
  const bh = replay(k, () => 1, contractFor(cost, DAY), start, k.length, 1000).netReturn;
  const mom = replay(k, { family: 'ts_momentum', params: { lookback: 168, threshold: 0 } }, contractFor(cost, DAY), start, k.length, 1000);
  // random-entry control: same number of round trips and exposure as momentum, random timing (200 draws)
  const draws: number[] = [];
  for (let d = 0; d < 200; d++) { const on = new Set<number>(); const hold = Math.max(1, Math.round(mom.exposure * 365)); const s0 = start + Math.floor(rnd() * Math.max(1, 365 - hold)); for (let i = s0; i < s0 + hold; i++) on.add(i); draws.push(replay(k, (i) => (on.has(i) ? 1 : 0), contractFor(cost, DAY), start, k.length, 1000).netReturn); }
  draws.sort((a, b) => a - b);
  return { market: m, cash: 0, buyHoldNet: bh, simpleMomentumNet: mom.netReturn, momentumExposure: mom.exposure, randomEntryMedian: draws[100], randomEntryP90: draws[180] };
});
console.log('benchmarks', bench.map((b) => `${b.market} B&H ${(b.buyHoldNet * 100).toFixed(0)}% mom ${(b.simpleMomentumNet * 100).toFixed(0)}% rnd-med ${(b.randomEntryMedian * 100).toFixed(0)}%`).join(' | '));

writeFileSync('research/p0/research-lab.json', JSON.stringify({ generatedAt: new Date().toISOString(), note: 'Diagnostic on already-inspected history. Cannot qualify anything.', regime: { horizonDays: H, table: regimeTable, stress: { samples: stressDays, fwd30AfterStress: mean(fwdStress), fwd30Otherwise: mean(fwdOther) } }, maker, benchmarks: bench }, null, 1));
