# Engineering backlog (live) — acceptance criteria are measurable

| # | Item | Acceptance criteria | Status |
|---|---|---|---|
| 1 | Merge PR #3 and confirm the daily research feed | `https://cupidamorstore.github.io/helix-preview/data/latest.json` returns 200 with `mode: "paper"`; Bot page shows "Daily feed" as the source on a phone | waiting on owner merge |
| 2 | Hourly evidence for new families | first scheduled run evaluates `vol_filtered_trend`, `regime_switch` on fresh hourly data; results visible in Strategies | after #1 |
| 3 | Physical-device QA | install build on an Android phone; back button, keyboard, safe areas, offline start verified; findings logged | needs owner device |
| 4 | Release signing | private signed APK via owner-held keystore (GitHub secret); never committed | needs owner keystore |
| 5 | Order-book cost history | ≥30 days of book snapshots so cost presets are measured, not assumed | collecting |
| 6 | Data for untestable families (funding, on-chain, order-book imbalance) | a free, reproducible historical source identified and stored with hashes | blocked: no free source found |
| 7 | Chart axis formatting | price axis uses grouped currency format on all timeframes | open |
| 8 | Research Lab redesign | tables reflow to lists < 480 px; no horizontal scroll | open |
| 9 | Paper limit orders | resting limit orders fill only when the live book crosses; tests for fill/no-fill/expiry | open |
| 10 | Light theme for Ledger palette | WCAG AA contrast on all text tokens | open |
