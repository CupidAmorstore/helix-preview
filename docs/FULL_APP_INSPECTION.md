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

---

# Deep checkup — 2026-11-23 (second pass)

Scripts: `docs/qa/deep-check.cjs` (offline, persistence, money math, small screens + 130% text, axe WCAG 2.1 AA, price accuracy, 2.5-min session) and `docs/qa/wallet-flow.cjs` (wallet lifecycle). Browser viewport only; no Android emulator is possible here (no KVM).

## Additional bugs found and fixed
| # | Area | Bug | Fix |
|---|---|---|---|
| 16 | Offline / updates | Opening a screen not yet visited while offline (or after a new deploy) **blanked the whole app** (`Failed to fetch dynamically imported module`) | lazy screens retry once, then show "This screen needs a connection / didn't load" with Try again; per-screen error boundary; common screens prefetched in the background |
| 17 | Prices | "Live Coinbase prices" stayed on after the connection dropped | feed listens to the phone's offline/online events: "No connection · showing the last prices received" within 2 s, reconnects immediately when back; delayed threshold 30 s → 15 s |
| 18 | Wallet (security) | Decrypted recovery phrase stayed in memory after the vault auto-locked | phrase cleared whenever the vault locks |
| 19 | Wallet | After a restart, "Unlock wallet" only said "Unlock the vault first" (password box was in More → Connections) | vault password (create or unlock) directly on the Wallet screen |
| 20 | Wallet (safety) | "Delete keystore" erased the wallet in one tap | hidden behind a disclosure, explains the risk, requires typing DELETE |

## Results
| Check | Result |
|---|---|
| Paper account, positions, watchlist, alerts survive an app restart | pass |
| Money: $40 buy → cash $460.00, fee $0.24 (0.60%), equity = cash + invested | pass (to the cent) |
| Offline: Home/Markets/Asset/Bot keep working; Wallet explains it needs a connection; no crashes; prices recover | pass |
| 320 px screen and 360 px with 130% text (≈ Android large font): nothing off-screen on 13 routes | pass |
| Accessibility: axe WCAG 2.1 A/AA on 13 routes | 0 violations |
| BTC price vs Coinbase ticker | 0.034% apart (live tick timing) |
| 2.5-minute navigation session | heap 3.5 → 10.6 MB; 11 sockets for 35 screen changes (closed on leave) |
| Wallet lifecycle (create vault, import, restart, wrong password, open, lock clears phrase, guarded delete) | 10/10 |
| Research reproducibility (fresh registry, stored datasets, offline) | 100/100 daily candidates identical; hourly not re-run (stored data now stale, by design) |

## Known, not changed
- `npm audit`: 4 moderate advisories in `uuid` pulled in by `@solana/web3.js` (buffer bounds in v3/v5/v6 with a caller-supplied buffer; HELIX never calls those). The only fix is web3.js v3, which breaks the wallet API. Tracked.
- Main bundle 488 KB (includes the bundled research snapshot); wallet libraries load only on the Wallet screen.
- `public/CNAME`, `robots.txt`, `sitemap.xml` still name `apexcryptodesk.com` (from the earlier "temporary domain" commit). GitHub Pages ignores the CNAME file with the current deploy action; left for the owner to decide.
- APK manifest: debug build (`debuggable`), `allowBackup=true` (keystore is encrypted). Release signing needs the owner's keystore.
