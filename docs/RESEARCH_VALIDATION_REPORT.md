# Research validation report — remediation cycle (2026-11-23)

**Bottom line:** 0 of 177 strategy candidates qualify. No profitability claim is made. The pipeline is conservative
(0 false positives on 560 no-edge datasets) and therefore also has **low statistical power** on daily data.

## A. Portfolio simulation (src/bot/crossSectional.ts): R-2, HIGH: FIXED
- **Before:** returns were an average of picked coins per period with a membership-turnover cost approximation; no cash or
  quantity accounting, no weight drift, no daily drawdown, no final liquidation.
- **Now (`simulateXs`, line 45):** cash + quantities; equal-weight targets (fewer picks → rest in cash); weights drift between
  rebalances; sells first then buys, per-side cost on every trade; mark-to-market at every close; liquidation (with cost) at
  the window's last open; execution strictly after decision (asserted, line 70).
- **Bug found by the new hand-calculated test:** period returns were measured from the *post*-trade value, so rebalance costs
  dropped out of the out-of-sample series used by the bootstrap (the total was right; the statistics were optimistic). Now
  measured from the pre-trade value (line 96); compounding the periods reproduces the total exactly (test).
- Tests: hand-calculated 2-coin/6-day portfolio (net, gross, period returns, entries, drawdown), incomplete allocation stays
  in cash at zero cost, future-mutation look-ahead test, random-walk universe rejected, power check (one coin with real drift
  qualifies at low cost).

## B. Look-ahead audit
| Component | Check | Result |
|---|---|---|
| single-coin strategies (9 families) | mutate all bars after i, signal at i unchanged (existing `lookahead.test.ts` over every PARAM_GRID config) | pass |
| backtest engine | signal at close i, fill at open i+1(+delay); position never changes before its signal | pass (existing tests) |
| cross-sectional | ranks use closes ≤ d; trades at open d+1; runtime assertion; mutation test | pass |
| splits | chronological 50/25/25 by calendar cut-offs, common across markets | pass |
| incomplete candles | `validateCandles` keeps completed bars only; trailing contiguous run, no forward fill | pass (existing tests) |
| market selection | fixed list of 10 large coins **chosen today** | **survivorship bias: documented, not fixable with free data** |

## C. Multiple testing and holdout reuse
- Bonferroni denominator = every candidate ever registered + this run (research.ts:115), currently 177. Only the best
  training configuration of each family/market goes out of sample; parameter search on training is covered by the
  validation + neighbour-stability gates, not by Bonferroni.
- **R-3 (HIGH), FIXED: holdout reuse.** New families tested on the same data look at a holdout that was already inspected.
  `guardReusedHoldout` (research.ts:71): if any earlier test exists on the **same market and timeframe**, a candidate cannot
  qualify from that window and needs forward paper results. Self-audit correction: the first version keyed this by dataset
  hash, which a daily refetch (one new bar, new hash) would have bypassed; now keyed by market + timeframe (`priorHoldoutLooks`,
  line 61). Regression test included.
- Bootstrap assumptions (month-block, single markets) and correlation between markets in pooled tests are **not** corrected
  beyond Bonferroni; stated in run assumptions.

## D. Null-data false-positive study (`scripts/null-study.ts` → `research/null-study.json`)
Random walks, daily, 2,000 bars, cost ≈ 0.5 bps/side (hardest case), **no** multiple-testing correction:

| Family | Tests | Reached unseen test | Qualified |
|---|---|---|---|
| 9 single-coin families | 540 | 22 | 0 |
| cross-sectional momentum | 20 | 12 | 0 |
| **Total** | **560** | **34** | **0 (0.0%)** |

Interpretation: the gates do not manufacture approvals on noise; many families rarely trade enough on daily data to reach
the test at all, i.e. low power. Regression test: `researchIntegrity.test.ts`.

## E. Re-run (frozen inputs, offline)
`npm run bot:research -- --offline` with the corrected simulator, registry entry for the old cross-sectional result removed
(that result came from the incorrect simulator; all other results kept):

| Candidate | Before | After | Reason |
|---|---|---|---|
| XS_MOMENTUM(lookback=14, top-2, weekly) train | +381.3% | +375.8% | real costs + weight drift |
| validation | −55.75% | −55.77% | — |
| status | rejected | rejected | validation net return ≤ 0 |

Reproducibility (previous cycle): 100/100 daily candidates identical when re-run from a fresh registry on stored datasets.
Hourly datasets are stale for offline re-runs (by design of the freshness gate).

## F. Not tested (no free reproducible historical data)
Order-book imbalance, funding/basis, on-chain, event-driven, stat-arb: blocked, not failed.
