/**
 * Command routing: normalize transcript, apply rule-based matches,
 * then fall back to AI intent routing when available.
 */
class CommandRouter {
  constructor(ai = aiClient) {
    this.logger = new Logger('CommandRouter');
    this.ai = ai;
    this.minRuleConfidence = 0.7;
    this.validActions = new Set([
      'OPEN_SITE',
      'SEARCH',
      'SCROLL',
      'CLICK',
      'SUMMARIZE_PAGE',
      'DESCRIBE_IMAGE',
      'NONE',
    ]);

    this.ruleMatchers = [
      {
        intent: 'OPEN_SITE',
        confidence: 0.95,
        pattern: /\b(open|go to|visit)\s+([a-z0-9-]+\.[a-z]{2,})(?:\s|$)/,
        extractParams: (match) => ({ site: match[2] }),
      },
      {
        intent: 'SEARCH',
        confidence: 0.9,
        pattern: /\b(search(?: for)?|find)\s+(.+)$/,
        extractParams: (match) => ({ query: match[2] }),
      },
      {
        intent: 'SCROLL',
        confidence: 0.9,
        pattern: /\b(scroll|move)\s+(up|down|left|right|top|bottom|next|previous)\b/,
        extractParams: (match) => ({ direction: this.normalizeDirection(match[2]) }),
      },
      {
        intent: 'CLICK',
        confidence: 0.85,
        pattern: /\b(click|press|tap)\s+(?:on\s+)?(.+)$/,
        extractParams: (match) => ({ target: match[2] }),
      },
      {
        intent: 'SUMMARIZE_PAGE',
        confidence: 0.95,
        pattern: /\b(summarize|summary)\b/,
        extractParams: () => ({}),
      },
      {
        intent: 'DESCRIBE_IMAGE',
        confidence: 0.95,
        pattern: /\b(describe|what(?:\s+do)?\s+i\s+see|what(?:'s| is)\s+in\s+(?:the\s+)?image)\b/,
        extractParams: () => ({}),
      },
      {
        intent: 'NONE',
        confidence: 1,
        pattern: /\b(stop listening|stop voice)\b/,
        extractParams: () => ({}),
      },
      {
        intent: 'NONE',
        confidence: 1,
        pattern: /\b(start listening|start voice|listen now)\b/,
        extractParams: () => ({}),
      },
    ];
  }

  normalizeTranscript(text) {
    return (text || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  normalizeDirection(rawDirection = '') {
    if (rawDirection === 'next') return 'right';
    if (rawDirection === 'previous') return 'left';
    return rawDirection;
  }

  ensureSiteProtocol(site = '') {
    if (!site) return '';
    if (/^https?:\/\//.test(site)) {
      return site;
    }

    return `https://${site}`;
  }

  buildContract(action = 'NONE', params = {}) {
    return { action, params };
  }

  validateCommandSchema(command) {
    if (!command || typeof command !== 'object') {
      return this.buildContract('NONE', {});
    }

    const action = typeof command.action === 'string' ? command.action : 'NONE';
    const params = command.params && typeof command.params === 'object' ? command.params : {};

    if (!this.validActions.has(action)) {
      return this.buildContract('NONE', {});
    }

    const validators = {
      OPEN_SITE: (candidate) => typeof candidate.site === 'string' && candidate.site.length > 0,
      SEARCH: (candidate) => typeof candidate.query === 'string' && candidate.query.length > 0,
      SCROLL: (candidate) => ['up', 'down', 'left', 'right', 'top', 'bottom'].includes(candidate.direction),
      CLICK: (candidate) => typeof candidate.target === 'string' && candidate.target.length > 0,
      SUMMARIZE_PAGE: () => true,
      DESCRIBE_IMAGE: () => true,
      NONE: () => true,
    };

    const isValid = validators[action] ? validators[action](params) : false;
    return isValid ? this.buildContract(action, params) : this.buildContract('NONE', {});
  }

  matchRule(normalizedTranscript) {
    for (const rule of this.ruleMatchers) {
      const match = normalizedTranscript.match(rule.pattern);
      if (!match) {
        continue;
      }

      const rawParams = rule.extractParams ? rule.extractParams(match) : {};
      const params = { ...rawParams };
      if (rule.intent === 'OPEN_SITE' && params.site) {
        params.site = this.ensureSiteProtocol(params.site);
      }

      return {
        action: rule.intent,
        params,
        confidence: rule.confidence,
      };
    }

    return null;
  }

  parseAIFallback(aiResult) {
    if (!aiResult || typeof aiResult !== 'object') {
      return null;
    }

    const actionAliases = {
      scrollRight: this.buildContract('SCROLL', { direction: 'right' }),
      scrollLeft: this.buildContract('SCROLL', { direction: 'left' }),
      scrollDown: this.buildContract('SCROLL', { direction: 'down' }),
      scrollUp: this.buildContract('SCROLL', { direction: 'up' }),
      summarizePage: this.buildContract('SUMMARIZE_PAGE', {}),
      summarize: this.buildContract('SUMMARIZE_PAGE', {}),
      describePage: this.buildContract('DESCRIBE_IMAGE', {}),
      describeImage: this.buildContract('DESCRIBE_IMAGE', {}),
      none: this.buildContract('NONE', {}),
    };

    if (typeof aiResult.action === 'string' && actionAliases[aiResult.action]) {
      return actionAliases[aiResult.action];
    }

    if (typeof aiResult.intent === 'string' && this.validActions.has(aiResult.intent)) {
      return this.buildContract(aiResult.intent, aiResult.args || aiResult.params || {});
    }

    return null;
  }

  async routeCommand(transcript, context = {}) {
    const normalized = this.normalizeTranscript(transcript);
    if (!normalized) {
      return this.buildContract('NONE', {});
    }

    const rule = this.matchRule(normalized);
    if (rule && rule.confidence >= this.minRuleConfidence) {
      return this.validateCommandSchema(rule);
    }

    const aiResult = await this.ai.inferIntent(normalized, context);
    const aiCommand = this.parseAIFallback(aiResult);
    if (aiCommand) {
      if (aiCommand.action === 'OPEN_SITE' && aiCommand.params.site) {
        aiCommand.params.site = this.ensureSiteProtocol(aiCommand.params.site);
      }

      return this.validateCommandSchema(aiCommand);
    }

    return this.buildContract('NONE', {});
  }
}

const commandRouter = new CommandRouter();
