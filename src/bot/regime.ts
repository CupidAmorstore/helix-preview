// P0 market-regime intelligence: point-in-time classification from COMPLETED bars only (data <= decision bar).
// Labels: strong/weak bull, bear, sideways; volatility high/low; market-wide stress (breadth collapse + high vol);
// liquidity deterioration (volume collapse); asset-specific abnormal move. Used to reduce exposure or stay in cash.
import type { Candle } from './types';

export type RegimeLabel = 'strong_bull' | 'weak_bull' | 'sideways' | 'bear';
export type AssetRegime = { trend: RegimeLabel; vol: 'high' | 'normal' | 'low'; liquidity: 'normal' | 'deteriorating'; abnormal: boolean };
export type MarketRegime = { breadth: number; stress: boolean; assets: Record<string, AssetRegime | null>; allowNewEntries: boolean; reasons: string[] };

const sma = (x: number[], end: number, n: number) => { let s = 0; for (let i = end - n + 1; i <= end; i++) s += x[i]; return s / n; };
const sd = (x: number[]) => { const m = x.reduce((a, b) => a + b, 0) / x.length; return Math.sqrt(x.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, x.length - 1)); };

/** Classify asset at index i using candles[0..i] only. Returns null without 365 bars of history. */
export function assetRegime(k: Candle[], i: number): AssetRegime | null {
  if (i < 365) return null;
  const c = k.map((b) => b.c);
  const s200 = sma(c, i, 200);
  const ret90 = c[i] / c[i - 90] - 1;
  const trend: RegimeLabel = c[i] > s200 ? (ret90 > 0.2 ? 'strong_bull' : ret90 > 0 ? 'weak_bull' : 'sideways') : ret90 < -0.1 ? 'bear' : 'sideways';
  const lr = (a: number, b: number) => Array.from({ length: b - a }, (_, j) => Math.log(c[a + j + 1] / c[a + j]));
  const v30 = sd(lr(i - 30, i));
  const hist: number[] = [];
  for (let e = 60; e <= i; e += 15) hist.push(sd(lr(e - 30, e)));
  const pct = hist.filter((h) => h < v30).length / hist.length;
  const vol30 = k.slice(i - 29, i + 1).reduce((a, b) => a + b.v * b.c, 0);
  const vol180 = k.slice(i - 179, i + 1).reduce((a, b) => a + b.v * b.c, 0) / 6;
  const z = Math.abs(Math.log(c[i] / c[i - 1])) / (sd(lr(i - 90, i - 1)) || Infinity);
  return { trend, vol: pct > 0.8 ? 'high' : pct < 0.2 ? 'low' : 'normal', liquidity: vol30 < 0.4 * vol180 ? 'deteriorating' : 'normal', abnormal: z > 5 };
}

/** Market-wide view at time t (each series indexed by its own bar with open time t). */
export function marketRegime(series: Record<string, Candle[]>, t: number): MarketRegime {
  const assets: Record<string, AssetRegime | null> = {};
  for (const [m, k] of Object.entries(series)) {
    const i = k.findIndex((b) => b.t === t);
    assets[m] = i >= 0 ? assetRegime(k, i) : null;
  }
  const known = Object.values(assets).filter((a): a is AssetRegime => a !== null);
  const breadth = known.length ? known.filter((a) => a.trend === 'strong_bull' || a.trend === 'weak_bull').length / known.length : 0;
  const highVol = known.filter((a) => a.vol === 'high').length / Math.max(1, known.length);
  const stress = breadth < 0.2 && highVol >= 0.5;
  const reasons: string[] = [];
  if (!known.length) reasons.push('no asset has enough history — unknown regime, no entries');
  if (stress) reasons.push(`market-wide stress: breadth ${(breadth * 100).toFixed(0)}%, ${(highVol * 100).toFixed(0)}% of assets in high volatility`);
  if (known.length < Object.keys(series).length) reasons.push(`${Object.keys(series).length - known.length} assets unclassified (missing bar or history)`);
  return { breadth, stress, assets, allowNewEntries: known.length > 0 && !stress, reasons };
}
