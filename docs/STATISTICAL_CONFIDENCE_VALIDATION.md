# Statistical confidence validation (AUD-205)

## Problem reproduced
At the cumulative Bonferroni N = 199 and family alpha 0.05, the two-sided lower tail is 0.05/199/2 = 1.26e-4.
With 4,000 resamples, 0.5 draws are expected below that quantile and the code used index 0 — the sample minimum.
Its Monte-Carlo error is uncontrolled. Trade-level resampling also treated correlated trades as independent, and
the pooled month-block bootstrap attributed multi-month positions to their entry month only.

## Method now (`monthlyInference` in `src/bot/stats.ts`)
- **Unit:** calendar-month (UTC) returns of the strategy equity curve over validation + test. For pooled rules the
  curve is the equal-weight portfolio (sum of per-market equity), so months are synchronized across markets and
  a position spanning a month boundary contributes to each month held.
- **t bound:** mean − t(1−α/2, n_eff−1)·sd/√n_eff, with n_eff = n(1−ρ)/(1+ρ) for positive lag-1 autocorrelation ρ.
- **Block bootstrap:** circular moving blocks of 1, 2 and 3 months (block-length sensitivity; all must pass).
  Resamples = max(4000, ⌈100/(α/2)⌉) ≈ 796,000 at N = 199, so ≈ 100 draws fall in the tail. The bound is the
  order statistic 2.576·√k below the nominal index k (conservative 99% binomial bracket). If > 2,000,000 resamples
  would be needed the result is inconclusive and the candidate is rejected.
- **Minimum evidence:** ≥ 12 OOS months, else reject — with ~1 year of hourly data, hourly rules cannot qualify.
- Kept as additional gates: trade-level bootstrap and month-block bootstrap, both with resized resamples.

## Validation of the method (tests)
Student-t quantiles match tables (2.228 @ 10 df, 2.75 @ 30, 6.314 @ 1); ≥ 100 tail draws at N = 199; monthly
compounding and chaining; < 12 months always rejected; zero-mean noise rejected; a strong consistent edge passes;
positive autocorrelation shrinks n_eff.

## What it means for the research (`research/research-bottleneck-study.json`)
Median buy-and-hold monthly volatility of the 10 coins: 30.7%. For 80% power at α = 2.5e-4 (two-sided):
| True edge / month | strategy vol = ¼ market | ½ market | = market |
|---|---|---|---|
| 1% | 1,192 months | 4,768 | 19,071 |
| 2% | 298 | 1,192 | 4,768 |
| 5% | 48 | 191 | 763 |
About 32 OOS months are available per coin. Only very large, low-volatility edges are detectable; with the
existing evidence base, reliable inference is mostly impossible and the correct outcome is rejection / cash.
