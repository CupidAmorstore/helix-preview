# P0 root-cause register (2026-11-26)

Each entry: location · reproduction · financial impact · root cause · correction · regression test · before/after.
"Confirmed" = reproduced in this session. Severity reflects impact on the profitability conclusion.

## A. Why no strategy is profitable (economic / statistical causes)

| ID | Cause | Evidence (reproduce) | Impact | Status |
|---|---|---|---|---|
| RC-1 | **No timing skill: gross gains = market exposure** | `scripts/p0/execution-diagnostic.ts` → zero-cost +$18,484 vs exposure-matched passive +$18,805; 76/180 beat passive | Removes the premise that "costs alone" kill a real edge | Confirmed; recorded per candidate in failure registry (`beta_only` 39, `no_gross_edge` 67) |
| RC-2 | Costs vs horizon | `reproduce_claims.py`: 1h move 0.30% vs 1.70–1.90% verified round trip (0.16–0.17×); 1w 6.52% (3.4–3.8×) | Every horizon < ~1 week uneconomic | Confirmed; enforced by admission layer |
| RC-3 | **Fee presets understate current fees** | `src/bot/costs.ts` `kraken_taker` 40 bps vs official 80 bps (Kraken blog 2026-07-09); `coinbase_taker` 60 vs 90 bps US (secondary) | Historical rejections conservative; forward reg. a under-costs | Confirmed. Corrected via `feeEvidence.ts`, new presets, registration b. Legacy presets kept unchanged for replay |
| RC-4 | Signal decay within one bar | next_close vs next_open: −$3,080 additional on 180 candidates | Any added latency is expensive | Confirmed; exec-v1 models latency explicitly |
| RC-5 | Whipsaw at threshold 0 (ts_momentum) | DOT last 365 d: 3 round trips −8.5/−3.2/−2.2% net = −13.4% at 1% exposure | Momentum worse than random timing at matched exposure in 10/10 markets (last 365 d) | Confirmed (diagnostic). Caveat: random control trades less |
| RC-6 | Low statistical power / correlation | ρ = 0.702, ≈1.8 independent assets (reproduced) | Pooling 10 coins ≠ 10× evidence | Confirmed (prior study reproduced) |
| RC-7 | Survivorship | `research/survivorship-study.json` (prior): delisted −69% vs survivors +49% | Inflates trend results | Prior finding; still open (no point-in-time universe) |
| RC-8 | Commercial ceiling at small capital | Audit 3: 2% gross weekly edge → $0.25–$12.50/yr net on $20–$1,000 | Even success is not commercially meaningful at retail tiers | Confirmed |

## B. Implementation defects found and fixed

