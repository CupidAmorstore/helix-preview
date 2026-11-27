# 02 — Complete application inventory

Source `d7174f1`, web build; crawler `tools/interaction-audit.cjs`; machine-readable registry `evidence/interaction-registry.json` (every element has an `I-####` id).

- Routes in `src/App.tsx`: **16** (incl. hidden `/access` and 404). Tabs reachable by `?tab=`: Bot 3, Research Lab 7. Page-states crawled: **32** (26 fresh + 6 with a paper account).
- Interactive elements discovered: **745**; individually activated: **248**; identical copies (global nav, repeated list rows after 3): **494**; disabled: **3**.
- Visible text elements: **2843** (1337 unique).
- Dialogs/sheets found: Paper trade sheet (buy/sell). Expandable sections (`summary`): Research Lab candidate rows, assumptions, wallet guide.
- Backend endpoints: none (no server). External APIs: Coinbase REST/WS, CoinGecko, Blockstream/mempool.space, Etherscan, Solana RPC, GitHub Pages feed (404).
- Background tasks on device: market polling while open; vault auto-lock; price alerts while open. **No background research on device.** Off-device: research script (manual), daily forward paper task (scheduled, branch).
- Database operations: IndexedDB (paper account, vault, alerts, watched addresses), localStorage (market cache).

| State | Route | Elements by kind | Total |
|---|---|---|---|
| account | `/` | a:17, radio:4 | 21 |
| account | `/bot` | a:8, radio:3, button:2 | 13 |
| account | `/bot?tab=activity` | a:6, radio:3 | 9 |
| account | `/markets/BTC` | a:8, radio:7, button:4 | 19 |
| account | `/orders` | a:6, radio:3, button:1 | 10 |
| account | `/portfolio` | a:8, button:2 | 10 |
| fresh | `/` | a:13, button:7 | 20 |
| fresh | `/access` | a:9, button:1 | 10 |
| fresh | `/alerts` | a:6, button:2, radio:2, select:1, input:1 | 12 |
| fresh | `/bot` | a:8, radio:3, button:1 | 12 |
| fresh | `/bot/research?tab=activity` | summary:22, button:8, a:6 | 36 |
| fresh | `/bot/research?tab=lab` | button:8, a:6, summary:1 | 15 |
| fresh | `/bot/research?tab=overview` | button:8, a:6 | 14 |
| fresh | `/bot/research?tab=risk` | button:12, a:6 | 18 |
| fresh | `/bot/research?tab=settings` | button:8, a:7 | 15 |
| fresh | `/bot/research?tab=strategies` | button:213, a:6 | 219 |
| fresh | `/bot/research?tab=watchbot` | button:9, a:6 | 15 |
| fresh | `/bot?tab=activity` | a:6, radio:3 | 9 |
| fresh | `/bot?tab=strategies` | button:12, a:6, radio:3 | 21 |
| fresh | `/connections` | input:8, a:6, button:4, select:1 | 19 |
| fresh | `/does-not-exist` | a:6 | 6 |
| fresh | `/markets` | a:106, radio:7, input:1 | 114 |
| fresh | `/markets/BTC` | a:8, radio:7, button:4 | 19 |
| fresh | `/markets/NOTACOIN` | a:7, button:1 | 8 |
| fresh | `/markets/USDC` | a:6, button:2 | 8 |
| fresh | `/more` | a:13 | 13 |
| fresh | `/orders` | a:7, button:1 | 8 |
| fresh | `/portfolio` | a:8, button:2 | 10 |
| fresh | `/privacy` | a:6 | 6 |
| fresh | `/support` | a:6 | 6 |
| fresh | `/terms` | a:6 | 6 |
| fresh | `/wallet` | button:13, a:9, input:1, textarea:1 | 24 |

Not discoverable by the crawler (recorded, not skipped): long-press/swipe gestures (none implemented), Android back button and system dialogs (covered by emulator run 47), keyboard insets (emulator 05-trade-sheet-keyboard.png).
