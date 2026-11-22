/**
 * HELIX Trading Bot — bounded research cycle + forward paper update (PAPER ONLY).
 *
 *   npm run bot:research              # fetch fresh public data, research, update paper accounts
 *   npm run bot:research -- --offline # reuse stored datasets only (no network)
 *   npm run bot:research -- --watch-only # refresh data, quotes and paper accounts; NO new research
 *                                        (use for frequent monitoring so strategies are not re-tested on
 *                                         near-identical data — that would be repeated data snooping)
 *
 * Writes:
 *   research/data/*.csv.gz            versioned datasets (content-hashed)
 *   research/runs/<runId>.json        full run record (inputs, code SHA, gates, results, rejections)
 *   research/registry.json            evaluated (family, market, interval, dataset) keys
 *   research/paper/accounts.json      forward paper accounts (state + ledgers)
 *   research/watchbot/<ts>.json       cross-venue quote snapshot
 *   src/bot/data/latest.json          compact summary rendered by the app
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { DAY, HOUR, datasetHash, validateCandles } from '../src/bot/candles';
import { COST_PRESETS } from '../src/bot/costs';
import { runResearchCycle, Registry, RunRecord } from '../src/bot/research';
import {
  KRAKEN_SYMBOLS,
  RESEARCH_UNIVERSE,
  fetchCoinbaseCandles,
  fetchMinOrderUsd,
  fetchQuote,
  Quote
} from '../src/bot/sources';
import { crossVenueDiscrepancies } from '../src/bot/watchbot';
import { PaperAccount, createPaperAccount, paperSummary, stepPaper } from '../src/bot/paper';
import { assertPaperOnly } from '../src/bot/risk';
import type { Candle, CostModel, Dataset, MarketRef } from '../src/bot/types';

assertPaperOnly();
const ROOT = join(__dirname, '..');
const R = (...p: string[]) => join(ROOT, 'research', ...p);
for (const d of ['data', 'runs', 'paper', 'watchbot']) mkdirSync(R(d), { recursive: true });
mkdirSync(join(ROOT, 'src/bot/data'), { recursive: true });

const offline = process.argv.includes('--offline');
const watchOnly = process.argv.includes('--watch-only');
const now = Date.now();
const codeVersion = (() => {
  try {
    const sha = execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim();
    const dirty = execSync('git status --porcelain -- src/bot scripts', { cwd: ROOT }).toString().trim() ? '+dirty' : '';
    return sha + dirty;
  } catch {
    return 'unknown';
  }
})();

const INTERVALS = [
  { label: '1h', ms: HOUR, gran: 3600 as const, lookbackMs: 365 * DAY, minBars: 1500 },
  { label: '1d', ms: DAY, gran: 86400 as const, lookbackMs: 6 * 365 * DAY, minBars: 1000 }
];

function toCsv(c: Candle[]) {
  return 't,o,h,l,c,v\n' + c.map((k) => `${k.t},${k.o},${k.h},${k.l},${k.c},${k.v}`).join('\n');
}
function fromCsv(s: string): Candle[] {
  return s
    .trim()
    .split('\n')
    .slice(1)
    .map((l) => {
      const [t, o, h, lo, c, v] = l.split(',').map(Number);
      return { t, o, h, l: lo, c, v };
    });
}
const fileFor = (m: MarketRef, label: string) => R('data', `${m.venue}_${m.symbol}_${label}.csv.gz`);

async function loadOrFetch(m: MarketRef, iv: (typeof INTERVALS)[number]): Promise<Dataset | null> {
  const f = fileFor(m, iv.label);
  let candles: Candle[] = existsSync(f) ? fromCsv(gunzipSync(readFileSync(f)).toString()) : [];
  if (!offline) {
    const last = candles.length ? candles[candles.length - 1].t + iv.ms : now - iv.lookbackMs;
    try {
      const fresh = await fetchCoinbaseCandles(m.symbol, iv.gran, last, now);
      const byT = new Map<number, Candle>();
      for (const k of [...candles, ...fresh]) byT.set(k.t, k);
      candles = [...byT.values()].sort((a, b) => a.t - b.t);
    } catch (e) {
      console.warn(`  ! fetch failed ${m.symbol} ${iv.label}: ${(e as Error).message}`);
    }
  }
  // store only completed bars
  candles = validateCandles(candles, iv.ms, now, Infinity).candles;
  if (!candles.length) return null;
  writeFileSync(f, gzipSync(toCsv(candles)));
  return { id: datasetHash(candles), market: m, intervalMs: iv.ms, candles, fetchedAt: now, source: 'coinbase-exchange-public' };
}

async function main() {
  console.log(`HELIX bot research — ${new Date(now).toISOString()} — code ${codeVersion} — ${offline ? 'offline' : 'online'}${watchOnly ? ' — watch-only' : ''}`);
  const registry: Registry = existsSync(R('registry.json')) ? JSON.parse(readFileSync(R('registry.json'), 'utf8')) : {};

  // venue minimums from public metadata (fallback to preset)
  const minOrder: Record<string, number | null> = {};
  const records: RunRecord[] = [];
  const allDatasets: Dataset[] = [];
  let reg = registry;
  for (const iv of INTERVALS) {
    const datasets: Dataset[] = [];
    for (const m of RESEARCH_UNIVERSE) {
      const d = await loadOrFetch(m, iv);
      if (d) {
        datasets.push(d);
        console.log(`  ${iv.label} ${m.symbol}: ${d.candles.length} bars ${new Date(d.candles[0].t).toISOString().slice(0, 10)} → ${new Date(d.candles[d.candles.length - 1].t).toISOString().slice(0, 16)} id=${d.id}`);
      }
    }
    if (!offline)
      for (const d of datasets)
        if (minOrder[d.market.symbol] === undefined)
          minOrder[d.market.symbol] = await fetchMinOrderUsd(d.market, d.candles[d.candles.length - 1].c);
    const costFor = (d: Dataset): CostModel => {
      const base = COST_PRESETS.coinbase_taker;
      const mo = minOrder[d.market.symbol];
      return mo != null ? { ...base, minOrderUsd: mo, provenance: base.provenance + '; min order from Coinbase /products' } : base;
    };
    allDatasets.push(...datasets);
    if (watchOnly) continue;
    const { record, registry: next } = runResearchCycle({ datasets, costFor, nowMs: now, codeVersion, registry: reg, minBars: iv.minBars });
    reg = next;
    record.runId += `-${iv.label}`;
    records.push(record);
    writeFileSync(R('runs', `${record.runId}.json`), JSON.stringify(record, null, 1));
    console.log(`  run ${record.runId}: evaluated ${record.totals.oosCandidates} candidates, qualified ${record.totals.qualified}, rejected ${record.totals.rejected}`);
  }
  writeFileSync(R('registry.json'), JSON.stringify(reg, null, 1));

  // ---- Watchbot: cross-venue quote snapshot (detected opportunities only; never "arbitrage")
  let watch: ReturnType<typeof crossVenueDiscrepancies> = [];
  if (!offline) {
    for (const base of ['BTC', 'ETH', 'SOL']) {
      const quotes: Quote[] = [];
      const refs: MarketRef[] = [
        { venue: 'coinbase', symbol: `${base}-USD`, base, quote: 'USD' },
        { venue: 'kraken', symbol: KRAKEN_SYMBOLS[base], base, quote: 'USD' },
        { venue: 'gemini', symbol: `${base.toLowerCase()}usd`, base, quote: 'USD' }
      ];
      for (const m of refs) {
        try {
          quotes.push(await fetchQuote(m));
        } catch (e) {
          console.warn(`  ! quote ${m.venue} ${m.symbol}: ${(e as Error).message}`);
        }
      }
      watch.push(
        ...crossVenueDiscrepancies(base, quotes, {
          coinbase: COST_PRESETS.coinbase_taker,
          kraken: COST_PRESETS.kraken_taker,
          gemini: { ...COST_PRESETS.coinbase_taker, venue: 'gemini', takerFeeBps: 40, provenance: 'assumed Gemini ActiveTrader taker 0.40%' }
        })
      );
    }
    writeFileSync(R('watchbot', `${new Date(now).toISOString().replace(/[:.]/g, '-')}.json`), JSON.stringify(watch, null, 1));
  }

  // ---- Forward paper accounts
  const accFile = R('paper', 'accounts.json');
  let accounts: PaperAccount[] = existsSync(accFile) ? JSON.parse(readFileSync(accFile, 'utf8')) : [];
  const have = new Set(accounts.map((a) => a.id));
  for (const rec of records)
    for (const m of rec.markets)
      for (const c of m.candidates) {
        // qualified candidates get a qualified account; the best-train rejected candidate per family on BTC/ETH
        // gets a DIAGNOSTIC account so forward data can confirm or refute the rejection.
        const diagnostic = c.status === 'rejected' && ['BTC', 'ETH'].includes(m.market.base) && m.intervalMs === DAY;
        if (c.status !== 'qualified_paper_strategy' && !diagnostic) continue;
        const id = `${m.market.symbol}|${m.intervalMs}|${c.key}`;
        if (have.has(id)) continue;
        accounts.push(
          createPaperAccount({
            id,
            label: `${m.market.symbol} ${m.intervalMs === DAY ? '1d' : '1h'} ${c.key}`,
            kind: c.status === 'qualified_paper_strategy' ? 'qualified' : 'diagnostic',
            market: m.market,
            intervalMs: m.intervalMs,
            spec: c.spec,
            cost: m.cost,
            initialCash: 1000,
            createdAt: now
          })
        );
        have.add(id);
      }
  accounts = accounts.map((a) => {
    const d = allDatasets.find((x) => x.market.symbol === a.market.symbol && x.intervalMs === a.intervalMs);
    if (!d) return a;
    const v = validateCandles(d.candles, a.intervalMs, now, 3);
    return stepPaper(a, v.candles, { dataStale: v.stale });
  });
  writeFileSync(accFile, JSON.stringify(accounts, null, 1));

  // ---- compact summary for the app
  const lastPx = (a: PaperAccount) => {
    const d = allDatasets.find((x) => x.market.symbol === a.market.symbol && x.intervalMs === a.intervalMs);
    return d ? d.candles[d.candles.length - 1].c : 0;
  };
  // merge evidence across runs: per market, keep candidates from the most recent run that evaluated them
  const history: RunRecord[] = readdirSync(R('runs'))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(R('runs', f), 'utf8')));
  if (watchOnly) {
    // no new research: surface the latest stored run per interval
    for (const iv of INTERVALS) {
      const last = [...history].reverse().find((h) => h.markets[0]?.intervalMs === iv.ms);
      if (last) records.push(last);
    }
  }
  for (const rec of records) {
    for (const m of rec.markets) {
      if (m.candidates.length) continue;
      for (const old of [...history].reverse()) {
        const om = old.markets.find((x) => x.market.symbol === m.market.symbol && x.intervalMs === m.intervalMs && x.datasetId === m.datasetId);
        if (om && om.candidates.length) {
          m.candidates = om.candidates;
          m.skipped = m.skipped.map((x) => ({ ...x, reason: `${x.reason}; evidence from ${old.runId}` }));
          break;
        }
      }
    }
    if (!rec.pooled.length)
      for (const old of [...history].reverse())
        if (old.pooled?.length && old.markets[0]?.intervalMs === rec.markets[0]?.intervalMs) {
          rec.pooled = old.pooled;
          break;
        }
  }
  const summary = {
    generatedAt: new Date(now).toISOString(),
    codeVersion,
    mode: 'paper',
    runs: records.map((r) => ({
      runId: r.runId,
      totals: r.totals,
      gates: r.gates.version,
      assumptions: r.assumptions,
      markets: r.markets.map((m) => ({
        symbol: m.market.symbol,
        base: m.market.base,
        venue: m.market.venue,
        intervalMs: m.intervalMs,
        datasetId: m.datasetId,
        quality: m.quality,
        regime: m.regime,
        costBps: { fee: m.cost.takerFeeBps, halfSpread: m.cost.halfSpreadBps, slippage: m.cost.slippageBps, minOrderUsd: m.cost.minOrderUsd },
        skipped: m.skipped,
        candidates: m.candidates.map((c) => ({
          key: c.key,
          family: c.spec.family,
          status: c.status,
          rejectionReasons: c.rejectionReasons,
          periods: c.periods,
          train: c.train,
          validation: c.validation,
          test: c.test,
          stress: c.stress,
          ci: c.ci
        }))
      })),
      pooled: r.pooled.map((c) => ({
        key: c.key,
        family: c.spec.family,
        status: c.status,
        rejectionReasons: c.rejectionReasons,
        markets: c.markets,
        cutoffs: c.cutoffs,
        train: { ...c.train, perMarketNet: undefined },
        validation: c.validation && { ...c.validation, perMarketNet: c.validation.perMarketNet },
        test: c.test && { ...c.test, perMarketNet: c.test.perMarketNet },
        stress: c.stress,
        ci: c.ci
      })),
      feasibility: r.feasibility
    })),
    watchbot: watch,
    paper: accounts.map((a) => ({
      id: a.id,
      label: a.label,
      kind: a.kind,
      createdAt: a.createdAt,
      lastProcessedT: a.lastProcessedT,
      initialCash: a.initialCash,
      ...paperSummary(a, lastPx(a)),
      killSwitch: a.risk.killSwitch,
      recentDecisions: a.decisions.slice(-10),
      fills: a.fills.slice(-20)
    })),
    datasets: readdirSync(R('data'))
  };
  writeFileSync(join(ROOT, 'src/bot/data/latest.json'), JSON.stringify(summary, null, 1));
  console.log(`  paper accounts: ${accounts.length} (${accounts.filter((a) => a.kind === 'qualified').length} qualified)`);
  console.log('done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
