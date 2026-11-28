// Writes research/experimental/strategy-status.json from the archived admission screen plus explicit owner decisions.
//   npx vite-node --config scripts/vite.node.config.ts scripts/p0/strategy-status.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { statusFromScreen, type StrategyStatus } from '../../src/bot/strategyStatus';

const report = JSON.parse(readFileSync('research/experimental/screen-2026-11-27/admission-report.json', 'utf8')) as {
  results: { key: string; state: string; reasons: string[]; spec: { family: string; params: Record<string, number> } | null }[];
};
// Owner decisions (2026-11-27). Explicit overrides win over the mechanical screen mapping.
const overrides: Record<string, { status: StrategyStatus; source: string; note: string }> = {
  'sma_cross|LINK-USD|3600000|3e2e8e14-8754': { status: 'insufficient_evidence', source: 'owner_deferred', note: 'hourly, cost-dominated; preserved for later investigation' },
  'sma_cross|ADA-USD|3600000|5b1824c9-8754': { status: 'insufficient_evidence', source: 'owner_deferred', note: 'hourly, cost-dominated; preserved for later investigation' },
  'vol_compression_breakout|SOL-USD|86400000|9ba1194d-1984': { status: 'insufficient_evidence', source: 'owner_watchlist', note: 'single validation trade: extremely weak evidence; research watchlist only' },
  'bollinger_reversion|XRP-USD|86400000|0f197877-1285': { status: 'approved_experimental_paper', source: 'owner_approved', note: 'experimental paper account E1 (separate $1,000 simulated account)' },
  'rsi_reversion|ETH-USD|86400000|d42a807a-2189': { status: 'approved_experimental_paper', source: 'owner_approved', note: 'experimental paper account E2 (separate $1,000 simulated account)' }
};
const rows = report.results.map((r) => {
  const o = overrides[r.key];
  return { candidate: r.key, screenState: r.state, status: o?.status ?? statusFromScreen(r), source: o?.source ?? 'screen', note: o?.note ?? r.reasons.join('; ') };
});
// An approved candidate becomes 'collecting' once its registration is active (checked from the registration files).
for (const [file, key] of [['research/forward/registration-e1.json', 'bollinger_reversion|XRP-USD|86400000|0f197877-1285'], ['research/forward/registration-e2.json', 'rsi_reversion|ETH-USD|86400000|d42a807a-2189']] as const) {
  const reg = JSON.parse(readFileSync(file, 'utf8')) as { status: string };
  const row = rows.find((r) => r.candidate === key);
  if (row && reg.status === 'active') { row.status = 'collecting_forward_evidence'; row.source = 'owner_approved_and_activated'; row.note = `experimental paper account ${file.split('/').pop()}; active from 2026-11-28 00:00 UTC`; }
}
const out = {
  generatedAt: new Date().toISOString(),
  scope: 'evidence status only; no status permits real money (real-money permitted = false for every status)',
  statusCounts: rows.reduce<Record<string, number>>((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {}),
  rows
};
writeFileSync('research/experimental/strategy-status.json', JSON.stringify(out, null, 1) + '\n');
console.log(out.statusCounts);
