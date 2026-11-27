import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { argon2id } from 'hash-wasm';
import type { EncryptedPayload, VaultState } from '../types';
import { fromBase64, randomBytes, toBase64 } from '../utils/crypto';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { getKeystore, getSetting, listExchanges, setSetting } from './storage';
import { createSingleFlight, failureDelayMs, shouldLock, MIN_VAULT_PASSWORD, openVault, VaultError } from './vaultCore';

const singleFlight = createSingleFlight();

const VAULT_SALT_KEY = 'vault_salt';
const VAULT_VERIFIER_KEY = 'vault_verifier';
const VAULT_FAILURES_KEY = 'vault_failures';
export { MIN_VAULT_PASSWORD };
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
  const lastActive = useRef(Date.now());
  const hiddenAt = useRef<number | null>(null);

  // activity resets the idle clock; the lock itself is decided from timestamps (see shouldLock)
  const scheduleAutoLock = useCallback(() => {
    lastActive.current = Date.now();
  }, []);

  useEffect(() => {
    const check = () => {
      if (shouldLock(Date.now(), lastActive.current, hiddenAt.current)) setCryptoKey(null);
    };
    const toBackground = () => {
      if (hiddenAt.current === null) hiddenAt.current = Date.now();
    };
    const toForeground = () => {
      check(); // decide on return, even if timers were frozen in the background
      hiddenAt.current = null;
    };
    const onVis = () => (document.visibilityState === 'hidden' ? toBackground() : toForeground());
    lockTimer.current = window.setInterval(check, 10_000);
    document.addEventListener('visibilitychange', onVis);
    // Capacitor (Android) fires these from the native onPause/onResume; the WebView may not change visibilityState
    document.addEventListener('pause', toBackground);
    document.addEventListener('resume', toForeground);
    window.addEventListener('focus', check);
    let native: { remove: () => Promise<void> } | null = null;
    let disposed = false;
    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => (isActive ? toForeground() : toBackground())).then((h) => {
        if (disposed) void h.remove();
        else native = h;
      });
    }
    return () => {
      disposed = true;
      if (lockTimer.current) window.clearInterval(lockTimer.current);
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('pause', toBackground);
      document.removeEventListener('resume', toForeground);
      window.removeEventListener('focus', check);
      void native?.remove();
    };
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

  const unlock = useCallback((password: string) => singleFlight(async () => {
    // throttle repeated wrong passwords (persisted, so a restart does not reset it)
    const f = (await getSetting<{ n: number; at: number }>(VAULT_FAILURES_KEY)) ?? { n: 0, at: 0 };
    const wait = f.at + failureDelayMs(f.n) - Date.now();
    if (wait > 0) throw new VaultError('rate-limited', `Too many wrong passwords. Try again in ${Math.ceil(wait / 1000)} s.`);
    const snapshot = {
      salt: vaultSalt,
      verifier: await getSetting<unknown>(VAULT_VERIFIER_KEY),
      items: [
        (await getKeystore())?.payload,
        await getSetting<unknown>('etherscan_key'),
        await getSetting<unknown>('eth_rpc'),
        await getSetting<unknown>('sol_rpc'),
        ...(await listExchanges().catch(() => [])).map((e) => e.payload)
      ]
    };
    let res;
    try {
      res = await openVault(snapshot, password, deriveKey);
    } catch (e) {
      if (e instanceof VaultError && e.code === 'wrong-password') await setSetting(VAULT_FAILURES_KEY, { n: f.n + 1, at: Date.now() });
      throw e;
    }
    // persist only after the password is proven; salt first so a half-finished write can never pair an old
    // salt with a new verifier
    if (res.write?.salt) await setSetting(VAULT_SALT_KEY, res.write.salt);
    if (res.write) await setSetting(VAULT_VERIFIER_KEY, res.write.verifier);
    if (f.n) await setSetting(VAULT_FAILURES_KEY, { n: 0, at: 0 });
    setVaultSalt(res.salt);
    setCryptoKey(res.key);
    scheduleAutoLock();
  }), [vaultSalt, scheduleAutoLock]);

  // manual lock; the periodic expiry check keeps running so the idle lock still works after a re-unlock
  const lock = useCallback(() => {
    setCryptoKey(null);
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
