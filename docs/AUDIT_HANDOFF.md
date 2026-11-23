# HELIX — independent audit handoff (PR #3)

**For:** an independent reviewer (e.g. ChatGPT) auditing the changes made in this cycle.
**Repo:** https://github.com/CupidAmorstore/helix-preview (public)
**PR:** https://github.com/CupidAmorstore/helix-preview/pull/3 (draft, not merged)
**Full diff vs main:** https://github.com/CupidAmorstore/helix-preview/compare/main...ccr-8d17e0b5-yaqvtm
**Branch / head:** `ccr-8d17e0b5-yaqvtm` @ `50498b5` (base `main` @ `dca30a7`). 14 commits, 100 files, +8,662 / −1,548.

Please audit **adversarially**. Treat every claim below as unverified until you check it in code, tests or evidence. Report what is wrong, overstated or missing.

---

## 1. Ground rules the work had to respect (check for violations)
- Paper trading only. **No real-money order path may exist.** Real money "disabled until explicit owner authorization".
- No fabricated prices, trades, performance or test results. Zero approved strategies is acceptable.
- Validation gates must not be relaxed to manufacture approvals.
- No secrets or recovery phrases logged or stored in plaintext.
- $0 budget; preserve existing work and history (no force-push, nothing deleted from research records).
- A browser viewport or emulator is **not** a physical-device test.

