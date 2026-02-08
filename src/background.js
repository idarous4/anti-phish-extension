/**
 * ============================================================================
 * BACKGROUND SERVICE WORKER
 * ============================================================================
 * 
 * WHAT IS THIS FILE?
 * This script runs in the background, even when Gmail is closed.
 * Chrome extensions can have service workers that handle:
 * - Updating phishing databases
 * - Syncing user settings
 * - Handling messages from content scripts
 * - Managing alarms/reminders
 * 
 * CURRENT STATUS (Phase 1):
 * This is a minimal implementation. Background tasks will be added in:
 * - Phase 2: Update AI model
 * - Phase 3: Sync settings across devices
 * - Phase 4: Handle Pro subscription checks
 * ============================================================================
 */

console.log('[Anti-Phish] Background service worker started');

/**
 * Initialize background tasks when extension is installed or updated
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Anti-Phish] Extension installed/updated:', details.reason);
  
  // TODO Phase 2: Download/update phishing database
  // TODO Phase 3: Initialize user settings
  // TODO Phase 4: Check subscription status
});

/**
 * Listen for messages from content scripts (Gmail/Outlook)
 * This allows the content script to ask the background worker to do things
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Anti-Phish] Message received:', request);
  
  if (request.action === 'reportPhishing') {
    // TODO: Send report to server (with user consent)
    console.log('[Anti-Phish] Phishing report received:', request.data);
    sendResponse({ success: true });
  }
  
  if (request.action === 'checkSubscription') {
    // TODO Phase 4: Check if user has Pro subscription
    sendResponse({ isPro: false });
  }
  
  // Return true to indicate we will send a response asynchronously
  return true;
});

/**
 * Handle extension icon click (toolbar icon)
 * Currently opens the popup (defined in manifest)
 * Can be extended to show badge notifications, etc.
 */
chrome.action.onClicked.addListener((tab) => {
  console.log('[Anti-Phish] Extension icon clicked');
});

/**
 * Periodic alarm to update threat database
 * This runs every few hours to get latest phishing patterns
 * 
 * Uncomment when implementing Phase 2:
 */
/*
chrome.alarms.create('updateDatabase', {
  periodInMinutes: 60 * 4 // Every 4 hours
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateDatabase') {
    console.log('[Anti-Phish] Updating threat database...');
    // TODO: Fetch latest phishing patterns
  }
});
*/

console.log('[Anti-Phish] Background service worker initialized');
