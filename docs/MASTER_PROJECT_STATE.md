# MASTER PROJECT STATE (single authoritative status — update on every cycle)

Last updated: 2026-11-24. No secrets in this file.

## Source locations
| Body | Location | Access from cloud | Canonical? |
|---|---|---|---|
| HELIX OMEGA | owner's Windows PC `C:\Users\Sam\.gemini\antigravity\scratch\helix` (verified-beta `a12fc5a7…`, possible OMEGA 4.2 WIP) | **No** | intended primary platform; to move into a **private** repo |
| Trading Lab / Pro Trading Bot | owner devices / ChatGPT / Termux; archives `Trading_Lab_v070_Multichain_Source_and_Evidence.zip`, `Trading_Lab_Paper_Strategy_Study_20261121.zip` | **No** | to be integrated as the Trading Bot section |
| HELIX Preview | https://github.com/CupidAmorstore/helix-preview (public), branch `ccr-8d17e0b5-yaqvtm`, PR #3 (draft) | Yes | canonical only for Preview; not OMEGA |

## Branches and SHAs (helix-preview)
- `main` `dca30a7` (base) · `ccr-8d17e0b5-yaqvtm` (head: run `git log -1` — this file is committed in it) ·
  `claude/helix-mobile-takeover-vrkwgr` `45cc4cb` (handoff only).
- App code last changed in `2433734` (2026-11-25: Research Lab layout, walk-forward, Solana libs). Tested artifact: version code 30 from `236cc84`, sha256 `5385a710…c94d`.
- Uncommitted work: none.

## Completed (Preview)
Ledger design system; paper trading vs live order book with partial fills, serialized ledger, rollback, reconciliation,
order history; vault hardening (verification, single-flight, throttle, wall-clock + native-lifecycle lock, backup
exclusion); fail-closed signing/broadcast; research engine with 199 candidates / 0 qualified, walk-forward re-estimation with embargo (gates-v2), holdout guard, cumulative
Bonferroni, survivorship gate, null and cost-horizon studies; feed validation; Android Back/safe areas/dark bars; QA signing
support; exact-artifact emulator testing; opt-in public publishing; `@solana/web3.js` removed (0 production advisories);
multi-day families (weekly_trend, monthly_momentum) pre-registered and tested; Research Lab tables reflow on phones.

## Test results (latest)
Unit/integration 180 passed / 0 failed / 0 skipped · typecheck clean · lint 0 errors (1 pre-existing warning) · browser
functional 68/68 · deep 21/21 (axe) · wallet 10/10 · Research Lab 360/390 px viewport 24/24 (browser only) · Android 15
emulator: see the `android-e2e` release for the latest pushed commit (previous: 30/30 on version code 30).

## Gates
| Gate | Status |
|---|---|
| 1 Source recovery | **BLOCKED** (OMEGA, Trading Lab inaccessible) |
| 2 Integration | **NOT STARTED** (blocked by 1) |
| 3 Security (Preview) | PASSED for owner-only QA; signing key High open |
| 4 Financial correctness (Preview, paper) | PASSED |
| 5 Research integrity (Preview) | PASSED (0 qualified, kept rejected) |
| 6 Product quality (Preview) | PASSED with listed gaps |
| 7 Android acceptance | **BLOCKED** (public debug key; no physical device) |
| 8 Private beta | NOT MET |
| 9 Public production | NOT AUTHORIZED |
| 10 Real money | NOT AUTHORIZED |

## Owner decisions required
1. Move OMEGA (and Trading Lab archives) into a **private** repo (procedure: `MASTER_SOURCE_RECOVERY_REPORT.md`).
2. Create the private QA signing key as CI secrets (`ANDROID_RELEASE_EVIDENCE.md`).
3. Run the physical-device checklist (`PRODUCT_AND_MOBILE_ACCEPTANCE.md`).
4. Optional: re-sign Gmail in claude.ai so archives sent by email can be searched; make helix-preview private if QA
   builds must not be public.

## Rollback
Every change is a separate commit on `ccr-8d17e0b5-yaqvtm`; `main` is untouched. Revert a commit with `git revert <sha>`;
the pre-cycle head of each cycle is recorded in that cycle's report (`AUDIT_REMEDIATION_REPORT.md`,
`FINAL_RELEASE_READINESS_AUDIT.md`, this file).
