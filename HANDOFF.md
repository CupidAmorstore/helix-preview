# HELIX — Handoff (Claude Code takeover from Antigravity)

Last updated: 2026-11-16

## STATUS: BLOCKED — latest HELIX source is not reachable from the cloud

No development was done on top of this repository. Read this before touching anything.

## Access check (2026-11-16)

| Access | Result |
|---|---|
| Remote Control to the Windows PC | **None.** No computer attached, no shared folders listed. |
| Cloud GitHub | **Yes**, `CupidAmorstore/helix-preview` only (public). |

## What this repository actually contains

- Branches on GitHub: `main` only (+ this handoff branch).
- `main` HEAD: `e89e0e9` "chore: set temporary apexcryptodesk domain", last pushed 2026-04-10.
- 9 commits total, starting from "Initial HELIX rebuild".
- Content: HELIX v2.0.0 — React + Vite + Tailwind client-only crypto dashboard, Capacitor
  `android/` + `ios/` shells, Netlify Stripe function scaffolding, `legacy/` folder.

## What is NOT here (the Antigravity work)

- Branch `helix-omega-verified-beta` — does not exist on GitHub.
- Commit `a12fc5a` — not present in this repository's object store.
- No OMEGA / OMEGA 4.2 code, no SQLite databases, no auth backend, no release APKs,
  no Samsung screenshots.

Conclusion: the verified beta and all later OMEGA 4.2 work exist **only on the Windows PC**
in the Antigravity scratch folder (`<user home>\.gemini\antigravity\scratch\helix`).
Nothing has been recovered. Nothing has been overwritten.

## Baseline of this (old) repo, for reference

- `npm install` — OK
- `npm test` — 1 file, 1 test passed (smoke test only)
- `npm run build` — OK (chunk-size warning only)

## Rules for whoever continues

1. Do NOT build OMEGA features on top of this repo — it is an older, different codebase.
   Doing so would be a downgrade / rewrite.
2. Do NOT push the OMEGA source to this repo: it is **public**. Use a **private** repo.
3. Never run `git reset --hard`, `git clean`, `git checkout .` or `git stash drop`
   in the Windows folder.
4. Never commit `*.db`, `*.sqlite*`, `.env*`, `*.jks`, `*.keystore`, `google-services.json`.

## Recovery procedure (must be done at the PC, once)

Run in PowerShell. Every step is non-destructive.

```powershell
# 1. Cold copy of everything (includes uncommitted work, DBs, APKs)
$src = "$env:USERPROFILE\.gemini\antigravity\scratch\helix"
$bak = "$env:USERPROFILE\Desktop\helix-backup-$(Get-Date -Format yyyyMMdd-HHmm)"
robocopy $src $bak /E /COPY:DAT /R:1 /W:1

# 2. Record the real state
cd $src
git status
git branch -a
git log --oneline -15
git stash list

# 3. Git checkpoint of uncommitted work on a NEW branch (current branch is not moved back)
git switch -c antigravity-wip-checkpoint
git add -A
git status          # confirm no .db / .env / keystore files are staged; unstage any with: git restore --staged <file>
git commit -m "checkpoint: Antigravity uncommitted OMEGA 4.2 work"

# 4. Push to a NEW PRIVATE repo (create it empty on github.com first)
git remote add private https://github.com/CupidAmorstore/helix-omega.git
git push private --all
git push private --tags
```

Then, from the phone: start a new Claude Code session on the private repo and say
"continue from HANDOFF.md in helix-preview".

Alternative without GitHub: run `claude remote-control` in a terminal inside a copy of the
project placed outside hidden folders (e.g. `C:\Projects\helix`), then open that session
from the Claude app on the phone. The original path sits under `.gemini`, a hidden folder,
which a cloud session cannot attach to.

## Next exact action after recovery

1. Verify `a12fc5a` and `helix-omega-verified-beta` exist in the recovered repo; tag it
   `verified-beta-a12fc5a`.
2. Diff `a12fc5a..antigravity-wip-checkpoint` to list unfinished OMEGA 4.2 changes.
3. Run the full existing test suite and record results here before any edit.
4. Resume the priority list: auth/security verification → financial calculation
   correctness → persistent backend → email verification → closed-app notifications →
   phone/web sync → mobile UI → Samsung screenshot comparison → APK verification →
   HTTPS beta.

Constraints carried over: no real-money trading, no paid billing, $0 additional spend.
