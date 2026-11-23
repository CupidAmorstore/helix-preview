# Research cycle — 2026-11-23 (Phase 3)

Run: `npm run bot:research -- --offline` → `research/runs/run-2026-11-23T11-07-19-870Z-1d.json`
Datasets: identical to the previous cycle (same content hashes; the registry skipped every family that had already been tested on them).
Gates: `gates-v1`, unchanged. Costs: Coinbase taker 60 bps + 2 bps half-spread + 3 bps slippage per side.

## What changed in the method
- **Cumulative multiple-testing control.** The Bonferroni denominator is now *every candidate ever registered + this run* (177 here), not only this run's count. Adding families one run at a time can no longer loosen the correction.
- **Evidence union.** A run that tests only new families keeps earlier families' results visible (merged per identical dataset, newest wins per candidate key).
- **3 new hypotheses** (pre-declared, coarse grids):

| Family | Hypothesis | Grid |
|---|---|---|
| `vol_filtered_trend` (risk-managed trend) | Trends are more reliable in calm regimes; hold above SMA(trend) only while 20-day realized vol ≤ its trailing 250-day median | trend 50/100 |
| `regime_switch` (hybrid) | Efficiency ratio ≥ threshold → trend mode; otherwise buy −2σ dips and exit at mean or 20 bars | erTrend 0.3/0.4 |
| `xs_momentum` (cross-sectional) | Coins that outperformed peers keep outperforming; weekly hold top-K by lookback return, cash if none positive | lookback 7/14/28 × topK 1/2/3 |

## Results (daily, 10 coins) — 23 candidates, **0 qualified**

| Scope | vol_filtered_trend | regime_switch |
|---|---|---|
| BTC | train +14.5%, val +3.8%, **test −22.0%** (11 trades) | train +13.9%, val +63.8%, **test −10.9%** (14 trades) |
| ETH | val +10.8% but only 9 trades | val −10.3% |
| SOL | train −70.7% | train +1,321.8% → **val −40.1%** (classic overfit) |
| XRP | val −25.9% | val +30.4%, 11 trades (too few) |
| DOGE | val +63.5%, 12 trades (too few) | train −41.7% |
| ADA, AVAX, LINK, LTC, DOT | unprofitable in training | unprofitable in training (ADA val +108.7% but train −16.9%) |
| Universe (pooled) | train +0.7% → val −32.1% (71 trades) | train +139.6% → val −10.1% (85 trades) |

**Cross-sectional momentum** (best on train: lookback 14, top-2): train +381.3% (68 entries) → **validation −55.7%** vs equal-weight buy & hold −15.3%. No parameter neighbour was profitable on validation (0/4). Rejected.

### Reading
- The two candidates that reached the unseen test window (BTC) both lost money there.
- Large training returns collapsing on validation (SOL regime switch, cross-sectional momentum) is the signature of fitting the 2021 bull market, which sits in the training window.
- Daily rules still produce too few trades for the 15-trade gate on most coins; loosening the gate would manufacture approvals, so it was not changed.

## Not evaluated this cycle (and why)
- **Hourly** for the new families: offline hourly data ended 2026-11-22 19:00 UTC and failed the staleness check. Earlier hourly evidence (all families killed by the 120+ bps round-trip cost) still applies.
- **Order-book imbalance, funding/basis, on-chain, event-driven, relative value / stat-arb**: no free, reproducible historical data source for these in the current $0 setup (Coinbase/Kraken give live books and candles only; no historical depth, funding history or on-chain flows). Listed as data blockers, not as tested-and-failed.

## Bottom line
Bot status stays **Holding cash — 0 of 177 candidates qualified.** Real-money trading remains disabled.
