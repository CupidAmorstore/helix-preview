# HELIX — Final release-readiness audit (private paper-trading beta)

Date: 2026-11-23. Scope authorized: private beta + paper trading only. Real-money trading, deposits, withdrawals,
wallet broadcasts and production release remain disabled.

## A. Source identity

| Item | Value |
|---|---|
| Repository | https://github.com/CupidAmorstore/helix-preview (public) |
| Branch | `ccr-8d17e0b5-yaqvtm` · PR https://github.com/CupidAmorstore/helix-preview/pull/3 (draft) |
| Base | `main` @ `dca30a7` |
| Starting SHA (this cycle) | `0a156c3` |
| Final code SHA | `c1b10c7` (docs commit follows; no app change after it) |

**Is this the intended application?** **No: it is the accessible preview, not HELIX OMEGA.** The repo's own takeover note
(branch `claude/helix-mobile-takeover-vrkwgr`, `HANDOFF.md`) records that HELIX OMEGA (verified-beta commit `a12fc5a`,
OMEGA 4.2, auth backend, SQLite, real release APKs) exists only on the owner's Windows PC
(`…\.gemini\antigravity\scratch\helix`). Not reachable from this session (no computer folder shared); none of the 15
accessible repositories contains it; GitHub commit search for `a12fc5a` only hits unrelated public repos (prefix collisions).
**Everything below applies to `helix-preview` only.** The Trading Lab / Pro Trading Bot source was likewise not found in any
accessible repository: no integration map against it is possible (blocked, not invented).

### Commits this cycle
| SHA | Change |
|---|---|
| `c358bd9` | No wallet signing/broadcast on any network (fail-closed); single-flight vault unlock |
| `de05408` | Paper ledger reconciliation on load (fail-closed); "(paper)" labels |
| `752aad1` | Survivorship: universe snapshot (incl. 98 delisted), measured bias, promotion gate; feed reliability tests |
| `a4ce880` | Paper orders screen |
| `d57115d` | Private-QA signing support + honest build labels; device test: rotation, background lock, orders, crash recovery, upgrade |
| `8c41c64` | Vault auto-lock by wall-clock time |
| `d21fbf0` | Device-test harness: dismiss emulator system dialogs |
| `c1b10c7` | Vault background lock driven by the native app lifecycle |

## B. Remediation matrix (previous claims re-tested + new findings)

Status legend: VERIFIED (re-tested, holds) · FIXED (defect found this cycle and corrected) · PARTIAL · BLOCKED · NOT TESTABLE.

| ID | Orig. sev. | Claim / finding | Re-test performed | Result | Status |
|---|---|---|---|---|---|
| V-1 | Critical | Existing vault never opens with an unverified password | 15 vaultCore cases incl. missing/corrupt/malformed verifier, salt-only, foreign-key item, 6 repeated failures (storage byte-identical) | holds | VERIFIED |
| V-3 | Medium | Wrong-password throttling | adversarial: **parallel attempts read the same counter → bypass** | fixed with single-flight gate (tested) | FIXED |
| V-3b | Medium | Throttle counter lives in device storage | someone with storage access can reset it, but can then also brute-force offline; Argon2id (64 MiB, t=3) is the real cost | documented | PARTIAL |
| V-5 | Medium | 60 s background auto-lock | **Android emulator: wallet still open after 66 s** (JS timers frozen; WebView did not report background) | wall-clock `shouldLock` + native `appStateChange`/`pause`/`resume`; unit tests + device re-test (section E) | FIXED |
| V-6 | Low | Secrets not logged | source grep for console calls near key/phrase/password; secret-pattern scan of all tracked files | none found | VERIFIED |
| V-4 | Medium | Android backup excluded | manifest + extraction rules present in built APK | build-verified; backup not exercised on device | PARTIAL |
| S-1 | **High** | Signing identity | adversarial: **committed debug keystore is public**, so anyone can sign an APK that installs as an update over a tester's HELIX | CI now uses an owner-provided private QA key automatically (secrets); until then releases say "PUBLIC debug key, testing only" | **BLOCKED on owner** (key must be created by owner) |
| R-1 | High | Real money unreachable | trace of every signing/broadcast/exchange path; **testnet broadcast was still reachable** (beta excludes all broadcasts) | `WALLET_SEND_ENABLED=false`: all signing/broadcast functions refuse on every network before any network call; no deep links (launcher intent only), no service worker, no background jobs, only `@capacitor/app` plugin; source scan test | FIXED |
| P-1 | High | Paper ledger lost update | concurrency test (2 orders + snapshot, slow saves) | holds | VERIFIED |
| P-4 | High | Ledger reconciliation on restart | **a tampered/corrupt stored ledger was used as-is** | `reconcileAccount` on load; failing ledger paused, resume refused; tests | FIXED |
| P-5 | — | Accounting invariants | 300×40 randomized orders + 50 reconcile runs | hold | VERIFIED |
| P-6 | — | Maker fees, multiple fills, cancels, out-of-order events | engine has market orders only, filled atomically across book levels (one VWAP fill); no cancels/events exist | n/a by design; documented | NOT TESTABLE (not implemented) |
| R-2 | High | Portfolio accounting (XS) | hand-calculated test, compounding test | holds | VERIFIED |
| R-3 | High | Holdout reuse | registry by market+timeframe test | holds | VERIFIED |
| R-6 | Medium | Survivorship bias | **measured**: 30 delisted vs 10 survivors (below) | snapshot + study + promotion gate (`survivorshipGate`) | FIXED (mitigated; no historical constituents for intraday) |
| R-7 | Medium | Timestamp alignment / stale data / provenance | alignment test (missing day not forward-filled); freshness gate; datasets content-hashed | holds | VERIFIED |
| R-8 | Medium | Cross-market correlation | pooled tests use month-block bootstrap on pooled trades; no explicit correlation correction | documented | PARTIAL |
| F-3 | Medium | Feed reliability | tests: malformed/non-ticker/NaN/duplicate frames, symbol mapping, CoinGecko 429 → last good copy with age, heartbeat watchdog | holds | VERIFIED |
| U-2 | Low | Simulated vs real labelling | Home "Realized P&L (paper)"; orders screen "Simulated orders · nothing was sent" | fixed | FIXED |
| U-3 | Medium | No order history screen | — | `/orders` with filled/refused filter and fill details | FIXED |
| D-1 | Medium | Dependencies | `npm audit --omit=dev`: 4 moderate (`uuid` via `@solana/web3.js`; fix = breaking major) | unchanged | PARTIAL |

