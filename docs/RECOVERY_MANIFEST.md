# HELIX recovery manifest (Gate 0)

Recorded 2026-11-23. Integration baseline: **`CupidAmorstore/helix-preview` `main` @ `dca30a7b5c19f6c59a920189fec49757b889046e`** (PR #2 merge). Tests at baseline: 84 passed, 0 failed.

## Sources

| Source | Status | Evidence |
|---|---|---|
| `CupidAmorstore/helix-preview` (public) | **Authoritative baseline** | branches `main` = `ccr-8d17e0b5-yaqvtm` = `dca30a7`; `claude/helix-mobile-takeover-vrkwgr` (handoff note only) |
| OMEGA workspace `C:\Users\Sam\.gemini\antigravity\scratch\helix`, branch `helix-omega-verified-beta`, commit `a12fc5a` | **Not accessible** | No repository with it among the 15 accessible repos; no computer attached (checked 2026-11-23). Not inspected, not recreated |
| Original Pro Trading Bot / Trading Lab (ChatGPT) | **Not accessible** | Never exported; the owner-supplied Nov-21 figures remain unverified |
| Website | Live from `main` | https://cupidamorstore.github.io/helix-preview/ and `/inspect/` |
| Latest APK | `android-preview` pre-release, debug build #10 from `dca30a7` | `helix-preview.apk`, 5,387,438 bytes, sha256 `15bcd21cd9dfbe8cdb5afa23dc14c7e7ede99993af4bebfe45ff64578f601e72` (debug-signed) |

## Content hashes at baseline (git tree / blob ids)

| Path | Hash |
|---|---|
| `src/` | `bab9f898eaed098ffebccd58078aac452cd57dba` |
| `src/bot/` (research engine) | `ae9038d5d52950a27ffeb99e70320ffee771338c` |
| `src/paper/` (paper engine) | `7d5d2e661f7f5ccad735cd0d1cbfc7476f32f422` |
| `src/bot/data/latest.json` (bundled research snapshot) | `6549d10a972decbe13844cdf946f693c50e5262b` |
| `research/` (20 datasets, 4 run records, 23 order-book snapshots) | `3ab2fcfa0fa75c34364623193407e8fb4a1f631d` |
| `docs/` | `51f7a90f3a171e9dc7ceacf6b92f3e6588f54a50` |
| `scripts/` | `9c070588db353fdaca916ecfbdbabbdaa59abc07` |
| `android/` | `1f8632ef5af579a1133d89ac20779c49cd2b6127` |
| `.github/` | `78b1af880db279c8b3736b9ae6532df5ac327688` |

## What is real, simulated, static or broken (baseline)

| Feature | Class |
|---|---|
| Live prices, charts, 24h stats, market lists | **Real** (Coinbase, CoinGecko public data) |
| Paper account, orders, P&L | **Simulated** (live prices + fee model; stored on device) |
| Wallet create/import/derive, balances, history | **Real** (testnet default; on-chain send not exercised) |
| Watched addresses / holdings | **Real** (public chain data; BTC via Blockstream, ETH via Etherscan V2 key) |
| Trading Bot results in the app | **Static snapshot** bundled at build time (2026-11-22) — fixed in this cycle by a fetched, regularly updated feed |
| Bot paper tracking accounts | **Simulated**, advance only when research script runs |
| Price alerts | **Partial**: in-app only, no background notifications |
| Exchange API connections | **Disabled** (no server connector) |
| Access / Stripe | **Broken in app**, hidden from navigation |
| Real-money trading | **Not present** (locked; no order code) |
