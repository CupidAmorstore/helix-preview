# 20 — Professional quality scorecard

Scores 0–100 for **HELIX Preview at `d7174f1`** (not OMEGA). Untested areas are not scored as passing. Critical
failures override averages. Single-agent assessment; no human usability data.

| Category | Score | Evidence | Main reasons |
|---|---|---|---|
| Visual design | 72 | 08, screenshots | coherent, non-generic; heading scale, wasted band, raw research rows |
| Brand identity | 65 | 08 | distinct "Ledger" look; value proposition not stated |
| First impression | 58 | 05, 24 | clear paper message; no onboarding; legal TODOs one tap away |
| Navigation | 75 | 03 | shallow, consistent Back; one dead end, one orphan |
| Content quality | 55 | 06 | honest tone; 2 misleading bot statements, 53 raw keys, placeholders |
| Functional completeness | 55 | 04, 10 | core paper trading verified; no limit orders, export, onboarding, background alerts |
| Mobile optimization | 70 | 05, 14 | no overflow at normal sizes; fails at 200% text; emulator 30/30 |
| Accessibility | 52 | 15 | axe nearly clean; reflow and target-size failures; TalkBack untested |
| Market-data integrity | 88 | 09 | prices match Coinbase exactly; one misleading failure message |
| Wallet accounting | 90 | 10 | reconciled to the cent; invariants tested |
| Trading bot functionality | 45 | 11 | transparent but no live research in app; false schedule claim; forward rules not shown |
| Quantitative research integrity | 85 | 12 | gates-v3, provenance, 278 tests; power is low (honestly reported) |
| Security | 60 | 13 | strong execution boundary and vault; **public debug key + debuggable public APK** cap the score |
| Privacy | 70 | 13 | no server/tracking; placeholder policy |
| Reliability | 75 | 14 | crash-free emulator run, offline recovery; no device data |
| Performance | 78 | 14 | ~0.5 s FCP emulated; research JSON in main chunk |
| User trust | 55 | 17 | transparency strong; misleading timestamps, TODOs, no operator identity |
| Competitive positioning | 50 | 16 | real differentiators exist but are not communicated |
| Commercial readiness | 25 | 18 | legal, support, French, store, onboarding missing |
| Public launch readiness | 15 | 22 | P1 blockers open |

## Coverage (reported separately)
| Area | Coverage |
|---|---|
| Routes/page-states | all 16 routes in App.tsx + every tab = 26 route variants; 32 page-states (26 fresh + 6 with a paper account) (100%) |
| Interactive elements | 745 discovered; 248 activated individually (100% of unique controls); 494 identical copies inventoried; 3 disabled |
| Workflows independently verified | 8 (paper buy/sell reconciliation, watchlist, sort, chart timeframe, risk recompute, amount selection, account opening, trade sheet) + 30 emulator checks + 123 browser-suite checks (68 functional, 21 deep, 10 wallet, 24 research-mobile) |
| Text | 2,843 elements / 1,337 unique screened by rules; key screens read in full |
| Popups | 1/1 modal |
| Physical device, TalkBack, battery, real networks | 0% (BLOCKED) |
| HELIX OMEGA, Trading Lab | 0% (inaccessible) |