## 2. Evidence you can open
| What | Where |
|---|---|
| Installable APK (debug build #23 = head `50498b5`) | https://github.com/CupidAmorstore/helix-preview/releases/tag/android-preview · sha256 `a09a8f5ef88fe879248f35fb7769378a0271d230002b3a0449379d0f2d89d9fe` |
| Real APK on Android 15 emulator (screenshots + results.json, 21/21) | https://github.com/CupidAmorstore/helix-preview/releases/tag/android-e2e |
| Device-test script / workflow | `scripts/android-e2e.cjs`, `.github/workflows/android-e2e.yml` |
| Browser QA scripts | `docs/qa/click-crawl.cjs`, `functional-check.cjs` (64 checks), `deep-check.cjs`, `wallet-flow.cjs` |
| Inspection reports | `docs/FULL_APP_INSPECTION.md`, `docs/VISUAL_QA.md` |
| Screenshots (web build, 412×915) | `public/inspect/img/*.jpg` |
| Research cycle write-up | `docs/trading-bot/RESEARCH_CYCLE_2026-11-23.md` |
| Recovery manifest (SHAs, hashes) | `docs/RECOVERY_MANIFEST.md` |
| Backlog with acceptance criteria | `docs/BACKLOG.md` |
| Unit tests | `src/__tests__/**` (120 passing at head) |

## 3. What changed, by area (with the files to read)

### A. Trading research (`src/bot/`, `scripts/bot-research.ts`, `research/`)
- New strategy families: `vol_filtered_trend`, `regime_switch` (`strategies.ts`), cross-sectional momentum portfolio evaluator (`crossSectional.ts`).
- **Multiple-testing control made cumulative**: Bonferroni denominator = all registry entries + this run (`research.ts`, `bonferroniN`).
- Evidence from runs on identical datasets is merged (`scripts/bot-research.ts`).
- Claimed result: 177 candidates, **0 qualified**. Two new-family candidates reached the unseen test on BTC and lost (−22.0%, −10.9%).
- **Audit:** look-ahead in the new builders (`vol_filtered_trend` uses `vol.slice(i - lookback, i)`, `regime_switch` holds mutable `mode/held` state); `simulateXs` entry/exit indexing and turnover-cost formula; whether the cross-sectional neighbour set is a fair stability test; whether `GATES` were changed (they should not be); whether hourly results for the new families are claimed anywhere (they were **not** run: stale data).

### B. Daily research feed (`.github/workflows/deploy-pages.yml`, `src/bot/botData.ts`)
- Scheduled workflow runs research and publishes `/data/latest.json`; the app fetches it, validates (`mode === 'paper'`, shape, newer, not future-dated), caches in IndexedDB, falls back to the bundled snapshot.
- **Not live yet**: only runs from `main` (PR not merged); the app currently shows "Built into the app".
- **Audit:** can a malformed/hostile feed inject anything into the UI? Is the fallback correct? Does the CI step fall back to the committed snapshot on failure?

### C. Paper trading engine (`src/paper/engine.ts`, `book.ts`, `PaperProvider.tsx`)
- Market orders walk the **live Coinbase level-2 book**; fills never beyond **2%** of the quote; the remainder is unfilled (`partial: true`); no liquidity → refusal; book older than 60 s or unavailable → fixed cost model, and each order records `fillModel`.
- Fee 0.60% charged only on the filled amount. Existing rules: $1 min, 50% per-coin cap, stale-quote refusal, duplicate clientId, pause.
- **Audit:** fee/notional arithmetic in partial buys (`spend = w.usd / (1 - feeFrac)`), cost-basis accounting on partial sells, rounding, whether `slippageUsd` can be negative (it can, when the ask is below the last trade; the UI now says "Better than last price").

### D. Security & wallet (`src/services/vault.tsx`, `src/pages/WalletPage.tsx`, `src/components/VaultGate.tsx`, `ConnectionsPage.tsx`)
- **Fixed: any password used to "unlock" the vault.** Now an AES-GCM verifier is stored at creation; legacy vaults are verified against existing encrypted data. Min 10 chars for new vaults.
- Decrypted mnemonic cleared whenever the vault locks (5-min auto-lock).
- Vault create/unlock inline on the Wallet screen; delete requires typing `DELETE`.
- Watch-address validation per chain.
- Removed a Stripe checkout calling non-existent `/api/*`, an unowned `support@helix.app` contact, and static `public/*.html` pages that shadowed app routes.
- **Audit:** verifier design (any oracle/downgrade issue? what if the verifier is deleted from IndexedDB, does `verifyVaultKey` then accept any password when no other encrypted item exists?), whether the mnemonic is ever logged/persisted in plaintext, whether `createMnemonic` state can outlive the vault, `allowBackup=true` in the Android manifest.

### E. Android shell (`src/hooks/useNativeShell.ts`, `android/app/src/main/res/values/styles.xml`, `capacitor.config.json`, `index.html`)
- Hardware Back: close sheet → back → Home → exit only from Home (`@capacitor/app`).
- External links handed to the system browser; scroll-to-top on navigation.
- Dark system bars (native theme was light DayNight → white bars), `viewport-fit=cover` + safe-area padding.
- **Audit:** the external-link interceptor relies on Capacitor opening off-host navigations externally; confirm that behaviour and that in-app links are never intercepted.

### F. Resilience (`src/components/ScreenGuard.tsx`, `src/services/market.ts`, `src/services/btcApi.ts`)
- Lazy screens retry once, then show a readable error (fixed a full-app blank screen offline/after deploys); per-screen error boundary; background prefetch.
- Price feed: `offline` status, reconnect every ≤5 s (Android WebView lacks reliable online events), retry on return to foreground, 15 s stale threshold.
- Bitcoin API fallback Blockstream → mempool.space (4xx other than 429 is not retried, so a rejected broadcast is not re-sent).
- **Audit:** could the BTC fallback double-broadcast a transaction? Socket leak on reconnect?

### G. Alerts (`src/alerts/`, `src/pages/AlertsPage.tsx`)
- App-wide watcher on live prices, fires once per crossing then re-arms, in-app banner on any screen; validation. **Does not notify while the app is closed** (stated in the UI).

### H. Design system v2 "Ledger" (`tailwind.config.cjs`, `src/styles.css`, `src/components/ui.tsx`, most pages)
- Flat hairline sections instead of card stacks, warm ink + ivory, one accent, tabular sans figures, new helix mark, persistent paper-money strip.
- **Audit:** subjective. Compare `public/inspect/img/` and the `android-e2e` screenshots against the owner's complaint that the app looked generic. Contrast was checked with axe (0 WCAG 2.1 AA violations on 13 routes).

## 4. Claims to verify (with how)
| Claim | How to check |
|---|---|
| No real-money order code path | grep for exchange order endpoints / signing used outside the testnet-first wallet; `LIVE_TRADING_ENABLED`, `assertPaperOnly()` |
| 0 of 177 qualified; gates unchanged | `src/bot/validation.ts` `GATES` vs `main`; `src/bot/data/latest.json` |
| 100/100 daily candidates reproduce from stored data | run `npm run bot:research -- --offline` with an empty `research/registry.json` in a copy; compare `research/runs/*1d.json` |
| 120 unit tests pass; typecheck/lint clean | `npm ci && npm test && npm run typecheck && npm run lint` |
| 21/21 device checks on real APK, Android 15 | `results.json` in the `android-e2e` release; script `scripts/android-e2e.cjs` |
| Paper accounting correct to the cent | `src/__tests__/paper.test.ts`; device screenshot `15-relaunched-raw.png` ($450.00 cash + $49.70 invested, $0.30 fee for $50) |
| Wrong vault password refused | `src/__tests__/vault.test.ts`, `docs/qa/wallet-flow.cjs` |

## 5. Known limitations (stated, not hidden)
- **No physical-device test.** Android verification is an API 35 emulator in CI (WebView 124).
- Debug APK only; release signing needs the owner's keystore.
- Daily feed and the new website only go live after merging to `main`.
- Order-book, funding/basis, on-chain, event-driven and stat-arb families are **untested**: no free reproducible historical data.
- `npm audit`: 4 moderate `uuid` advisories via `@solana/web3.js` (fix requires a breaking major upgrade).
- `public/CNAME`, `robots.txt`, `sitemap.xml` still reference `apexcryptodesk.com` (owner's earlier choice; left as is).
- The device test's post-relaunch checks use a screenshot because Playwright's Android driver could not re-attach to the new WebView.
- Cost model fee (0.60% taker) is a preset, not the owner's actual fee tier; 30 days of order-book cost history not yet collected.

## 6. Questions I'd most like an independent answer to
1. Any path, however indirect, by which a real order or real-funds transaction could be placed without explicit user action on testnet/mainnet?
2. Any look-ahead or data-leakage bug in the new strategy builders or the cross-sectional evaluator?
3. Is cumulative Bonferroni over the registry implemented correctly, and is it an appropriate (not overly lax) control?
4. Is the vault verifier sound? Edge cases where a wrong password is still accepted?
5. Partial-fill accounting: any way cash, fees or cost basis drift?
6. Anything in the UI copy that overstates what is implemented (live trading, notifications, "live" data, device testing)?
7. Which change would you revert, and why?

Please answer with: severity (critical / high / medium / low), file:line, evidence, and a concrete fix.
