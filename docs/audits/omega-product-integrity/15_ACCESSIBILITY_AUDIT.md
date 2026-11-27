# 15 — Accessibility (WCAG 2.2 AA, Android guidance)

Automated: axe-core (wcag2a/aa, 21a/aa, 22aa) on all 32 page-states; crawler touch-target and accessible-name
checks on 745 elements; text-zoom sweep 130/200%; viewport sweep. Manual: TalkBack **BLOCKED** (no device).

| Criterion | Result | Evidence |
|---|---|---|
| axe violations | 1 serious on 1 page (scrollable-region-focusable, Research Lab tab) — all other 31 page-states clean | `evidence/pages.json` |
| 1.4.4 / 1.4.10 Resize & reflow | **FAIL**: at 200% text 10 screens overflow (Risk 661 px on 412 px); Risk also at 130% and at 320 px | `fontScale`, `viewport-sweep.json` |
| 2.5.8 Target size (min 24 px) | **FAIL**: 41 controls < 24 px; 39 between 24–43 px (Android recommends 48 dp) | registry |
| 4.1.2 Name, role, value | 1 input without a name (Wallet, I-0612); selection buttons expose `aria-pressed`; tabs/radios have roles | registry, verify-no-effect |
| 1.4.1 Use of colour | PASS — ▲/▼ glyphs accompany red/green | screenshots |
| 1.4.3 Contrast | PASS per axe (no color-contrast violations) | axe |
| Status messages | trade results in `role="status"`, rejections in `role="alert"` | source |
| Charts | canvas chart has no text alternative beyond the price/change header | DS-3 / A11Y-5 (P3) |
| Reduced motion | not verified | — |
| TalkBack order / focus | BLOCKED | — |

Financial accessibility: fees and fills are explained in plain words before and after every order (good);
research terms (validation, walk-forward, Bonferroni) appear only in the advanced Research Lab.
