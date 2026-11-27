import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import type { Candle } from './types';

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

/** FNV-1a 32-bit over a string, hex. Deterministic dataset / config identifiers. */
export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Cryptographic content hash (audit 4.4): SHA-256 over the canonical serialisation "t,o,h,l,c,v;" per bar.
 * FNV-1a ids remain as compact registry keys only; integrity/provenance use this hash.
 */
export function datasetSha256(candles: Candle[]): string {
  const text = candles.map((k) => `${k.t},${k.o},${k.h},${k.l},${k.c},${k.v};`).join('');
  return bytesToHex(sha256(utf8ToBytes(text)));
}

export function datasetHash(candles: Candle[]): string {
  // hash in chunks to keep it cheap but content-bound
  let acc = '';
  for (const k of candles) acc = fnv1a(acc + `${k.t},${k.o},${k.h},${k.l},${k.c},${k.v};`);
  return `${acc}-${candles.length}`;
}

export type DataIssue =
  | { kind: 'duplicate'; t: number }
  | { kind: 'misaligned'; t: number }
  | { kind: 'gap'; from: number; to: number; missingBars: number }
  | { kind: 'invalid_ohlc'; t: number }
  | { kind: 'incomplete_last_bar_dropped'; t: number }
  | { kind: 'stale'; lastCloseT: number; ageMs: number };

export type ValidationReport = {
  candles: Candle[];
  issues: DataIssue[];
  /** longest run of consecutive bars without gaps */
  longestContiguous: number;
  /** start index of the trailing contiguous run in `candles` */
  trailingContiguousStart: number;
  stale: boolean;
};

/**
 * Stage-1 data integrity:
 * - sort, drop duplicates, drop bars not aligned to the interval grid
 * - drop invalid OHLC
 * - drop a bar whose close time is in the future (still forming) — prevents look-ahead on live data
 * - record gaps (never forward-filled)
 * - flag stale series (last completed bar too old)
 */
export function validateCandles(
  raw: Candle[],
  intervalMs: number,
  nowMs: number,
  maxStaleBars = 2
): ValidationReport {
  const issues: DataIssue[] = [];
  const sorted = [...raw].sort((a, b) => a.t - b.t);
  const out: Candle[] = [];
  for (const k of sorted) {
    if (out.length && out[out.length - 1].t === k.t) {
      issues.push({ kind: 'duplicate', t: k.t });
      continue;
    }
    if (k.t % intervalMs !== 0) {
      issues.push({ kind: 'misaligned', t: k.t });
      continue;
    }
    const ok =
      [k.o, k.h, k.l, k.c, k.v].every((x) => Number.isFinite(x)) &&
      k.o > 0 && k.c > 0 && k.l > 0 && k.v >= 0 &&
      k.h >= Math.max(k.o, k.c, k.l) && k.l <= Math.min(k.o, k.c, k.h);
    if (!ok) {
      issues.push({ kind: 'invalid_ohlc', t: k.t });
      continue;
    }
    out.push(k);
  }
  while (out.length && out[out.length - 1].t + intervalMs > nowMs) {
    const dropped = out.pop()!;
    issues.push({ kind: 'incomplete_last_bar_dropped', t: dropped.t });
  }
  let longest = out.length ? 1 : 0;
  let run = longest;
  let trailingStart = 0;
  for (let i = 1; i < out.length; i++) {
    const step = out[i].t - out[i - 1].t;
    if (step === intervalMs) {
      run++;
    } else {
      issues.push({ kind: 'gap', from: out[i - 1].t, to: out[i].t, missingBars: step / intervalMs - 1 });
      run = 1;
      trailingStart = i;
    }
    longest = Math.max(longest, run);
  }
  let stale = false;
  if (out.length) {
    const lastClose = out[out.length - 1].t + intervalMs;
    const age = nowMs - lastClose;
    if (age > maxStaleBars * intervalMs) {
      stale = true;
      issues.push({ kind: 'stale', lastCloseT: lastClose, ageMs: age });
    }
  } else {
    stale = true;
  }
  return { candles: out, issues, longestContiguous: longest, trailingContiguousStart: trailingStart, stale };
}

/** Aggregate contiguous base candles into a larger interval (only complete buckets kept). */
export function resample(candles: Candle[], baseMs: number, targetMs: number): Candle[] {
  const per = targetMs / baseMs;
  if (!Number.isInteger(per) || per < 1) throw new Error('target interval must be a multiple of base');
  const buckets = new Map<number, Candle[]>();
  for (const k of candles) {
    const b = Math.floor(k.t / targetMs) * targetMs;
    const arr = buckets.get(b) ?? [];
    arr.push(k);
    buckets.set(b, arr);
  }
  const out: Candle[] = [];
  for (const [t, arr] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
    if (arr.length !== per) continue; // incomplete bucket => not a completed bar
    out.push({
      t,
      o: arr[0].o,
      h: Math.max(...arr.map((x) => x.h)),
      l: Math.min(...arr.map((x) => x.l)),
      c: arr[arr.length - 1].c,
      v: arr.reduce((s, x) => s + x.v, 0)
    });
  }
  return out;
}
