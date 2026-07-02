class AssessmentError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

class ValidationError extends AssessmentError {
  constructor(message, field = null, value = null) {
    super(message, 'VALIDATION_ERROR', { field, value });
  }
}

class EngineError extends AssessmentError {
  constructor(message, engineName = null, details = null) {
    super(message, 'ENGINE_ERROR', { engine: engineName, ...details });
  }
}

class PipelineError extends AssessmentError {
  constructor(message, stage = null, details = null) {
    super(message, 'PIPELINE_ERROR', { stage, ...details });
  }
}

class ConfigError extends AssessmentError {
  constructor(message, path = null) {
    super(message, 'CONFIG_ERROR', { path });
  }
}

class FormulaError extends AssessmentError {
  constructor(message, expression = null) {
    super(message, 'FORMULA_ERROR', { expression });
  }
}

class VersionError extends AssessmentError {
  constructor(message, version = null) {
    super(message, 'VERSION_ERROR', { version });
  }
}

module.exports = {
  AssessmentError,
  ValidationError,
  EngineError,
  PipelineError,
  ConfigError,
  FormulaError,
  VersionError
};