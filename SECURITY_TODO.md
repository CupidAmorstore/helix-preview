# SECURITY_TODO

[TODO: Security review required]

## Required Before Any Production Launch
1. Review client-side encryption parameters (Argon2id settings, AES-GCM usage) and memory handling.
2. Add server-side authentication if any paid or restricted features are introduced.
3. Implement server-side entitlement checks for Stripe access (do not trust client state).
4. Add logging and monitoring for Netlify functions (access-check, webhooks).
5. Complete legal review for privacy/terms/support pages.

## Client-Side Warnings
- Client-side checks are not access control.
- All secrets live only in the browser; losing the vault password means loss of access to stored keys.

## Stripe Security Requirements
- Verify webhook signatures (already scaffolded in `netlify/functions/stripe-webhook.js`).
- Store subscription state in a persistent database before production.
- Gate any paid features using server-side checks, not UI flags.

## Wallet Safety Requirements
- Enforce testnet-only mode by default and require explicit acknowledgement before mainnet.
- Never log or transmit mnemonic, private keys, or decrypted payloads.

