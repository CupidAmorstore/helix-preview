# 24 — Persona walkthroughs (SIMULATED — not human usability research)

These are the auditor's simulated walkthroughs of the web build at 412 px and the emulator screenshots. They are
hypotheses to test with real people (recommended: ≥ 8 participants, including beginners and a screen-reader user).

| Persona | Task | Where it breaks or creates doubt (simulated) |
|---|---|---|
| Crypto beginner | "What is this app and what do I do first?" | Home explains paper trading well; "Wallet", "Watched addresses", "Holdings", "paper position" are four holding concepts with no introduction. Strategy cards show `sma_cross(fast=10,slow=100)` in Activity. |
| Skeptical first-time customer | "Is this a scam?" | Reassured by paper banner and fees; loses trust at "[TODO: Legal review required]" on Support/Privacy/Terms and at a publicly downloaded debug APK. |
| Professional trader | "Can I trade properly?" | Market orders only, line chart only, no depth, no limit/stop orders; research methodology impresses but is buried in the Research Lab. |
| Small-capital investor ($20–$100) | "Will fees eat me?" | Fee is shown per order (good); capital-tier table exists only in Research Lab › Risk; Home does not warn that 1.2% round trips are large for small trades. |
| Security-conscious wallet user | "Is my seed safe?" | Vault, encryption, background lock and no-send are clear; would want a security page (threat model, what leaves the device) and a non-debug signed build. |
| Limited technical knowledge | "Buy $10 of bitcoin (paper)" | Achievable in 4 taps from Home → Markets → Bitcoin → Paper buy; amount presets help. |
| Accessibility needs | Screen reader, 200% text | Untested on TalkBack (blocked); browser 200% font sweep results in 15. Colour is paired with ▲/▼ glyphs (good). |
| Unreliable internet | Open app offline | Clear offline state; unvisited Research Lab opens offline; trading refuses stale prices (verified on emulator). |
| Hostile reviewer | Find misleading claims | Finds "scheduled daily" (false), "Last successful research run" (actually a data refresh), "with real fees" (modelled), TODO legal text. |
| Comparing with Coinbase/Binance | "Why not just use Coinbase?" | The genuine differentiators (order-book paper fills, honest bot) are not stated anywhere on the first screen. |
