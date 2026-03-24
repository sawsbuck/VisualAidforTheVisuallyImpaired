/**
 * Content Script for AI Accessibility Assistant
 * Orchestrator only: capture context, route commands, execute actions.
 */

const logger = new Logger('ContentScript');

function initialize() {
  logger.info('AI Accessibility Assistant loaded on page');

  if (!voiceService.initialize()) {
    logger.error('Failed to initialize voice service');
  }

  setupKeyboardShortcuts();
  setupSpeechCallbacks();
  setupMessageHandlers();

  logger.info('Content script initialization complete');
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (event) => {
    if (isUserTyping(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === CONFIG.KEYS.START_LISTENING) {
      event.preventDefault();
      toggleVoiceCommand();
    } else if (key === CONFIG.KEYS.SCROLL_RIGHT) {
      event.preventDefault();
      executeAction('scrollRight');
    }
  });

  logger.debug('Keyboard shortcuts setup complete');
}

function isUserTyping(element) {
  const editableElements = ['INPUT', 'TEXTAREA', 'CONTENTEDITABLE'];
  return editableElements.includes(element.tagName) || element.contentEditable === 'true';
}

function toggleVoiceCommand() {
  if (voiceService.isListening) {
    logger.info('Stopping voice recognition');
    voiceService.stopListening();
  } else {
    logger.info('Starting voice recognition');
    if (!voiceService.startListening()) {
      const errorMessage = 'Failed to start voice recognition. Check browser permissions.';
      logger.error(errorMessage);
      voiceService.speak(errorMessage);
    }
  }
}

function executeAction(action, payload = {}) {
  const actionHandlers = {
    activateVoiceControl: () => ({ success: true, message: 'Voice control toggled', result: toggleVoiceCommand() }),
    startListening: () => ({ success: true, message: 'Listening started', result: voiceService.startListening() }),
    stopListening: () => ({ success: true, message: 'Listening stopped', result: voiceService.stopListening() }),
    scrollRight: () => ({ success: true, message: 'Scrolled right', result: window.scrollBy({ left: 100, behavior: 'smooth' }) }),
    scrollLeft: () => ({ success: true, message: 'Scrolled left', result: window.scrollBy({ left: -100, behavior: 'smooth' }) }),
    scrollDown: () => ({ success: true, message: 'Scrolled down', result: window.scrollBy({ top: 300, behavior: 'smooth' }) }),
    scrollUp: () => ({ success: true, message: 'Scrolled up', result: window.scrollBy({ top: -300, behavior: 'smooth' }) }),
  };

  const handler = actionHandlers[action];
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

function setupMessageHandlers() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!request?.action) {
      sendResponse({ success: false, error: 'Missing action' });
      return false;
    }

    logger.debug(`Message action received: ${request.action}`);
    const result = executeAction(request.action, request.payload);
    sendResponse(result);
    return false;
  });

  logger.debug('Message handlers setup complete');
}

function setupSpeechCallbacks() {
  voiceService.on('onStart', () => {
    logger.info('Listening started');
    updateUI('listening');
  });

  voiceService.on('onResult', async (data) => {
    const { transcript, confidence } = data;
    logger.info(`Recognized: "${transcript}" (Confidence: ${(confidence * 100).toFixed(1)}%)`);
    await handleRecognizedSpeech(transcript, confidence);
    updateUI('result');
  });

  voiceService.on('onError', (data) => {
    const { error, message } = data;
    logger.error(`Speech error: ${error}`);
    voiceService.speak(message);
    updateUI('error');
  });

  voiceService.on('onEnd', () => {
    logger.info('Listening ended');
    updateUI('idle');
  });
}

function capturePageContext() {
  const selection = window.getSelection ? String(window.getSelection()) : '';
  const bodyText = document.body?.innerText || '';
  const imageAlts = Array.from(document.querySelectorAll('img[alt]'))
    .map((img) => img.alt)
    .filter(Boolean)
    .slice(0, 15);

  return {
    title: document.title,
    url: window.location.href,
    selection: selection.slice(0, 800),
    pageText: bodyText.slice(0, 3000),
    imageAlts,
  };
}

async function handleRecognizedSpeech(transcript, confidence) {
  const context = capturePageContext();
  const command = await commandRouter.routeCommand(transcript, context);
  logger.info(`Command parsed: ${command.action}`);

  if (command.action === 'SUMMARIZE_PAGE') {
    const summary = (await aiClient.summarize(context)) || 'I cannot summarize right now.';
    voiceService.speak(summary);
    return;
  }

  if (command.action === 'DESCRIBE_IMAGE') {
    const description = (await aiClient.vision(context)) || 'I cannot describe this page right now.';
    voiceService.speak(description);
    return;
  }

  if (command.action !== 'NONE') {
    executeRoutedCommand(command);
  }
}

function executeRoutedCommand(command) {
  const { action, params } = command;
  switch (action) {
    case 'OPEN_SITE':
      window.location.assign(params.site);
      voiceService.speak(`Opening ${params.site}`);
      break;
    case 'SEARCH': {
      const url = `https://www.google.com/search?q=${encodeURIComponent(params.query)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      voiceService.speak(`Searching for ${params.query}`);
      break;
    }
    case 'SCROLL':
      executeScrollIntent(params.direction);
      break;
    case 'CLICK':
      executeClickIntent(params.target);
      break;
    default:
      logger.debug(`No DOM execution required for action: ${action}`);
      break;
  }
}

function executeScrollIntent(direction) {
  const map = {
    right: () => executeAction('scrollRight'),
    left: () => executeAction('scrollLeft'),
    down: () => executeAction('scrollDown'),
    up: () => executeAction('scrollUp'),
    top: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    bottom: () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }),
  };

  if (!map[direction]) {
    logger.warn(`Unsupported scroll direction: ${direction}`);
    return;
  }

  map[direction]();
}

function executeClickIntent(target) {
  const normalizedTarget = (target || '').trim();
  if (!normalizedTarget) {
    return;
  }

  const clickableSelectors = ['button', 'a', '[role="button"]', 'input[type="submit"]', 'input[type="button"]'];
  const candidates = Array.from(document.querySelectorAll(clickableSelectors.join(',')));
  const desiredText = normalizedTarget.toLowerCase();

  const match = candidates.find((el) => {
    const text = ((el.innerText || el.value || el.getAttribute('aria-label') || '') + '').trim().toLowerCase();
    return text === desiredText || text.includes(desiredText);
  });

  if (!match) {
    voiceService.speak(`I could not find ${normalizedTarget} to click.`);
    return;
  }

  match.click();
  voiceService.speak(`Clicking ${normalizedTarget}`);
}

function updateUI(status) {
  logger.debug(`UI Status: ${status}`);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
