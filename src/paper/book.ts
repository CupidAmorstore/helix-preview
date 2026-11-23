// Live order book for paper fills (Coinbase Exchange public REST, level 2 = top 50 levels per side).
import type { Book } from './engine';

export async function fetchBook(product: string, timeoutMs = 2500, fetchImpl: typeof fetch = fetch): Promise<Book | null> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`https://api.exchange.coinbase.com/products/${encodeURIComponent(product)}/book?level=2`, { signal: ctl.signal, cache: 'no-store' });
    if (!res.ok) return null;
    const j = (await res.json()) as { bids?: [string, string, number][]; asks?: [string, string, number][] };
    const lv = (x?: [string, string, number][]) => (x ?? []).map(([p, s]) => [Number(p), Number(s)] as [number, number]).filter(([p, s]) => p > 0 && s > 0);
    const book = { bids: lv(j.bids), asks: lv(j.asks), ts: Date.now() };
    return book.bids.length && book.asks.length ? book : null;
  } catch {
    return null; // fall back to the cost model; the order records which model was used
  } finally {
    clearTimeout(t);
  }
}
