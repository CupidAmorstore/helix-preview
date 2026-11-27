# 14 — Android and performance

## Evidence and limits
Android: emulator run 47 (Android 15 / API 35, pixel_6 profile, exact artifact, 30/30) — `evidence` in the run
artifact `android-e2e-evidence`. **No physical device**: battery, thermal, real-network, OEM WebView and TalkBack
behaviour are **BLOCKED**.
Browser performance: `tools/perf.cjs` → `evidence/perf.json` (CPU ×4 throttle, 150 ms RTT, 200 KB/s), localhost.

## Measurements
| Metric | Value | Note |
|---|---|---|
| APK size | 5.33 MB (build 48) | small for the feature set |
| Web bundle | 4.0 MB `dist/` (incl. fonts/icons); largest chunks: Wallet 768 KB (271 KB gz, lazy), main 548 KB (150 KB gz), walletSafety 216 KB (lazy), Asset 174 KB (lazy) | |
| First contentful paint (throttled) | ~0.50–0.52 s on all main routes | browser emulation |
| Load event (throttled) | ~1.22–1.26 s | |
| JS transferred | 226 KB (Wallet route 556 KB) | |
| JS heap after load | ~10 MB | |
| Emulator: crash-free run, force-stop recovery, upgrade install, background lock 60 s, rotation, offline/recovery | PASS | run 47 |
| Logcat runtime crashes | 0 | run 47 |

## Findings
| ID | Sev | Finding |
|---|---|---|
| PERF-1 | P3 | The 403 KB research summary is compiled into the main chunk, so Home/Markets/Wallet load all research history at startup. Lazy-load it with the Bot routes. |
| PERF-2 | P2 | "Research continues" cannot run on the phone: there is no background research on Android, and the app should not claim it (see BOT-2). Android background limits would make on-device continuous research unreliable anyway; server-side (scheduled CI) is the right place. |
| PERF-3 | — | Cold/warm start, memory, battery and frame timing on a real device: **not measured** (no device). |
