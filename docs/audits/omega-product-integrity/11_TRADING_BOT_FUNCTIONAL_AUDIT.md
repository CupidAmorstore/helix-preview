# 11 — Trading bot functional audit

## What the bot actually is (verified)
The "Trading Bot" in the app is a **display of research results computed offline** by `scripts/bot-research.ts`
(Node, run by hand or by CI) plus forward paper accounts. **Nothing runs on the phone**: no background research, no
on-device strategy evaluation, no order placement. The app reads a bundled JSON summary (and would read a published
copy, which returns 404).

| Stage | Implemented where | Runs automatically? | Verified |
|---|---|---|---|
| Market discovery | fixed 10-coin Coinbase universe (`RESEARCH_UNIVERSE`) + watchbot scan | no (manual / CI) | source |
| Data collection | Coinbase public candles → `research/data/*.csv.gz` (SHA-256 recorded) | manual; daily forward task since 2026-11-25 (branch only) | ran online this cycle |
| Data validation | `validateCandles` (duplicates, misalignment, OHLC, gaps, stale) | with each run | tests |
| Strategy generation | 11 pre-registered families × small grids; no automatic generation | — | source |
| Training / validation / test | chronological 50/25/25, walk-forward, gates-v3 | with each run | 278 tests |
| Risk evaluation | stresses, capital tiers, survivorship, provenance | with each run | tests |
| Approval / rejection | gates-v3 → 0 qualified of 199 | — | registry |
| Paper execution | 22 diagnostic accounts + 3 forward-registered rules (forward-only) | daily scheduled task from 2026-11-26 00:41 UTC | first run pending |
| Monitoring | Research Lab, Bot Activity tab | — | crawl |

## Owner screenshot investigation (Bot → Overview)
| Question | Answer (evidence) |
|---|---|
| Heading partially obscured? | Not reproduced: Android 15 emulator screenshot (`07-bot.png`, run 47) and browser at 360/390/412 px show the heading clear at scroll 0. Possible causes on the owner's device: (a) the sticky header covers the title once scrolled — expected sticky behaviour; (b) a display cutout / larger system font where `env(safe-area-inset-top)` reports 0 (the emulator reported 0 px). **INSUFFICIENT EVIDENCE** without the device. |
| Header overlaps content? | Header is `sticky` (not fixed): it takes layout space at the top; content can scroll under it by design. |
| Bottom nav hides content? | Crawl `layout.mainPaddingBottom` per page (see 05); emulator screenshot shows "Mode" row ending right above the nav — no clipping at the end of the page after scrolling (functional check passes). |
| Wasted vertical space? | Yes: an empty band with two rules between the stats and "RESEARCH DATA" (`BotPage` panel spacing) — **BOT-6 P3**. |
| Do 199 / 4 / 0 have explanations? | **No** — no tooltip or definition. **BOT-3 P2.** |
| Are they authentic? | Yes: 199 = registry entries (OOS candidate evaluations: family × market/timeframe or universe), 4 = candidates whose test window was opened, 0 = qualified. |
| 199 = unique strategies? | **No**: cumulative evaluations of 11 families (+ XS) across 10 markets × 2 timeframes and pooled universes; parameter-grid configs are not counted. The label "Tested" invites the wrong reading. |
| Were the 4 test windows isolated? | Yes for their own run (opened only after validation passed); later provenance marks those periods as inspected. |
| Why 0 approved? | Real reasons available on the same page ("Why it isn't trading": too few test trades 139×, lost money on unseen data 128×, lost after fees 117×) and per candidate in the Research Lab. |
| Timestamp / data age consistent? | **No.** "Last successful research run" shows the summary's `generatedAt`, which a *watch-only data refresh* also updates; the last research run was 2026-11-24 19:37 UTC. **BOT-1 P1 (misleading).** |
| Is the data stale? | Research results are from 2026-11-24; prices in the bundle are refreshed only when someone runs the script. |
| Does research continue automatically? | **No.** "Where it runs: GitHub Actions, scheduled daily" — the schedule exists only on this branch; scheduled workflows run from `main`, which has none; the published feed URL is 404. **BOT-2 P1 (misleading).** |
| "with real fees" accurate? | Fees are **modelled** (Coinbase lowest-tier taker 0.60% assumption + 2 bps half-spread + 3 bps slippage), not observed on an account. **BOT-4 P2**: say "with realistic modelled fees". |
| Does a first-time user know what happens next? | Partly: "places no trades" is clear; what would change that (forward paper results, ≥ 12 months) is not stated on the Bot screen. **BOT-5 P2.** |
| Research value while inactive? | Yes — transparent rejections, protections and capital figures (verified in text crawl), but no visible forward-trading status yet (protocol activated 2026-11-25; not surfaced in the app). **BOT-7 P2.** |

## Findings summary
BOT-1 P1, BOT-2 P1, BOT-3 P2, BOT-4 P2, BOT-5 P2, BOT-6 P3, BOT-7 P2 (details in `19_COMPLETE_DEFECT_REGISTER.csv`).
