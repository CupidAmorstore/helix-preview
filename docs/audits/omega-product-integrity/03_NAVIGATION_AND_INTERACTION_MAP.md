# 03 — Navigation and interaction map

Source: `src/App.tsx`, `src/components/navigation.ts`, link extraction per page, crawler NAVIGATES outcomes
(`evidence/interaction-registry.json`).

```
Bottom nav (every screen): Home · Markets · Bot · Wallet · More
Home ──► /markets (All markets) ──► /markets/:sym ──► Paper buy/sell sheet
     ├─► /bot (bot card "Open")           ├─► /markets (back)
     ├─► /orders (All orders)             └─► Charting by TradingView (external)
     ├─► /alerts · /portfolio · /wallet
Markets ──► search / tabs (All, Watchlist, Gainers, Losers) / sort ──► /markets/:sym
Bot ──► ?tab=overview | strategies | activity
    └─► /bot/research ──► ?tab=overview | strategies | lab | watchbot | risk | activity | settings
                         └─► /connections (API settings)
Wallet ──► testnet/mainnet · create/import vault · guide (accordion)
More ──► /orders (Paper orders) · /portfolio (Holdings = Watched addresses) · /alerts · /connections
     └─► /support · /privacy · /terms
Hidden: /access (no inbound link) · deep links: none declared on Android
```

## Task cost (taps from app start)
| Task | Taps | Notes |
|---|---|---|
| Open a paper account | 2 | Home: choose amount → Open |
| Paper-buy $50 of BTC | 5 | Markets → Bitcoin → Paper buy → amount → Place |
| See why the bot is not trading | 1 | Bot (reasons on Overview) |
| See every rejected test | 3 | Bot → Research Lab → Strategies |
| Resume paused paper trading | 1–2 | Bot → Protections (trade sheet points to a non-existent "Bot → Risk": WA-1) |
| Create a wallet | 3+ | Wallet → password → create |

## Findings
Dead end: WA-1. Orphan: /access (UX-4). Naming mismatch: More "Holdings" → `/portfolio` → "Watched addresses"
(UX-5). Two "Strategies" and two "Activity" tabs (Bot and Research Lab) with different depth — acceptable
(beginner vs advanced) but the Research Lab entry is the only link between them. No circular navigation; Back
behaves consistently (emulator: Back closes sheet, returns to previous screen, leaves app from Home).
