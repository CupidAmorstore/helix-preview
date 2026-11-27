# 08 — Visual design and UX

Evidence: 32 full-page screenshots (`evidence/screens/`), emulator screenshots (run 47), viewport sweep 320/360/412/768 px,
text-zoom sweep 130/200%.

## Design system
"Ledger" dark theme: ink background, single sans (Instrument Sans) + mono for figures, rules instead of cards,
one accent (mint/helix), amber for paper/warnings, red/green paired with ▲/▼ glyphs. Consistent across all
screens; it does **not** look like a generic crypto template (no gradients, no glassy cards, no badge clutter).

## What works
- Information density on Asset and Bot pages is professional: label/value rows, aligned mono figures.
- One paper-money banner on every screen; consistent bottom nav with 44 px+ targets.
- No horizontal scroll at 360/412/768 px on any route; only Research Lab › Risk at 320 px (A11Y-1).
- Safe areas: header/nav clear status and gesture bars on the Android 15 emulator.

## What looks unfinished or generic
| ID | Finding |
|---|---|
| UX-3 | Bot overview: empty band with two rules between stats and "Research data". |
| DS-1 (P3) | Very large headings (e.g. "No strategy has earned the right to trade yet." at ~40 px) push key data below the fold on 360 px phones; the 199/4/0 stats sit at ~50% of the first screen. |
| DS-2 (P3) | Research Lab rows use 22 px tall tap rows and raw keys — reads like a developer console inside a consumer app (acceptable as "advanced", but it is one tap from Bot). |
| DS-3 (P3) | Chart is a single line with the TradingView attribution logo overlapping the lower-left of the plot. |
| A11Y-1 | 200% text: 10 screens overflow horizontally. |
| HDR-1 | Owner-reported obscured title: not reproduced (see 11). |

## One-handed use
Primary actions (Open paper account, Paper buy/sell, Place order) are full-width and in the lower half or reachable;
bottom nav present everywhere. Tabs are at the top (thumb-stretch), typical for the platform.
