# Audit remediation report — PR #3

- **Repository:** https://github.com/CupidAmorstore/helix-preview · **branch** `ccr-8d17e0b5-yaqvtm`
- **PR:** https://github.com/CupidAmorstore/helix-preview/pull/3 (draft, not merged)
- **Audited baseline:** `4a1b958` · **Remediation code head:** `7038621` (docs commit follows) · **Base:** `main` @ `dca30a7`
- **APK built from `7038621`:** debug build #25, sha256 `ebce65285ca63315adc2ea465e56e763bf3bc755db950c873c145f24d7084815`

The independent audit's original report was not provided to me verbatim; findings below are those named in the remediation
directive plus those I found while reproducing and self-auditing. Severities for directive findings follow the directive.

## Commits (in order)
| SHA | Scope |
|---|---|
| `63d74e3` | Vault: no unverified unlock; throttling; background lock; Android backup off |
| `9843b31` | Paper ledger: serialized mutations, rollback on failed save, future quotes refused, invariant tests |
| `7a1bc3d` | Research: real portfolio accounting, holdout guard, null study, re-run |
| `06ee998` | Real-money isolation: mainnet send disabled at source, chain verification, source scan |
| `f33a81f` | UI / legal claims corrected |
| `b4a8875` | Research feed: strict validation in app + CI publish gate |
| `f85f69c` | Device test covers the wallet |
| `5f0b5ec` | Self-audit: holdout guard keyed by market+timeframe |
| `7038621` | Price feed heartbeat watchdog (found on the emulator) |

## Findings
| ID | Orig. severity | Finding | Reproduced | Root cause | Fix (file:line) | Tests | Status |
|---|---|---|---|---|---|---|---|
| V-1 | CRITICAL | Vault fail-open: salt without verifier/data accepted any password | yes (code) | "nothing to check" treated as success | `vaultCore.ts:71` `openVault`; `vault.tsx:69` | `vaultCore.test.ts` (15) | FIXED |
| V-2 | MEDIUM | Corrupted verifier locked the owner out; exchange payloads not checked | yes (test) | verifier was the only proof | proven by real data, verifier repaired (`vaultCore.ts:82–92`) | same | FIXED |
| V-3 | MEDIUM | Unlimited fast password retries | yes | no throttle | `failureDelayMs` `vaultCore.ts:96`, persisted counter `vault.tsx:89` | same | FIXED |
| V-4 | MEDIUM | Android backup/extraction of app data | yes (manifest `allowBackup=true`) | default config | `AndroidManifest.xml:5–7`, `res/xml/data_extraction_rules.xml` | CI APK build | FIXED (build-verified) |
| V-5 | LOW | Secrets kept while app in background | n/a | idle timer only | 60 s background lock `vault.tsx:109` | device lock check | FIXED |
| P-1 | HIGH | Lost update between overlapping paper orders / valuation | yes (test) | `accRef` updated only on render | `serialStore.ts:5`, `PaperProvider.tsx` | `paperLedger.test.ts` concurrency | FIXED |
| P-2 | MEDIUM | Failed save left memory ahead of disk | yes (test) | no rollback | `serialStore.ts:24` | same | FIXED |
| P-3 | MEDIUM | Future-dated quotes/books accepted | yes (test) | only "too old" checked | `engine.ts:181`, `engine.ts:103` | same | FIXED |
| P-4 | — | Ledger correctness (cash, inventory, cost basis, fees, band) | invariant tests (300×40) | — | — | `paperLedger.test.ts` | VERIFIED |
| R-1 | HIGH | Real-money path reachable (wallet mainnet send) | yes | by design, behind consent | `wallet.ts:18–23` + guards in every send; chain verified (`wallet.ts:135–163`); UI | `realMoneyIsolation.test.ts` (7) | FIXED (mainnet send disabled) |
| R-2 | HIGH | Cross-sectional turnover/accounting inaccurate | yes | membership-count cost model | `crossSectional.ts:45` | hand-calculated tests | FIXED |
| R-2b | HIGH (found by test) | Rebalance costs leaked out of OOS period returns | yes (test) | post-trade base | `crossSectional.ts:96` | compounding test | FIXED |
| R-3 | HIGH | Holdout reuse across runs counted as fresh evidence | yes | no tracking | `research.ts:61–76` | `researchIntegrity.test.ts` | FIXED |
| R-3b | HIGH (self-audit) | Guard keyed by dataset hash, bypassed by daily refetch | yes (reasoning + test) | wrong key | keyed by market+timeframe | regression test | FIXED |
| R-4 | MEDIUM | Look-ahead in new builders / portfolio | audited | — | runtime assertion `crossSectional.ts:70` | mutation tests | NOT REPRODUCED (no leak found) |
| R-5 | MEDIUM | Statistical claims (false positives) unmeasured | n/a | — | `scripts/null-study.ts` | 560 null tests → 0 qualified | VERIFIED |
| R-6 | MEDIUM | Survivorship bias in the universe | yes | coins chosen today | documented in run assumptions | — | PARTIAL (documented; no free fix) |
| U-1 | MEDIUM | Legal text said "read-only"; consent implied mainnet sending; alerts implied notifications; research schedule claimed before it ran | yes | stale copy | `LegalPage.tsx`, `WalletPage.tsx:283–291`, `navigation.ts`, `BotPage.tsx` | QA scripts | FIXED |
| F-1 | MEDIUM | Feed validation only shallow | yes | top-level checks | `feedValidation.ts:42`; `botData.ts` | `feedValidation.test.ts` (5) | FIXED |
| F-2 | MEDIUM | Failed research run could republish | partly (restored backup but no validity/novelty check) | — | `scripts/validate-feed.ts`, `deploy-pages.yml` | script run locally | FIXED (runs only after merge) |
| A-1 | MEDIUM (found on emulator) | "Live" shown >8 s after network loss | yes (device) | dead socket stays open on Android | heartbeat watchdog `market.ts` | `market.test.ts` + device | FIXED |

