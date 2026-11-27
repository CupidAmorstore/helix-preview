# P0 execution engine verification — exec-v1

`src/bot/execution.ts`. One explicit, versioned contract (`EXECUTION_CONTRACT_VERSION = 'exec-v1'`) used by
historical replay (`replay`) and forward paper trading (`runBar`/`stepBar` with persisted `EngineState`).

## Contract
| Aspect | Rule |
|---|---|
| Decision | at the close of a **completed** bar i, data ≤ i |
| Fill bar | j = i + 1 + `latencyBars` |
| Price | `next_open` (open of j) or `next_close` (close of j); result labelled `priceSource: 'candle_proxy'` — never a quote |
| Proxy validity | median abs(open[i+1]/close[i]−1) on stored 1h data: 0.0–3.5 bps (p99 1–19 bps) — 24/7 markets have continuous opens |
| Missing data | if bar j's timestamp ≠ decision t + (1+latency)·interval the order **fails** (logged); no forward fill |
| Costs | proportional (fee + half-spread + slippage) on every fill; fixed cost per fill (gas) |
| Minimum order | below venue minimum or ≤ 2× fixed cost → **rejected**, never resized up |
| Precision | units floored to `lotStepUnits`; remainder stays in cash |
| Liquidity | `maxParticipation` × bar USD volume caps a fill; entry remainder cancelled; exit remainder retried next bar |
| Window end | `liquidate` (forced exit, flagged) or `mark` (open, reported as unrealized) |
| Idempotence | duplicate / out-of-order bars ignored → crash-safe replays cannot double-fill |

## Verification (all in `src/__tests__/bot/p0Execution.test.ts`, 13 tests, passing)
| Test | Result |
|---|---|
| Legacy equivalence on **real** data (BTC 1d, ETH 1h, SOL 1d × every family, real costs) | trades equal; net return, drawdown equal to 1e-10; costs to 1e-6 |
| Historical batch == forward incremental (chunks of 77 bars, state JSON-serialised between chunks) | identical ledgers, P&L, realized/unrealized |
| Duplicate/out-of-order bars | ignored; fill count unchanged |
| Gap at fill bar | order fails (legacy would have filled across the gap) |
| next_close vs next_open | fills exactly one bar later |
| mark vs liquidate | differ only by the exit cost: (1+net_mark)(1−side) = 1+net_liquidate |
| Venue minimum | rejected, no trade, no P&L |
| Lot precision | 3 units at $33.30 with $100; zero-cost round trip conserves value exactly |
| Partial fills | $5 cap at 10% of $50 volume; exit completes over later bars; value conserved |
| Future-data mutation | tripling all prices after t changes no ledger event at or before t |
| Accounting identity | capital + realized + unrealized = final equity |

## Execution-assumption diagnostic (Trading Lab method, HELIX data)
`npx vite-node --config scripts/vite.node.config.ts scripts/p0/execution-diagnostic.ts` → `research/p0/execution-diagnostic.json`.
180 training-selected candidates, validation windows (already inspected; diagnostic only), separate hypothetical
$1,000 accounts per candidate — **not** a portfolio.

| Fill | Costs | Terminal | Profitable | Total P&L |
|---|---|---|---|---|
| next_open | real | liquidate | 70/180 | −$5,775.37 |
| next_open | real | mark | 71/180 | −$5,265.89 |
| next_open | zero | liquidate / mark | 113/180 | +$18,484.20 |
| next_close | real | liquidate | 70/180 | −$8,845.25 |
| next_close | real | mark | 70/180 | −$8,345.75 |
| next_close | zero | liquidate / mark | 109/180 | +$15,019.35 |

Isolated effects: cost drag $24,259.57 · fill timing (next_close − next_open, real, mark) −$3,079.86 · terminal treatment
(liquidate − mark) −$509.49. Exposure-matched passive (zero cost): +$18,804.86; 76/180 beat it.
Unlike Trading Lab (as reported), HELIX historical and forward paths already used the same next-open fill rule; the
forward differences were partial months, gaps, staleness, liquidation-at-every-evaluation and cost binding (register D-1…D-6).
