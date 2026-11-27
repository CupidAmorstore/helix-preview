# 17 — Trust and transparency (skeptical-customer review)

| Question a skeptical user asks | What HELIX answers today | Verdict |
|---|---|---|
| Why should I trust it? | Paper banner on every screen; real-money "Locked (no order code)"; fees shown before/after every order | partly earned |
| Who controls my funds? | Paper: nobody (simulated). Wallet: keys encrypted on the device; sending disabled | clear in Wallet/Terms; not on Home |
| Where does data come from? | "Live · Coinbase" + age on asset pages; sources row on Bot | good |
| What does the bot actually do? | "No strategy has earned the right to trade yet" + reasons | honest, but **misstates** schedule and "last research run" (BOT-1, BOT-2) |
| Can I verify its performance? | Research Lab lists every candidate with windows, costs, reasons; repo is public | strong (rare in this market) |
| What happens when something goes wrong? | offline state, stale-price refusal, ledger reconcile-and-halt | good; **no support contact beyond a GitHub issues link** |
| Are results reproducible? | content-hashed datasets, code SHA in run records | strong (for technical users only) |
| Is it exaggerating? | No profitability claims found in text crawl; "with real fees" overstates (modelled) | minor |
| Is my information protected? | no server, no analytics; vault encryption | good; privacy policy is a placeholder |
| Can I leave with my data? | no export | **gap** (WA-3) |

## Trust-damaging elements found
1. "[TODO: Legal review required]" visible on Support, Privacy and Terms (**TR-1 P1**) — the single most
   damaging thing a skeptical reviewer would screenshot.
2. "scheduled daily" research that does not run; "Last successful research run" that is a data refresh (BOT-1/2).
3. Unexplained 199 / 4 / 0 (BOT-3).
4. Publicly downloadable *debug* build signed with a public key (SEC-1/2).
5. "Holdings" vs "Watched addresses" vs "paper position" naming (WA-4).
6. No identifiable operator / contact / jurisdiction on Support.
