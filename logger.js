/**
 * Logger utility for consistent logging across the extension
 */
class Logger {
  constructor(moduleName) {
    this.moduleName = moduleName;
  }

  /**
   * Format log message with module name and timestamp
   */
  _format(level, message) {
    const timestamp = new Date().toLocaleTimeString();
    return `[${timestamp}] [${this.moduleName}] [${level}] ${message}`;
  }

  /**
   * Check if logging is enabled for given level
   */
  _isEnabled(level) {
    if (!CONFIG.LOGGING.ENABLED) return false;
    const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
    const currentIndex = levels.indexOf(CONFIG.LOGGING.LEVEL);
    return levels.indexOf(level) <= currentIndex;
  }

  error(message, error = null) {
    if (this._isEnabled('ERROR')) {
      const msg = this._format('ERROR', message);
      console.error(msg, error || '');
    }
  }

  warn(message) {
    if (this._isEnabled('WARN')) {
      console.warn(this._format('WARN', message));
    }
  }

  info(message) {
    if (this._isEnabled('INFO')) {
      console.log(this._format('INFO', message));
    }
  }

  debug(message) {
    if (this._isEnabled('DEBUG')) {
      console.log(this._format('DEBUG', message));
    }
  }
}
