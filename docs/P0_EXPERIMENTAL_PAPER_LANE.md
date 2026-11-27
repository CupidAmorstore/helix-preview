# P0 experimental paper lane (experimental-v1) — implementation and verification

**Scope:** paper observation only. Two additional simulated accounts, one hypothesis each, under the owner's
authorization of 2026-11-27. Real-money trading is disabled. Nothing here is validated, qualified or proven profitable.

## Branch and commits
- Branch: `experimental-paper-lane`, created from `origin/main` (`0fa9b81`, which contains PR #3 and PR #4). **Not merged to main.**
- Commit `aac950a`: implementation, tests, screening record, proposed registrations.
- Commit `<activation>`: activation of the two registrations, updated status record, this document.

## Hypotheses in active observation (cap 5)
| # | Hypothesis | Account | Registration | Status |
|---|---|---|---|---|
| 1 | F1 pooled time-series momentum (168d) | forward a and b (same hypothesis) | `registration.json` (v1), `registration-b.json` (v2) | running, unchanged |
| 2 | F2 weekly trend (SMA200) | a and b | same | running, unchanged |
| 3 | F3 cross-sectional momentum (top-3, weekly) | a and b | same | running, unchanged |
| 4 | E1 XRP daily Bollinger reversion (n=20, k=2, maxHold=24) | experimental, own $1,000 | `registration-e1.json` (v3) | **active from 2026-11-28 00:00 UTC** |
| 5 | E2 ETH daily RSI reversion (n=14, lo=25, hi=55, maxHold=24) | experimental, own $1,000 | `registration-e2.json` (v3) | **active from 2026-11-28 00:00 UTC** |

Registrations a and b count as the same three hypotheses, so the distinct total is exactly 5 (`p0Status.test.ts`).

## Registration hashes
| Registration | Hash version | Hash |
|---|---|---|
| a (`registration.json`) | v1 | `00bb27b20a7dc92c3d8f81b5b1d5eab82bd0c7bbc24242113445434c934bc998` (unchanged) |
| b (`registration-b.json`) | v2 | `9daf74dbeaca54c538d6b2e37110c3cb5b1c2ba9b635d751e8232a8a60093f2e` (unchanged) |
| e1 (`registration-e1.json`) | v3 | `4686043c6788d4d25324aeb538acb2c60dc984c018395a7ebd3a08a58a85023a` |
| e2 (`registration-e2.json`) | v3 | `76a82cc7836289acd03bfcb5789bd1931c620b595574ed0ac124b91dd8d5fb38` |

Hash v3 commits to id, `registeredAt`, `startAt`, cost values and the experimental policy. Changing a start date or a
policy field now changes the hash (`p0Hash.test.ts`).

## Investigation: the proposal hash "matched registration b"
- The archived proposal (`research/experimental/screen-2026-11-27/registration-experimental.PROPOSAL.json`) has rulesHash
  `2098606e…d13`. That is **not** registration b's hash. Its own hash recomputes correctly.
- The "PASS: canonical hash matches existing registration-b" line in the build script checks a **reference copy of
  F1–F3**, not the proposal. The claim was a mislabelled check.
- A real gap was found: the v2 hash did not commit `startAt`, so a start date could be moved after registration with no
  hash change. Fixed for new registrations (v3). Registration b's legacy behaviour is pinned by a test, not changed.

## Safeguards (verified before activation)
| Requirement | Implementation | Test |
|---|---|---|
| Separate $1,000 simulated accounts | one registration and one ledger per hypothesis; `runExperimentalAccount` on one market | `p0Hash` / forward evaluator |
| Maximum 5% per position | `positionFraction: 0.05`; the first buy is 5% of equity | "the first position is 5% of the $1,000 account" |
| No leverage | buys are funded from cash only; no buy exceeds 5% of capital | "no leverage: no buy ever exceeds 5%…" |
| No averaging down | one position per account; the engine buys only when flat | "never averages down…" |
| Drawdown guard at 5% | latched guard blocks **new entries only** | "trips at 5% from peak and never releases automatically" |
| Existing positions keep exits | the guard is never consulted for a sell | "a latched guard blocks new entries but never blocks an exit" |
| Realistic fees, spread, slippage | exec-v1 on every fill | "a flat round trip loses exactly the modelled fee…" |
| Double-cost sensitivity | computed beside every base run; reported in forward output | "double-cost sensitivity is reported and is worse…" |
| Persistent accounting and restart recovery | digest-verified snapshots; recomputation must extend the snapshot exactly | "restart: recomputing from data extends…"; "a snapshot verifies, and tampering is detected" |
| Determinism | same inputs, same result | "the same inputs always give the same result" |

**Finding on the drawdown guard:** with 5% per position and one position per account, a single position can cost at most
about 5% of the account, and that happens only if the asset goes to zero. A 99% crash of the only position leaves the
account at about −4.95%, below the trigger (test "documents: at 5% per position…"). The guard is therefore a backstop
against near-total loss, not a control against ordinary adverse moves. The 5% per-position cap is the effective risk
limit. The guard is implemented as specified; the owner should know it is inert against ordinary losses at this sizing.

## Costs and the Coinbase fee tier (not verified for the account)
- The official Coinbase fee page could not be fetched (HTTP 403). The account's tier is not verifiable from here.
- Evidence found: US Intro 0.90% taker (secondary sources, since 2026-09-16); a secondary guide quoting **1.20% taker** for an
  earlier schedule.
- Experimental simulation uses **`coinbase_experimental_conservative_2026_11` = 1.20% taker + 2 bps half-spread + 3 bps
  slippage**, the conservative bound. Double-cost sensitivity is 2.40% taker.
- **This is not a statement of the account's fees.** Confirm the account tier before any further use.

## Re-costing the validation windows (diagnostic; already-inspected history, not evidence)
At 5% sizing on the candidates' recorded validation windows:

| Candidate | Conservative 1.20% | Secondary 0.90% | Legacy 0.60% | Fills |
|---|---|---|---|---|
| XRP Bollinger (2025-04-12 → 2026-01-30) | +2.23% | +2.46% | +2.69% | 14 |
| ETH RSI (2023-12-01 → 2025-05-26) | +1.04% | +1.11% | +1.18% | 4 |

The screen's headline figures (XRP +66%, ETH +24%) were at full-capital sizing; at 5% per position the same signals earn
roughly a twentieth of that. Both stay positive at the conservative cost, but this is a small, historical, diagnostic
result on data already inspected, and it cannot qualify either account.

## Strategy statuses (`research/experimental/strategy-status.json`)
Vocabulary: rejected · insufficient evidence · approved for experimental paper trading · collecting forward evidence ·
validated paper strategy · real-money eligible (disabled). No status permits real money (`p0Status.test.ts`).

| Candidate | Status | Source |
|---|---|---|
| XRP Bollinger (E1) | collecting forward evidence | owner approved and activated |
| ETH RSI (E2) | collecting forward evidence | owner approved and activated |
| SOL volatility compression | insufficient evidence (watchlist) | owner: one validation trade |
| LINK SMA cross (hourly) | insufficient evidence (deferred) | owner: preserved for later |
| ADA SMA cross (hourly) | insufficient evidence (deferred) | owner: preserved for later |
| 23 other candidates | rejected | screen: drawdown or stability failure |

## Thresholds
- Experimental admission: validation trades ≥ 1 (the 15-trade minimum is removed for this lane only).
- Final qualification (gates-v4): unchanged. Validation still requires 15 trades (`p0Status.test.ts`).
- Multiplicity: each experimental registration uses family alpha 0.01 (= 0.05 ÷ 5 hypotheses). Registrations a and b keep 0.05 ÷ 3.

## Screening record (saved permanently)
`research/experimental/screen-2026-11-27/`: the admission report (28 rows) reproduced from the repository
(`admission-report-from-repo.json` is byte-identical to the archived report), both archived READMEs, both test-result
files, the archived build script, the proposal file, and `ARCHIVE-SHA256.txt` for the two uploaded zips.

## Test results
- `npm test`: **411 vitest tests passed, 0 failed, 0 skipped**; **17 node admission tests passed** (`tests/experimental-admission.test.mjs`).
- New in this change: `p0Experimental` (13), `p0Hash` (7), `p0Status` (6).
- `npm run typecheck`: clean. `npm run lint`: 0 errors; 1 warning, pre-existing (`ScreenGuard.tsx`).
- `npm run build`: succeeds.

## Paper-engine status
- E1 and E2: `running`, status `collecting`, **0 complete months**, no data problems, data through 2026-11-27.
- The daily workflow reads registrations from **main**. These two registrations will only be processed by the daily job
  after this branch is merged to main, which needs owner approval.
- No orders have been placed and no fills exist yet. The first possible decision is at the 2026-11-28 close.

## Not done / blocked
- Coinbase account tier not verified (official page inaccessible). Cost is a disclosed conservative bound.
- Gmail connector still needs re-authorization, so the Trading Lab recovery zip could not be searched for.
- Merge to main, and therefore the daily job, awaits approval.
- Nothing here changes the three existing hypotheses' registrations or the final qualification gates.
