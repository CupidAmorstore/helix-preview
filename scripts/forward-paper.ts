// Forward paper-trading runner (PAPER ONLY). Reads research/forward/registration.json; does nothing unless the
// owner has set status 'active' with a startAt. Uses the stored datasets (refresh them with `npm run bot:research
// -- --watch-only`). Writes research/forward/report.json.
//   npx vite-node --config scripts/vite.node.config.ts scripts/forward-paper.ts            # evaluate
//   npx vite-node --config scripts/vite.node.config.ts scripts/forward-paper.ts --hash     # print rules hash
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { evaluateForward, registrationHash, type ForwardRegistration } from '../src/bot/forward';
import { COST_PRESETS } from '../src/bot/costs';
import type { Candle } from '../src/bot/types';

const f = 'research/forward/registration.json';
const reg: ForwardRegistration = JSON.parse(readFileSync(f, 'utf8'));
if (process.argv.includes('--hash')) { console.log(registrationHash(reg)); process.exit(0); }
const load = (sym: string, iv: number): Candle[] => {
  const p = `research/data/coinbase_${sym}_${iv === 86_400_000 ? '1d' : '1h'}.csv.gz`;
  if (!existsSync(p)) return [];
  return gunzipSync(readFileSync(p)).toString().trim().split('\n').slice(1).map((l) => { const [t, o, h, lo, c, v] = l.split(',').map(Number); return { t, o, h, l: lo, c, v }; });
};
const data: Record<string, Candle[]> = {};
for (const r of reg.rules) for (const m of r.markets) data[m] ??= load(m, r.intervalMs);
const cost = COST_PRESETS[reg.costPreset];
if (!cost) throw new Error(`unknown cost preset ${reg.costPreset}`);
const rep = evaluateForward(reg, data, cost, Date.now());
writeFileSync('research/forward/report.json', JSON.stringify({ ...rep, results: rep.results.map(({ equity, ...x }) => ({ ...x, equityPoints: equity.length })) }, null, 1));
console.log(rep.state, rep.problems.join(' | ') || '', rep.results.map((r) => `${r.ruleId}: ${r.status}, ${r.forwardMonths} months, net ${(r.netReturn * 100).toFixed(1)}%`).join('; '));
