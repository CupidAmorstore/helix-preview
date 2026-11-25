# Holdout provenance registry (AUD-204)

File: `research/provenance.json` (append-only). Code: `src/bot/provenance.ts`. Legacy `research/registry.json`
(199 entries) is kept unchanged as the Bonferroni count and the market/timeframe guard.

## Record
`runId, category (single|pooled|xs), family, key, venue, markets, assets (canonical), intervalMs, datasetIds,
datasetSha256, windows {train, validation, test} (epoch ms), testOpened, gateVersion, status, source`.

## Exposure rules for a new candidate (OOS = validation start … test end)
| Class | Condition (shared canonical asset, any timeframe, any category, any dataset hash) | Effect |
|---|---|---|
| direct | an earlier record's validation window, or its opened test window, overlaps the OOS period | blocks qualification |
| unknown | an earlier record has no reconstructable windows | blocks (potentially contaminated) |
| indirect | overlap only with an earlier training window | disclosed, not blocking |
Canonical assets: base symbol with quote stripped (`BTC-USD`, `BTC/USDT`, `btcusdt` → BTC) and wrapped / staked
aliases (WBTC, cbBTC, tBTC → BTC; WETH, cbETH, stETH, wstETH, rETH → ETH; mSOL, jitoSOL, bSOL → SOL).
A refreshed dataset (new hash) over an inspected period is not fresh evidence.

## Migration (2026-11-25, `scripts/migrate-provenance.ts`, refuses to overwrite)
Built from all 10 run records: **200 records** — 180 single-market, 18 pooled, 2 cross-sectional (the registry had
overwritten the earlier XS evaluation; provenance keeps both). All 200 windows reconstructed; 4 opened tests;
0 registry-only (unreconstructable) entries. Consequence: for all 10 research coins, the recent daily and hourly
history is directly inspected — any new backtest on it is blocked from qualifying.

## Tests
`src/__tests__/bot/provenance.test.ts` (23, plus 8 feed-trust tests).