**Totals:** 20 items. FIXED 16 · VERIFIED (no defect) 2 · PARTIAL 1 (survivorship) · NOT REPRODUCED 1 (look-ahead).

## Test evidence at `7038621`
| Suite | Command | Result |
|---|---|---|
| Unit/integration | `npm test` | **158 passed, 0 failed, 0 skipped** (23 files) |
| Types / lint | `npm run typecheck`, `npm run lint` | 0 errors (2 existing warnings: react-refresh exports) |
| Build | `npm run build` | ok |
| Browser feature checks | `node docs/qa/functional-check.cjs` | 64/64 |
| Browser deep checks (offline, money, a11y, layout, memory) | `node docs/qa/deep-check.cjs` | 21/21, axe 0 violations |
| Wallet lifecycle (browser) | `node docs/qa/wallet-flow.cjs` | 10/10 |
| Android build + emulator | CI `apk`, `device` | success; **24/24** |
| Null study | `vite-node scripts/null-study.ts 60` | 0/560 qualified |
| Research re-run | `npm run bot:research -- --offline` | 0 qualified; XS re-evaluated (see research report) |

## Unverified / remaining
- Physical Android device testing (none performed).
- Release signing (owner keystore needed); APK is a debug build.
- Daily research feed + publish gate run only after merge to `main`.
- Untestable research families (no free historical data); survivorship bias.
- `uuid` moderate advisories via `@solana/web3.js`.
- Brute-force delay cost on low-end phones; Android backup exclusion not exercised on a device.
- Low-severity UX: an existing vault with nothing encrypted silently becomes a new vault with the typed password (nothing is
  exposed; message could be clearer).

Detail: `docs/SECURITY_VERIFICATION.md`, `docs/PAPER_ACCOUNTING_VERIFICATION.md`, `docs/RESEARCH_VALIDATION_REPORT.md`,
`docs/ANDROID_E2E_RESULTS.md`.
