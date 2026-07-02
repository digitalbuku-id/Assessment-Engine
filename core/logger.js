const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
  SILENT: 5
};

class Logger {
  constructor(options = {}) {
    this.level = LOG_LEVELS[options.level || 'INFO'];
    this.context = options.context || {};
    this.outputs = options.outputs || [console];
    this.history = options.enableHistory ? [] : null;
  }

  child(additionalContext) {
    return new Logger({
      level: Object.keys(LOG_LEVELS).find(k => LOG_LEVELS[k] === this.level),
      context: { ...this.context, ...additionalContext },
      outputs: this.outputs,
      enableHistory: this.history !== null
    });
  }

  _log(level, message, data = {}) {
    if (LOG_LEVELS[level] < this.level) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      data
    };

    if (this.history) {
      this.history.push(entry);
      if (this.history.length > 1000) {
        this.history = this.history.slice(-500);
      }
    }

    for (const output of this.outputs) {
      if (typeof output === 'function') {
        output(entry);
      } else if (output && typeof output.log === 'function') {
        const levelLower = level.toLowerCase();
        const method = output[levelLower] || output.log;
        method.call(output, `[${level}]`, message, data);
      }
    }

    return entry;
  }

  debug(message, data) { return this._log('DEBUG', message, data); }
  info(message, data) { return this._log('INFO', message, data); }
  warn(message, data) { return this._log('WARN', message, data); }
  error(message, data) { return this._log('ERROR', message, data); }
  fatal(message, data) { return this._log('FATAL', message, data); }

  getHistory(filter = {}) {
    if (!this.history) return [];
    
    return this.history.filter(entry => {
      if (filter.level && entry.level !== filter.level) return false;
      if (filter.engine && entry.context.engine !== filter.engine) return false;
      if (filter.since && entry.timestamp < filter.since) return false;
      return true;
    });
  }

  exportHistory() {
    return JSON.stringify(this.history || [], null, 2);
  }
}

module.exports = { Logger, LOG_LEVELS };