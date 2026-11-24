# Master source recovery report

Date: 2026-11-24 · Session environment: **Anthropic cloud container** (Linux x86_64, Claude Code 2.1.x), session
started from the owner's Android app. **No computer folder shared, no phone attached, no Remote Control.**
Repository access: 15 GitHub repositories (list below). Connectors: Google Drive (working), Gmail (**needs re-sign-in**).

## Classification

| # | Source | Status | Evidence |
|---|---|---|---|
| 1 | **HELIX Preview**: `CupidAmorstore/helix-preview`, branch `ccr-8d17e0b5-yaqvtm` | **RECOVERED AND VERIFIED** | clean tree; HEAD in section "Identity"; 171 tests, CI green, Android emulator evidence |
| 2 | HELIX Preview `main` @ `dca30a7` | RECOVERED AND VERIFIED (superseded by #1, which contains it) | merge-base of PR #3 |
| 3 | Branch `claude/helix-mobile-takeover-vrkwgr` (`45cc4cb`, `HANDOFF.md`) | RECOVERED (documentation only) | records that OMEGA is only on the PC; 2 doc commits on top of old `main` `e89e0e9` |
| 4 | **HELIX OMEGA**: `C:\Users\Sam\.gemini\antigravity\scratch\helix` (branches `main` 49fc4ac, `helix-omega-2.0` 61ecf0c, `helix-omega-3.1` d0417e5, `helix-omega-4.1` ee941ac, `helix-omega-verified-beta` a12fc5a7…, possible uncommitted OMEGA 4.2) | **IDENTIFIED BUT INACCESSIBLE** | on the owner's Windows PC; no computer folder shared (`list_computer_folders` → none); not in any accessible repo; GitHub commit search for `a12fc5a` only hits unrelated public repos (hash-prefix collisions) |
| 5 | **Pro Trading Bot / Trading Lab** (Private 0.6.8, 0.7.0 beta) | **IDENTIFIED BUT INACCESSIBLE** | not in any accessible repo; Drive title/zip search found no Trading Lab archive; Gmail unavailable (re-sign-in needed); ChatGPT Library / Termux / phone not reachable from the cloud |
| 6 | `Trading_Lab_v070_Multichain_Source_and_Evidence.zip` | NOT FOUND (in reachable locations) | not on this machine, not in Drive (search by title "Trading"/zip) |
| 7 | `Trading_Lab_Paper_Strategy_Study_20261121.zip` | NOT FOUND (in reachable locations) | same |
| 8 | `Claude_Code_Pro_Trading_Bot_Resume_Pack.zip` (owner upload, sha256 `6fc7a339…cc53`) | RECOVERED BUT INCOMPLETE | 4 text files (instructions, `KNOWN_STATE.md`, inspector script): **no source**; facts inside are owner-supplied, unverified |
| 9 | Google Drive archives (Takeout zips 2026-03/04/06/09, "SkyLegend QA APK" artifacts) | DUPLICATE OR UNRELATED | names/types unrelated to HELIX; Takeout archives not opened (personal data, no indication of HELIX) |
| 10 | `legacy/` folder in helix-preview (Apex Crypto Desk zips) | RECOVERED: older predecessor | committed in repo; superseded |

Accessible repositories checked (none contain OMEGA or Trading Lab): helix-preview, AetherForge, Skylegend-builds,
skylegend-ci-mirror, RevenueRadar, My-project, New-game, skyfleet-cytadelAscension, skyfleet-2026-04-30_00-31-42,
skyfleet-2, skyfleet-2026-04-29_16-08-39, skyfleet, bonuscodewatch, Skyfleet-Citadel-Ascension, cupidamor-backend.

## Identity of the recovered canonical source (helix-preview)
- Remote: `https://github.com/CupidAmorstore/helix-preview` (public) · branch `ccr-8d17e0b5-yaqvtm` · no stashes, no
  extra worktrees, working tree clean at each commit (see `docs/MASTER_PROJECT_STATE.md` for the current SHA).
- Backups: GitHub remote (all commits pushed); evidence releases `android-e2e`; previous QA APK `android-preview`.

**No previously unknown HELIX/Trading Lab development was discovered.** Preview was not substituted for OMEGA.

## Shortest safe transfer procedure (owner, on the Windows PC)

**Never push OMEGA or Trading Lab into `helix-preview`: it is public.**

1. Make a cold backup first (non-destructive):
   ```powershell
   $src = "$env:USERPROFILE\.gemini\antigravity\scratch\helix"
   $bak = "$env:USERPROFILE\Desktop\helix-backup-$(Get-Date -Format yyyyMMdd-HHmm)"
   robocopy $src $bak /E /COPY:DAT /R:1 /W:1
   ```
2. Record the real state (paste the output into the next session; it contains no secrets):
   ```powershell
   cd $src
   git status --short | Measure-Object -Line
   git branch -a -v --no-abbrev
   git stash list
   git log --oneline -5 --all
   ```
3. Preserve uncommitted work on its own branch (does not touch existing branches):
   ```powershell
   git switch -c recovery/omega-4.2-wip
   git add -A -- . ':!*.db' ':!*.sqlite*' ':!.env*' ':!*.jks' ':!*.keystore' ':!google-services.json'
   git commit -m "WIP snapshot for recovery (no secrets, no databases)"
   ```
4. Create a **private** GitHub repository (e.g. `CupidAmorstore/helix-omega`, visibility **Private**) in the GitHub
   website, then:
   ```powershell
   git remote add recovery https://github.com/CupidAmorstore/helix-omega.git
   git push recovery --all
   git push recovery --tags
   ```
5. Trading Lab: upload `Trading_Lab_v070_Multichain_Source_and_Evidence.zip` and
   `Trading_Lab_Paper_Strategy_Study_20261121.zip` to the same private repo (a `sources/` folder via the GitHub
   website upload) or attach them to the next Claude Code message. From Termux:
   `cd ~/<trading-lab-folder> && git bundle create ~/storage/downloads/trading-lab.bundle --all` and attach the bundle.
6. Start the next session with the private repository added (claude.ai → session sources) and state that it is
   authorized for reading.

Then the three-way comparison and integration can proceed (`docs/UNIFIED_PLATFORM_INTEGRATION_MAP.md`).
