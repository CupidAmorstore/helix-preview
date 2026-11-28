# HELIX experimental candidate queue

Inspected branch ccr-1cd67cd2-1dk1jh at 50be5e4bed9e606ff5805be05ac037db12eb3252. Existing registrations a and b cover the same three hypotheses; b uses a higher provisional fee assumption. Preserve both. This is a non-active registration template, not an execution adapter. Do not place it in an auto-discovered registration directory.

| Candidate | Historic validation net | Historic validation DD | Trades | Frozen candidate parameters |
|---|---:|---:|---:|---|
| XRP daily Bollinger reversion | 66.44% | 12.01% | 7 | n=20, k=2, maxHold=24 |
| ETH daily RSI reversion | 24.11% | 11.22% | 2 | n=14, lo=25, hi=55, maxHold=24 |

Both are selected retrospectively, no recorded walk-forward in the source run; holdout not opened. Both use mean reversion and are not independent bets. Original costs differ from the proposed cost assumption. No recalculated return at higher fees or fresh market result is claimed.

Activation checklist: verify actual venue/account costs, run diagnostic replay and cost/delay stress without opening a holdout as fresh evidence, implement and hash a position-size policy (current pooled evaluator uses full sleeves), enforce stale/missing data and paper-only execution, prospectively approve capacity and multiplicity across active studies, replace placeholder registeredAt with actual time and set future start. Keep old registrations and evidence intact. Do not qualify on early positive P&L. Minimum 12 complete months is a floor, not a guarantee of statistical power.

`node build.mjs` regenerates the proposal and verifies hash compatibility against the known registration-b hash plus mutation and non-active checks. No repository-wide test suite or live forward runner was executed. Direct raw GitHub DNS failed in the container; prior GitHub write permission returned 403. No remote files, paper registrations, or real money changed.
