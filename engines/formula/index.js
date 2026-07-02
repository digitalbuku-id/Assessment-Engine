const { BaseEngine } = require('../../core/engine');
const { FormulaError } = require('../../core/errors');

class BaseFormula {
  constructor(id, options = {}) {
    this.id = id;
    this.version = options.version || '1.0.0';
    this.description = options.description || '';
    this.author = options.author || 'AceLearning';
    this.supportedInput = options.supportedInput || ['number'];
  }

  calculate(values, weights = null) {
    throw new Error('calculate() must be implemented');
  }

  validate(values, weights = null) {
    if (!Array.isArray(values) || values.length === 0) {
      throw new FormulaError(`Formula "${this.id}" membutuhkan array values`);
    }
    if (weights && values.length !== weights.length) {
      throw new FormulaError(`Jumlah values dan weights tidak sama`);
    }
    return true;
  }

  getMetadata() {
    return {
      id: this.id,
      version: this.version,
      description: this.description,
      author: this.author,
      supportedInput: this.supportedInput
    };
  }
}

class WeightedAverageFormula extends BaseFormula {
  constructor() {
    super('weighted_average', {
      version: '4.0.0',
      description: 'Menghitung rata-rata tertimbang'
    });
  }

  calculate(values, weights = null) {
    this.validate(values, weights);
    const weightedSum = values.reduce((sum, val, idx) => {
      const weight = weights ? weights[idx] : 1;
      return sum + (val * weight);
    }, 0);
    const totalWeight = weights 
      ? weights.reduce((sum, w) => sum + w, 0)
      : values.length;
    const result = totalWeight > 0 ? weightedSum / totalWeight : 0;
    return {
      value: Math.round(result * 100) / 100,
      formula: this.id,
      version: this.version,
      confidence: 1,
      source: values.map((_, idx) => `value_${idx}`),
      metadata: this.getMetadata()
    };
  }
}

class WeightedSumFormula extends BaseFormula {
  constructor() {
    super('weighted_sum', {
      version: '4.0.0',
      description: 'Menghitung jumlah tertimbang'
    });
  }

  calculate(values, weights = null) {
    this.validate(values, weights);
    const result = values.reduce((sum, val, idx) => {
      const weight = weights ? weights[idx] : 1;
      return sum + (val * weight);
    }, 0);
    return {
      value: Math.round(result * 100) / 100,
      formula: this.id,
      version: this.version,
      confidence: 1,
      source: values.map((_, idx) => `value_${idx}`),
      metadata: this.getMetadata()
    };
  }
}

class AverageFormula extends BaseFormula {
  constructor() {
    super('average', {
      version: '1.0.0',
      description: 'Menghitung rata-rata sederhana'
    });
  }

  calculate(values, weights = null) {
    this.validate(values);
    const result = values.length > 0 
      ? values.reduce((sum, val) => sum + val, 0) / values.length 
      : 0;
    return {
      value: Math.round(result * 100) / 100,
      formula: this.id,
      version: this.version,
      confidence: 1,
      source: values.map((_, idx) => `value_${idx}`),
      metadata: this.getMetadata()
    };
  }
}

class FormulaRegistry {
  constructor() {
    this._formulas = new Map();
    this._registerBuiltins();
  }

  register(formula) {
    if (!(formula instanceof BaseFormula)) {
      throw new FormulaError('Formula harus instance dari BaseFormula');
    }
    this._formulas.set(formula.id, formula);
    return this;
  }

  get(id) {
    const formula = this._formulas.get(id);
    if (!formula) {
      throw new FormulaError(`Formula "${id}" tidak terdaftar`);
    }
    return formula;
  }

  has(id) {
    return this._formulas.has(id);
  }

  list() {
    return Array.from(this._formulas.values()).map(f => f.getMetadata());
  }

  _registerBuiltins() {
    this.register(new WeightedAverageFormula());
    this.register(new WeightedSumFormula());
    this.register(new AverageFormula());
  }
}

const formulaRegistry = new FormulaRegistry();

class FormulaEngine extends BaseEngine {
  constructor() {
    super('formula', { 
      version: '4.0.0',
      provides: ['formula.weighted', 'formula.average', 'formula.pure'],
      requires: ['definition.assessment', 'context.responses']
    });
    this.registry = formulaRegistry;
  }

  async execute(context) {
    const assessment = context.getAssessment();
    const responses = context.getResponses();
    
    if (!assessment || !assessment.formulas) {
      throw new FormulaError('Assessment config tidak memiliki formulas', null);
    }

    const formulas = assessment.formulas;
    const maxScale = assessment.maxScale || 5;
    const normalizationFactor = 100 / maxScale;
    const results = {};

    for (const [dimKey, dimConfig] of Object.entries(assessment.dimensions || {})) {
      const formulaId = dimConfig.formula || formulas.dimension || 'weighted_average';
      const questionIds = dimConfig.questions.map(q => q.id);
      const questionWeights = dimConfig.questions.map(q => q.weight);
      
      const dimResponses = questionIds.map(id => responses[id]);
      
      const formula = this.registry.get(formulaId);
      const rawResult = formula.calculate(dimResponses, questionWeights);
      
      const normalizedValue = Math.round(rawResult.value * normalizationFactor * 100) / 100;
      
      results[dimKey] = {
        ...rawResult,
        rawValue: rawResult.value,
        value: normalizedValue,
        normalized: true,
        maxScale: maxScale
      };
    }

    const overallFormulaId = formulas.overall || 'weighted_average';
    const overallFormula = this.registry.get(overallFormulaId);
    const dimWeights = Object.values(assessment.dimensions || {}).map(d => d.weight);
    const dimScores = Object.values(results).map(r => r.value);
    
    const overallRaw = overallFormula.calculate(dimScores, dimWeights);
    results.overall = {
      ...overallRaw,
      rawValue: overallRaw.value,
      value: Math.round(overallRaw.value * 100) / 100,
      normalized: true,
      maxScale: maxScale
    };

    context.setFormulas({
      results,
      calculatedAt: new Date().toISOString(),
      formulaVersion: '4.0.0',
      maxScale: maxScale,
      normalizationFactor: normalizationFactor,
      formulasUsed: {
        dimensions: Object.fromEntries(
          Object.entries(assessment.dimensions || {}).map(([k, v]) => [k, v.formula || 'weighted_average'])
        ),
        overall: overallFormulaId
      }
    }, this.name);

    return context;
  }
}

module.exports = { 
  FormulaEngine, 
  FormulaRegistry, 
  formulaRegistry,
  BaseFormula,
  WeightedAverageFormula,
  WeightedSumFormula,
  AverageFormula
};