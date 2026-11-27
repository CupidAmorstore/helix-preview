# P0 forward paper-trading protocol

Forward observation after the start date is the **only** source of qualifying evidence (all stored history is inspected).
Paper only: public candles, simulated money, no credentials, no order adapter.

## Registrations
| ID | Status | Start | Costs | Hash |
|---|---|---|---|---|
| `forward-2026-11-25-a` (`research/forward/registration.json`) | **active** (owner, 2026-11-25) | 2026-11-26 00:00 UTC | `coinbase_taker` 0.60% (+2 + 3 bps), frozen in `costSnapshot` | v1 `00bb27b2…c998` (unchanged) |
| `forward-2026-11-26-b` (`research/forward/registration-b.json`) | **active** (owner, 2026-11-27: "I approve everything") | 2026-11-28 00:00 UTC | `coinbase_taker_us_2026_09` 0.90% (+2 + 3 bps) | v2 (binds cost values) `9daf74db…3f2e` |

Rules (identical in a and b; ≤ 3 distinct hypotheses): F1 pooled ts_momentum(168d), F2 pooled weekly_trend(SMA200,
weekly), F3 cross-sectional momentum(28d, top-3, weekly); 10 Coinbase USD coins; $1,000 (pooled sleeves $100 each).
b exists because the fee evidence gathered in P0 shows a understates current costs. It is not a new hypothesis.
b was activated by the owner on 2026-11-27; a keeps running. b is the decision-relevant test (realistic fees); a is kept for continuity.

## Evaluation (unchanged thresholds, stricter counting)
- Only bars opening at/after `startAt` trade; earlier bars may feed indicators.
- **Complete calendar months only** (P0 D-1): the first partial month (Nov 26–30, 2026) never counts; the in-progress month never counts.
- ≥ 12 complete months, gates-v4 monthly inference at α = 0.05 / 3 (dependence-adjusted t and block bootstrap).
- Status: `collecting` → `rejected` or `forward_qualified`. No-trade months are not evidence of profitability.
- Any change to rules, capital, costs or evaluation ⇒ new registration and the clock restarts. Old versions are kept.

## Integrity controls (implemented)
| Control | Mechanism |
|---|---|
| Rules frozen | SHA-256 registration hash; mismatch ⇒ "not running" |
| Costs frozen | `costSnapshot`; evaluator refuses drift (D-5) |
| Stale data | last completed bar older than 2 intervals ⇒ evaluation refused |
| Gaps | any gap inside the forward window ⇒ evaluation refused; exec-v1 fails orders with missing fill bars |
| Completed bars only | bars whose close time > now are excluded |
| Duplicate events / crash recovery | exec-v1 ignores duplicate/out-of-order bars; deterministic full replay each run |
| Append-only ledger | `research/forward/ledger-<id>.json`: stored fills must be a prefix of recomputed fills, else problem reported and ledger kept |
| Venue revisions / bad rows | refresh appends only new completed bars **confirmed by an independent ranged read** (`barsAgree`); stored bars are never rewritten; differences are logged with magnitude to `revisions.jsonl` (observed: ADA ≤ 24 bps jitter; one broken unranged row, BTC 2026-11-13 −604 bps) |
| Concurrency | `.lock` file (stale after 30 min) + workflow `concurrency` group |
| Realized vs unrealized | reported separately per rule; open positions are marked, not liquidated (pooled: exec-v1; cross-sectional: `simulateXs` mark mode, D-9) |

## Running it
```
npx vite-node --config scripts/vite.node.config.ts scripts/forward-paper.ts --refresh   # fetch new daily bars + evaluate
npx vite-node --config scripts/vite.node.config.ts scripts/forward-paper.ts            # evaluate stored data
```
Outputs: `research/forward/report-<id>.json` (+ legacy `report.json` for a), `ledger-<id>.json`.

## Persistent process — status: NOT YET OPERATIONAL
`.github/workflows/forward-paper.yml` runs daily at 01:17 UTC, restores data + ledgers from the `forward-ledger` branch,
refreshes public candles, evaluates, and commits state to `forward-ledger` (never to main). GitHub only runs scheduled
workflows from the default branch, so it starts **after this work is merged to main**. Until then the forward clock
advances only on manual runs. Manual runs 2026-11-26/27: a `running` (bars through 2026-11-26, all rules in cash), b `running` from 2026-11-28; 0 complete months.

## Timeline
Earliest possible forward verdict for a: on 2027-12-01 (12 complete months, Dec 2026 – Nov 2027). With 12 months only
very large edges can be confirmed (prior power study, `research/research-bottleneck-study.json`: at N = 199 a 2%/month
edge needs ≈ 298 OOS months and a 5%/month edge ≈ 48 for 80% power). A 12-month "collecting → rejected" outcome is the
most likely result and must be reported as such.
