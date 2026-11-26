# P0 strategy research report

All studies below ran on **already-inspected** history and are **diagnostic**: they explain failures and steer what to
test forward. None can qualify a strategy (provenance + gates-v4 + novelty guard).

## 1. Failure registry (`research/p0/failure-registry.json`, `src/bot/failureRegistry.ts`)
180 diagnosed candidates, classified mechanically (zero-cost gross vs real-cost net vs exposure-matched passive vs
registry reasons). Primary cause (precedence: no_gross_edge > beta_only > cost_dominated > oos_loss > unstable > insufficient_sample):

| Primary cause | Count | Corrective action | Retest? |
|---|---|---|---|
| no_gross_edge (loses at zero cost) | 67 | abandon the signal | no |
| insufficient_sample | 51 | only on new forward data / larger point-in-time universe | yes |
| beta_only (gross ≤ passive exposure) | 39 | abandon as a timing rule | no |
| cost_dominated | 20 | only with structurally lower turnover or *verified* lower costs | yes |
| unstable | 2 | abandon | no |
| oos_loss | 1 | abandon (test window spent) | no |

Any-category counts: insufficient_sample 137, no_gross_edge 67, cost_dominated 43, beta_only 39, unstable 11, oos_loss 2.
**Novelty guard:** every one of the 11 existing families is now blocked (same signal × horizon × information set has
non-retestable failures). A new hypothesis must bring new *information* (e.g. on-chain, order book), not a new name.

## 2. Hypothesis registry (`src/bot/hypotheses.ts`)
| ID | Hypothesis | Status | Why |
|---|---|---|---|
| H-TSMOM | multi-week time-series momentum | forward_registered (F1) | only weekly+ survives costs; historically beta-only |
| H-TREND-W | weekly SMA200 trend filter | forward_registered (F2) | risk control; too few historical trades to test |
| H-XSMOM | cross-sectional momentum top-3 | forward_registered (F3) | breadth limited (≈1.8 independent assets) |
| H-HOURLY | hourly technical rules | blocked_costs | 0.30% move vs ≥1.70% round trip |
| H-MAKER | maker execution | blocked_no_data | candle fills are not evidence |
| H-XVENUE | cross-venue discrepancies | blocked_costs | 2–3 bps spreads vs ≥ 80 bps fees per leg |
| H-ONCHAIN | on-chain flows | blocked_no_data | no free point-in-time dataset integrated |
| H-MEANREV | daily mean reversion | rejected_historical | pooled Bollinger test −38.2%; survivorship flips sign |
Each entry states mechanism, counterparty, persistence, data, decay, cost survival, small-account fit and invalidation.

## 3. Mandatory benchmarks, last 365 days (Coinbase US 0.90% fee; `research/p0/research-lab.json`)
| Market | Buy & hold | ts_momentum(168d) | its exposure | Random entry (median / p90), same exposure |
|---|---|---|---|---|
| BTC | −34.5% | −10.7% | 20% | −5.1% / +26.9% |
| ETH | −45.2% | −28.6% | 33% | −12.0% / +45.3% |
| SOL | −51.7% | −23.8% | 25% | −8.3% / +43.6% |
| XRP | −58.6% | −31.4% | 11% | −6.1% / +23.3% |
| DOGE | −64.5% | −17.7% | 4% | −5.8% / +11.2% |
| ADA | −67.2% | −18.7% | 2% | −5.4% / +11.4% |
| AVAX | −56.6% | −15.8% | 9% | −3.9% / +27.9% |
| LINK | −34.0% | −20.4% | 33% | −7.2% / +54.0% |
| LTC | −51.7% | −31.8% | 13% | −1.5% / +18.9% |
| DOT | −72.4% | −13.4% | 1% | −5.1% / +2.8% |
Cash = 0% beat everything. Momentum beat buy-and-hold only by being out of the market; it was worse than random timing
at the same exposure in 10/10 markets (caveat: the random control makes one round trip, so part of the gap is turnover
cost — which is itself the finding: whipsaw entries at the zero threshold, e.g. DOT 3 round trips −13.4%).

## 4. Regime reliability (`src/bot/regime.ts`; point-in-time; 30-day outcome)
| Label | n | mean fwd 30d | median fwd 30d | share up | 7-day persistence |
|---|---|---|---|---|---|
| strong_bull | 3,999 | +1.0% | −3.5% | 43.8% | 85% |
| weak_bull | 1,476 | +2.8% | −3.2% | 41.1% | 44% |
| sideways | 3,377 | +2.8% | −2.8% | 44.0% | 57% |
| bear | 7,143 | +1.8% | −0.7% | 47.7% | 87% |
Labels are stable descriptions but have **no forward predictive value** for direction. Market-wide stress
(breadth < 20% and ≥ 50% high-vol) preceded −5.9% vs +3.2% (30d basket) — but only 12 samples: not usable evidence.
Use: the module blocks new entries when no asset can be classified or under stress (fail-closed risk control), not as alpha.

## 5. Maker research (`src/bot/maker.ts`)
Weekly-trend entries, limit 10 bps under close, 1 bar wait, fill only on a 5 bps trade-through, Kraken 0.40/0.80%:
fill rates 88–100% and "net benefit" +15…+52 bps per decision. On daily candles the low almost always trades 15 bps
below the close, so this measures candle range, not queue position. **Classification: unverified_candle_model.** Maker
profitability is UNVERIFIED until trade-level prints and queue data are recorded.

## 6. External research (from domain knowledge; not re-fetched or reproduced in this session)
- Crypto factor studies (e.g. Liu & Tsyvinski, *Risks and Returns of Cryptocurrency*, RFS 2021; Liu, Tsyvinski & Wu,
  *Common Risk Factors in Cryptocurrency*, JF 2022) report market, size and momentum effects mostly at **weekly**
  horizons on broad universes with gross returns — consistent with our cost-horizon result that only weekly+ holding is
  affordable, and a reason F1–F3 are weekly. Their universes include small coins and ignore retail taker fees.
- Multiple testing: Harvey, Liu & Zhu (RFS 2016) argue for t > 3 hurdles; Bailey & López de Prado's deflated Sharpe
  ratio addresses selection over many trials. HELIX uses cumulative Bonferroni over N = 199 + dependence-aware
  monthly inference, which is at least as strict.
- Practical limit (fee arithmetic, verified above): published gross anomalies of a few % per month do not survive
  1.7–1.9% round trips at frequencies above weekly.
These are leads for hypotheses, never deployable strategies.

## 7. Conclusion
No hypothesis has positive evidence of predictive value net of verified costs. The only legitimate remaining path is
forward observation of the three pre-registered weekly rules (and, if activated, their verified-cost twin), plus
new-information hypotheses once point-in-time data sources exist.
