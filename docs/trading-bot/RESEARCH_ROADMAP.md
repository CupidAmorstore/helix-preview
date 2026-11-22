# RESEARCH_ROADMAP — falsifiable experiments, in priority order

Each experiment is pre-registered: hypothesis, data, pass condition (gates-v1 unless stated). A failure is a result.

| ID | Experiment | Hypothesis (H1) | Data | Pass condition | Cost |
|---|---|---|---|---|---|
| R0 | Reconcile ChatGPT code (owner exports it) | Old engine had features worth porting | owner export | documented diff, ported tests | $0 |
| R1 | **Forward paper evidence** | Diagnostic accounts confirm rejections (no positive forward edge) | daily bars from 2026-11-22 | ≥ 90 days; report regardless of outcome | $0 |
| R2 | Measured costs — **collecting since 2026-11-22** | Real top-of-book spread + depth for $20–$1,000 orders is below the 2+3 bps placeholder | Coinbase/Kraken order books, hourly snapshots, 30 days | replace placeholders with measured p75; rerun once | $0 |
| R3 | Regime-conditional trend | Long-only trend has positive net expectancy only in `up` regimes | 1d, 10 markets pooled | gates-v1 on regime-filtered trades | $0 |
| R4 | Cross-sectional momentum | Top-3 of 10 by 30d return beats equal-weight after costs | 1d pooled, weekly rebalance | gates-v1 + beats equal-weight B&H | $0 |
| R5 | Larger universe | More markets → enough daily trades for power | Coinbase USD markets with ≥ 3y history (incl. delisted where available) | gates-v1 | $0 |
| R6 | Maker execution | Limit orders at touch cut costs enough without adverse selection | needs fill model from R2 | gates-v1 with fill-probability model | $0 |
| R7 | Funding / basis (observation only) | Perp funding extremes predict spot drift | public funding history (venue TBD, legal access check) | gates-v1 | $0 |
| R8 | DEX/multichain discovery | Same-asset DEX prices diverge beyond gas+fees | public DEX aggregator data (free tier) | detected-opportunity log only; never auto-labelled arbitrage | $0 |

Rules: one family-level change per run; Bonferroni denominator = candidates in that run; pooled tests share calendar
cut-offs; the test window is never inspected before validation passes; registry prevents re-tests on identical data.
