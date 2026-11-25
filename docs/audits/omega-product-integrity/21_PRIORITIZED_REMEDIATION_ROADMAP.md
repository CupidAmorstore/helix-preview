# 21 — Prioritized remediation roadmap

Every item references a finding in `19_COMPLETE_DEFECT_REGISTER.csv`. Mandatory = needed for the next stage in
`22_RELEASE_ACCEPTANCE_CHECKLIST.md`. Preserve all verified behaviour; no architectural rewrite is required.

| Phase | Item | Findings | Mandatory for | Effort | Risk / dependency | Acceptance |
|---|---|---|---|---|---|---|
| A Security & financial integrity | Private QA key; release (non-debuggable) build; stop public debug downloads | SEC-1, SEC-2 | closed beta | S + owner key | owner creates key; reinstall wipes paper data (warn testers) | cert ≠ public; debuggable=false |
| A | Unreachability test for disabled send paths | WA-2 | closed beta | XS | — | test green |
| B Broken / incorrect data | Research run time vs data-refresh time | BOT-1 | owner QA | S | summary schema adds `lastResearchRunAt` | label = run record time |
| B | Truthful research cadence; 404 feed ≠ "no newer research" | BOT-2 | owner QA | S | scheduling on `main` needs owner approval | copy matches infra |
| B | CoinGecko failure ≠ "not found" | MD-2 | closed beta | S | — | mocked 429 test |
| B | Dead-end "Bot → Risk" | WA-1 | closed beta | XS | — | e2e |
| C Navigation & UX | Holdings/Watched addresses naming; /access orphan; Refresh & Lock vault states; empty band | UX-1…5 | closed beta | S | — | crawler no NO-EFFECT on these |
| C | Onboarding (3 screens) | ONB-1 | public | M | copy review | human test |
| D Visual identity | Heading scale on Bot/Home; chart attribution placement; candles | DS-1, DS-3 | public | S–M | — | screenshots at 360 px |
| E Content | Define 199/4/0; "modelled fees"; strategies intro; plain strategy names; plurals; faucet labels | BOT-3, BOT-4, TXT-1…5 | closed beta | S | catalogue exists | text-crawl rules 0 hits |
| E | Legal pages, support contact, risk disclosure (qualified review) | TR-1, SUP-1 | closed beta (text), public (review) | M + owner | legal input | no TODO strings (CI grep) |
| F Research transparency | Show forward protocol (3 rules, start, months, net after fees); "what would make the bot trade" | QR-1, BOT-5 | closed beta | M | forward report → summary | visible in Bot |
| F | Publish research feed from default branch on a schedule (after owner approves a merge) | BOT-2 | public | S | merge to main | feed 200, age shown |
| G Performance & accessibility | 200% reflow, 24/48 px targets, labelled input, focusable scroll region | A11Y-1…4 | closed beta | M | — | sweep + axe clean |
| G | Lazy-load research JSON | PERF-1 | optional | S | — | main chunk < 200 KB |
| H Differentiation | State the three real differentiators on Home; shareable "why the bot refused" cards | 16, 18 | public | S–M | — | human test |
| H | Paper limit orders (maker-fee model only with evidence), CSV export | DAT-1 | optional / public | M | fee evidence | reconciliation tests |
| I Private beta | Physical-device checklist on ≥ 2 devices incl. TalkBack, owner-device header check | HDR-1 | closed beta | owner | device | screenshots |
| J Public launch | French version; store listing; legal review (securities status, Law 25, consumer protection); human usability study | L10N-1 | public | L | budget $0 → volunteer testers | checklist 22 |
| (Project) | Recover OMEGA + Trading Lab into a private repo, then integrate | SRC-1 | the product the directive describes | owner | — | three-way comparison filled |
