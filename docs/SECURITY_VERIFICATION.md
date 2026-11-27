# Security verification — remediation cycle (2026-11-23)

Scope: vault (wallet key encryption), wallet signing paths, Android data exposure. Everything below is verified by tests in
this repository unless marked **unverified**.

## 1. Vault (src/services/vaultCore.ts, src/services/vault.tsx)

### Finding V-1 (CRITICAL): fail-open unlock: **FIXED**
- **Reproduction:** confirmed by code reading of the previous `vault.tsx` (unlock, lines ~106–115 at `4a1b958`): with a salt but
  no verifier and no other encrypted item, `verifyVaultKey()` returned `true` → any password "unlocked" an existing vault.
- **Root cause:** "nothing to check against" was treated as "password correct".
- **Fix:** `openVault()` (vaultCore.ts:71) decides every case by AES-GCM authenticated decryption:

| Situation | Behaviour |
|---|---|
| no vault (no salt) | create: min 10 chars, new salt + verifier |
| verifier decrypts to `helix-vault-ok` | unlock |
| verifier authenticates but other plaintext | refuse (`damaged`), nothing written |
| verifier fails, an encrypted item opens with the key | password proven, verifier repaired (`migrated`) |
| verifier fails, no item opens | refuse (`wrong-password`) |
| no/malformed verifier, encrypted data present | password must open real data (`migrated`), else refuse |
| salt but nothing was ever encrypted | rotated to a fresh salt + verifier (`reset-empty`): no secret exists to expose; existing salt is not reused |

- Checked items: wallet keystore, Etherscan key, ETH/SOL RPC settings, exchange records (previously exchange records were not checked).
- Writes happen only after proof; the salt is never replaced for a vault that holds data; salt is written before verifier.
- **Tests:** `src/__tests__/vaultCore.test.ts`: 15 cases: create, short password, correct, incorrect, missing verifier,
  bit-flipped verifier, malformed verifier, missing keystore, unexpected verifier plaintext, salt-only, foreign-key legacy item,
  6 repeated wrong attempts leave storage byte-identical, restart after migration, verifier constant, throttle schedule.
- Device: `scripts/android-e2e.cjs` creates a vault, imports the public BIP39 test vector, locks, and checks the phrase is gone.

### V-2: brute force (MEDIUM): **FIXED**
Persisted counter: after 5 consecutive wrong passwords, waits 30 s doubling to 5 min (`failureDelayMs`, vaultCore.ts:96;
vault.tsx:89). Argon2id (64 MiB, t=3) already costs ~0.5–1 s per try. **Unverified:** cost on low-end phones.

### V-3: secret lifetime (MEDIUM): **FIXED**
- Vault auto-locks after 5 min idle (existing) **and** after 60 s in the background (vault.tsx:109).
- Decrypted mnemonic in the Wallet screen is cleared whenever the vault locks (previous cycle).
- No logging of secrets: source scan in `realMoneyIsolation`/`integrity` tests; `grep` for console calls near key/phrase: none.

### V-4: Android backup (MEDIUM): **FIXED**
`android:allowBackup="false"`, `fullBackupContent="false"`, `dataExtractionRules` excluding all domains for cloud backup and
device transfer (AndroidManifest.xml:5–7, res/xml/data_extraction_rules.xml). Trade-off: reinstalling the app loses the
paper account and the encrypted keystore (the recovery phrase is the backup). **Verified by build only** (CI APK build);
backup behaviour itself not exercised on a device.

## 2. Real-money isolation: see also `docs/AUDIT_REMEDIATION_REPORT.md` finding R-1
| Path | Status |
|---|---|
| Trading bot / paper engine orders | simulated only; `LIVE_TRADING_ENABLED = false`, `assertPaperOnly()`; no exchange order or withdrawal endpoint anywhere (source-scan test) |
| Exchange API | `fetchExchangeBalances/History` always throw (no server connector) |
| Wallet sends (BTC/ETH/SOL) | **mainnet disabled at the source** (`WALLET_MAINNET_SEND_ENABLED = false`, wallet.ts:18); every transaction function calls `assertSendAllowed`; ETH chainId / SOL genesis verified from the RPC before signing and mainnet refused even if the UI says testnet |
| Testnet sends | allowed (testnet coins have no value) |

Tests: `src/__tests__/realMoneyIsolation.test.ts` (7): flags off; each send refuses mainnet before any network call; an RPC
reporting chainId 1 is refused before `eth_sendRawTransaction`; source scan: primitives only in `services/wallet.ts`, all guarded;
no order/withdraw endpoints; paper/bot never import wallet sends.

## 3. Known limits
- Dependency advisories: 4 moderate (`uuid` via `@solana/web3.js`; fix needs a breaking major upgrade; affected API unused).
- Debug APK (`debuggable`): WebView remote debugging is enabled in debug builds. A release build needs the owner's signing key.
- No independent penetration test; no physical-device test.
