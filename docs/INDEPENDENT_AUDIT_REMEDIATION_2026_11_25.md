# Independent audit remediation — 2026-11-25

Baseline verified before any change: local `HEAD` = `origin/ccr-8d17e0b5-yaqvtm` = `886d4b2`, clean tree.
Findings came from an independent ChatGPT source inspection. **Reproduction and fixes were done by the same agent
(Claude), so this is self-verification of an external audit, not a second independent review.**

Executable reproduction on the unmodified baseline: `scripts/audit-repro-886d4b2.ts` → `research/audit/repro-886d4b2.json`
(commit `f55a84e`). Every finding was confirmed; none was rebutted.

## Remediation matrix

| ID | Sev. | Reproduction (baseline 886d4b2) | Root cause | Fix | Changed files | Regression tests | Result | Commit |
|---|---|---|---|---|---|---|---|---|
| AUD-201 | High | Source: `evaluatePooled` / `evaluateCrossSectional` had no walk-forward | WF added only to `evaluateFamily` | One shared, fail-closed walk-forward core used by all three evaluators; pooled/XS on the common calendar (ms coordinates, step = interval), parameters re-selected from earlier data only, embargo = dependency horizon, folds end ≤ `valEnd` | `src/bot/walkForward.ts` (new), `validation.ts`, `crossSectional.ts` | `auditRemediation.test.ts` › AUD-201 (4) | pass | `a5787ca` |
| AUD-202 | High | `walkForward` with embargo 300 on 400 bars → 0 folds, `rejected=false` | Gates guarded by `wf.folds.length &&` | Full pre-declared fold count required; skipped-fold reasons recorded; finite-result, chronology, boundary, embargo and fold-count validation; missing WF = rejection | `walkForward.ts`, `validation.ts` | AUD-202 (0,1,2,3,4 folds; non-finite; 7 invalid configs; missing; leakage) — 15 | pass | `a5787ca` |
| AUD-203 | High | Delay 2: drawdown 50.8% recorded while still in cash | Holdings mutated at decision time with a future execution price | Event-driven simulator: execute scheduled orders at the open → mark at the close → decide and schedule; nothing changes before execution. Identical to baseline at delay 0 (oracle test) | `crossSectional.ts`, `fixtures/baselineXs886d4b2.ts` | AUD-203 (delays 1,2,5; delay 0; unavailable prices; final liquidation; baseline oracle) — 7 | pass | `a5787ca` |
| AUD-204 | High | Source: `priorHoldoutLooks` keyed by symbol+interval; pooled/XS/timeframes separate | Per-category keys | Unified observation provenance by canonical asset + calendar windows (+ dataset ids, SHA-256, gate version, run); direct / unknown exposure blocks qualification, training overlap = indirect (disclosed). Non-destructive migration of all 10 run records → 200 records (registry 199 + 1 superseded XS evaluation), all windows reconstructed | `src/bot/provenance.ts` (new), `research.ts`, `scripts/migrate-provenance.ts`, `research/provenance.json` | `provenance.test.ts` (cross-timeframe, pooled→single, XS→pooled, wrapped tokens, refreshed hash, unopened test, unknown windows, real-history coverage) — 23 | pass | `4c791c2` |
| AUD-205 | High | N=199: tail 1.26e-4 × 4000 resamples = 0.5 expected draws; quantile index 0 = sample minimum | Fixed 4000 iterations; trade-level iid / entry-month grouping | Inference on synchronized calendar-month portfolio returns: dependence-adjusted Student-t bound (n_eff for lag-1 ρ) AND circular block bootstrap with L = 1,2,3 months, resamples sized for ≥ 100 tail draws (≈ 796k at N=199) with a conservative 99% order-statistic bound; ≥ 12 OOS months; > 2M resamples needed ⇒ inconclusive ⇒ reject. Existing trade bootstraps kept and resized | `stats.ts`, `validation.ts`, `crossSectional.ts` | AUD-205 (t tables, resolution, monthly compounding, < 12 months, noise vs edge, autocorrelation) — 7 | pass | `a5787ca` |
| AUD-206 | Medium | Source: 3 indices tested | Sparse tests | Every rebalance boundary × every parameter set × extreme mutations (×1e-6, ×1e6) × flat/invested; prefix vs full; decisions occur (> 2 changes, only on rebalance days); leap day; Wednesday / 28-day anchors; missing, duplicate, invalid and NaN timestamps. "Monthly" relabelled "4-week" (fixed 28-day cycle) | `multiDayCausality.test.ts`, `strategies.ts`, `insights.ts` | 17 | pass | `4c791c2` |
| AUD-207 | Medium | Forced exit with $50 fixed cost: reported DD 5.0%, equity fell to 91.85% of start | Drawdown computed before final liquidation | Liquidated cash enters peak/drawdown; equity curve ends at cash; exit proceeds floored at 0 (position written off rather than negative equity) | `backtest.ts` | AUD-207 (fixed cost, 3 proportional costs, severe loss, minimum order) — 6 | pass | `a5787ca` |
| AUD-208 | Medium | Impossible $1M minimum and $1,000 fixed cost: identical return, 3 trades | XS used proportional cost only | Capital-aware: fixed cost per fill, venue minimum, 2× fixed-cost floor, rejected entries/exits counted, sub-minimum drift trims skipped (counted separately); capital tiers $20–$1,000 reported; infeasible if any rejection | `crossSectional.ts` | AUD-208 (impossible minimum, fixed cost × capital, tier infeasibility) — 3 | pass | `a5787ca`, `bb8f65a` |

