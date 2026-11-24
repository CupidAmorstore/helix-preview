# Android release evidence

## Current QA artifact (tested exactly as built)
| Field | Value |
|---|---|
| Application ID | `com.helix.app` |
| Version name / code | `2.0.0-preview` / `30` |
| Source commit | `236cc846adff42b2c8f1ca7957b3aaef58be9d3b` (app code identical to `c1b10c7`; later commits change workflows/docs/research only) |
| Build workflow | `.github/workflows/android-preview.yml`, run `45463786025`, job `apk` |
| APK SHA-256 | `5385a710a3d39c1df519a73448046ee3eb5fad52b72fba9f1c3153518197c94d` |
| Signing | **public debug key** (committed `android/app/debug.keystore`), cert SHA-256 `2C:87:44:37:85:D6:79:B0:B5:1B:81:15:73:80:83:AA:38:AC:76:6F:4C:12:80:E4:E1:62:48:4C:9E:1E:1C:DC` |
| Debuggable | yes (debug build) |
| Distribution | CI artifact `helix-preview-apk` of that run (30-day retention), downloadable by signed-in GitHub users because the repository is **public**: **not private** |
| Emulator test | job `device` of the same run installed **this exact file** (downloaded, not rebuilt): **30/30**, evidence https://github.com/CupidAmorstore/helix-preview/releases/tag/android-e2e (`apk-identity.txt`, results.json, 22 screenshots, logcat) |
| Physical device | **BLOCKED**: no device available to this session |

## Previous public build (unchanged, still downloadable)
`android-preview` prerelease = QA build #29, commit `c1b10c7`, sha256 `85cc04b2…6d989`, same public debug-key certificate
(fingerprint verified by parsing the APK v2 signature block). Publishing new public releases is now **opt-in only**
(manual dispatch with `publish_public_release=true`); the release title states "PUBLIC download". Existing public history
was not deleted.

## Signing blocker (High) and owner setup
Anyone can sign an APK with the public debug key; Android accepts it as an update over a debug-signed HELIX. Owner action
(the key never enters chat or the repo):
1. On your PC: `keytool -genkeypair -v -keystore helix-qa.jks -alias helix-qa -keyalg RSA -keysize 4096 -validity 3650`
2. PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("helix-qa.jks")) | Set-Clipboard`
3. GitHub → helix-preview → Settings → Secrets and variables → Actions → New repository secret:
   `HELIX_QA_KEYSTORE_B64` (paste), `HELIX_QA_STORE_PASSWORD`, `HELIX_QA_KEY_ALIAS` = `helix-qa`, `HELIX_QA_KEY_PASSWORD`.
4. Push or re-run the workflow: `apk-identity.txt` then says "private QA key". Uninstall the debug-signed app once before
   installing (different signature; this deletes its local paper data).
This is a QA identity only; it does not authorize production signing.

## Truly private distribution
Not possible at $0 from a public repository. Options for the owner: make `helix-preview` private (artifacts and releases
become private), or build QA APKs in the private OMEGA repository once it exists.
