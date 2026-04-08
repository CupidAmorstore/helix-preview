/**
 * HELIX Agent Auto-Accept --- content.js v1.0.0
 *
 * Purpose: Automatically clicks approval/run/accept buttons that appear
 * in AI agent interfaces (Antigravity, Claude, Gemini Advanced, etc.)
 * so the user never has to manually approve each command.
 *
 * Strategy:
 * - Uses a MutationObserver to watch for dynamically-injected dialogs/buttons
 * - Matches buttons by text content and ARIA role --- does NOT rely on brittle class names
 * - Respects a user-controlled enable/disable toggle stored in extension storage
 * - Has a short delay before clicking to allow the user to cancel if needed
 * - Logs every auto-accepted action to the console for transparency
 * - Fails safely: if the button is gone by the time we try to click, we skip silently
 */

'use strict';

// --------- CONFIG ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

let DELAY_MS_LIVE = 600; // ms to wait before auto-clicking (can be updated from popup)
const DEBUG = true;      // set false to silence console logs

// Button text patterns to auto-accept (case-insensitive, trimmed match)
const ACCEPT_PATTERNS = [
  /^run$/i,
  /^accept$/i,
  /^allow$/i,
  /^approve$/i,
  /^confirm$/i,
  /^yes$/i,
  /^ok$/i,
  /^continue$/i,
  /^execute$/i,
  /^proceed$/i,
  /^run command$/i,
  /^run anyway$/i,
  /^allow once$/i,
  /^allow always$/i,
  /^auto-run$/i,
];

// Text patterns that MUST NOT be clicked (safety blockers)
const BLOCK_PATTERNS = [
  /cancel/i,
  /deny/i,
  /reject/i,
  /stop/i,
  /decline/i,
  /delete/i,
  /remove/i,
  /terminate/i,
  /kill/i,
];

// --------- STATE ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

let isEnabled = true; // default on; synced from extension storage
const pendingTimers = new WeakMap(); // track pending clicks per element

// --------- HELPERS ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function log(...args) {
  if (DEBUG) console.log('[AgentAutoAccept]', ...args);
}

function extractText(el) {
  return (el.innerText || el.textContent || el.value || el.getAttribute('aria-label') || '').trim();
}

function isAcceptableButton(el) {
  // Must be interactive
  const tag = (el.tagName || '').toLowerCase();
  const role = el.getAttribute('role');
  if (tag !== 'button' && tag !== 'input' && role !== 'button') return false;

  // Must not be disabled
  if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;

  // Must not be hidden
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;

  const text = extractText(el);

  // Block list check first
  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.test(text)) return false;
  }

  // Accept list check
  for (const pattern of ACCEPT_PATTERNS) {
    if (pattern.test(text)) return true;
  }

  return false;
}

function safeClick(el) {
  if (!el || !el.isConnected) {
    log('Element no longer in DOM, skipping click');
    return;
  }
  if (!isAcceptableButton(el)) {
    log('Element no longer matches accept pattern, skipping');
    return;
  }

  const text = extractText(el);
  log(`Auto-accepting: "${text}"`);

  try {
    el.click();
  } catch (err) {
    log('Click failed:', err.message);
  }
}

function scheduleClick(el) {
  if (pendingTimers.has(el)) return; // already scheduled

  const text = extractText(el);
  log(`Scheduling auto-accept in ${DELAY_MS_LIVE}ms for: "${text}"`);

  const timer = setTimeout(() => {
    pendingTimers.delete(el);
    if (isEnabled) safeClick(el);
  }, DELAY_MS_LIVE);

  pendingTimers.set(el, timer);
}

// --------- DOM SCAN ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function scanForButtons(root = document) {
  if (!isEnabled) return;

  // Query all potentially interactive elements
  const candidates = root.querySelectorAll(
    'button, input[type="button"], input[type="submit"], [role="button"]'
  );

  for (const el of candidates) {
    if (isAcceptableButton(el)) {
      scheduleClick(el);
    }
  }
}

// --------- MUTATION OBSERVER ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

const observer = new MutationObserver((mutations) => {
  if (!isEnabled) return;

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;

      // Check the node itself
      if (isAcceptableButton(node)) {
        scheduleClick(node);
        continue;
      }

      // Check descendants
      scanForButtons(node);
    }

    // Also re-check attribute changes (e.g., aria-disabled removed, button enabled)
    if (mutation.type === 'attributes' && mutation.target) {
      const el = mutation.target;
      if (isAcceptableButton(el)) {
        scheduleClick(el);
      }
    }
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['disabled', 'aria-disabled', 'style', 'class'],
});

// --------- INITIAL SCAN ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// Run on page load (catches buttons already present)
document.addEventListener('DOMContentLoaded', () => scanForButtons(), { once: true });
scanForButtons(); // also run immediately for document_idle injection

// --------- STORAGE SYNC ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// Load saved state from extension storage
try {
  chrome.storage.sync.get(['autoAcceptEnabled', 'delayMs'], (result) => {
    if (typeof result.autoAcceptEnabled === 'boolean') {
      isEnabled = result.autoAcceptEnabled;
      log(`Loaded saved state: enabled=${isEnabled}`);
    }
    if (typeof result.delayMs === 'number') {
      DELAY_MS_LIVE = result.delayMs;
      log(`Loaded saved delay: ${DELAY_MS_LIVE}ms`);
    }
  });
} catch (e) {
  // Extension context invalidated on reload --- fail silently
}

// Listen for toggle/delay messages from popup
try {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SET_ENABLED') {
      isEnabled = message.enabled;
      log(`State updated from popup: enabled=${isEnabled}`);
    }
    if (message.type === 'SET_DELAY') {
      DELAY_MS_LIVE = message.delayMs;
      log(`Delay updated from popup: ${DELAY_MS_LIVE}ms`);
    }
    if (message.type === 'GET_STATUS') {
      return { enabled: isEnabled };
    }
  });
} catch (e) {
  // Safe fallback
}