| ID | Defect | Location | Reproduction | Financial impact | Root cause | Correction | Regression test |
|---|---|---|---|---|---|---|---|
| D-1 | Forward counted **partial months** as evidence months | `src/bot/forward.ts` (old line 89) via `monthlyReturns` | 80 days from mid-Jan = 4 "months", only 2 complete | 12-month gate reachable after ~10 months + days → premature qualification risk | Calendar bucketing without completeness | `completeMonthlyReturns` (stats.ts); forward counts complete months only | `p0Forward.test.ts` "partial first and in-progress…" , "forwardMonths counts complete months only" |
| D-2 | Historical monthly inference **double-counted the boundary month** and counted partial months | `validation.ts:227,471`, `crossSectional.ts:240` | real daily run: 34 counted vs 30 complete months (+13%) | Inflated n → looser t / bootstrap bounds (never triggered: no candidate reached inference) | Concatenation of per-window calendar months | `windowCompleteMonths`; **gates-v4** | `p0Forward.test.ts` "gates-v4 …" |
| D-3 | Forward path **bridged data gaps** | old `forward.ts` + `forward-paper.ts` loaded raw files (XRP 1d has a 904-day gap; every 1h file a 5-h outage on 2026-05-08) | gapped series → fills on next array bar at a later price | Wrong fills/indicators after any outage | Research used trailing contiguous run; forward did not | `forwardDataProblems` refuses evaluation; exec-v1 fails orders whose fill bar is missing | `p0Execution.test.ts` "missing fill bar…", `p0Forward.test.ts` "a gap inside…" |
| D-4 | Forward had **no staleness check** | old `forward.ts` | data not refreshed → sleeves silently liquidated at last bar | Misleading P&L | Missing check | stale > 2 bars refuses evaluation | `p0Forward.test.ts` "stale data…" |
| D-5 | Registration hash bound the cost preset **name**, not its values | `forward.ts registrationHash` | editing `COST_PRESETS.coinbase_taker` changes a frozen experiment with no hash change | Silent post-registration cost change | Hash body | `costSnapshot` + evaluator refuses drift; v2 hash includes values; reg. a snapshot added (outside v1 hash, hash unchanged) | `p0Forward.test.ts` "cost values bound…", "committed registration a…" |
| D-6 | Forward force-liquidated open positions at every evaluation | old `forward.ts` (backtest `end` liquidation) | equity curve last point = liquidated value | Each evaluation's last month understated by one exit cost; realized/unrealized mixed | Reuse of research backtest | exec-v1 `terminal: 'mark'`; realized vs unrealized reported | `p0Forward.test.ts` "open positions are reported as unrealized" |
| D-7 | No persistent forward process; no append-only ledger | repo had no workflow; report recomputed and overwritten | Forward clock advances only when someone runs it manually | Evidence collection depended on manual runs | — | `.github/workflows/forward-paper.yml` (daily, `forward-ledger` branch); `ledger-<id>.json` prefix-verified | dry-run; `p0Forward.test.ts` "re-evaluation is deterministic and append-only" |
| D-8 | Venue history is **not immutable** | live refresh 2026-11-26: ADA closes differ 1–24 bps (two −134/−142 bps) vs stored; LINK transient | Silent rewrites of past fills if data re-downloaded | Stored snapshot treated as canonical | Refresh appends only new completed bars, reports revisions; ledger refuses rewrites | runner behaviour (logged) |
| D-9 | Cross-sectional forward rule (F3) liquidated at the **last open** each evaluation and never marked the last close | `crossSectional.ts simulateXs` used by `forward.ts` | evaluate on Mar 1 vs Mar 2 → February's recorded return differs | A complete month's evidence depended on the evaluation date (exit cost + missing last close) | research simulator's accounting close-out reused forward | `simulateXs(..., { terminal: 'mark' })` for forward: marks every completed day incl. the last, no liquidation; research default unchanged (baseline fixture passes) | `p0Forward.test.ts` "D-9 …" (2) |
| D-10 | Refresh trusted the **unranged** Coinbase candles endpoint | `scripts/forward-paper.ts refresh` | 2026-11-27: unranged response gave BTC 2026-11-13 close −604 bps vs the ranged endpoint and the stored bar | A corrupted bar could have been appended and traded on | single-read ingestion | every new bar must agree with an independent ranged read (`barsAgree`: close ≤ 10 bps, OHLC ≤ 25 bps; observed benign jitter ≤ 8 bps); disagreement stops the append; revision magnitudes logged to `research/forward/revisions.jsonl` | `p0Forward.test.ts` "D-10 …" (3) |

## C. Checked and NOT defective
Look-ahead (future-mutation tests pass for exec-v1 and regime), fee duplication (exec-v1 = legacy to 1e-10 and the
zero-cost identity holds), cost basis / realized+unrealized identity (`p0Execution.test.ts`), drawdown incl. final
liquidation (unchanged, verified equal), next-open proxy validity (median |open[i+1]/close[i]−1| 0.0–3.5 bps on 1h data),
data duplicates/misalignment/invalid OHLC (none in stored files).

## D. Remaining (not fixed in this session)
| ID | Item | Why open |
|---|---|---|
| R-1 | Trading Lab (Python) audit, 0/11 table, 189 tests | source + recovery zip not accessible |
| R-2 | Coinbase fee from official source | help.coinbase.com refused automated fetch (403); owner must confirm account tier |
| R-3 | Cross-sectional rule not on exec-v1 | own event-driven portfolio simulator (verified in prior audit, same fill rules); forward now uses its `mark` mode (D-9) and gap guard |
| R-4 | Legacy `backtest()` still bridges gaps if given gapped data | kept unchanged for comparison; research feeds it contiguous runs only |
| R-5 | Point-in-time universe incl. delisted coins | needs data source |
| R-6 | Maker fills | needs trade-level/queue data; candle model shows 88–100% fills = optimistic artifact |
| R-7 | ~~Watchbot ranking not rewired~~ **Fixed (2026-11-26, follow-up)**: `src/bot/opportunityScanner.ts` ranks by data quality → economics (admission) → regime, names unknowns, fails closed; cross-venue check now uses evidence-based fees (Gemini bounded at 0.90%) | `p0Watchbot.test.ts` (5) |
| R-8 | Persistent process | active only after merge to main |
