# 06 — Complete text and copy audit

Text registry: **2843** visible text elements across 32 page-states, **1337** unique strings (`evidence/text-registry.json`, with route and position). Every unique string was screened by rules (below); key screens were read in full by hand (Home, Bot ×3, Wallet, Alerts, Connections, USDC page, Legal pages).

## Rule hits (each with location)
### internal parameter string shown to users — 53
- `/bot?tab=activity` — “BTC-USD 1d sma_cross(fast=10,slow=100)”
- `/bot?tab=activity` — “BTC-USD 1d donchian_breakout(entry=20,exit=20)”
- `/bot?tab=activity` — “BTC-USD 1d ts_momentum(lookback=24,threshold=0)”
- `/bot?tab=activity` — “BTC-USD 1d trend_filtered_momentum(filter=200,lookback=24)”
- `/bot?tab=activity` — “BTC-USD 1d bollinger_reversion(k=2.5,maxHold=24,n=20)”
- `/bot?tab=activity` — “BTC-USD 1d rsi_reversion(hi=55,lo=25,maxHold=24,n=14)”
- `/bot?tab=activity` — “BTC-USD 1d vol_compression_breakout(lookback=120,n=20,pct=0.1)”
- `/bot?tab=activity` — “ETH-USD 1d sma_cross(fast=10,slow=200)”
- `/bot?tab=activity` — “ETH-USD 1d donchian_breakout(entry=20,exit=10)”
- `/bot?tab=activity` — “ETH-USD 1d ts_momentum(lookback=24,threshold=0)”
- `/bot?tab=activity` — “ETH-USD 1d trend_filtered_momentum(filter=200,lookback=24)”
- `/bot?tab=activity` — “ETH-USD 1d bollinger_reversion(k=2,maxHold=24,n=20)”
- … 41 more in `evidence/text-flags.json`
### grammar: singular/plural — 20
- `/bot?tab=strategies` — “Cross-sectional momentum · risk Medium-high · 1 tests · 0 reached the final test”
- `/bot?tab=activity` — “1 bars · 0 trades · in cash”
- `/bot?tab=activity` — “0 bars · 0 trades · in cash”
- `/bot/research?tab=strategies` — “XRP-USD · 1d · validation +14.7% net ( 1 trades)”
- `/bot/research?tab=strategies` — “DOGE-USD · 1d · validation +4.9% net ( 1 trades)”
- `/bot/research?tab=strategies` — “SOL-USD · 1d · validation +3.4% net ( 1 trades)”
- `/bot/research?tab=strategies` — “AVAX-USD · 1h · validation +3.3% net ( 1 trades)”
- `/bot/research?tab=strategies` — “LTC-USD · 1h · validation -0.3% net ( 1 trades)”
- `/bot/research?tab=strategies` — “ADA-USD · 1h · validation -1.0% net ( 1 trades)”
- `/bot/research?tab=strategies` — “XRP-USD · 1d · validation -1.0% net ( 1 trades)”
- `/bot/research?tab=strategies` — “BTC-USD · 1d · validation -1.6% net ( 1 trades)”
- `/bot/research?tab=strategies` — “LTC-USD · 1h · validation -3.7% net ( 1 trades)”
- … 8 more in `evidence/text-flags.json`
### awkward wording — 11
- `/bot?tab=strategies` — “Trend · risk Medium · 22 tests · 1 reached the final test”
- `/bot?tab=strategies` — “Trend · risk Medium · 22 tests · 0 reached the final test”
- `/bot?tab=strategies` — “Trend · risk Medium-high · 22 tests · 0 reached the final test”
- `/bot?tab=strategies` — “Volatility · risk Medium-high · 22 tests · 0 reached the final test”
- `/bot?tab=strategies` — “Mean reversion · risk High · 22 tests · 1 reached the final test”
- `/bot?tab=strategies` — “Mean reversion · risk High · 22 tests · 0 reached the final test”
- `/bot?tab=strategies` — “Risk-managed trend · risk Medium · 11 tests · 1 reached the final test”
- `/bot?tab=strategies` — “Cross-sectional momentum · risk Medium-high · 1 tests · 0 reached the final test”
- `/bot?tab=strategies` — “Hybrid · risk Medium-high · 11 tests · 1 reached the final test”
- `/bot?tab=strategies` — “Multi-week trend · risk Medium · 11 tests · 0 reached the final test”
- `/bot?tab=strategies` — “Multi-month momentum · risk Medium-high · 11 tests · 0 reached the final test”
### unimplemented feature disclosed — 4
- `/markets` — “List: CoinGecko , updated 2s ago . Main coins use live Coinbase prices; 24h change from Coinbase where live. E”
- `/markets/BTC` — “Coinbase stats 2s ago · CoinGecko 2s ago . Network and liquidity-pool data are not available yet.”
- `/markets/USDC` — “Coinbase stats unavailable · CoinGecko 2s ago . Network and liquidity-pool data are not available yet.”
- `/bot/research?tab=watchbot` — “Same asset on several venues or chains counts as one exposure. DEX/multichain discovery is not yet implemented”
### label shows data-refresh time, not research run — 3
- `/bot` — “Last successful research run”
- `/bot?tab=activity` — “Last run 7 h ago .”
- `/bot?tab=activity` — “Last run 8 h ago .”
### cryptic link label — 3
- `/wallet` — “uo1”
- `/wallet` — “sepoliafaucet”
- `/wallet` — “solfaucet”
### placeholder visible to users — 3
- `/support` — “[TODO: Legal review required] Replace this section with official support commitments and response SLAs.”
- `/privacy` — “[TODO: Legal review required] Replace this summary with a full privacy policy before launch.”
- `/terms` — “[TODO: Legal review required] Replace this summary with a full terms of service before launch.”
### overstated: fees are modelled — 1
- `/bot` — “Every idea is tested on data it has never seen, with real fees. None passed every test, so the bot places no t”
### unsupported claim (no schedule runs) — 1
- `/bot` — “GitHub Actions, scheduled daily · no published run received yet”

