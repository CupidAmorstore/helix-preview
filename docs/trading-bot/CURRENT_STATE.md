# CURRENT_STATE — HELIX Trading Bot (Pro Trading Bot integration)

Last updated: 2026-11-22 (UTC) · Branch `ccr-8d17e0b5-yaqvtm` · Repo `CupidAmorstore/helix-preview`

## Owner decision (2026-11-22)
The owner directed that **HELIX and Pro Trading Bot become one trading platform, with the trading bot as a section of it**.
This supersedes the earlier "keep HELIX separate" instruction for this repository.

## Source recovery — result
The original Pro Trading Bot / Trading Lab code was **not recoverable** in this environment:

| Location searched | Result |
|---|---|
| Container filesystem | only `helix-preview` |
| 15 GitHub repos visible to the session + GitHub code search | no Trading Lab code |
| Google Drive (names, full text, recent files) | no Trading Lab files |
| Gmail | connector signed out — not searched |
| Uploaded `Claude_Code_Pro_Trading_Bot_Resume_Pack.zip` | 4 instruction files, no source / evidence |
| HELIX `legacy/` zips (Apex Crypto Desk v2.2/v3.0, ApexAgentAutoAccept) | no trading engine |
| Owner statement | code exists only inside ChatGPT conversations |

Evidence archives `Trading_Lab_v070_Multichain_Source_and_Evidence.zip` and `Trading_Lab_Paper_Strategy_Study_20261121.zip`
were **not found**. The Nov-21 baseline remains an owner-supplied, **unverified** report.

Consequence: the bot engine in `src/bot/` is a **new implementation** inside HELIX. It re-uses the documented
design intent and Nov-21 lessons, not old code. If the ChatGPT code is later exported, compare it against this engine
(see RESEARCH_ROADMAP R0) rather than replacing it blindly.

## Baseline before changes (HELIX @ `e89e0e9`)
| Check | Result |
|---|---|
| `npm test` | 1/1 pass (placeholder smoke test) |
| `npm run build` | pass |
| `npm ci` | **fail** (EUSAGE, lockfile out of sync) → fixed in `f016c9c` |
| `tsc --noEmit` | fail (wallet/vault/MarketChart/Portfolio typing) — pre-existing, untouched |
| `npm run lint` | 63 errors (mostly `no-undef` misconfig) → 17 after config fix, rest pre-existing |
| Binance REST from container | HTTP 451 restricted location → Markets page moved to Coinbase (fixed) |

## What exists now
| Area | State |
|---|---|
| Research engine `src/bot/*` | implemented, 59 tests |
| Research runner `npm run bot:research` | implemented; real public data (Coinbase Exchange) |
| Datasets | 20 stored (`research/data/`, 10 markets × 1h/1d) |
| Research runs | 4 run records (`research/runs/`) |
| Qualified strategies | **0** |
| Paper accounts | 14 diagnostic, 0 qualified, 0 forward bars processed yet |
| App section | `/bot` — Overview, Strategies, Research Lab, Watchbot, Risk Center, Activity & Audit, Settings |
| Live trading | **disabled; no order code exists** |

## Resume (next session)
```bash
cd helix-preview && git checkout ccr-8d17e0b5-yaqvtm && npm ci
npm test                                  # expect all bot tests green
npm run bot:research -- --watch-only      # advance paper accounts, refresh quotes (no re-testing)
```
Then continue with RESEARCH_ROADMAP.md item R1. Full checkpoint: `docs/trading-bot/CHECKPOINT.md`.
