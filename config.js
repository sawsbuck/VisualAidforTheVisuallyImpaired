/**
 * Global configuration for AI Accessibility Assistant
 */
const CONFIG = {
  SPEECH: {
    LANGUAGE: 'en-US',
    RATE: 1.0,
    PITCH: 1.0,
    VOLUME: 1.0,
    TIMEOUT: 10000, // ms
  },
  RECOGNITION: {
    LANGUAGE: 'en-US',
    CONTINUOUS: false,
    INTERIM_RESULTS: false,
    MAX_ALTERNATIVES: 1,
  },
  KEYS: {
    START_LISTENING: 'v',
    SCROLL_RIGHT: 's',
  },
  LOGGING: {
    ENABLED: true,
    LEVEL: 'INFO', // ERROR, WARN, INFO, DEBUG
  },
};

// Freeze to prevent accidental modifications
Object.freeze(CONFIG);
