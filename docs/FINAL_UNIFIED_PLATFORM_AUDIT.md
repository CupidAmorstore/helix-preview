# Final unified platform audit — 2026-11-24

## Verdict
- **Unified platform (OMEGA + Trading Lab + Preview): SOURCE RECOVERY BLOCKED.** Two of the three source bodies are on
  owner devices this cloud session cannot reach; no integration was attempted and Preview was not passed off as OMEGA.
- **HELIX Preview on its own: CONDITIONAL GO — OWNER-ONLY QA** (paper trading on the owner's own phone), unchanged from
  the previous cycle, now with exact-artifact Android evidence.
- Not authorized: public production release, real-money execution.

## Audit passes (all three by the same agent: separate self-audit passes, NOT independent external audits)

### A — Engineering and security
| Sev. | Finding | Root cause | Fix | Evidence | Status |
|---|---|---|---|---|---|
| High | QA APKs signed with a public debug key | committed keystore for stable updates | private-QA-key support; owner must create the key | APK v2 cert parsed: `2C:87:44:…:1C:DC` | **OPEN (owner)** |
| Medium | "Private QA build" was actually a public GitHub prerelease, auto-published on every push | release step unconditional | publishing opt-in (manual dispatch), title says PUBLIC | `.github/workflows/android-preview.yml` | FIXED |
| Medium | Emulator tested a separately rebuilt APK, not the distributed file | separate workflow rebuilt from source | device job downloads the apk job's artifact and records its identity | run 45463786025: same sha256 in build and test | FIXED |
| Low | A `workflow_run` trigger would never fire on the PR branch (default-branch-only) | GitHub semantics | jobs merged into one workflow | CI run | FIXED (self-caught before effect) |
| Moderate ×4 | `uuid` advisory via `@solana/web3.js` | transitive | not reachable (only `uuid.v4()` used); removal path documented | `npm ls uuid`, source read | ACCEPTED (documented) |
Re-verified from the previous cycle: vault (20 tests), fail-closed signing on all networks, background lock on device.

### B — Quantitative and financial integrity
| Finding | Evidence | Status |
|---|---|---|
| Hour-scale strategies are structurally uneconomic at 1.3% round trip (median 1 h move = 0.23× cost; 12 h ≈ 1×) | `research/cost-horizon-study.json` | DOCUMENTED; research to focus on multi-day horizons; costs not lowered |
| 177 candidates, 0 qualified; negative results preserved | `research/registry.json`, `research/runs/` | VERIFIED |
| Paper ledger invariants, reconciliation, concurrency | `paperLedger.test.ts` | VERIFIED |
| Walk-forward re-estimation, purging/embargo, cross-market correlation correction | not implemented | OPEN (documented) |
| Trading Lab results (88 candidates, 0 qualified) | archives inaccessible | UNVERIFIED |

### C — Product and Android acceptance
| Item | Evidence | Status |
|---|---|---|
| Exact QA artifact (code 30, `5385a710…c94d`) on Android 15 emulator | 30/30, `android-e2e` release with `apk-identity.txt` | PASSED (emulator) |
| Browser QA (functional / deep incl. axe / wallet) | 68/68 · 21/21 · 10/10 | PASSED |
| Physical device, TalkBack, battery, real networks | no device | **BLOCKED** (checklist in `PRODUCT_AND_MOBILE_ACCEPTANCE.md`) |
| Portfolio tab, advanced charts, limit orders, push notifications, DEX discovery | not implemented | OPEN (not claimed) |

## Release gates
1 Source recovery **BLOCKED** · 2 Integration **NOT STARTED** · 3 Security PASSED (owner-only) with High signing item open ·
4 Financial PASSED · 5 Research PASSED · 6 Product PASSED with gaps · 7 Android **BLOCKED** · 8 Private beta NOT MET ·
9 Production NOT AUTHORIZED · 10 Real money NOT AUTHORIZED.

## Next exact owner action
On the Windows PC, run the 6-step transfer in `docs/MASTER_SOURCE_RECOVERY_REPORT.md` (cold backup → snapshot branch →
**private** GitHub repo → push all branches/tags → add the Trading Lab zips), then start a session with that private
repository attached. In parallel, add the QA signing secrets (`docs/ANDROID_RELEASE_EVIDENCE.md`).

## What can continue autonomously without the owner
Preview-only work: walk-forward re-estimation and purging in the research engine; multi-day-horizon research on the
existing datasets (registered as new hypotheses); replacing `@solana/web3.js` with smaller libraries; Research Lab layout;
limit-order model with maker fees (only with fee evidence).
