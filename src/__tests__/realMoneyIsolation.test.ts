import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { assertSendAllowed, broadcastBtcTx, buildAndSignBtcTx, sendEthTransaction, sendSolTransaction, WALLET_MAINNET_SEND_ENABLED, WALLET_SEND_ENABLED } from '../services/wallet';
import { LIVE_TRADING_ENABLED, assertPaperOnly } from '../bot/risk';

const TV = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
afterEach(() => vi.unstubAllGlobals());

describe('real-money isolation: flags', () => {
  it('live trading and mainnet sending are compiled off', () => {
    expect(LIVE_TRADING_ENABLED).toBe(false);
    expect(WALLET_MAINNET_SEND_ENABLED).toBe(false);
    expect(WALLET_SEND_ENABLED).toBe(false);
    expect(() => assertPaperOnly()).not.toThrow();
    expect(() => assertSendAllowed('mainnet')).toThrow(/disabled/);
    expect(() => assertSendAllowed('testnet')).toThrow(/disabled/); // private beta: no broadcasts on any network
  });
});

describe('transaction isolation: every transaction function refuses (any network) before touching the network or signing', () => {
  it('BTC sign + broadcast, ETH send, SOL send — mainnet and testnet', async () => {
    const f = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', f);
    for (const network of ['mainnet', 'testnet'] as const) {
      await expect(broadcastBtcTx('00', network)).rejects.toThrow(/disabled/);
      await expect(buildAndSignBtcTx({ mnemonic: TV, toAddress: 'tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl', amountSats: 1000, feeRate: 1, network })).rejects.toThrow(/disabled/);
      await expect(sendEthTransaction({ mnemonic: TV, toAddress: '0x0000000000000000000000000000000000000001', amountEth: '0.01', rpcUrl: 'https://rpc.invalid', network })).rejects.toThrow(/disabled/);
      await expect(sendSolTransaction({ mnemonic: TV, toAddress: '11111111111111111111111111111111', amountSol: 0.01, rpcUrl: 'https://rpc.invalid', network })).rejects.toThrow(/disabled/);
    }
    await expect(sendEthTransaction({ mnemonic: TV, toAddress: '0x0000000000000000000000000000000000000001', amountEth: '0.01', rpcUrl: 'https://rpc.invalid', network: 'mainnet' })).rejects.toThrow(/disabled/);
    await expect(sendSolTransaction({ mnemonic: TV, toAddress: '11111111111111111111111111111111', amountSol: 0.01, rpcUrl: 'https://rpc.invalid', network: 'mainnet' })).rejects.toThrow(/disabled/);
    expect(f).not.toHaveBeenCalled();
  });
  it('an RPC that claims "testnet" but is really Ethereum mainnet (chainId 1) is refused before signing', async () => {
    const calls: string[] = [];
    const { FetchRequest } = await import('ethers');
    FetchRequest.registerGetUrl(async (req) => {
      const body = JSON.parse(new TextDecoder().decode(req.body ?? new Uint8Array()));
      const reqs = Array.isArray(body) ? body : [body];
      reqs.forEach((x: { method: string }) => calls.push(x.method));
      const res = reqs.map((x: { id: number; method: string }) => ({ jsonrpc: '2.0', id: x.id, result: x.method === 'eth_chainId' ? '0x1' : '0x0' }));
      return { statusCode: 200, statusMessage: 'OK', headers: { 'content-type': 'application/json' }, body: new TextEncoder().encode(JSON.stringify(Array.isArray(body) ? res : res[0])) };
    });
    await expect(sendEthTransaction({ mnemonic: TV, toAddress: '0x0000000000000000000000000000000000000001', amountEth: '0.01', rpcUrl: 'https://rpc.invalid', network: 'testnet' })).rejects.toThrow(/disabled|chain 1|not the selected/);
    expect(calls).not.toContain('eth_sendRawTransaction');
  });
});

// ---- static regression: no new real-money primitive may appear outside the guarded wallet module ----
const SRC = join(__dirname, '..');
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? (f === '__tests__' ? [] : walk(join(d, f))) : [join(d, f)]));
const files = walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f)).map((f) => ({ f: f.slice(SRC.length + 1), s: readFileSync(f, 'utf8') }));

describe('real-money isolation: source scan', () => {
  it('transaction primitives exist only in services/wallet.ts', () => {
    const prim = /\bsendTransaction\s*\(|sendRawTransaction\s*\(|signTransaction\s*\(|\.signInput\s*\(|method:\s*'POST',\s*body:\s*rawTx/;
    const hits = files.filter(({ s }) => prim.test(s)).map(({ f }) => f);
    expect(hits).toEqual(['services/wallet.ts']);
  });
  it('every exported transaction function in wallet.ts calls assertSendAllowed', () => {
    const s = files.find((x) => x.f === 'services/wallet.ts')!.s;
    for (const fn of ['buildAndSignBtcTx', 'broadcastBtcTx', 'sendEthTransaction', 'sendSolTransaction']) {
      const body = s.slice(s.indexOf(`export async function ${fn}`), s.indexOf('\nexport ', s.indexOf(`export async function ${fn}`) + 10));
      expect(body, fn).toMatch(/assertSendAllowed\(/);
    }
  });
  it('no exchange order / withdrawal endpoint anywhere', () => {
    const order = /api\.exchange\.coinbase\.com\/orders|api\.coinbase\.com\/api\/v3\/brokerage\/orders|\/0\/private\/(AddOrder|Withdraw)|api\.gemini\.com\/v1\/order|\/withdrawals?\b/;
    expect(files.filter(({ s }) => order.test(s)).map(({ f }) => f)).toEqual([]);
  });
  it('paper engine and trading bot never import wallet send functions', () => {
    const bad = files.filter(({ f, s }) => /^(paper|bot)\//.test(f) && /services\/wallet'/.test(s)).map(({ f }) => f);
    expect(bad).toEqual([]);
  });
});
