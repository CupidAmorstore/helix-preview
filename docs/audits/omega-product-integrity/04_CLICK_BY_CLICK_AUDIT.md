# 04 — Click-by-click audit

Every discovered element, activated in its own fresh disposable browser context (412×915, touch). Per element: initial state, activation, resulting URL/dialog/content change, page and console errors, Escape/back for dialogs, 5× rapid re-activation for same-page controls. Screens: `evidence/screens/`.
**Statuses:** VERIFIED PASS = workflow outcome independently checked; PASS (navigation/external/dialog) = control does what its label says; RESPONDS = reacts but the end-to-end outcome was not independently verified; defects reference `19_COMPLETE_DEFECT_REGISTER.csv`.

## Status totals
| Status | Count |
|---|---|
| SAME AS (identical control) | 494 |
| RESPONDS | 109 |
| PASS | 77 |
| NO VISIBLE TEXT CHANGE | 48 |
| VERIFIED PASS | 8 |
| FUNCTIONAL BUT POOR UX | 4 |
| NOT APPLICABLE | 3 |
| MISLEADING | 2 |
| **Total** | **745** |

Network errors seen on almost every element: GitHub Pages feed 404 (BOT-2); CoinGecko 429 (shown as CORS) caused by crawl volume.

## Every element
| ID | State | Route | Kind | Label | Size | Status |
|---|---|---|---|---|---|---|
| I-0001 | fresh | `/` | a | HELIX home | 97×44 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0002 | fresh | `/` | button | $20 | 126×52 | VERIFIED PASS — selection announced (aria-pressed) |
| I-0003 | fresh | `/` | button | $50 | 126×52 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0004 | fresh | `/` | button | $100 | 126×52 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0005 | fresh | `/` | button | $250 | 126×52 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0006 | fresh | `/` | button | $500 | 126×52 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0007 | fresh | `/` | button | $1,000 | 126×52 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0008 | fresh | `/` | button | Open paper account | 380×48 | VERIFIED PASS — paper account opens (reconciliation run) |
| I-0009 | fresh | `/` | a | STRONGEST 24H LINK ▲ +1.72% | 190×67 | PASS (navigation) → /markets/LINK |
| I-0010 | fresh | `/` | a | WEAKEST 24H ETH ▲ +0.11% | 190×67 | PASS (navigation) → /markets/ETH |
| I-0011 | fresh | `/` | a | All markets | 73×44 | PASS (navigation) → /markets |
| I-0012 | fresh | `/` | a | BTC Bitcoin BTC $59,934.79 ▲ +0.32% | 380×56 | PASS (navigation) → /markets/BTC |
| I-0013 | fresh | `/` | a | ETH Ethereum ETH $1,679.49 ▲ +0.11% | 380×56 | SAME AS I-0009 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0014 | fresh | `/` | a | SOL Solana SOL $70.19 ▲ +0.89% | 380×56 | SAME AS I-0009 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0015 | fresh | `/` | a | Open | 36×44 | PASS (navigation) → /bot |
| I-0016 | fresh | `/` | a | Home | 82×56 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0017 | fresh | `/` | a | Markets | 82×56 | PASS (navigation) → /markets |
| I-0018 | fresh | `/` | a | Bot | 82×56 | PASS (navigation) → /bot |
| I-0019 | fresh | `/` | a | Wallet | 82×56 | PASS (navigation) → /wallet |
| I-0020 | fresh | `/` | a | More | 82×56 | PASS (navigation) → /more |
| I-0021 | fresh | `/markets` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0022 | fresh | `/markets` | input | Search coins (all Coinbase markets) | 329×46 | RESPONDS — accepts input (invalid input sanitized: no inline error) |
| I-0023 | fresh | `/markets` | button/radio | All | 18×44 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0024 | fresh | `/markets` | button/radio | Watchlist | 61×44 | RESPONDS — content changes; workflow not independently verified |
| I-0025 | fresh | `/markets` | button/radio | Gainers | 49×44 | RESPONDS — content changes; workflow not independently verified |
| I-0026 | fresh | `/markets` | button/radio | Losers | 42×44 | RESPONDS — content changes; workflow not independently verified |
| I-0027 | fresh | `/markets` | button/radio | Market cap | 79×44 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0028 | fresh | `/markets` | button/radio | Volume | 59×44 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0029 | fresh | `/markets` | button/radio | 24h change | 80×44 | VERIFIED PASS — list re-sorted by 24h change |
| I-0030 | fresh | `/markets` | a | Bitcoin BTC · $1.21T $59,958.13 ▲ +0.36% | 380×60 | RESPONDS — content changes; workflow not independently verified |
| I-0031 | fresh | `/markets` | a | Ethereum ETH · $205.45B $1,680.74 ▲ +0.18% | 380×60 | PASS (navigation) → /markets/ETH |
| I-0032 | fresh | `/markets` | a | Tether USDT · $173.82B $0.9989 ▲ +0.02% | 380×60 | PASS (navigation) → /markets/USDT |
| I-0033 | fresh | `/markets` | a | BNB BNB · $72.35B $550.14 ▲ +0.19% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0034 | fresh | `/markets` | a | USDC USDC · $69.12B · = USD on Coinbase (no pair) $0.9994 ▼  | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0035 | fresh | `/markets` | a | XRP XRP · $59.3B $0.9331 ▲ +1.01% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0036 | fresh | `/markets` | a | Solana SOL · $41.61B $70.25 ▲ +0.98% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0037 | fresh | `/markets` | a | TRON TRX · $28.8B · no USD pair on Coinbase $0.303 ▼ −1.63% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0038 | fresh | `/markets` | a | Figure Heloc FIGR_HELOC · $28.47B · no USD pair on Coinbase  | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0039 | fresh | `/markets` | a | Hyperliquid HYPE · $14.56B $61.28 ▲ +1.51% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0040 | fresh | `/markets` | a | Zcash ZEC · $12.84B $752.50 ▲ +1.40% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0041 | fresh | `/markets` | a | Monero XMR · $9.78B · no USD pair on Coinbase $519.40 ▲ +1.8 | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0042 | fresh | `/markets` | a | Dogecoin DOGE · $8.74B $0.0557 ▲ +0.98% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0043 | fresh | `/markets` | a | LEO Token LEO · $8.29B · no USD pair on Coinbase $9.02 ▼ −0. | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0044 | fresh | `/markets` | a | WhiteBIT Coin WBT · $6.9B · no USD pair on Coinbase $58.20 ▲ | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0045 | fresh | `/markets` | a | Chainlink LINK · $6.9B $8.99 ▲ +1.74% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0046 | fresh | `/markets` | a | USDS USDS · $6.33B $0.9998 ▼ −0.00% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0047 | fresh | `/markets` | a | Cardano ADA · $5.46B $0.1451 ▲ +0.48% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0048 | fresh | `/markets` | a | Ethena USDe USDE · $4.91B · no USD pair on Coinbase $0.9998  | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0049 | fresh | `/markets` | a | Stellar XLM · $4.52B $0.1275 ▲ +2.38% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0050 | fresh | `/markets` | a | Dai DAI · $4.37B · no USD pair on Coinbase $1.00 ▲ +0.01% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0051 | fresh | `/markets` | a | Bitcoin Cash BCH · $4.1B $203.64 ▲ +3.23% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0052 | fresh | `/markets` | a | NEAR Protocol NEAR · $3.96B $3.02 ▲ +4.79% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0053 | fresh | `/markets` | a | Litecoin LTC · $3.3B $42.37 ▲ +3.53% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0054 | fresh | `/markets` | a | Canton CC · $3.1B · no USD pair on Coinbase $0.0772 ▲ +1.99% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0055 | fresh | `/markets` | a | Avalanche AVAX · $2.94B $6.59 ▲ +0.35% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0056 | fresh | `/markets` | a | Tether Gold XAUT · $2.9B · no USD pair on Coinbase $3,578.63 | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0057 | fresh | `/markets` | a | Uniswap UNI · $2.85B $4.70 ▼ −0.64% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0058 | fresh | `/markets` | a | USD1 USD1 · $2.85B $0.9999 ▲ +0.02% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0059 | fresh | `/markets` | a | Ripple USD RLUSD · $2.8B · no USD pair on Coinbase $0.9999 ▼ | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0060 | fresh | `/markets` | a | Gram (prev. Toncoin) GRAM · $2.78B · no USD pair on Coinbase | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0061 | fresh | `/markets` | a | Sui SUI · $2.74B $0.6615 ▲ +1.88% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0062 | fresh | `/markets` | a | Global Dollar USDG · $2.58B · no USD pair on Coinbase $1.00  | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0063 | fresh | `/markets` | a | Ondo US Dollar Yield USDY · $2.37B · no USD pair on Coinbase | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0064 | fresh | `/markets` | a | PayPal USD PYUSD · $2.31B · no USD pair on Coinbase $0.9996  | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0065 | fresh | `/markets` | a | Hedera HBAR · $2.3B $0.0518 ▲ +2.34% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0066 | fresh | `/markets` | a | Bittensor TAO · $2.12B $180.50 ▼ −0.46% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0067 | fresh | `/markets` | a | Circle USYC USYC · $2.12B · no USD pair on Coinbase $1.15 ▲  | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0068 | fresh | `/markets` | a | Spiko Amundi Overnight Swap Fund (EUR) EURSAFO · $2.11B · no | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0069 | fresh | `/markets` | a | Shiba Inu SHIB · $2.1B $0.00000357 ▲ +0.61% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0070 | fresh | `/markets` | a | Quant QNT · $2.1B $144.11 ▼ −2.79% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0071 | fresh | `/markets` | a | Cronos CRO · $2.08B $0.0401 ▲ +1.85% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0072 | fresh | `/markets` | a | Rain RAIN · $1.96B · no USD pair on Coinbase $0.00274 ▼ −4.7 | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0073 | fresh | `/markets` | a | MemeCore M · $1.88B · no USD pair on Coinbase $0.8171 ▲ +4.8 | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0074 | fresh | `/markets` | a | OKB OKB · $1.71B · no USD pair on Coinbase $81.54 ▲ +0.19% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0075 | fresh | `/markets` | a | Falcon USD USDF · $1.71B · no USD pair on Coinbase $0.9956 ▲ | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0076 | fresh | `/markets` | a | PAX Gold PAXG · $1.6B $3,579.16 ▲ +0.76% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0077 | fresh | `/markets` | a | United Stables U · $1.6B · no USD pair on Coinbase $0.9989 ▼ | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0078 | fresh | `/markets` | a | BlackRock USD Institutional Digital Liquidity Fund BUIDL · $ | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0079 | fresh | `/markets` | a | USDD USDD · $1.49B · no USD pair on Coinbase $0.9988 ▲ +0.07 | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0080 | fresh | `/markets` | a | Aave AAVE · $1.46B $94.67 ▲ +0.35% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0081 | fresh | `/markets` | a | Pepe PEPE · $1.45B $0.00000345 ▼ −0.92% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0082 | fresh | `/markets` | a | Venice Token VVV · $1.41B $28.57 ▲ +14.97% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0083 | fresh | `/markets` | a | Ondo ONDO · $1.37B $0.2804 ▲ +0.73% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0084 | fresh | `/markets` | a | World Liberty Financial WLFI · $1.35B $0.0428 ▲ +6.75% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0085 | fresh | `/markets` | a | Bitway BTW · $1.35B · no USD pair on Coinbase $0.8992 ▲ +14. | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0086 | fresh | `/markets` | a | Ethena ENA · $1.35B $0.1002 ▲ +1.83% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0087 | fresh | `/markets` | a | BFUSD BFUSD · $1.32B · no USD pair on Coinbase $0.9983 ▲ +0. | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0088 | fresh | `/markets` | a | HTX DAO HTX · $1.29B · no USD pair on Coinbase $0.00000145 ▼ | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0089 | fresh | `/markets` | a | Aster ASTER · $1.26B $0.4892 ▲ +2.03% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0090 | fresh | `/markets` | a | Mantle MNT · $1.23B · no USD pair on Coinbase $0.3721 ▲ +3.3 | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0091 | fresh | `/markets` | a | JUST JST · $1.18B · no USD pair on Coinbase $0.1475 ▲ +0.43% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0092 | fresh | `/markets` | a | Polkadot DOT · $1.12B $0.6552 ▲ +0.32% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0093 | fresh | `/markets` | a | Internet Computer ICP · $1.12B $2.00 ▲ +0.28% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0094 | fresh | `/markets` | a | Morpho MORPHO · $1.11B $1.58 ▲ +0.58% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0095 | fresh | `/markets` | a | Bitget Token BGB · $1.07B · no USD pair on Coinbase $1.53 ▼  | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0096 | fresh | `/markets` | a | Open USD OUSD · $1.01B · no USD pair on Coinbase $0.9997 ▼ − | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0097 | fresh | `/markets` | a | Pieverse PIEVERSE · $981.35M · no USD pair on Coinbase $3.57 | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0098 | fresh | `/markets` | a | Sky SKY · $973.4M $0.0418 ▲ +1.91% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0099 | fresh | `/markets` | a | Ethereum Classic ETC · $928.6M $5.84 ▲ +0.95% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0100 | fresh | `/markets` | a | USDGO USDGO · $922.96M · no USD pair on Coinbase $1.00 ▲ +0. | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0101 | fresh | `/markets` | a | Worldcoin WLD · $906.12M $0.2384 ▲ +1.08% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0102 | fresh | `/markets` | a | Pump.fun PUMP · $894.48M $0.002537 ▲ +3.18% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0103 | fresh | `/markets` | a | KuCoin KCS · $827.53M · no USD pair on Coinbase $5.93 ▼ −0.3 | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0104 | fresh | `/markets` | a | Midnight NIGHT · $811.26M · no USD pair on Coinbase $0.0488  | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0105 | fresh | `/markets` | a | POL (ex-MATIC) POL · $807.91M $0.0758 ▼ −0.15% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0106 | fresh | `/markets` | a | Pearl PEARL · $804.12M $2.06 ▼ −5.78% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0107 | fresh | `/markets` | a | Arbitrum ARB · $783.36M $0.1119 ▲ +1.72% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0108 | fresh | `/markets` | a | Jupiter JUP · $744.18M · no USD pair on Coinbase $0.2242 ▲ + | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0109 | fresh | `/markets` | a | Kaspa KAS · $734.55M · no USD pair on Coinbase $0.0264 ▲ +1. | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0110 | fresh | `/markets` | a | Render RENDER · $712.32M $1.28 ▲ +0.33% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0111 | fresh | `/markets` | a | Algorand ALGO · $705.15M $0.0776 ▼ −1.50% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0112 | fresh | `/markets` | a | Gate GT · $703.28M · no USD pair on Coinbase $6.72 ▲ +2.09% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0113 | fresh | `/markets` | a | GHO GHO · $697.56M · no USD pair on Coinbase $0.9979 ▼ −0.01 | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0114 | fresh | `/markets` | a | Cosmos Hub ATOM · $668.9M $1.23 ▼ −1.78% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0115 | fresh | `/markets` | a | Invesco Short Duration US Government Securities Fund USTB ·  | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0116 | fresh | `/markets` | a | NEXO NEXO · $625.66M · no USD pair on Coinbase $0.6257 ▼ −0. | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0117 | fresh | `/markets` | a | Pi Network PI · $622.4M · no USD pair on Coinbase $0.0546 ▼  | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0118 | fresh | `/markets` | a | Janus Henderson Anemoy AAA CLO Fund JAAA · $608.5M · no USD  | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0119 | fresh | `/markets` | a | Lighter LIT · $597.59M · no USD pair on Coinbase $2.39 ▼ −1. | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0120 | fresh | `/markets` | a | Injective INJ · $588.51M $5.89 ▲ +0.58% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0121 | fresh | `/markets` | a | Usual USD USD0 · $537M · no USD pair on Coinbase $0.9984 ▲ + | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0122 | fresh | `/markets` | a | Beldex BDX · $536.68M · no USD pair on Coinbase $0.0682 ▼ −0 | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0123 | fresh | `/markets` | a | XDC Network XDC · $516.66M · no USD pair on Coinbase $0.0259 | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0124 | fresh | `/markets` | a | EURC EURC · $504.09M · no USD pair on Coinbase $1.10 ▲ +0.13 | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0125 | fresh | `/markets` | a | TrueUSD TUSD · $493.75M · no USD pair on Coinbase $0.9984 ▲  | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0126 | fresh | `/markets` | a | PancakeSwap CAKE · $492.55M $1.55 ▲ +1.76% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0127 | fresh | `/markets` | a | Stacks STX · $490.33M $0.26 ▼ −0.34% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0128 | fresh | `/markets` | a | Filecoin FIL · $466.37M $0.5459 ▲ +1.80% | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0129 | fresh | `/markets` | a | Spiko EU T-Bills Money Market Fund EUTBL · $463.6M · no USD  | 380×60 | SAME AS I-0030 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0130 | fresh | `/markets` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0131 | fresh | `/markets` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0132 | fresh | `/markets` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0133 | fresh | `/markets` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0134 | fresh | `/markets` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0135 | fresh | `/markets/BTC` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0136 | fresh | `/markets/BTC` | button | Back | 44×44 | PASS (external link opens; target site not audited) |
| I-0137 | fresh | `/markets/BTC` | button | Remove from watchlist | 44×44 | VERIFIED PASS — toggles watchlist; BTC removed from Watchlist tab |
| I-0138 | fresh | `/markets/BTC` | a | Charting by TradingView | 35×19 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json · touch target < 24 px (A11Y-2) |
| I-0139 | fresh | `/markets/BTC` | button/radio | 1M | 40×40 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0140 | fresh | `/markets/BTC` | button/radio | 5M | 40×40 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0141 | fresh | `/markets/BTC` | button/radio | 15M | 40×40 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0142 | fresh | `/markets/BTC` | button/radio | 1H | 40×40 | VERIFIED PASS — 1-hour candles requested and drawn |
| I-0143 | fresh | `/markets/BTC` | button/radio | 4H | 40×40 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0144 | fresh | `/markets/BTC` | button/radio | 1D | 40×40 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0145 | fresh | `/markets/BTC` | button/radio | 1W | 40×40 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0146 | fresh | `/markets/BTC` | button | Paper buy | 186×48 | VERIFIED PASS — trade sheet; buy/sell reconciled to the cent (10) |
| I-0147 | fresh | `/markets/BTC` | button | Paper sell | 186×48 | NOT APPLICABLE — disabled in this state (by design) |
| I-0148 | fresh | `/markets/BTC` | a | Set a price alert for BTC | 380×48 | PASS (navigation) → /alerts?symbol=BTC |
| I-0149 | fresh | `/markets/BTC` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0150 | fresh | `/markets/BTC` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0151 | fresh | `/markets/BTC` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0152 | fresh | `/markets/BTC` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0153 | fresh | `/markets/BTC` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0154 | fresh | `/markets/USDC` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0155 | fresh | `/markets/USDC` | button | Back | 44×44 | PASS (external link opens; target site not audited) |
| I-0156 | fresh | `/markets/USDC` | button | Add to watchlist | 44×44 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0157 | fresh | `/markets/USDC` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0158 | fresh | `/markets/USDC` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0159 | fresh | `/markets/USDC` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0160 | fresh | `/markets/USDC` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0161 | fresh | `/markets/USDC` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0162 | fresh | `/markets/NOTACOIN` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0163 | fresh | `/markets/NOTACOIN` | button | Back | 44×44 | PASS (external link opens; target site not audited) |
| I-0164 | fresh | `/markets/NOTACOIN` | a | Search markets | 143×48 | PASS (navigation) → /markets |
| I-0165 | fresh | `/markets/NOTACOIN` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0166 | fresh | `/markets/NOTACOIN` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0167 | fresh | `/markets/NOTACOIN` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0168 | fresh | `/markets/NOTACOIN` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0169 | fresh | `/markets/NOTACOIN` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0170 | fresh | `/bot` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0171 | fresh | `/bot` | button/radio | Overview | 62×44 | PASS (navigation) → /bot?tab=overview |
| I-0172 | fresh | `/bot` | button/radio | Strategies | 65×44 | PASS (navigation) → /bot?tab=strategies |
| I-0173 | fresh | `/bot` | button/radio | Activity | 49×44 | PASS (navigation) → /bot?tab=activity |
| I-0174 | fresh | `/bot` | button | Check now | 106×44 | MISLEADING — reports "no newer research" when the feed is 404 (BOT-2) |
| I-0175 | fresh | `/bot` | a | Strategies | 65×44 | PASS (navigation) → /bot?tab=strategies |
| I-0176 | fresh | `/bot` | a | Research Lab · advanced: every test, dataset and run › | 380×52 | PASS (navigation) → /bot/research |
| I-0177 | fresh | `/bot` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0178 | fresh | `/bot` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0179 | fresh | `/bot` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0180 | fresh | `/bot` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0181 | fresh | `/bot` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0182 | fresh | `/bot?tab=strategies` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0183 | fresh | `/bot?tab=strategies` | button/radio | Overview | 60×44 | PASS (navigation) → /bot?tab=overview |
| I-0184 | fresh | `/bot?tab=strategies` | button/radio | Strategies | 68×44 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0185 | fresh | `/bot?tab=strategies` | button/radio | Activity | 49×44 | PASS (navigation) → /bot?tab=activity |
| I-0186 | fresh | `/bot?tab=strategies` | button | Trend following (moving averages) Hold a coin while its shor | 380×108 | RESPONDS — content changes; workflow not independently verified |
| I-0187 | fresh | `/bot?tab=strategies` | button | Momentum with trend filter Buy recent strength, but only whe | 380×108 | RESPONDS — content changes; workflow not independently verified |
| I-0188 | fresh | `/bot?tab=strategies` | button | Momentum Hold a coin after it has risen over a recent period | 380×108 | RESPONDS — content changes; workflow not independently verified |
| I-0189 | fresh | `/bot?tab=strategies` | button | Breakout Buy when price breaks above its recent range; exit  | 380×124 | RESPONDS — content changes; workflow not independently verified |
| I-0190 | fresh | `/bot?tab=strategies` | button | Calm-before-the-move breakout Buy a breakout that follows an | 380×108 | RESPONDS — content changes; workflow not independently verified |
| I-0191 | fresh | `/bot?tab=strategies` | button | Buy the dip (Bollinger bands) Buy after an unusually sharp d | 380×124 | RESPONDS — content changes; workflow not independently verified |
| I-0192 | fresh | `/bot?tab=strategies` | button | Oversold bounce (RSI) Buy when the RSI says a coin is overso | 380×124 | RESPONDS — content changes; workflow not independently verified |
| I-0193 | fresh | `/bot?tab=strategies` | button | Calm-market trend Follow the trend only while volatility is  | 380×124 | RESPONDS — content changes; workflow not independently verified |
| I-0194 | fresh | `/bot?tab=strategies` | button | Strongest coins rotation Each week hold the 1–3 coins that r | 380×124 | RESPONDS — content changes; workflow not independently verified |
| I-0195 | fresh | `/bot?tab=strategies` | button | Regime switcher Use trend following when the market trends a | 380×124 | RESPONDS — content changes; workflow not independently verified |
| I-0196 | fresh | `/bot?tab=strategies` | button | Weekly trend check Once a week, hold a coin only if it is ab | 380×124 | RESPONDS — content changes; workflow not independently verified |
| I-0197 | fresh | `/bot?tab=strategies` | button | 4-week momentum Every 28 days (a fixed cycle, not calendar m | 380×124 | RESPONDS — content changes; workflow not independently verified |
| I-0198 | fresh | `/bot?tab=strategies` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0199 | fresh | `/bot?tab=strategies` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0200 | fresh | `/bot?tab=strategies` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0201 | fresh | `/bot?tab=strategies` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0202 | fresh | `/bot?tab=strategies` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0203 | fresh | `/bot?tab=activity` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0204 | fresh | `/bot?tab=activity` | button/radio | Overview | 60×44 | PASS (navigation) → /bot?tab=overview |
| I-0205 | fresh | `/bot?tab=activity` | button/radio | Strategies | 65×44 | PASS (navigation) → /bot?tab=strategies |
| I-0206 | fresh | `/bot?tab=activity` | button/radio | Activity | 51×44 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0207 | fresh | `/bot?tab=activity` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0208 | fresh | `/bot?tab=activity` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0209 | fresh | `/bot?tab=activity` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0210 | fresh | `/bot?tab=activity` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0211 | fresh | `/bot?tab=activity` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0212 | fresh | `/bot/research?tab=overview` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0213 | fresh | `/bot/research?tab=overview` | button | Back | 44×44 | PASS (external link opens; target site not audited) |
| I-0214 | fresh | `/bot/research?tab=overview` | button | Overview | 84×36 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0215 | fresh | `/bot/research?tab=overview` | button | Strategies | 89×36 | PASS (navigation) → /bot/research?tab=strategies |
| I-0216 | fresh | `/bot/research?tab=overview` | button | Research Lab | 110×36 | PASS (navigation) → /bot/research?tab=lab |
| I-0217 | fresh | `/bot/research?tab=overview` | button | Watchbot | 89×36 | PASS (navigation) → /bot/research?tab=watchbot |
| I-0218 | fresh | `/bot/research?tab=overview` | button | Risk Center | 98×36 | PASS (navigation) → /bot/research?tab=risk |
| I-0219 | fresh | `/bot/research?tab=overview` | button | Activity & Audit | 124×36 | PASS (navigation) → /bot/research?tab=activity |
| I-0220 | fresh | `/bot/research?tab=overview` | button | Settings | 78×36 | PASS (navigation) → /bot/research?tab=settings |
| I-0221 | fresh | `/bot/research?tab=overview` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0222 | fresh | `/bot/research?tab=overview` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0223 | fresh | `/bot/research?tab=overview` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0224 | fresh | `/bot/research?tab=overview` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0225 | fresh | `/bot/research?tab=overview` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0226 | fresh | `/bot/research?tab=strategies` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0227 | fresh | `/bot/research?tab=strategies` | button | Back | 44×44 | PASS (external link opens; target site not audited) |
| I-0228 | fresh | `/bot/research?tab=strategies` | button | Overview | 84×36 | SAME AS I-0214 (identical control; inventoried, not re-activated) |
| I-0229 | fresh | `/bot/research?tab=strategies` | button | Strategies | 89×36 | SAME AS I-0215 (identical control; inventoried, not re-activated) |
| I-0230 | fresh | `/bot/research?tab=strategies` | button | Research Lab | 110×36 | SAME AS I-0216 (identical control; inventoried, not re-activated) |
| I-0231 | fresh | `/bot/research?tab=strategies` | button | Watchbot | 89×36 | SAME AS I-0217 (identical control; inventoried, not re-activated) |
| I-0232 | fresh | `/bot/research?tab=strategies` | button | Risk Center | 98×36 | SAME AS I-0218 (identical control; inventoried, not re-activated) |
| I-0233 | fresh | `/bot/research?tab=strategies` | button | Activity & Audit | 124×36 | SAME AS I-0219 (identical control; inventoried, not re-activated) |
| I-0234 | fresh | `/bot/research?tab=strategies` | button | Settings | 78×36 | SAME AS I-0220 (identical control; inventoried, not re-activated) |
| I-0235 | fresh | `/bot/research?tab=strategies` | button | All timeframes | 107×26 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0236 | fresh | `/bot/research?tab=strategies` | button | 1h | 38×26 | RESPONDS — content changes; workflow not independently verified |
| I-0237 | fresh | `/bot/research?tab=strategies` | button | 1d | 38×26 | RESPONDS — content changes; workflow not independently verified |
| I-0238 | fresh | `/bot/research?tab=strategies` | button | All | 41×26 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0239 | fresh | `/bot/research?tab=strategies` | button | Reached test | 98×26 | RESPONDS — content changes; workflow not independently verified |
| I-0240 | fresh | `/bot/research?tab=strategies` | button | Qualified | 76×26 | RESPONDS — content changes; workflow not independently verified |
| I-0241 | fresh | `/bot/research?tab=strategies` | button | regime_switch(er=20,erTrend=0.3,k=2,maxHold=20,n=20,trend=50 | 378×76 | RESPONDS — content changes; workflow not independently verified |
| I-0242 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2,maxHold=24,n=20) Universe (10) · 1d  | 378×76 | RESPONDS — content changes; workflow not independently verified |
| I-0243 | fresh | `/bot/research?tab=strategies` | button | vol_filtered_trend(lookback=250,trend=100,vol=20) BTC-USD ·  | 378×76 | RESPONDS — content changes; workflow not independently verified |
| I-0244 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=10,slow=100) Universe (10) · 1d · validation  | 378×76 | RESPONDS — content changes; workflow not independently verified |
| I-0245 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=24,threshold=0) DOGE-USD · 1d · validat | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0246 | fresh | `/bot/research?tab=strategies` | button | regime_switch(er=20,erTrend=0.4,k=2,maxHold=20,n=20,trend=50 | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0247 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=20,exit=10) DOGE-USD · 1d · validati | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0248 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2,maxHold=24,n=20) XRP-USD · 1d · vali | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0249 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=24) DOGE-USD · 1 | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0250 | fresh | `/bot/research?tab=strategies` | button | vol_filtered_trend(lookback=250,trend=50,vol=20) DOGE-USD ·  | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0251 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=55,exit=10) ADA-USD · 1d · validatio | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0252 | fresh | `/bot/research?tab=strategies` | button | monthly_momentum(lookback=90,period=28) AVAX-USD · 1d · vali | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0253 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=55,exit=10) XRP-USD · 1h · validatio | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0254 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=10,slow=100) BTC-USD · 1d · validation +35.7% | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0255 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=20,exit=20) LTC-USD · 1d · validatio | 378×60 | SAME AS I-0247 (pattern button:donchian_breakout(entry=) (identical control; inventoried, not re-activated) |
| I-0256 | fresh | `/bot/research?tab=strategies` | button | regime_switch(er=20,erTrend=0.4,k=2,maxHold=20,n=20,trend=50 | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0257 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=25,maxHold=24,n=14) LINK-USD · 1d · v | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0258 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=168,threshold=0) AVAX-USD · 1h · valida | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0259 | fresh | `/bot/research?tab=strategies` | button | weekly_trend(n=200,period=7) SOL-USD · 1d · validation +29.9 | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0260 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=50,slow=200) LTC-USD · 1h · validation +29.1% | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0261 | fresh | `/bot/research?tab=strategies` | button | weekly_trend(n=100,period=7) BTC-USD · 1d · validation +28.4 | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0262 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=20,exit=20) BTC-USD · 1d · validatio | 378×60 | SAME AS I-0247 (pattern button:donchian_breakout(entry=) (identical control; inventoried, not re-activated) |
| I-0263 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=24) DOT-USD · 1d | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0264 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=55,exit=10) DOT-USD · 1h · validatio | 378×60 | SAME AS I-0247 (pattern button:donchian_breakout(entry=) (identical control; inventoried, not re-activated) |
| I-0265 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=20,slow=200) LINK-USD · 1h · validation +25.6 | 378×60 | SAME AS I-0244 (pattern button:sma_cross(fast=#slow=#) ) (identical control; inventoried, not re-activated) |
| I-0266 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=10,slow=100) ADA-USD · 1d · validation +25.5% | 378×60 | SAME AS I-0244 (pattern button:sma_cross(fast=#slow=#) ) (identical control; inventoried, not re-activated) |
| I-0267 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=25,maxHold=24,n=14) ETH-USD · 1d · va | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0268 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=50,slow=200) SOL-USD · 1h · validation +23.8% | 378×60 | SAME AS I-0244 (pattern button:sma_cross(fast=#slow=#) ) (identical control; inventoried, not re-activated) |
| I-0269 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2.5,maxHold=24,n=20) BTC-USD · 1d · va | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0270 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=20,exit=10) LINK-USD · 1h · validati | 378×60 | SAME AS I-0247 (pattern button:donchian_breakout(entry=) (identical control; inventoried, not re-activated) |
| I-0271 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=50,slow=200) Universe (10) · 1h · validation  | 378×60 | SAME AS I-0244 (pattern button:sma_cross(fast=#slow=#) ) (identical control; inventoried, not re-activated) |
| I-0272 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=55,exit=20) DOT-USD · 1d · validatio | 378×60 | SAME AS I-0247 (pattern button:donchian_breakout(entry=) (identical control; inventoried, not re-activated) |
| I-0273 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2,maxHold=24,n=50) DOT-USD · 1d · vali | 378×60 | SAME AS I-0242 (pattern button:bollinger_reversion(k=#m) (identical control; inventoried, not re-activated) |
| I-0274 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=50,slow=200) DOT-USD · 1h · validation +15.4% | 378×60 | SAME AS I-0244 (pattern button:sma_cross(fast=#slow=#) ) (identical control; inventoried, not re-activated) |
| I-0275 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=20,exit=10) SOL-USD · 1h · validatio | 378×60 | SAME AS I-0247 (pattern button:donchian_breakout(entry=) (identical control; inventoried, not re-activated) |
| I-0276 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=55,exit=10) Universe (10) · 1h · val | 378×60 | SAME AS I-0247 (pattern button:donchian_breakout(entry=) (identical control; inventoried, not re-activated) |
| I-0277 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=55,exit=10) XRP-USD · 1d · validatio | 378×60 | SAME AS I-0247 (pattern button:donchian_breakout(entry=) (identical control; inventoried, not re-activated) |
| I-0278 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=10,slow=100) AVAX-USD · 1h · validation +14.2 | 378×60 | SAME AS I-0244 (pattern button:sma_cross(fast=#slow=#) ) (identical control; inventoried, not re-activated) |
| I-0279 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=20,exit=10) AVAX-USD · 1h · validati | 378×60 | SAME AS I-0247 (pattern button:donchian_breakout(entry=) (identical control; inventoried, not re-activated) |
| I-0280 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=168,threshold=0) SOL-USD · 1h · validat | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0281 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=72) AVAX-USD · 1 | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0282 | fresh | `/bot/research?tab=strategies` | button | weekly_trend(n=100,period=7) ADA-USD · 1d · validation +12.4 | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0283 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2.5,maxHold=24,n=20) ADA-USD · 1d · va | 378×60 | SAME AS I-0242 (pattern button:bollinger_reversion(k=#m) (identical control; inventoried, not re-activated) |
| I-0284 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=50,slow=100) ADA-USD · 1h · validation +11.6% | 378×60 | SAME AS I-0244 (pattern button:sma_cross(fast=#slow=#) ) (identical control; inventoried, not re-activated) |
| I-0285 | fresh | `/bot/research?tab=strategies` | button | vol_filtered_trend(lookback=250,trend=50,vol=20) ETH-USD · 1 | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0286 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.1) LTC-USD  | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0287 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=55,exit=20) LTC-USD · 1h · validatio | 378×60 | SAME AS I-0247 (pattern button:donchian_breakout(entry=) (identical control; inventoried, not re-activated) |
| I-0288 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=20,slow=200) DOGE-USD · 1h · validation +9.5% | 378×60 | SAME AS I-0244 (pattern button:sma_cross(fast=#slow=#) ) (identical control; inventoried, not re-activated) |
| I-0289 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=24) ADA-USD · 1d | 378×60 | SAME AS I-0249 (pattern button:trend_filtered_momentum() (identical control; inventoried, not re-activated) |
| I-0290 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=25,maxHold=24,n=14) DOT-USD · 1d · va | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0291 | fresh | `/bot/research?tab=strategies` | button | monthly_momentum(lookback=90,period=28) LTC-USD · 1d · valid | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0292 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=55,exit=10) BTC-USD · 1h · validatio | 378×60 | SAME AS I-0247 (pattern button:donchian_breakout(entry=) (identical control; inventoried, not re-activated) |
| I-0293 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=10,slow=100) AVAX-USD · 1d · validation +7.9% | 378×60 | SAME AS I-0244 (pattern button:sma_cross(fast=#slow=#) ) (identical control; inventoried, not re-activated) |
| I-0294 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=50,slow=200) BTC-USD · 1h · validation +7.7%  | 378×60 | SAME AS I-0244 (pattern button:sma_cross(fast=#slow=#) ) (identical control; inventoried, not re-activated) |
| I-0295 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2.5,maxHold=24,n=50) LINK-USD · 1d · v | 378×60 | SAME AS I-0242 (pattern button:bollinger_reversion(k=#m) (identical control; inventoried, not re-activated) |
| I-0296 | fresh | `/bot/research?tab=strategies` | button | monthly_momentum(lookback=90,period=28) BTC-USD · 1d · valid | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0297 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2.5,maxHold=24,n=50) DOGE-USD · 1d · v | 378×60 | SAME AS I-0242 (pattern button:bollinger_reversion(k=#m) (identical control; inventoried, not re-activated) |
| I-0298 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=25,maxHold=24,n=14) DOT-USD · 1h · va | 378×60 | SAME AS I-0257 (pattern button:rsi_reversion(hi=#lo=#ma) (identical control; inventoried, not re-activated) |
| I-0299 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=72,threshold=0) LTC-USD · 1h · validati | 378×60 | SAME AS I-0245 (pattern button:ts_momentum(lookback=#th) (identical control; inventoried, not re-activated) |
| I-0300 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=168,threshold=0) LINK-USD · 1h · valida | 378×60 | SAME AS I-0245 (pattern button:ts_momentum(lookback=#th) (identical control; inventoried, not re-activated) |
| I-0301 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=20,slow=200) XRP-USD · 1h · validation +3.7%  | 378×60 | SAME AS I-0244 (pattern button:sma_cross(fast=#slow=#) ) (identical control; inventoried, not re-activated) |
| I-0302 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.1) SOL-USD  | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0303 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=25,maxHold=24,n=14) AVAX-USD · 1h · v | 378×60 | SAME AS I-0257 (pattern button:rsi_reversion(hi=#lo=#ma) (identical control; inventoried, not re-activated) |
| I-0304 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=10,slow=200) SOL-USD · 1d · validation +3.1%  | 378×60 | SAME AS I-0244 (pattern button:sma_cross(fast=#slow=#) ) (identical control; inventoried, not re-activated) |
| I-0305 | fresh | `/bot/research?tab=strategies` | button | monthly_momentum(lookback=90,period=28) Universe (10) · 1d · | 378×60 | SAME AS I-0252 (pattern button:monthly_momentum(lookbac) (identical control; inventoried, not re-activated) |
| I-0306 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=25,maxHold=24,n=14) DOGE-USD · 1h · v | 378×60 | SAME AS I-0257 (pattern button:rsi_reversion(hi=#lo=#ma) (identical control; inventoried, not re-activated) |
| I-0307 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=50,slow=200) ETH-USD · 1h · validation +1.4%  | 378×60 | SAME AS I-0244 (pattern button:sma_cross(fast=#slow=#) ) (identical control; inventoried, not re-activated) |
| I-0308 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=55,exit=10) ETH-USD · 1h · validatio | 378×60 | SAME AS I-0247 (pattern button:donchian_breakout(entry=) (identical control; inventoried, not re-activated) |
| I-0309 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=72) LINK-USD · 1 | 378×60 | SAME AS I-0249 (pattern button:trend_filtered_momentum() (identical control; inventoried, not re-activated) |
| I-0310 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.1) DOT-USD  | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0311 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=24) XRP-USD · 1d | 378×60 | SAME AS I-0249 (pattern button:trend_filtered_momentum() (identical control; inventoried, not re-activated) |
| I-0312 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=25,maxHold=24,n=14) XRP-USD · 1h · va | 378×60 | SAME AS I-0257 (pattern button:rsi_reversion(hi=#lo=#ma) (identical control; inventoried, not re-activated) |
| I-0313 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.2) AVAX-USD | 378×60 | SAME AS I-0286 (pattern button:vol_compression_breakout) (identical control; inventoried, not re-activated) |
| I-0314 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2,maxHold=24,n=50) DOT-USD · 1h · vali | 378×60 | SAME AS I-0242 (pattern button:bollinger_reversion(k=#m) (identical control; inventoried, not re-activated) |
| I-0315 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=25,maxHold=24,n=14) SOL-USD · 1h · va | 378×60 | SAME AS I-0257 (pattern button:rsi_reversion(hi=#lo=#ma) (identical control; inventoried, not re-activated) |
| I-0316 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2.5,maxHold=24,n=50) SOL-USD · 1d · va | 378×60 | SAME AS I-0242 (pattern button:bollinger_reversion(k=#m) (identical control; inventoried, not re-activated) |
| I-0317 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.1) XRP-USD  | 378×60 | SAME AS I-0286 (pattern button:vol_compression_breakout) (identical control; inventoried, not re-activated) |
| I-0318 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=25,maxHold=24,n=14) ADA-USD · 1d · va | 378×60 | SAME AS I-0257 (pattern button:rsi_reversion(hi=#lo=#ma) (identical control; inventoried, not re-activated) |
| I-0319 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=25,maxHold=24,n=14) AVAX-USD · 1d · v | 378×60 | SAME AS I-0257 (pattern button:rsi_reversion(hi=#lo=#ma) (identical control; inventoried, not re-activated) |
| I-0320 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=25,maxHold=24,n=14) LTC-USD · 1d · va | 378×60 | SAME AS I-0257 (pattern button:rsi_reversion(hi=#lo=#ma) (identical control; inventoried, not re-activated) |
| I-0321 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=25,maxHold=24,n=14) Universe (10) · 1 | 378×60 | SAME AS I-0257 (pattern button:rsi_reversion(hi=#lo=#ma) (identical control; inventoried, not re-activated) |
| I-0322 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.1) LTC-USD  | 378×60 | SAME AS I-0286 (pattern button:vol_compression_breakout) (identical control; inventoried, not re-activated) |
| I-0323 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=72,threshold=0) ADA-USD · 1h · validati | 378×60 | SAME AS I-0245 (pattern button:ts_momentum(lookback=#th) (identical control; inventoried, not re-activated) |
| I-0324 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=168,threshold=0) Universe (10) · 1h · v | 378×60 | SAME AS I-0245 (pattern button:ts_momentum(lookback=#th) (identical control; inventoried, not re-activated) |
| I-0325 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=25,maxHold=24,n=14) ADA-USD · 1h · va | 378×60 | SAME AS I-0257 (pattern button:rsi_reversion(hi=#lo=#ma) (identical control; inventoried, not re-activated) |
| I-0326 | fresh | `/bot/research?tab=strategies` | button | weekly_trend(n=200,period=7) XRP-USD · 1d · validation -1.0% | 378×60 | SAME AS I-0259 (pattern button:weekly_trend(n=#period=#) (identical control; inventoried, not re-activated) |
| I-0327 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2,maxHold=24,n=50) AVAX-USD · 1h · val | 378×60 | SAME AS I-0242 (pattern button:bollinger_reversion(k=#m) (identical control; inventoried, not re-activated) |
| I-0328 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=55,exit=20) DOGE-USD · 1h · validati | 378×60 | SAME AS I-0247 (pattern button:donchian_breakout(entry=) (identical control; inventoried, not re-activated) |
| I-0329 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=25,maxHold=24,n=14) BTC-USD · 1d · va | 378×60 | SAME AS I-0257 (pattern button:rsi_reversion(hi=#lo=#ma) (identical control; inventoried, not re-activated) |
| I-0330 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=24) SOL-USD · 1d | 378×60 | SAME AS I-0249 (pattern button:trend_filtered_momentum() (identical control; inventoried, not re-activated) |
| I-0331 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=24,threshold=0) SOL-USD · 1d · validati | 378×60 | SAME AS I-0245 (pattern button:ts_momentum(lookback=#th) (identical control; inventoried, not re-activated) |
| I-0332 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=30,maxHold=24,n=14) Universe (10) · 1 | 378×60 | SAME AS I-0257 (pattern button:rsi_reversion(hi=#lo=#ma) (identical control; inventoried, not re-activated) |
| I-0333 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.1) LINK-USD | 378×60 | SAME AS I-0286 (pattern button:vol_compression_breakout) (identical control; inventoried, not re-activated) |
| I-0334 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=25,maxHold=24,n=14) LINK-USD · 1h · v | 378×60 | SAME AS I-0257 (pattern button:rsi_reversion(hi=#lo=#ma) (identical control; inventoried, not re-activated) |
| I-0335 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2.5,maxHold=24,n=20) ADA-USD · 1h · va | 378×60 | SAME AS I-0242 (pattern button:bollinger_reversion(k=#m) (identical control; inventoried, not re-activated) |
| I-0336 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=168,threshold=0) BTC-USD · 1h · validat | 378×60 | SAME AS I-0245 (pattern button:ts_momentum(lookback=#th) (identical control; inventoried, not re-activated) |
| I-0337 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=20,slow=200) LTC-USD · 1d · validation -3.6%  | 378×60 | SAME AS I-0244 (pattern button:sma_cross(fast=#slow=#) ) (identical control; inventoried, not re-activated) |
| I-0338 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=25,maxHold=24,n=14) LTC-USD · 1h · va | 378×60 | SAME AS I-0257 (pattern button:rsi_reversion(hi=#lo=#ma) (identical control; inventoried, not re-activated) |
| I-0339 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=25,maxHold=24,n=14) ETH-USD · 1h · va | 378×60 | SAME AS I-0257 (pattern button:rsi_reversion(hi=#lo=#ma) (identical control; inventoried, not re-activated) |
| I-0340 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=30,maxHold=24,n=14) XRP-USD · 1d · va | 378×60 | SAME AS I-0257 (pattern button:rsi_reversion(hi=#lo=#ma) (identical control; inventoried, not re-activated) |
| I-0341 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=30,maxHold=24,n=14) BTC-USD · 1h · va | 378×60 | SAME AS I-0257 (pattern button:rsi_reversion(hi=#lo=#ma) (identical control; inventoried, not re-activated) |
| I-0342 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=24) AVAX-USD · 1 | 378×60 | SAME AS I-0249 (pattern button:trend_filtered_momentum() (identical control; inventoried, not re-activated) |
| I-0343 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.1) DOGE-USD | 378×60 | SAME AS I-0286 (pattern button:vol_compression_breakout) (identical control; inventoried, not re-activated) |
| I-0344 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.2) Universe | 378×60 | SAME AS I-0286 (pattern button:vol_compression_breakout) (identical control; inventoried, not re-activated) |
| I-0345 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=168,threshold=0) DOGE-USD · 1h · valida | 378×60 | SAME AS I-0245 (pattern button:ts_momentum(lookback=#th) (identical control; inventoried, not re-activated) |
| I-0346 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=30,maxHold=24,n=14) DOGE-USD · 1d · v | 378×60 | SAME AS I-0257 (pattern button:rsi_reversion(hi=#lo=#ma) (identical control; inventoried, not re-activated) |
| I-0347 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=24) BTC-USD · 1d | 378×60 | SAME AS I-0249 (pattern button:trend_filtered_momentum() (identical control; inventoried, not re-activated) |
| I-0348 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2.5,maxHold=24,n=50) Universe (10) · 1 | 378×60 | SAME AS I-0242 (pattern button:bollinger_reversion(k=#m) (identical control; inventoried, not re-activated) |
| I-0349 | fresh | `/bot/research?tab=strategies` | button | rsi_reversion(hi=55,lo=25,maxHold=24,n=14) SOL-USD · 1d · va | 378×60 | SAME AS I-0257 (pattern button:rsi_reversion(hi=#lo=#ma) (identical control; inventoried, not re-activated) |
| I-0350 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.1) Universe | 378×60 | SAME AS I-0286 (pattern button:vol_compression_breakout) (identical control; inventoried, not re-activated) |
| I-0351 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=72) LINK-USD · 1 | 378×60 | SAME AS I-0249 (pattern button:trend_filtered_momentum() (identical control; inventoried, not re-activated) |
| I-0352 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.1) ETH-USD  | 378×60 | SAME AS I-0286 (pattern button:vol_compression_breakout) (identical control; inventoried, not re-activated) |
| I-0353 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=20,exit=10) ADA-USD · 1h · validatio | 378×60 | SAME AS I-0247 (pattern button:donchian_breakout(entry=) (identical control; inventoried, not re-activated) |
| I-0354 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=24) Universe (10 | 378×60 | SAME AS I-0249 (pattern button:trend_filtered_momentum() (identical control; inventoried, not re-activated) |
| I-0355 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.1) SOL-USD  | 378×60 | SAME AS I-0286 (pattern button:vol_compression_breakout) (identical control; inventoried, not re-activated) |
| I-0356 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.1) BTC-USD  | 378×60 | SAME AS I-0286 (pattern button:vol_compression_breakout) (identical control; inventoried, not re-activated) |
| I-0357 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2.5,maxHold=24,n=20) ETH-USD · 1h · va | 378×60 | SAME AS I-0242 (pattern button:bollinger_reversion(k=#m) (identical control; inventoried, not re-activated) |
| I-0358 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2.5,maxHold=24,n=20) LTC-USD · 1h · va | 378×60 | SAME AS I-0242 (pattern button:bollinger_reversion(k=#m) (identical control; inventoried, not re-activated) |
| I-0359 | fresh | `/bot/research?tab=strategies` | button | regime_switch(er=20,erTrend=0.4,k=2,maxHold=20,n=20,trend=50 | 378×60 | SAME AS I-0241 (pattern button:regime_switch(er=#erTren) (identical control; inventoried, not re-activated) |
| I-0360 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=24,threshold=0) ETH-USD · 1d · validati | 378×60 | SAME AS I-0245 (pattern button:ts_momentum(lookback=#th) (identical control; inventoried, not re-activated) |
| I-0361 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2.5,maxHold=24,n=20) BTC-USD · 1h · va | 378×60 | SAME AS I-0242 (pattern button:bollinger_reversion(k=#m) (identical control; inventoried, not re-activated) |
| I-0362 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2,maxHold=24,n=50) SOL-USD · 1h · vali | 378×60 | SAME AS I-0242 (pattern button:bollinger_reversion(k=#m) (identical control; inventoried, not re-activated) |
| I-0363 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.1) ETH-USD  | 378×60 | SAME AS I-0286 (pattern button:vol_compression_breakout) (identical control; inventoried, not re-activated) |
| I-0364 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.1) ADA-USD  | 378×60 | SAME AS I-0286 (pattern button:vol_compression_breakout) (identical control; inventoried, not re-activated) |
| I-0365 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.2) DOT-USD  | 378×60 | SAME AS I-0286 (pattern button:vol_compression_breakout) (identical control; inventoried, not re-activated) |
| I-0366 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=168,threshold=0) XRP-USD · 1h · validat | 378×60 | SAME AS I-0245 (pattern button:ts_momentum(lookback=#th) (identical control; inventoried, not re-activated) |
| I-0367 | fresh | `/bot/research?tab=strategies` | button | weekly_trend(n=200,period=7) DOGE-USD · 1d · validation -9.7 | 378×60 | SAME AS I-0259 (pattern button:weekly_trend(n=#period=#) (identical control; inventoried, not re-activated) |
| I-0368 | fresh | `/bot/research?tab=strategies` | button | regime_switch(er=20,erTrend=0.3,k=2,maxHold=20,n=20,trend=50 | 378×60 | SAME AS I-0241 (pattern button:regime_switch(er=#erTren) (identical control; inventoried, not re-activated) |
| I-0369 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=72) Universe (10 | 378×76 | SAME AS I-0249 (pattern button:trend_filtered_momentum() (identical control; inventoried, not re-activated) |
| I-0370 | fresh | `/bot/research?tab=strategies` | button | regime_switch(er=20,erTrend=0.3,k=2,maxHold=20,n=20,trend=50 | 378×60 | SAME AS I-0241 (pattern button:regime_switch(er=#erTren) (identical control; inventoried, not re-activated) |
| I-0371 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2.5,maxHold=24,n=20) XRP-USD · 1h · va | 378×60 | SAME AS I-0242 (pattern button:bollinger_reversion(k=#m) (identical control; inventoried, not re-activated) |
| I-0372 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=72) BTC-USD · 1h | 378×60 | SAME AS I-0249 (pattern button:trend_filtered_momentum() (identical control; inventoried, not re-activated) |
| I-0373 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.1) BTC-USD  | 378×60 | SAME AS I-0286 (pattern button:vol_compression_breakout) (identical control; inventoried, not re-activated) |
| I-0374 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.1) DOGE-USD | 378×60 | SAME AS I-0286 (pattern button:vol_compression_breakout) (identical control; inventoried, not re-activated) |
| I-0375 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.1) AVAX-USD | 378×60 | SAME AS I-0286 (pattern button:vol_compression_breakout) (identical control; inventoried, not re-activated) |
| I-0376 | fresh | `/bot/research?tab=strategies` | button | monthly_momentum(lookback=90,period=28) ADA-USD · 1d · valid | 378×60 | SAME AS I-0252 (pattern button:monthly_momentum(lookbac) (identical control; inventoried, not re-activated) |
| I-0377 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=24,threshold=0) BTC-USD · 1d · validati | 378×60 | SAME AS I-0245 (pattern button:ts_momentum(lookback=#th) (identical control; inventoried, not re-activated) |
| I-0378 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2.5,maxHold=24,n=50) AVAX-USD · 1d · v | 378×60 | SAME AS I-0242 (pattern button:bollinger_reversion(k=#m) (identical control; inventoried, not re-activated) |
| I-0379 | fresh | `/bot/research?tab=strategies` | button | weekly_trend(n=200,period=7) Universe (10) · 1d · validation | 378×60 | SAME AS I-0259 (pattern button:weekly_trend(n=#period=#) (identical control; inventoried, not re-activated) |
| I-0380 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2.5,maxHold=24,n=20) DOGE-USD · 1h · v | 378×60 | SAME AS I-0242 (pattern button:bollinger_reversion(k=#m) (identical control; inventoried, not re-activated) |
| I-0381 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.1) XRP-USD  | 378×60 | SAME AS I-0286 (pattern button:vol_compression_breakout) (identical control; inventoried, not re-activated) |
| I-0382 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2,maxHold=24,n=20) LINK-USD · 1h · val | 378×60 | SAME AS I-0242 (pattern button:bollinger_reversion(k=#m) (identical control; inventoried, not re-activated) |
| I-0383 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.2) ADA-USD  | 378×60 | SAME AS I-0286 (pattern button:vol_compression_breakout) (identical control; inventoried, not re-activated) |
| I-0384 | fresh | `/bot/research?tab=strategies` | button | weekly_trend(n=100,period=7) LTC-USD · 1d · validation -14.2 | 378×60 | SAME AS I-0259 (pattern button:weekly_trend(n=#period=#) (identical control; inventoried, not re-activated) |
| I-0385 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2,maxHold=24,n=20) ETH-USD · 1d · vali | 378×60 | SAME AS I-0242 (pattern button:bollinger_reversion(k=#m) (identical control; inventoried, not re-activated) |
| I-0386 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=20,exit=10) ETH-USD · 1d · validatio | 378×60 | SAME AS I-0247 (pattern button:donchian_breakout(entry=) (identical control; inventoried, not re-activated) |
| I-0387 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=24) ETH-USD · 1d | 378×60 | SAME AS I-0249 (pattern button:trend_filtered_momentum() (identical control; inventoried, not re-activated) |
| I-0388 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=72) LTC-USD · 1h | 378×60 | SAME AS I-0249 (pattern button:trend_filtered_momentum() (identical control; inventoried, not re-activated) |
| I-0389 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=72) XRP-USD · 1h | 378×60 | SAME AS I-0249 (pattern button:trend_filtered_momentum() (identical control; inventoried, not re-activated) |
| I-0390 | fresh | `/bot/research?tab=strategies` | button | regime_switch(er=20,erTrend=0.3,k=2,maxHold=20,n=20,trend=50 | 378×60 | SAME AS I-0241 (pattern button:regime_switch(er=#erTren) (identical control; inventoried, not re-activated) |
| I-0391 | fresh | `/bot/research?tab=strategies` | button | vol_compression_breakout(lookback=120,n=20,pct=0.1) LINK-USD | 378×60 | SAME AS I-0286 (pattern button:vol_compression_breakout) (identical control; inventoried, not re-activated) |
| I-0392 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=168,threshold=0) DOT-USD · 1h · validat | 378×60 | SAME AS I-0245 (pattern button:ts_momentum(lookback=#th) (identical control; inventoried, not re-activated) |
| I-0393 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=55,exit=10) Universe (10) · 1d · val | 378×60 | SAME AS I-0247 (pattern button:donchian_breakout(entry=) (identical control; inventoried, not re-activated) |
| I-0394 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=24) SOL-USD · 1h | 378×60 | SAME AS I-0249 (pattern button:trend_filtered_momentum() (identical control; inventoried, not re-activated) |
| I-0395 | fresh | `/bot/research?tab=strategies` | button | bollinger_reversion(k=2,maxHold=24,n=50) LTC-USD · 1d · vali | 378×60 | SAME AS I-0242 (pattern button:bollinger_reversion(k=#m) (identical control; inventoried, not re-activated) |
| I-0396 | fresh | `/bot/research?tab=strategies` | button | weekly_trend(n=200,period=7) AVAX-USD · 1d · validation -21. | 378×60 | SAME AS I-0259 (pattern button:weekly_trend(n=#period=#) (identical control; inventoried, not re-activated) |
| I-0397 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=24,threshold=0) LTC-USD · 1d · validati | 378×60 | SAME AS I-0245 (pattern button:ts_momentum(lookback=#th) (identical control; inventoried, not re-activated) |
| I-0398 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=24,threshold=0) Universe (10) · 1d · va | 378×76 | SAME AS I-0245 (pattern button:ts_momentum(lookback=#th) (identical control; inventoried, not re-activated) |
| I-0399 | fresh | `/bot/research?tab=strategies` | button | vol_filtered_trend(lookback=250,trend=100,vol=20) SOL-USD ·  | 378×60 | SAME AS I-0243 (pattern button:vol_filtered_trend(lookb) (identical control; inventoried, not re-activated) |
| I-0400 | fresh | `/bot/research?tab=strategies` | button | vol_filtered_trend(lookback=250,trend=50,vol=20) ADA-USD · 1 | 378×60 | SAME AS I-0243 (pattern button:vol_filtered_trend(lookb) (identical control; inventoried, not re-activated) |
| I-0401 | fresh | `/bot/research?tab=strategies` | button | vol_filtered_trend(lookback=250,trend=50,vol=20) XRP-USD · 1 | 378×60 | SAME AS I-0243 (pattern button:vol_filtered_trend(lookb) (identical control; inventoried, not re-activated) |
| I-0402 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=72) DOT-USD · 1h | 378×60 | SAME AS I-0249 (pattern button:trend_filtered_momentum() (identical control; inventoried, not re-activated) |
| I-0403 | fresh | `/bot/research?tab=strategies` | button | vol_filtered_trend(lookback=250,trend=50,vol=20) DOT-USD · 1 | 378×60 | SAME AS I-0243 (pattern button:vol_filtered_trend(lookb) (identical control; inventoried, not re-activated) |
| I-0404 | fresh | `/bot/research?tab=strategies` | button | weekly_trend(n=200,period=7) DOT-USD · 1d · validation -27.6 | 378×60 | SAME AS I-0259 (pattern button:weekly_trend(n=#period=#) (identical control; inventoried, not re-activated) |
| I-0405 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=10,slow=200) ETH-USD · 1d · validation -30.3% | 378×60 | SAME AS I-0244 (pattern button:sma_cross(fast=#slow=#) ) (identical control; inventoried, not re-activated) |
| I-0406 | fresh | `/bot/research?tab=strategies` | button | weekly_trend(n=200,period=7) LINK-USD · 1d · validation -30. | 378×60 | SAME AS I-0259 (pattern button:weekly_trend(n=#period=#) (identical control; inventoried, not re-activated) |
| I-0407 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=24) DOGE-USD · 1 | 378×60 | SAME AS I-0249 (pattern button:trend_filtered_momentum() (identical control; inventoried, not re-activated) |
| I-0408 | fresh | `/bot/research?tab=strategies` | button | monthly_momentum(lookback=90,period=28) SOL-USD · 1d · valid | 378×60 | SAME AS I-0252 (pattern button:monthly_momentum(lookbac) (identical control; inventoried, not re-activated) |
| I-0409 | fresh | `/bot/research?tab=strategies` | button | monthly_momentum(lookback=90,period=28) DOT-USD · 1d · valid | 378×60 | SAME AS I-0252 (pattern button:monthly_momentum(lookbac) (identical control; inventoried, not re-activated) |
| I-0410 | fresh | `/bot/research?tab=strategies` | button | vol_filtered_trend(lookback=250,trend=50,vol=20) Universe (1 | 378×60 | SAME AS I-0243 (pattern button:vol_filtered_trend(lookb) (identical control; inventoried, not re-activated) |
| I-0411 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=24,threshold=0) ADA-USD · 1d · validati | 378×60 | SAME AS I-0245 (pattern button:ts_momentum(lookback=#th) (identical control; inventoried, not re-activated) |
| I-0412 | fresh | `/bot/research?tab=strategies` | button | monthly_momentum(lookback=180,period=28) XRP-USD · 1d · vali | 378×60 | SAME AS I-0252 (pattern button:monthly_momentum(lookbac) (identical control; inventoried, not re-activated) |
| I-0413 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=20,slow=100) LINK-USD · 1d · validation -33.5 | 378×60 | SAME AS I-0244 (pattern button:sma_cross(fast=#slow=#) ) (identical control; inventoried, not re-activated) |
| I-0414 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=72,threshold=0) ETH-USD · 1h · validati | 378×60 | SAME AS I-0245 (pattern button:ts_momentum(lookback=#th) (identical control; inventoried, not re-activated) |
| I-0415 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=24) LTC-USD · 1d | 378×60 | SAME AS I-0249 (pattern button:trend_filtered_momentum() (identical control; inventoried, not re-activated) |
| I-0416 | fresh | `/bot/research?tab=strategies` | button | vol_filtered_trend(lookback=250,trend=100,vol=20) LINK-USD · | 378×60 | SAME AS I-0243 (pattern button:vol_filtered_trend(lookb) (identical control; inventoried, not re-activated) |
| I-0417 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=24,threshold=0) DOT-USD · 1d · validati | 378×60 | SAME AS I-0245 (pattern button:ts_momentum(lookback=#th) (identical control; inventoried, not re-activated) |
| I-0418 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=50,slow=200) XRP-USD · 1d · validation -36.5% | 378×60 | SAME AS I-0244 (pattern button:sma_cross(fast=#slow=#) ) (identical control; inventoried, not re-activated) |
| I-0419 | fresh | `/bot/research?tab=strategies` | button | vol_filtered_trend(lookback=250,trend=50,vol=20) LTC-USD · 1 | 378×60 | SAME AS I-0243 (pattern button:vol_filtered_trend(lookb) (identical control; inventoried, not re-activated) |
| I-0420 | fresh | `/bot/research?tab=strategies` | button | vol_filtered_trend(lookback=250,trend=50,vol=20) AVAX-USD ·  | 378×60 | SAME AS I-0243 (pattern button:vol_filtered_trend(lookb) (identical control; inventoried, not re-activated) |
| I-0421 | fresh | `/bot/research?tab=strategies` | button | monthly_momentum(lookback=90,period=28) ETH-USD · 1d · valid | 378×60 | SAME AS I-0252 (pattern button:monthly_momentum(lookbac) (identical control; inventoried, not re-activated) |
| I-0422 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=50,slow=200) DOGE-USD · 1d · validation -39.1 | 378×60 | SAME AS I-0244 (pattern button:sma_cross(fast=#slow=#) ) (identical control; inventoried, not re-activated) |
| I-0423 | fresh | `/bot/research?tab=strategies` | button | monthly_momentum(lookback=90,period=28) LINK-USD · 1d · vali | 378×60 | SAME AS I-0252 (pattern button:monthly_momentum(lookbac) (identical control; inventoried, not re-activated) |
| I-0424 | fresh | `/bot/research?tab=strategies` | button | regime_switch(er=20,erTrend=0.4,k=2,maxHold=20,n=20,trend=50 | 378×60 | SAME AS I-0241 (pattern button:regime_switch(er=#erTren) (identical control; inventoried, not re-activated) |
| I-0425 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=24) ADA-USD · 1h | 378×60 | SAME AS I-0249 (pattern button:trend_filtered_momentum() (identical control; inventoried, not re-activated) |
| I-0426 | fresh | `/bot/research?tab=strategies` | button | trend_filtered_momentum(filter=200,lookback=72) ETH-USD · 1h | 378×60 | SAME AS I-0249 (pattern button:trend_filtered_momentum() (identical control; inventoried, not re-activated) |
| I-0427 | fresh | `/bot/research?tab=strategies` | button | regime_switch(er=20,erTrend=0.4,k=2,maxHold=20,n=20,trend=50 | 378×60 | SAME AS I-0241 (pattern button:regime_switch(er=#erTren) (identical control; inventoried, not re-activated) |
| I-0428 | fresh | `/bot/research?tab=strategies` | button | sma_cross(fast=20,slow=200) DOT-USD · 1d · validation -46.8% | 378×60 | SAME AS I-0244 (pattern button:sma_cross(fast=#slow=#) ) (identical control; inventoried, not re-activated) |
| I-0429 | fresh | `/bot/research?tab=strategies` | button | regime_switch(er=20,erTrend=0.4,k=2,maxHold=20,n=20,trend=50 | 378×60 | SAME AS I-0241 (pattern button:regime_switch(er=#erTren) (identical control; inventoried, not re-activated) |
| I-0430 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=168,threshold=0) XRP-USD · 1d · validat | 378×60 | SAME AS I-0245 (pattern button:ts_momentum(lookback=#th) (identical control; inventoried, not re-activated) |
| I-0431 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=24,threshold=0) AVAX-USD · 1d · validat | 378×60 | SAME AS I-0245 (pattern button:ts_momentum(lookback=#th) (identical control; inventoried, not re-activated) |
| I-0432 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=20,exit=10) AVAX-USD · 1d · validati | 378×60 | SAME AS I-0247 (pattern button:donchian_breakout(entry=) (identical control; inventoried, not re-activated) |
| I-0433 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=55,exit=20) SOL-USD · 1d · validatio | 378×60 | SAME AS I-0247 (pattern button:donchian_breakout(entry=) (identical control; inventoried, not re-activated) |
| I-0434 | fresh | `/bot/research?tab=strategies` | button | weekly_trend(n=200,period=7) ETH-USD · 1d · validation -52.1 | 378×60 | SAME AS I-0259 (pattern button:weekly_trend(n=#period=#) (identical control; inventoried, not re-activated) |
| I-0435 | fresh | `/bot/research?tab=strategies` | button | regime_switch(er=20,erTrend=0.4,k=2,maxHold=20,n=20,trend=50 | 378×60 | SAME AS I-0241 (pattern button:regime_switch(er=#erTren) (identical control; inventoried, not re-activated) |
| I-0436 | fresh | `/bot/research?tab=strategies` | button | ts_momentum(lookback=24,threshold=0) LINK-USD · 1d · validat | 378×60 | SAME AS I-0245 (pattern button:ts_momentum(lookback=#th) (identical control; inventoried, not re-activated) |
| I-0437 | fresh | `/bot/research?tab=strategies` | button | XS_MOMENTUM(lookback=14,topK=2,rebalance=7) Universe (0) · 1 | 378×60 | RESPONDS — content changes; workflow not independently verified |
| I-0438 | fresh | `/bot/research?tab=strategies` | button | donchian_breakout(entry=20,exit=10) LINK-USD · 1d · validati | 378×60 | SAME AS I-0247 (pattern button:donchian_breakout(entry=) (identical control; inventoried, not re-activated) |
| I-0439 | fresh | `/bot/research?tab=strategies` | button | monthly_momentum(lookback=180,period=28) DOGE-USD · 1d · val | 378×60 | SAME AS I-0252 (pattern button:monthly_momentum(lookbac) (identical control; inventoried, not re-activated) |
| I-0440 | fresh | `/bot/research?tab=strategies` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0441 | fresh | `/bot/research?tab=strategies` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0442 | fresh | `/bot/research?tab=strategies` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0443 | fresh | `/bot/research?tab=strategies` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0444 | fresh | `/bot/research?tab=strategies` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0445 | fresh | `/bot/research?tab=lab` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0446 | fresh | `/bot/research?tab=lab` | button | Back | 44×44 | PASS (external link opens; target site not audited) |
| I-0447 | fresh | `/bot/research?tab=lab` | button | Overview | 84×36 | SAME AS I-0214 (identical control; inventoried, not re-activated) |
| I-0448 | fresh | `/bot/research?tab=lab` | button | Strategies | 89×36 | SAME AS I-0215 (identical control; inventoried, not re-activated) |
| I-0449 | fresh | `/bot/research?tab=lab` | button | Research Lab | 110×36 | SAME AS I-0216 (identical control; inventoried, not re-activated) |
| I-0450 | fresh | `/bot/research?tab=lab` | button | Watchbot | 89×36 | SAME AS I-0217 (identical control; inventoried, not re-activated) |
| I-0451 | fresh | `/bot/research?tab=lab` | button | Risk Center | 98×36 | SAME AS I-0218 (identical control; inventoried, not re-activated) |
| I-0452 | fresh | `/bot/research?tab=lab` | button | Activity & Audit | 124×36 | SAME AS I-0219 (identical control; inventoried, not re-activated) |
| I-0453 | fresh | `/bot/research?tab=lab` | button | Settings | 78×36 | SAME AS I-0220 (identical control; inventoried, not re-activated) |
| I-0454 | fresh | `/bot/research?tab=lab` | summary | Assumptions | 380×16 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0455 | fresh | `/bot/research?tab=lab` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0456 | fresh | `/bot/research?tab=lab` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0457 | fresh | `/bot/research?tab=lab` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0458 | fresh | `/bot/research?tab=lab` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0459 | fresh | `/bot/research?tab=lab` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0460 | fresh | `/bot/research?tab=watchbot` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0461 | fresh | `/bot/research?tab=watchbot` | button | Back | 44×44 | PASS (external link opens; target site not audited) |
| I-0462 | fresh | `/bot/research?tab=watchbot` | button | Overview | 84×36 | SAME AS I-0214 (identical control; inventoried, not re-activated) |
| I-0463 | fresh | `/bot/research?tab=watchbot` | button | Strategies | 89×36 | SAME AS I-0215 (identical control; inventoried, not re-activated) |
| I-0464 | fresh | `/bot/research?tab=watchbot` | button | Research Lab | 110×36 | SAME AS I-0216 (identical control; inventoried, not re-activated) |
| I-0465 | fresh | `/bot/research?tab=watchbot` | button | Watchbot | 89×36 | SAME AS I-0217 (identical control; inventoried, not re-activated) |
| I-0466 | fresh | `/bot/research?tab=watchbot` | button | Risk Center | 98×36 | SAME AS I-0218 (identical control; inventoried, not re-activated) |
| I-0467 | fresh | `/bot/research?tab=watchbot` | button | Activity & Audit | 124×36 | SAME AS I-0219 (identical control; inventoried, not re-activated) |
| I-0468 | fresh | `/bot/research?tab=watchbot` | button | Settings | 78×36 | SAME AS I-0220 (identical control; inventoried, not re-activated) |
| I-0469 | fresh | `/bot/research?tab=watchbot` | button | Check live quotes | 123×30 | RESPONDS — content changes; workflow not independently verified |
| I-0470 | fresh | `/bot/research?tab=watchbot` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0471 | fresh | `/bot/research?tab=watchbot` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0472 | fresh | `/bot/research?tab=watchbot` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0473 | fresh | `/bot/research?tab=watchbot` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0474 | fresh | `/bot/research?tab=watchbot` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0475 | fresh | `/bot/research?tab=risk` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0476 | fresh | `/bot/research?tab=risk` | button | Back | 44×44 | PASS (external link opens; target site not audited) |
| I-0477 | fresh | `/bot/research?tab=risk` | button | Overview | 84×36 | SAME AS I-0214 (identical control; inventoried, not re-activated) |
| I-0478 | fresh | `/bot/research?tab=risk` | button | Strategies | 89×36 | SAME AS I-0215 (identical control; inventoried, not re-activated) |
| I-0479 | fresh | `/bot/research?tab=risk` | button | Research Lab | 110×36 | SAME AS I-0216 (identical control; inventoried, not re-activated) |
| I-0480 | fresh | `/bot/research?tab=risk` | button | Watchbot | 89×36 | SAME AS I-0217 (identical control; inventoried, not re-activated) |
| I-0481 | fresh | `/bot/research?tab=risk` | button | Risk Center | 98×36 | SAME AS I-0218 (identical control; inventoried, not re-activated) |
| I-0482 | fresh | `/bot/research?tab=risk` | button | Activity & Audit | 124×36 | SAME AS I-0219 (identical control; inventoried, not re-activated) |
| I-0483 | fresh | `/bot/research?tab=risk` | button | Settings | 78×36 | SAME AS I-0220 (identical control; inventoried, not re-activated) |
| I-0484 | fresh | `/bot/research?tab=risk` | button | $20 | 48×26 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0485 | fresh | `/bot/research?tab=risk` | button | $100 | 54×26 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0486 | fresh | `/bot/research?tab=risk` | button | $1000 | 62×26 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0487 | fresh | `/bot/research?tab=risk` | button | $5000 | 65×26 | VERIFIED PASS — example recomputed for $5,000 |
| I-0488 | fresh | `/bot/research?tab=risk` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0489 | fresh | `/bot/research?tab=risk` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0490 | fresh | `/bot/research?tab=risk` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0491 | fresh | `/bot/research?tab=risk` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0492 | fresh | `/bot/research?tab=risk` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0493 | fresh | `/bot/research?tab=activity` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0494 | fresh | `/bot/research?tab=activity` | button | Back | 44×44 | PASS (external link opens; target site not audited) |
| I-0495 | fresh | `/bot/research?tab=activity` | button | Overview | 84×36 | SAME AS I-0214 (identical control; inventoried, not re-activated) |
| I-0496 | fresh | `/bot/research?tab=activity` | button | Strategies | 89×36 | SAME AS I-0215 (identical control; inventoried, not re-activated) |
| I-0497 | fresh | `/bot/research?tab=activity` | button | Research Lab | 110×36 | SAME AS I-0216 (identical control; inventoried, not re-activated) |
| I-0498 | fresh | `/bot/research?tab=activity` | button | Watchbot | 89×36 | SAME AS I-0217 (identical control; inventoried, not re-activated) |
| I-0499 | fresh | `/bot/research?tab=activity` | button | Risk Center | 98×36 | SAME AS I-0218 (identical control; inventoried, not re-activated) |
| I-0500 | fresh | `/bot/research?tab=activity` | button | Activity & Audit | 124×36 | SAME AS I-0219 (identical control; inventoried, not re-activated) |
| I-0501 | fresh | `/bot/research?tab=activity` | button | Settings | 78×36 | SAME AS I-0220 (identical control; inventoried, not re-activated) |
| I-0502 | fresh | `/bot/research?tab=activity` | summary | BTC-USD 1d sma_cross(fast=10,slow=100) $1,000.00 Diagnostic  | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0503 | fresh | `/bot/research?tab=activity` | summary | BTC-USD 1d donchian_breakout(entry=20,exit=20) $1,000.00 Dia | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0504 | fresh | `/bot/research?tab=activity` | summary | BTC-USD 1d ts_momentum(lookback=24,threshold=0) $1,000.00 Di | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0505 | fresh | `/bot/research?tab=activity` | summary | BTC-USD 1d trend_filtered_momentum(filter=200,lookback=24) $ | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0506 | fresh | `/bot/research?tab=activity` | summary | BTC-USD 1d bollinger_reversion(k=2.5,maxHold=24,n=20) $1,000 | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0507 | fresh | `/bot/research?tab=activity` | summary | BTC-USD 1d rsi_reversion(hi=55,lo=25,maxHold=24,n=14) $1,000 | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0508 | fresh | `/bot/research?tab=activity` | summary | BTC-USD 1d vol_compression_breakout(lookback=120,n=20,pct=0. | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0509 | fresh | `/bot/research?tab=activity` | summary | ETH-USD 1d sma_cross(fast=10,slow=200) $1,000.00 Diagnostic  | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0510 | fresh | `/bot/research?tab=activity` | summary | ETH-USD 1d donchian_breakout(entry=20,exit=10) $1,000.00 Dia | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0511 | fresh | `/bot/research?tab=activity` | summary | ETH-USD 1d ts_momentum(lookback=24,threshold=0) $1,000.00 Di | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0512 | fresh | `/bot/research?tab=activity` | summary | ETH-USD 1d trend_filtered_momentum(filter=200,lookback=24) $ | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0513 | fresh | `/bot/research?tab=activity` | summary | ETH-USD 1d bollinger_reversion(k=2,maxHold=24,n=20) $1,000.0 | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0514 | fresh | `/bot/research?tab=activity` | summary | ETH-USD 1d rsi_reversion(hi=55,lo=25,maxHold=24,n=14) $1,000 | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0515 | fresh | `/bot/research?tab=activity` | summary | ETH-USD 1d vol_compression_breakout(lookback=120,n=20,pct=0. | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0516 | fresh | `/bot/research?tab=activity` | summary | BTC-USD 1d vol_filtered_trend(lookback=250,trend=100,vol=20) | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0517 | fresh | `/bot/research?tab=activity` | summary | BTC-USD 1d regime_switch(er=20,erTrend=0.3,k=2,maxHold=20,n= | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0518 | fresh | `/bot/research?tab=activity` | summary | ETH-USD 1d vol_filtered_trend(lookback=250,trend=50,vol=20)  | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0519 | fresh | `/bot/research?tab=activity` | summary | ETH-USD 1d regime_switch(er=20,erTrend=0.3,k=2,maxHold=20,n= | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0520 | fresh | `/bot/research?tab=activity` | summary | BTC-USD 1d weekly_trend(n=100,period=7) $1,000.00 Diagnostic | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0521 | fresh | `/bot/research?tab=activity` | summary | BTC-USD 1d monthly_momentum(lookback=90,period=28) $1,000.00 | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0522 | fresh | `/bot/research?tab=activity` | summary | ETH-USD 1d weekly_trend(n=200,period=7) $1,000.00 Diagnostic | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0523 | fresh | `/bot/research?tab=activity` | summary | ETH-USD 1d monthly_momentum(lookback=90,period=28) $1,000.00 | 354×22 | RESPONDS — content changes; workflow not independently verified · touch target < 24 px (A11Y-2) |
| I-0524 | fresh | `/bot/research?tab=activity` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0525 | fresh | `/bot/research?tab=activity` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0526 | fresh | `/bot/research?tab=activity` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0527 | fresh | `/bot/research?tab=activity` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0528 | fresh | `/bot/research?tab=activity` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0529 | fresh | `/bot/research?tab=settings` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0530 | fresh | `/bot/research?tab=settings` | button | Back | 44×44 | PASS (external link opens; target site not audited) |
| I-0531 | fresh | `/bot/research?tab=settings` | button | Overview | 84×36 | SAME AS I-0214 (identical control; inventoried, not re-activated) |
| I-0532 | fresh | `/bot/research?tab=settings` | button | Strategies | 89×36 | SAME AS I-0215 (identical control; inventoried, not re-activated) |
| I-0533 | fresh | `/bot/research?tab=settings` | button | Research Lab | 110×36 | SAME AS I-0216 (identical control; inventoried, not re-activated) |
| I-0534 | fresh | `/bot/research?tab=settings` | button | Watchbot | 89×36 | SAME AS I-0217 (identical control; inventoried, not re-activated) |
| I-0535 | fresh | `/bot/research?tab=settings` | button | Risk Center | 98×36 | SAME AS I-0218 (identical control; inventoried, not re-activated) |
| I-0536 | fresh | `/bot/research?tab=settings` | button | Activity & Audit | 124×36 | SAME AS I-0219 (identical control; inventoried, not re-activated) |
| I-0537 | fresh | `/bot/research?tab=settings` | button | Settings | 78×36 | SAME AS I-0220 (identical control; inventoried, not re-activated) |
| I-0538 | fresh | `/bot/research?tab=settings` | a | Connections | 82×18 | PASS (navigation) → /connections · touch target < 24 px (A11Y-2) |
| I-0539 | fresh | `/bot/research?tab=settings` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0540 | fresh | `/bot/research?tab=settings` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0541 | fresh | `/bot/research?tab=settings` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0542 | fresh | `/bot/research?tab=settings` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0543 | fresh | `/bot/research?tab=settings` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0544 | fresh | `/portfolio` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0545 | fresh | `/portfolio` | button | Back | 44×44 | PASS (external link opens; target site not audited) |
| I-0546 | fresh | `/portfolio` | button | Refresh balances | 143×44 | FUNCTIONAL BUT POOR UX — no feedback with no addresses (UX-1) |
| I-0547 | fresh | `/portfolio` | a | Connections | 70×15 | PASS (navigation) → /connections · touch target < 24 px (A11Y-2) |
| I-0548 | fresh | `/portfolio` | a | Add a public address | 133×18 | PASS (navigation) → /connections · touch target < 24 px (A11Y-2) |
| I-0549 | fresh | `/portfolio` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0550 | fresh | `/portfolio` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0551 | fresh | `/portfolio` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0552 | fresh | `/portfolio` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0553 | fresh | `/portfolio` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0554 | fresh | `/more` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0555 | fresh | `/more` | a | Paper orders Every simulated order, fill price, fee and refu | 380×64 | PASS (navigation) → /orders |
| I-0556 | fresh | `/more` | a | Holdings Balances of your watched addresses and cost basis › | 380×64 | PASS (navigation) → /portfolio |
| I-0557 | fresh | `/more` | a | Price alerts In-app alert when a coin crosses a price (while | 380×77 | PASS (navigation) → /alerts |
| I-0558 | fresh | `/more` | a | Connections & vault Vault password, watched addresses, API s | 380×64 | PASS (navigation) → /connections |
| I-0559 | fresh | `/more` | a | Support › | 380×52 | PASS (navigation) → /support |
| I-0560 | fresh | `/more` | a | Privacy › | 380×52 | PASS (navigation) → /privacy |
| I-0561 | fresh | `/more` | a | Terms › | 380×52 | PASS (navigation) → /terms |
| I-0562 | fresh | `/more` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0563 | fresh | `/more` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0564 | fresh | `/more` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0565 | fresh | `/more` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0566 | fresh | `/more` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0567 | fresh | `/connections` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0568 | fresh | `/connections` | button | Lock vault | 82×26 | FUNCTIONAL BUT POOR UX — enabled and silent without a vault (UX-2) |
| I-0569 | fresh | `/connections` | input | Create a vault password | 248×44 | RESPONDS — accepts input (invalid input sanitized: no inline error) |
| I-0570 | fresh | `/connections` | button | Create vault | 120×44 | RESPONDS — content changes; workflow not independently verified |
| I-0571 | fresh | `/connections` | select | Blockchain of the address | 380×44 | RESPONDS — accepts input (invalid input sanitized: no inline error) |
| I-0572 | fresh | `/connections` | input | Public address | 380×44 | RESPONDS — accepts input (invalid input sanitized: no inline error) |
| I-0573 | fresh | `/connections` | input | Label (optional) | 380×44 | RESPONDS — accepts input (invalid input sanitized: no inline error) |
| I-0574 | fresh | `/connections` | input | Token contracts (comma separated, optional) | 380×44 | RESPONDS — accepts input (invalid input sanitized: no inline error) |
| I-0575 | fresh | `/connections` | button | Save address | 127×44 | RESPONDS — content changes; workflow not independently verified |
| I-0576 | fresh | `/connections` | input | Etherscan key | 380×44 | RESPONDS — accepts input (invalid input sanitized: no inline error) |
| I-0577 | fresh | `/connections` | input | https://cloudflare-eth.com | 380×44 | RESPONDS — accepts input (invalid input sanitized: no inline error) |
| I-0578 | fresh | `/connections` | input | Helius key | 380×44 | RESPONDS — accepts input (invalid input sanitized: no inline error) |
| I-0579 | fresh | `/connections` | input | https://api.mainnet-beta.solana.com | 380×44 | RESPONDS — accepts input (invalid input sanitized: no inline error) |
| I-0580 | fresh | `/connections` | button | Save API settings | 154×44 | RESPONDS — content changes; workflow not independently verified |
| I-0581 | fresh | `/connections` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0582 | fresh | `/connections` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0583 | fresh | `/connections` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0584 | fresh | `/connections` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0585 | fresh | `/connections` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0586 | fresh | `/alerts` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0587 | fresh | `/alerts` | button | Back | 44×44 | PASS (external link opens; target site not audited) |
| I-0588 | fresh | `/alerts` | select | BTC · Bitcoin ETH · Ethereum SOL · Solana LINK · Chainlink X | 184×48 | RESPONDS — accepts input (invalid input sanitized: no inline error) |
| I-0589 | fresh | `/alerts` | button/radio | Goes above | 77×44 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0590 | fresh | `/alerts` | button/radio | Goes below | 75×44 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0591 | fresh | `/alerts` | input | 63,122.30 | 380×48 | RESPONDS — accepts input (invalid input sanitized: no inline error) |
| I-0592 | fresh | `/alerts` | button | Save alert | 380×48 | RESPONDS — content changes; workflow not independently verified |
| I-0593 | fresh | `/alerts` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0594 | fresh | `/alerts` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0595 | fresh | `/alerts` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0596 | fresh | `/alerts` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0597 | fresh | `/alerts` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0598 | fresh | `/orders` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0599 | fresh | `/orders` | button | Back | 44×44 | PASS (external link opens; target site not audited) |
| I-0600 | fresh | `/orders` | a | Go to Home | 118×48 | PASS (navigation) → / |
| I-0601 | fresh | `/orders` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0602 | fresh | `/orders` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0603 | fresh | `/orders` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0604 | fresh | `/orders` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0605 | fresh | `/orders` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0606 | fresh | `/wallet` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0607 | fresh | `/wallet` | button | testnet | 66×26 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0608 | fresh | `/wallet` | button | mainnet | 72×26 | RESPONDS — content changes; workflow not independently verified |
| I-0609 | fresh | `/wallet` | a | uo1 | 18×15 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json · touch target < 24 px (A11Y-2) |
| I-0610 | fresh | `/wallet` | a | sepoliafaucet | 74×15 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json · touch target < 24 px (A11Y-2) |
| I-0611 | fresh | `/wallet` | a | solfaucet | 51×15 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json · touch target < 24 px (A11Y-2) |
| I-0612 | fresh | `/wallet` | input | (no name) | 346×48 | FUNCTIONAL BUT POOR UX — input has no accessible name (A11Y-3) |
| I-0613 | fresh | `/wallet` | button | Create vault | 346×48 | NOT APPLICABLE — disabled in this state (by design) |
| I-0614 | fresh | `/wallet` | button | Create 12-word wallet | 181×44 | RESPONDS — content changes; workflow not independently verified |
| I-0615 | fresh | `/wallet` | button | Create 24-word wallet | 183×44 | RESPONDS — content changes; workflow not independently verified |
| I-0616 | fresh | `/wallet` | textarea | Enter your 12 or 24 word mnemonic | 346×96 | RESPONDS — accepts input (invalid input sanitized: no inline error) |
| I-0617 | fresh | `/wallet` | button | Import wallet | 127×44 | RESPONDS — content changes; workflow not independently verified |
| I-0618 | fresh | `/wallet` | button | 1 What a wallet is − | 380×48 | RESPONDS — content changes; workflow not independently verified |
| I-0619 | fresh | `/wallet` | button | 2 Self-custody + | 380×48 | RESPONDS — content changes; workflow not independently verified |
| I-0620 | fresh | `/wallet` | button | 3 Testnet vs mainnet + | 380×48 | RESPONDS — content changes; workflow not independently verified |
| I-0621 | fresh | `/wallet` | button | 4 Creating a wallet + | 380×48 | RESPONDS — content changes; workflow not independently verified |
| I-0622 | fresh | `/wallet` | button | 5 Recovery and backup + | 380×48 | RESPONDS — content changes; workflow not independently verified |
| I-0623 | fresh | `/wallet` | button | 6 Network fees + | 380×48 | RESPONDS — content changes; workflow not independently verified |
| I-0624 | fresh | `/wallet` | button | 7 Sending + | 380×48 | RESPONDS — content changes; workflow not independently verified |
| I-0625 | fresh | `/wallet` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0626 | fresh | `/wallet` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0627 | fresh | `/wallet` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0628 | fresh | `/wallet` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0629 | fresh | `/wallet` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0630 | fresh | `/access` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0631 | fresh | `/access` | button | Back | 44×44 | PASS (external link opens; target site not audited) |
| I-0632 | fresh | `/access` | a | Report an issue on GitHub | 167×44 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0633 | fresh | `/access` | a | Terms | 35×15 | PASS (navigation) → /terms · touch target < 24 px (A11Y-2) |
| I-0634 | fresh | `/access` | a | Privacy | 39×15 | PASS (navigation) → /privacy · touch target < 24 px (A11Y-2) |
| I-0635 | fresh | `/access` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0636 | fresh | `/access` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0637 | fresh | `/access` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0638 | fresh | `/access` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0639 | fresh | `/access` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0640 | fresh | `/support` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0641 | fresh | `/support` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0642 | fresh | `/support` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0643 | fresh | `/support` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0644 | fresh | `/support` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0645 | fresh | `/support` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0646 | fresh | `/privacy` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0647 | fresh | `/privacy` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0648 | fresh | `/privacy` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0649 | fresh | `/privacy` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0650 | fresh | `/privacy` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0651 | fresh | `/privacy` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0652 | fresh | `/terms` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0653 | fresh | `/terms` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0654 | fresh | `/terms` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0655 | fresh | `/terms` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0656 | fresh | `/terms` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0657 | fresh | `/terms` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0658 | fresh | `/does-not-exist` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0659 | fresh | `/does-not-exist` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0660 | fresh | `/does-not-exist` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0661 | fresh | `/does-not-exist` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0662 | fresh | `/does-not-exist` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0663 | fresh | `/does-not-exist` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0664 | account | `/` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0665 | account | `/` | button/radio | 1D | 16×44 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json · touch target < 24 px (A11Y-2) |
| I-0666 | account | `/` | button/radio | 1W | 20×44 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json · touch target < 24 px (A11Y-2) |
| I-0667 | account | `/` | button/radio | 1M | 18×44 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json · touch target < 24 px (A11Y-2) |
| I-0668 | account | `/` | button/radio | All | 14×44 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json · touch target < 24 px (A11Y-2) |
| I-0669 | account | `/` | a | Trade | 120×48 | PASS (navigation) → /markets |
| I-0670 | account | `/` | a | Set alert | 122×48 | PASS (navigation) → /alerts |
| I-0671 | account | `/` | a | Wallet | 122×48 | PASS (navigation) → /wallet |
| I-0672 | account | `/` | a | STRONGEST 24H LINK ▲ +2.25% | 190×67 | PASS (navigation) → /markets/LINK |
| I-0673 | account | `/` | a | WEAKEST 24H ETH ▲ +0.65% | 190×67 | PASS (navigation) → /markets/ETH |
| I-0674 | account | `/` | a | All markets | 73×44 | PASS (navigation) → /markets |
| I-0675 | account | `/` | a | BTC Bitcoin BTC $60,202.53 ▲ +0.77% | 380×56 | PASS (navigation) → /markets/BTC |
| I-0676 | account | `/` | a | ETH Ethereum ETH $1,688.56 ▲ +0.65% | 380×56 | SAME AS I-0672 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0677 | account | `/` | a | SOL Solana SOL $70.51 ▲ +1.35% | 380×56 | SAME AS I-0672 (pattern /markets/:sym) (identical control; inventoried, not re-activated) |
| I-0678 | account | `/` | a | Open | 36×44 | PASS (navigation) → /bot |
| I-0679 | account | `/` | a | All orders | 62×44 | PASS (navigation) → /orders |
| I-0680 | account | `/` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0681 | account | `/` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0682 | account | `/` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0683 | account | `/` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0684 | account | `/` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0685 | account | `/markets/BTC` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0686 | account | `/markets/BTC` | button | Back | 44×44 | PASS (navigation) → / |
| I-0687 | account | `/markets/BTC` | button | Remove from watchlist | 44×44 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0688 | account | `/markets/BTC` | a | Charting by TradingView | 35×19 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json · touch target < 24 px (A11Y-2) |
| I-0689 | account | `/markets/BTC` | button/radio | 1M | 40×40 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0690 | account | `/markets/BTC` | button/radio | 5M | 40×40 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0691 | account | `/markets/BTC` | button/radio | 15M | 40×40 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0692 | account | `/markets/BTC` | button/radio | 1H | 40×40 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0693 | account | `/markets/BTC` | button/radio | 4H | 40×40 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0694 | account | `/markets/BTC` | button/radio | 1D | 40×40 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0695 | account | `/markets/BTC` | button/radio | 1W | 40×40 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0696 | account | `/markets/BTC` | button | Paper buy | 186×48 | VERIFIED PASS — trade sheet with account; reconciled |
| I-0697 | account | `/markets/BTC` | button | Paper sell | 186×48 | NOT APPLICABLE — disabled in this state (by design) |
| I-0698 | account | `/markets/BTC` | a | Set a price alert for BTC | 380×48 | PASS (navigation) → /alerts?symbol=BTC |
| I-0699 | account | `/markets/BTC` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0700 | account | `/markets/BTC` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0701 | account | `/markets/BTC` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0702 | account | `/markets/BTC` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0703 | account | `/markets/BTC` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0704 | account | `/bot` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0705 | account | `/bot` | button/radio | Overview | 62×44 | PASS (navigation) → /bot?tab=overview |
| I-0706 | account | `/bot` | button/radio | Strategies | 65×44 | PASS (navigation) → /bot?tab=strategies |
| I-0707 | account | `/bot` | button/radio | Activity | 49×44 | PASS (navigation) → /bot?tab=activity |
| I-0708 | account | `/bot` | button | Check now | 106×44 | MISLEADING — same as I-0174 (BOT-2) |
| I-0709 | account | `/bot` | a | Strategies | 65×44 | PASS (navigation) → /bot?tab=strategies |
| I-0710 | account | `/bot` | button | Pause all paper trading | 380×48 | RESPONDS — content changes; workflow not independently verified |
| I-0711 | account | `/bot` | a | Research Lab · advanced: every test, dataset and run › | 380×52 | PASS (navigation) → /bot/research |
| I-0712 | account | `/bot` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0713 | account | `/bot` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0714 | account | `/bot` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0715 | account | `/bot` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0716 | account | `/bot` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0717 | account | `/bot?tab=activity` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0718 | account | `/bot?tab=activity` | button/radio | Overview | 60×44 | PASS (navigation) → /bot?tab=overview |
| I-0719 | account | `/bot?tab=activity` | button/radio | Strategies | 65×44 | PASS (navigation) → /bot?tab=strategies |
| I-0720 | account | `/bot?tab=activity` | button/radio | Activity | 51×44 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0721 | account | `/bot?tab=activity` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0722 | account | `/bot?tab=activity` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0723 | account | `/bot?tab=activity` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0724 | account | `/bot?tab=activity` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0725 | account | `/bot?tab=activity` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0726 | account | `/portfolio` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0727 | account | `/portfolio` | button | Back | 44×44 | PASS (navigation) → / |
| I-0728 | account | `/portfolio` | button | Refresh balances | 143×44 | FUNCTIONAL BUT POOR UX — same as I-0546 |
| I-0729 | account | `/portfolio` | a | Connections | 70×15 | PASS (navigation) → /connections · touch target < 24 px (A11Y-2) |
| I-0730 | account | `/portfolio` | a | Add a public address | 133×18 | PASS (navigation) → /connections · touch target < 24 px (A11Y-2) |
| I-0731 | account | `/portfolio` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0732 | account | `/portfolio` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0733 | account | `/portfolio` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0734 | account | `/portfolio` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0735 | account | `/portfolio` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
| I-0736 | account | `/orders` | a | HELIX home | 97×44 | SAME AS I-0001 (identical control; inventoried, not re-activated) |
| I-0737 | account | `/orders` | button | Back | 44×44 | PASS (navigation) → / |
| I-0738 | account | `/orders` | button/radio | All | 18×44 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json · touch target < 24 px (A11Y-2) |
| I-0739 | account | `/orders` | button/radio | Filled | 35×44 | NO VISIBLE TEXT CHANGE — state/visual toggle (selected option, canvas); manual spot-checks in verify-no-effect.json |
| I-0740 | account | `/orders` | button/radio | Refused | 53×44 | RESPONDS — content changes; workflow not independently verified |
| I-0741 | account | `/orders` | a | Home | 82×56 | SAME AS I-0016 (identical control; inventoried, not re-activated) |
| I-0742 | account | `/orders` | a | Markets | 82×56 | SAME AS I-0017 (identical control; inventoried, not re-activated) |
| I-0743 | account | `/orders` | a | Bot | 82×56 | SAME AS I-0018 (identical control; inventoried, not re-activated) |
| I-0744 | account | `/orders` | a | Wallet | 82×56 | SAME AS I-0019 (identical control; inventoried, not re-activated) |
| I-0745 | account | `/orders` | a | More | 82×56 | SAME AS I-0020 (identical control; inventoried, not re-activated) |
