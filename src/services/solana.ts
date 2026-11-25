// Minimal Solana key/address helpers on audited primitives (@noble/curves Ed25519, @scure/base base58),
// replacing @solana/web3.js (which pulled in vulnerable `uuid` copies). Address derivation + validation only;
// this build signs/broadcasts nothing (see wallet.ts assertSendAllowed).
import { ed25519 } from '@noble/curves/ed25519';
import { base58 } from '@scure/base';

/** Solana keypair from a 32-byte Ed25519 seed: secretKey = seed || publicKey (64 bytes), like web3.js. */
export function solKeypairFromSeed(seed: Uint8Array) {
  if (seed.length !== 32) throw new Error('Solana seed must be 32 bytes');
  const publicKey = ed25519.getPublicKey(seed);
  const secretKey = new Uint8Array(64);
  secretKey.set(seed, 0);
  secretKey.set(publicKey, 32);
  return { publicKey, secretKey, address: base58.encode(publicKey) };
}

/**
 * 'ok' = valid on-curve wallet address; 'off-curve' = valid 32-byte key that is not a wallet (e.g. PDA);
 * 'small-order' = on-curve but in the 8-torsion subgroup (e.g. 11111111111111111111111111111111): no one holds a
 * private key for it, so funds sent there are unrecoverable (web3.js reports these as on-curve); 'invalid'.
 */
export function checkSolanaAddress(address: string): 'ok' | 'off-curve' | 'small-order' | 'invalid' {
  let bytes: Uint8Array;
  try {
    bytes = base58.decode(address.trim());
  } catch {
    return 'invalid';
  }
  if (bytes.length !== 32) return 'invalid';
  try {
    const p = ed25519.ExtendedPoint.fromHex(bytes);
    return p.isSmallOrder() ? 'small-order' : 'ok';
  } catch {
    return 'off-curve';
  }
}
