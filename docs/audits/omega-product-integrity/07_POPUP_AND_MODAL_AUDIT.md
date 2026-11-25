# 07 — Popups and modals

Discovered: **1 modal component** (`Sheet`, `role="dialog" aria-modal="true"` in `src/components/ui.tsx`), used
by the **paper trade sheet** (buy/sell). Expandable sections (`<details>`) are inline, not popups. No tooltips,
toasts or system confirm dialogs found in source (`confirm(`/`alert(` not used).

| Check | Trade sheet | Evidence |
|---|---|---|
| Opens from Paper buy / Paper sell | PASS | I-0146, I-0696 |
| Escape closes | PASS | crawler |
| Android Back closes | PASS | emulator run 47 "Back closes the open sheet" |
| Keyboard (numeric, sheet stays visible) | PASS | emulator 05-trade-sheet-keyboard.png |
| Invalid input | non-numeric characters stripped; Place disabled until amount > 0; rejections shown in `role="alert"` | source + crawler |
| Stale price | Place disabled, "Waiting for a live price…" | source |
| Destructive safeguard | N/A (paper; no real money) | — |
| Confirmation | receipt with amount, fill, fee, cash, spread, realized P&L; "Simulated. No real order is sent." | reconciliation |
| Accessible | dialog role, labelled amount input, status region for result | source |
| Outside-tap close | not tested on device | BLOCKED |
| Focus trap / initial focus | not verified with a screen reader | BLOCKED (no TalkBack) |

Findings: WA-1 (paused note points to a non-existent location). Otherwise the only modal meets the standard.
Wallet destructive action (Delete wallet) is inline with a typed "DELETE" confirmation (wallet-flow 10/10).
