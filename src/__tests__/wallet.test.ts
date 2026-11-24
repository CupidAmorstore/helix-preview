import { describe, expect, it } from 'vitest';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from '@bitcoinerlab/secp256k1';
import { Buffer } from 'buffer';
import { ed25519 } from '@noble/curves/ed25519';
import { checkSolanaAddress } from '../services/solana';
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

  it('SOL m/44\'/501\'/0\'/0\' matches the vector produced by @solana/web3.js before its removal', async () => {
    const w = await deriveAddresses(M, 'mainnet');
    expect(w.sol.address).toBe('HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk');
    expect(w.sol.secretKey).toMatch(/^[0-9a-f]{128}$/);
    expect(w.sol.secretKey.slice(64)).toBe('f036276246a75b9de3349ed42b15e232f6518fc20f5fcd4f1d64e81f9bd258f7');
  });

  it('SOL secret key = seed || public key, and the seed signs for that public key', async () => {
    const w = await deriveAddresses(M, 'mainnet');
    const sk = Uint8Array.from(Buffer.from(w.sol.secretKey, 'hex'));
    const pub = sk.slice(32);
    expect(Buffer.from(ed25519.getPublicKey(sk.slice(0, 32))).toString('hex')).toBe(Buffer.from(pub).toString('hex'));
    const msg = new TextEncoder().encode('helix');
    expect(ed25519.verify(ed25519.sign(msg, sk.slice(0, 32)), msg, pub)).toBe(true);
    expect(checkSolanaAddress(w.sol.address)).toBe('ok');
  });
});

describe('Solana address checks without @solana/web3.js', () => {
  it('valid, off-curve and invalid addresses', () => {
    expect(checkSolanaAddress('HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk')).toBe('ok');
    expect(checkSolanaAddress('11111111111111111111111111111111')).toBe('ok'); // system program id: all-zero, on curve
    expect(checkSolanaAddress('not-base58!')).toBe('invalid');
    expect(checkSolanaAddress('3yZe7d')).toBe('invalid'); // wrong length
  });
});
