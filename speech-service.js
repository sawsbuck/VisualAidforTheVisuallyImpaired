/**
 * SpeechService - Handles all speech-related operations
 * including text-to-speech and speech-to-text
 */
class SpeechService {
  constructor() {
    this.logger = new Logger('SpeechService');
    this.recognition = null;
    this.isListening = false;
    this.callbacks = {};
  }

  /**
   * Initialize the speech recognition API
   */
  initialize() {
    const RecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!RecognitionAPI) {
      this.logger.error('Speech Recognition API not available');
      return false;
    }

    try {
      this.recognition = new RecognitionAPI();
      this._setupRecognitionListeners();
      this.logger.info('Speech Recognition initialized');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize Speech Recognition', error);
      return false;
    }
  }

  /**
   * Setup event listeners for speech recognition
   */
  _setupRecognitionListeners() {
    this.recognition.lang = CONFIG.RECOGNITION.LANGUAGE;
    this.recognition.continuous = CONFIG.RECOGNITION.CONTINUOUS;
    this.recognition.interimResults = CONFIG.RECOGNITION.INTERIM_RESULTS;
    this.recognition.maxAlternatives = CONFIG.RECOGNITION.MAX_ALTERNATIVES;

    this.recognition.onstart = () => this._onStart();
    this.recognition.onresult = (event) => this._onResult(event);
    this.recognition.onerror = (event) => this._onError(event);
    this.recognition.onend = () => this._onEnd();
  }

  /**
   * Start listening for speech
   */
  startListening() {
    if (!this.recognition) {
      if (!this.initialize()) {
        this.logger.error('Cannot start listening - Speech Recognition not available');
        return false;
      }
    }

    try {
      this.isListening = true;
      this.recognition.start();
      this.logger.info('Speech recognition started');
      return true;
    } catch (error) {
      this.logger.error('Failed to start listening', error);
      this.isListening = false;
      return false;
    }
  }

  /**
   * Stop listening for speech
   */
  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
      this.isListening = false;
      this.logger.info('Speech recognition stopped');
    }
  }

  /**
   * Handle recognition start
   */
  _onStart() {
    this.logger.info('Listening started');
    this._executeCallback('onStart');
  }

  /**
   * Handle recognition result
   */
  _onResult(event) {
    if (!event.results || event.results.length === 0) {
      this.logger.debug('No results received');
      return;
    }

    const resultIndex = typeof event.resultIndex === 'number' ? event.resultIndex : event.results.length - 1;
    const result = event.results[resultIndex];

    if (!result || !result[0]) {
      this.logger.debug('Invalid result payload received');
      return;
    }

    const transcript = result[0].transcript.trim();
    const confidence = result[0].confidence;
    const isFinal = result.isFinal;

    this.logger.debug(`Transcript: "${transcript}" (Confidence: ${(confidence * 100).toFixed(1)}%, Final: ${isFinal})`);

    if (transcript && isFinal) {
      this._executeCallback('onResult', { transcript, confidence });
    }
  }

  /**
   * Handle recognition error
   */
  _onError(event) {
    const error = event.error;
    this.logger.error(`Speech Recognition Error: ${error}`);
    
    const errorMessage = this._getErrorMessage(error);
    this._executeCallback('onError', { error, message: errorMessage });
  }

  /**
   * Handle recognition end
   */
  _onEnd() {
    this.isListening = false;
    this.logger.info('Listening ended');
    this._executeCallback('onEnd');
  }

  /**
   * Get user-friendly error message
   */
  _getErrorMessage(error) {
    const errorMessages = {
      'no-speech': 'No speech detected. Please try speaking again.',
      'audio-capture': 'No microphone found. Please check your audio input.',
      'network': 'Network error. Please check your internet connection.',
      'permission-denied': 'Microphone permission denied. Please allow access and try again.',
      'not-allowed': 'Speech recognition not allowed. Please check browser permissions.',
    };

    return errorMessages[error] || `Error: ${error}`;
  }

  /**
   * Speak text (text-to-speech)
   */
  speak(text) {
    if (!text) {
      this.logger.warn('No text provided for speech synthesis');
      return false;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = CONFIG.SPEECH.LANGUAGE;
      utterance.rate = CONFIG.SPEECH.RATE;
      utterance.pitch = CONFIG.SPEECH.PITCH;
      utterance.volume = CONFIG.SPEECH.VOLUME;

      window.speechSynthesis.speak(utterance);
      this.logger.debug(`Speaking: "${text}"`);
      return true;
    } catch (error) {
      this.logger.error('Failed to speak', error);
      return false;
    }
  }

  /**
   * Cancel ongoing speech synthesis
   */
  cancelSpeech() {
    window.speechSynthesis.cancel();
    this.logger.debug('Speech synthesis cancelled');
  }

  /**
   * Register callback for specific event
   */
  on(event, callback) {
    if (typeof callback === 'function') {
      if (!this.callbacks[event]) {
        this.callbacks[event] = [];
      }
      this.callbacks[event].push(callback);
      this.logger.debug(`Registered callback for event: ${event}`);
    }
  }

  /**
   * Execute registered callback
   */
  _executeCallback(event, data = null) {
    const eventCallbacks = this.callbacks[event] || [];

    for (const callback of eventCallbacks) {
      try {
        callback(data);
      } catch (error) {
        this.logger.error(`Error executing callback for ${event}`, error);
      }
    }
  }
}

// Create global instance
const speechService = new SpeechService();
