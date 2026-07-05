/**
 * Recommendation Engine — MVP
 *
 * Deterministic, rule-based engine yang mengklasifikasikan skor assessment
 * menjadi strengths, weaknesses, dan next_best_action.
 *
 * Tidak ada randomness, tidak ada AI/LLM call, tidak ada dependency eksternal runtime.
 * Murni lookup table + template substitution.
 *
 * @author Ares
 * @version 1.0.0
 */

const thresholds = require('./config/thresholds');
const reasons = require('./config/reasons');
const actions = require('./config/actions');

const ENGINE_VERSION = '1.0.0';

class RecommendationEngine {
  constructor() {
    this.version = ENGINE_VERSION;
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
   * @param {string} input.type
   * @param {Object<string,number>} input.scores
   * @returns {Object} output JSON atau error response
   */
  generate(input) {
    // Step 1: Validate
    const validationError = this._validate(input);
    if (validationError) return validationError;

    // Step 1b: Handle empty scores (valid case, bukan error)
    if (!input.scores || Object.keys(input.scores).length === 0) {
      return this._buildEmpty(input);
    }

    // Step 2–3: Classify each dimension → strengths & weaknesses
    const { strengths, weaknesses } = this._classify(input);

    // Step 4: Select next best action (dimensi terendah)
    const nextBestAction = this._selectAction(input);

    // Step 5: Build & return output
    return this._buildOutput(input, strengths, weaknesses, nextBestAction);
  }

  // ──────────────────────────────────────────────
  //  Step 1: Validation
  // ──────────────────────────────────────────────

  /**
   * Validasi input. Returns error object jika invalid, null jika valid.
   */
  _validate(input) {
    const { type, scores, assessment_id } = input;

    // ── MISSING_ASSESSMENT_ID ──
    if (!assessment_id) {
      return {
        error: 'MISSING_ASSESSMENT_ID',
        message: 'assessment_id is required.',
      };
    }

    // ── UNSUPPORTED_TYPE ──
    const typeConfig = thresholds[type];
    if (!typeConfig) {
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

    const allowedDims = typeConfig.dimensions;

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
  _classify(input) {
    const { type, scores } = input;
    const config = thresholds[type];
    const reasonCatalog = reasons[type];
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
  _selectAction(input) {
    const { type, scores } = input;
    const actionCatalog = actions[type];
    const labels = thresholds[type].labels;

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

  _buildOutput(input, strengths, weaknesses, nextBestAction) {
    return {
      version: ENGINE_VERSION,
      generated_at: new Date().toISOString(),
      assessment_id: input.assessment_id,
      type: input.type,
      strengths,
      weaknesses,
      next_best_action: nextBestAction,
    };
  }

  _buildEmpty(input) {
    return {
      version: ENGINE_VERSION,
      generated_at: new Date().toISOString(),
      assessment_id: input.assessment_id,
      type: input.type,
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
