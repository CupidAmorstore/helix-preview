# P0 remediation evidence

## Reproducible commands
| Purpose | Command | Output |
|---|---|---|
| Full regression suite | `npx vitest run` | 39 files, 374 tests passing |
| P0 suites only | `npx vitest run src/__tests__/bot/p0*.test.ts` | 4 files, 47 tests |
| Typecheck / lint / build | `npx tsc --noEmit -p .` · `npx eslint .` · `npm run build` | clean · 0 errors (1 pre-existing warning in `ScreenGuard.tsx`) · builds |
| Independent claim reproduction | `python3 -I scripts/p0/reproduce_claims.py` | `research/p0/claims-reproduction.json` |
| Execution-assumption diagnostic | `npx vite-node --config scripts/vite.node.config.ts scripts/p0/execution-diagnostic.ts` | `research/p0/execution-diagnostic.json` |
| Capital feasibility | `… scripts/p0/capital-feasibility.ts` | `research/p0/capital-feasibility.json` |
| Research lab (failures, regime, maker, benchmarks) | `… scripts/p0/research-lab.ts` | `research/p0/failure-registry.json`, `research/p0/research-lab.json` |
| Registration b | `… scripts/p0/make-registration-b.ts` | `research/forward/registration-b.json` |
| Forward evaluation | `… scripts/forward-paper.ts [--refresh]` | `research/forward/report-*.json`, `ledger-*.json` |
| Dashboard summary | `… scripts/p0/build-summary.ts` | `src/bot/data/p0.json` |

## Test inventory (new in P0)
| File | Tests | Covers |
|---|---|---|
| `p0Execution.test.ts` | 13 | legacy equivalence on real data, historical==forward replay, idempotence, gaps, next_close, terminal treatment, minimum order, lot precision, partial fills, future-data mutation, accounting identity |
| `p0Admission.test.ts` | 18 | fee evidence fail-closed (missing/stale/assumed/superseded), break-even maths, feasibility vs admission, position limits, minimums, stale book, depth, maker without fill model, capital tiers |
| `p0Forward.test.ts` | 9 | complete months, gaps/stale refusal, cost snapshot + v2 hash, unrealized reporting, append-only determinism, committed registration a, gates-v4 boundary month |
| `p0Research.test.ts` | 7 | failure classification, novelty guard, hypothesis completeness, regime future-mutation, regime fail-closed, maker trade-through rule, random-entry null control |
| Real-money isolation (existing) | 7 | still passing |

## Before / after
| Item | Before (8479db3) | After |
|---|---|---|
| Forward evidence months for 80 days from mid-month | 4 | 2 (complete) |
| Historical monthly n (real daily run, val+test) | 34 | 30 |
| Gap at a fill bar | filled on next array bar | order fails, logged |
| Stale forward data | evaluated silently | evaluation refused |
| Preset value edited after registration | undetected | refused (`costSnapshot`) |
| Open forward position at evaluation | force-liquidated (exit cost charged) | marked; unrealized reported |
| Kraken taker cost used for decisions | 0.40% | 0.80% (official evidence) |
| Coinbase taker cost used for decisions | 0.60% | 0.90% (secondary; fails closed outside US/EU/UK) |
| Shortest feasible CEX holding horizon | not computed | ≈ 1 week, every tier |
| Failure explanations | rejection reasons only | 6-category causal classification + novelty guard |
| Gate version | gates-v3 | gates-v4 (stricter) |
| Persistent forward process | none | daily workflow (active after merge) |

## Dataset provenance
Stored Coinbase daily/hourly datasets (`research/data/*.csv.gz`), SHA-256 recorded per file in
`research/p0/claims-reproduction.json` with bar counts, gaps, duplicates and open/close continuity. Daily files were
extended by one completed bar (2026-11-25) by the forward refresh on 2026-11-26; no stored bar was rewritten.
Previously inspected intervals are unchanged in `research/provenance.json`; every P0 study used only already-inspected
history and is labelled diagnostic.

## Integrity statement
No gate was relaxed; no cost was lowered; no test window was opened; no candidate was re-labelled; the 199-candidate
registry and all run records are unchanged. Legacy presets and the legacy backtest are preserved for replay comparison.
