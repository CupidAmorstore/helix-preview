# Full app inspection — 2026-11-23

Owner report: "App is bugged". Every route and every control was exercised in a 412×915 Android-sized browser (Playwright, touch). This is **not** a physical-device test; Android-only fixes below are verified by unit tests and code, not on a phone.

## Method
1. Click crawl (`docs/qa/click-crawl.cjs`): 20 routes × every visible button/link, fresh page per click, logging page errors, console errors and failed requests. Run twice: new user, and with a paper account.
2. Feature checks (`docs/qa/functional-check.cjs`): 64 assertions over every flow (account, nav, markets, asset, paper buy/sell/limits/pause, bot, lab tabs, alerts, vault, watch addresses, portfolio, wallet, More pages, unknown coin).

## Bugs found and fixed
| # | Where | Bug | Fix |
|---|---|---|---|
| 1 | Android | Back button closed the app from any screen | `@capacitor/app` back handler: closes sheet → goes back → Home → exit only from Home |
| 2 | Android 15+ | Edge-to-edge (target SDK 36): header under the status bar, tabs under the gesture bar | `viewport-fit=cover` + safe-area padding on header and tab bar |
| 3 | Android | External links (`target=_blank`) did nothing in the WebView | handed to the system browser |
| 4 | Android | New screen kept the previous scroll position | scroll to top on navigation |
| 5 | Web | `/privacy`, `/terms`, `/support` served old static pages (old branding) instead of the app | removed shadowing `public/*.html`; regression test |
| 6 | Vault (security) | **Any password "unlocked" the vault**; keys could then be saved under a wrong key | password verifier (AES-GCM check), legacy vaults verified against existing data; "Wrong password." |
| 7 | Vault (security) | 5-character vault password accepted | minimum 10 characters, hint shown |
| 8 | Connections | Empty/invalid watch address saved | validated per chain; clear message |
| 9 | Alerts | Empty price silently ignored | validation message |
| 10 | Alerts | Alerts only fired while the Alerts page was open | app-wide watcher; banner on any screen; fires once, re-arms |
| 11 | Asset | "Set a price alert" on non-core coins silently switched to BTC | shown only for supported coins |
| 12 | Asset | Unknown coin showed an empty page claiming CoinGecko prices | "We couldn't find a coin called …" + Search markets |
| 13 | Portfolio | Table cut off on phones; copy mentioned removed exchange balances | phone list layout; honest copy |
| 14 | Bitcoin data | Single provider; intermittent "Address lookup failed" | Blockstream → mempool.space fallback for balance, history, UTXOs, fees, broadcast |
| 15 | Page title | "HELIX (Apex App)" in title/description | corrected |

## Result
- Click crawl: 0 page crashes, 0 JS errors on 20 routes. Only network error: the daily feed `data/latest.json` 404 until PR #3 is merged (handled, readable message).
- Feature checks: **64/64 pass** on the final build. Unit tests: 120/120.

## Not verifiable here
- Physical Android behaviour (back button, insets, keyboard, external links) — needs the APK on a phone.
- Push notifications while the app is closed (not implemented; stated in the Alerts page).
