# 09 — Market data integrity

Evidence: `evidence/market-data-check.json` (tool `tools/market-data-check.cjs`), source review of
`src/services/market.ts`, `marketData.ts`, `src/pages/MarketsPage.tsx`, `AssetPage.tsx`.

## Independent price comparison (2026-11-25 23:01 UTC)
| Asset | HELIX shows | Coinbase public ticker (same second) | Diff | Label shown |
|---|---|---|---|---|
| BTC | $59,940.13 | 59,940.13 | 0.000% | Live · Coinbase |
| ETH | $1,679.27 | 1,679.27 | 0.000% | Live · Coinbase |
| SOL | $70.19 | 70.19 | 0.000% | Live · Coinbase |
| XRP | $0.9332 | 0.9332 | 0.000% | Live · Coinbase |
| DOGE | $0.0557 | 0.05572 | −0.036% (display rounding) | Live · Coinbase |
| LINK | $9.00 | 8.999 | +0.011% (display rounding) | Live · Coinbase |
Verdict: **VERIFIED** for sampled assets. Prices are live Coinbase trades and labelled as such.

## Sources and freshness
- Live prices: Coinbase Exchange public WebSocket/REST; market cap, rank and logos: CoinGecko (cached in
  `localStorage` with fetch time). Asset page shows "Coinbase stats Ns ago · CoinGecko Ns ago".
- The trade sheet refuses to fill when the quote is older than 60 s ("Waiting for a live price…") — stale prices
  cannot be traded on.
- Offline: emulator test "offline state is shown" and "prices recover after reconnecting" pass.

## Findings
| ID | Sev | Finding |
|---|---|---|
| MD-1 | P3 | Low-priced coins are shown with 4 decimals (DOGE $0.0557 vs 0.05572); sub-cent tokens need significant-digit formatting. |
| MD-2 | P2 | When CoinGecko is unavailable or rate-limited, an asset with no Coinbase USD pair (e.g. USDC, rank #5) shows "We couldn't find a coin called USDC on Coinbase **or in the top 100 by market cap**" — a false statement. Root cause: `AssetPage.tsx` swallows the `fetchTopCoins()` error (`.catch(() => undefined)`) and treats it as "not found". Reproduced during crawling (429s); when CoinGecko responds the page is correct and explains "no Coinbase USD market, so live charts and paper trading are not available". |
| MD-3 | P3 | Market cap/volume come from CoinGecko's free API (rate-limited, HTTP 429 seen during crawling); on 429 the list falls back to cached values — the cache age is shown on the asset page but not on the list. |
| MD-4 | P2 | Same-symbol tokens on other chains are not distinguished (no network/contract shown); Markets is Coinbase-centric, so this is low-risk today but must be addressed before DEX/multichain discovery (stated as not implemented). |
| MD-5 | P3 | Chart timezone is the device's; axis has no timezone label. Last candle is the in-progress bucket updated with the live price (intended; not labelled as incomplete). |
Not tested: newly listed assets, liquidity data (not implemented: "Network and liquidity-pool data are not available yet").
