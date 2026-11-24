# Quantitative research master report

All results are from HELIX Preview's research engine (`src/bot`, `scripts/*`). Trading Lab research is **not included**:
its source and evidence archives are inaccessible (owner-reported: 88 hourly candidates on 11 markets, 0 qualified,
7 diagnostic paper accounts with 0 entries; unverified).

## Results to date (preserved, nothing reset)
- **177 candidates, 0 qualified.** 4 reached the unseen test and all lost after costs: BTC volatility-filtered trend −22.0%,
  BTC regime switch −10.9%, pooled SMA cross −10.2%, pooled Bollinger −38.2%.
- Registry (`research/registry.json`) and every run record (`research/runs/`) kept. Only the cross-sectional result was
  re-evaluated after its simulator was corrected (old record kept in run history).

## Method protections (implemented and tested)
Chronological 50/25/25 splits; training-only selection; validation, 2× cost and +1-bar delay stress; parameter-neighbour
stability; month-block bootstrap with **cumulative Bonferroni** (N=177); **holdout-reuse guard** by market+timeframe;
**survivorship gate** (delisted-market evidence required); completed bars only, no forward fill; content-hashed datasets;
deterministic seeds; null study (0/560 on random walks). Walk-forward re-estimation, purging/embargo for overlapping labels,
and cross-market correlation correction are **not** implemented (documented gaps).

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
