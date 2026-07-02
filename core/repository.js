const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class RepositoryInterface {
  async save(id, data) { throw new Error('save() must be implemented'); }
  async load(id) { throw new Error('load() must be implemented'); }
  async exists(id) { throw new Error('exists() must be implemented'); }
  async delete(id) { throw new Error('delete() must be implemented'); }
  async list() { throw new Error('list() must be implemented'); }
}

class FileRepository extends RepositoryInterface {
  constructor(basePath) {
    super();
    this.basePath = basePath;
    this._ensureDir();
  }

  _ensureDir() {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  async save(id, data) {
    const filePath = this._getFilePath(id);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return filePath;
  }

  async load(id) {
    const filePath = this._getFilePath(id);
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  }

  async exists(id) {
    const filePath = this._getFilePath(id);
    return fs.existsSync(filePath);
  }

  async delete(id) {
    const filePath = this._getFilePath(id);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  async list() {
    const files = fs.readdirSync(this.basePath)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
    return files;
  }

  _getFilePath(id) {
    return path.join(this.basePath, `${id}.json`);
  }
}

class VersionRepository extends FileRepository {
  constructor(basePath) {
    super(basePath);
  }

  async registerVersion(assessmentId, version, config) {
    const configHash = this._generateHash(config);
    
    const versionData = {
      version,
      hash: configHash,
      registeredAt: new Date().toISOString(),
      config: {
        dimensions: config.dimensions,
        formulas: config.formulas,
        rules: config.rules,
        metadata: config.metadata || {}
      }
    };

    await this.save(`${assessmentId}/${version}`, versionData);
    
    const manifest = await this._loadManifest(assessmentId);
    manifest.versions[version] = {
      hash: configHash,
      registeredAt: versionData.registeredAt,
      deprecated: false,
      schemaVersion: '1.0',
      releaseNotes: config.releaseNotes || '',
      compatibleReportVersion: config.compatibleReportVersion || '1.0.0',
      compatibleFormulaVersion: config.compatibleFormulaVersion || '4.0.0'
    };
    manifest.latest = version;
    
    await this.save(`${assessmentId}/manifest`, manifest);
    
    return { version, hash: configHash, registeredAt: versionData.registeredAt };
  }

  async getLatest(assessmentId) {
    const manifest = await this._loadManifest(assessmentId);
    return manifest.latest;
  }

  async deprecate(assessmentId, version) {
    const manifest = await this._loadManifest(assessmentId);
    if (!manifest.versions[version]) {
      throw new Error(`Version ${version} tidak ditemukan`);
    }
    manifest.versions[version].deprecated = true;
    manifest.versions[version].deprecatedAt = new Date().toISOString();
    await this.save(`${assessmentId}/manifest`, manifest);
    return true;
  }

  async verifyHash(assessmentId, version, expectedHash) {
    const versionData = await this.load(`${assessmentId}/${version}`);
    if (!versionData) return false;
    return versionData.hash === expectedHash;
  }

  async _loadManifest(assessmentId) {
    const manifest = await this.load(`${assessmentId}/manifest`);
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

  _generateHash(config) {
    const content = JSON.stringify({
      dimensions: config.dimensions,
      formulas: config.formulas,
      rules: config.rules
    });
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

class SnapshotRepository extends FileRepository {
  constructor(basePath) {
    super(basePath);
  }

  async saveSnapshot(snapshotId, snapshotData) {
    await this.save(snapshotId, snapshotData);
    return snapshotId;
  }

  async verify(snapshotId) {
    const snapshot = await this.load(snapshotId);
    if (!snapshot) return false;
    const expectedSignature = snapshot.signature;
    const { signature, ...dataWithoutSignature } = snapshot;
    const actualSignature = this._generateSignature(dataWithoutSignature);
    return expectedSignature === actualSignature;
  }

  async findByParticipant(participantId) {
    const allSnapshots = await this.list();
    const results = [];
    for (const id of allSnapshots) {
      const snapshot = await this.load(id);
      if (snapshot?.participant?.id === participantId) {
        results.push(snapshot);
      }
    }
    return results;
  }

  async findByAssessment(assessmentId) {
    const allSnapshots = await this.list();
    const results = [];
    for (const id of allSnapshots) {
      const snapshot = await this.load(id);
      if (snapshot?.assessment?.id === assessmentId) {
        results.push(snapshot);
      }
    }
    return results;
  }

  _generateSignature(data) {
    const content = JSON.stringify(data, null, 2);
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

module.exports = {
  RepositoryInterface,
  FileRepository,
  VersionRepository,
  SnapshotRepository
};