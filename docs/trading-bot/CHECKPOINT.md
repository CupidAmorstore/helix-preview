# CHECKPOINT — resume here

- Repo / branch: `CupidAmorstore/helix-preview` @ `ccr-8d17e0b5-yaqvtm` (see `git log` for HEAD SHA)
- Completed: source search (not recoverable) · HELIX baseline · bot engine (`src/bot`) · 59 tests · research runner ·
  154 candidates evaluated on real data (0 qualified) · 14 diagnostic paper accounts started · `/bot` app section · docs
- Modified outside `src/bot`: `package.json` (script), `package-lock.json`, `eslint.config.js`, `src/App.tsx`,
  `src/components/AppShell.tsx`, `src/components/navigation.ts`, `src/vite-env.d.ts`
- Active experiments: R1 forward paper (accounts created 2026-11-22 20:00:26 UTC); R2 order-book cost collection
  (`research/costs/*.jsonl`, started 2026-11-22; swap placeholders only after 30 days)
- Datasets: `research/data/coinbase_*_{1h,1d}.csv.gz` (ids in run JSONs)
- Unresolved: 4 moderate advisories via @solana/web3.js 1.x (v3 migration needed), DEX discovery missing,
  wallet send paths untested in browser
- Next command: `npm ci && npm test && npm run bot:research -- --watch-only`
- Owner decisions pending: (1) export ChatGPT code for R0? (2) merge branch to `main` (auto-deploys Pages)?
  (3) schedule daily watch-only runs? (4) plan a Solana v3 wallet migration?
