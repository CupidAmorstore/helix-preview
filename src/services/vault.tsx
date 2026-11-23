import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { argon2id } from 'hash-wasm';
import type { EncryptedPayload, VaultState } from '../types';
import { fromBase64, randomBytes, toBase64 } from '../utils/crypto';
import { getKeystore, getSetting, setSetting } from './storage';

const VAULT_SALT_KEY = 'vault_salt';
const VAULT_VERIFIER_KEY = 'vault_verifier';
const VERIFIER_TEXT = 'helix-vault-ok';
export const MIN_VAULT_PASSWORD = 10;

async function encryptWith(key: CryptoKey, salt: Uint8Array, text: string): Promise<EncryptedPayload> {
  const iv = randomBytes(12);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
  return { cipher: toBase64(new Uint8Array(cipher)), iv: toBase64(iv), salt: toBase64(salt), version: VAULT_VERSION };
}

async function canDecrypt(key: CryptoKey, payload: EncryptedPayload | null | undefined): Promise<boolean | null> {
  if (!payload?.cipher || !payload.iv) return null;
  try {
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(payload.iv) }, key, fromBase64(payload.cipher));
    return true;
  } catch {
    return false;
  }
}

/** Checks a password-derived key against what the vault already holds. AES-GCM fails on a wrong key. */
export async function verifyVaultKey(key: CryptoKey, items: (EncryptedPayload | null | undefined)[]): Promise<boolean> {
  for (const it of items) {
    const ok = await canDecrypt(key, it);
    if (ok !== null) return ok;
  }
  return true; // nothing encrypted yet: the first password sets the vault
}
const VAULT_VERSION = 1;

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const pwdBytes = new TextEncoder().encode(password);
  const hash = await argon2id({
    password: pwdBytes,
    salt,
    parallelism: 1,
    iterations: 3,
    memorySize: 65536,
    hashLength: 32,
    outputType: 'binary'
  });
  pwdBytes.fill(0);
  const keyBytes = new Uint8Array(hash);
  hash.fill(0);
  try {
    return await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  } finally {
    keyBytes.fill(0);
  }
}

const VaultContext = createContext<VaultState | null>(null);

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [vaultSalt, setVaultSalt] = useState<Uint8Array | null>(null);
  const [ready, setReady] = useState(false);
  const lockTimer = useRef<number | null>(null);

  const scheduleAutoLock = useCallback(() => {
    if (lockTimer.current) {
      window.clearTimeout(lockTimer.current);
    }
    lockTimer.current = window.setTimeout(() => {
      setCryptoKey(null);
    }, 5 * 60 * 1000);
  }, []);

  useEffect(() => {
    let mounted = true;
    getSetting<string>(VAULT_SALT_KEY).then((stored) => {
      if (!mounted) return;
      if (stored) {
        setVaultSalt(fromBase64(stored));
      }
      setReady(true);
    });
    return () => {
      mounted = false;
      if (lockTimer.current) {
        window.clearTimeout(lockTimer.current);
      }
    };
  }, []);

  const unlock = useCallback(async (password: string) => {
    if (!vaultSalt) {
      // creating a new vault
      if (password.length < MIN_VAULT_PASSWORD) throw new Error(`Use at least ${MIN_VAULT_PASSWORD} characters.`);
      const salt = randomBytes(16);
      const key = await deriveKey(password, salt);
      await setSetting(VAULT_VERIFIER_KEY, await encryptWith(key, salt, VERIFIER_TEXT));
      await setSetting(VAULT_SALT_KEY, toBase64(salt));
      setVaultSalt(salt);
      setCryptoKey(key);
      scheduleAutoLock();
      return;
    }
    const key = await deriveKey(password, vaultSalt);
    const verifier = await getSetting<EncryptedPayload>(VAULT_VERIFIER_KEY);
    // older vaults have no verifier: check against anything already encrypted with the vault key
    const items = verifier ? [verifier] : [
      (await getKeystore())?.payload,
      await getSetting<EncryptedPayload>('etherscan_key'),
      await getSetting<EncryptedPayload>('eth_rpc'),
      await getSetting<EncryptedPayload>('sol_rpc')
    ];
    if (!(await verifyVaultKey(key, items))) throw new Error('Wrong password.');
    if (!verifier) await setSetting(VAULT_VERIFIER_KEY, await encryptWith(key, vaultSalt, VERIFIER_TEXT));
    setCryptoKey(key);
    scheduleAutoLock();
  }, [vaultSalt, scheduleAutoLock]);

  const lock = useCallback(() => {
    setCryptoKey(null);
    if (lockTimer.current) {
      window.clearTimeout(lockTimer.current);
      lockTimer.current = null;
    }
  }, []);

  const encrypt = useCallback(async (data: string): Promise<EncryptedPayload> => {
    if (!cryptoKey || !vaultSalt) {
      throw new Error('Vault is locked');
    }
    const iv = randomBytes(12);
    const encoded = new TextEncoder().encode(data);
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoded);
    encoded.fill(0);
    scheduleAutoLock();
    return {
      cipher: toBase64(new Uint8Array(cipher)),
      iv: toBase64(iv),
      salt: toBase64(vaultSalt),
      version: VAULT_VERSION
    };
  }, [cryptoKey, vaultSalt, scheduleAutoLock]);

  const decrypt = useCallback(async (payload: EncryptedPayload): Promise<string> => {
    if (!cryptoKey) {
      throw new Error('Vault is locked');
    }
    const iv = fromBase64(payload.iv);
    const cipherBytes = fromBase64(payload.cipher);
    const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, cipherBytes);
    const text = new TextDecoder().decode(plainBuffer);
    scheduleAutoLock();
    return text;
  }, [cryptoKey, scheduleAutoLock]);

  const value = useMemo<VaultState>(() => ({
    locked: !cryptoKey,
    hasVault: Boolean(vaultSalt),
    unlock,
    lock,
    encrypt,
    decrypt
  }), [cryptoKey, vaultSalt, unlock, lock, encrypt, decrypt]);

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Initializing vault...</div>;
  }

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components -- hook is intentionally co-located with its provider
export function useVault(): VaultState {
  const ctx = useContext(VaultContext);
  if (!ctx) {
    throw new Error('VaultProvider missing');
  }
  return ctx;
}
