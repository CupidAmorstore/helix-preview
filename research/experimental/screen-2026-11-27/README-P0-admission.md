# P0 experimental admission — isolated research triage

Base inspected: CupidAmorstore/helix-preview, 50be5e4bed9e606ff5805be05ac037db12eb3252.
GitHub branch creation returned 403; no remote changes. Existing qualification gates, registry and forward registrations remain untouched. This module is a read-only research shortlist generator, not a live paper-trading admission or execution adapter. It must not be interpreted as a proof of profitability.

Copy `scripts/experimental-admission.mjs` and `tests/experimental-admission.test.mjs` into an isolated checkout, then run from the repository root:

```
node --test tests/experimental-admission.test.mjs
node scripts/experimental-admission.mjs . > experimental-admission-report.json
```

Policy selected for exploration after inspecting historical results: trade-count-only rejection with matching evidence, positive net training and validation return, at least one recorded validation trade, historical training and validation drawdown <=25%, >=50% profitable parameter neighbours, no inspected test in the source report, and passing recorded walk-forward when present. Missing walk-forward is explicitly warned. This does not change gates-v4. No automatic approval to execute even paper orders. Historic cost assumptions need fresh verification. The whole repository CLI was not run in this environment (no checkout, direct network unavailable); 17 isolated tests including synthetic repository-join fixtures passed. Review actual output on the checkout before integration.

Manual review of 28 source records identified these five meeting the stated numerical screens (rounded historical data, not new backtests):

| Market | Strategy | Validation net | Validation DD | Trades |
|---|---|---:|---:|---:|
| XRP daily | Bollinger reversion | 66.44% | 12.01% | 7 |
| LINK hourly | SMA cross | 25.60% | 13.44% | 3 |
| ETH daily | RSI reversion | 24.11% | 11.22% | 2 |
| ADA hourly | SMA cross | 11.60% | 19.16% | 8 |
| SOL daily | Volatility compression breakout | 3.41% | 9.65% | 1 |

All lack recorded walk-forward results in those archived runs. Prefer reviewing daily XRP and ETH first for fresh research; SOL is especially weak evidence (one trade); hourly candidates require revised cost assessment. Do not add to the existing active forward protocol. A new prospective study requires separately frozen parameters, costs, risk limits, data and authorization; keep total active experiment capacity bounded and respect the existing three-rule registration. Keep all real-money paths disabled. Full qualification and test suite are not established by this module.
