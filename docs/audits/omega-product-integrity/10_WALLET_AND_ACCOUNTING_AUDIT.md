# 10 — Wallet and financial accounting

## Independent reconciliation through the real UI
Tool `tools/reconciliation.cjs`, evidence `evidence/reconciliation.json`. Disposable browser profile, paper money.
Open $1,000 account → buy $50 BTC → sell All → read every receipt field → recompute independently.
| Check (independent formula) | Result |
|---|---|
| Buy fee = 0.60% × cash spent | PASS |
| Bought qty = (spent − fee) / fill price | PASS |
| Sell qty = bought qty | PASS |
| Sell fee = 0.60% × gross | PASS |
| Cash received = gross − fee | PASS |
| Home shows final cash = 1000 − spent + received ($999.41) | PASS |
Round trip cost $0.59 on $50 (1.18% ≈ 2 × 0.60% fee + spread under 1¢), consistent with the documented model.

## Ledger engine (source review + existing tests)
`src/paper/engine.ts`: market orders only, fills walk the live Coinbase order book within a 2% band (partial fills
leave the rest unfilled, no money taken), fallback 0.05% spread/slippage when the book is unavailable, $1 minimum,
one coin ≤ 50% of the account, idempotency key against duplicate submits, serialized store with rollback,
`reconcileAccount` on load (halts trading if the ledger does not reconcile). Unit tests: `paperLedger.test.ts`
(invariants, concurrency, rollback) — 278/278 suite passing at `d7174f1`.

## Not implemented (not defects, but absent): limit orders, order cancellation (market orders fill immediately),
account export, simulated deposits/withdrawals/transfers, account reset UI beyond closing the account.

## Wallet (self-custody, not paper)
- Vault: AES-GCM with Argon2id-derived key, verification, throttle, background lock (60 s, verified on emulator).
- Addresses: BTC (BIP84 vector verified in browser and on emulator), ETH, SOL (equivalent to web3.js on 5,000 seeds).
- **Sending is disabled on every network at the function level** (`assertSendAllowed` throws first in build, sign and
  broadcast for BTC, ETH and SOL); mainnet send UI is absent (emulator check).
- Watched addresses: read-only balances.

## Findings
| ID | Sev | Finding |
|---|---|---|
| WA-1 | P2 | "Paper trading is paused. Resume it in Bot → Risk." — the Bot screen has no Risk tab; the resume control is Bot → Overview → Protections (dead-end instruction). |
| WA-2 | P2 | Wallet page still contains send code paths (disabled) and success strings such as "BTC transaction broadcasted." — unreachable today, but a single flag flip would expose untested broadcast UX. Keep, but cover with a test that the string is unreachable while disabled. |
| WA-3 | P3 | No paper-account export (CSV) — users cannot leave with their history. |
| WA-4 | P3 | "Portfolio" (watched addresses) and "paper account" are two different notions of holdings; naming them clearly is handled ("Not part of your paper account") but the More menu label "Holdings" vs route `/portfolio` vs page title "Watched addresses" is inconsistent. |
No UI text suggests paper funds can be withdrawn (searched).
