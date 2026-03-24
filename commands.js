/**
 * Command routing: normalize transcript, apply rule-based matches,
 * then fall back to AI intent routing when available.
 */
class CommandRouter {
  constructor(ai = aiClient) {
    this.logger = new Logger('CommandRouter');
    this.ai = ai;

    this.ruleMatchers = [
      { pattern: /\b(scroll|move).*(right|next)\b/, action: 'scrollRight', reply: 'Scrolling right.' },
      { pattern: /\b(scroll|move).*(left|previous)\b/, action: 'scrollLeft', reply: 'Scrolling left.' },
      { pattern: /\b(scroll).*(down)\b/, action: 'scrollDown', reply: 'Scrolling down.' },
      { pattern: /\b(scroll).*(up)\b/, action: 'scrollUp', reply: 'Scrolling up.' },
      { pattern: /\b(summarize|summary)\b/, action: 'summarizePage', reply: 'Summarizing this page.' },
      { pattern: /\b(describe|what.*see|vision)\b/, action: 'describePage', reply: 'Describing the page.' },
      { pattern: /\b(stop listening|stop voice)\b/, action: 'stopListening', reply: 'Stopping voice control.' },
      { pattern: /\b(start listening|start voice|listen now)\b/, action: 'startListening', reply: 'Starting voice control.' },
    ];
  }

  normalizeTranscript(transcript) {
    return (transcript || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  matchRule(normalizedTranscript) {
    return this.ruleMatchers.find((rule) => rule.pattern.test(normalizedTranscript)) || null;
  }

  async routeCommand(transcript, context = {}) {
    const normalized = this.normalizeTranscript(transcript);
    if (!normalized) {
      return {
        source: 'none',
        action: 'none',
        reply: 'I did not catch that command.',
      };
    }

    const rule = this.matchRule(normalized);
    if (rule) {
      return {
        source: 'rule',
        action: rule.action,
        reply: rule.reply,
        args: {},
      };
    }

    const aiResult = await this.ai.inferIntent(normalized, context);
    if (aiResult && aiResult.action && aiResult.action !== 'none') {
      return {
        source: 'ai',
        action: aiResult.action,
        reply: aiResult.reply || 'Done.',
        args: aiResult.args || {},
        confidence: aiResult.confidence || 0,
      };
    }

    return {
      source: 'fallback',
      action: 'none',
      reply: `I heard "${transcript}" but could not map it to a command.`,
      args: {},
    };
  }
}

const commandRouter = new CommandRouter();
