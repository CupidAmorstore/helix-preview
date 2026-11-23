# HELIX — Application transformation & QA report

Date: 2026-11-23 · Branch `ccr-8d17e0b5-yaqvtm` · Code verified at `1d7555d` (this report's commit only adds docs/CI config).

## 0. Source and test environment

| Item | Finding |
|---|---|
| Current Android app | APK builds #1–#4 come from this branch; the owner's 2026-11-22 recording matches build #4 (Home with "Watched holdings", Receive / Set alert / Watch address, BTC/ETH/SOL) |
| OMEGA source (`helix-omega-verified-beta`, `a12fc5a`) | Not reachable: no repository with it, no computer attached (re-checked 2026-11-23). Not recreated |
| Screen recording `Screen_Recording_20261122_221301_HELIX.mp4` | Not uploaded to this session; owner's written findings used |
| Device testing | **Not possible here** (no ADB, no attached phone, no KVM for an emulator). All UI checks run the app's own build in Chromium with a Pixel 7 profile (412×915). Android back gesture, TalkBack, real touch, performance on the phone: NOT VERIFIED |

## 1. Page inventory (after this pass)

| Route | Purpose | Status |
|---|---|---|
| `/` Home | Paper account value, P&L since start, value chart 1D/1W/1M/All, cash / invested / realized / fees, positions, movers, watchlist, bot status, recent activity, watched addresses (only when tracked) | Rebuilt |
| `/markets` | Search (Coinbase 400 USD markets + CoinGecko top 100), All / Watchlist / Gainers / Losers, sort by cap / volume / 24h change, source + age | Rebuilt |
| `/markets/:symbol` | Live price, 24h change, chart + timeframes, Coinbase 24h stats, CoinGecko cap/rank, paper position vs watched holdings, watch ☆, paper buy/sell, alert | New |
| `/bot` | Overview · Strategies · Activity (owner-facing) | Rebuilt |
| `/bot/research` | Previous research screens, unchanged (advanced) | Preserved |
| `/wallet` | Network, self-custody guide, create/import, accounts (balances, receive, copy, history), checked sends | Restructured |
| `/more` | Holdings, Price alerts, Connections & vault, Help & legal | Kept |
| `/portfolio` | Watched-address holdings, cost basis | Kept (a11y fix) |
| `/alerts`, `/connections`, `/support`, `/privacy`, `/terms`, 404 | Secondary | Kept (labels fixed) |

## 2. Navigation inventory (verified in Chromium)

| From | Control | To | Result |
|---|---|---|---|
| Any | Bottom nav Home / Markets / Bot / Wallet / More | `/`, `/markets`, `/bot`, `/wallet`, `/more` | PASS (1 tap each; active tab correct incl. nested pages) |
| Home | Watchlist row / position row / mover card | `/markets/:symbol` | PASS |
| Home | Trade · Set alert · Wallet | `/markets` · `/alerts` · `/wallet` | PASS |
| Home | Bot card "Open" | `/bot` | PASS |
| Markets | Row | `/markets/:symbol` | PASS (incl. coins outside top 100 via search) |
| Asset | ‹ Back | previous page | PASS (browser history; Android system back NOT VERIFIED) |
| Asset | Paper buy / sell | Trade sheet | PASS (sheet above nav after fix) |
| Asset | "Set a price alert" | `/alerts?symbol=X` (pre-selected) | PASS |
| Bot | Overview / Strategies / Activity | same page, tab in URL | PASS |
| Bot | Research Lab link | `/bot/research` | PASS |
| More | Holdings / Price alerts / Connections / Help items | respective routes, More tab stays active | PASS |
| Unknown URL | — | Not-found page | PASS |

## 3. Action inventory (main controls)

| Action | Expected | Observed | Result |
|---|---|---|---|
| Open paper account ($20–$1,000) | Account created, persisted | $1,000.00 shown; survives reload | PASS |
| Paper buy $100 BTC (double-tap) | One fill, fee charged | 1 order; cash $900.00; fee $0.60 | PASS |
| Paper buy over 50% limit | Refused with reason | "Position limit … at most 50% ($499.70)" | PASS |
| Paper sell all | Position closed, realized P&L | ▼ −$1.23 (fees + spread), equity $998.77 | PASS |
| Stale price | Order refused | Unit-tested (60 s limit) | PASS (unit) |
| Pause / resume paper trading | Orders refused while paused | Unit-tested; button in Bot → Protections | PASS (unit) / UI present |
| Watchlist ☆ / Edit | Persisted toggle | Persisted across reload | PASS |
| Market search "pepe" | Finds coin, readable price | `$0.00000341` (was `$0.00` → fixed) | PASS |
| Wallet import (BIP39 test phrase) | Correct addresses | BTC tb1…, ETH 0x9858… vector | PASS |
| Wallet Receive → Copy | Address on clipboard | tb1q… copied | PASS |
| Wallet History (BTC) | Recent transactions | Real testnet history listed | PASS |
| Send to invalid / wrong-network address | Refused before signing | "Not a valid Bitcoin address"; "This is a real (mainnet) Bitcoin address" | PASS |
| Send with RPC on wrong chain | Refused before signing | "This RPC is on chain 1, not Ethereum Sepolia" | PASS |
| Send review step | Summary before signing | "Send 0.001 BTC on Bitcoin testnet to … ?" → Confirm | PASS |
| Actual on-chain send | Broadcast | NOT VERIFIED (no test funds; not attempted) |
| Alerts while app closed | Phone notification | NOT AVAILABLE (alerts work only while the app is open) |

## 4. Defects found and fixed in this pass

| # | Severity | Defect | Fix |
|---|---|---|---|
| 1 | High | ETH/SOL send kept Sepolia/devnet RPC after switching to mainnet; no address-network check | Network-bound RPC defaults, per-network address validation, RPC chain verification, review step |
| 2 | High | Bottom sheets rendered under the bottom nav (transform stacking context): confirm buttons unreachable on phones | Sheet portalled to `<body>`, scrollable, max 90 vh |
| 3 | Medium | Sub-cent prices displayed as `$0.00` | 4 significant digits below $0.01 |
| 4 | Medium | Home hero showed an uninformative watched balance ($0.00 when nothing tracked) | Paper-account hero; watched card only when addresses exist |
| 5 | Medium | Fee-sized account moves drawn as crashes | Chart minimum range = 2% of starting balance |
| 6 | Low | Unlabelled selects, unfocusable scroll region, colour-only links | Fixed → 0 axe violations on 15 routes |

## 5. Design specification (implemented)

- **Navigation:** Home · Markets · Bot · Wallet · More (bottom, 56 px targets, safe-area aware). Secondary pages under More.
- **Tokens:** ink surfaces `#0A0E15 / #121923 / #19222F / #253142`, accent Helix Cyan `#4CC9E8`, up `#35C48F`, down `#F26E6E`, paper `#E9A33C`; muted text tuned for AA contrast.
- **Type:** Instrument Sans (UI), IBM Plex Mono with tabular figures for every number; bundled offline.
- **Components** (`src/components/ui.tsx`): PageHeader (back), Panel, Change (sign + arrow, never colour alone), Money, CoinBadge, Button (primary / secondary / danger / ghost, ≥48 px), Sheet (focus, Escape, backdrop, portal), Segmented, Note.
- **States:** loading skeletons, empty states with the next action, error text with cause, stale/delayed data labels, source + age on market data, "paper" labels wherever simulated money appears.

## 6. Final assessment

| Category | Result | Evidence |
|---|---|---|
| Visual quality | PASS (browser) | Consistent tokens/components on primary pages; older pages (Connections, Alerts, Holdings, Wallet access block) still use the previous layout |
| Navigation | PASS (browser) / NOT VERIFIED (device back gesture) | Section 2 |
| Functionality | PASS for listed actions | Section 3; 84 automated tests |
| Trading bot usability | PASS | Overview answers status, capital, P&L, reasons, protections |
| Wallet usability | PASS (browser) | Guide, accounts, receive, history, checked sends; on-chain send NOT VERIFIED |
| Accessibility | PASS for WCAG 2.2 AA automated rules (0 axe violations, 15 routes) | 71/300 controls are 36–43 px (pass WCAG's 24 px, below Android's 48 dp guidance); TalkBack NOT VERIFIED |
| Reliability | PASS (browser) | Reconnecting price feed, cached market lists, stale-price refusal; long-run stability on device NOT VERIFIED |
| Security | PASS for reviewed paths | Paper-only lock; keys encrypted (existing vault); no exchange secrets accepted; send pre-checks. No independent security audit |
| Private testing readiness | PASS | Debug APK built by CI from this branch |
| Public release readiness | FAIL | Debug signing, placeholder legal text, no device QA, alerts not delivered in background, OMEGA source not reconciled |

## 7. Remaining blockers

1. Real-device QA (back gesture, TalkBack, performance) — needs USB/wireless debugging access.
2. Background price alerts (Capacitor Local Notifications) not implemented.
3. Older secondary pages not yet moved to the new components.
4. Ethereum wallet history needs an indexer (explorer link provided).
5. Network filters, DEX pools and new-listing feeds: no free reliable source integrated.
6. OMEGA source on the owner's PC not reconciled with this app.
