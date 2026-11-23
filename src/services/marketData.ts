// Public market data for discovery and asset pages. Every result carries its source and time.
const CB = 'https://api.exchange.coinbase.com';
const CG = 'https://api.coingecko.com/api/v3';

export type Sourced<T> = { data: T; source: string; fetchedAt: number; fromCache: boolean };

function cacheGet<T>(key: string): { data: T; fetchedAt: number } | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function cacheSet<T>(key: string, data: T, fetchedAt: number) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, fetchedAt }));
  } catch {
    // storage full or unavailable: serve without caching
  }
}

/** Fetch with a cache: fresh data when possible; the last good copy (with its age) when the source fails. */
async function cached<T>(key: string, maxAgeMs: number, source: string, load: () => Promise<T>): Promise<Sourced<T>> {
  const c = cacheGet<T>(key);
  if (c && Date.now() - c.fetchedAt < maxAgeMs) return { data: c.data, source, fetchedAt: c.fetchedAt, fromCache: true };
  try {
    const data = await load();
    const now = Date.now();
    cacheSet(key, data, now);
    return { data, source, fetchedAt: now, fromCache: false };
  } catch (e) {
    if (c) return { data: c.data, source, fetchedAt: c.fetchedAt, fromCache: true };
    throw e;
  }
}

export type CoinbaseProduct = { id: string; base: string; minFunds: number };

export function fetchCoinbaseProducts(): Promise<Sourced<CoinbaseProduct[]>> {
  return cached('helix_cb_products', 6 * 3_600_000, 'Coinbase', async () => {
    const res = await fetch(`${CB}/products`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Coinbase products failed (${res.status})`);
    const rows = (await res.json()) as {
      id: string; base_currency: string; quote_currency: string; status: string; trading_disabled: boolean; min_market_funds?: string;
    }[];
    return rows
      .filter((r) => r.quote_currency === 'USD' && r.status === 'online' && !r.trading_disabled)
      .map((r) => ({ id: r.id, base: r.base_currency, minFunds: Number(r.min_market_funds ?? 1) || 1 }));
  });
}

export type CoinStats = { open: number; high: number; low: number; last: number; volume: number };

export async function fetchCoinbaseStats(product: string): Promise<Sourced<CoinStats>> {
  const res = await fetch(`${CB}/products/${product}/stats`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Coinbase stats failed (${res.status})`);
  const j = await res.json();
  return {
    data: { open: +j.open, high: +j.high, low: +j.low, last: +j.last, volume: +j.volume },
    source: 'Coinbase',
    fetchedAt: Date.now(),
    fromCache: false
  };
}

export type CoinGeckoCoin = {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price: number;
  market_cap: number | null;
  market_cap_rank: number | null;
  total_volume: number | null;
  price_change_percentage_24h: number | null;
};

export function fetchTopCoins(): Promise<Sourced<CoinGeckoCoin[]>> {
  return cached('helix_cg_top100', 5 * 60_000, 'CoinGecko', async () => {
    const res = await fetch(`${CG}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status === 429 ? 'CoinGecko rate limit reached' : `CoinGecko failed (${res.status})`);
    const rows = (await res.json()) as CoinGeckoCoin[];
    return rows.map((r) => ({
      id: r.id, symbol: r.symbol.toUpperCase(), name: r.name, image: r.image, current_price: r.current_price,
      market_cap: r.market_cap ?? null, market_cap_rank: r.market_cap_rank ?? null, total_volume: r.total_volume ?? null,
      price_change_percentage_24h: r.price_change_percentage_24h ?? null
    }));
  });
}

export const fmtUsd = (v: number | null | undefined, opts: { compact?: boolean } = {}) => {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  if (opts.compact) return `$${Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 2 }).format(v)}`;
  // sub-cent coins (e.g. PEPE) keep 4 significant digits instead of rounding to $0.00
  if (v !== 0 && Math.abs(v) < 0.01) return `$${v.toLocaleString(undefined, { maximumSignificantDigits: 4 })}`;
  const d = Math.abs(v) < 1 ? 4 : 2;
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: d })}`;
};

export const fmtAge = (ts: number, now = Date.now()) => {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86_400)} days ago`;
};
