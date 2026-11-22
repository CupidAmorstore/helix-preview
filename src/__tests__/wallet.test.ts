import { describe, expect, it } from 'vitest';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from '@bitcoinerlab/secp256k1';
import { Buffer } from 'buffer';
import { Keypair } from '@solana/web3.js';
import { deriveAddresses } from '../services/wallet';

// Standard public test mnemonic (BIP39/BIP84 test vectors). Never holds funds.
const M = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const ECPair = ECPairFactory(ecc);

describe('wallet derivation (known test vectors)', () => {
  it('BTC mainnet BIP84 m/84\'/0\'/0\'/0/0 matches the BIP84 test vector', async () => {
    const w = await deriveAddresses(M, 'mainnet');
    expect(w.btc.address).toBe('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
  });

  it('BTC private key is 32-byte hex and controls the derived address', async () => {
    for (const net of ['mainnet', 'testnet'] as const) {
      const w = await deriveAddresses(M, net);
      expect(w.btc.privateKey).toMatch(/^[0-9a-f]{64}$/);
      const network = net === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
      const kp = ECPair.fromPrivateKey(Buffer.from(w.btc.privateKey, 'hex'), { network });
      expect(bitcoin.payments.p2wpkh({ pubkey: Buffer.from(kp.publicKey), network }).address).toBe(w.btc.address);
    }
  });

  it('BTC testnet uses a tb1 address', async () => {
    expect((await deriveAddresses(M, 'testnet')).btc.address).toMatch(/^tb1q/);
  });

  it('ETH m/44\'/60\'/0\'/0/0 matches the well-known vector', async () => {
    const w = await deriveAddresses(M, 'mainnet');
    expect(w.eth.address).toBe('0x9858EfFD232B4033E47d90003D41EC34EcaEda94');
    expect(w.eth.privateKey).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('SOL secret key round-trips to the derived address', async () => {
    const w = await deriveAddresses(M, 'mainnet');
    expect(w.sol.secretKey).toMatch(/^[0-9a-f]{128}$/);
    const kp = Keypair.fromSecretKey(Uint8Array.from(Buffer.from(w.sol.secretKey, 'hex')));
    expect(kp.publicKey.toBase58()).toBe(w.sol.address);
  });
});
