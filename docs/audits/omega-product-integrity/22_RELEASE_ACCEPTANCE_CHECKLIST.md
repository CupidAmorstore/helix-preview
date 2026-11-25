# 22 — Release acceptance checklist

Each item must be evidenced (test, screenshot, run ID) before the stage is accepted. ✅ = met at `d7174f1`.

## Stage 1 — Owner-only paper QA (current)
- ✅ Real-money execution impossible at the execution boundary (13)
- ✅ Paper accounting reconciles to the cent (10)
- ✅ Live prices verified against source (09)
- ✅ 278 unit/integration tests, browser suites, emulator 30/30 on exact artifact
- ✅ 0 approved strategies reported honestly
- ☐ Misleading research timestamps/schedule fixed (BOT-1, BOT-2)

## Stage 2 — Closed human beta (≤ 20 invited testers)
- ☐ Private signing key; release (non-debug) build; distribution not via a public release (SEC-1, SEC-2)
- ☐ Legal placeholders removed; real privacy policy (Law 25 contact), terms, risk disclosure (TR-1)
- ☐ Support contact and issue-intake process
- ☐ All P1 findings closed with regression tests
- ☐ Physical-device checklist passed on ≥ 2 devices (one older/low-end), incl. TalkBack and 200% font
- ☐ Onboarding: paper vs wallet vs watched addresses explained in ≤ 3 screens
- ☐ Research explanations for 199/4/0 and forward protocol visible in the app

## Stage 3 — Public paper-trading launch
- ☐ Real human usability testing (≥ 8 participants incl. beginners), findings addressed
- ☐ French version (Québec) at parity
- ☐ Store listing, screenshots, data-safety form consistent with the privacy policy
- ☐ Legal review (securities status of a paper-trading/research app; consumer protection; privacy)
- ☐ All P2 findings closed or explicitly accepted by the owner
- ☐ Research feed published automatically from the default branch, with staleness shown honestly

## Never in scope without separate owner authorization and legal review
Real-money trading, deposits, withdrawals, transaction signing/broadcasting.
