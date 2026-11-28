# HELIX × Pro Trading Bot: Phase III handoff for Codex (2026-11-27)

PAPER ONLY. Real-money trading is disabled in code (`assertPaperOnly`). Nothing here is validated or proven profitable.

## Where the code is
| Item | Value |
|---|---|
| Repository | `CupidAmorstore/helix-preview` |
| Work branch | `ccr-8d17e0b5-yaqvtm` (isolated; not merged) |
| Phase III implementation commit | **`d5c36fc1ea815a325b4a1360a0f4c54e66d6bc37`** |
| Built on | `experimental-paper-lane` @ `7c07433` (the lane itself: `aac950a`, `3f52051`, `534fe33`, `7c07433`) |
| `main` (production) | `0fa9b81` (PR #3 + PR #4). **Neither the lane nor Phase III is on main.** |
| Forward state | `forward-ledger` branch (written only by the daily `forward-paper` workflow) |

## The 12 assignment items
| # | Item | Result | Where |
|---|---|---|---|
| 1 | Experimental admission engine | **Done earlier, verified.** `scripts/experimental-admission.mjs` reproduces the archived 28-row report byte for byte (`admission-report.json` and `admission-report-from-repo.json` both identical); 5 eligible. Runs in `npm test` (17 node tests). | lane `aac950a` |
| 2 | Early-stage selection less restrictive | **Done earlier, verified.** Experimental lane admits ≥ 1 validation trade (was 15) for trade-count-only rejections with positive train/validation, drawdown ≤ 25 %, neighbour stability ≥ 0.5, test window never inspected. | same |
| 3 | Final qualification strict | **Verified unchanged.** `src/bot/validation.ts` GATES (15/15/30 trades) and gates-v4 untouched vs main; `p0Status.test.ts` asserts validation still needs 15 trades and no status permits real money. | — |
| 4 | XRP Bollinger / ETH RSI under updated costs | **Independently reproduced** (5 % sizing, recorded validation windows): E1 XRP +2.23 % / +2.46 % / +2.69 % / +1.29 % at 1.20 / 0.90 / 0.60 / 2.40 % taker (14 fills); E2 ETH +1.04 / +1.11 / +1.18 / +0.77 % (4 fills). Diagnostic on already-inspected history, **not evidence**. | `research/experimental/phase3-verification.json` |
| 5 | Registration hash integrity | All 4 hashes recompute (a v1 `00bb27b2…`, b v2 `9daf74db…`, e1 v3 `4686043c…`, e2 v3 `76a82cc7…`). **New gap found and fixed:** the hash only proved self-consistency; an edit that also rewrote `rulesHash` passed. Identity is now pinned in the ledger and checked fail-closed; this also covers `startAt` for a/b. | `d5c36fc` |
| 6 | 5 % position cap, 5 % drawdown suspension | Enforced and tested (lane). Verified on real history: largest buy ≈ 5 % of equity at the time. **Finding:** at 5 % sizing with one position the latch cannot trip on ordinary moves (worst historical DD 0.65 %; a 99 % crash ≈ −4.95 %). The cap is the effective risk limit. | lane + `phase3-verification.json` |
| 7 | Activate both $1,000 accounts after verification | **Active** (`3f52051`), start **2026-11-28 00:00 UTC**, 0 fills. Re-verified here before handoff; no change needed. | `research/forward/registration-e1.json`, `-e2.json` |
| 8 | Preserve the three forward hypotheses | Registrations a and b byte-identical to main; hashes unchanged; 5 distinct hypotheses total. | — |
| 9 | Persistent monitoring and accounting | Dry run on live public candles: all 4 registrations `running`, pins stored, rerun idempotent, tamper test refused with ledger kept. **Blocker:** the daily job reads registrations from **main**, so E1/E2 are not monitored until merge. | see blockers |
| 10 | Regression tests | vitest **416/416**, node **17/17**, typecheck clean, lint 0 errors (1 pre-existing warning), build ok. | — |
| 11 | Commit to isolated branch | `d5c36fc` on `ccr-8d17e0b5-yaqvtm`. | — |
| 12 | Handoff | This file. | — |

## Files changed in Phase III (`d5c36fc`)
- `src/bot/forward.ts`: `RegistrationPin`, `checkRegistrationPin()` (pure).
- `scripts/forward-paper.ts`: pin check before evaluation; pin stored in `ledger-<id>.json` only for an accepted active registration; nothing written on a pin mismatch.
- `src/__tests__/bot/p0Pin.test.ts`: 5 tests.
- `scripts/p0/phase3-verify.ts`, `research/experimental/phase3-verification.json`: re-cost and latch evidence.
- `docs/P0_EXPERIMENTAL_PAPER_LANE.md`: activation commit placeholder filled in.

## How to reproduce
```
npm ci && npm test                     # 416 vitest + 17 node tests
npm run typecheck && npm run lint && npm run build
node scripts/experimental-admission.mjs . | cmp - research/experimental/screen-2026-11-27/admission-report.json
npx vite-node --config scripts/vite.node.config.ts scripts/forward-paper.ts --hash
npx vite-node --config scripts/vite.node.config.ts scripts/p0/phase3-verify.ts
```

## Remaining blockers
1. **Merge needs owner approval.** Until `experimental-paper-lane` + `d5c36fc` reach main, the daily `forward-paper` workflow does not evaluate E1/E2 and does not pin a/b. The first E1/E2 bar is 2026-11-28; after a later merge, the runner recomputes from `startAt`, so no forward bars are lost (data is public and refreshed daily).
2. **First pin is trust-on-first-use.** Existing ledgers for a/b have no pin; the first run after merge pins whatever is on main then. Check that a/b on main still show hashes `00bb27b2…` / `9daf74db…` before that run.
3. **Coinbase fee tier not verified** (official page HTTP 403). E1/E2 use a disclosed conservative 1.20 % bound. The owner must confirm the account tier.
4. **Drawdown latch is inert at 5 % sizing** (item 6). It is implemented as specified; a stricter control would be an owner decision, not a silent change.
5. The old in-session daily scheduled task (`trig_01YEH54iL9bwFUWyeWzvrnWC`) was turned off by the server for lack of usage credits. It is superseded by the GitHub workflow ($0); left off.
6. Evidence horizon: 12 complete months per hypothesis before any `forward_qualified` status. The current status of all five is `collecting`, 0 months.

## Rules for the next agent
No real orders, keys, deposits or withdrawals. Do not relax gates-v4 or the 5 %/5 % policy. Do not edit an active registration (a change is a new registration with a new start). Do not rewrite or delete ledgers, the registry or failed experiments. No merge to main without the owner's explicit approval. Budget $0.
