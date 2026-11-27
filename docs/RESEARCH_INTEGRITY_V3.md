# Research integrity — gates-v3 (2026-11-25)

`GATES.version = 'gates-v3'` (`src/bot/validation.ts`). v3 = v2 + the changes below. **Nothing was relaxed.**
Research integrity gate: **PASSED (re-verified after remediation)** — all eight confirmed findings fixed with
regression tests; 0 candidates qualified.

## Qualification policy (identical for single-market, pooled and cross-sectional candidates)
A candidate is `qualified_paper_strategy` only if ALL hold:
1. Training-only selection; best training config profitable after costs.
2. Validation: ≥ 15 trades, net > 0 after costs.
3. **Walk-forward (mandatory, fail-closed):** 4 of 4 pre-declared folds complete on the second half of the pre-test
   region, parameters re-selected before each fold from earlier data ending one dependency horizon earlier, finite
   results, compounded net > 0, ≥ 50% folds profitable. Fewer folds (insufficient history, invalid config) = reject.
4. Test (opened only after 1–3): ≥ 15 trades, net > 0, profit factor > 1, drawdown ≤ 25% (incl. final
   liquidation), survives 2× costs and +1 bar delay; ≥ 50% of parameter neighbours positive on validation.
5. Trade-level bootstrap lower bound > 0 (resamples sized for the alpha tail).
6. **Monthly portfolio inference:** ≥ 12 OOS months; dependence-adjusted t lower bound > 0; circular block
   bootstrap (1, 2, 3-month blocks) conservative lower bound > 0. See `STATISTICAL_CONFIDENCE_VALIDATION.md`.
7. Holdout provenance: no direct or unreconstructable earlier inspection of the OOS period on any shared asset, any
   timeframe or category (`HOLDOUT_PROVENANCE_REGISTRY.md`); legacy market/timeframe guard also kept.
8. Survivorship: non-negative median on ≥ 10 delisted markets.
Alpha = 0.05 / N, N = cumulative OOS candidates (registry + this run).

## Multiple-testing governance (4.2)
- N counts out-of-sample candidates (one per family × market/universe evaluation), cumulatively across runs, so
  adding families run by run cannot loosen it. Training-grid configurations are not counted: selection happens on
  training data only and each family contributes one OOS test. This is standard and is kept.
- Not counted in N, and handled instead by design: repeated research runs on refreshed data (provenance blocks
  qualification), alternative validation procedures (gate version stamped; feed refuses older-gate qualifications),
  cost assumptions (never lowered), researcher-driven new families after seeing results (allowed only as
  pre-registered hypotheses, and blocked from qualifying on already-inspected history by provenance).
- Consequence, stated plainly: on the stored history, **no new candidate can qualify**; fresh evidence must come
  from forward paper trading (protocol in `QUANTITATIVE_RESEARCH_MASTER_REPORT.md`).

## Embargo vs purging (4.1)
Walk-forward is forward-only, so fold data cannot reach its own training. The embargo is the full dependency
horizon (`dependencyHorizon()`): nested windows add up, Wilder RSI counts 4n bars of memory, stateful holds add
maxHold, rebalance rules add one period. There are no multi-bar labels to purge; every training backtest is
force-closed at its window end. Indicator warm-up and the embargo now use the same horizon.

## Gate versioning (4.3)
Registry entries and provenance records carry `gates`. Historical results are preserved; candidates are never
re-labelled. A qualification shown in the app must come from the app's gate version with complete walk-forward
evidence (`feedValidation.ts`). No historical candidate was ever qualified, so nothing was demoted.

## Data integrity (4.4, 4.5)
SHA-256 of the canonical candle serialisation is recorded with each dataset and provenance record (FNV-1a remains
only as the registry key). One research cycle = one timeframe; duplicate venue+symbol or canonical asset ⇒ error.
