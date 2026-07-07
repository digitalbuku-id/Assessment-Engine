/**
 * Pack Resolver
 *
 * Resolves assessment_id → validated, merged pack config.
 * Core Engine hanya bergantung pada return value resolver (SPEC-002 §3).
 *
 * @throws UNKNOWN_ASSESSMENT  — assessment_id not in registry
 * @throws UNRESOLVED_PACK     — pack dir/files not found
 * @throws VERSION_MISMATCH    — registry.version ≠ metadata.version
 * @throws INVALID_PACK_CONFIG — pack completeness validation failed
 */

const registry = require('./registry');
const { loadPack } = require('./loader');

/**
 * Resolve an assessment_id to its merged pack config.
 *
 * @param {string} assessmentId — pipeline assessment_id (registry key)
 * @returns {object} — merged pack config, or error object on failure
 */
function resolve(assessmentId) {
  // 1. Lookup registry
  const entry = registry[assessmentId];
  if (!entry) {
    return {
      error: 'UNKNOWN_ASSESSMENT',
      message: `Assessment '${assessmentId}' is not registered.`,
    };
  }

  // 2. Load pack
  const packConfig = loadPack(entry.pack);
  if (!packConfig) {
    return {
      error: 'UNRESOLVED_PACK',
      message:
        `Pack '${entry.pack}' referenced by assessment ` +
        `'${assessmentId}' does not exist.`,
    };
  }

  // 3. Validate version match
  if (entry.version !== packConfig.version) {
    return {
      error: 'VERSION_MISMATCH',
      message:
        `Registry expects pack '${entry.pack}' version ${entry.version} ` +
        `but metadata has version ${packConfig.version}.`,
    };
  }

  // 4. Return validated merged config
  return packConfig;
}

module.exports = { resolve };
