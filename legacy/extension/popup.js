'use strict';

const toggle     = document.getElementById('toggle');
const statusDot  = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const delayRange = document.getElementById('delay-range');
const delayLabel = document.getElementById('delay-label');
const logContent = document.getElementById('log-content');

// --------- Load stored state ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
chrome.storage.sync.get(['autoAcceptEnabled', 'delayMs'], (result) => {
  const enabled = result.autoAcceptEnabled !== false; // default true
  const delay   = result.delayMs !== undefined ? result.delayMs : 600;

  toggle.checked   = enabled;
  delayRange.value = delay;
  delayLabel.textContent = (delay / 1000).toFixed(1) + 's';
  updateStatus(enabled);
});

// --------- Toggle ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  chrome.storage.sync.set({ autoAcceptEnabled: enabled });

  // Broadcast to all content scripts
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      try {
        chrome.tabs.sendMessage(tab.id, { type: 'SET_ENABLED', enabled });
      } catch (_) { /* tab may not have content script */ }
    }
  });

  updateStatus(enabled);
  appendLog(enabled ? 'Auto-accept enabled' : 'Auto-accept paused', enabled ? 'ok' : 'skip');
});

// --------- Delay slider ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
delayRange.addEventListener('input', () => {
  const ms = parseInt(delayRange.value, 10);
  delayLabel.textContent = (ms / 1000).toFixed(1) + 's';
  chrome.storage.sync.set({ delayMs: ms });
  // Broadcast new delay to content scripts
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      try {
        chrome.tabs.sendMessage(tab.id, { type: 'SET_DELAY', delayMs: ms });
      } catch (_) {}
    }
  });
});

// --------- Helpers ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function updateStatus(enabled) {
  statusDot.className  = 'status-dot' + (enabled ? '' : ' off');
  statusText.textContent = enabled ? 'Active' : 'Paused';
}

function appendLog(msg, cls = '') {
  const line = document.createElement('div');
  line.className = cls ? `log-${cls}` : '';
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  line.textContent = `[${time}] ${msg}`;
  logContent.textContent = '';
  logContent.appendChild(line);
}

appendLog('Extension loaded');

