# P0 capital feasibility report ($20 – $1,000)

Sources: `src/bot/feeEvidence.ts`, `src/bot/admission.ts`, `src/bot/capitalTiers.ts`,
`npx vite-node --config scripts/vite.node.config.ts scripts/p0/capital-feasibility.ts` → `research/p0/capital-feasibility.json`.

## Fee evidence (verified 2026-11-26; fails closed when missing, stale > 90 days, assumed-only or superseded)
| Venue | Tier | Maker / taker | Kind | Source |
|---|---|---|---|---|
| Kraken Pro (CA/US/NZ) | Tier 1, $0+ 30-day spot | **0.40% / 0.80%** | official | blog.kraken.com "new Kraken Pro fee tiers" (2026-07-09); kraken.com/ca/pro/fees |
| Kraken Pro | Tier 2, $2.5K+ | 0.30% / 0.60% | official | same |
| Coinbase Advanced (US) | Intro, < $10K | **0.50% / 0.90%** | secondary | cryptodaily.co.uk (2026-09); altrady.com (checked 2026-10-21). help.coinbase.com returned HTTP 403 |
| Coinbase Advanced (EU/UK) | Intro | 0.25% / 0.50% | secondary | cryptodaily.co.uk |
| Coinbase (Canada) | — | **no evidence** | — | admission fails closed; research bound uses the US schedule |
| Solana / Base / Arbitrum / Ethereum AMMs | 0.30% pool | assumed; gas [typ, stress] $0.005–0.05 / $0.01–0.25 / $0.02–0.40 / $1–15 | assumed | protocol docs; no on-chain measurement → production admission rejects |
| Legacy presets (kept for replay) | — | Coinbase 0.60% taker, Kraken 0.40% taker | superseded | `src/bot/costs.ts` |

Measured spread + book-walk slippage (p75, 2 snapshots, `research/costs/*.jsonl`): Coinbase 2.1–3.1 bps, Kraken
2.6–3.1 bps per side for $20–$1,000 orders. **Fees are > 90% of trading cost.**

## Typical move vs round trip (median absolute move, 10 Coinbase markets)
| Horizon | Move | ÷ legacy 1.30% | ÷ Kraken 1.70% | ÷ Coinbase US 1.90% |
|---|---|---|---|---|
| 1 h | 0.30% | 0.23 | 0.17 | 0.16 |
| 4 h | 0.61% | 0.47 | 0.36 | 0.32 |
| 12 h | 1.18% | 0.90 | 0.69 | 0.62 |
| 1 d | 2.27% | 1.75 | 1.34 | 1.20 |
| 1 w | 6.52% | 5.01 | 3.83 | 3.43 |
| 1 m | 14.95% | 11.50 | 8.79 | 7.87 |

Admission policy (pre-declared, not tuned): break-even ≤ 50% of the typical move; 2× stressed break-even ≤ typical move;
order ≤ 10% of visible depth; book ≤ 60 min old; position ≤ 25% of equity; **economic feasibility never admits a trade
by itself — admission also requires forward-validated edge (none exists).**

## Shortest economically feasible holding horizon (taker)
| Venue / allocation | $20 | $50 | $100 | $250 | $500 | $1,000 |
|---|---|---|---|---|---|---|
| Coinbase 5% | 1w | 1w | 1w | 1w | 1w | 1w |
| Coinbase 25% | 1w | 1w | 1w | 1w | 1w | 1w |
| Kraken 5% | — ($1 < $5 min) | — ($2.50 < $5) | 1w | 1w | 1w | 1w |
| Kraken 25% | 1w | 1w | 1w | 1w | 1w | 1w |
| Solana DEX 25% (assumed) | 1w | 1w | 1w | 1w | 1w | 1d |
| Base DEX 5% (assumed) | — | — | 1m | 1w | 1w | 1w |
| Arbitrum DEX 5% (assumed) | — | — | — | 1m | 1w | 1w |
| Ethereum L1 25% (assumed) | — | — | — | — | — | 1m |

## Tier profiles (`tierProfile`)
| Capital | Max position | Max open | Notes |
|---|---|---|---|
| $20 | 25% ($5) | 1 | one position; ≥ 75% cash; diversification impossible |
| $50 | 25% | 1 | Kraken 5% slices infeasible |
| $100–$249 | 25% | 2 | correlated coins (ρ≈0.70) count as one bet |
| $250–$1,000 | 25% | 3 | still ≈1.8 independent assets |
Exposure is **never** raised to overcome fees. Drawdown kill 15%, no leverage, no averaging down (existing `RISK_POLICY`).

## 5% allocation question
The 5% sizing is not used by HELIX (25% cap); it is reported for Trading Lab (not accessible). On HELIX evidence a 5%
slice is a $1 order at $20 and $2.50 at $50 — feasible on Coinbase only because its minimum is $1, infeasible on
Kraken ($5 minimum) and any chain with non-trivial gas. It does not change costs in % terms on CEX, but it makes
dollar outcomes negligible.

## Commercial meaning (Audit 3)
Hypothetical weekly trades, 25% sizing, 1.9% round trip, 50 trades/year:
| Capital | Gross edge 1%/trade | Gross edge 2%/trade |
|---|---|---|
| $20 | −$2.25/yr | +$0.25/yr |
| $100 | −$11.25/yr | +$1.25/yr |
| $1,000 | −$112.50/yr | +$12.50/yr |
Even a strong, *demonstrated* edge would be commercially insignificant at these sizes and fee tiers. Holding cash is
the economically correct default.
