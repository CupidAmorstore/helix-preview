import type { CostModel, Dataset, StrategyFamily } from './types';
import { validateCandles } from './candles';
import { PARAM_GRID, familyAllowed } from './strategies';
import { CandidateReport, GATES, PooledReport, evaluateFamily, evaluatePooled } from './validation';
import { fnv1a } from './candles';
import { classifyRegime, scoreDataQuality, DataQuality, Regime } from './watchbot';
import { COST_PRESETS } from './costs';
import { accountFeasibility, DEFAULT_RISK, Feasibility } from './risk';
import { evaluateCrossSectional, XsReport } from './crossSectional';
import { canonicalAsset, exposureFor, guardExposure, type ObservationRecord, type Provenance } from './provenance';

export const ALL_FAMILIES = Object.keys(PARAM_GRID) as StrategyFamily[];
export const ACCOUNT_SIZES = [20, 50, 100, 250, 500, 1000];

export type MarketResult = {
  datasetId: string;
  market: Dataset['market'];
  intervalMs: number;
  quality: DataQuality;
  regime: Regime | null;
  cost: CostModel;
  candidates: CandidateReport[];
  skipped: { family: StrategyFamily; reason: string }[];
};

export type RunRecord = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  codeVersion: string;
  gates: typeof GATES;
  riskPolicy: typeof DEFAULT_RISK;
  assumptions: string[];
  markets: MarketResult[];
  /** one rule across all eligible markets of this interval (common calendar cut-offs) */
  pooled: PooledReport[];
  /** cross-sectional momentum portfolio over the same universe (daily only) */
  crossSectional?: XsReport;
  totals: {
    markets: number;
    marketsEvaluated: number;
    configsTried: number;
    oosCandidates: number;
    /** Bonferroni denominator: every candidate ever registered + this run's (cumulative, stricter) */
    bonferroniN?: number;
    qualified: number;
    rejected: number;
  };
  feasibility: Feasibility[];
};

/** registry entry key: strategy family × market × interval × dataset content hash */
export type Registry = Record<string, { runId: string; status: string; reasons: string[]; gates?: string }>;
export const registryKey = (family: string, datasetId: string, symbol: string, intervalMs: number) =>
  `${family}|${symbol}|${intervalMs}|${datasetId}`;

/**
 * How many earlier tests already looked at this market's recent history on this timeframe. Keyed by
 * market + interval, NOT dataset hash: a refreshed dataset (one new bar) has a new hash but a holdout that
 * overlaps almost entirely with the one already inspected, so it is not fresh evidence.
 */
export const priorHoldoutLooks = (registry: Registry, symbol: string, intervalMs: number) =>
  Object.keys(registry).filter((k) => {
    const [, sym, iv] = k.split('|');
    return sym === symbol && Number(iv) === intervalMs;
  }).length;

export const REUSED_HOLDOUT_REASON = (n: number) =>
  `recent history already inspected by ${n} earlier test(s) on this market/timeframe: not fresh evidence, needs forward paper results before qualifying`;

/** Result of scripts/survivorship-study.ts for one family (full-life backtests on delisted markets). */
export type SurvivorshipRow = { family: string; delisted: { n: number; median: number } };

/**
 * Survivorship gate: the research universe holds only coins that survived to today. A qualified candidate whose
 * family loses money (median) on delisted markets, or that has no delisted evidence at all, is not promoted.
 */
export function survivorshipGate<T extends { status: string; rejectionReasons: string[]; family?: string }>(rep: T, family: string, study: SurvivorshipRow[] | null): T {
  if (rep.status !== 'qualified_paper_strategy') return rep;
  const row = study?.find((r) => r.family === family);
  if (!row || row.delisted.n < 10) return { ...rep, status: 'backtested_candidate', rejectionReasons: [...rep.rejectionReasons, 'no survivorship evidence (delisted-market study missing or < 10 markets)'] };
  if (!(row.delisted.median >= 0)) return { ...rep, status: 'backtested_candidate', rejectionReasons: [...rep.rejectionReasons, `loses on delisted markets (median ${(row.delisted.median * 100).toFixed(1)}%, n=${row.delisted.n}): survivorship bias`] };
  return rep;
}

