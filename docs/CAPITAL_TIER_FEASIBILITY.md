# Capital-tier feasibility (AUD-208, section 6 study 2)

Tiers: $20, $50, $100, $250, $500, $1,000 (`CAPITAL_TIERS`). Evidence: `research/research-bottleneck-study.json`
(stored daily data, cost presets from `src/bot/costs.ts`; live venue minimums replace presets when fetched).
These are **feasibility** numbers on the full stored history (in-sample, mostly a rising BTC market) — not
evidence of profitability.

## Single market (BTC daily, after warm-up)
| Venue preset | Rule | $20 | $100 | $1,000 | Cost as % of capital |
|---|---|---|---|---|---|
| Coinbase taker (0.60%) | sma_cross | feasible | feasible | feasible | 29.7% at every tier |
| Coinbase taker | weekly_trend | feasible | feasible | feasible | 44.5% |
| Kraken taker | sma_cross | feasible | feasible | feasible | 21.2% |
| Solana DEX | weekly_trend | feasible | feasible | feasible | 38–40% |
| **Ethereum L1 DEX** | sma_cross | **878 rejected orders, −87%** | −28% | +59% | 92% → 33% |
| **Ethereum L1 DEX** | weekly_trend | **126 rejected, −83%** | +31% (120% cost) | +166% | 92% → 47% |

## Cross-sectional (10 coins, lookback 28, top 3, weekly)
| Venue | $20 | $100 | $1,000 | Notes |
|---|---|---|---|---|
| Coinbase | feasible (147 trims skipped) | feasible | feasible (12 skipped) | min order $1 |
| Kraken | feasible | feasible | feasible | min order $5: more skipped trims |
| Solana DEX | feasible | feasible | feasible | |
| **Ethereum L1** | **infeasible (307 rejected)** | **infeasible** | feasible only at $1,000 (−33%) | gas |

## Rules applied
- A tier with any rejected entry/exit is **infeasible** and is never presented as tradable for that size.
- Sub-minimum drift trims are skipped and reported, not hidden.
- Costs that are material for small accounts are never normalized away; research results at the $1,000
  normalisation are always shown next to the tier table (Research Lab › Risk).
- Not modelled: lot-size precision, order-book depth for multi-coin rebalances, network congestion pricing.
