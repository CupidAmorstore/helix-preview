# HELIX Deployment Guide

## Local Development
```bash
npm install
npm run dev
```

## Production Build
```bash
npm run build
npm run preview
```

## Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

## Required Environment Variables (Stripe)
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_MONTHLY
- STRIPE_PRICE_ANNUAL
- APP_BASE_URL

## Notes
- This build is a client-side application. No server-side wallet logic exists.
- Read-only API keys are entered in-app and stored encrypted in IndexedDB.

