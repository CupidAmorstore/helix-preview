# P0 final acceptance report (2026-11-26)

## Verdicts
| Objective | Verdict |
|---|---|
| **P0 engineering remediation (HELIX code base)** | **Complete**, with the open items listed below |
| **P0 profitability objective** | **Not resolved. No profitable strategy has been established.** |
| Real-money trading | Disabled (unchanged; no order adapter; isolation tests pass) |

## Acceptance criteria (directive §22)
| Criterion | Status | Evidence |
|---|---|---|
| Historical and forward execution semantics consistent | ✅ | exec-v1 used by forward pooled rules; batch == incremental replay test; legacy equivalence on real data |
| Accounting independently verified | ✅ | identity tests (realized + unrealized), zero-cost conservation, Python reproduction of inputs |
| Cost models economically realistic | ✅ for Kraken (official) · ⚠️ Coinbase secondary-source only | `feeEvidence.ts`; owner confirmation needed |
| Opportunity screening operational | ✅ | `admission.ts` (fail-closed) |
| Capital-specific feasibility implemented | ✅ | `capitalTiers.ts`, feasibility study |
| Research provenance protected | ✅ | registry/provenance untouched; gates-v4; novelty guard |
| Failed experiments systematically recorded | ✅ | `research/p0/failure-registry.json` (180) |
| Forward-testing infrastructure works | ✅ code / ⚠️ schedule | ran live 2026-11-26; daily workflow active only after merge |
| Risk controls operational | ✅ | existing risk tests + admission position limits + regime fail-closed |
| Regression tests pass | ✅ | 384/384, 0 failed, 0 skipped |
| Real-money trading disabled | ✅ | `realMoneyIsolation.test.ts` |

## Three audit passes
1. **Engineering integrity** — no order/auth/private-endpoint code added; new engine verified against legacy on real
   data; 8 implementation defects found and fixed (register D-1…D-8).
2. **Quantitative integrity** — attempted to disprove every profitable-looking result: the zero-cost gains are
   exposure (76/180 beat passive; 8/10 markets below half); regime labels have no directional power; maker "benefit" is a
   candle artifact; momentum's apparent outperformance of buy-and-hold is reduced exposure, not timing. Found and fixed
   the monthly double-count (gates-v4).
3. **Commercial integrity** — at $20–$1,000 and 1.7–1.9% round trips, even a 2% gross weekly edge yields ≤ $12.50/year.
   No demonstrated opportunity is economically meaningful for the intended account sizes.

## Record
| | |
|---|---|
| Starting commit | `8479db3` (tag `p0-baseline-8479db3`) |
| Final commit | head of `ccr-1cd67cd2-1dk1jh` (see PR) |
| Changed files | 50+ (code: `src/bot/{execution,admission,feeEvidence,capitalTiers,forward,regime,maker,failureRegistry,hypotheses,stats,validation,crossSectional,costs}.ts`, `src/components/bot/P0Diagnosis.tsx`, `src/pages/ResearchLabPage.tsx`; scripts `scripts/forward-paper.ts`, `scripts/p0/*`; workflow; research outputs; 8 docs) |
| Confirmed defects | 10 implementation (D-1…D-10) + 8 economic/statistical causes (RC-1…RC-8) |
| Corrected defects | D-1…D-10 |
| Remaining | R-1…R-6, R-8 in `P0_ROOT_CAUSE_REGISTER.md` (R-7 Watchbot fixed in follow-up) |
| Passed / failed / skipped tests | 384 / 0 / 0 |
| Historical results | 199 candidates, 0 qualified (unchanged); 180 diagnosed |
| Fresh prospective results | forward a: started 2026-11-26; bars through 2026-11-26 evaluated, all three rules in cash, 0 complete months; b: active from 2026-11-28 (owner approval 2026-11-27) |
| Statistical confidence | none for any profitability claim |

## Outstanding blockers / owner decisions
1. Provide the Trading Lab source and `HELIX_Trading_Bot_P0_Recovery.zip` (or attach the repository) to audit the Python stack.
2. Confirm the actual Coinbase/Kraken fee tier on the account; record it as fee evidence (never lower without evidence).
3. ~~Decide whether to activate forward registration b~~ — activated 2026-11-27 (owner delegated all decisions); starts 2026-11-28.
4. Merge so the daily forward-paper workflow runs — owner approved 2026-11-27.
5. Expect the forward verdict no earlier than 2027-12-01.

**Holding cash is the correct state.** The objective was not to make the bot look profitable; on current evidence it is not.
