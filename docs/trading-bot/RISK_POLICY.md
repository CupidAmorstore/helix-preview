# RISK_POLICY — enforced controls

## Paper-only lock
- `src/bot/risk.ts`: `LIVE_TRADING_ENABLED = false`, `EXECUTION_MODE = 'paper'`, `assertPaperOnly()` called by paper engine and research script.
- **No exchange order adapter exists.** Test `risk-paper.test.ts` fails if bot source contains private/order endpoints
  (`/orders`, `CB-ACCESS`, `API-Sign`, `/0/private`, `X-GEMINI-APIKEY`, `signTransaction`, `sendTransaction`).
- Enabling real money requires: owner written approval → a strategy with qualified forward paper evidence → a new, reviewed
  order adapter → code change of the lock. None of these is a UI toggle.

## Default limits (`DEFAULT_RISK`)
| Control | Value | Enforcement |
|---|---|---|
| Max position | 25% of equity | `checkEntry` |
| Max open positions | 3 | `checkEntry` |
| Same base asset across venues/chains | 1 position | `checkEntry` (de-dup) |
| Daily loss | 3% → entries blocked | `checkEntry` |
| Weekly loss | 6% → entries blocked | `checkEntry` |
| Drawdown kill switch | 15% from peak → exit and stop | `updateRiskState` + `stepPaper` |
| Stale data | > 2 bars → entries blocked | `validateCandles` + `checkEntry` |
| Leverage / shorting / averaging down / martingale | none | type-level constants; long-only engine |
| Orders below venue minimum | rejected, not resized | backtest + `checkEntry` |
| Exits | always allowed | risk-reducing |

## Small-account feasibility (one 25% position, assumed costs)
| Capital | Coinbase taker | Kraken taker | Solana DEX | Ethereum L1 DEX |
|---|---|---|---|---|
| $20 | tradable, 1.30% RT | tradable, 0.90% RT ($5 slice = $5 min) | tradable, 1.50% | **not tradable** (121%) |
| $50 | tradable | tradable | tradable, 1.26% | **not tradable** (49%) |
| $100 | tradable | tradable | tradable | **not tradable** (25%) |
| $250 | tradable | tradable | tradable | **not tradable** (10.7%) |
| $500 | tradable | tradable | tradable | **not tradable** (5.9%) |
| $1,000 | tradable | tradable | tradable, 1.11% | tradable, 3.50% |

Verified 2026-11-22: Coinbase `min_market_funds` = $1 (BTC-USD); Kraken XBTUSD `ordermin` 0.00006 BTC (≈ $3.60), `costmin` $0.50.
Fee tiers are assumptions (Coinbase 0.60%, Kraken 0.40% taker) — verify against the owner's account before any live decision.
"Tradable" means mechanically possible, **not** profitable: no strategy has passed the gates at any size.

## Gate changes
`GATES` (`src/bot/validation.ts`, version `gates-v1`) may only change through a documented decision in this file,
recorded **before** the next run, never in response to a specific candidate's results.
