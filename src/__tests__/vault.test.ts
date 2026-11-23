import { describe, expect, it, vi } from 'vitest';
vi.mock('../services/storage', () => ({ getSetting: async () => null, setSetting: async () => undefined, getKeystore: async () => null }));
const { verifyVaultKey } = await import('../services/vault');

const key = () => crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
const b64 = (u: Uint8Array) => Buffer.from(u).toString('base64');
async function seal(k: CryptoKey, text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(text)));
  return { cipher: b64(c), iv: b64(iv), salt: '', version: 1 };
}

describe('vault password check (regression: any password used to "unlock")', () => {
  it('right key passes, wrong key fails', async () => {
    const right = await key();
    const wrong = await key();
    const item = await seal(right, 'helix-vault-ok');
    expect(await verifyVaultKey(right, [item])).toBe(true);
    expect(await verifyVaultKey(wrong, [item])).toBe(false);
  });
  it('legacy vault: checks the first encrypted item it finds', async () => {
    const right = await key();
    const wrong = await key();
    const ks = await seal(right, 'mnemonic words');
    expect(await verifyVaultKey(wrong, [null, undefined, ks])).toBe(false);
  });
  it('empty vault accepts the first password', async () => {
    expect(await verifyVaultKey(await key(), [null, undefined])).toBe(true);
  });
});
