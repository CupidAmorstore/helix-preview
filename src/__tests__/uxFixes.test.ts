// Audit fixes DAT-1 (export) and WA-2 (disabled send paths are unreachable, so their success strings can never show).
import { describe, expect, it, vi } from 'vitest';
import { CSV_HEADER, ordersCsv } from '../paper/exportCsv';
import type { PaperAccount } from '../paper/engine';
import { SEND_DISABLED_MSG, broadcastBtcTx, buildAndSignBtcTx, sendEthTransaction, sendSolTransaction } from '../services/wallet';

const acc = {
  version: 1, createdAt: Date.UTC(2026, 10, 25), startingCash: 1000, cash: 999.41, positions: {}, equity: [], halted: false,
  limits: { maxPositionFraction: 0.5, minOrderUsd: 1, maxQuoteAgeMs: 60_000 },
  orders: [
    { id: 'o1', clientId: 'c1', ts: Date.UTC(2026, 10, 25, 12), symbol: 'BTC', product: 'BTC-USD', side: 'buy', status: 'filled', quotePx: 60000, fillPx: 60001, qty: 0.00082833, cashUsd: 50, feeUsd: 0.3, slippageUsd: 0.001 },
    { id: 'o2', clientId: 'c2', ts: Date.UTC(2026, 10, 25, 13), symbol: 'BTC', product: 'BTC-USD', side: 'sell', status: 'filled', quotePx: 60000, fillPx: 59999, qty: 0.00082833, cashUsd: 49.41, feeUsd: 0.3, slippageUsd: 0.001, realizedPnl: -0.59 },
    { id: 'o3', clientId: 'c3', ts: Date.UTC(2026, 10, 25, 14), symbol: 'ETH', product: 'ETH-USD', side: 'buy', status: 'rejected', reason: 'Not enough paper cash, "really"', quotePx: 1680, fillPx: 0, qty: 0, cashUsd: 0, feeUsd: 0 }
  ]
} as unknown as PaperAccount;

describe('DAT-1 paper order export', () => {
  const csv = ordersCsv(acc);
  const lines = csv.trim().split('\n');
  it('has a header, one line per order (refusals included) and a footer that says it is simulated', () => {
    expect(lines[0]).toBe(CSV_HEADER.join(','));
    expect(lines).toHaveLength(1 + 3 + 1);
    expect(lines.at(-1)).toMatch(/simulated, not real money/);
  });
  it('cash column reconciles with the account: start + sum(cash) = cash now', () => {
    const idx = CSV_HEADER.indexOf('cash_usd');
    const sum = lines.slice(1, 4).map((l) => Number(l.split(',')[idx]) || 0).reduce((a, b) => a + b, 0);
    expect(1000 + sum).toBeCloseTo(acc.cash, 9);
  });
  it('escapes commas and quotes', () => {
    expect(lines[3]).toContain('"Not enough paper cash, ""really"""');
  });
});

describe('WA-2 every signing/broadcast path refuses before doing anything', () => {
  it.each(['testnet', 'mainnet'] as const)('%s', async (network) => {
    const net = vi.spyOn(globalThis, 'fetch');
    await expect(buildAndSignBtcTx({ mnemonic: 'x', toAddress: 'y', amountSats: 1, feeRate: 1, network } as never)).rejects.toThrow(SEND_DISABLED_MSG);
    await expect(broadcastBtcTx('00', network)).rejects.toThrow(SEND_DISABLED_MSG);
    await expect(sendEthTransaction({ mnemonic: 'x', toAddress: 'y', amountEth: '1', rpcUrl: 'http://127.0.0.1:1', network } as never)).rejects.toThrow(SEND_DISABLED_MSG);
    await expect(sendSolTransaction({ mnemonic: 'x', toAddress: 'y', amountSol: 1, rpcUrl: 'http://127.0.0.1:1', network })).rejects.toThrow(SEND_DISABLED_MSG);
    expect(net).not.toHaveBeenCalled(); // nothing reached the network
    net.mockRestore();
  });
});
