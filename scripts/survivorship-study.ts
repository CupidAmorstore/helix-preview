// Survivorship-bias study. The research universe is 10 large coins chosen today (survivors). Coinbase still
// serves history for many DELISTED markets, so we can measure how much "survivors only" flatters each rule.
// Outputs: research/universe-snapshot-<date>.json (all USD products + status, hashed) and
//          research/survivorship-study.json. Public data only; no orders.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fetchCoinbaseCandles } from '../src/bot/sources';
import { backtest } from '../src/bot/backtest';
import { COST_PRESETS } from '../src/bot/costs';
import { warmup } from '../src/bot/strategies';
import type { Candle, StrategyFamily } from '../src/bot/types';
import summary from '../src/bot/data/latest.json';

const DAY = 86_400_000;
const STABLE = new Set(['USDT', 'USDC', 'DAI', 'GUSD', 'PAX', 'USDP', 'BUSD', 'PYUSD', 'EURC', 'UST', 'TUSD', 'FDUSD', 'WBTC', 'CBETH']);
const SURVIVORS = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'LTC', 'DOT'];
const MAX_DELISTED = Number(process.argv[2] ?? 30);

type Product = { id: string; base_currency: string; quote_currency: string; status: string; trading_disabled: boolean };

async function main() {
  const day = new Date().toISOString().slice(0, 10);
  const products = (await (await fetch('https://api.exchange.coinbase.com/products')).json()) as Product[];
  const usd = products.filter((p) => p.quote_currency === 'USD').map((p) => ({ id: p.id, base: p.base_currency, status: p.status, tradingDisabled: p.trading_disabled })).sort((a, b) => a.id.localeCompare(b.id));
  const snapText = JSON.stringify(usd);
  const snapshot = { takenAt: new Date().toISOString(), source: 'https://api.exchange.coinbase.com/products', sha256: createHash('sha256').update(snapText).digest('hex'), counts: usd.reduce<Record<string, number>>((a, p) => ((a[p.status] = (a[p.status] ?? 0) + 1), a), {}), products: usd };
  mkdirSync('research', { recursive: true });
  writeFileSync(`research/universe-snapshot-${day}.json`, JSON.stringify(snapshot, null, 1));
  console.log('universe snapshot', snapshot.counts, snapshot.sha256.slice(0, 12));

  const delisted = usd.filter((p) => p.status === 'delisted' && !STABLE.has(p.base)).map((p) => p.id);
  const start = Date.UTC(2018, 0, 1);
  const end = Date.now();
  const load = async (id: string): Promise<Candle[]> => {
    try {
      const c = await fetchCoinbaseCandles(id, 86400, start, end, undefined, 150);
      const m = new Map(c.map((k) => [k.t, k]));
      return [...m.values()].sort((a, b) => a.t - b.t).filter((k) => k.t + DAY <= end); // completed bars only
    } catch {
      return [];
    }
  };
  const sets: { id: string; group: 'survivor' | 'delisted'; candles: Candle[] }[] = [];
  for (const b of SURVIVORS) sets.push({ id: `${b}-USD`, group: 'survivor', candles: await load(`${b}-USD`) });
  for (const id of delisted) {
    if (sets.filter((s) => s.group === 'delisted').length >= MAX_DELISTED) break;
    const c = await load(id);
    if (c.length >= 365) sets.push({ id, group: 'delisted', candles: c });
    process.stdout.write('.');
  }
  console.log(`\nloaded ${sets.filter((s) => s.group === 'survivor').length} survivors, ${sets.filter((s) => s.group === 'delisted').length} delisted (≥365 daily bars)`);

  // the rule each family would trade: its pooled daily configuration from the last research run
  const pooled = summary.runs.flatMap((r) => r.pooled ?? []).filter((c) => c.key.startsWith('POOLED:') && !c.key.includes('XS_MOMENTUM') && (summary.runs.find((r) => (r.pooled ?? []).includes(c))?.markets[0]?.intervalMs === DAY));
  const specs = pooled.map((c) => {
    const m = c.key.slice('POOLED:'.length).match(/^(\w+)\((.*)\)$/)!;
    const params = Object.fromEntries(m[2].split(',').filter(Boolean).map((kv) => { const [k, v] = kv.split('='); return [k, Number(v)]; }));
    return { family: m[1] as StrategyFamily, params };
  });
  const cost = COST_PRESETS.coinbase_taker;
  const stats = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return { n: xs.length, mean: xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length), median: s[Math.floor(s.length / 2)] ?? NaN };
  };
  const rows = specs.map((spec) => {
    const per = (g: 'survivor' | 'delisted') => sets.filter((s) => s.group === g && s.candles.length > warmup(spec) + 30).map((s) => backtest(s.candles, spec, { start: warmup(spec), end: s.candles.length, cost, capitalUsd: 1000 }).netReturn);
    const sv = stats(per('survivor'));
    const dl = stats(per('delisted'));
    return { family: spec.family, params: spec.params, survivors: sv, delisted: dl, gapMean: sv.mean - dl.mean };
  });
  const bh = (g: 'survivor' | 'delisted') => stats(sets.filter((s) => s.group === g).map((s) => s.candles[s.candles.length - 1].c / s.candles[0].o - 1));
  const out = {
    generatedAt: new Date().toISOString(),
    universeSnapshot: `research/universe-snapshot-${day}.json`,
    costPerSideBps: cost.takerFeeBps + cost.halfSpreadBps + cost.slippageBps,
    markets: sets.map((s) => ({ id: s.id, group: s.group, bars: s.candles.length, from: new Date(s.candles[0]?.t ?? 0).toISOString().slice(0, 10), to: new Date(s.candles[s.candles.length - 1]?.t ?? 0).toISOString().slice(0, 10) })),
    buyHold: { survivors: bh('survivor'), delisted: bh('delisted') },
    families: rows,
    note: 'Full-life backtests with each family\'s pooled daily parameters. Not a validation run: no splits, used only to measure how much a survivors-only universe flatters results.'
  };
  writeFileSync('research/survivorship-study.json', JSON.stringify(out, null, 1));
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  console.log(`buy&hold mean: survivors ${pct(out.buyHold.survivors.mean)} (n=${out.buyHold.survivors.n}) vs delisted ${pct(out.buyHold.delisted.mean)} (n=${out.buyHold.delisted.n})`);
  for (const r of rows) console.log(`${r.family.padEnd(26)} survivors mean ${pct(r.survivors.mean).padStart(8)} median ${pct(r.survivors.median).padStart(8)} | delisted mean ${pct(r.delisted.mean).padStart(8)} median ${pct(r.delisted.median).padStart(8)} | gap ${pct(r.gapMean)}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
