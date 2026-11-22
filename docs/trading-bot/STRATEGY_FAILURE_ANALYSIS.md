# STRATEGY_FAILURE_ANALYSIS

The Nov-21 artifacts were not available, so the 18 suspected causes were **reproduced on new data** with the new engine
(runs `run-2026-11-22T20-00-26-711Z-{1h,1d}` and pooled runs `run-2026-11-22T20-04-14-695Z-{1h,1d}`):
10 Coinbase USD markets, 1h (2025-11-22 → 2026-11-22) and 1d (up to 2020-11-24 → 2026-11-21).
Result reproduces Nov-21: **0 of 154 candidates qualified.**

## Ranked root causes (evidence-based)

| # | Cause | Evidence | Test | Correction |
|---|---|---|---|---|
| 1 | **Transaction costs vs edge (short timeframes)** | 1h: only 4/70 training-selected configs net-positive. `ts_momentum` 1h validation: avg **+32.0% gross → −2.0% net**, $320 costs per $1,000. Round trip at assumed taker tier = 1.30% | `validation.test.ts` "rejected when retail taker costs exceed it" | Fewer, longer trades (1d/4h); maker-order modelling (R2); never lower modelled costs without measured fills |
| 2 | **Insufficient sample per market** | 1d: 60 of 70 rejections include "validation trades < 15"; avg 1–6 validation trades per market | regression "markets without enough contiguous history are skipped" | Pooled universe tests (done); longer history; more markets |
| 3 | **Instability across time (overfitting)** | Pooled 1d: `bollinger_reversion` validation **+6.8% → test −38.2%**; `sma_cross` **+2.6% → −10.2%**; neighbour-parameter pass share 0% | gates: neighbour stability + untouched test | Keep untouched test; prefer families with stable neighbours |
| 4 | **Regime dependence / long-only in bear markets** | 1d validation and test periods had buy-and-hold −41% / −27%; 1h training period mostly negative while validation +44–54% B&H | regime classifier in Watchbot | Regime-conditional evaluation (R3); cash is valid |
| 5 | Selection bias in training | Net-return-only selection picked 1-trade configs (114× train return on synthetic data) | power-check test | Fixed: testable configs ranked first |
| 6 | Data gaps / short histories | XRP-USD 1d: gap (Coinbase delisting) → only 1,285 contiguous bars; Nov-21 had 5 markets < 160 bars (Kraken OHLC returns max 720 bars) | "gaps are not bridged" test | Coinbase paginated history; never forward-fill |
| 7 | Correlated exposures | All 10 markets in downtrend simultaneously (Watchbot regimes) — trades are not independent | month-block bootstrap | Block bootstrap (done); same-base de-dup in risk |
| 8 | Repeated testing (data snooping) | Re-running on identical data would re-test 140 hypotheses | "re-running on an identical dataset does not re-test" | Registry (done); `--watch-only` for monitoring |
| 9 | Look-ahead bias | Not found in new engine | future-mutation test, next-open fill test | — |
| 10 | Candle alignment / forming bars | Kraken returns forming last bar | `incomplete_last_bar_dropped` test | Validator drops it |
| 11 | Execution assumptions | Next-open fills, no depth check | +1 bar delay stress | Measure spread/depth (R2) |
| 12 | Survivorship bias | Universe = currently-listed large caps | — (not testable yet) | Add delisted assets when data available (R5) |
| 13 | Inactive paper accounts read as success | Nov-21: 7 accounts, 0 entries | test "account created after the last bar processes nothing ($0 P&L — not a success)" | UI states "$0 P&L is not performance" |
| 14–18 | Weak entries, exits, frequency, risk/reward, regime misclassification | Subsumed by 1–4: gross edges exist on 1h but cost-dominated; daily edges are too sparse to measure | — | Addressed via R1–R4 |

## Cost decomposition (R2, first measurement 2026-11-22)
23 public order books (Coinbase 10, Kraken 10, Gemini 3): p75 half-spread + book-walk slippage for a $1,000 market order
was **0.0–5.3 bps per side** (worst: Kraken DOTUSD 1.5 + 3.8 bps); $5,000 ≤ 8.5 bps; no order exceeded visible depth.
The 5 bps placeholder is realistic-to-conservative. **The taker fee (60 bps) is ~92% of modelled per-side cost**, so
better spread data cannot rescue the hourly strategies; only a lower fee tier or maker execution (R6) could, and maker
fills carry adverse-selection risk that must be modelled. Single Sunday snapshot — not yet a basis for changing costs.

## What was NOT done
No gate was loosened. No threshold was tuned against test results. Costs were not reduced to rescue candidates.
