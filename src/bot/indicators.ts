import type { Candle } from './types';

// All indicators return arrays aligned to input; value at i uses only data <= i. NaN during warm-up.

export function sma(xs: number[], n: number): number[] {
  const out = new Array<number>(xs.length).fill(NaN);
  let s = 0;
  for (let i = 0; i < xs.length; i++) {
    s += xs[i];
    if (i >= n) s -= xs[i - n];
    if (i >= n - 1) out[i] = s / n;
  }
  return out;
}

export function rollingStd(xs: number[], n: number): number[] {
  const out = new Array<number>(xs.length).fill(NaN);
  for (let i = n - 1; i < xs.length; i++) {
    let m = 0;
    for (let j = i - n + 1; j <= i; j++) m += xs[j];
    m /= n;
    let v = 0;
    for (let j = i - n + 1; j <= i; j++) v += (xs[j] - m) ** 2;
    out[i] = Math.sqrt(v / n);
  }
  return out;
}

/** highest high over the n bars BEFORE i (excludes bar i, so a breakout above it is meaningful) */
export function priorHigh(c: Candle[], n: number): number[] {
  const out = new Array<number>(c.length).fill(NaN);
  for (let i = n; i < c.length; i++) {
    let m = -Infinity;
    for (let j = i - n; j < i; j++) m = Math.max(m, c[j].h);
    out[i] = m;
  }
  return out;
}

export function priorLow(c: Candle[], n: number): number[] {
  const out = new Array<number>(c.length).fill(NaN);
  for (let i = n; i < c.length; i++) {
    let m = Infinity;
    for (let j = i - n; j < i; j++) m = Math.min(m, c[j].l);
    out[i] = m;
  }
  return out;
}

export function rsi(xs: number[], n: number): number[] {
  const out = new Array<number>(xs.length).fill(NaN);
  let up = 0;
  let dn = 0;
  for (let i = 1; i < xs.length; i++) {
    const d = xs[i] - xs[i - 1];
    const u = Math.max(d, 0);
    const w = Math.max(-d, 0);
    if (i <= n) {
      up += u / n;
      dn += w / n;
      if (i === n) out[i] = dn === 0 ? 100 : 100 - 100 / (1 + up / dn);
    } else {
      up = (up * (n - 1) + u) / n;
      dn = (dn * (n - 1) + w) / n;
      out[i] = dn === 0 ? 100 : 100 - 100 / (1 + up / dn);
    }
  }
  return out;
}

/** Kaufman efficiency ratio: |net move| / sum |moves| over n bars. ~1 trending, ~0 choppy. */
export function efficiencyRatio(xs: number[], n: number): number[] {
  const out = new Array<number>(xs.length).fill(NaN);
  for (let i = n; i < xs.length; i++) {
    let path = 0;
    for (let j = i - n + 1; j <= i; j++) path += Math.abs(xs[j] - xs[j - 1]);
    out[i] = path === 0 ? 0 : Math.abs(xs[i] - xs[i - n]) / path;
  }
  return out;
}

export function logReturns(xs: number[]): number[] {
  const out = new Array<number>(xs.length).fill(NaN);
  for (let i = 1; i < xs.length; i++) out[i] = Math.log(xs[i] / xs[i - 1]);
  return out;
}
