const { BaseEngine } = require('../../core/engine');
const { ValidationError } = require('../../core/errors');
const fs = require('fs');

class DefinitionEngine extends BaseEngine {
  constructor() {
    super('definition', { 
      version: '2.0.0',
      provides: ['definition.normalized', 'definition.validated'],
      requires: []
    });
  }

  async execute(context) {
    const rawAssessment = context.getAssessment();
    
    if (!rawAssessment) {
      throw new ValidationError('Assessment config tidak ditemukan');
    }

    const loaded = this._load(rawAssessment);
    const normalized = this._normalize(loaded);
    this._validate(normalized);

    context.setAssessment(normalized, this.name);
  
    return context;
  }

  _load(source) {
    if (typeof source === 'string') {
      if (!fs.existsSync(source)) {
        throw new ValidationError(`File tidak ditemukan: ${source}`);
      }
      const content = fs.readFileSync(source, 'utf8');
      return JSON.parse(content);
    }
    if (typeof source === 'object') {
      return source;
    }
    throw new ValidationError('Source harus berupa file path atau object');
  }

  _normalize(raw) {
    return {
      id: raw.id,
      version: raw.version || '1.0.0',
      name: raw.name || 'Unnamed Assessment',
      description: raw.description || '',
      maxScale: raw.maxScale || 5,
      dimensions: this._normalizeDimensions(raw.dimensions || {}),
      formulas: {
        dimension: raw.formulas?.dimension || 'weighted_average',
        overall: raw.formulas?.overall || 'weighted_average'
      },
      rules: raw.rules || [],
      metadata: {
        createdAt: raw.metadata?.createdAt || new Date().toISOString(),
        author: raw.metadata?.author || 'unknown',
        tags: raw.metadata?.tags || [],
        releaseNotes: raw.metadata?.releaseNotes || ''
      }
    };
  }

  _normalizeDimensions(rawDimensions) {
    const normalized = {};
    for (const [key, dim] of Object.entries(rawDimensions)) {
      normalized[key] = {
        name: dim.name || key,
        weight: dim.weight || 0,
        formula: dim.formula || 'weighted_average',
        questions: (dim.questions || []).map(q => ({
          id: q.id,
          weight: q.weight || 1,
          reverse: q.reverse || false
        })),
        categories: dim.categories || []
      };
    }
    return normalized;
  }

  _validate(normalized) {
    if (!normalized.id || typeof normalized.id !== 'string') {
      throw new ValidationError('Assessment harus memiliki ID (string)');
    }
    if (Object.keys(normalized.dimensions).length === 0) {
      throw new ValidationError('Assessment harus memiliki minimal 1 dimensi');
    }
    const totalWeight = Object.values(normalized.dimensions)
      .reduce((sum, dim) => sum + dim.weight, 0);
    if (Math.abs(totalWeight - 1) > 0.01) {
      throw new ValidationError(`Total weight dimensi harus 1, didapat ${totalWeight}`);
    }
    for (const [key, dim] of Object.entries(normalized.dimensions)) {
      if (dim.questions.length === 0) {
        throw new ValidationError(`Dimensi "${key}" harus memiliki minimal 1 pertanyaan`);
      }
      const questionWeightSum = dim.questions.reduce((sum, q) => sum + q.weight, 0);
      if (Math.abs(questionWeightSum - 1) > 0.01) {
        throw new ValidationError(`Total weight pertanyaan di "${key}" harus 1, didapat ${questionWeightSum}`);
      }
    }
  }
}

module.exports = { DefinitionEngine };