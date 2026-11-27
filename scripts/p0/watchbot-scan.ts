// Watchbot v2 opportunity screen on the stored daily data (no network). Writes research/watchbot/scan-latest.json.
//   npx vite-node --config scripts/vite.node.config.ts scripts/p0/watchbot-scan.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { rankMarkets, scanMarket, SCAN_POLICY } from '../../src/bot/opportunityScanner';
import type { Candle } from '../../src/bot/types';

const MARKETS = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'DOGE-USD', 'ADA-USD', 'AVAX-USD', 'LINK-USD', 'LTC-USD', 'DOT-USD'];
const load = (s: string): Candle[] => gunzipSync(readFileSync(`research/data/coinbase_${s}_1d.csv.gz`)).toString().trim().split('\n').slice(1).map((l) => { const [t, o, h, lo, c, v] = l.split(',').map(Number); return { t, o, h, l: lo, c, v }; });
const fwd = new Set(JSON.parse(readFileSync('research/forward/registration.json', 'utf8')).rules.flatMap((r: { markets: string[] }) => r.markets));
const data = Object.fromEntries(MARKETS.map((m) => [m, load(m)]));
const lastT = Math.max(...Object.values(data).map((k) => k[k.length - 1].t));
const now = lastT + 86_400_000 + 3_600_000; // one hour after the last stored daily bar closed (reproducible)
const out: Record<string, unknown> = { generatedAt: new Date().toISOString(), evaluatedAtMs: now, policy: SCAN_POLICY, note: 'Rank = economic headroom (typical weekly move / stressed break-even). Not an expected return, not a signal.' };
for (const capital of [100, 1000]) {
  const rows = rankMarkets(MARKETS.map((m) => scanMarket({ symbol: m, venue: 'coinbase', region: 'US', daily: data[m], forwardRegistered: fwd.has(m) }, capital, now)));
  out[`capital_${capital}`] = rows;
  console.log(`$${capital}:`, rows.map((r) => `${r.symbol} ${r.status === 'rejected' ? 'REJ(' + r.blocking.length + ')' : 'ok'} h=${r.headroom?.toFixed(2) ?? '-'}`).join(' | '));
}
writeFileSync('research/watchbot/scan-latest.json', JSON.stringify(out, null, 1));
for (const x of (out.capital_1000 as ReturnType<typeof rankMarkets>).filter((y) => y.status === 'rejected')) console.log(x.symbol, x.blocking);
