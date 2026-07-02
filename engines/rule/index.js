const { BaseEngine } = require('../../core/engine');
const { EngineError } = require('../../core/errors');

class RuleEngine extends BaseEngine {
  constructor() {
    super('rule', { 
      version: '2.0.0',
      provides: ['rule.dsl', 'rule.threshold'],
      requires: ['formula.results']
    });
  }

  async execute(context) {
    const assessment = context.getAssessment();
    const formulas = context.getFormulas();
    
    if (!assessment || !assessment.rules) {
      throw new EngineError('Assessment config tidak memiliki rules', this.name);
    }

    if (!formulas || !formulas.results) {
      throw new EngineError('Rule Engine membutuhkan hasil dari Formula Engine', this.name);
    }

    const facts = this._extractFacts(formulas.results);
    const rules = assessment.rules;
    const ruleResults = this._evaluateRules(rules, facts);

    context.setRules({
      results: ruleResults,
      evaluatedAt: new Date().toISOString(),
      totalRules: rules.length,
      matchedRules: ruleResults.length,
      facts
    }, this.name);

    return context;
  }

  _extractFacts(formulaResults) {
    const facts = {};
    for (const [key, result] of Object.entries(formulaResults)) {
      if (result && typeof result === 'object' && 'value' in result) {
        facts[key] = result.value;
      } else if (typeof result === 'number') {
        facts[key] = result;
      }
    }
    return facts;
  }

  _evaluateRules(rules, facts) {
    const matched = [];
    for (const rule of rules) {
      if (this._evaluateCondition(rule.condition, facts)) {
        matched.push({
          rule: rule.condition,
          action: rule.action,
          matchedAt: new Date().toISOString()
        });
      }
    }
    return matched;
  }

  _evaluateCondition(condition, facts) {
    if (condition.all) {
      return condition.all.every(cond => this._evaluateCondition(cond, facts));
    }
    if (condition.any) {
      return condition.any.some(cond => this._evaluateCondition(cond, facts));
    }
    if (condition.none) {
      return !condition.none.some(cond => this._evaluateCondition(cond, facts));
    }
    if (condition.fact && condition.operator && condition.value !== undefined) {
      return this._evaluateFact(condition.fact, condition.operator, condition.value, facts);
    }
    throw new EngineError(`Invalid rule condition: ${JSON.stringify(condition)}`, this.name);
  }

  _evaluateFact(factName, operator, value, facts) {
    const factValue = facts[factName];
    if (factValue === undefined) return false;

    switch (operator) {
      case '>=': return factValue >= value;
      case '<=': return factValue <= value;
      case '>': return factValue > value;
      case '<': return factValue < value;
      case '==': return factValue === value;
      case '!=': return factValue !== value;
      case 'between': 
        return Array.isArray(value) && factValue >= value[0] && factValue <= value[1];
      case 'in':
        return Array.isArray(value) && value.includes(factValue);
      default:
        throw new EngineError(`Unknown operator: ${operator}`, this.name);
    }
  }
}

module.exports = { RuleEngine };