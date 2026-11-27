# Product and mobile acceptance (HELIX Preview)

Per-screen detail: `docs/FINAL_RELEASE_READINESS_AUDIT.md` section C; visual system: `docs/VISUAL_QA.md`.

## Navigation
Bottom tabs: **Home · Markets · Bot · Wallet · More** (one tap each). More holds Paper orders, Watched addresses (holdings),
Price alerts, Connections & vault, Support/Privacy/Terms. A "Portfolio" tab (proposed in the directive) is not added: the
paper portfolio is Home's primary content and watched-address holdings are read-only; a separate tab would duplicate both.
Revisit when OMEGA's portfolio model is recovered.

## What genuinely works (verified in browser QA and on the Android 15 emulator)
Paper account and market-order trading against live order books; order history; live prices with offline/reconnect states;
market search and asset pages with charts; Trading Bot status (holding cash, why, research funnel, data freshness, risk
limits, forward experiments); in-app alerts; testnet-first vault and addresses (sending disabled); Back navigation, safe
areas, rotation, background lock.

## Incomplete / not implemented
Limit/stop orders; push notifications; advanced charting (indicators, drawing); DEX/new-token discovery and network
filters; accounts/sync; onboarding tour; TalkBack verification; Research Lab tables remain dense.

## Automated checks
Browser (412×915, touch): functional 68/68, deep 21/21 (320 px and 130% text without overflow, axe WCAG 2.1 AA 0
violations on 14 routes, offline, money math, memory), wallet lifecycle 10/10. Android emulator: see
`docs/ANDROID_RELEASE_EVIDENCE.md`.

## Physical-device acceptance checklist (owner; gate stays BLOCKED until done)
Use only disposable test data; **do not import a funded wallet phrase into a QA build.** Changing signing key (debug → private
QA key) requires uninstalling the old build first, which deletes its paper data and keystore: note anything you want to keep.

1. Install the QA APK; note the checksum shown in the build notes and Android version/model.
2. First launch: dark status/navigation bars, header and tabs not under system bars.
3. Open a $500 paper account; buy $50 of BTC; confirm cash $450.00, fee $0.30; Paper orders shows the order.
4. Sell half; confirm realized P&L (paper) appears; Home equity = cash + invested.
5. Markets: search "pepe", open an asset, switch chart 1H/1D/1W.
6. Back button: closes the trade sheet → previous screen → exits only from Home.
7. Wallet: create vault (10+ chars), create a **new** 12-word wallet, verify words; check "Sending is disabled".
8. Press Home, wait 70 s, reopen: the wallet must ask for the vault password.
9. Airplane mode on: Home says "Connection lost"; off: prices return within ~10 s.
10. Rotate to landscape and back; set system font to largest; check nothing is cut off.
11. TalkBack on: tabs and the buy button are announced; turn it off.
12. Force-stop the app in Settings, reopen: paper account intact.
13. Note battery use after 15 min (Settings → Battery) and any stutter.
Report screen + what happened for any deviation.
