const { EngineError } = require('./errors');
const { Logger } = require('./logger');

class BaseEngine {
  constructor(name, options = {}) {
    if (new.target === BaseEngine) {
      throw new EngineError('BaseEngine tidak boleh di-instantiate langsung', name);
    }
    if (!name || typeof name !== 'string') {
      throw new EngineError('Engine harus memiliki nama (string)', name);
    }

    this.name = name;
    this.version = options.version || '1.0.0';
    this.enabled = options.enabled !== false;
    this.capabilities = {
      provides: options.provides || [],
      requires: options.requires || []
    };
    
    this.logger = new Logger({ 
      level: options.logLevel || 'INFO',
      context: { engine: name }
    });

    this.metadata = {
      createdAt: new Date().toISOString(),
      executionCount: 0,
      lastExecutedAt: null,
      averageExecutionTime: 0,
      totalExecutionTime: 0
    };
  }

  async execute(context) {
    throw new EngineError(
      `Engine "${this.name}" harus mengimplementasikan method execute(context)`,
      this.name
    );
  }

  validate(context) {
    return true;
  }

  provides(capability) {
    return this.capabilities.provides.includes(capability);
  }

  requires(capability) {
    return this.capabilities.requires.includes(capability);
  }

  getCapabilities() {
    return { ...this.capabilities };
  }

  async run(context) {
    if (!this.enabled) {
      this.logger.debug(`Engine "${this.name}" disabled, skipping`);
      return context;
    }

    const startTime = Date.now();
    this.logger.info(`Engine "${this.name}" starting`);

    try {
      if (!this.validate(context)) {
        throw new EngineError(`Validation gagal untuk engine "${this.name}"`, this.name);
      }

      const result = await this.execute(context);
      const duration = Date.now() - startTime;
      this._updateMetrics(duration);
      this.logger.info(`Engine "${this.name}" completed`, { duration });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Engine "${this.name}" failed`, { duration, error: error.message });

      if (error instanceof EngineError) throw error;

      throw new EngineError(
        `Engine "${this.name}" gagal: ${error.message}`,
        this.name,
        { originalError: error.message, duration }
      );
    }
  }

  _updateMetrics(duration) {
    this.metadata.executionCount++;
    this.metadata.lastExecutedAt = new Date().toISOString();
    this.metadata.totalExecutionTime += duration;
    this.metadata.averageExecutionTime = 
      this.metadata.totalExecutionTime / this.metadata.executionCount;
  }

  getInfo() {
    return {
      name: this.name,
      version: this.version,
      enabled: this.enabled,
      capabilities: this.capabilities,
      metadata: { ...this.metadata }
    };
  }
}

module.exports = { BaseEngine };