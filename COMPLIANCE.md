# HELIX: Compliance & Risk Scope

[TODO: Legal review required]

HELIX is a market intelligence dashboard, read-only portfolio tracker, and a **testnet-first** self-custody wallet. It is not a broker, does not custody funds, and does not execute trades on behalf of users.

## 1. Product Category
HELIX is classified as **Market Data + Self-Custody Software**.
- We do **NOT** take custody of user funds.
- We do **NOT** execute trades or route orders.
- We do **NOT** provide financial advice.

## 2. Scope of Functionality (Current Build)
- Live market data via public APIs (Binance WebSocket, CoinGecko REST).
- Explainable market signal labels (informational only).
- Read-only portfolio tracking (exchange read-only keys + public addresses).
- Client-side self-custody wallet (BTC/ETH/SOL) with encrypted local keystore.
- Testnet-first transaction signing and broadcasting.

## 3. Explicit Exclusions
- Custodial storage of private keys or funds.
- Server-side transaction signing or key storage.
- Automated trading or order routing.
- Guaranteed performance or returns.

## 4. Honest Disclosures
- **Volatility Risk**: Crypto markets can lose 100% value.
- **Self-Custody Risk**: Users are solely responsible for seed phrases and keys. Loss = loss of funds.
- **Testnet First**: Mainnet use requires explicit user acknowledgement.

---
**Status**: Requires legal review before launch.

