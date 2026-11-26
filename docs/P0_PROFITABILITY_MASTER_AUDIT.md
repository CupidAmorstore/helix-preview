# P0 profitability master audit — HELIX Trading Bot (2026-11-26)

**Verdict: no profitable strategy has been established.** The P0 *engineering* remediation is complete for the HELIX
code base; the P0 *profitability* objective is **not resolved** and cannot be until fresh forward evidence exists.

| | |
|---|---|
| Starting commit | `8479db3` (head of PR #3 branch `ccr-8d17e0b5-yaqvtm`, which contains the referenced `d7174f1`); tag `p0-baseline-8479db3` |
| Recovery branch | `ccr-1cd67cd2-1dk1jh` |
| Final commit | see `docs/P0_FINAL_ACCEPTANCE_REPORT.md` |
| Tests | 326 at baseline → **374 passing, 0 failing, 0 skipped** (`npx vitest run`) |
| Real money | disabled; no exchange order adapter exists; new code calls `assertPaperOnly()` |

## 1. What was recovered (and what could not be)
- HELIX Preview source, research engine (`src/bot`), registry (199 candidates), provenance, run records, stored datasets — all present and reproduced.
- **Not accessible from this session:** Trading Lab 0.6.8/0.7.0 (Python) source, its 189 tests, and the recovery package
  `HELIX_Trading_Bot_P0_Recovery.zip` (`p0_diagnostics.py`, `p0_admission.py`, `p0_replay.json`, tests). Searched: all
  git branches/tags of the repo, the 15 GitHub repositories visible to the account, Google Drive (no match); Gmail
  connector required re-authentication. The Trading Lab table (0/11, 7/11, 0/11, 1/11; −$37.51 … −$4.80) is therefore
  **unverified**. Its *method* was re-implemented and run on HELIX data instead (§3).

## 2. Audit claims reproduced independently (Python, separate from the TypeScript engine)
`python3 -I scripts/p0/reproduce_claims.py` → `research/p0/claims-reproduction.json`

| Claim | Reproduced | Verdict |
|---|---|---|
| 199 candidates, 0 qualified | 199, all `rejected` | confirmed |
| 1.30% round trip | 1.30% (legacy preset) | confirmed — but the preset is **outdated** (§4) |
| ~0.30% median hourly move | 0.297% | confirmed |
| ~0.70 mean pairwise daily correlation | 0.702 (first factor 73%, ≈1.8 independent assets) | confirmed |
| 4 candidates reached test, all lost | registry/run records | confirmed (from records) |

## 3. Central findings (new)
1. **The gross "edge" is market exposure, not prediction.** Across 180 training-selected candidates replayed on their
   (already inspected) validation windows with the unified engine: zero-cost P&L **+$18,484** vs an exposure-matched
   passive holding **+$18,805**; only **76/180** beat passive (8/10 markets below 50%; median timing excess −$14.49).
   Costs are therefore *not* the only problem — even at zero cost there is no demonstrated timing skill.
2. **Costs then turn it negative:** real-cost P&L **−$5,775** (70/180 profitable); cost drag $24,260.
3. **Fill timing matters:** next-close fills (one bar later) cost a further **−$3,080** — signals decay within a bar.
   Terminal-position treatment is minor (−$509 = exit cost of 80 positions open at window end).
4. **Verified fees are higher than modelled.** Kraken Pro Tier 1 is **0.40% maker / 0.80% taker** (official, since
   2026-07-09) vs the 0.40% taker preset; Coinbase Advanced US Intro is reported at **0.50% / 0.90%** since 2026-09-16
   (secondary sources; official page refused automated access) vs 0.60%. Every historical rejection is therefore
   *conservative*; nothing rejected would have passed with real fees.
5. **No CEX holding period shorter than ~1 week is economically justifiable at any tier** (admission layer).
6. **Commercial ceiling:** even a hypothetical 2% gross edge per weekly trade nets $0.25–$12.50 per year at 25%
   sizing on $20–$1,000. Directional trading at retail fee tiers is not a meaningful income source at these sizes.
7. **Regime labels describe, they do not forecast:** all four trend labels have negative median 30-day forward returns
   (41–48% up-share); persistence of strong-bull/bear is 85% over 7 days.

## 4. Engineering delivered
| Deliverable | Where | Evidence |
|---|---|---|
| Unified execution engine (exec-v1) | `src/bot/execution.ts` | equals legacy to 1e-10 on real data, every family; chunked/serialised == batch |
| Opportunity admission (fail-closed) | `src/bot/admission.ts`, `src/bot/feeEvidence.ts` | 18 tests |
| Capital-tier intelligence | `src/bot/capitalTiers.ts`, `research/p0/capital-feasibility.json` | tests + study |
| Forward evaluator fixes + registration b + ledger | `src/bot/forward.ts`, `scripts/forward-paper.ts`, `research/forward/*` | 9 tests; live refresh run |
| Daily persistent forward process | `.github/workflows/forward-paper.yml` | dry-run of git plumbing; **not operational until merged** |
| Failure registry + novelty guard | `src/bot/failureRegistry.ts`, `research/p0/failure-registry.json` | 180 classified |
| Hypothesis registry | `src/bot/hypotheses.ts` | 8 hypotheses with mechanism/invalidation |
| Regime module (point-in-time) | `src/bot/regime.ts` | future-mutation test; reliability study |
| Maker research model | `src/bot/maker.ts` | always `unverified_candle_model` |
| gates-v4 (stricter monthly inference) | `src/bot/stats.ts`, `validation.ts`, `crossSectional.ts` | regression test |
| Dashboard diagnosis panel (EN/FR) | `src/components/bot/P0Diagnosis.tsx` | rendered at 390 px, no overflow/errors |

Details: `P0_ROOT_CAUSE_REGISTER.md`, `P0_EXECUTION_ENGINE_VERIFICATION.md`, `P0_CAPITAL_FEASIBILITY_REPORT.md`,
`P0_STRATEGY_RESEARCH_REPORT.md`, `P0_FORWARD_PAPER_PROTOCOL.md`, `P0_REMEDIATION_EVIDENCE.md`, `P0_FINAL_ACCEPTANCE_REPORT.md`.

## 5. What was NOT done (by design)
No gate relaxed (gates-v4 is stricter). No cost lowered. No test window opened. No new history-based candidate
evaluated (the novelty guard blocks all 11 families; provenance would block qualification anyway). No real-money path.
