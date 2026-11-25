# Next session handoff (Claude Code / Antigravity / Codex / GPT Work)

Read first: `docs/MASTER_PROJECT_STATE.md` (authoritative), then `MASTER_SOURCE_RECOVERY_REPORT.md`.

## Do not repeat
- Source search of: this cloud container, 15 GitHub repos, Google Drive titles/zips (done 2026-11-24; nothing found).
- Preview remediation and audits (see `FINAL_UNIFIED_PLATFORM_AUDIT.md`); research already run on stored datasets
  (registry keeps them from being re-tested as fresh). Done 2026-11-25: walk-forward (gates-v2), multi-day families
  (22 more candidates, 0 qualified, N=199), web3.js removal, Research Lab phone layout.

## Rules that carry over
Paper only; no signing/broadcast; never push OMEGA/Trading Lab into the public `helix-preview`; never reset or delete
research records; costs not lowered without evidence; no destructive git; no secrets in chat or repo.

## First actions when the owner has provided the private repository
1. `git clone` it read-only into the session; record branches, SHAs, `git status`, stashes, worktrees in
   `MASTER_SOURCE_RECOVERY_REPORT.md` (status → RECOVERED AND VERIFIED, with test results).
2. Run OMEGA's own tests (reported 22/22 at verified-beta); record pass/fail.
3. Fill `THREE_WAY_SOURCE_COMPARISON.md` with verified facts; decide per module (completeness → safety → evidence →
   recency).
4. Create `integration/unified` in the **private** repo from the owner-chosen OMEGA head; port Preview modules with their
   tests (list in `UNIFIED_PLATFORM_INTEGRATION_MAP.md`).
5. Trading Lab: reproduce its Nov 21 figures from its own artifacts before integrating; keep its negative results.

## Useful commands (Preview)
`npm ci && npm test && npm run typecheck && npm run lint && npm run build` · research: `npm run bot:research -- --offline` ·
studies: `npx vite-node --config scripts/vite.node.config.ts scripts/{null-study,survivorship-study,cost-horizon-study}.ts` ·
browser QA: `node docs/qa/{functional-check,wallet-flow,research-mobile}.cjs http://localhost:4173 <outdir>` and
`node docs/qa/deep-check.cjs http://localhost:4173 <path to axe.min.js> <outdir>` after
`npx vite build && npx vite preview --port 4173`.
