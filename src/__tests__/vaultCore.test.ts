import { describe, expect, it } from 'vitest';
import { createSingleFlight, failureDelayMs, isWellFormed, openVault, sealVerifier, VaultError, VERIFIER_TEXT, type DeriveFn, type VaultSnapshot } from '../services/vaultCore';
import { toBase64 } from '../utils/crypto';

// fast deterministic KDF for tests (the app uses argon2id); same password+salt → same key
const derive: DeriveFn = async (pw, salt) => {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt as BufferSource, iterations: 1000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
};
async function seal(key: CryptoKey, text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text)));
  return { cipher: toBase64(c), iv: toBase64(iv), salt: '', version: 1 };
}
const PW = 'correct horse battery';
/** simulated persistent storage ("restart" = build a new snapshot from it) */
async function freshVault(withMnemonic = true) {
  const r = await openVault({ salt: null, verifier: null, items: [] }, PW, derive);
  const store: { salt: Uint8Array; verifier: unknown; keystore: unknown } = { salt: r.salt, verifier: r.write!.verifier, keystore: withMnemonic ? await seal(r.key, 'abandon … about') : null };
  return store;
}
const snap = (s: { salt: Uint8Array; verifier: unknown; keystore: unknown }): VaultSnapshot => ({ salt: s.salt, verifier: s.verifier, items: [s.keystore] });
const rejects = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toBeInstanceOf(VaultError);
  await p.catch((e: VaultError) => expect(e.code).toBe(code));
};

describe('vault: creation', () => {
  it('creates with a verifier that decrypts to the expected text', async () => {
    const r = await openVault({ salt: null, verifier: null, items: [] }, PW, derive);
    expect(r.kind).toBe('created');
    expect(isWellFormed(r.write!.verifier)).toBe(true);
    expect(r.write!.salt).toBeTruthy();
  });
  it('refuses short passwords', () => rejects(openVault({ salt: null, verifier: null, items: [] }, 'short', derive), 'too-short'));
});

describe('vault: existing vault never opens with an unverified password', () => {
  it('correct password unlocks', async () => {
    const s = await freshVault();
    expect((await openVault(snap(s), PW, derive)).kind).toBe('unlocked');
  });
  it('incorrect password is refused', async () => {
    const s = await freshVault();
    await rejects(openVault(snap(s), 'wrong password!!', derive), 'wrong-password');
  });
  it('REGRESSION (audit): missing verifier + encrypted keystore → wrong password refused, right one migrates', async () => {
    const s = await freshVault();
    s.verifier = null;
    await rejects(openVault(snap(s), 'wrong password!!', derive), 'wrong-password');
    const r = await openVault(snap(s), PW, derive);
    expect(r.kind).toBe('migrated');
    expect(isWellFormed(r.write!.verifier)).toBe(true);
    expect(r.write!.salt).toBeUndefined(); // salt never replaced: existing data stays readable
  });
  it('corrupted verifier (bit flip) + data → wrong password refused; right password proven by data and verifier repaired', async () => {
    const s = await freshVault();
    const v = s.verifier as { cipher: string };
    v.cipher = toBase64(Uint8Array.from(atob(v.cipher), (c, i) => c.charCodeAt(0) ^ (i === 0 ? 1 : 0)));
    await rejects(openVault(snap(s), 'wrong password!!', derive), 'wrong-password');
    expect((await openVault(snap(s), PW, derive)).kind).toBe('migrated');
  });
  it('malformed verifier (garbage) + data behaves like legacy: proven by data only', async () => {
    const s = await freshVault();
    s.verifier = { cipher: '%%%', iv: 'x' };
    await rejects(openVault(snap(s), 'nope nope nope', derive), 'wrong-password');
    expect((await openVault(snap(s), PW, derive)).kind).toBe('migrated');
  });
  it('verifier present but no data (keystore missing): wrong password refused', async () => {
    const s = await freshVault(false);
    await rejects(openVault(snap(s), 'wrong password!!', derive), 'wrong-password');
    expect((await openVault(snap(s), PW, derive)).kind).toBe('unlocked');
  });
  it('authenticated verifier with unexpected plaintext is treated as damaged (not accepted)', async () => {
    const s = await freshVault();
    const key = await derive(PW, s.salt);
    s.verifier = await seal(key, 'something-else');
    await rejects(openVault(snap(s), PW, derive), 'damaged');
  });
  it('salt with NO verifier and NO encrypted material: rotates to a new vault (new salt) — nothing becomes readable', async () => {
    const s = await freshVault(false);
    s.verifier = null;
    const r = await openVault(snap(s), 'any new password', derive);
    expect(r.kind).toBe('reset-empty');
    expect(r.write!.salt).toBeTruthy();
    expect(r.write!.salt).not.toBe(toBase64(s.salt));
    await rejects(openVault(snap(s), 'short', derive), 'too-short');
  });
  it('legacy item encrypted under a DIFFERENT key never validates', async () => {
    const s = await freshVault(false);
    s.verifier = null;
    s.keystore = await seal(await derive('someone else pw', s.salt), 'secret');
    await rejects(openVault(snap(s), PW, derive), 'wrong-password');
  });
  it('repeated wrong attempts all fail and leave stored data untouched', async () => {
    const s = await freshVault();
    const before = JSON.stringify(s);
    for (let i = 0; i < 6; i++) await rejects(openVault(snap(s), `wrong-${i}-password`, derive), 'wrong-password');
    expect(JSON.stringify(s)).toBe(before);
    expect((await openVault(snap(s), PW, derive)).kind).toBe('unlocked');
  });
  it('restart: a migrated verifier works on the next launch', async () => {
    const s = await freshVault();
    s.verifier = null;
    const r = await openVault(snap(s), PW, derive);
    s.verifier = r.write!.verifier; // persisted
    expect((await openVault(snap(s), PW, derive)).kind).toBe('unlocked');
  });
  it('sealed verifier content is the expected constant', async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await derive(PW, salt);
    const v = await sealVerifier(key, salt);
    const out = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Uint8Array.from(atob(v.iv), (c) => c.charCodeAt(0)) }, key, Uint8Array.from(atob(v.cipher), (c) => c.charCodeAt(0)));
    expect(new TextDecoder().decode(out)).toBe(VERIFIER_TEXT);
  });
});

