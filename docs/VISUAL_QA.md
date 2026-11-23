# Visual QA — design system v2 "Ledger" (2026-11-23)

Evidence: `public/inspect/img/01…15.jpg`, captured with Playwright at 412×915 CSS px, DPR 2, touch, dark scheme.
This is a browser viewport simulation, **not** a test on a physical Android device.

## Why the previous design was rejected (owner feedback confirmed on capture)
- Every page was a stack of identical rounded, filled cards → no hierarchy, "template" look.
- Label/value rows set in monospace; dashed "PAPER" chips repeated on several screens.
- Market mood rendered as ten coloured chips; cyan accent and mint used for unrelated things.
- Bot page showed a developer message (`feed HTTP 404`).

## What changed (system level, so it applies to every screen)
| Area | Before | After |
|---|---|---|
| Surfaces | rounded filled cards | flat sections divided by hairlines, small-caps section labels |
| Palette | blue-black + cyan + mint | warm ink `#0F0F0D`, ivory type `#F3EFE6`, one calm accent `#B6C3FF`; green/red only for gains/losses, amber only for paper mode |
| Figures | IBM Plex Mono | Instrument Sans with tabular numerals (code font kept for addresses and hashes) |
| Primary action | cyan rounded rectangle | ivory pill; secondary = outlined pill |
| Tabs | pill segmented control | underline tabs |
| Mode indicator | dashed "PAPER TRADING ONLY" chip | persistent amber strip under the header: "Paper money · no real orders" |
| Brand | blue square "H" bitmap | ivory helix line mark (SVG) + letter-spaced wordmark |
| Bot | card stack + chip wall | status headline, 3-number research funnel, ledger lists, readable feed status |
| Markets on CoinGecko outage | blank error | main coins with live Coinbase prices + Retry; search still covers all Coinbase markets |

## Checks
| Check | Result |
|---|---|
| Horizontal overflow at 412 px (10 routes) | none (scrollWidth = 412 on every route) |
| Page errors during capture | 0 |
| Primary destinations one tap away | Home · Markets · Bot · Wallet · More (bottom bar, 56 px targets) |
| End-to-end paper flow | open $500 account → buy $100 BTC → filled at $61,370.04 vs quote $61,370.03 (live book), fee $0.60, Home shows $400.00 cash + $99.40 invested |
| Wallet | test-vector import → BTC testnet address `tb1q6rz28…pvkl` matches the published BIP84 vector; vault re-locks on reload |

## Known visual debt (not yet done)
- Research Lab (advanced) still uses dense tables; acceptable for an expert view but not redesigned.
- Wallet send forms are functional but plain; review step layout could be tighter.
- Asset chart axis labels use raw decimals (`100000.00`).
- No light theme for the new palette.