/** A candidate whose test window was already inspected can never qualify from that window alone. */
export function guardReusedHoldout<T extends { status: string; rejectionReasons: string[] }>(rep: T, looks: number): T {
  if (looks > 0 && rep.status === 'qualified_paper_strategy') {
    return { ...rep, status: 'backtested_candidate', rejectionReasons: [...rep.rejectionReasons, REUSED_HOLDOUT_REASON(looks)] };
  }
  return rep;
}

/**
 * One bounded research cycle over pre-fetched datasets.
 * DISCOVER (caller) → VALIDATE DATA → REGIME → HYPOTHESES (grid) → BACKTEST+COSTS → ROBUSTNESS → REJECT/ADVANCE.
 */
export function runResearchCycle(args: {
  datasets: Dataset[];
  costFor: (d: Dataset) => CostModel;
  nowMs: number;
  codeVersion: string;
  registry: Registry;
  minBars?: number;
  families?: StrategyFamily[];
  /** rows of research/survivorship-study.json; null/absent → no candidate can be promoted */
  survivorship?: SurvivorshipRow[] | null;
  /** unified observation provenance (AUD-204); records are appended, never removed */
  provenance?: Provenance | null;
}): { record: RunRecord; registry: Registry; provenance: Provenance } {
  // audit 4.5: one research cycle = one timeframe, one dataset per market identity
  const ivs = new Set(args.datasets.map((d) => d.intervalMs));
  if (ivs.size > 1) throw new Error(`mixed timeframes in one research cycle (${[...ivs].join(', ')} ms): partition by interval`);
  const ids = args.datasets.map((d) => `${d.market.venue}|${d.market.symbol}`.toUpperCase());
  const dup = ids.find((x, i) => ids.indexOf(x) !== i);
  if (dup) throw new Error(`duplicate market identity in one research cycle: ${dup}`);
  const venues = new Set(args.datasets.map((d) => `${canonicalAsset(d.market.symbol)}|${d.intervalMs}`));
  if (venues.size !== args.datasets.length) throw new Error('the same canonical asset appears twice in one research cycle (cross-venue duplicates must be evaluated separately)');
  const startedAt = new Date().toISOString();
  const runId = `run-${new Date(args.nowMs).toISOString().replace(/[:.]/g, '-')}`;
  const families = (args.families ?? ALL_FAMILIES).filter((f) => args.datasets.every((d) => familyAllowed(f, d.intervalMs)));
  const minBars = args.minBars ?? 1500;
  const registry = { ...args.registry };
  const prov: Provenance = { version: 1, records: [...(args.provenance?.records ?? [])] };
  const priorProv: Provenance | null = args.provenance ? { version: 1, records: [...args.provenance.records] } : null;
  const addRecord = (r: Omit<ObservationRecord, 'id' | 'gateVersion' | 'source' | 'runId'>) =>
    prov.records.push({ ...r, id: `${runId}|${r.category}|${r.key}|${r.markets.join(',')}`, runId, gateVersion: GATES.version, source: 'live' });

  // pre-pass: validate and count OOS candidates for the Bonferroni denominator (fixed before evaluating)
  const prepared = args.datasets.map((d) => {
    const v = validateCandles(d.candles, d.intervalMs, args.nowMs, 3);
    // use only the trailing contiguous run — gaps are never forward-filled
    const contiguous = v.candles.slice(v.trailingContiguousStart);
    const q = scoreDataQuality(v, minBars);
    const todo = families.filter((f) => !registry[registryKey(f, d.id, d.market.symbol, d.intervalMs)]);
    return { d, v, contiguous, q, todo };
  });
  const eligible = prepared.filter((p) => p.contiguous.length >= minBars && !p.q.stale);
  const intervalMs = args.datasets[0]?.intervalMs ?? 0;
  const pooledId = fnv1a(eligible.map((p) => p.d.id).sort().join('|'));
  const pooledTodo = eligible.length >= 3 ? families.filter((f) => !registry[registryKey(f, pooledId, 'POOLED', intervalMs)]) : [];
  const xsKey = registryKey('xs_momentum', pooledId, 'XS', intervalMs);
  const xsTodo = intervalMs === 86_400_000 && eligible.length >= 3 && !registry[xsKey];
  const oosCandidates = eligible.reduce((s, p) => s + p.todo.length, 0) + pooledTodo.length + (xsTodo ? 1 : 0);
  // Multiple-testing control across runs: count every candidate already in the registry too, so adding
  // families one run at a time cannot loosen the correction.
  const bonferroniN = Object.keys(args.registry).length + oosCandidates;

  const markets: MarketResult[] = prepared.map(({ d, contiguous, q, todo }) => {
    const barsPerYear = (365 * 86_400_000) / d.intervalMs;
    const cost = args.costFor(d);
    const res: MarketResult = {
      datasetId: d.id,
      market: d.market,
      intervalMs: d.intervalMs,
      quality: q,
      regime: classifyRegime(contiguous, barsPerYear),
      cost,
      candidates: [],
      skipped: []
    };
    for (const f of families) {
      if (!todo.includes(f)) {
        res.skipped.push({ family: f, reason: 'already evaluated on identical dataset (no new evidence)' });
        continue;
      }
      if (q.stale) {
        res.skipped.push({ family: f, reason: 'data stale' });
        continue;
      }
      if (contiguous.length < minBars) {
        res.skipped.push({ family: f, reason: `contiguous history ${contiguous.length} < ${minBars} bars` });
        continue;
      }
      const raw = evaluateFamily(contiguous, f, cost, bonferroniN);
      const exp = exposureFor(priorProv, { assets: [d.market.symbol], oos: [raw.periods.validation[0], raw.periods.test[1]] });
      const rep = survivorshipGate(guardExposure(guardReusedHoldout(raw, priorHoldoutLooks(args.registry, d.market.symbol, d.intervalMs)), exp), f, args.survivorship ?? null);
      res.candidates.push(rep);
      registry[registryKey(f, d.id, d.market.symbol, d.intervalMs)] = { runId, status: rep.status, reasons: rep.rejectionReasons, gates: GATES.version };
      addRecord({ category: 'single', family: f, key: rep.key, venue: d.market.venue, markets: [d.market.symbol], assets: [canonicalAsset(d.market.symbol)], intervalMs: d.intervalMs, datasetIds: [d.id], datasetSha256: d.sha256 ? [d.sha256] : undefined, windows: { train: raw.periods.train, validation: raw.periods.validation, test: raw.periods.test }, testOpened: !!raw.test, status: rep.status });
    }
    return res;
  });

  const series = eligible.map((p) => ({ symbol: p.d.market.symbol, candles: p.contiguous }));
  const universe = eligible.map((p) => p.d);
  const multiRecord = (category: 'pooled' | 'xs', family: string, key: string, cut: { trainStart: number; trainEnd: number; valEnd: number; testEnd: number }, testOpened: boolean, status: string) =>
    addRecord({ category, family, key, venue: universe[0]?.market.venue ?? '', markets: universe.map((d) => d.market.symbol), assets: universe.map((d) => canonicalAsset(d.market.symbol)), intervalMs, datasetIds: universe.map((d) => d.id), datasetSha256: universe.every((d) => d.sha256) ? universe.map((d) => d.sha256!) : undefined, windows: { train: [cut.trainStart, cut.trainEnd - 1], validation: [cut.trainEnd, cut.valEnd - 1], test: [cut.valEnd, cut.testEnd - 1] }, testOpened, status });
  const multiExposure = (cut: { trainEnd: number; testEnd: number }) => exposureFor(priorProv, { assets: universe.map((d) => d.market.symbol), oos: [cut.trainEnd, cut.testEnd - 1] });
  const pooled: PooledReport[] = pooledTodo.map((f) => {
    const raw = evaluatePooled(series, f, args.costFor(eligible[0].d), intervalMs, bonferroniN);
    const rep = survivorshipGate(guardExposure(guardReusedHoldout(raw, priorHoldoutLooks(args.registry, 'POOLED', intervalMs)), multiExposure(raw.cutoffs)), f, args.survivorship ?? null);
    registry[registryKey(f, pooledId, 'POOLED', intervalMs)] = { runId, status: rep.status, reasons: rep.rejectionReasons, gates: GATES.version };
    multiRecord('pooled', f, rep.key, raw.cutoffs, !!raw.test, rep.status);
    return rep;
  });

  let crossSectional: XsReport | undefined;
  if (xsTodo) {
    const raw = evaluateCrossSectional(series, args.costFor(eligible[0].d), intervalMs, bonferroniN);
    crossSectional = survivorshipGate(guardExposure(guardReusedHoldout(raw, priorHoldoutLooks(args.registry, 'XS', intervalMs) + priorHoldoutLooks(args.registry, 'POOLED', intervalMs)), multiExposure(raw.cutoffs)), 'xs_momentum', args.survivorship ?? null);
    registry[xsKey] = { runId, status: crossSectional.status, reasons: crossSectional.rejectionReasons, gates: GATES.version };
    multiRecord('xs', 'xs_momentum', crossSectional.key, raw.cutoffs, !!raw.test, crossSectional.status);
  }
  const all = [...markets.flatMap((m) => m.candidates), ...pooled, ...(crossSectional ? [crossSectional] : [])];
  const record: RunRecord = {
    runId,
    startedAt,
    finishedAt: new Date().toISOString(),
    codeVersion: args.codeVersion,
    gates: GATES,
    riskPolicy: DEFAULT_RISK,
    assumptions: [
      'Long-only spot, no leverage, no shorting.',
      'Signals decided at bar close; fills at next bar open with fee + half-spread + slippage per side.',
      'Fee/spread/slippage presets are assumptions (see src/bot/costs.ts); min order from venue metadata when available.',
      'Historical candles are indicative; executable depth was not verified.',
      'Bonferroni alpha uses the cumulative number of candidates (all earlier registry entries + this run).',
      'Recent history already inspected by earlier tests on the same market/timeframe (even with refreshed data) is not fresh evidence: such candidates cannot qualify without forward paper results.',
      'Universe = coins that are large and listed today (survivorship bias). Measured in research/survivorship-study.json; qualification also requires a non-negative median on delisted markets.',
      'Research capital normalised to $1,000; account-size feasibility evaluated separately.'
    ],
    markets,
    pooled,
    crossSectional,
    totals: {
      markets: markets.length,
      marketsEvaluated: markets.filter((m) => m.candidates.length).length,
      configsTried: all.reduce((s, c) => s + c.configsTriedOnTrain, 0),
      oosCandidates,
      bonferroniN,
      qualified: all.filter((c) => c.status === 'qualified_paper_strategy').length,
      rejected: all.filter((c) => c.status === 'rejected').length
    },
    feasibility: ACCOUNT_SIZES.flatMap((cap) =>
      ['coinbase_taker', 'kraken_taker', 'dex_solana', 'dex_ethereum_l1'].map((k) => ({
        ...accountFeasibility(cap, COST_PRESETS[k]),
        note: `${k}: ${accountFeasibility(cap, COST_PRESETS[k]).note}`
      }))
    )
  };
  return { record, registry, provenance: prov };
}
