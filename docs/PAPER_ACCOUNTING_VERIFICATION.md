# Paper accounting verification — remediation cycle (2026-11-23)

Files: `src/paper/engine.ts`, `src/paper/serialStore.ts`, `src/paper/PaperProvider.tsx`, `src/paper/book.ts`.
All fills are **simulated**. Every order records `fillModel` (`book` = walked the live Coinbase level-2 book; `model` = fixed
0.05% spread/slippage assumption) and the UI states "No real order was sent".

## Findings
| ID | Severity | Finding | Reproduction | Fix | Status |
|---|---|---|---|---|---|
| P-1 | HIGH | Lost update: `accRef` was refreshed only on render, so two overlapping orders, or an order plus the hourly valuation, could start from the same account and overwrite each other (double-spent cash / vanished order) | by code reading of PaperProvider at `4a1b958`; demonstrated by the new concurrency test (2 orders + snapshot with slow saves) | `createSerialStore` (serialStore.ts:5): one ordered read-modify-write queue; every write (start, place, pause, valuation) goes through it; network (book fetch) stays outside the lock | FIXED |
| P-2 | MEDIUM | A failed save left memory ahead of disk | new test | state rolled back and error surfaced (serialStore.ts:24) | FIXED |
| P-3 | MEDIUM | Future-dated quotes / books accepted | new tests | quote > now+5 s refused (engine.ts:181); such a book is not used (engine.ts:103) | FIXED |

## Invariants checked (src/__tests__/paperLedger.test.ts)
300 seeded sequences × 40 random orders (3 coins, starting cash $20/$100/$1,000, random buys/partial and full sells, synthetic
books incl. thin books, 15% book outages), checked **after every order**:
1. cash = start − Σ buy cash + Σ sell proceeds, and never negative
2. per-coin quantity = Σ bought − Σ sold, never negative
3. open cost basis + cost released by sells = Σ paid for buys
4. fee = 0.60% of gross notional on every fill
5. no book fill further than 2% from the quote
6. after liquidation: cash = start + Σ realized P&L (residual positions only below the $1 minimum)

Plus: determinism (same inputs → identical ledger), duplicates and rejections move no money, unrealized P&L = value − cost,
full sell leaves no dust, concurrency with slow saves keeps both orders and the snapshot in order, save failure rolls back.

Existing engine tests (`src/__tests__/paper.test.ts`, 15): minimum order, position limit, stale quote, pause, partial fills
against thin books, refusal with no liquidity, stale book → model.

## Evidence
- Unit tests: 9 ledger + 15 engine, all passing at the head commit (see AUDIT_REMEDIATION_REPORT for the count).
- Browser: `docs/qa/deep-check.cjs`: $40 buy → cash $460.00, fee $0.24, equity = cash + invested (±1¢).
- Android emulator: `android-e2e` release: $50 buy filled against the live book; after app relaunch the screenshot shows
  $450.00 cash, $49.70 invested, $0.30 fee.

## Limits
- Market orders only; no limit/stop orders.
- Fee tier fixed at 0.60% (Coinbase lowest taker tier), not the user's real tier.
- Book depth = Coinbase level-2 top 50 levels; hidden liquidity and latency are not modelled.
- Simulated results are not earnings.
