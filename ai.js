/**
 * AI client + prompt helpers for intent, summarize, and vision flows.
 */
class AIClient {
  constructor() {
    this.logger = new Logger('AIClient');
  }

  isConfigured() {
    return Boolean(CONFIG?.AI?.ENDPOINT && CONFIG?.AI?.API_KEY);
  }

  buildIntentPrompt(transcript, context = {}) {
    return [
      'Return JSON only with keys: intent, action, confidence, reply, args.',
      'Valid action values: scrollRight, scrollLeft, scrollDown, scrollUp, summarizePage, describePage, none.',
      `Transcript: ${transcript}`,
      `Page title: ${context.title || ''}`,
      `Selected text: ${context.selection || ''}`,
    ].join('\n');
  }

  buildSummarizePrompt(context = {}) {
    return [
      'Summarize the page for accessibility as 3-5 concise bullet points for text-to-speech.',
      'Keep each bullet short and practical.',
      `Title: ${context.title || ''}`,
      `Main text: ${context.pageText || ''}`,
    ].join('\n');
  }

  buildVisionPrompt(context = {}) {
    return [
      'Describe relevant visual layout for a low-vision user in plain language.',
      `Title: ${context.title || ''}`,
      `Page URL: ${context.url || ''}`,
      `Primary image URL: ${context.imageUrl || ''}`,
      `Primary image alt text: ${context.imageAlt || ''}`,
      `Primary image nearby context: ${context.imageContext || ''}`,
      `Image alt texts: ${(context.imageAlts || []).join(', ')}`,
    ].join('\n');
  }

  async inferIntent(transcript, context = {}) {
    if (!this.isConfigured()) {
      return null;
    }

    const prompt = this.buildIntentPrompt(transcript, context);
    const data = await this._callAPI(prompt, 'intent');
    return this.parseIntentResponse(data);
  }

  async summarize(context = {}) {
    if (!this.isConfigured()) {
      return null;
    }

    const prompt = this.buildSummarizePrompt(context);
    const data = await this._callAPI(prompt, 'summarize');
    return this.parseSummarizeResponse(data);
  }

  async vision(context = {}) {
    if (!this.isConfigured()) {
      return null;
    }

    const prompt = this.buildVisionPrompt(context);
    const data = await this._callAPI(prompt, 'vision');
    return this.parseVisionResponse(data);
  }

  async _callAPI(prompt, task) {
    try {
      const response = await fetch(CONFIG.AI.ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CONFIG.AI.API_KEY}`,
        },
        body: JSON.stringify({
          task,
          prompt,
          model: CONFIG.AI.MODEL || 'default',
        }),
      });

      if (!response.ok) {
        throw new Error(`AI request failed (${response.status})`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('AI request failed', error);
      return null;
    }
  }

  parseIntentResponse(payload) {
    const obj = this._extractObject(payload);
    if (!obj) {
      return null;
    }

    return {
      intent: obj.intent || 'unknown',
      action: obj.action || 'none',
      confidence: typeof obj.confidence === 'number' ? obj.confidence : 0,
      reply: obj.reply || '',
      args: obj.args || {},
    };
  }

  parseSummarizeResponse(payload) {
    const obj = this._extractObject(payload);
    if (obj && typeof obj.summary === 'string') {
      return obj.summary;
    }

    if (typeof payload?.summary === 'string') {
      return payload.summary;
    }

    return typeof payload?.text === 'string' ? payload.text : null;
  }

  parseVisionResponse(payload) {
    const obj = this._extractObject(payload);
    if (obj && typeof obj.description === 'string') {
      return obj.description;
    }

    return typeof payload?.description === 'string' ? payload.description : null;
  }

  _extractObject(payload) {
    if (!payload) {
      return null;
    }

    if (typeof payload === 'object') {
      if (payload.result && typeof payload.result === 'object') {
        return payload.result;
      }

      if (typeof payload.output === 'object') {
        return payload.output;
      }

      if (typeof payload.text === 'string') {
        return this._extractJSONFromText(payload.text);
      }

      return payload;
    }

    if (typeof payload === 'string') {
      return this._extractJSONFromText(payload);
    }

    return null;
  }

  _extractJSONFromText(text) {
    try {
      return JSON.parse(text);
    } catch (_error) {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        return null;
      }

      try {
        return JSON.parse(match[0]);
      } catch (error) {
        this.logger.warn('Unable to parse AI JSON response', error);
        return null;
      }
    }
  }
}

const aiClient = new AIClient();
