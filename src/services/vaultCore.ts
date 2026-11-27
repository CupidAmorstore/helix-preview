// Pure vault-opening logic (no React, no storage): every branch is unit-tested in __tests__/vaultCore.test.ts.
// Security rule: an EXISTING vault never opens unless the password is proven by authenticated decryption.
import type { EncryptedPayload } from '../types';
import { fromBase64, randomBytes, toBase64 } from '../utils/crypto';

export const VERIFIER_TEXT = 'helix-vault-ok';
export const MIN_VAULT_PASSWORD = 10;
const VERSION = 1;

export class VaultError extends Error {
  constructor(public code: 'too-short' | 'wrong-password' | 'damaged' | 'rate-limited', message: string) {
    super(message);
  }
}

export type DeriveFn = (password: string, salt: Uint8Array) => Promise<CryptoKey>;

export type VaultSnapshot = {
  salt: Uint8Array | null;
  /** stored verifier (may be missing or malformed) */
  verifier: unknown;
  /** every other payload encrypted with the vault key (keystore, API settings, exchange records) */
  items: unknown[];
};

export type OpenResult = {
  /** created: no vault existed. unlocked: verifier matched. migrated: legacy/corrupt verifier, proven via
   *  existing data, verifier (re)written. reset-empty: a salt existed but NOTHING was ever encrypted with it. */
  kind: 'created' | 'unlocked' | 'migrated' | 'reset-empty';
  key: CryptoKey;
  salt: Uint8Array;
  /** values the caller must persist (only after a successful proof) */
  write?: { salt?: string; verifier: EncryptedPayload };
};

export function isWellFormed(p: unknown): p is EncryptedPayload {
  if (!p || typeof p !== 'object') return false;
  const x = p as EncryptedPayload;
  if (typeof x.cipher !== 'string' || typeof x.iv !== 'string' || !x.cipher || !x.iv) return false;
  try {
    return fromBase64(x.iv).length === 12 && fromBase64(x.cipher).length >= 16; // GCM tag alone is 16 bytes
  } catch {
    return false;
  }
}

/** Authenticated decrypt; null on any failure (wrong key, tampering, malformed). */
export async function tryDecrypt(key: CryptoKey, p: unknown): Promise<string | null> {
  if (!isWellFormed(p)) return null;
  try {
    const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(p.iv) }, key, fromBase64(p.cipher));
    return new TextDecoder().decode(buf);
  } catch {
    return null;
  }
}

export async function sealVerifier(key: CryptoKey, salt: Uint8Array): Promise<EncryptedPayload> {
  const iv = randomBytes(12);
  const c = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(VERIFIER_TEXT));
  return { cipher: toBase64(new Uint8Array(c)), iv: toBase64(iv), salt: toBase64(salt), version: VERSION };
}

async function create(password: string, derive: DeriveFn, kind: 'created' | 'reset-empty'): Promise<OpenResult> {
  if (password.length < MIN_VAULT_PASSWORD) throw new VaultError('too-short', `Use at least ${MIN_VAULT_PASSWORD} characters.`);
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return { kind, key, salt, write: { salt: toBase64(salt), verifier: await sealVerifier(key, salt) } };
}

export async function openVault(snap: VaultSnapshot, password: string, derive: DeriveFn): Promise<OpenResult> {
  if (!snap.salt) return create(password, derive, 'created');
  const salt = snap.salt;
  const data = snap.items.filter(isWellFormed);
  const hasVerifier = isWellFormed(snap.verifier);

  // A salt with no verifier and no encrypted data protects nothing: rotate to a fresh vault (new salt,
  // new verifier). No secret becomes readable, and nothing existing is overwritten.
  if (!hasVerifier && data.length === 0) return create(password, derive, 'reset-empty');

  const key = await derive(password, salt);
  if (hasVerifier) {
    const text = await tryDecrypt(key, snap.verifier);
    if (text === VERIFIER_TEXT) return { kind: 'unlocked', key, salt };
    if (text !== null) throw new VaultError('damaged', 'Vault check data is damaged. Nothing was changed.');
    // verifier did not open: wrong password, unless the verifier itself is corrupt and real data proves the key
    for (const it of data) if ((await tryDecrypt(key, it)) !== null) return { kind: 'migrated', key, salt, write: { verifier: await sealVerifier(key, salt) } };
    throw new VaultError('wrong-password', 'Wrong password.');
  }
  // legacy vault (no/malformed verifier) with encrypted data: the password must open at least one item
  for (const it of data) if ((await tryDecrypt(key, it)) !== null) return { kind: 'migrated', key, salt, write: { verifier: await sealVerifier(key, salt) } };
  throw new VaultError('wrong-password', 'Wrong password.');
}

export const IDLE_LOCK_MS = 5 * 60_000;
export const BACKGROUND_LOCK_MS = 60_000;

/**
 * Lock decision from wall-clock timestamps. Android pauses JavaScript timers while the app is in the
 * background, so a setTimeout-based lock may never fire; this check runs when the app becomes visible
 * again and periodically, and only compares times.
 */
export function shouldLock(now: number, lastActiveAt: number, hiddenAt: number | null): boolean {
  if (hiddenAt !== null && now - hiddenAt >= BACKGROUND_LOCK_MS) return true;
  return now - lastActiveAt >= IDLE_LOCK_MS;
}

/** Only one unlock attempt may run at a time: parallel attempts would all read the same failure counter
 *  and bypass the throttle. */
export function createSingleFlight() {
  let busy = false;
  return async <T,>(fn: () => Promise<T>): Promise<T> => {
    if (busy) throw new VaultError('rate-limited', 'An unlock attempt is already in progress.');
    busy = true;
    try {
      return await fn();
    } finally {
      busy = false;
    }
  };
}

/** Delay before the next attempt after n consecutive failures (argon2id already costs ~0.5–1 s per try). */
export function failureDelayMs(failures: number): number {
  return failures < 5 ? 0 : Math.min(5 * 60_000, 30_000 * 2 ** (failures - 5));
}
