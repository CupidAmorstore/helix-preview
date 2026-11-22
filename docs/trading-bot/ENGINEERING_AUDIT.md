# ENGINEERING_AUDIT — HELIX + Trading Bot

Date 2026-11-22. Classification: VERIFIED (tested/observed) · PARTIAL · BROKEN · MISSING · UNVERIFIED.
The original Pro Trading Bot code could not be audited (not available); this audits what is in this repository.

| Subsystem | Status | Evidence |
|---|---|---|
| Market discovery (CEX) | PARTIAL | Fixed 10-market Coinbase universe (`sources.ts RESEARCH_UNIVERSE`); no automatic listing scan yet |
| Exchange adapters (public data) | VERIFIED | Coinbase Exchange candles/ticker/products, Kraken OHLC/Ticker/AssetPairs, Gemini ticker — fetched live 2026-11-22; keyless, read-only |
| HELIX Markets live data | VERIFIED | Switched Binance (HTTP 451 restricted) → Coinbase REST + ws-feed; prices and 1h/4h/1w charts verified in Chromium |
| DEX / multichain discovery | MISSING | Only DEX *cost presets* exist (`costs.ts`); no pool discovery, honeypot or liquidity screening |
| Historical ingestion | VERIFIED | 8,754 hourly + up to 2,189 daily bars per market, paginated, stored gzipped with content hash |
| Freshness / timestamps | VERIFIED | `validateCandles`: forming bar dropped, staleness flag, grid alignment — tests `engine.test.ts` |
| Gaps / duplicates | VERIFIED | Gaps recorded, never filled; only trailing contiguous run tested (XRP 1d: 1,285 bars after Coinbase relisting) |
| Strategy generation | VERIFIED | 7 long-only families, 23 grid configs, pre-declared (`strategies.ts`) |
| Look-ahead safety | VERIFIED | Future-bar mutation test for every family/config |
| Signal → execution | VERIFIED | Decide at close, fill next open — test asserts entry price = next open |
| Position sizing | VERIFIED | Policy fraction (25%), venue minimum rejection (not resized) |
| Risk management | VERIFIED (paper) | Daily/weekly loss, drawdown kill switch, stale-data block, same-base de-dup — `risk-paper.test.ts` |
| Fee & slippage model | PARTIAL | Proportional + fixed costs verified arithmetically; fee tiers are **assumptions**. Spread/slippage now **measured** from public order books (`orderbook.ts`, R2) — collection started 2026-11-22, placeholder kept until 30 days |
| Walk-forward validation | VERIFIED | 50/25/25 chronological; test window opened only after validation passes |
| Robustness | VERIFIED | 2× costs, +1 bar delay, parameter neighbours |
| Statistics / multiple testing | VERIFIED | Bootstrap CI with Bonferroni alpha; month-block bootstrap for pooled tests; false-positive control on random walks |
| Portfolio accounting (paper) | VERIFIED | Cash/units/realized/unrealized identity tests |
| Paper trading | VERIFIED (mechanics) | Forward-only, restart-safe (chunked = single pass); **no forward evidence yet** |
| Performance analytics | PARTIAL | Per-window metrics, PF, win rate, CI; no Sharpe / equity-curve charts yet |
| Live execution | MISSING by design | No order adapter; `LIVE_TRADING_ENABLED=false`; test greps bot source for private endpoints |
| Credential handling | VERIFIED (bot) | Bot uses no keys. HELIX stores read-only exchange keys encrypted locally (pre-existing, not re-audited) |
| Mobile UI | VERIFIED | Pixel 7 (412 px) checks: no horizontal overflow on all 7 bot tabs; app-shell grid overflow fixed for all pages |
| Backend services | N/A | Static app + research script; no server process |
| Monitoring / alerting | PARTIAL | `--watch-only` mode; no scheduler or push alerts yet |
| Automated tests | VERIFIED | 59 tests (`npm test`) incl. wallet BIP84/ETH vectors and offline SOL signing |
| CI/CD | VERIFIED (config) | `ci.yml`: typecheck, lint, test, build on every PR/branch; Pages deploy uses `npm ci` and runs tests first |
| Type checking | VERIFIED | 0 `tsc` errors repo-wide (was 9) |
| Lint | VERIFIED | 0 errors / 0 warnings repo-wide (was 63 errors) |
| Documentation | VERIFIED | `docs/trading-bot/*` (this set) |

## Defects fixed in this milestone
1. `npm ci` broken (lockfile) — fixed.
2. ESLint applied core `no-undef` to TypeScript — 46 false lint errors removed.
3. Missing `vite/client` types (`import.meta.env` error) — added `src/vite-env.d.ts`.
4. App shell grid let wide content stretch the page on phones (792 px layout on a 412 px screen) — `min-w-0`.
5. Profit-factor gate rejected strategies with **zero losing trades** (undefined PF treated as 0) — caught by power test, fixed.
6. Training selection favoured 1-trade buy-and-hold-like configs that can never pass OOS trade gates — selection now
   ranks testable configs first (stricter, not looser).

## Fix pass 2026-11-22 (after full audit)
| Item | Before | After |
|---|---|---|
| Dependency advisories | 41 (3 critical, 8 high) | 10 (0 critical, 0 high; 6 low build-time only, 4 moderate in @solana/web3.js → jayson) |
| HELIX wallet | **broken**: `deriveAddresses` threw for every mnemonic (bip32 v5 Uint8Array vs bitcoinjs Buffer; BTC key serialised with `Uint8Array#toString('hex')`; ethers path ignored) | fixed; BIP84 + ETH vectors pass; browser import verified |
| Markets data | Binance (HTTP 451) | Coinbase REST + WebSocket |
| Main bundle | 2,295 kB (704 kB gz) | 390 kB (129 kB gz); pages code-split |
| Wallet chunk | 1,882 kB | 1,287 kB (crypto-browserify/elliptic no longer shipped) |
| Toolchain | vite 5, vitest 2, react-router 6 | vite 8, vitest 5, react-router 7; build 8.6 s → 1.0 s |
| Phone layout | Markets page 439 px on 412 px screen | 412 px |

Accepted risk: `@solana/web3.js` 1.x → `jayson`/`uuid`/`stream-json` (moderate). v3 changes `Keypair` to an async API
and breaks the wallet; revisit with a dedicated Solana migration. Wallet *sending* (BTC/ETH/SOL) was not exercised in the
browser (needs funded testnet accounts); SOL signing is covered offline in Node tests.
