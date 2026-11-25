# 00 — Executive verdict (HELIX product-integrity audit, 2026-11-25)

**Audited:** HELIX Preview, source `d7174f1` (branch `ccr-8d17e0b5-yaqvtm`), web build + Android build 48 (sha256
`dd379b52…0e38`, public debug key) / emulator-tested build 47. **Not audited:** HELIX OMEGA and the Pro Trading
Bot / Trading Lab — still inaccessible, not integrated. Single-agent audit (Claude); no human usability testing.

## What HELIX is today
A paper-trading app with **live, verified Coinbase prices**, paper orders filled against the real order book with
fees that **reconcile to the cent**, an encrypted self-custody wallet that **cannot send** (enforced in code), and a
research "trading bot" that transparently reports **199 tests, 0 approved, holding cash**.

## What it is not yet
Not the integrated OMEGA platform. Not a running bot (research is offline and not scheduled; nothing runs on the
phone). Not launch-ready: legal placeholders are visible, builds are debug and publicly signed, there is no
onboarding, no French, no support channel, and two bot statements mislead about how fresh and automatic the research is.

## Numbers
| Item | Count |
|---|---|
| Routes / route variants / page-states | 16 / 26 / 32 (all inspected) |
| Interactive elements discovered / individually activated | 745 / 248 (+494 identical copies, 3 disabled) |
| Popups/modals inspected | 1 / 1 |
| Text elements reviewed (rule screen) / unique | 2,843 / 1,337 |
| Independently verified workflows | 8 in this audit (+30 emulator, +123 browser-suite checks) |
| Broken workflows | 0 hard-broken; 1 misleading failure path (MD-2), 1 dead-end instruction (WA-1) |
| Misleading elements | 5 (BOT-1, BOT-2, BOT-4, TXT-3, MD-2) |
| Findings | 38: P0 0 · P1 8 · P2 16 · P3 14 |
| Security findings | 4 (SEC-1/2 P1, SEC-3 P2, privacy placeholder) |
| Financial-integrity findings | 0 defects (reconciliation and boundary verified) |
| Design findings | 6 · Accessibility findings 5 |
| Release blockers (public) | 8 P1 |
| Audit coverage | 100% of discovered routes and unique controls in the browser; 0% physical device/TalkBack; 0% OMEGA/Trading Lab |

## Verdicts
| Stage | Decision | Why |
|---|---|---|
| Internal development | **GO** | tests green, integrity verified |
| Private paper-trading testing (owner only) | **CONDITIONAL GO** | fix BOT-1/BOT-2 copy; owner aware of debug signing |
| Closed human beta | **NO-GO** | SEC-1/2, TR-1, A11Y-1/2, ONB-1, physical-device checklist |
| Public paper-trading launch | **NO-GO** | all P1 + legal review + French + human testing |
| Real-money trading | **NO-GO (not authorized)** | out of scope regardless of results |
Technical readiness (owner QA) ≠ commercial readiness (not ready).

## Ten highest-priority improvements
1. Correct "Last successful research run" and "scheduled daily" (BOT-1, BOT-2).
2. Private signing key + non-debug builds; stop public debug downloads (SEC-1, SEC-2).
3. Replace legal placeholders; add operator contact and risk disclosure (TR-1, SUP-1).
4. Show the activated forward-trading protocol and "what would make the bot trade" (QR-1, BOT-5).
5. Explain 199 / 4 / 0 and say "modelled fees" (BOT-3, BOT-4).
6. Fix 200% text reflow and small touch targets (A11Y-1, A11Y-2).
7. Correct the CoinGecko-failure "not found" message and the dead-end resume instruction (MD-2, WA-1).
8. Replace raw strategy keys with plain names; fix plurals and faucet labels (TXT-1…5).
9. Three-screen onboarding stating the real differentiators (ONB-1).
10. Recover OMEGA + Trading Lab into a private repo so the real platform can be audited and integrated (SRC-1).

## Remaining access limitations
No physical Android device (TalkBack, battery, real networks, owner's header issue); OMEGA and Trading Lab sources;
competitor apps not tested (benchmark is knowledge-based); no human participants.

## Exact next step
Owner: push OMEGA + Trading Lab to a private repo (or enable Remote Control) and add the QA signing secrets.
Developer session: execute `23_NEXT_IMPLEMENTATION_PROMPT.md` items 1–3.

## Final self-audit
| Question | Answer |
|---|---|
| Authentic latest project? | Latest **Preview** yes (`d7174f1`); OMEGA/Trading Lab **no** — inaccessible. |
| Installed APK provenance? | Builds 47/48 identified; the owner's installed copy **not verifiable** without the device (screenshot consistent with build ≥ 45). |
| Every discovered page? | Yes (32 page-states). |
| Every accessible element activated? | Every unique control (248); 494 identical copies inventoried, not re-activated; device-only gestures not testable. |
| Every popup? | Yes (1). |
| Every visible text? | All 2,843 screened by rules; full hand reading of key screens only. |
| Financial calculations independently verified? | Yes (UI reconciliation to the cent). |
| Research pipeline inspected? | Yes. |
| Paper-only restrictions verified? | Yes, at the function level. |
| Failures and recovery tested? | Offline/stale/429/404 in browser; force-stop, upgrade, background on emulator; device restart/low storage **not tested**. |
| Unprofessional design identified? | Yes (08). |
| Missing functionality documented? | Yes (onboarding, export, limit orders, background alerts, French). |
| Verified vs assumed distinguished? | Yes (statuses, BLOCKED, competitor disclosure, persona = simulation). |
| Previous work preserved? | Yes — no product code changed in this audit. |
| Every blocker disclosed? | Yes (above). |
| Roadmap evidence-based? | Yes — every item maps to a register ID. |
| Would I trust it? | As a paper-trading tool for the owner: yes. As a public product: not yet. |
| Ready for public users? | **No.** |
