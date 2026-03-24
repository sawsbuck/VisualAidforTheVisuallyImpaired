/**
 * Command executor: resolves DOM targets and executes routed actions.
 */
class CommandExecutor {
  constructor() {
    this.logger = new Logger('CommandExecutor');
  }

  execute(command = {}) {
    const action = command?.action || 'NONE';
    const params = command?.params || {};

    try {
      switch (action) {
        case 'CLICK':
          return this.executeClick(params);
        case 'SCROLL':
          return this.executeScroll(params);
        case 'OPEN_SITE':
          return this.executeOpenSite(params);
        case 'SEARCH':
          return this.executeSearch(params);
        default:
          return this.buildResult({
            action,
            success: true,
            status: 'noop',
            message: 'No executable action was requested.',
          });
      }
    } catch (error) {
      this.logger.error(`Execution failed for action: ${action}`, error);
      return this.buildResult({
        action,
        success: false,
        status: 'error',
        message: 'I could not complete that command.',
        telemetry: { error: String(error?.message || error) },
      });
    }
  }

  buildResult({ action, success, status, message, ttsMessage, payload = {}, telemetry = {} }) {
    return {
      action,
      success,
      status,
      payload,
      tts: {
        message: ttsMessage || message,
      },
      telemetry: {
        timestamp: Date.now(),
        url: window.location.href,
        ...telemetry,
      },
    };
  }

  discoverInteractiveElements() {
    return Array.from(document.querySelectorAll('a,button,input,[role="button"]'));
  }

  getElementText(el) {
    return (
      el?.innerText
      || el?.value
      || el?.getAttribute?.('aria-label')
      || el?.getAttribute?.('title')
      || ''
    ).trim();
  }

  isElementVisible(el) {
    if (!el || typeof el.getBoundingClientRect !== 'function') {
      return false;
    }

    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const isShown = style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || 1) > 0;
    const hasSize = rect.width > 0 && rect.height > 0;

    return isShown && hasSize;
  }

  rankClickCandidate(el, desiredText) {
    const text = this.getElementText(el).toLowerCase();
    if (!text) {
      return -1;
    }

    let score = 0;
    if (text === desiredText) score += 100;
    else if (text.startsWith(desiredText)) score += 85;
    else if (text.includes(desiredText)) score += 70;
    else return -1;

    if (this.isElementVisible(el)) {
      score += 30;
    }

    if (el.tagName === 'BUTTON' || (el.tagName === 'INPUT' && ['submit', 'button'].includes((el.type || '').toLowerCase()))) {
      score += 10;
    }

    return score;
  }

  executeClick(params = {}) {
    const target = String(params.target || '').trim();
    if (!target) {
      return this.buildResult({
        action: 'CLICK',
        success: false,
        status: 'invalid_params',
        message: 'There was no click target provided.',
      });
    }

    const desiredText = target.toLowerCase();
    const ranked = this.discoverInteractiveElements()
      .map((el) => ({ el, score: this.rankClickCandidate(el, desiredText), text: this.getElementText(el) }))
      .filter((candidate) => candidate.score >= 0)
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    if (!best) {
      return this.buildResult({
        action: 'CLICK',
        success: false,
        status: 'not_found',
        message: `I could not find ${target} to click.`,
        telemetry: { target, candidates: 0 },
      });
    }

    best.el.click();
    return this.buildResult({
      action: 'CLICK',
      success: true,
      status: 'completed',
      message: `Clicking ${best.text || target}.`,
      payload: { target: best.text || target },
      telemetry: { target, score: best.score, candidates: ranked.length },
    });
  }

  executeScroll(params = {}) {
    const direction = String(params.direction || '').toLowerCase();
    const behavior = params.behavior === 'auto' ? 'auto' : 'smooth';

    const offsets = {
      up: { top: -300, left: 0 },
      down: { top: 300, left: 0 },
      left: { top: 0, left: -120 },
      right: { top: 0, left: 120 },
      top: { top: -window.scrollY, left: 0 },
      bottom: { top: Math.max(document.body.scrollHeight - window.scrollY, 0), left: 0 },
    };

    const offset = offsets[direction];
    if (!offset) {
      return this.buildResult({
        action: 'SCROLL',
        success: false,
        status: 'invalid_params',
        message: `Unsupported scroll direction: ${direction || 'unknown'}.`,
        telemetry: { direction },
      });
    }

    window.scrollBy({ top: offset.top, left: offset.left, behavior });
    return this.buildResult({
      action: 'SCROLL',
      success: true,
      status: 'completed',
      message: `Scrolling ${direction}.`,
      payload: { direction, behavior, ...offset },
      telemetry: { direction, behavior },
    });
  }

  sanitizeOpenUrl(site = '') {
    const trimmed = String(site).trim();
    if (!trimmed) {
      return null;
    }

    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    try {
      const url = new URL(withProtocol);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return null;
      }

      return url.href;
    } catch (_error) {
      return null;
    }
  }

  executeOpenSite(params = {}) {
    const validatedUrl = this.sanitizeOpenUrl(params.site);
    if (!validatedUrl) {
      return this.buildResult({
        action: 'OPEN_SITE',
        success: false,
        status: 'invalid_params',
        message: 'The requested site URL is invalid.',
        telemetry: { providedSite: params.site || '' },
      });
    }

    window.location.href = validatedUrl;
    return this.buildResult({
      action: 'OPEN_SITE',
      success: true,
      status: 'completed',
      message: `Opening ${validatedUrl}.`,
      payload: { url: validatedUrl },
      telemetry: { destinationHost: new URL(validatedUrl).host },
    });
  }

  findSiteSearchBox() {
    const searchInputs = Array.from(document.querySelectorAll('input,textarea'));
    return searchInputs.find((el) => {
      const type = (el.getAttribute('type') || '').toLowerCase();
      const role = (el.getAttribute('role') || '').toLowerCase();
      const label = (`${el.getAttribute('aria-label') || ''} ${el.getAttribute('placeholder') || ''} ${el.name || ''}`).toLowerCase();
      const isSearchType = type === 'search' || role === 'searchbox';
      const isTextLike = !type || type === 'text' || type === 'search';
      return this.isElementVisible(el) && (isSearchType || (isTextLike && label.includes('search')));
    });
  }

  executeSearch(params = {}) {
    const query = String(params.query || '').trim();
    if (!query) {
      return this.buildResult({
        action: 'SEARCH',
        success: false,
        status: 'invalid_params',
        message: 'There was no search query provided.',
      });
    }

    const searchBox = this.findSiteSearchBox();
    if (searchBox) {
      searchBox.focus();
      searchBox.value = query;
      searchBox.dispatchEvent(new Event('input', { bubbles: true }));
      searchBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      const parentForm = searchBox.closest('form');
      if (parentForm && typeof parentForm.requestSubmit === 'function') {
        parentForm.requestSubmit();
      }

      return this.buildResult({
        action: 'SEARCH',
        success: true,
        status: 'completed',
        message: `Searching this site for ${query}.`,
        payload: { query, mode: 'site_search' },
        telemetry: { mode: 'site_search' },
      });
    }

    const fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
    return this.buildResult({
      action: 'SEARCH',
      success: true,
      status: 'completed',
      message: `Searching the web for ${query}.`,
      payload: { query, mode: 'web_fallback', url: fallbackUrl },
      telemetry: { mode: 'web_fallback' },
    });
  }
}

const commandExecutor = new CommandExecutor();
