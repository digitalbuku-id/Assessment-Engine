/**
 * Pack Loader
 *
 * Loads Domain Pack files via require(), validates completeness (SPEC-002 §1e),
 * and merges into a single config object for the Core Engine.
 *
 * Startup-load only (not hot-reload). Packs are cached in-memory after first load.
 */

const path = require('path');

// ──────────────────────────────────────────────
//  In-memory cache
// ──────────────────────────────────────────────

const _cache = new Map();

// ──────────────────────────────────────────────
//  Strategy Registry (ADR-005 D1–D3)
// ──────────────────────────────────────────────

const SUPPORTED_STRATEGIES = {
  scoring_strategy: ['threshold', 'disc_dual_profile'],
  graph_strategy: ['none', 'disc_profile'],
  interpretation_strategy: ['threshold', 'disc_profile'],
};

const DEFAULT_STRATEGY = {
  scoring_strategy: 'threshold',
  graph_strategy: 'none',
  interpretation_strategy: 'threshold',
};

// ──────────────────────────────────────────────
//  Public API
// ──────────────────────────────────────────────

/**
 * Load a pack by its pack_id. Caches after first load.
 *
 * @param {string} packId  — directory name under packs/
 * @returns {object|null}  — merged pack config, or null if pack dir not found
 * @throws {INVALID_PACK_CONFIG} if completeness validation fails
 */
function loadPack(packId) {
  if (_cache.has(packId)) return _cache.get(packId);

  const packDir = path.join(__dirname, 'packs', packId);
  let metadata, thresholds, reasons, actions;

  try {
    metadata = require(path.join(packDir, 'metadata.js'));
    thresholds = require(path.join(packDir, 'thresholds.js'));
    reasons = require(path.join(packDir, 'reasons.js'));
    actions = require(path.join(packDir, 'actions.js'));
  } catch (_err) {
    return null; // pack directory or file missing
  }

  // ── Completeness validation (SPEC-002 §1e) ──
  _validateCompleteness(packId, metadata, thresholds, reasons, actions);

  // ── Merge into single config object ──
  const merged = {
    ...metadata,
    scoring_strategy: metadata.scoring_strategy || DEFAULT_STRATEGY.scoring_strategy,
    graph_strategy: metadata.graph_strategy || DEFAULT_STRATEGY.graph_strategy,
    interpretation_strategy: metadata.interpretation_strategy || DEFAULT_STRATEGY.interpretation_strategy,
    strength_threshold: thresholds.strength_threshold,
    weakness_threshold: thresholds.weakness_threshold,
    reasons,
    actions,
  };

  _cache.set(packId, merged);
  return merged;
}

/**
 * Preload all packs referenced in the registry at startup.
 *
 * @param {object} registry — the assessment registry object
 * @returns {Map<string, object>}  packId → merged config
 */
function preloadAll(registry) {
  const seen = new Set();
  for (const entry of Object.values(registry)) {
    if (seen.has(entry.pack)) continue;
    seen.add(entry.pack);
    const config = loadPack(entry.pack);
    if (!config) {
      const err = new Error(
        `Registry references pack '${entry.pack}' but it does not exist.`
      );
      err.code = 'UNRESOLVED_PACK';
      throw err;
    }
  }
  return _cache;
}

// ──────────────────────────────────────────────
//  Validation (SPEC-002 §1e)
// ──────────────────────────────────────────────

function _validateCompleteness(packId, metadata, thresholds, reasons, actions) {
  // assert pack_id
  if (!metadata.pack_id) {
    _fail(packId, 'metadata.pack_id is missing');
  }

  // assert dimensions not empty
  if (!metadata.dimensions || metadata.dimensions.length === 0) {
    _fail(packId, 'metadata.dimensions is empty');
  }

  // assert strength_threshold > weakness_threshold
  if (thresholds.strength_threshold <= thresholds.weakness_threshold) {
    _fail(packId,
      `strength_threshold (${thresholds.strength_threshold}) must be > ` +
      `weakness_threshold (${thresholds.weakness_threshold})`);
  }

  // For each dimension, validate labels + reasons + actions
  for (const dim of metadata.dimensions) {
    if (!metadata.labels || !metadata.labels[dim]) {
      _fail(packId, `dimension '${dim}' missing in labels`);
    }
    if (!reasons.strengths || !reasons.strengths[dim]) {
      _fail(packId, `dimension '${dim}' missing in reasons.strengths`);
    }
    if (!reasons.weaknesses || !reasons.weaknesses[dim]) {
      _fail(packId, `dimension '${dim}' missing in reasons.weaknesses`);
    }
    if (!actions[dim]) {
      _fail(packId, `dimension '${dim}' missing in actions`);
    }
  }

  // ── Strategy validation (ADR-005 D3) ──
  for (const field of ['scoring_strategy', 'graph_strategy', 'interpretation_strategy']) {
    const value = metadata[field] || DEFAULT_STRATEGY[field];
    if (!SUPPORTED_STRATEGIES[field].includes(value)) {
      _fail(packId, `${field} '${value}' is not a supported strategy`);
    }
  }
}

function _fail(packId, detail) {
  const err = new Error(`INVALID_PACK_CONFIG: Pack '${packId}': ${detail}`);
  err.code = 'INVALID_PACK_CONFIG';
  throw err;
}

module.exports = { loadPack, preloadAll, _validateCompleteness };
