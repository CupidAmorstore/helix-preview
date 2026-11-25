# HELIX Preview — audit handoff (cycle 2026-11-24/25)

Repo: https://github.com/CupidAmorstore/helix-preview (public) · branch `ccr-8d17e0b5-yaqvtm` · draft PR #3 · `main`
(`dca30a7`) untouched. Authoritative status: `docs/MASTER_PROJECT_STATE.md`.

## Commits to audit (oldest first)
1. `4e3bf37` — `@solana/web3.js` removed. SOL keys/addresses now use `@noble/curves` (Ed25519) + `@scure/base` (base58) in
   `src/services/solana.ts`; same address test vector; sending still fail-closed.
2. `8161a3e` — walk-forward re-testing in `src/bot/validation.ts` (`walkForward`, `gates-v2`). Second half of the pre-test
   data → 4 folds; settings re-chosen before each fold on earlier data only, with an embargo of one indicator look-back.
   Reject if compounded walk-forward net ≤ 0 after costs, or < half the folds profitable. Final test window never used.
   Tests: `src/__tests__/bot/walkForward.test.ts`.
3. `0b6b578` — pre-registered (committed before any run) daily-only families `weekly_trend`, `monthly_momentum`; decisions only
   on calendar rebalance days; look-ahead + turnover tests in `src/__tests__/bot/multiDay.test.ts`; excluded from hourly runs.
4. `16762ad` — research run `research/runs/run-2026-11-24T19-36-41-194Z-1d.json`: **22 candidates, 0 qualified; cumulative
   199 tested, 0 qualified.** All had 1–8 validation trades (< 15 minimum). The minimum was not lowered.
5. `2433734` — Research Lab tables become labelled lists under 480 px; walk-forward shown per candidate;
   `docs/qa/research-mobile.cjs` 24/24 (browser viewport only, not a device).
6. `0e6c6e6` — explicit 30 s limit on the two random-walk sweeps (exceeded 5 s on CI after walk-forward); same seeds,
   nothing skipped.
7. `727ba30`, `27b3afa` — documentation.

## Evidence
- 180/180 unit tests · typecheck clean · lint 0 errors.
- Browser: functional 68/68 · deep (axe) 21/21 · wallet 10/10.
- `npm audit --omit=dev`: 0. Full audit: 6 low (`elliptic`) in the build-only `vite-plugin-node-polyfills` chain; not in
  the shipped bundle.
- Android 15 emulator 30/30 on the exact built APK: version code 33, commit `0e6c6e6`, run 45530332004, sha256
  `cc081b0d5268a6c3f7e391415843cb52503b4804b8307ee358d1083c667be142` (release `android-e2e`). Emulator, not a phone.

## Please check specifically
- `walkForward` uses no test-window data; the embargo is correct.
- `rebalanceDay` (`src/bot/strategies.ts`) uses no future data.
- The daily-only families' look-ahead tests are adequate.
- Holdout guard and cumulative Bonferroni (N=199) apply to the new candidates.
- SOL derivation equals web3.js `Keypair.fromSeed`.
- No gate was weakened.

## Still open
Public debug signing key (owner: add QA signing secrets) · no physical-phone test · OMEGA and Trading Lab source not
recovered (owner: move into a private repo) · no cross-market correlation correction.

## Rules
Paper trading only; no signing or broadcasting · never put OMEGA/Trading Lab code in this public repo · never reset the
research registry or lower costs without evidence · no merge into `main` without owner approval.
