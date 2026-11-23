import type { MarketRef } from './types';
import { defaultFetcher, Fetcher } from './sources';

/**
 * Roadmap R2 — measured execution costs from PUBLIC order books (read-only, keyless).
 * Replaces the half-spread / slippage placeholders in costs.ts only after the pre-registered
 * 30-day collection window (see docs/trading-bot/RESEARCH_ROADMAP.md).
 */
export type Level = [price: number, size: number];
export type Book = { venue: string; symbol: string; bids: Level[]; asks: Level[]; observedAt: number };

export async function fetchBook(m: MarketRef, fetcher: Fetcher = defaultFetcher): Promise<Book> {
  const observedAt = Date.now();
  const num = (r: (string | number)[]): Level => [Number(r[0]), Number(r[1])];
  if (m.venue === 'coinbase') {
    const j = (await fetcher(`https://api.exchange.coinbase.com/products/${m.symbol}/book?level=2`)) as {
      bids: (string | number)[][];
      asks: (string | number)[][];
    };
    return { venue: 'coinbase', symbol: m.symbol, bids: j.bids.map(num), asks: j.asks.map(num), observedAt };
  }
  if (m.venue === 'kraken') {
    const j = (await fetcher(`https://api.kraken.com/0/public/Depth?pair=${m.symbol}&count=100`)) as {
      error: string[];
      result: Record<string, { bids: (string | number)[][]; asks: (string | number)[][] }>;
    };
    if (j.error?.length) throw new Error(`Kraken: ${j.error.join(',')}`);
    const v = Object.values(j.result)[0];
    return { venue: 'kraken', symbol: m.symbol, bids: v.bids.map(num), asks: v.asks.map(num), observedAt };
  }
  const j = (await fetcher(`https://api.gemini.com/v1/book/${m.symbol}?limit_bids=100&limit_asks=100`)) as {
    bids: { price: string; amount: string }[];
    asks: { price: string; amount: string }[];
  };
  const g = (x: { price: string; amount: string }): Level => [Number(x.price), Number(x.amount)];
  return { venue: 'gemini', symbol: m.symbol, bids: j.bids.map(g), asks: j.asks.map(g), observedAt };
}

export type ImpactRow = {
  notionalUsd: number;
  side: 'buy' | 'sell';
  filled: boolean; // false => visible depth insufficient (treat as NOT executable)
  avgPx: number | null;
  halfSpreadBps: number;
  /** extra cost beyond the touch from walking the book */
  slippageBps: number | null;
  levelsUsed: number;
};

/** Validates a book is usable: sorted, positive, not crossed. */
export function bookIssues(b: Book): string[] {
  const out: string[] = [];
  if (!b.bids.length || !b.asks.length) out.push('empty side');
  if (b.bids.some(([p, s]) => !(p > 0) || !(s >= 0)) || b.asks.some(([p, s]) => !(p > 0) || !(s >= 0))) out.push('invalid level');
  for (let i = 1; i < b.bids.length; i++) if (b.bids[i][0] > b.bids[i - 1][0]) out.push('bids not descending');
  for (let i = 1; i < b.asks.length; i++) if (b.asks[i][0] < b.asks[i - 1][0]) out.push('asks not ascending');
  if (b.bids.length && b.asks.length && b.bids[0][0] >= b.asks[0][0]) out.push('crossed book');
  return [...new Set(out)];
}

/** Walk the book for a market order of `notionalUsd` (quote currency). */
export function marketImpact(b: Book, side: 'buy' | 'sell', notionalUsd: number): ImpactRow {
  const bid = b.bids[0][0];
  const ask = b.asks[0][0];
  const mid = (bid + ask) / 2;
  const halfSpreadBps = ((ask - bid) / 2 / mid) * 10_000;
  const levels = side === 'buy' ? b.asks : b.bids;
  let remaining = notionalUsd;
  let units = 0;
  let used = 0;
  for (const [px, size] of levels) {
    if (remaining <= 1e-12) break;
    const take = Math.min(remaining, px * size);
    units += take / px;
    remaining -= take;
    used++;
  }
  if (remaining > 1e-9) return { notionalUsd, side, filled: false, avgPx: null, halfSpreadBps, slippageBps: null, levelsUsed: used };
  const avgPx = notionalUsd / units;
  const touch = side === 'buy' ? ask : bid;
  const slippageBps = (Math.abs(avgPx - touch) / mid) * 10_000;
  return { notionalUsd, side, filled: true, avgPx, halfSpreadBps, slippageBps, levelsUsed: used };
}

export const IMPACT_SIZES = [20, 50, 100, 250, 500, 1000, 5000];

export type CostSnapshot = {
  venue: string;
  symbol: string;
  observedAt: number;
  issues: string[];
  rows: ImpactRow[];
};

export function costSnapshot(b: Book, sizes = IMPACT_SIZES): CostSnapshot {
  const issues = bookIssues(b);
  const rows = issues.length ? [] : sizes.flatMap((n) => [marketImpact(b, 'buy', n), marketImpact(b, 'sell', n)]);
  return { venue: b.venue, symbol: b.symbol, observedAt: b.observedAt, issues, rows };
}

function quantile(xs: number[], q: number): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))];
}

export type MeasuredCost = {
  venue: string;
  symbol: string;
  notionalUsd: number;
  samples: number;
  halfSpreadBpsP75: number;
  slippageBpsP75: number;
  unfilledShare: number;
  firstAt: number;
  lastAt: number;
};

/** p75 per (venue, symbol, size) over many snapshots, both sides pooled. */
export function summarizeCosts(snaps: CostSnapshot[]): MeasuredCost[] {
  const groups = new Map<string, { snaps: CostSnapshot[]; rows: ImpactRow[] }>();
  for (const s of snaps)
    for (const r of s.rows) {
      const k = `${s.venue}|${s.symbol}|${r.notionalUsd}`;
      const g = groups.get(k) ?? { snaps: [], rows: [] };
      g.rows.push(r);
      if (!g.snaps.includes(s)) g.snaps.push(s);
      groups.set(k, g);
    }
  return [...groups.entries()].map(([k, g]) => {
    const [venue, symbol, n] = k.split('|');
    const filled = g.rows.filter((r) => r.filled);
    return {
      venue,
      symbol,
      notionalUsd: Number(n),
      samples: g.snaps.length,
      halfSpreadBpsP75: quantile(g.rows.map((r) => r.halfSpreadBps), 0.75),
      slippageBpsP75: quantile(filled.map((r) => r.slippageBps as number), 0.75),
      unfilledShare: 1 - filled.length / g.rows.length,
      firstAt: Math.min(...g.snaps.map((s) => s.observedAt)),
      lastAt: Math.max(...g.snaps.map((s) => s.observedAt))
    };
  });
}
