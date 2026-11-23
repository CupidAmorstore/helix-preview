// False-positive study: how often does the validation pipeline "qualify" a strategy on data with NO edge?
// Random walks (zero drift), daily bars, costs set to ~0 (hardest case for the gates), alpha NOT corrected.
import { writeFileSync } from 'node:fs';
import { evaluateFamily } from '../src/bot/validation';
import { evaluateCrossSectional } from '../src/bot/crossSectional';
import { PARAM_GRID } from '../src/bot/strategies';
import { COST_PRESETS } from '../src/bot/costs';
import type { Candle, StrategyFamily } from '../src/bot/types';

const DAY = 86_400_000;
function walk(n: number, seed: number, vol = 0.03): Candle[] {
  let s = seed >>> 0;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const g = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
  let p = 100;
  return Array.from({ length: n }, (_, i) => {
    const o = p;
    p = p * Math.exp(vol * g());
    return { t: Date.UTC(2019, 0, 1) + i * DAY, o, h: Math.max(o, p) * 1.002, l: Math.min(o, p) * 0.998, c: p, v: 1 };
  });
}
const seeds = Number(process.argv[2] ?? 60);
const cost = { ...COST_PRESETS.coinbase_taker, takerFeeBps: 0.5, halfSpreadBps: 0, slippageBps: 0 };
const fams = Object.keys(PARAM_GRID) as StrategyFamily[];
const out: Record<string, { tests: number; reachedTest: number; qualified: number }> = {};
for (const f of fams) {
  out[f] = { tests: 0, reachedTest: 0, qualified: 0 };
  for (let k = 0; k < seeds; k++) {
    const rep = evaluateFamily(walk(2000, 1000 + k * 7919), f, cost, 1);
    out[f].tests++;
    if (rep.test) out[f].reachedTest++;
    if (rep.status === 'qualified_paper_strategy') out[f].qualified++;
  }
  console.log(f, out[f]);
}
out.xs_momentum = { tests: 0, reachedTest: 0, qualified: 0 };
for (let k = 0; k < Math.ceil(seeds / 3); k++) {
  const u = [0, 1, 2, 3, 4, 5].map((j) => ({ symbol: `R${j}`, candles: walk(2000, 50_000 + k * 101 + j) }));
  const rep = evaluateCrossSectional(u, cost, DAY, 1);
  out.xs_momentum.tests++;
  if (rep.test) out.xs_momentum.reachedTest++;
  if (rep.status === 'qualified_paper_strategy') out.xs_momentum.qualified++;
}
console.log('xs_momentum', out.xs_momentum);
const total = Object.values(out).reduce((a, x) => ({ tests: a.tests + x.tests, q: a.q + x.qualified, rt: a.rt + x.reachedTest }), { tests: 0, q: 0, rt: 0 });
console.log(`TOTAL tests=${total.tests} reachedTest=${total.rt} qualified=${total.q} (false-positive rate ${(100 * total.q / total.tests).toFixed(2)}%)`);
writeFileSync('research/null-study.json', JSON.stringify({ generatedAt: new Date().toISOString(), seedsPerFamily: seeds, costBpsPerSide: 0.5, alphaCorrection: 'none (N=1)', results: out, total }, null, 1));
