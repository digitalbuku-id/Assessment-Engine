/**
 * Recommendation Engine — MVP
 *
 * Deterministic, rule-based engine yang mengklasifikasikan skor assessment
 * menjadi strengths, weaknesses, dan next_best_action.
 *
 * Config loading is abstracted: a packConfig (from resolver) can be injected,
 * or the engine falls back to legacy config/ loading (backward compat).
 *
 * Classification logic, threshold evaluation, and NBA selection are unchanged
 * from Sprint 1 — only config access is refactored.
 *
 * @author Ares
 * @version 1.0.0
 */

// Legacy config (backward compatibility — will be removed after full migration)
const _legacyThresholds = require('./config/thresholds');
const _legacyReasons = require('./config/reasons');
const _legacyActions = require('./config/actions');

const ENGINE_VERSION = '1.0.0';

class RecommendationEngine {
  /**
   * @param {object|null} packConfig — resolved pack config from resolver (new path).
   *                                   When null, engine falls back to legacy config/
   *                                   lookup by input.type (backward compat).
   */
  constructor(packConfig = null) {
    this.version = ENGINE_VERSION;
    this._packConfig = packConfig;
  }

  // ──────────────────────────────────────────────
  //  Public API
  // ──────────────────────────────────────────────

  /**
   * Generate rekomendasi dari input assessment.
   *
   * @param {Object} input — DTO hasil assessment
   * @param {string} input.assessment_id
   * @param {string} input.user_id
   * @param {string} input.type          — legacy: digunakan sbg key config lookup
   * @param {Object<string,number>} input.scores
   * @returns {Object} output JSON atau error response
   */
  generate(input) {
    // Resolve config: injected packConfig takes precedence, else legacy lookup
    const config = this._getConfig(input);

    // If config resolved to an error, return it
    if (config && config.error) return config;

    // Step 1: Validate
    const validationError = this._validate(input, config);
    if (validationError) return validationError;

    // Step 1b: Handle empty scores (valid case, bukan error)
    if (!input.scores || Object.keys(input.scores).length === 0) {
      return this._buildEmpty(input, config);
    }

    // Step 2–3: Classify each dimension → strengths & weaknesses
    const { strengths, weaknesses } = this._classify(input, config);

    // Step 4: Select next best action (dimensi terendah)
    const nextBestAction = this._selectAction(input, config);

    // Step 5: Build & return output
    return this._buildOutput(input, config, strengths, weaknesses, nextBestAction);
  }

  // ──────────────────────────────────────────────
  //  Config resolution
  // ──────────────────────────────────────────────

  /**
   * Returns the active pack config for this input.
   * - If packConfig was injected in constructor → use it directly
   * - Otherwise → legacy lookup by input.type
   */
  _getConfig(input) {
    if (this._packConfig) return this._packConfig;
    return this._resolveLegacy(input.type);
  }

  /**
   * Bridges legacy config/ format into the new merged-pack format.
   * This preserves backward compatibility and is temporary — it will be
   * removed once all consumers migrate to resolver-based loading.
   */
  _resolveLegacy(type) {
    const t = _legacyThresholds[type];
    if (!t) return null;

    const r = _legacyReasons[type];
    const a = _legacyActions[type];

    return {
      pack_id: type,
      version: this.version,
      dimensions: t.dimensions,
      labels: t.labels,
      strength_threshold: t.strength_threshold,
      weakness_threshold: t.weakness_threshold,
      reasons: r,
      actions: a,
    };
  }

  // ──────────────────────────────────────────────
  //  Step 1: Validation
  // ──────────────────────────────────────────────

