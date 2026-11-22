import type { Candle } from '../../bot/types';
import { mulberry32 } from '../../bot/stats';
import { HOUR } from '../../bot/candles';

export const T0 = Date.UTC(2025, 0, 1);

/** Seeded geometric random walk with realistic OHLC. */
export function randomWalk(n: number, seed = 1, volPerBar = 0.008, drift = 0): Candle[] {
  const r = mulberry32(seed);
  const gauss = () => {
    const u = Math.max(1e-12, r());
    const v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const out: Candle[] = [];
  let px = 100;
  for (let i = 0; i < n; i++) {
    const o = px;
    const c = o * Math.exp(drift + volPerBar * gauss());
    const h = Math.max(o, c) * (1 + Math.abs(gauss()) * volPerBar * 0.3);
    const l = Math.min(o, c) * (1 - Math.abs(gauss()) * volPerBar * 0.3);
    out.push({ t: T0 + i * HOUR, o, h, l, c, v: 1000 });
    px = c;
  }
  return out;
}

/** Series with persistent regimes: strong up-trends alternating with noisy flat periods. */
export function trendingRegimes(n: number, seed = 7, seg = 120): Candle[] {
  const r = mulberry32(seed);
  const out: Candle[] = [];
  let px = 100;
  for (let i = 0; i < n; i++) {
    const up = Math.floor(i / seg) % 2 === 0;
    const drift = up ? 0.004 : -0.0015;
    const o = px;
    const c = o * Math.exp(drift + 0.003 * (r() - 0.5));
    out.push({ t: T0 + i * HOUR, o, h: Math.max(o, c) * 1.0005, l: Math.min(o, c) * 0.9995, c, v: 1000 });
    px = c;
  }
  return out;
}

export function flat(n: number, px = 100): Candle[] {
  return Array.from({ length: n }, (_, i) => ({ t: T0 + i * HOUR, o: px, h: px, l: px, c: px, v: 1 }));
}
