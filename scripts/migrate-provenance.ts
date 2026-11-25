// One-time, non-destructive migration (AUD-204): builds research/provenance.json from EVERY stored run record
// (research/runs/*.json), including evaluations later superseded in research/registry.json. Registry entries
// with no matching run record become windows=null records (treated as potentially contaminated).
// The registry itself is read, never modified. Refuses to overwrite an existing provenance file.
//   npx vite-node --config scripts/vite.node.config.ts scripts/migrate-provenance.ts
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { canonicalAsset, type ObservationRecord, type Provenance } from '../src/bot/provenance';

const R = (...p: string[]) => ['research', ...p].join('/');
if (existsSync(R('provenance.json'))) throw new Error('research/provenance.json exists: refusing to overwrite (append-only)');
const registry: Record<string, { runId: string }> = JSON.parse(readFileSync(R('registry.json'), 'utf8'));
const recs: ObservationRecord[] = [];
const covered = new Set<string>();
type Cut = { trainStart: number; trainEnd: number; valEnd: number; testEnd: number };
const win = (c: Cut) => ({ train: [c.trainStart, c.trainEnd - 1] as [number, number], validation: [c.trainEnd, c.valEnd - 1] as [number, number], test: [c.valEnd, c.testEnd - 1] as [number, number] });

for (const f of readdirSync(R('runs')).filter((x) => x.endsWith('.json')).sort()) {
  const r = JSON.parse(readFileSync(R('runs', f), 'utf8'));
  const gate = r.gates?.version ?? 'unknown';
  const base = String(r.runId).replace(/-(1h|1d)$/, '');
  for (const m of r.markets ?? []) {
    for (const c of m.candidates ?? []) {
      recs.push({
        id: `${r.runId}|single|${c.key}|${m.market.symbol}`, runId: r.runId, category: 'single', family: c.spec?.family ?? c.key.split('(')[0], key: c.key,
        venue: m.market.venue, markets: [m.market.symbol], assets: [canonicalAsset(m.market.symbol)], intervalMs: m.intervalMs, datasetIds: [m.datasetId],
        windows: c.periods ? { train: c.periods.train, validation: c.periods.validation, test: c.periods.test } : null,
        testOpened: !!c.test, gateVersion: gate, status: c.status, source: 'run-record'
      });
      covered.add(`${c.spec?.family}|${m.market.symbol}|${m.intervalMs}|${m.datasetId}`);
    }
  }
  const universe = (r.markets ?? []).filter((m: { quality: { stale: boolean } }) => !m.quality?.stale);
  const multi = (category: 'pooled' | 'xs', c: { key: string; spec?: { family: string }; cutoffs?: Cut; test?: unknown; status: string; markets?: string[] }) => {
    const markets: string[] = c.markets ?? universe.map((m: { market: { symbol: string } }) => m.market.symbol);
    recs.push({
      id: `${r.runId}|${category}|${c.key}|${markets.join(',')}`, runId: r.runId, category, family: category === 'xs' ? 'xs_momentum' : c.spec?.family ?? '', key: c.key,
      venue: universe[0]?.market.venue ?? 'coinbase', markets, assets: markets.map(canonicalAsset), intervalMs: universe[0]?.intervalMs ?? 0,
      datasetIds: universe.map((m: { datasetId: string }) => m.datasetId), windows: c.cutoffs ? win(c.cutoffs) : null,
      testOpened: !!c.test, gateVersion: gate, status: c.status, source: 'run-record'
    });
  };
  for (const c of r.pooled ?? []) multi('pooled', c);
  if (r.crossSectional) multi('xs', r.crossSectional);
  void base;
}
// registry-only entries (no run record found for a single-market key) → unreconstructable windows
let orphans = 0;
for (const [k, v] of Object.entries(registry)) {
  const [family, symbol, iv, id] = k.split('|');
  if (symbol === 'POOLED' || symbol === 'XS' || covered.has(`${family}|${symbol}|${iv}|${id}`)) continue;
  orphans++;
  recs.push({ id: `${v.runId}|single|${family}|${symbol}|orphan`, runId: v.runId, category: 'single', family, key: family, venue: 'coinbase', markets: [symbol], assets: [canonicalAsset(symbol)], intervalMs: Number(iv), datasetIds: [id], windows: null, testOpened: true, gateVersion: 'unknown', status: 'unknown', source: 'registry-only' });
}
const prov: Provenance = { version: 1, records: recs };
writeFileSync(R('provenance.json'), JSON.stringify(prov, null, 1));
console.log(JSON.stringify({ records: recs.length, withWindows: recs.filter((x) => x.windows).length, registryOnly: orphans, registryEntries: Object.keys(registry).length, testOpened: recs.filter((x) => x.testOpened).length }));