## C. Product acceptance (per screen, as implemented)

| Screen | Purpose | Actual functionality | Navigation | Visual | Accessibility | Remaining defects |
|---|---|---|---|---|---|---|
| Home | account at a glance | paper equity, chart, cash/invested/fees, positions, movers, watchlist, bot status, recent activity → all orders | tab | Ledger system | axe 0 | equity chart sparse until hourly points accrue |
| Markets | discovery | top 100 (CoinGecko) + all Coinbase markets search, tabs, sort, fallback list on outage | tab | good | axe 0 | no network/chain filter; no DEX tokens |
| Asset | detail + trade | live price, chart 1m–1w (follows live price), stats, holdings, paper buy/sell sheet, alerts (8 coins) | from lists | good | axe 0 | no indicators/drawing tools (not an advanced chart) |
| Paper orders (new) | history | every order incl. refusals, fill model, fees, paper P&L | More, Home | good | axe 0 | no export |
| Trading Bot | research status | holding-cash headline, funnel 177/4/0, data source, protections, regimes, strategies, forward experiments | tab | good | axe 0 | Research Lab (advanced) still table-dense |
| Wallet | self-custody | testnet-first vault, create/import, addresses, balances, history, receive; **sending disabled** | tab | ok | axe 0 | send UI hidden by design; no hardware-wallet support |
| More / Connections / Alerts / Watched addresses / Legal | settings & help | vault, watched addresses, in-app alerts, legal | tab → list | ok | axe 0 | no notifications while app closed; no onboarding tour |

Not implemented (not claimed): real trading, limit/stop orders, push notifications, advanced charting, accounts/login, multi-device sync.

## D. Quantitative validation

| Item | Value |
|---|---|
| Markets | 10 Coinbase USD markets (BTC, ETH, SOL, XRP, DOGE, ADA, AVAX, LINK, LTC, DOT) |
| Data | Coinbase Exchange public candles; content-hashed in `research/data/` |
| Periods | daily 2020-11-24 → 2026-11-21 (SOL/AVAX/DOT/DOGE/ADA from listing); hourly 2025-11-22 → 2026-11-22 |
| Candidates | 177 (9 single-coin families × markets × daily/hourly, pooled universe rules, cross-sectional momentum) |
| Selection | best config on training only (testable configs first); 50/25/25 chronological split; validation + 2× cost + +1-bar delay + neighbour stability + month-block bootstrap with cumulative Bonferroni (N=177); reused-holdout guard; survivorship gate |
| Costs | 60 bps taker fee + 2 bps half-spread + 3 bps slippage per side (≈1.3% round trip) |
| Reached unseen test | 4 → all lost: BTC vol-filtered trend −22.0% (DD 25.2%), BTC regime switch −10.9% (DD 34.0%), pooled SMA cross −10.2% (DD bound 31.4%), pooled Bollinger −38.2% (DD bound 63.4%) |
| Qualified | **0**: all rejected strategies remain rejected |
| Null study | 560 random-walk tests, ~0 cost, no correction → 0 qualified (34 reached test): conservative, low power |
| Survivorship | buy-and-hold mean: survivors +48.7% vs 30 delisted −69.4%; trend/momentum rules lose their apparent edge on delisted coins (gap +60 to +217 points); mean-reversion opposite |
| Known limits | no historical intraday constituents; order-book/funding/on-chain/event families untestable at $0; fee tier fixed; correlation between markets not modelled |

