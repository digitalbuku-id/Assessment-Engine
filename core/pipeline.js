const { PipelineError, EngineError } = require('./errors');
const { Logger } = require('./logger');
const { AssessmentContext } = require('./context');

class Pipeline {
  constructor(options = {}) {
    this.name = options.name || 'default';
    this.registry = options.registry || null;
    this.stages = [];
    this.hooks = {
      beforePipeline: [],
      afterPipeline: [],
      beforeStage: [],
      afterStage: [],
      onError: []
    };
    this.logger = new Logger({
      level: options.logLevel || 'INFO',
      context: { component: 'pipeline', pipeline: this.name }
    });
    this.config = {
      haltOnError: options.haltOnError !== false,
      timeoutMs: options.timeoutMs || 30000
    };
  }

  addStage(engineOrName, options = {}) {
    const stage = {
      engine: engineOrName,
      engineName: typeof engineOrName === 'string' ? engineOrName : engineOrName.name,
      skipIf: options.skipIf || null,
      timeoutMs: options.timeoutMs || this.config.timeoutMs,
      required: options.required !== false
    };

    this.stages.push(stage);
    this.logger.debug(`Stage "${stage.engineName}" ditambahkan ke pipeline`);
    return this;
  }

  on(hookName, callback) {
    if (!this.hooks[hookName]) {
      throw new PipelineError(`Hook "${hookName}" tidak valid`, this.name);
    }
    this.hooks[hookName].push(callback);
    return this;
  }

  async run(input) {
    const context = input instanceof AssessmentContext 
      ? input 
      : new AssessmentContext(input);

    const startTime = Date.now();
    const executionLog = {
      pipeline: this.name,
      startedAt: new Date().toISOString(),
      stages: [],
      errors: []
    };

    this.logger.info(`Pipeline "${this.name}" dimulai`, context.getSummary());

    try {
      await this._runHooks('beforePipeline', context);

      for (let i = 0; i < this.stages.length; i++) {
        const stage = this.stages[i];
        const stageLog = { 
          name: stage.engineName, 
          index: i,
          startedAt: new Date().toISOString() 
        };

        try {
          if (stage.skipIf && stage.skipIf(context)) {
            stageLog.status = 'SKIPPED';
            this.logger.info(`Stage "${stage.engineName}" di-skip`);
            executionLog.stages.push(stageLog);
            continue;
          }

          const engine = this._resolveEngine(stage);

          await this._runHooks('beforeStage', context, stage.engineName);

          const result = await this._executeWithTimeout(engine, context, stage.timeoutMs);

          stageLog.status = 'COMPLETED';
          stageLog.completedAt = new Date().toISOString();
          stageLog.duration = Date.now() - new Date(stageLog.startedAt).getTime();

          await this._runHooks('afterStage', context, stage.engineName);

          this.logger.info(`Stage "${stage.engineName}" selesai`, { duration: stageLog.duration });

        } catch (error) {
          stageLog.status = 'FAILED';
          stageLog.error = error.message;
          stageLog.completedAt = new Date().toISOString();

          executionLog.errors.push({
            stage: stage.engineName,
            error: error.message,
            timestamp: new Date().toISOString()
          });

          await this._runHooks('onError', context, stage.engineName, error);

          if (this.config.haltOnError && stage.required) {
            throw new PipelineError(
              `Pipeline "${this.name}" gagal di stage "${stage.engineName}": ${error.message}`,
              stage.engineName,
              { executionLog }
            );
          }

          this.logger.error(`Stage "${stage.engineName}" gagal (non-fatal)`, { error: error.message });
        }

        executionLog.stages.push(stageLog);
      }

      await this._runHooks('afterPipeline', context);

      context.freeze();

      const totalDuration = Date.now() - startTime;
      executionLog.completedAt = new Date().toISOString();
      executionLog.totalDuration = totalDuration;
      executionLog.status = 'COMPLETED';

      this.logger.info(`Pipeline "${this.name}" selesai`, { totalDuration });

      context._data.pipelineLog = executionLog;

      return context;

    } catch (error) {
      if (error instanceof PipelineError) throw error;
      
      throw new PipelineError(
        `Pipeline "${this.name}" gagal: ${error.message}`,
        this.name,
        { executionLog, originalError: error.message }
      );
    }
  }

  _resolveEngine(stage) {
    if (typeof stage.engine === 'string') {
      if (!this.registry) {
        throw new PipelineError(
          `Registry diperlukan untuk resolve engine "${stage.engine}"`,
          this.name
        );
      }
      return this.registry.get(stage.engine);
    }
    return stage.engine;
  }

  async _executeWithTimeout(engine, context, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new EngineError(
          `Engine "${engine.name}" timeout setelah ${timeoutMs}ms`,
          engine.name
        ));
      }, timeoutMs);

      engine.run(context)
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  async _runHooks(hookName, context, ...args) {
    for (const callback of this.hooks[hookName]) {
      try {
        await callback(context, ...args);
      } catch (error) {
        this.logger.warn(`Hook "${hookName}" gagal: ${error.message}`);
      }
    }
  }

  getInfo() {
    return {
      name: this.name,
      stages: this.stages.map(s => ({
        name: s.engineName,
        required: s.required,
        timeoutMs: s.timeoutMs
      })),
      hooks: Object.fromEntries(
        Object.entries(this.hooks).map(([k, v]) => [k, v.length])
      ),
      config: this.config
    };
  }
}

module.exports = { Pipeline };