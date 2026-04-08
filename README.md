# HELIX

HELIX is a crypto market intelligence dashboard with a read-only portfolio tracker and a testnet-first self-custody wallet. It does **not** custody funds or run any backend wallet logic — all keys stay client-side and are stored locally in encrypted form.

## What This Build Includes
- Live market data (Binance WebSocket + CoinGecko REST)
- Read-only portfolio tracking (exchanges + public addresses)
- Encrypted local storage (AES-256-GCM + Argon2id via `hash-wasm`)
- Testnet-first self-custody wallet (BTC testnet, ETH Sepolia, SOL devnet)
- Netlify Functions scaffolding for Stripe access flow

## What This Build Does Not Include
- Server-side custody or key management
- Any on-chain transaction relayer or backend storage
- Automatic payment provisioning without Stripe configuration
- Production-grade compliance/legal policies (see Legal placeholders)

## Quickstart
```bash
npm install
npm run dev
```
Open the dev server URL (printed by Vite).

## Build
```bash
npm run build
npm run preview
```

## Security Notes
- Keys and mnemonics are encrypted in IndexedDB and never leave the browser.
- No analytics or telemetry are enabled.
- Exchange keys must be read-only and are stored encrypted locally.

## API Keys (Client-Side)
These are entered in the **Connections** screen and stored encrypted in IndexedDB:
- Etherscan API key (for ETH balance + token lookups)
- Helius API key (optional for Solana RPC)
- Optional custom RPC URLs for ETH/SOL

## Stripe (Serverless)
If you want Stripe Checkout for access, configure the Netlify function env vars:
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_MONTHLY
- STRIPE_PRICE_ANNUAL
- STRIPE_API_VERSION (optional)
- APP_BASE_URL
- HELIX_ACCESS_TOKEN (optional pilot gate)

## Legal
`/privacy`, `/terms`, and `/support` contain placeholder text with **[TODO: Legal review required]** markers.

