# PAPER_TRADING_REPORT

As of 2026-11-22 20:09 UTC (`--watch-only` pass).

| Item | Value |
|---|---|
| Qualified paper accounts | **0** (no strategy qualified) |
| Diagnostic paper accounts | 14 — every rejected 1d family on BTC-USD and ETH-USD, $1,000 simulated each |
| Created | 2026-11-22 20:00:26 UTC |
| Forward bars processed | **0** (no daily bar has completed since creation) |
| Entries / exits | 0 / 0 |
| Realized / unrealized P&L | $0.00 / $0.00 |
| Kill switches tripped | 0 |

**Interpretation:** there is no forward evidence yet. $0 P&L with zero trades is not performance. Diagnostic accounts exist
to test whether the rejections were right; they are not strategies the bot endorses and are excluded from the app's
"bot paper capital".

Mechanics verified by tests: forward-only (never trades bars that opened before account creation), next-open fills with
modelled costs, 25% position cap, restart-safe (processing in chunks equals one pass), accounting identity.

Next update: run `npm run bot:research -- --watch-only` at least daily; report after 30 and 90 days whatever the result.

## Cross-venue check (Watchbot, same pass)
BTC best bid/ask across Coinbase, Kraken, Gemini differed by ≤ 0.016% gross versus ≈ 0.9–1.1% round-trip taker costs →
all pairs **rejected**; nothing labelled arbitrage.
