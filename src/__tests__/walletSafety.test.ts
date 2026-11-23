import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkRpcNetwork, validateAddress, validateAmount } from '../services/walletSafety';

afterEach(() => vi.unstubAllGlobals());

describe('address validation per chain and network', () => {
  it('Bitcoin: accepts the right network and explains the wrong one', () => {
    expect(validateAddress('btc', 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu', 'mainnet')).toBeNull();
    expect(validateAddress('btc', 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu', 'testnet')).toMatch(/real \(mainnet\)/);
    expect(validateAddress('btc', 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx', 'testnet')).toBeNull();
    expect(validateAddress('btc', 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx', 'mainnet')).toMatch(/testnet address/);
    expect(validateAddress('btc', 'hello', 'testnet')).toBe('Not a valid Bitcoin address');
  });
  it('Ethereum and Solana formats', () => {
    expect(validateAddress('eth', '0x9858EfFD232B4033E47d90003D41EC34EcaEda94', 'mainnet')).toBeNull();
    expect(validateAddress('eth', '0x123', 'mainnet')).toMatch(/Not a valid Ethereum/);
    expect(validateAddress('sol', '11111111111111111111111111111112', 'testnet')).toMatch(/cannot receive|Not a valid/);
    expect(validateAddress('sol', 'not-base58!', 'testnet')).toBe('Not a valid Solana address');
    expect(validateAddress('eth', '  ', 'testnet')).toBe('Enter a recipient address');
  });
  it('amounts must be positive numbers', () => {
    expect(validateAmount('0')).toMatch(/greater than zero/);
    expect(validateAmount('abc')).toMatch(/greater than zero/);
    expect(validateAmount('0.01')).toBeNull();
  });
});

describe('RPC network check before signing', () => {
  const reply = (result: unknown) => vi.fn().mockResolvedValue({ ok: true, json: async () => ({ jsonrpc: '2.0', id: 1, result }) });
  it('Ethereum: refuses a Sepolia RPC when mainnet is selected', async () => {
    vi.stubGlobal('fetch', reply('0xaa36a7')); // 11155111 Sepolia
    expect(await checkRpcNetwork('eth', 'https://x', 'testnet')).toBeNull();
    expect(await checkRpcNetwork('eth', 'https://x', 'mainnet')).toMatch(/chain 11155111.*Nothing was sent/);
  });
  it('Solana: compares the genesis hash', async () => {
    vi.stubGlobal('fetch', reply('EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG'));
    expect(await checkRpcNetwork('sol', 'https://x', 'testnet')).toBeNull();
    expect(await checkRpcNetwork('sol', 'https://x', 'mainnet')).toMatch(/not on Solana mainnet/);
  });
  it('fails closed when the RPC cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await checkRpcNetwork('eth', 'https://x', 'testnet')).toMatch(/Could not verify.*Nothing was sent/);
  });
});
