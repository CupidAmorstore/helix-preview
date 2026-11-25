# Next session handoff (Claude Code / Antigravity / Codex / GPT Work)

Read first: `docs/MASTER_PROJECT_STATE.md` (authoritative), `INDEPENDENT_AUDIT_REMEDIATION_2026_11_25.md`,
`RESEARCH_INTEGRITY_V3.md`.

## Do not repeat
- Source search of this container, 15 GitHub repos (incl. code search 2026-11-25), Google Drive titles/zips.
- AUD-201…208 remediation (done, 91 new tests); Solana equivalence vs web3.js (done, evidence JSON).
- Backtests on the stored history: provenance (`research/provenance.json`) now blocks any qualification from it.

## Rules that carry over
Paper only; no signing/broadcast; never push OMEGA/Trading Lab into the public repo; append-only research records
(registry, provenance, runs); costs not lowered without evidence; gates never relaxed (v3 is current); no
destructive git; no secrets in chat or repo; no merge into `main` without owner approval.

## Next autonomous work (if the owner provides nothing new)
1. Forward paper-trading harness for ≤ 3 pre-registered rules (protocol in the research master report).
2. Product pass on Home / Markets / Portfolio / Trading Bot screens (section 10 of the 2026-11-25 directive was
   not addressed this cycle).
3. Replace `vite-plugin-node-polyfills` with explicit buffer/process shims (removes the 6 low build-chain advisories).

## When the owner provides the private repository
Clone read-only, record branches/SHAs/stashes/worktrees, run OMEGA's tests, fill `THREE_WAY_SOURCE_COMPARISON.md`,
create `integration/unified` in the private repo, port Preview modules with their tests (map in
`UNIFIED_PLATFORM_INTEGRATION_MAP.md`; add walkForward.ts, provenance.ts and the v3 stats).

## Useful commands
`npm ci && npm test && npm run typecheck && npm run lint && npm run build` ·
`npx vite-node --config scripts/vite.node.config.ts scripts/<research-bottleneck-study|migrate-provenance|solana-equivalence>.ts` ·
browser QA: `node docs/qa/{functional-check,wallet-flow,research-mobile}.cjs http://localhost:4173 <out>` and
`node docs/qa/deep-check.cjs http://localhost:4173 <axe.min.js> <out>` after `npx vite build && npx vite preview --port 4173`.
