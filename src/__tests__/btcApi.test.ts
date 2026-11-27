import { describe, expect, it } from 'vitest';
import { btcFetch } from '../services/btcApi';

const resp = (status: number) => ({ ok: status < 300, status }) as Response;

describe('bitcoin data fallback', () => {
  it('uses the second provider when the first is down or rate-limited', async () => {
    for (const first of [503, 429]) {
      const seen: string[] = [];
      const f = (async (u: string) => { seen.push(u); return resp(seen.length === 1 ? first : 200); }) as unknown as typeof fetch;
      const r = await btcFetch('mainnet', '/address/x', undefined, f);
      expect(r.status).toBe(200);
      expect(seen[1]).toContain('mempool.space/api/address/x');
    }
  });
  it('a network error also falls through', async () => {
    let n = 0;
    const f = (async () => { if (n++ === 0) throw new TypeError('Failed to fetch'); return resp(200); }) as unknown as typeof fetch;
    expect((await btcFetch('testnet', '/fee-estimates', undefined, f)).status).toBe(200);
  });
  it('a real 400 answer (bad address / rejected tx) is returned, not retried', async () => {
    let n = 0;
    const f = (async () => { n++; return resp(400); }) as unknown as typeof fetch;
    expect((await btcFetch('mainnet', '/tx', { method: 'POST' }, f)).status).toBe(400);
    expect(n).toBe(1);
  });
  it('all providers down → throws', async () => {
    const f = (async () => resp(502)) as unknown as typeof fetch;
    await expect(btcFetch('mainnet', '/x', undefined, f)).rejects.toThrow();
  });
});
