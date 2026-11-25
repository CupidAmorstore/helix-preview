// AUD-204 cross-category holdout provenance; audit 4.3 (gate stamp), 4.4 (SHA-256), 4.5 (mixed timeframes).
import { describe, expect, it } from 'vitest';
import { canonicalAsset, exposureFor, guardExposure, type ObservationRecord, type Provenance } from '../../bot/provenance';
import { runResearchCycle } from '../../bot/research';
import { GATES } from '../../bot/validation';
import { datasetHash, datasetSha256 } from '../../bot/candles';
import { COST_PRESETS } from '../../bot/costs';
import type { Dataset } from '../../bot/types';
import { randomWalk, asDaily } from './helpers';
import realProv from '../../../research/provenance.json';
import realRegistry from '../../../research/registry.json';

const DAY = 86_400_000;
const rec = (o: Partial<ObservationRecord>): ObservationRecord => ({
  id: 'x', runId: 'r', category: 'single', family: 'sma_cross', key: 'k', venue: 'coinbase', markets: ['BTC-USD'], assets: ['BTC'],
  intervalMs: DAY, datasetIds: ['d'], windows: { train: [0, 99], validation: [100, 149], test: [150, 199] }, testOpened: false,
  gateVersion: 'gates-v1', status: 'rejected', source: 'run-record', ...o
});
const P = (...r: ObservationRecord[]): Provenance => ({ version: 1, records: r });
const qualified = { status: 'qualified_paper_strategy', rejectionReasons: [] as string[] };

describe('canonical asset identity', () => {
  it.each([['BTC-USD', 'BTC'], ['BTC/USDT', 'BTC'], ['btcusdt', 'BTC'], ['WBTC-USD', 'BTC'], ['CBETH', 'ETH'], ['MSOL-USDC', 'SOL'], ['POOLED', ''], ['XBT-EUR', 'XBT']])('%s → %s', (s, a) => {
    expect(canonicalAsset(s)).toBe(a);
  });
});

describe('AUD-204 exposure across categories, timeframes and refreshes', () => {
  it('a validation window already inspected on HOURLY data blocks a DAILY candidate over the same period', () => {
    const e = exposureFor(P(rec({ intervalMs: 3_600_000 })), { assets: ['BTC-USD'], oos: [120, 300] });
    expect(e.direct).toHaveLength(1);
    expect(guardExposure(qualified, e).status).toBe('backtested_candidate');
  });

  it('a POOLED evaluation that included BTC blocks a later single-market BTC candidate', () => {
    const e = exposureFor(P(rec({ category: 'pooled', markets: ['BTC-USD', 'ETH-USD'], assets: ['BTC', 'ETH'] })), { assets: ['BTC-USD'], oos: [140, 160] });
    expect(e.direct).toHaveLength(1);
  });

  it('a cross-sectional look blocks a pooled candidate sharing any asset', () => {
    const e = exposureFor(P(rec({ category: 'xs', markets: ['SOL-USD'], assets: ['SOL'] })), { assets: ['BTC-USD', 'SOL-USD'], oos: [0, 500] });
    expect(e.direct).toHaveLength(1);
  });

  it('a renamed / wrapped instrument is the same asset (WBTC record blocks BTC-USD)', () => {
    const e = exposureFor(P(rec({ markets: ['WBTC-USD'], assets: [canonicalAsset('WBTC-USD')] })), { assets: ['BTC-USD'], oos: [100, 120] });
    expect(e.direct).toHaveLength(1);
  });

  it('a refreshed dataset (new hash) over the same period is not fresh', () => {
    const e = exposureFor(P(rec({ datasetIds: ['old-hash'] })), { assets: ['BTC-USD'], oos: [100, 210] });
    expect(e.direct).toHaveLength(1);
  });

  it('an unopened test window is not counted as inspected; its training overlap is disclosed as indirect', () => {
    const e = exposureFor(P(rec({ testOpened: false })), { assets: ['BTC-USD'], oos: [160, 300] });
    expect(e.direct).toHaveLength(0);
    const e2 = exposureFor(P(rec({ testOpened: true })), { assets: ['BTC-USD'], oos: [160, 300] });
    expect(e2.direct).toHaveLength(1);
    const e3 = exposureFor(P(rec({})), { assets: ['BTC-USD'], oos: [10, 90] });
    expect(e3.indirect).toHaveLength(1);
    expect(guardExposure(qualified, e3).status).toBe('qualified_paper_strategy');
  });

  it('records whose windows cannot be reconstructed are treated as contaminated', () => {
    const e = exposureFor(P(rec({ windows: null, source: 'registry-only' })), { assets: ['BTC-USD'], oos: [10_000, 20_000] });
    expect(e.unknown).toHaveLength(1);
    expect(guardExposure(qualified, e).status).toBe('backtested_candidate');
  });

  it('unrelated assets and disjoint periods are fresh', () => {
    const e = exposureFor(P(rec({})), { assets: ['ETH-USD'], oos: [100, 200] });
    expect(e.direct.length + e.indirect.length + e.unknown.length).toBe(0);
  });
});

