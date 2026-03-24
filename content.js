/**
 * Content Script for AI Accessibility Assistant
 * Runs in the context of web pages to provide voice control
 */

const logger = new Logger('ContentScript');

/**
 * Initialize the content script
 */
function initialize() {
  logger.info('AI Accessibility Assistant loaded on page');

  // Initialize speech service
  if (!speechService.initialize()) {
    logger.error('Failed to initialize speech service');
  }

  // Setup keyboard shortcuts
  setupKeyboardShortcuts();

  // Setup speech service callbacks
  setupSpeechCallbacks();
  
  // Setup message handlers for popup/background actions
  setupMessageHandlers();

  logger.info('Content script initialization complete');
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (event) => {
    // Prevent action if user is typing in an input field
    if (isUserTyping(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === CONFIG.KEYS.START_LISTENING) {
      event.preventDefault();
      handleVoiceCommand();
    } else if (key === CONFIG.KEYS.SCROLL_RIGHT) {
      event.preventDefault();
      handleScrollRight();
    }
  });

  logger.debug('Keyboard shortcuts setup complete');
}

/**
 * Check if user is typing in an input field
 */
function isUserTyping(element) {
  const editableElements = ['INPUT', 'TEXTAREA', 'CONTENTEDITABLE'];
  return editableElements.includes(element.tagName) || 
         element.contentEditable === 'true';
}

/**
 * Handle voice command (press V)
 */
function handleVoiceCommand() {
  if (speechService.isListening) {
    logger.info('Stopping voice recognition');
    speechService.stopListening();
  } else {
    logger.info('Starting voice recognition');
    if (!speechService.startListening()) {
      const errorMessage = 'Failed to start voice recognition. Check browser permissions.';
      logger.error(errorMessage);
      speechService.speak(errorMessage);
    }
  }
}

/**
 * Handle scroll right (press S)
 */
function handleScrollRight() {
  const scrollContainer = document.documentElement;
  scrollContainer.scrollLeft += 100;
  logger.debug('Scrolled right by 100px');
}

/**
 * Action handlers (extensible command router)
 */
const ACTION_HANDLERS = {
  activateVoiceControl: () => {
    handleVoiceCommand();
    return { success: true, message: 'Voice control toggled' };
  },
  scrollRight: () => {
    handleScrollRight();
    return { success: true, message: 'Scrolled right' };
  },
};

/**
 * Handle incoming action requests
 */
function handleAction(action, payload = {}) {
  const handler = ACTION_HANDLERS[action];

  if (!handler) {
    logger.warn(`Unknown action received: ${action}`);
    return { success: false, error: `Unknown action: ${action}` };
  }

  try {
    return handler(payload);
  } catch (error) {
    logger.error(`Action failed: ${action}`, error);
    return { success: false, error: 'Action failed' };
  }
}

/**
 * Setup runtime message handlers
 */
function setupMessageHandlers() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!request?.action) {
      sendResponse({ success: false, error: 'Missing action' });
      return false;
    }

    logger.debug(`Message action received: ${request.action}`);
    const result = handleAction(request.action, request.payload);
    sendResponse(result);
    return false;
  });

  logger.debug('Message handlers setup complete');
}

/**
 * Setup speech service event callbacks
 */
function setupSpeechCallbacks() {
  speechService.on('onStart', () => {
    logger.info('Listening started');
    updateUI('listening');
  });

  speechService.on('onResult', (data) => {
    const { transcript, confidence } = data;
    logger.info(`Recognized: "${transcript}" (Confidence: ${(confidence * 100).toFixed(1)}%)`);
    handleRecognizedSpeech(transcript, confidence);
    updateUI('result');
  });

  speechService.on('onError', (data) => {
    const { error, message } = data;
    logger.error(`Speech error: ${error}`);
    speechService.speak(message);
    updateUI('error');
  });

  speechService.on('onEnd', () => {
    logger.info('Listening ended');
    updateUI('idle');
  });
}

/**
 * Handle recognized speech
 */
function handleRecognizedSpeech(transcript, confidence) {
  // Future: Add command processing here
  const response = `You said: ${transcript}`;
  speechService.speak(response);
  logger.info(`Spoken: "${response}"`);
}

/**
 * Update UI status (for future UI enhancements)
 */
function updateUI(status) {
  logger.debug(`UI Status: ${status}`);
  // Future: Add visual feedback here
}

/**
 * Start the content script when DOM is ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
