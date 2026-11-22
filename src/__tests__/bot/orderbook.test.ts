import { describe, expect, it } from 'vitest';
import { Book, bookIssues, costSnapshot, marketImpact, summarizeCosts } from '../../bot/orderbook';

const book = (): Book => ({
  venue: 'coinbase',
  symbol: 'TEST-USD',
  observedAt: 0,
  bids: [[99.9, 1], [99.8, 1], [99.0, 10]],
  asks: [[100.1, 1], [100.2, 1], [101.0, 10]]
});

describe('order-book cost measurement (R2)', () => {
  it('half-spread is measured from the touch', () => {
    expect(marketImpact(book(), 'buy', 50).halfSpreadBps).toBeCloseTo(10, 6); // (100.1-99.9)/2/100
  });

  it('small order fills at the touch with zero extra slippage', () => {
    const r = marketImpact(book(), 'buy', 50);
    expect(r.filled).toBe(true);
    expect(r.avgPx).toBeCloseTo(100.1, 10);
    expect(r.slippageBps).toBeCloseTo(0, 10);
    expect(r.levelsUsed).toBe(1);
  });

  it('larger order walks levels and pays volume-weighted slippage', () => {
    const r = marketImpact(book(), 'buy', 250.3); // 100.1 + 100.2 + 50 at 101
    const units = 1 + 1 + 50 / 101;
    expect(r.avgPx).toBeCloseTo(250.3 / units, 10);
    expect(r.levelsUsed).toBe(3);
    expect(r.slippageBps!).toBeGreaterThan(0);
  });

  it('insufficient visible depth is reported as NOT filled (never extrapolated)', () => {
    const r = marketImpact(book(), 'sell', 100_000);
    expect(r.filled).toBe(false);
    expect(r.avgPx).toBeNull();
    expect(r.slippageBps).toBeNull();
  });

  it('crossed / unsorted books are rejected and produce no rows', () => {
    const crossed = { ...book(), bids: [[100.5, 1]] as [number, number][] };
    expect(bookIssues(crossed)).toContain('crossed book');
    expect(costSnapshot(crossed).rows).toHaveLength(0);
    const unsorted = { ...book(), asks: [[100.2, 1], [100.1, 1]] as [number, number][] };
    expect(bookIssues(unsorted)).toContain('asks not ascending');
  });

  it('summarizes p75 across snapshots and tracks unfilled share', () => {
    const wide: Book = { ...book(), observedAt: 2, bids: [[99, 1]], asks: [[101, 1]] };
    const s = summarizeCosts([costSnapshot(book(), [50]), costSnapshot(book(), [50]), costSnapshot(wide, [50]), costSnapshot(book(), [50])]);
    const row = s.find((x) => x.notionalUsd === 50)!;
    expect(row.samples).toBe(4);
    expect(row.halfSpreadBpsP75).toBeCloseTo(10, 6); // 3 of 4 snapshots at 10 bps
    expect(row.unfilledShare).toBe(0);
  });
});
