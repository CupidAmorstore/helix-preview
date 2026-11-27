# HELIX product-integrity audit (2026-11-25) — index and resume checkpoint

Start with `00_EXECUTIVE_VERDICT.md`. Findings: `19_COMPLETE_DEFECT_REGISTER.csv` (38). Roadmap: `21`. Next prompt: `23`.
Extra: `24_PERSONA_SIMULATIONS.md` (simulated, not human research).

## Evidence (`evidence/`)
`interaction-registry.json` (745 elements, status per `I-####`), `pages.json` (32 page-states: load, layout, axe,
text zoom), `text-registry.json` (2,843 texts), `text-flags.json`, `viewport-sweep.json`, `market-data-check.json`,
`reconciliation.json`, `verify-no-effect.json`, `perf.json`, `audit-environment-manifest.json`,
`test-coverage-report.json`, `screens/` (32 full-page screenshots + dialogs), `progress.log`.
Android emulator evidence: GitHub Actions artifact `android-e2e-evidence` (run 45651406413).

## Reproduce
```
npx vite build && npx vite preview --port 4173 &
node docs/audits/omega-product-integrity/tools/interaction-audit.cjs http://localhost:4173 <out> <axe.min.js>
node docs/audits/omega-product-integrity/tools/{market-data-check,reconciliation,verify-no-effect,perf}.cjs http://localhost:4173 <out.json>
```

## Checkpoint (for the next session)
- Completed: everything in this directory at source `d7174f1`. No product code was changed by the audit.
- Blocked: physical device, TalkBack, OMEGA/Trading Lab sources, competitor apps, human participants.
- Remaining interactions: 0 of the discovered set (statuses in the registry); re-run the crawler after fixes.
