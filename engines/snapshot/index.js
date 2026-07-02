const { BaseEngine } = require('../../core/engine');
const { SnapshotRepository } = require('../../core/repository');
const crypto = require('crypto');

class SnapshotEngine extends BaseEngine {
  constructor(options = {}) {
    super('snapshot', { 
      version: '3.0.0',
      provides: ['snapshot.immutable', 'snapshot.signed'],
      requires: ['formula.results', 'rule.results', 'version.info']
    });
    this.repository = options.repository || new SnapshotRepository(
      options.storagePath || 'snapshots'
    );
  }

  async execute(context) {
    const snapshot = {
      schema: {
        version: '3.0.0',
        type: 'assessment_snapshot'
      },
      metadata: {
        snapshotId: this._generateSnapshotId(),
        createdAt: new Date().toISOString(),
        engineVersion: '3.0.0'
      },
      participant: context.getParticipant(),
      assessment: context.getAssessment(),
      responses: context.getResponses(),
      calculation: {
        formulas: context.getFormulas(),
        rules: context.getRules()
      },
      result: {
        scores: context.getFormulas()?.results,
        categories: context.getRules()?.results,
        overall: context.getFormulas()?.results?.overall
      },
      audit: {
        trail: context.getAuditTrail(),
        pipelineLog: context.getPipelineLog()
      },
      version: {
        assessmentVersion: context.getVersion()?.version,
        configHash: context.getVersion()?.configHash,
        formulaVersion: context.getFormulas()?.formulaVersion
      }
    };

    const signature = this._generateSignature(snapshot);
    snapshot.signature = signature;

    await this.repository.saveSnapshot(snapshot.metadata.snapshotId, snapshot);

    context.setSnapshot({
      snapshotId: snapshot.metadata.snapshotId,
      signature,
      createdAt: snapshot.metadata.createdAt
    });

    return context;
  }

  _generateSnapshotId() {
    return 'SNP-' + Date.now().toString(36).toUpperCase() + '-' + 
           Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  _generateSignature(data) {
    const { signature, ...dataWithoutSignature } = data;
    const content = JSON.stringify(dataWithoutSignature, null, 2);
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

module.exports = { SnapshotEngine };