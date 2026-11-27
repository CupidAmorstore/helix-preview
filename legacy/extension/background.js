/**
 * background.js --- Service Worker
 * Handles extension lifecycle and cross-tab state.
 */

'use strict';

chrome.runtime.onInstalled.addListener(() => {
  // Set default enabled state on install
  chrome.storage.sync.set({ autoAcceptEnabled: true });
  console.log('[AgentAutoAccept] Extension installed. Auto-accept: ON');
});

// Keep service worker alive during active sessions
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ status: 'alive' });
  }
});

