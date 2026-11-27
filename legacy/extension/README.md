# HELIX Agent Auto-Accept Extension

**Version:** 1.0.0 | **Browser:** Chrome / Edge (Manifest V3)

Auto-accepts agent command-approval dialogs so you never have to manually click **Run / Accept / Allow / Approve** buttons in your AI agent interface.

---

## Install in 3 Steps

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **"Load unpacked"** -> select the `extension/` folder

That's it. The extension is now active on all pages.

---

## How It Works

The extension injects a **MutationObserver** into every page. When a button matching any of these patterns appears, it waits briefly and then auto-clicks it:

| Clicks | Never clicks |
|---|---|
| Run / Run Command | Cancel |
| Accept / Accept All | Deny |
| Allow / Allow Once | Reject |
| Approve | Delete |
| Confirm | Remove |
| Yes / OK | Stop / Terminate |
| Continue / Proceed | |
| Execute | |

### Safety
- A **configurable delay** (default 0.6s) before every click gives you a window to manually cancel.
- The block list ensures **destructive actions are never auto-clicked**.
- If the button disappears before the delay completes (e.g., you closed the dialog), the click is silently skipped.

---

## Popup Controls

Click the extension icon to open the control panel:

- **On/Off toggle** - pause auto-accept at any time
- **Delay slider** - adjust 0-3s before each auto-click
- **Activity log** - shows the last action taken

---

## Supported Environments

Works on any page where approval dialogs appear, including:
- Antigravity AI Agent interface
- Claude (claude.ai)
- Gemini Advanced
- Any localhost AI agent UI
- Custom web apps with approval flows

---

## Technical Notes

- **Manifest V3** - fully compliant with Chrome's current extension model
- No remote code execution, no external fetches
- Uses `chrome.storage.sync` for settings persistence across sessions
- Logs all actions to browser console under `[AgentAutoAccept]` prefix
- Extension context invalidations handled gracefully (e.g., after extension updates)