## Additional investigations (section 4)
| Item | Finding | Action | Commit |
|---|---|---|---|
| 4.1 Embargo | `warmup()` = max single parameter; misses nested windows (vol-filtered trend 251 vs 271 bars; compression breakout 121 vs 141), Wilder RSI memory and stateful holds | `dependencyHorizon()` per family (nested sums, 4n for Wilder, + maxHold / rebalance period); used as warm-up and embargo. Forward-only WF cannot leak fold data into training; the embargo separates the selection data from the fold — not a label purge (no multi-bar labels; training backtests force-close at their end) | `a5787ca` |
| 4.2 Multiple testing | See `RESEARCH_INTEGRITY_V3.md` | Cumulative Bonferroni over OOS candidates kept (not per training config) | — |
| 4.3 Gate versioning | Nothing stopped an older-gate "qualified" from being shown | Registry/provenance stamped with gate version; the feed refuses a qualified label from another gate version or without 4/4 complete positive walk-forward. 0 historical qualifications existed, nothing to demote | `4c791c2`, `e0201e4` |
| 4.4 Dataset integrity | FNV-1a only | SHA-256 over the canonical serialisation recorded with datasets and provenance; FNV id kept as registry key | `4c791c2` |
| 4.5 Mixed timeframes | Cycle assumed `datasets[0].intervalMs` | Mixed intervals, duplicate venue+symbol, duplicate canonical asset ⇒ error | `4c791c2` |
| 4.6 Feed trust | Feed is display-only (risk, live trading, wallet send are compile-time constants); a forged well-formed feed could still *show* a qualification | Evidence check above; `mode` must be `paper` (already) | `e0201e4` |

## Test totals (command `npx vitest run`, SHA `a9ddc7f`, Node 22, Linux container)
271 passed · 0 failed · 0 skipped (29 files). Baseline was 180; +91 tests, no assertion removed, no test skipped.
Power-check fixtures were moved to daily bars / a cleaner synthetic edge because gates-v3 needs ≥ 12 OOS months;
no gate threshold was changed by a test.

## Remaining limitations
- Quantity precision (lot step) not modelled: no verified per-venue increments in stored data.
- Indirect (training-overlap) exposure is disclosed, not blocking.
- All findings verified by the same agent that fixed them.
