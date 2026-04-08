# HELIX - Deployment and Local Testing Guide

This guide covers local testing and deployment for the HELIX web preview.

## 1. Domain and DNS Setup
[TODO: Replace with production domain and hosting details]

1. Add your production domain to your hosting provider (Netlify, Vercel, or Cloudflare).
2. Point DNS records to your hosting provider.
3. Enable HTTPS for secure access.

## 2. Local Testing (Bypassing CORS)
Modern browsers block the CoinGecko API when the HTML is opened as a local file (file:///). Use a local web server to test live data.

### Option A: Using Node.js (Recommended)
```bash
npx serve .
```
Open `http://localhost:3000`.

### Option B: Using Python
```bash
python -m http.server 8000
```
Open `http://localhost:8000`.

## 3. Pre-Launch Checklist
- [ ] Confirm production domain and canonical URLs
- [ ] Verify HTTPS is active
- [ ] Ensure support, privacy, and terms links resolve
- [ ] Validate checkout page messaging (manual access only)
- [ ] Verify live market data loads successfully
