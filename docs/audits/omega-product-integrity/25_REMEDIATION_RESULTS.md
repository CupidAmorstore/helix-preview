# 25 — Remediation results (2026-11-26)

All 38 findings were worked; per-finding outcome and commit are in `19_COMPLETE_DEFECT_REGISTER.csv`
(columns `outcome`, `fix_commit`, `outcome_note`). Commits: `7e95ca8`, `a786e3b`, `4bb2c83`, `ddf40b7`, `031fdeb`, `c42acd2`.

## Outcomes
| Outcome | Count | Findings |
|---|---|---|
| Fixed | 24 | BOT-1, BOT-3, BOT-4, BOT-5, QR-1, WA-1, WA-2, MD-1, MD-2, MD-5, A11Y-1, A11Y-4, TXT-1…5, UX-1…5, DAT-1, ONB-1 |
| Fixed with a stated limit | 5 | BOT-2 (copy true; real schedule needs `main`), TR-1 (lawyer review pending), SUP-1 (operator name = owner), SEC-2 (activates when the private key exists), A11Y-2 (19 remaining targets are inline links, WCAG exception) |
| Partial | 2 | L10N-1 (French 34% of visible words; core screens 70–92%), PERF-1 (main JS −49%, not < 200 KB) |
| Fix applied, needs device confirmation | 1 | HDR-1 |
| No change needed (audit error) | 2 | MD-3 (already shown), A11Y-3 (crawler false positive) |
| Owner action / process | 4 | SRC-1, SEC-1, QR-2, SEC-3 |

## Measured before → after (same crawler, same 32 page-states; `evidence-after/comparison.json`)
| Metric | Before | After |
|---|---|---|
| Page-states overflowing at 130% / 200% text / small screens | 1 / 15 / 1 | **0 / 0 / 0** |
| Controls < 24 px (non-inline) | 41 | **0** (19 inline links in sentences, exempt) |
| axe violations | 1 | **0** (targeted re-check after `c42acd2`) |
| Misleading/placeholder text rule hits (false schedule, wrong research time, "real fees", TODO, cryptic links, raw keys on consumer screens, awkward wording) | 66 | **0** |
| Grammar ("1 tests"…) | 20 | **0** |
| Main JS chunk | 548 KB (150 KB gz) | **281 KB (94 KB gz)** |
| Unit/integration tests | 278 | **326** (0 failed, 0 skipped) |
| Browser suites | 68/21/10/24 | **69/21/10/24** (functional/deep/wallet/research-mobile) |
| Android emulator (exact artifact) | 30/30 (v47) | **30/30 (v54, `031fdeb`)** |

## Still open
- **Owner:** private QA signing key (SEC-1) → turns on the non-debuggable release build; OMEGA/Trading Lab source
  (SRC-1); fee tier (QR-2); Law 25 responsible-person name on the privacy page; lawyer review of legal text.
- **French at parity** for Markets, Bot, Wallet, Research Lab and secondary screens (L10N-1).
- **Physical device:** confirm HDR-1 and run TalkBack.
- **Human usability testing** (personas in 24 were simulated).

## Update 2026-11-28: French (L10N-1)
All screens now have French text (Markets, coin page, Trading Bot, Wallet and its guide/vault, Watched addresses,
Alerts, Connections, Access, Research Lab, plus validation and error messages). Measured with
`tools/french-coverage.cjs`: **90.4% of visible words** (was 34%). The remainder is coin names, tickers, words that are
the same in French ("Mode", "Volume") and some Research Lab technical identifiers. French layouts: 23 routes × 360/412 px,
0 horizontal overflow, 0 page errors. English suites unchanged: unit 416/416, functional 69/69, deep 21/21,
research-mobile 24/24, wallet 10/10. **Not reviewed by a professional translator**; the More page says so.
