const { BaseEngine } = require('../../core/engine');
const { VersionError } = require('../../core/errors');
const { VersionRepository } = require('../../core/repository');

class VersionEngine extends BaseEngine {
  constructor(options = {}) {
    super('version', { 
      version: '4.0.0',
      provides: ['version.manifest', 'version.hash'],
      requires: ['definition.normalized']
    });
    this.repository = options.repository || new VersionRepository(
      options.storagePath || 'versions'
    );
  }

  async execute(context) {
    const assessment = context.getAssessment();
    
    if (!assessment || !assessment.id) {
      throw new VersionError('Assessment tidak memiliki ID', null);
    }

    const assessmentId = assessment.id;
    const version = assessment.version || '1.0.0';
    const configHash = this._generateHash(assessment);

    const manifest = await this._loadManifest(assessmentId);

    if (!manifest.versions[version]) {
      const versionData = {
        version,
        hash: configHash,
        registeredAt: new Date().toISOString(),
        config: {
          dimensions: assessment.dimensions,
          formulas: assessment.formulas,
          rules: assessment.rules,
          metadata: assessment.metadata || {}
        }
      };

      await this.repository.save(`${assessmentId}/${version}`, versionData);
      
      manifest.versions[version] = {
        hash: configHash,
        registeredAt: versionData.registeredAt,
        deprecated: false,
        schemaVersion: '1.0',
        releaseNotes: assessment.releaseNotes || '',
        compatibleReportVersion: assessment.compatibleReportVersion || '1.0.0',
        compatibleFormulaVersion: assessment.compatibleFormulaVersion || '4.0.0'
      };

      manifest.latest = version;
      await this.repository.save(`${assessmentId}/manifest`, manifest);
    }

    context.setVersion({
      assessmentId,
      version,
      configHash,
      registeredAt: manifest.versions[version].registeredAt,
      isLatest: manifest.latest === version,
      isDeprecated: manifest.versions[version].deprecated || false
    }, this.name);

    return context;
  }

  _generateHash(config) {
    const crypto = require('crypto');
    const content = JSON.stringify({
      dimensions: config.dimensions,
      formulas: config.formulas,
      rules: config.rules
    });
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async _loadManifest(assessmentId) {
    const manifest = await this.repository.load(`${assessmentId}/manifest`);
    if (!manifest) {
      return {
        schemaVersion: '1.0',
        assessmentId,
        latest: null,
        versions: {}
      };
    }
    return manifest;
  }
}

module.exports = { VersionEngine };