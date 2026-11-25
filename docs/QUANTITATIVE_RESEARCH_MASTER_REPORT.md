# Quantitative research master report

All results are from HELIX Preview's research engine (`src/bot`, `scripts/*`). Trading Lab research is **not included**:
its source and evidence archives are inaccessible (owner-reported: 88 hourly candidates on 11 markets, 0 qualified,
7 diagnostic paper accounts with 0 entries; unverified).

## Results to date (preserved, nothing reset)
- **199 candidates, 0 qualified.** 4 reached the unseen test and all lost after costs: BTC volatility-filtered trend −22.0%,
  BTC regime switch −10.9%, pooled SMA cross −10.2%, pooled Bollinger −38.2%.
- Registry (`research/registry.json`) and every run record (`research/runs/`) kept. Only the cross-sectional result was
  re-evaluated after its simulator was corrected (old record kept in run history).

## Method protections (implemented and tested)
Chronological 50/25/25 splits; training-only selection; validation, 2× cost and +1-bar delay stress; parameter-neighbour
stability; month-block bootstrap with **cumulative Bonferroni** (N=199); **holdout-reuse guard** by market+timeframe;
**survivorship gate** (delisted-market evidence required); completed bars only, no forward fill; content-hashed datasets;
deterministic seeds; null study (0/560 on random walks); **walk-forward re-estimation** (gates-v2, 2026-11-24): the second
half of the pre-test region is cut into 4 folds, parameters are re-selected before each fold on data ending one indicator
look-back (embargo) earlier, and a candidate is rejected if the compounded walk-forward net is ≤ 0 or fewer than half the
folds are profitable. The final test window is never used. Cross-market correlation correction is **not** implemented;
purging for overlapping labels is not needed by the current rules (no multi-bar labels) and is not implemented.

## Costs: why research keeps failing (new: `research/cost-horizon-study.json`)
Round trip ≈ **1.30%** (0.60% taker fee + 2 bps half-spread + 3 bps slippage per side; fee is a lowest-tier assumption,
measured Coinbase spreads were 0–5 bps, i.e. the fee is ~92% of cost).

| Horizon | Median abs. move (10 markets) | Move ÷ round-trip cost |
|---|---|---|
| 1 h | 0.30% | 0.23× |
| 4 h | 0.62% | 0.48× |
| 12 h | 1.28% | 0.98× |
| 1 d | 1.91% | 1.47× |
| 1 w | 6.58% | 5.1× |
| 1 m | 15.3% | 11.8× |

Hour-scale holding cannot pay taker costs even with perfect direction on a typical move. Economically viable research is
multi-day to monthly holding (few trades, so statistical power is low and holding cash is often correct), or lower cost via
maker (limit) execution, which would first need a limit-order model and fee evidence for the account's actual tier. Costs
were **not** reduced.

## Multi-day horizons (2026-11-24, pre-registered in `0b6b578` before running)
Two daily-only families that decide only on calendar rebalance days, chosen because of the cost-horizon table:
`weekly_trend` (hold if close > SMA 100/200, checked weekly) and `monthly_momentum` (hold if 90/180-day return > 0,
checked every 28 days). Run `run-2026-11-24T19-36-41-194Z-1d` on the stored daily data: **22 candidates, 0 qualified**.
- Every per-market candidate had 1–8 validation trades, below the 15-trade minimum, so none can be trusted, whatever
  its return (e.g. BTC weekly_trend +157.7% walk-forward over 4 folds came from 6 trades mostly in a rising market).
- Pooled across 10 markets: weekly_trend lost money on validation after costs; monthly_momentum had 10 validation trades.
- 14 of 22 lost money on validation after costs; 9 failed walk-forward.
Conclusion: lower turnover makes these rules affordable but leaves too little history to validate them. The trade
minimum was **not** lowered. Fresh evidence now needs forward paper results over months, not more backtests on the
same history (which the holdout guard would discount anyway).

## Survivorship (measured: `research/survivorship-study.json`)
Universe snapshot 2026-11-23: 497 Coinbase USD products (399 online, 98 delisted). Full-life backtests: buy-and-hold mean
+48.7% for 10 survivors vs −69.4% for 30 delisted; trend/momentum rules lose their apparent edge on delisted coins (gap +60
to +217 points); mean-reversion goes the other way.

