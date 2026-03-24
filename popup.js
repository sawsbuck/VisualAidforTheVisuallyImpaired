/**
 * Popup Script for AI Accessibility Assistant
 * Handles UI interactions and status updates
 */

const popupLogger = new Logger('PopupScript');

/**
 * Initialize popup
 */
document.addEventListener('DOMContentLoaded', () => {
  popupLogger.info('Popup initialized');
  setupEventListeners();
  updateStatus();
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
  const activateBtn = document.getElementById('activateBtn');
  
  if (activateBtn) {
    activateBtn.addEventListener('click', handleActivateClick);
    popupLogger.debug('Event listeners setup complete');
  }
}

/**
 * Handle activate button click
 */
function handleActivateClick() {
  popupLogger.info('Activate button clicked');
  
  // Send message to content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'activateVoiceControl' },
        (response) => {
          if (chrome.runtime.lastError) {
            popupLogger.error('Failed to send message to content script');
            updateStatusMessage('Unable to activate on this page');
          } else if (!response?.success) {
            popupLogger.warn(`Activation rejected: ${response?.error || 'Unknown reason'}`);
            updateStatusMessage(response?.error || 'Unable to activate on this page');
          } else {
            updateStatusMessage('Voice control activated!');
            popupLogger.info('Voice control activated');
          }
        }
      );
    }
  });
}

/**
 * Update status display
 */
function updateStatus() {
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');

  // Check if extension is properly loaded
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const tab = tabs[0];
      
      // Check if content script can run on this page
      if (isSupportedPage(tab.url)) {
        statusBadge.textContent = 'Ready';
        statusBadge.className = 'status-badge';
        statusText.textContent = 'Extension is active and ready to use. Press V to start voice control on the webpage.';
        popupLogger.info('Status: Ready');
      } else {
        statusBadge.textContent = 'Unavailable';
        statusBadge.className = 'status-badge error';
        statusText.textContent = 'This page does not support the extension. Try on a regular webpage.';
        popupLogger.warn('Status: Unavailable - unsupported page');
      }
    }
  });
}

/**
 * Check if page is supported
 */
function isSupportedPage(url) {
  // Don't run on restricted pages
  const restrictedPrefixes = [
    'chrome://',
    'chrome-extension://',
    'about:',
    'edge://',
    'file://',
  ];

  return !restrictedPrefixes.some(prefix => url.startsWith(prefix));
}

/**
 * Update status message
 */
function updateStatusMessage(message) {
  const statusText = document.getElementById('statusText');
  if (statusText) {
    statusText.textContent = message;
    popupLogger.info(`Status message updated: ${message}`);
  }
}

