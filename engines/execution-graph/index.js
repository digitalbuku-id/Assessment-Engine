const { BaseEngine } = require('../../core/engine');

class ExecutionGraphEngine extends BaseEngine {
  constructor() {
    super('execution-graph', { 
      version: '3.0.0',
      provides: ['execution.dag', 'execution.lineage'],
      requires: ['formula.results', 'version.info']
    });
  }

  async execute(context) {
    const responses = context.getResponses();
    const formulas = context.getFormulas();
    const version = context.getVersion();
    const auditTrail = context.getAuditTrail();

    if (!formulas) {
      throw new Error('ExecutionGraph Engine membutuhkan formulas');
    }

    const pipelineDAG = context.getPipelineDAG?.() || this._getDefaultDAG();

    const executionGraph = {
      schema: {
        version: '3.0.0',
        type: 'execution_graph'
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        engineVersion: '3.0.0'
      },
      assessment: {
        id: version?.assessmentId,
        version: version?.version,
        configHash: version?.configHash
      },
      dependency: pipelineDAG,
      lineage: {
        source: 'participant_responses',
        transformations: auditTrail.map(entry => ({
          engine: entry.engine,
          timestamp: entry.timestamp,
          action: entry.action,
          key: entry.key
        })),
        output: 'assessment_report'
      },
      execution: {
        formulas: formulas.formulasUsed,
        formulaVersion: formulas.formulaVersion,
        calculatedAt: formulas.calculatedAt
      },
      audit: {
        totalActions: auditTrail.length,
        engines: this._summarizeEngines(auditTrail),
        timeline: auditTrail
      },
      reproducibility: {
        canReproduce: true,
        requiredInputs: Object.keys(responses),
        configHash: version?.configHash,
        engineVersions: this._getEngineVersions()
      }
    };

    context.setExecutionGraph(executionGraph);
    return context;
  }

  _getDefaultDAG() {
    return {
      engines: ['definition', 'formula', 'rule', 'version'],
      order: ['definition', 'formula', 'rule', 'version', 'execution-graph'],
      dataFlow: {
        'definition': ['assessment'],
        'formula': ['assessment', 'responses'],
        'rule': ['formulas'],
        'version': ['assessment'],
        'execution-graph': ['formulas', 'version', 'auditTrail']
      }
    };
  }

  _summarizeEngines(auditTrail) {
    const summary = {};
    for (const entry of auditTrail) {
      summary[entry.engine] = (summary[entry.engine] || 0) + 1;
    }
    return summary;
  }

  _getEngineVersions() {
    return {
      definition: '2.0.0',
      formula: '4.0.0',
      rule: '2.0.0',
      version: '4.0.0',
      executionGraph: '3.0.0'
    };
  }
}

module.exports = { ExecutionGraphEngine };