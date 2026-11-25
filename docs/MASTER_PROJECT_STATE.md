# MASTER PROJECT STATE (single authoritative status — update on every cycle)

Last updated: 2026-11-25 (independent-audit remediation cycle). No secrets in this file.

## Source locations
| Body | Location | Access from cloud | Status |
|---|---|---|---|
| HELIX OMEGA | owner's Windows PC `C:\Users\Sam\.gemini\antigravity\scratch\helix` (verified-beta `a12fc5a7…`, possible OMEGA 4.2 WIP) | **No** (no shared computer folders; 0 hits in 15 repos) | **inaccessible** |
| Trading Lab / Pro Trading Bot | owner devices / ChatGPT / Termux; `Trading_Lab_v070_Multichain_Source_and_Evidence.zip`, `Trading_Lab_Paper_Strategy_Study_20261121.zip` | **No** | **inaccessible** |
| HELIX Preview | github.com/CupidAmorstore/helix-preview (public), branch `ccr-8d17e0b5-yaqvtm`, draft PR #3 | Yes | canonical for Preview only — **not OMEGA** |

## Branches and SHAs
`main` `dca30a7` (untouched) · cycle baseline `886d4b2` · cycle head: `git log -1` on the branch (this file is in it).
Uncommitted work: none.

## Evidence classes (2026-11-25)
| Class | Items |
|---|---|
| Verified source findings (reproduced by execution on `886d4b2`) | AUD-202, 203, 205, 207, 208, embargo horizon 4.1 (`research/audit/repro-886d4b2.json`); AUD-201, 204, 206 by source reading |
| Fixed defects (with regression tests) | AUD-201…208; 4.1, 4.3, 4.4, 4.5, 4.6; Solana small-order guard; QA signing fail-closed; XS drift-trim accounting; workflow shell bug in the new signing check (caught by CI) |
| Independently reproduced results | none — reproduction and fixes were by the same agent (self-verification of an external audit) |
| Reported (not re-verified) results | OMEGA 22/22 tests at verified-beta; Trading Lab 88 candidates / 0 qualified |
| Unresolved defects | public debug signing key in use (owner must add QA secrets); lot-size precision not modelled; indirect exposure disclosed but not blocking |
| Inaccessible source | HELIX OMEGA, Trading Lab |
| Blocked gates | 1 source recovery, 2 integration, 7 Android (physical device + private key), 8 private beta |

## Test results (commands, SHA, environment in `INDEPENDENT_AUDIT_REMEDIATION_2026_11_25.md`)
Unit/integration **271 passed / 0 failed / 0 skipped** (29 files; baseline 180) · typecheck clean · lint 0 errors
(1 pre-existing warning) · browser functional 68/68 · deep (axe) 21/21 · wallet 10/10 · Research Lab 360/390 px
24/24 (browser viewport only) · Android: see `ANDROID_RELEASE_EVIDENCE.md`.

## Research
Registry 199 candidates (provenance 200 evaluation records), **0 qualified**, gates-v3. No new candidates this
cycle. Financial result after modelled costs: no strategy trades; paper capital stays in cash (0% return, by
design). Bottlenecks measured: costs, trade counts, power, correlation (≈ 1.8 independent assets), regimes.

## Gates
| Gate | Status |
|---|---|
| 1 Source recovery | **BLOCKED** |
| 2 Integration | **NOT STARTED** (blocked by 1) |
| 3 Security (Preview) | PASSED for owner-only QA; High open: public debug signing key |
| 4 Financial correctness (paper) | PASSED (re-verified after AUD-203/207/208 fixes) |
| 5 Research integrity | PASSED after remediation (gates-v3; all confirmed findings fixed and tested) |
| 6 Product quality | PASSED with gaps (no product/UI work this cycle — defects took priority) |
| 7 Android acceptance | **BLOCKED** (no physical device; public key) |
| 8 Private beta | NOT MET |
| 9 Public production | NOT AUTHORIZED |
| 10 Real money | NOT AUTHORIZED |

## Owner decisions required
1. Move OMEGA + Trading Lab into a **private** repo (`MASTER_SOURCE_RECOVERY_REPORT.md`), or enable Remote Control
   for the PC folder.
2. Add the four `HELIX_QA_*` signing secrets; then run the workflow manually with `require_private_signing=true`.
3. Physical-device checklist (`PRODUCT_AND_MOBILE_ACCEPTANCE.md`).
4. Accept or amend the forward paper-trading protocol (`QUANTITATIVE_RESEARCH_MASTER_REPORT.md`).

## Rollback
Each change is a separate commit after `886d4b2`; `git revert <sha>` reverts one. `main` untouched.
