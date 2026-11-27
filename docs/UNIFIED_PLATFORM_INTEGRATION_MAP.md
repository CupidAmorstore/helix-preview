# Unified platform integration map

**Status: INTEGRATION NOT STARTED: blocked on source recovery** (OMEGA and Trading Lab inaccessible; see
`docs/MASTER_SOURCE_RECOVERY_REPORT.md`). Nothing was merged blindly; no private source was published.

## Target shape (agreed direction, to validate against OMEGA once recovered)
- **One app:** HELIX OMEGA as the primary platform; **Trading Bot** as a dedicated section; Preview improvements ported.
- **Canonical repository:** a new **private** repository holding OMEGA history (owner creates it; see recovery report).
  `helix-preview` stays public and must never receive OMEGA or Trading Lab source.
- **Boundaries:** paper ledger and research engine as separately testable modules; real-money paths absent or
  fail-closed in the execution layer; research feed is data only (validated, can never enable execution).

## Integration procedure (once sources exist)
1. Read both sources; fill `THREE_WAY_SOURCE_COMPARISON.md` with verified facts and tests.
2. Branch `integration/unified` in the private repo from the OMEGA head chosen by the owner (rollback point = that SHA).
3. For each overlapping module choose by: completeness → safety → evidence (tests) → recency; record the decision.
4. Port Preview modules via adapters (no blind merge). Each port carries its regression tests.
5. Trading Lab: wrap as a research module behind a data contract (`BotSummary`-like, validated) and a paper-execution
   interface; its datasets/registry keep their provenance and negative results.

## Preview improvements that must survive integration (with their tests)
| Improvement | Module | Tests |
|---|---|---|
| Vault verification, single-flight unlock, throttle, wall-clock + native-lifecycle auto-lock | `src/services/vaultCore.ts`, `vault.tsx` | `vaultCore.test.ts` (20) + device check |
| Android backup exclusion | `AndroidManifest.xml`, `res/xml/data_extraction_rules.xml` | build |
| Fail-closed signing/broadcast | `src/services/wallet.ts` | `realMoneyIsolation.test.ts` |
| Serialized ledger writes, rollback, reconciliation, market-order accounting, partial fills, fees | `src/paper/*` | `paperLedger.test.ts`, `paper.test.ts` |
| Paper order history, simulated labels | `src/pages/OrdersPage.tsx`, `HomePage.tsx` | functional QA |
| Feed reconnection, stale detection, heartbeat watchdog | `src/services/market.ts`, `useLivePrices.ts` | `market.test.ts`, `feedReliability.test.ts` |
| Android Back, safe areas, dark bars | `useNativeShell.ts`, styles | `nativeShell.test.ts` + device |
| Ledger design system | `tailwind.config.cjs`, `ui.tsx`, `styles.css` | visual QA |
| Holdout reuse guard, cumulative Bonferroni, survivorship gate, provenance | `src/bot/research.ts`, `validation.ts` | `researchIntegrity.test.ts`, `crossSectional.test.ts` |
| Research feed validation | `src/bot/feedValidation.ts` | `feedValidation.test.ts` |

If OMEGA already has a stronger version of any row, keep OMEGA's and record why.