Backtests are not forecasts. Nothing here claims future profitability.

## E. Android evidence

| Item | Value |
|---|---|
| Build type | debug (**private QA build**, not for release), signed with the **public debug key** (owner QA key not yet provided) |
| Build SHA | `c1b10c7` (QA build #29) |
| APK sha256 | `85cc04b23a2632a1d8fe3b5f72d0dda43e8bf380eee8138fe4a8470baef6d989` · https://github.com/CupidAmorstore/helix-preview/releases/tag/android-preview |
| Device | Android 15 (API 35) x86_64 emulator, Pixel 6 profile, Google APIs, WebView 124 (GitHub Actions, job `device`) |
| Result | **30/30**: https://github.com/CupidAmorstore/helix-preview/releases/tag/android-e2e (22 screenshots, results.json, logcat) |
| Covered | fresh install (pm clear) · first launch · live prices · paper account · Markets → asset · paper buy (live book) · keyboard (screenshot) · Back: sheet → previous → exit only from Home · all tabs · vault create · import (BIP84 vector) · sending disabled · manual lock clears phrase · **66 s background → locked again** · orders screen · landscape no overflow + portrait restore · Wi-Fi/data off → "Connection lost" · unvisited screen offline · prices recover · relaunch with data · force-stop crash recovery · **upgrade install (`adb install -r`) keeps data** · no JS errors · no runtime crash |
| Crash logs | logcat errors file in the evidence zip; no FATAL EXCEPTION |
| Device-only bugs found this cycle | background auto-lock never fired (timers frozen + WebView did not report background) → fixed (`8c41c64`, `c1b10c7`); an emulator launcher ANR dialog swallowed a key press (harness, `d21fbf0`) |
| Physical device | **BLOCKED**: no physical device connected/authorized; nothing above is physical-device evidence |
| Not covered | TalkBack, real cellular networks, low-end hardware, vendor skins, upgrade from an *older* build (only same-build reinstall tested) |

Other gates at `c1b10c7`: unit/integration **171 passed / 0 failed / 0 skipped** (24 files); typecheck 0 errors; ESLint 0 errors
(1 existing warning); production build ok; browser functional **68/68**, deep (offline, money, 320 px + 130% text, axe WCAG 2.1 AA
on 14 routes, price accuracy, memory) **21/21**, wallet lifecycle **10/10**; secret scan: no secrets (only the intentionally public
debug keystore); `npm audit --omit=dev`: 4 moderate (documented).

## F. Verdict

### CONDITIONAL GO — LIMITED INTERNAL TESTING

All mandatory security, real-money isolation, paper-accounting and research-integrity gates pass on unit tests, browser QA and
the Android 15 emulator. A full **private paper-trading beta (GO)** is not justified yet because:

1. **Signing (S-1, High):** QA builds are signed with a public key, so a third party could ship an "update" that installs over a
   tester's app. Acceptable only for the owner's own device. Fix: owner creates a private QA keystore and adds it as CI secrets
   (section G).
2. **No physical-device acceptance:** emulator only.
3. **Source identity:** this is `helix-preview`, not HELIX OMEGA; the OMEGA source and the Trading Lab source are not accessible.

**Limited scope of this verdict:** the owner (and at most a few trusted testers who understand the above) installing the QA build on
their own phones, paper trading only. Production release and any real-money capability require separate acceptance and explicit
owner approval.

## G. Next exact owner action

1. On your PC (where Java is installed), create a private QA key (keep the file and passwords private):
   `keytool -genkeypair -v -keystore helix-qa.jks -alias helix-qa -keyalg RSA -keysize 4096 -validity 3650`
2. In GitHub → helix-preview → Settings → Secrets and variables → Actions, add:
   `HELIX_QA_KEYSTORE_B64` (base64 of the file: PowerShell `[Convert]::ToBase64String([IO.File]::ReadAllBytes("helix-qa.jks"))`),
   `HELIX_QA_STORE_PASSWORD`, `HELIX_QA_KEY_ALIAS` (`helix-qa`), `HELIX_QA_KEY_PASSWORD`.
   The next build is then signed privately (uninstall the old debug-signed app once).
3. Install that build on your phone and report anything that differs from the emulator results.
4. Decide whether the OMEGA source on the PC should be recovered into a **private** repository (see `HANDOFF.md` on branch
   `claude/helix-mobile-takeover-vrkwgr`) before any further product work.
