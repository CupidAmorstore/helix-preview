# HELIX Staging Checklist

## Build & Runtime
- [ ] `npm run build` completes without errors.
- [ ] `npm run preview` serves the app correctly.
- [ ] Netlify preview deploy works with `dist` publish.

## Market Data
- [ ] Binance WebSocket connects (live prices update).
- [ ] CoinGecko market list loads.

## Portfolio Tracker
- [ ] Exchange read-only keys stored encrypted.
- [ ] On-chain address balances refresh.
- [ ] Cost-basis edits persist.

## Wallet (Testnet)
- [ ] Mnemonic generation + verification flow works.
- [ ] Keystore stored encrypted in IndexedDB.
- [ ] BTC testnet send (UTXO available).
- [ ] ETH Sepolia send.
- [ ] SOL devnet send.

## Access / Stripe (Optional)
- [ ] Stripe status endpoint responds.
- [ ] Checkout session creates when env vars set.
- [ ] Webhook signature verification passes.

## Legal
- [ ] Privacy / Terms / Support pages updated with legal review.

