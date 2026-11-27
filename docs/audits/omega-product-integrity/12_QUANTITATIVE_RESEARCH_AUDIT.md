# 12 — Quantitative research audit

This cycle builds on the 2026-11-25 independent-audit remediation (gates-v3; `docs/RESEARCH_INTEGRITY_V3.md`,
`INDEPENDENT_AUDIT_REMEDIATION_2026_11_25.md`). Re-verified here: 278/278 tests at `d7174f1`, registry 199, 0 qualified.

| Risk | Control in place | Evidence | Residual |
|---|---|---|---|
| Look-ahead | signals at close, fills next open; mutation tests at every rebalance boundary | `lookahead`/`multiDayCausality` tests | — |
| Data leakage in WF | forward-only folds, embargo = dependency horizon | `auditRemediation.test.ts` | — |
| Survivorship | delisted-market gate (−69% vs +49%) | `survivorship-study.json` | universe still 10 survivors |
| Selection / multiple testing | cumulative Bonferroni N=199; training-only selection | registry | conservative; power very low |
| Holdout reuse | cross-category provenance (200 records) | `provenance.test.ts` | stored history now unusable for qualification |
| Overfitting | coarse grids, neighbour stability, walk-forward 4/4 | tests | — |
| Incomplete candles | dropped (`incomplete_last_bar_dropped`) | candle tests | — |
| Execution | next-open fills, 2× cost and +1 bar stresses; XS event-driven | tests | no order-book depth for research fills |
| Fees | 0.60% taker **assumption** (lowest tier), spreads measured 0–5 bps | `cost-horizon-study.json` | real tier unverified |
| Minimum orders / small capital | tiers $20–$1,000; Ethereum L1 infeasible < $1,000 | `CAPITAL_TIER_FEASIBILITY.md` | lot precision not modelled |
| Correlation | measured: ~1.8 effective assets | `research-bottleneck-study.json` | pooled evidence over-counts |
| Regimes | measured by year | same | 3 of 6 years all-down |
| Reproducibility | content-hashed data, code SHA in run records | run records | — |
| Significance / sample size | monthly inference, ≥ 12 months, ≥ 100 tail draws | `STATISTICAL_CONFIDENCE_VALIDATION.md` | ~32 OOS months available |
| Cash as default | 0 qualified → bot holds cash; app says so | UI + `holdingCash` | — |

## Verdict
Research integrity: **PASS** (no new defects found this audit). Research *usefulness*: limited — on the
available history no strategy can be validated; the forward paper protocol (active from 2026-11-26) is the only
path to evidence and needs ≥ 12 months. The app must keep reporting **0 approved** until then.

## Findings
| ID | Sev | Finding |
|---|---|---|
| QR-1 | P2 | The app does not show the forward-trading protocol (3 rules, start date, months collected) — the only live research. |
| QR-2 | P3 | Fee tier is an assumption; owner should confirm their real Coinbase/Kraken tier (only lowers costs if evidenced). |
