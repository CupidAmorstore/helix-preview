# 16 — Competitive benchmark

**Method disclosure:** no competitor app was installed or tested in this session. The comparison below is based on
the auditor's general product knowledge of these products as publicly documented (training knowledge, not
re-verified on 2026-11-25). Treat every competitor cell as *unverified*; verify before using in marketing.

| Competitor | Workflow compared | Their strength | HELIX equivalent | HELIX gap | Opportunity | Complexity |
|---|---|---|---|---|---|---|
| Coinbase | browse → asset → buy | instant real buys, polished charts, education ("Learn") | live Coinbase prices, paper buy against the real order book with fee shown before and after | no real trading (by design), no limit orders, no education layer | "practise with Coinbase's real order book before risking money" | low–medium |
| Kraken Pro | pro charting, order types | advanced orders, depth charts | market orders only, line chart | limit/stop orders, depth | paper limit orders with honest maker-fee model (needs fee evidence) | medium |
| Binance | breadth of markets, bots (grid/DCA) | many bot templates with public "ROI" leaderboards | research bot that refuses to trade without evidence | no templates; no running bots | **transparency as the product**: every rejected strategy and why — the opposite of ROI leaderboards | low |
| Crypto.com | onboarding, rewards | slick onboarding | one-screen paper account opening | no onboarding flow explaining wallet vs paper | 3-screen onboarding | low |
| TradingView | charts, paper trading | best-in-class charts, paper trading on many brokers | basic line chart + paper trading | indicators, drawing, candles | candles + 2–3 indicators | medium |
| MetaMask / Trust Wallet / Phantom | self-custody wallet | send/swap/dApps | encrypted vault, BTC/ETH/SOL addresses, sending disabled | no sending (by design until authorized) | keep wallet as "view & receive" until security review | — |
| 3Commas / Pionex | trading bots | bot automation, marketplace | gated research + forward paper protocol | no automation (by design) | honest bot evaluation (gates, forward evidence) as a differentiator | — |
| CoinMarketCap / CoinGecko | discovery, data | coverage, categories | Coinbase-tradable focus with live prices | categories, new listings | "tradable on Coinbase" filter | low |

## Where HELIX can be genuinely different (supported by implemented features)
1. **Radical research transparency**: 199 tests, 0 approved, every reason shown; a bot that holds cash and says why.
2. **Paper trading against the real order book** with fees shown before and after each order (verified to the cent).
3. **Small-account honesty**: capital-tier feasibility ($20–$1,000) — most products hide that fees dominate small accounts.
These are differentiators only if explained clearly (see 06 and 17).
