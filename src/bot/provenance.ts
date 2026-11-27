// AUD-204 — unified observation-provenance registry.
//
// Every evaluation (single market, pooled, cross-sectional) records WHICH calendar observations of WHICH
// canonical assets it inspected, and in which role (training / validation / opened test). A new candidate's
// out-of-sample window is checked against ALL earlier records, across categories, timeframes and dataset
// refreshes: hourly and daily bars of BTC over the same weeks are the same price path; a refreshed dataset
// (new hash) over the same period is not fresh evidence; BTC-USD, BTC-USDT and WBTC are one asset.
//
//   direct   — an earlier record inspected (validation or opened test) observations that overlap the new
//              candidate's validation+test period on a shared asset        → blocks qualification
//   unknown  — an earlier record on a shared asset whose windows cannot be reconstructed: treated as
//              potentially contaminated                                    → blocks qualification
//   indirect — an earlier record used overlapping observations only for training (parameter selection),
//              or overlaps only through correlated assets in the same portfolio run → disclosed, not blocking
//
// Records are append-only. The legacy registry (research/registry.json) is never rewritten or erased.

export type Window = [number, number]; // [from, to] epoch ms, inclusive bar timestamps

export type ObservationRecord = {
  id: string;
  runId: string;
  category: 'single' | 'pooled' | 'xs';
  family: string;
  key: string;
  venue: string;
  markets: string[];
  assets: string[];
  intervalMs: number;
  datasetIds: string[];
  datasetSha256?: string[];
  windows: { train: Window; validation: Window; test: Window } | null;
  testOpened: boolean;
  gateVersion: string;
  status: string;
  source: 'run-record' | 'registry-only' | 'live';
};

export type Provenance = { version: 1; records: ObservationRecord[] };

/** Wrapped and liquid-staking tokens that track another asset's price path. */
const ALIASES: Record<string, string> = { WBTC: 'BTC', CBBTC: 'BTC', TBTC: 'BTC', WETH: 'ETH', CBETH: 'ETH', STETH: 'ETH', WSTETH: 'ETH', RETH: 'ETH', MSOL: 'SOL', JITOSOL: 'SOL', BSOL: 'SOL' };
const QUOTES = ['USD', 'USDT', 'USDC', 'EUR', 'GBP', 'BTC', 'ETH'];

/** 'BTC-USD' | 'BTC/USDT' | 'btcusdt' | 'WBTC' → 'BTC'. Pseudo-markets (POOLED, XS) return ''. */
export function canonicalAsset(symbol: string): string {
  const s = symbol.toUpperCase().trim();
  if (!s || s === 'POOLED' || s === 'XS') return '';
  let base = s.split(/[-/_:]/)[0];
  if (ALIASES[base]) return ALIASES[base];
  if (base === s) for (const q of QUOTES) if (s.length > q.length && s.endsWith(q)) { base = s.slice(0, -q.length); break; }
  return ALIASES[base] ?? base;
}

const overlaps = (a: Window, b: Window) => a[0] <= b[1] && b[0] <= a[1];

export type Exposure = { direct: ObservationRecord[]; indirect: ObservationRecord[]; unknown: ObservationRecord[] };

export function exposureFor(prov: Provenance | null | undefined, q: { assets: string[]; oos: Window }): Exposure {
  const out: Exposure = { direct: [], indirect: [], unknown: [] };
  if (!prov) return out;
  const mine = new Set(q.assets.map(canonicalAsset).filter(Boolean));
  for (const r of prov.records) {
    if (!r.assets.some((a) => mine.has(a))) continue;
    if (!r.windows) { out.unknown.push(r); continue; }
    const inspected = overlaps(q.oos, r.windows.validation) || (r.testOpened && overlaps(q.oos, r.windows.test));
    if (inspected) out.direct.push(r);
    else if (overlaps(q.oos, r.windows.train)) out.indirect.push(r);
  }
  return out;
}

export const EXPOSURE_REASON = (e: Exposure) =>
  `out-of-sample period already inspected: ${e.direct.length} direct and ${e.unknown.length} unreconstructable earlier evaluation(s) ` +
  `on these assets (any timeframe/category): not fresh evidence, needs forward paper results before qualifying`;

/** Demotes a qualified candidate whose out-of-sample observations were already inspected. */
export function guardExposure<T extends { status: string; rejectionReasons: string[] }>(rep: T, e: Exposure): T {
  if (rep.status === 'qualified_paper_strategy' && (e.direct.length > 0 || e.unknown.length > 0)) {
    return { ...rep, status: 'backtested_candidate', rejectionReasons: [...rep.rejectionReasons, EXPOSURE_REASON(e)] };
  }
  return rep;
}

export function emptyProvenance(): Provenance {
  return { version: 1, records: [] };
}