## Hand review — key replacements
| Location | Current | Problem | Recommended |
|---|---|---|---|
| Bot › Overview | Last successful research run 2026-11-25 15:49 UTC | It is the data-refresh time | Research run: 2026-11-24 19:37 UTC · Prices refreshed: 15:49 UTC |
| Bot › Overview | GitHub Actions, scheduled daily · no published run received yet | Not scheduled; feed missing | Run manually by the developer · no automatic updates yet |
| Bot › Overview | Every idea is tested on data it has never seen, with real fees. | Fees are modelled | …with realistic modelled fees (0.60% + spread). |
| Bot › Overview | 199 Tested · 4 Reached unseen test · 0 Approved | Undefined | 199 strategy tests (12 types × 10 coins) · 4 reached the final unseen test · 0 approved |
| Bot › Strategies | Each strategy was tested on 10 coins (daily and hourly data)… | Not true for 4 types | Each strategy type was tested on up to 10 coins, on daily and/or hourly data… |
| Bot › Activity | BTC-USD 1d sma_cross(fast=10,slow=100) | Internal key | BTC daily · Trend following (10/100-day averages) |
| Bot › Activity | 2 bars · 0 trades · in cash | OK; '1 bars' elsewhere | pluralize |
| Trade sheet | Paper trading is paused. Resume it in Bot → Risk. | Path does not exist | Paper trading is paused. [Resume] (inline) |
| Wallet | Faucets: BTC testnet uo1, ETH Sepolia sepoliafaucet, SOL devnet solfaucet. | Cryptic | Free test coins: Bitcoin testnet · Ethereum Sepolia · Solana devnet (links) |
| Support/Privacy/Terms | [TODO: Legal review required] … | Placeholder | Real text after qualified review |
| Asset (CoinGecko down) | We couldn't find a coin called USDC on Coinbase or in the top 100… | False | Market data is temporarily unavailable. Try again. |
| Alerts subtitle | Checked against live Coinbase prices while HELIX is open | Accurate; but 'alerts' implies background | keep + 'No notifications when the app is closed.' |

## Strengths (keep)
Plain-language strategy descriptions; 'These are zero because the bot has not traded, not because it broke even'; 'Simulated. No real order is sent.'; fee shown before and after every order; consistent 'Paper money · no real orders' banner.
