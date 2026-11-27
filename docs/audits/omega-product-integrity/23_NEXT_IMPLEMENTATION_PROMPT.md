# 23 — Next implementation prompt (paste into the next session)

> Continue HELIX Preview on branch `ccr-8d17e0b5-yaqvtm` (repo CupidAmorstore/helix-preview). Read
> `docs/audits/omega-product-integrity/00_EXECUTIVE_VERDICT.md`, `19_COMPLETE_DEFECT_REGISTER.csv` and
> `21_PRIORITIZED_REMEDIATION_ROADMAP.md` first. Fix, in this order, with a regression test per item and without
> weakening any gate or safety flag:
> 1. BOT-1 research-run vs data-refresh timestamps (add `lastResearchRunAt` to the summary; use it on Home/Bot).
> 2. BOT-2 truthful cadence copy; treat a 404/network feed as "unavailable", not "no newer research".
> 3. MD-2 CoinGecko failure message; WA-1 dead-end resume instruction (inline Resume).
> 4. BOT-3/BOT-4/BOT-5/TXT-1…5 copy: define 199/4/0, "modelled fees", plain strategy names, plurals, faucet labels.
> 5. QR-1 show the forward protocol (rules, start 2026-11-26, months collected, net after fees) in Bot › Activity.
> 6. A11Y-1…4: reflow at 200% text, targets ≥ 24 px (48 px where possible), labelled wallet input, focusable scroll region.
> 7. UX-1…5 small UX defects; PERF-1 lazy-load research JSON.
> 8. TR-1: replace legal placeholders with clearly marked draft text **only** after the owner supplies operator
>    details; add a CI check that fails on "TODO" in user-visible strings.
> Then re-run: `npm test`, typecheck, lint, build, `docs/qa/*.cjs`, `docs/audits/omega-product-integrity/tools/*.cjs`,
> push, and verify the Android emulator run. Keep real-money trading, signing and broadcasting disabled; no merge to
> `main` and no public release without the owner's explicit request.