## Capital tiers ($20–$1,000)
Account feasibility in every run record (`feasibility`): minimum order $1 on Coinbase; fixed costs absent on CEX; on-chain
gas makes $20–$100 accounts uneconomic on Ethereum L1.

## Governance
Hypothesis → data checks → train → validate → robustness → unseen test → forward paper → independent acceptance. No
stage is skippable in code; nothing can enable real money; holding cash is the current, correct state.

## 2026-11-25 — independent audit remediation and bottleneck analysis
Gates are now **gates-v3** (`RESEARCH_INTEGRITY_V3.md`): mandatory fail-closed walk-forward for every evaluator,
full dependency-horizon embargo, event-driven capital-aware cross-sectional simulation, drawdown including final
liquidation, monthly portfolio-return inference with an explicit tail-resolution policy, cross-category
provenance. Registry: **199 candidates, 0 qualified** (no new candidates evaluated this cycle; provenance holds 200
evaluation records incl. one superseded XS run). No test window was opened in this cycle.

### Why nothing qualifies — measured bottlenecks (`research/research-bottleneck-study.json`)
1. **Costs vs horizon:** 1.30% round trip; hourly moves are 0.23× cost (`cost-horizon-study.json`).
2. **Trade counts:** with 6 years of daily data, 10 of 11 families cannot produce 15 validation trades
   (expected: weekly_trend 3.7, 28-day momentum 1.9, sma_cross 3.4; only ts_momentum ≈ 19). The trade minimum
   was not lowered; low-frequency rules need a different evidence framework or much longer histories.
3. **Statistical power:** at N = 199, a 2%/month edge at a quarter of market volatility needs ≈ 298 OOS months
   for 80% power; ≈ 32 exist. A 5%/month edge needs 48.
4. **Correlation:** mean pairwise daily correlation 0.70; first factor explains 73%; ≈ 1.8 effectively independent
   assets — pooling 10 coins is not 10× the evidence.
5. **Regimes:** every market fell in 2022, 2025 and 2026 YTD; most rose in 2021/2023/2024 — results are dominated
   by a handful of market-wide regimes.
6. **Capital tiers:** Coinbase/Kraken/Solana feasible from $20; Ethereum L1 gas makes small accounts infeasible
   (`CAPITAL_TIER_FEASIBILITY.md`).
7. **Universe/delisting:** delisted coins −69% vs survivors +49% buy-and-hold (`survivorship-study.json`).

### Direction (no new hypotheses tested this cycle)
More candidates on the same history cannot help: provenance blocks qualification on inspected periods, and N
grows. The only route to fresh evidence is **forward paper trading**:
- Protocol: pre-register a small set (≤ 3) of rules with fixed parameters and the gates-v3 thresholds before the
  start date; run them on live public data in the paper ledger from that date only; evaluate monthly portfolio
  returns once ≥ 12 forward months exist; any rule change restarts its clock; results append to provenance.
- Any proposal for a low-frequency evidence framework (e.g. fewer trades but longer histories / more assets)
  must be written prospectively, justified, independently accepted, and validated only on data observed after
  acceptance — never on the windows that motivated it.
Holding cash remains the correct outcome.

### Forward protocol implemented (2026-11-25, `src/bot/forward.ts`, `scripts/forward-paper.ts`)
Registration `research/forward/registration.json` (id `forward-2026-11-25-a`, hash `00bb27b2…c998`) is a
**PROPOSAL** — status `proposed`, no start date, nothing traded. Rules: F1 pooled ts_momentum(168d), F2 pooled
weekly_trend(200d, weekly), F3 cross-sectional momentum(28d, top 3, weekly); 10 coins, $1,000, Coinbase taker
costs; evaluation: ≥ 12 forward months, monthly inference at 0.05/3. Disclosure: chosen by an agent that has seen
all historical results, so history is not evidence for them. To start: owner sets `status: "active"` and a future
`startAt` (epoch ms); the hash covers rules, capital, costs and evaluation — any change requires a new registration.
Tests: `forward.test.ts` (6).
