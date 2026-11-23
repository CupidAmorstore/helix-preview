import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchEthBalance } from '../services/onchain';

afterEach(() => vi.unstubAllGlobals());

describe('Etherscan V2', () => {
  it('calls the V2 endpoint on Ethereum mainnet and parses wei', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: '1', message: 'OK', result: '1500000000000000000' }) });
    vi.stubGlobal('fetch', fetchMock);
    const r = await fetchEthBalance('0xabc', 'KEY');
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://api.etherscan.io/v2/api');
    expect(url.searchParams.get('chainid')).toBe('1');
    expect(url.searchParams.get('action')).toBe('balance');
    expect(url.searchParams.get('apikey')).toBe('KEY');
    expect(r.eth).toBe(1.5);
  });
  it('surfaces the readable Etherscan error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: '0', message: 'NOTOK', result: 'Missing/Invalid API Key' }) }));
    await expect(fetchEthBalance('0xabc', 'bad')).rejects.toThrow('Missing/Invalid API Key');
  });
});
