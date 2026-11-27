# 05 — Page-by-page audit

Per page-state: route, purpose, crawl metrics (load, elements, text), layout and accessibility results, verdict. Screens in `evidence/screens/<state>-<key>.png`. Load times are browser (localhost) not device.

| State | Page | Route | Purpose | Load ms | Interactive | Text | Overflow @130/200% | axe | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| fresh | home | `/` | Paper-account entry + market snapshot + bot status | 2271 | 20 | 47 | no/yes | clean | Keep. First screen explains paper trading well; does not introduce wallet or what makes HELIX different; "Weakest 24h" can show a rising coin (relative wording). |
| fresh | markets | `/markets` | Discover and sort coins | 2242 | 114 | 419 | no/yes | clean | Keep. Search over all Coinbase markets, sort by cap/volume/change, watchlist. CoinGecko rate limits degrade silently (MD-3). |
| fresh | asset-btc | `/markets/BTC` | Price, chart, paper trade, holdings, stats | 2242 | 19 | 45 | no/yes | clean | Keep. Strongest page: live price verified, chart colour by direction, trade sheet reconciles to the cent. Line chart only; no candles/indicators. |
| fresh | asset-usdc | `/markets/USDC` | Coin without a Coinbase USD pair | 2240 | 8 | 36 | no/no | clean | Keep. Explains no live chart/trading; misleading "not found" when CoinGecko fails (MD-2). |
| fresh | asset-unknown | `/markets/NOTACOIN` | Unknown coin | 2234 | 8 | 11 | no/no | clean | Keep. Clear not-found message with search. |
| fresh | bot-overview | `/bot` | Why the bot holds cash; capital; protections | 2241 | 12 | 92 | no/yes | clean | Keep. Honest; P1 copy defects (BOT-1/2), unexplained 199/4/0 (BOT-3), wasted band (UX-3). |
| fresh | bot-strategies | `/bot?tab=strategies` | Plain-language strategy catalogue with evidence | 2242 | 21 | 73 | no/yes | clean | Keep. Inaccurate intro sentence (TXT-3), grammar (TXT-2). |
| fresh | bot-activity | `/bot?tab=activity` | Bot trades, research runs, forward experiments | 2242 | 9 | 90 | no/yes | clean | Keep. Missing the 3 activated forward rules (QR-1); raw parameter strings (TXT-1). |
| fresh | lab-overview | `/bot/research?tab=overview` | Advanced research overview | 2249 | 14 | 96 | no/no | clean | Keep (advanced). Dense but accurate. |
| fresh | lab-strategies | `/bot/research?tab=strategies` | Every candidate with windows, costs, reasons | 2240 | 219 | 623 | no/no | clean | Keep (advanced). 200+ rows; filters work; rows are 22 px touch targets (A11Y-2). |
| fresh | lab-lab | `/bot/research?tab=lab` | Datasets and assumptions | 2242 | 15 | 166 | no/no | scrollable-region-focusable(serious) | Keep (advanced). axe scrollable-region violation (A11Y-4). |
| fresh | lab-watchbot | `/bot/research?tab=watchbot` | Market coverage/regimes | 2243 | 15 | 145 | no/no | clean | Keep (advanced). |
| fresh | lab-risk | `/bot/research?tab=risk` | Capital feasibility, risk policy | 2243 | 18 | 233 | yes/yes | clean | Keep. Overflows at 130%/200% text and at 320 px (A11Y-1). |
| fresh | lab-activity | `/bot/research?tab=activity` | Run history and forward accounts | 2250 | 36 | 189 | no/no | clean | Keep (advanced). Tiny expandable rows. |
| fresh | lab-settings | `/bot/research?tab=settings` | Research settings | 2245 | 15 | 35 | no/no | clean | Keep (advanced). |
| fresh | portfolio | `/portfolio` | Watched addresses (read-only balances) | 2242 | 10 | 18 | no/yes | clean | Rename consistently (UX-5); Refresh gives no feedback when empty (UX-1). |
| fresh | more | `/more` | Secondary navigation | 2241 | 13 | 28 | no/no | clean | Keep. Clear descriptions per item. |
| fresh | connections | `/connections` | Vault password, watched addresses, API keys | 2241 | 19 | 25 | no/yes | clean | Keep. "Lock vault" active without a vault (UX-2). |
| fresh | alerts | `/alerts` | In-app price alerts | 2238 | 12 | 21 | no/no | clean | Keep, but alerts only work while the app is open — a limitation users will not expect from "alerts". |
| fresh | orders | `/orders` | Paper order history | 2237 | 8 | 12 | no/no | clean | Keep. Filters work; no export (DAT-1). |
| fresh | wallet | `/wallet` | Self-custody wallet (receive only) | 2237 | 24 | 50 | no/no | clean | Keep. Good guide; unlabelled input (A11Y-3); cryptic faucet labels (TXT-4). |
| fresh | access | `/access` | "This preview is free" (orphan) | 2244 | 10 | 16 | no/no | clean | Link from More or remove (UX-4). |
| fresh | support | `/support` | Support | 2247 | 6 | 11 | no/yes | clean | Not launchable: TODO text, GitHub issues only (TR-1, SUP-1). |
| fresh | privacy | `/privacy` | Privacy policy | 2243 | 6 | 13 | no/no | clean | Not launchable: TODO text (TR-1); content otherwise accurate. |
| fresh | terms | `/terms` | Terms | 2248 | 6 | 13 | no/no | clean | Not launchable: TODO text (TR-1). |
| fresh | notfound | `/does-not-exist` | 404 | 2237 | 6 | 10 | no/no | clean | Keep. |
| account | home | `/` | Paper-account entry + market snapshot + bot status | 2223 | 21 | 58 | no/yes | clean | Keep. First screen explains paper trading well; does not introduce wallet or what makes HELIX different; "Weakest 24h" can show a rising coin (relative wording). |
| account | asset-btc | `/markets/BTC` | Price, chart, paper trade, holdings, stats | 2225 | 19 | 45 | no/yes | clean | Keep. Strongest page: live price verified, chart colour by direction, trade sheet reconciles to the cent. Line chart only; no candles/indicators. |
| account | bot-overview | `/bot` | Why the bot holds cash; capital; protections | 2226 | 13 | 94 | no/yes | clean | Keep. Honest; P1 copy defects (BOT-1/2), unexplained 199/4/0 (BOT-3), wasted band (UX-3). |
| account | bot-activity | `/bot?tab=activity` | Bot trades, research runs, forward experiments | 2220 | 9 | 90 | no/yes | clean | Keep. Missing the 3 activated forward rules (QR-1); raw parameter strings (TXT-1). |
| account | portfolio | `/portfolio` | Watched addresses (read-only balances) | 2218 | 10 | 18 | no/yes | clean | Rename consistently (UX-5); Refresh gives no feedback when empty (UX-1). |
| account | orders | `/orders` | Paper order history | 2220 | 10 | 21 | no/no | clean | Keep. Filters work; no export (DAT-1). |

## Pages that do not yet deserve to exist in their current form
- **Support / Privacy / Terms**: placeholder legal text shown to users (TR-1).
- **/access**: orphan; either link it or remove it (UX-4).
## Missing pages users will expect (only where tied to a real objective)
- Onboarding (ONB-1). - Security & privacy explainer (what leaves the device). - Paper account export (DAT-1).

Header vs title: at scroll 0 the sticky header never overlaps any page title (all 32 page-states); see HDR-1 for the owner's device report.
