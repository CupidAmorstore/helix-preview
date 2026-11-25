# 13 — Security and privacy

Scope: source at `d7174f1`, Android manifest, CI workflows, dependencies, git history. No penetration testing
of third-party services; no real credentials used.

## Execution boundary (verified in code, not only UI)
| Path | Guard | Verified |
|---|---|---|
| BTC build/sign (`buildAndSignBtcTx`) | `assertSendAllowed` first statement → throws | source + unit tests |
| BTC broadcast (`broadcastBtcTx`) | same | source |
| ETH send (`sendEthTransaction`) | same (mainnet and testnet) | source |
| SOL send | `assertSendAllowed` then throws "not available" | source + test |
| Paper engine | `assertPaperOnly()`; `LIVE_TRADING_ENABLED = false as const` | source + tests |
| Research feed | display-only; risk limits, live flags never read from feed; qualified label needs current gates + 4/4 walk-forward | `provenance.test.ts` |
Other POST calls: Solana `getBalance` / `getTokenAccountsByOwner` (read-only RPC). No exchange order endpoints
exist anywhere in `src/` (searched `/orders`, POST, sendTransaction, broadcast, eth_send).

## Storage and secrets
Vault in IndexedDB encrypted (AES-GCM, Argon2id); recovery phrase never stored in clear; lock on background (60 s,
emulator-verified). `localStorage` holds only cached public market data. Android: `allowBackup=false`,
data-extraction rules exclude app data. History secret scan: none (only the public debug keystore).

## Android
| Item | State | Finding |
|---|---|---|
| Permissions | INTERNET only | OK |
| Exported components | launcher activity (required); FileProvider not exported | OK |
| Cleartext traffic | not enabled (androidScheme https) | OK |
| Deep links | none declared | OK (no deep-link attack surface) |
| WebView | Capacitor 8 bridge; app loads only bundled assets | OK |
| Signing | **PUBLIC debug key** on every QA build, including the public download | **SEC-1 P1** (release blocker) |
| Debuggable | debug build (`debuggable=true`) distributed publicly | **SEC-2 P1** for anything beyond owner QA |

## Dependencies
`npm audit`: 0 vulnerabilities (production and full) since the polyfill plugin was replaced.

## Privacy
No backend, no accounts, no analytics, no telemetry (searched). Third parties contacted from the device (IP visible):
Coinbase, CoinGecko, Blockstream/mempool.space, Etherscan, Solana RPC, GitHub Pages. API keys the user enters are
stored inside the encrypted vault.

## Findings
| ID | Sev | Finding |
|---|---|---|
| SEC-1 | P1 | Public debug signing key: anyone can build an "update" that installs over HELIX and reads its storage. Blocks any distribution beyond the owner. Fix ready (fail-closed QA signing); owner must create the key. |
| SEC-2 | P1 | Debuggable build is publicly downloadable from the public repo release; `adb` can inspect app data on a connected device. Use a release build type for any tester distribution. |
| SEC-3 | P2 | The public repository and public release expose the full app source and builds; acceptable for a preview, but the integrated OMEGA platform must not be pushed here. |
| SEC-4 | P3 | Privacy policy is a placeholder ("[TODO: Legal review required]"); Quebec Law 25 requires a published policy and a person responsible for personal information even for minimal processing (see 18). |
Not tested: physical-device storage inspection, TalkBack-exposed sensitive text, WebView version-specific issues.
