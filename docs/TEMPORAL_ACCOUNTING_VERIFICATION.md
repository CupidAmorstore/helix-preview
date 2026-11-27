# Temporal accounting verification (AUD-203, AUD-207, AUD-208)

## Single-market backtester (`src/bot/backtest.ts`)
Per bar i: (1) execute orders scheduled for i at the open; (2) mark equity at the close; (3) evaluate the signal at
the close and schedule for i+1+delay. Fills: buy at open×(1+side cost) less fixed cost; sell at open×(1−side) less
fixed cost, floored at 0. Orders below the venue minimum or not covering 2× fixed cost are rejected.
**Change (AUD-207):** after the forced liquidation at the window's last close, the liquidated cash enters peak and
drawdown, and the recorded equity curve ends at that cash. Baseline evidence: DD 5.0% reported while final equity
was 91.85% of start.

## Cross-sectional simulator (`src/bot/crossSectional.ts`)
Per common day d: (1) execute orders scheduled for d at the open — sells first, then buys from cash; (2) mark to
the close (equity, peak, drawdown, exposure); (3) on a rebalance day decide from closes ≤ d and schedule for the
open of d+1+delay. Orders still pending at the window end are dropped (never executed). Final liquidation at the
last open (costs applied) is the final equity and enters drawdown.
Costs per fill: proportional side cost and fixed cost. A full entry/exit below the venue minimum or ≤ 2× fixed cost
is **rejected** (tier infeasible). A sub-minimum *trim* of a position that stays held is **skipped** (weights drift).
Quantity precision is not modelled (no verified per-venue increments).

## Evidence
| Check | Test | Result |
|---|---|---|
| Cash-only equity unchanged before execution, delays 1, 2, 5 | `auditRemediation.test.ts` › AUD-203 | pass |
| Crash between decision and execution leaves DD = 0 | same | pass (baseline: 50.8%) |
| Delay 0: crash after the fill is a real drawdown (> 45%) | same | pass |
| Changing opens before execution does not change the result | same | pass |
| Final liquidation = final equity, inside drawdown | same (XS) + AUD-207 (single) | pass |
| Delay 0, no fixed cost/minimum: identical to the pre-audit simulator (3 seeds × 2 configs during development; 2 seeds in CI) | baseline oracle `fixtures/baselineXs886d4b2.ts` | equal to 1e-9 |
| Impossible minimum → 0 trades, rejections counted (baseline: traded) | AUD-208 | pass |
| Fixed cost hurts small accounts more | AUD-208 | pass |
| Capital tier with rejections reported infeasible | AUD-208 | pass |
| Severe loss with fixed exit cost: equity ≥ 0 | AUD-207 | pass |
