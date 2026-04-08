import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { argon2id } from 'hash-wasm';
import type { EncryptedPayload, VaultState } from '../types';
import { fromBase64, randomBytes, toBase64 } from '../utils/crypto';
import { getSetting, setSetting } from './storage';

const VAULT_SALT_KEY = 'vault_salt';
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
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
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
    const salt = vaultSalt ?? randomBytes(16);
    if (!vaultSalt) {
      await setSetting(VAULT_SALT_KEY, toBase64(salt));
      setVaultSalt(salt);
    }
    const key = await deriveKey(password, salt);
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

export function useVault(): VaultState {
  const ctx = useContext(VaultContext);
  if (!ctx) {
    throw new Error('VaultProvider missing');
  }
  return ctx;
}