describe('migrated provenance of the real research history', () => {
  it('covers every registry entry, loses nothing, and reconstructs all windows', () => {
    const prov = realProv as unknown as Provenance;
    expect(prov.records.length).toBeGreaterThanOrEqual(Object.keys(realRegistry).length);
    expect(prov.records.every((r) => r.windows)).toBe(true);
    expect(prov.records.filter((r) => r.testOpened)).toHaveLength(4);
  });

  it('every stored research market now has its recent daily history marked as inspected', () => {
    const prov = realProv as unknown as Provenance;
    for (const a of ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'LTC', 'DOT']) {
      const e = exposureFor(prov, { assets: [a], oos: [Date.UTC(2025, 0, 1), Date.UTC(2026, 10, 1)] });
      expect(e.direct.length).toBeGreaterThan(0);
    }
  });
});

describe('research cycle integrity (4.3, 4.4, 4.5)', () => {
  const ds = (sym: string, seed: number, iv = DAY): Dataset => {
    const c = asDaily(randomWalk(1600, seed, 0.02), Date.UTC(2020, 0, 1)).map((k, i) => ({ ...k, t: Date.UTC(2020, 0, 1) + i * iv }));
    return { id: datasetHash(c), sha256: datasetSha256(c), market: { venue: 'coinbase', symbol: sym, base: sym.split('-')[0], quote: 'USD' } as Dataset['market'], intervalMs: iv, candles: c, fetchedAt: c[c.length - 1].t, source: 'test' };
  };
  const base = { costFor: () => COST_PRESETS.coinbase_taker, codeVersion: 't', registry: {}, minBars: 1000, families: ['sma_cross' as const] };

  it('mixed timeframes in one cycle are rejected', () => {
    const a = ds('BTC-USD', 1);
    const b = ds('ETH-USD', 2, 3_600_000);
    expect(() => runResearchCycle({ ...base, datasets: [a, b], nowMs: a.candles.at(-1)!.t + DAY })).toThrow(/mixed timeframes/);
  });

  it('duplicate market identities are rejected', () => {
    const a = ds('BTC-USD', 1);
    expect(() => runResearchCycle({ ...base, datasets: [a, { ...a }], nowMs: a.candles.at(-1)!.t + DAY })).toThrow(/duplicate market/);
  });

  it('new registry entries and provenance records carry the current gate version and SHA-256 dataset hashes', () => {
    const a = ds('BTC-USD', 1);
    const out = runResearchCycle({ ...base, datasets: [a], nowMs: a.candles.at(-1)!.t + DAY, provenance: { version: 1, records: [] } });
    for (const v of Object.values(out.registry)) expect(v.gates).toBe(GATES.version);
    expect(out.provenance.records).toHaveLength(1);
    expect(out.provenance.records[0].gateVersion).toBe(GATES.version);
    expect(out.provenance.records[0].datasetSha256![0]).toMatch(/^[0-9a-f]{64}$/);
  });

  it('provenance is append-only: earlier records are kept verbatim', () => {
    const a = ds('BTC-USD', 1);
    const prior = { version: 1 as const, records: [rec({ assets: ['ETH'], markets: ['ETH-USD'] })] };
    const out = runResearchCycle({ ...base, datasets: [a], nowMs: a.candles.at(-1)!.t + DAY, provenance: prior });
    expect(out.provenance.records[0]).toEqual(prior.records[0]);
    expect(out.provenance.records).toHaveLength(2);
  });

  it('SHA-256 changes with any field of any bar; FNV id is not the integrity mechanism', () => {
    const a = ds('BTC-USD', 1).candles;
    const b = a.map((k, i) => (i === 700 ? { ...k, v: k.v + 1 } : k));
    expect(datasetSha256(a)).not.toBe(datasetSha256(b));
    expect(datasetSha256(a)).toBe(datasetSha256(a.map((k) => ({ ...k }))));
  });
});