  /**
   * Validasi input. Returns error object jika invalid, null jika valid.
   */
  _validate(input, config) {
    const { type, scores, assessment_id } = input;

    // ── MISSING_ASSESSMENT_ID ──
    if (!assessment_id) {
      return {
        error: 'MISSING_ASSESSMENT_ID',
        message: 'assessment_id is required.',
      };
    }

    // ── UNSUPPORTED_TYPE ──
    if (!config) {
      return {
        error: 'UNSUPPORTED_TYPE',
        message: `Assessment type '${type}' is not supported yet.`,
      };
    }

    // ── INVALID_SCORES (null/undefined) ──
    if (scores === null || scores === undefined) {
      return {
        error: 'INVALID_SCORES',
        message: 'scores is required and must be an object.',
      };
    }

    // Empty object {} → valid, will be handled as empty
    if (Object.keys(scores).length === 0) return null;

    const allowedDims = config.dimensions;

    for (const [dimension, score] of Object.entries(scores)) {
      // ── INVALID_SCORE_RANGE ──
      if (typeof score !== 'number' || score < 0 || score > 100) {
        return {
          error: 'INVALID_SCORE_RANGE',
          message: `Score for '${dimension}' is ${score}. Must be 0–100.`,
        };
      }

      // ── UNKNOWN_DIMENSION ──
      if (!allowedDims.includes(dimension)) {
        return {
          error: 'UNKNOWN_DIMENSION',
          message: `Dimension '${dimension}' is not valid for assessment type '${type}'.`,
        };
      }
    }

    return null; // valid
  }

  // ──────────────────────────────────────────────
  //  Step 2–3: Classification + Reason building
  // ──────────────────────────────────────────────

  /**
   * Klasifikasikan setiap skor sebagai STRENGTH (≥ threshold) atau
   * WEAKNESS (≤ threshold). Skor di antaranya = NEUTRAL, tidak masuk output.
   */
  _classify(input, config) {
    const { scores } = input;
    const reasonCatalog = config.reasons;
    const labels = config.labels;

    const strengths = [];
    const weaknesses = [];

    // Iterasi dalam insertion order — deterministic
    for (const [dimension, score] of Object.entries(scores)) {
      if (score >= config.strength_threshold) {
        strengths.push({
          dimension,
          score,
          label: labels[dimension] || dimension,
          reason: this._substitute(reasonCatalog.strengths[dimension] || '', score),
        });
      } else if (score <= config.weakness_threshold) {
        weaknesses.push({
          dimension,
          score,
          label: labels[dimension] || dimension,
          reason: this._substitute(reasonCatalog.weaknesses[dimension] || '', score),
        });
      }
      // else: neutral — tidak muncul
    }

    return { strengths, weaknesses };
  }

  // ──────────────────────────────────────────────
  //  Step 4: Next Best Action
  // ──────────────────────────────────────────────

  /**
   * Pilih aksi berdasarkan dimensi dengan skor terendah.
   * Tie-break: urutan pertama dalam input (deterministic).
   */
  _selectAction(input, config) {
    const { scores } = input;
    const actionCatalog = config.actions;
    const labels = config.labels;

    if (!scores || Object.keys(scores).length === 0) return null;

    let minDim = null;
    let minScore = Infinity;

    for (const [dimension, score] of Object.entries(scores)) {
      if (score < minScore) {
        minScore = score;
        minDim = dimension;
      }
    }

    const entry = actionCatalog[minDim];
    if (!entry) return null;

    return {
      focus_dimension: minDim,
      label: labels[minDim] || minDim,
      action: this._substitute(entry.action, minScore),
      rationale: this._substitute(entry.rationale, minScore),
    };
  }

  // ──────────────────────────────────────────────
  //  Step 5: Output Builder
  // ──────────────────────────────────────────────

  _buildOutput(input, config, strengths, weaknesses, nextBestAction) {
    return {
      version: ENGINE_VERSION,
      generated_at: new Date().toISOString(),
      assessment_id: input.assessment_id,
      type: config.pack_id || input.type,
      strengths,
      weaknesses,
      next_best_action: nextBestAction,
    };
  }

  _buildEmpty(input, config) {
    return {
      version: ENGINE_VERSION,
      generated_at: new Date().toISOString(),
      assessment_id: input.assessment_id,
      type: config ? (config.pack_id || input.type) : input.type,
      strengths: [],
      weaknesses: [],
      next_best_action: null,
    };
  }

  // ──────────────────────────────────────────────
  //  Utility
  // ──────────────────────────────────────────────

  /**
   * Substitusi placeholder {score} dengan nilai aktual.
   * Pure function — no side effects.
   */
  _substitute(template, score) {
    return template.replace(/\{score\}/g, String(score));
  }
}

module.exports = { RecommendationEngine };
