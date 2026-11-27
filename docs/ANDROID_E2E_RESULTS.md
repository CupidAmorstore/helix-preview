# Android E2E results — remediation cycle (2026-11-23)

**What this is:** the real debug APK installed on an **Android 15 (API 35) x86_64 emulator** (Pixel 6 profile, Google APIs,
WebView 124) in GitHub Actions, driven through the app's WebView with Playwright's Android mode plus `adb` for the hardware
Back key, network switches and logcat. **It is not a physical phone.**

- Script: `scripts/android-e2e.cjs` · Workflow: `.github/workflows/android-e2e.yml`
- Evidence (screenshots + `results.json`): https://github.com/CupidAmorstore/helix-preview/releases/tag/android-e2e
- Final run: commit `7038621` → **24/24 passed** (CI job `device`, success)
- APK under test = published APK: debug build #25 from `7038621`,
  sha256 `ebce65285ca63315adc2ea465e56e763bf3bc755db950c873c145f24d7084815`
  (https://github.com/CupidAmorstore/helix-preview/releases/tag/android-preview)

## Checks (final run)
| # | Check | Result |
|---|---|---|
| 1 | Android 15 / WebView version recorded | pass |
| 2 | App launches, in foreground | pass |
| 3 | Safe-area / system bars (header below status bar, tabs above gesture bar, dark bars) | pass (+ screenshots) |
| 4 | Live Coinbase prices arrive | pass |
| 5 | Paper account opens | pass |
| 6–7 | Markets tab; asset page from list | pass |
| 8 | Paper buy fills against the live order book | pass |
| 9–10 | Back closes sheet; Back returns to previous screen | pass |
| 11–14 | Bot, Wallet, More, Home tabs | pass |
| 15 | Vault created + public BIP39 test vector imported; BTC testnet address = published BIP84 vector | pass |
| 16 | Mainnet: send form absent, "Sending on mainnet is disabled" shown | pass |
| 17 | After locking the vault, phrase gone, password required | pass |
| 18 | Wi-Fi + data off → "Connection lost" state shown | pass |
| 19 | Never-opened screen (Research Lab) opens offline | pass |
| 20 | Prices recover after reconnecting | pass |
| 21 | Back on Home leaves the app | pass |
| 22 | App back in foreground after relaunch (data shown in relaunch screenshot) | pass |
| 23 | No uncaught JavaScript errors | pass |
| 24 | No Android runtime crash (logcat) | pass |

## Bugs found only by the emulator (all fixed, re-verified)
| Bug | Fix commit |
|---|---|
| White status and navigation bars around the dark app | `626a0f6` |
| Chart's newest point did not follow the live price; raw-decimal price axis | `e15102e` |
| Prices did not recover within 15 s after reconnecting (WebView lacks reliable online events) | `50498b5` |
| "Live" label stayed on for >8 s after the network dropped (Android keeps a dead socket open) | `7038621` (heartbeat watchdog) |

## Not covered / limits
- Physical devices, other Android versions/vendors, low-end hardware, real cellular networks.
- Post-relaunch checks use a screenshot: Playwright's Android driver could not re-attach to the restarted WebView.
- Partial fills on device depend on live liquidity, so they are covered by deterministic unit tests, not the device run.
- Keyboard/IME behaviour, accessibility services (TalkBack) and large system font on device were not exercised.
