const { EngineError, ConfigError } = require('./errors');
const { Logger } = require('./logger');

class EngineRegistry {
  constructor(options = {}) {
    this._engines = new Map();
    this._dependencies = new Map();
    this.logger = new Logger({ 
      level: options.logLevel || 'INFO',
      context: { component: 'registry' }
    });
  }

  register(engine, options = {}) {
    if (!engine || !engine.name) {
      throw new ConfigError('Engine harus memiliki property "name"');
    }

    if (this._engines.has(engine.name)) {
      this.logger.warn(`Engine "${engine.name}" sudah terdaftar, akan di-replace`);
    }

    this._engines.set(engine.name, engine);

    if (options.dependencies) {
      this._dependencies.set(engine.name, options.dependencies);
    }

    this.logger.info(`Engine "${engine.name}" v${engine.version} terdaftar`);
    return this;
  }

  get(name) {
    const engine = this._engines.get(name);
    if (!engine) {
      throw new EngineError(`Engine "${name}" tidak ditemukan di registry`, name);
    }
    return engine;
  }

  has(name) {
    return this._engines.has(name);
  }

  unregister(name) {
    if (this._engines.delete(name)) {
      this._dependencies.delete(name);
      this.logger.info(`Engine "${name}" dihapus dari registry`);
      return true;
    }
    return false;
  }

  validateDependencies() {
    const errors = [];

    for (const [engineName, deps] of this._dependencies) {
      for (const dep of deps) {
        if (!this._engines.has(dep)) {
          errors.push(`Engine "${engineName}" membutuhkan "${dep}" yang belum terdaftar`);
        }
      }
    }

    if (errors.length > 0) {
      throw new ConfigError(`Dependency validation gagal:\n${errors.join('\n')}`);
    }

    return true;
  }

  getAll() {
    return Array.from(this._engines.values());
  }

  getInfo() {
    const info = {};
    for (const [name, engine] of this._engines) {
      info[name] = engine.getInfo();
    }
    return info;
  }

  get size() {
    return this._engines.size;
  }
}

module.exports = { EngineRegistry };