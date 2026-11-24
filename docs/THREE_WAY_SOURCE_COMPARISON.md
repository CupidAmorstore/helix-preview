# Three-way source comparison

**Status: INCOMPLETE: only one of the three source bodies is accessible.** Columns for OMEGA and Trading Lab
contain only what owner/agent notes report (`HANDOFF.md` on `claude/helix-mobile-takeover-vrkwgr`, `KNOWN_STATE.md`
in the resume pack). They are **unverified** and must not be used to choose implementations until the source is
recovered (`docs/MASTER_SOURCE_RECOVERY_REPORT.md`).

| Area | HELIX Preview (verified, `ccr-8d17e0b5-yaqvtm`) | HELIX OMEGA (reported only) | Trading Lab 0.7.0 beta (reported only) |
|---|---|---|---|
| Architecture | React 18 + TS + Vite SPA, Capacitor 8 Android shell, no backend | "auth backend", SQLite databases, release APKs, OMEGA 4.2 WIP | research engine + watchbot; language/stack unknown |
| Authentication | none (single-user device app); vault password for keys | auth backend reported | unknown |
| Persistence | IndexedDB (paper ledger, alerts, watch addresses, encrypted vault) | SQLite reported | datasets, registry, paper accounts (format unknown) |
| Wallet | testnet-first self-custody, Argon2id + AES-GCM vault, **sending disabled** | unknown | n/a |
| Market discovery | Coinbase (all USD markets) + CoinGecko top 100 | unknown | 120 on-chain pools across six networks + 1,436 Kraken listings (reported) |
| Live pricing | Coinbase WebSocket, heartbeat watchdog, offline states | unknown | captured responses (reported) |
| Charts | lightweight-charts area chart, 1m–1w, live last point | unknown | n/a |
| Paper trading | market orders vs live L2 book (2% band, partial fills), fee model, serialized ledger, reconciliation, order history | unknown | 7 × $1,000 diagnostic accounts, 0 entries (reported) |
| Strategy research | 9 single-coin families + pooled + cross-sectional, 177 candidates, 0 qualified; holdout/survivorship/null/cost studies | unknown | 88 hourly candidates on 11 markets, 0 qualified (reported) |
| Risk | paper-only lock, position/daily/weekly/drawdown limits | unknown | conservative sizing (reported) |
| Notifications | in-app price alerts only | unknown | unknown |
| Android | Capacitor, Back handling, safe areas, dark bars, emulator 30/30 | release APKs reported (signing unknown) | Termux workspace reported |
| Tests | 171 unit/integration + browser + emulator | 22/22 suites reported at verified-beta | unknown |
| Security | fail-closed sends, vault verification, no secrets in repo except public debug key | unknown | unknown |

## Overlap decisions (deferred)
For every overlapping area (paper engine, research engine, market discovery, wallet) the decision rule recorded in
`docs/UNIFIED_PLATFORM_INTEGRATION_MAP.md` applies; no implementation is chosen before the other source is read.

## What would be lost if Preview replaced OMEGA blindly
Unknown, and that is exactly why it must not happen: OMEGA's auth backend, SQLite schemas and any 4.2 work exist nowhere
else. Conversely, the Preview improvements listed in the integration map must be ported into whichever base is chosen.
