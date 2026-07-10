/**
 * Score Normalization
 *
 * Converts raw assessment scores (e.g., 1-5 scale) to the 0-100 range
 * expected by the Recommendation Engine's threshold classification.
 *
 * Default formula: (rawScore / maxScale) * 100
 *
 * This is the DEFAULT implementation. The function signature supports
 * custom scoringConfig for alternative formulas in the future
 * (e.g., different scales, weighted normalization, percentile-based).
 *
 * @module normalization
 */

/**
 * Normalize a raw score from a source scale to 0-100.
 *
 * @param {number} rawScore    — raw score from assessment (e.g., 3 on 1-5 scale)
 * @param {object} scoringConfig
 * @param {number} scoringConfig.maxScale — maximum possible raw score
 * @param {number} [scoringConfig.minScale=1] — minimum possible raw score (default 1)
 * @returns {number} — normalized score (0-100), rounded to integer
 *
 * @example
 *   normalize(4, { maxScale: 5 })  → 80
 *   normalize(3, { maxScale: 5 })  → 60
 *   normalize(2, { maxScale: 5 })  → 40
 */
function normalize(rawScore, scoringConfig) {
  if (scoringConfig && scoringConfig.maxScale && scoringConfig.maxScale > 0) {
    const minScale = scoringConfig.minScale || 1;
    const range = scoringConfig.maxScale - minScale + 1;
    return Math.round(((rawScore - minScale + 1) / range) * 100);
  }

  // No scoringConfig → assume score is already 0-100 (backward compat)
  return rawScore;
}

/**
 * Normalize all scores in a scores object.
 *
 * @param {Object<string,number>} scores — raw scores per dimension
 * @param {object} scoringConfig
 * @returns {Object<string,number>} — normalized scores
 */
function normalizeScores(scores, scoringConfig) {
  const normalized = {};
  for (const [dim, score] of Object.entries(scores)) {
    normalized[dim] = normalize(score, scoringConfig);
  }
  return normalized;
}

module.exports = { normalize, normalizeScores };
