# Security and financial acceptance (HELIX Preview)

Scope: `helix-preview` only (OMEGA/Trading Lab not accessible). All checks are self-audit passes by the same agent, not
independent external audits. Detail: `SECURITY_VERIFICATION.md`, `PAPER_ACCOUNTING_VERIFICATION.md`,
`FINAL_RELEASE_READINESS_AUDIT.md`.

## Real-money boundaries (enforced in the execution layer)
| Path | Control | Evidence |
|---|---|---|
| Exchange orders / withdrawals | no order or withdrawal endpoint exists; exchange balance/history functions always throw | source-scan test |
| Blockchain signing + broadcast (BTC/ETH/SOL) | `WALLET_SEND_ENABLED=false`: every signing/broadcast function refuses on **every** network before any network call | `realMoneyIsolation.test.ts` (mainnet + testnet, all chains) |
| Automated strategies | `LIVE_TRADING_ENABLED=false` + `assertPaperOnly()`; bot never imports wallet functions | source-scan test |
| Modified UI state | guards are inside the transaction functions, not the buttons | tests call functions directly |
| Research feed | validated data only (`feedValidation.ts`); `mode` must be `paper`; live statuses rejected; feed has no execution hooks | `feedValidation.test.ts` |
| Deep links / background jobs | launcher intent only; no service worker; no native background service | manifest inspection |

## Vault and key handling
Argon2id (64 MiB, t=3) → AES-GCM; authenticated verifier; existing vault never opens without proof; single-flight
unlock; persisted throttle (5 free failures, then 30 s doubling to 5 min); idle lock 5 min and background lock 60 s
decided by wall-clock time on native resume (device-verified); decrypted phrase cleared on lock; Android cloud backup and
device transfer excluded. No authentication backend exists in Preview (OMEGA's, if any, is unaudited).

**Known limits:** throttle counter is in device storage (an attacker with storage access can reset it but could also attack
the ciphertext offline; Argon2id cost is the real barrier). QA builds use a public debug key (see Android evidence).

## Dependency advisories
**Update 2026-11-25:** `@solana/web3.js` removed (`4e3bf37`); Solana keys and addresses now use `@noble/curves` (Ed25519) and
`@scure/base` (base58), checked against the same address vector. `npm audit --omit=dev`: **0 vulnerabilities**. Full
`npm audit`: 6 low (`elliptic`) in the dev-only `vite-plugin-node-polyfills` chain; the `crypto` polyfill is not included,
and the built bundle contains no `elliptic` package → not shipped. History below.

Previous: `npm audit --omit=dev`: 4 moderate, all `uuid` (GHSA-w5hq-g745-h8pq) via `@solana/web3.js` → `jayson`, `rpc-websockets`.
The advisory needs `uuid.v3/v5/v6` with a caller buffer; both packages only call `uuid.v4()` → **not reachable**. The only
upgrade is `@solana/web3.js` 3.x (breaking; it previously broke the wallet). Removal option: Preview uses web3.js only for
`PublicKey` validation, `Keypair` derivation and the (disabled) SOL send; it could be replaced by `@noble/curves` + base58.
**Does not block owner-only QA.**

## Financial correctness (paper)
| Item | Status |
|---|---|
| Market orders, partial fills (2% band), fees 0.60% on gross, spread/impact, cost basis, realized/unrealized P&L | VERIFIED (randomized invariants 300×40, hand checks, device) |
| Insufficient funds, minimum order, position limit, duplicates, stale & future quotes, pause | VERIFIED (tests) |
| Concurrent submissions, save failure rollback | VERIFIED (serialized store tests) |
| Restart recovery, storage corruption | VERIFIED (reconciliation on load pauses a non-matching ledger) |
| Limit/stop orders, cancellation, async exchange events, maker fees | **NOT IMPLEMENTED** (not claimed) |
