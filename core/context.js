const { ValidationError } = require('./errors');
const crypto = require('crypto');

class AssessmentContext {
  constructor(initialData = {}) {
    this._data = {
      id: initialData.id || this._generateId(),
      createdAt: new Date().toISOString(),
      participant: initialData.participant || null,
      assessment: initialData.assessment || null,
      responses: initialData.responses || {},
      validation: null,
      formulas: null,
      rules: null,
      version: null,
      executionGraph: null,
      snapshot: null,
      audit: [],
      pipelineLog: null
    };

    this._frozen = false;
    this._sealedSections = new Set();
  }

  _generateId() {
    return 'ASM-' + Date.now().toString(36).toUpperCase() + '-' + 
           Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  // TYPED GETTERS
  getParticipant() { return this._data.participant; }
  getAssessment() { return this._data.assessment; }
  getResponses() { return this._data.responses; }
  getFormulas() { return this._data.formulas; }
  getRules() { return this._data.rules; }
  getVersion() { return this._data.version; }
  getExecutionGraph() { return this._data.executionGraph; }
  getSnapshot() { return this._data.snapshot; }
  getAuditTrail() { return [...this._data.audit]; }
  getPipelineLog() { return this._data.pipelineLog; }

  // TYPED SETTERS dengan SEAL
  setParticipant(data, engineName = 'unknown') {
    this._set('participant', data, engineName);
    return this;
  }

  setAssessment(data, engineName = 'unknown') {
    this._set('assessment', data, engineName);
    return this;
  }

  setFormulas(data, engineName = 'unknown') {
    this._set('formulas', data, engineName);
    this.seal('formulas');
    return this;
  }

  setRules(data, engineName = 'unknown') {
    this._set('rules', data, engineName);
    this.seal('rules');
    return this;
  }

  setVersion(data, engineName = 'unknown') {
    this._set('version', data, engineName);
    this.seal('version');
    return this;
  }

  setExecutionGraph(data, engineName = 'unknown') {
    this._set('executionGraph', data, engineName);
    this.seal('executionGraph');
    return this;
  }

  setSnapshot(data, engineName = 'unknown') {
    this._set('snapshot', data, engineName);
    this.seal('snapshot');
    return this;
  }

  // SEAL MECHANISM
  seal(section) {
    this._sealedSections.add(section);
    this._data.audit.push({
      timestamp: new Date().toISOString(),
      engine: 'context',
      action: 'SEAL',
      key: section
    });
    return this;
  }

  isSealed(section) {
    return this._sealedSections.has(section);
  }

  // INTERNAL
  _set(key, value, engineName) {
    if (this._frozen) {
      throw new ValidationError(`Context sudah di-freeze. Tidak bisa menulis "${key}"`);
    }

    if (this._sealedSections.has(key)) {
      throw new ValidationError(
        `Section "${key}" sudah di-seal. Tidak bisa di-overwrite oleh "${engineName}"`
      );
    }

    const previousValue = this._data[key];
    this._data[key] = value;

    this._data.audit.push({
      timestamp: new Date().toISOString(),
      engine: engineName,
      action: previousValue === null ? 'CREATE' : 'UPDATE',
      key,
      outputChecksum: this._generateChecksum(value),
      status: 'SUCCESS'
    });

    return this;
  }

  _generateChecksum(data) {
    const content = JSON.stringify(data);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  freeze() {
    this._frozen = true;
    this._data.completedAt = new Date().toISOString();
    return this;
  }

  get isFrozen() {
    return this._frozen;
  }

  toJSON() {
    return JSON.parse(JSON.stringify(this._data));
  }

  static fromJSON(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    return new AssessmentContext(data);
  }

  getSummary() {
    return {
      id: this._data.id,
      createdAt: this._data.createdAt,
      participantName: this._data.participant?.name || 'Unknown',
      responseCount: Object.keys(this._data.responses).length,
      hasFormulas: this._data.formulas !== null,
      hasSnapshot: this._data.snapshot !== null,
      auditEntries: this._data.audit.length,
      sealedSections: Array.from(this._sealedSections),
      isFrozen: this._frozen
    };
  }
}

module.exports = { AssessmentContext };