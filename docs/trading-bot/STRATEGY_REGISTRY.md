# STRATEGY_REGISTRY

Machine-readable registry: `research/registry.json` (key = family | market | interval | dataset hash).
Full metrics per candidate: `research/runs/*.json`. Gates: `gates-v1`. Cost model: Coinbase taker preset (60 bps fee +
2 bps half-spread + 3 bps slippage per side), venue minimum $1 from Coinbase `/products`.

## Runs
| Run | Scope | Candidates | Reached test | Qualified |
|---|---|---|---|---|
| run-2026-11-22T20-00-26-711Z-1h | 10 markets × 7 families, per market, 1h (8,754 bars each) | 70 | 0 | 0 |
| run-2026-11-22T20-00-26-711Z-1d | 10 markets × 7 families, per market, 1d (1,285–2,189 bars) | 70 | 0 | 0 |
| run-2026-11-22T20-04-14-695Z-1h | 7 families pooled over 10 markets, 1h | 7 | 0 | 0 |
| run-2026-11-22T20-04-14-695Z-1d | 7 families pooled over 10 markets, 1d | 7 | 2 | 0 |
| **Total** | | **154** | **2** | **0** |

## Candidates that reached the untouched test window
| Candidate | Venue / markets | Train | Validation | Test | Trades (val/test) | Cost stress 2× | Delay +1 | Test DD bound | OOS CI (99.29%) | Decision |
|---|---|---|---|---|---|---|---|---|---|---|
| POOLED bollinger_reversion(n=20,k=2,maxHold=24) 1d | Coinbase, 10 USD markets | 2023-09 → 2025-04: +15.6% | 2025-04 → 2026-03: +6.8% (B&H −18.7%) | 2026-03 → 2026-11: **−38.2%** (B&H −37.0%) | 64 / 49 | −42.0% | −38.5% | 63.4% | [−8.94%, +2.83%] per trade | **Rejected** (7 gates) |
| POOLED sma_cross(10,100) 1d | Coinbase, 10 USD markets | +36.0% | +2.6% | **−10.2%** (B&H −27.4%) | 17 / 19 | −12.3% | −12.1% | 31.4% | lower bound −11.6% | **Rejected** (7 gates) |

## All other candidates
Rejected before the test window opened (validation net ≤ 0, validation trades < 15, or training not profitable after costs).
Per-candidate reasons are listed in the app (Trading Bot → Strategies) and in the run JSON files.

## Status vocabulary (never merged)
Detected opportunity → Research hypothesis → Backtested candidate → Qualified paper strategy → Owner-approved live candidate.
`Rejected` can occur at any stage. Nothing has reached "Qualified paper strategy".
