// Which holding horizons can plausibly overcome the modelled round-trip cost? For each market and horizon h,
// the median absolute log return over h is compared with the round-trip cost. A strategy must capture a
// meaningful fraction of a typical move just to break even. Reads only the stored, hashed datasets.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { COST_PRESETS, sideCostFrac } from '../src/bot/costs';

const dir = 'research/data';
const rt = 2 * sideCostFrac(COST_PRESETS.coinbase_taker);
const rows: { market: string; interval: string; horizon: string; bars: number; medianAbsMove: number; moveToCost: number }[] = [];
const horizons: Record<string, [string, number][]> = {
  '1h': [['1h', 1], ['4h', 4], ['12h', 12], ['1d', 24], ['3d', 72]],
  '1d': [['1d', 1], ['3d', 3], ['1w', 7], ['2w', 14], ['1m', 30], ['3m', 90]]
};
for (const f of readdirSync(dir).filter((x) => x.endsWith('.csv.gz'))) {
  const m = f.match(/coinbase_(.+)_(1h|1d)\.csv\.gz$/);
  if (!m) continue;
  const closes = gunzipSync(readFileSync(`${dir}/${f}`)).toString().trim().split('\n').slice(1).map((l) => Number(l.split(',')[4])).filter((x) => x > 0);
  for (const [label, h] of horizons[m[2]]) {
    const moves: number[] = [];
    for (let i = h; i < closes.length; i += h) moves.push(Math.abs(Math.log(closes[i] / closes[i - h])));
    moves.sort((a, b) => a - b);
    const med = moves[Math.floor(moves.length / 2)] ?? 0;
    rows.push({ market: m[1], interval: m[2], horizon: label, bars: closes.length, medianAbsMove: med, moveToCost: med / rt });
  }
}
const summary: Record<string, { medianMovePct: number; moveToCost: number }> = {};
for (const h of [...new Set(rows.map((r) => r.horizon))]) {
  const r = rows.filter((x) => x.horizon === h).map((x) => x.medianAbsMove).sort((a, b) => a - b);
  const med = r[Math.floor(r.length / 2)];
  summary[h] = { medianMovePct: +(med * 100).toFixed(2), moveToCost: +(med / rt).toFixed(2) };
}
writeFileSync('research/cost-horizon-study.json', JSON.stringify({ generatedAt: new Date().toISOString(), roundTripCostPct: +(rt * 100).toFixed(2), costSource: COST_PRESETS.coinbase_taker.provenance, summaryAcrossMarkets: summary, rows }, null, 1));
console.log(`round-trip cost ${(rt * 100).toFixed(2)}%`);
for (const [h, v] of Object.entries(summary)) console.log(`${h.padEnd(4)} median |move| ${String(v.medianMovePct).padStart(6)}%  = ${v.moveToCost}x round-trip cost`);
