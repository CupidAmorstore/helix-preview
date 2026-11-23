// Bitcoin Esplora API with a fallback: Blockstream and mempool.space serve the same endpoints.
// A single provider being slow or rate-limited no longer breaks balances, history or sending.
export type BtcNet = 'mainnet' | 'testnet';
export const BTC_PROVIDERS: Record<BtcNet, string[]> = {
  mainnet: ['https://blockstream.info/api', 'https://mempool.space/api'],
  testnet: ['https://blockstream.info/testnet/api', 'https://mempool.space/testnet/api']
};

export async function btcFetch(network: BtcNet, path: string, init?: RequestInit, fetchImpl: typeof fetch = fetch, timeoutMs = 8000): Promise<Response> {
  let last: unknown = null;
  for (const base of BTC_PROVIDERS[network]) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`${base}${path}`, { ...init, signal: ctl.signal });
      // 4xx other than rate limiting is a real answer (e.g. invalid address, rejected tx): don't retry elsewhere
      if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429)) return res;
      last = new Error(`HTTP ${res.status}`);
    } catch (e) {
      last = e;
    } finally {
      clearTimeout(t);
    }
  }
  throw last instanceof Error ? last : new Error('Bitcoin data unavailable');
}
