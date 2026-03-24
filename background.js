/**
 * Background Service Worker for AI Accessibility Assistant
 * Handles extension-level events and management
 */

// Import shared dependencies for service worker context (MV3)
importScripts('config.js', 'logger.js');

const backgroundLogger = new Logger('BackgroundWorker');

/**
 * Extension installation/update events
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    backgroundLogger.info('Extension installed');
    // Open welcome page on install
    chrome.tabs.create({ url: 'popup.html' });
  } else if (details.reason === 'update') {
    backgroundLogger.info('Extension updated');
  }
});

/**
 * Handle messages from content scripts or popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  backgroundLogger.debug(`Message received: ${request.action}`);

  switch (request.action) {
    case 'log':
      backgroundLogger.info(`From ${sender.tab?.title}: ${request.message}`);
      sendResponse({ success: true });
      break;

    case 'getConfig':
      sendResponse({ config: CONFIG });
      break;

    default:
      backgroundLogger.warn(`Unknown action: ${request.action}`);
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

/**
 * Handle tab activation
 */
chrome.tabs.onActivated.addListener((activeInfo) => {
  backgroundLogger.debug(`Tab activated: ${activeInfo.tabId}`);
});

/**
 * Initialize background worker
 */
backgroundLogger.info('AI Accessibility Assistant - Background Worker initialized');