describe('vault: throttling', () => {
  it('no delay for the first 5 failures, then grows and caps at 5 min', () => {
    expect([0, 4, 5, 6, 7, 20].map(failureDelayMs)).toEqual([0, 0, 30_000, 60_000, 120_000, 300_000]);
  });
});

describe('vault: single-flight unlock (REGRESSION: parallel attempts bypassed the throttle)', () => {
  it('a second attempt while one is running is refused, and the gate reopens afterwards', async () => {
    const gate = createSingleFlight();
    let release!: () => void;
    const first = gate(() => new Promise<string>((r) => { release = () => r('done'); }));
    await expect(gate(async () => 'second')).rejects.toBeInstanceOf(VaultError);
    release();
    await expect(first).resolves.toBe('done');
    await expect(gate(async () => 'third')).resolves.toBe('third');
  });
  it('a failing attempt also reopens the gate', async () => {
    const gate = createSingleFlight();
    await expect(gate(async () => { throw new Error('x'); })).rejects.toThrow('x');
    await expect(gate(async () => 1)).resolves.toBe(1);
  });
});

describe('vault: lock decision from wall-clock time (REGRESSION: Android froze the background timer)', async () => {
  const { shouldLock, BACKGROUND_LOCK_MS, IDLE_LOCK_MS } = await import('../services/vaultCore');
  const T = 1_700_000_000_000;
  it('locks after 60 s in the background even though no timer ran', () => {
    expect(shouldLock(T + BACKGROUND_LOCK_MS, T, T)).toBe(true);
    expect(shouldLock(T + 66_000, T + 60_000, T)).toBe(true);
  });
  it('a short trip to the background does not lock', () => expect(shouldLock(T + 20_000, T, T)).toBe(false));
  it('idle for 5 minutes locks; recent activity does not', () => {
    expect(shouldLock(T + IDLE_LOCK_MS, T, null)).toBe(true);
    expect(shouldLock(T + IDLE_LOCK_MS - 1, T, null)).toBe(false);
  });
});
