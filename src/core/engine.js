// src/core/engine.js
/**
 * Assessment Engine core orchestrator.
 * Implements SOLID principles: single responsibility (orchestration),
 * open/closed (extendable via strategy pattern), dependency inversion via injection.
 */
export class AssessmentEngine {
  /**
   * @param {Object} dependencies - injected dependencies
   * @param {import('../utils/logger.js').Logger} dependencies.logger
   * @param {import('../utils/validator.js').Validator} dependencies.validator
   */
  constructor({ logger, validator }) {
    this.logger = logger;
    this.validator = validator;
    this.assessments = [];
  }

  /**
   * Load assessment data.
   * @param {Array<Object>} rawData - array of raw assessment objects
   */
  loadData(rawData) {
    this.logger.info('Loading assessment data');
    if (!this.validator.isArrayOfObjects(rawData)) {
      throw new Error('Invalid assessment data format');
    }
    this.assessments = rawData.map(d => new (require('../models/assessment.js').Assessment)(d));
  }

  /**
   * Process all loaded assessments.
   * @returns {Array<Object>} processed results
   */
  process() {
    this.logger.info('Processing assessments');
    return this.assessments.map(a => a.computeResult());
  }

  /**
   * Generate a simple report JSON.
   * @returns {Object}
   */
  generateReport() {
    const results = this.process();
    return { generatedAt: new Date().toISOString(), results };
  }
}
