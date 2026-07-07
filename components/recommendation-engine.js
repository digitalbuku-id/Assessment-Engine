/**
 * Recommendation Adapter — Production Plumbing (Sprint 4A)
 *
 * Connects the production pipeline to the Domain Pack architecture via
 * resolver → loader → engine, with safe fallback to the legacy stub.
 *
 * Flow:
 *   1. Extract assessment_id from validatedData
 *   2. Resolve via engines/recommendation/resolver.js
 *   3. If resolved → instantiate RecommendationEngine, generate, format
 *   4. If UNKNOWN / error → fallback to legacy stub (3 hardcoded strings)
 *
 * Public contract (UNCHANGED):
 *   generateRecommendations(insights, validatedData) → string[]
 */

import { resolve } from '../engines/recommendation/resolver.js';
import { RecommendationEngine } from '../engines/recommendation/index.js';

// ──────────────────────────────────────────────
//  Legacy stub (preserved from original stub)
// ──────────────────────────────────────────────

const LEGACY_STUB = [
  'Focus on improving time management skills',
  'Consider mentoring in delegation',
  'Leverage collaboration strengths',
];

// ──────────────────────────────────────────────
//  Public API
// ──────────────────────────────────────────────

/**
 * Generate recommendations with resolver → fallback pattern.
 *
 * @param {Object} insights      — analysis from score-analyzer (unused, kept for signature compat)
 * @param {Object} validatedData — preprocessed assessment data from html-export
 * @returns {string[]} Recommendation strings (3+ items)
 */
export function generateRecommendations(insights, validatedData) {
  // ── Extract assessment_id ──
  const assessmentId =
    validatedData?.assessmentId ||
    validatedData?.assessment_id ||
    null;

  if (!assessmentId) {
    console.warn(
      '[recommendation-adapter] Fallback to legacy stub: no assessment_id in validatedData'
    );
    return LEGACY_STUB;
  }

  // ── Try resolver ──
  let packConfig;
  try {
    packConfig = resolve(assessmentId);
  } catch (err) {
    console.warn(
      `[recommendation-adapter] Fallback to legacy stub: resolver threw — ${err.message}`
    );
    return LEGACY_STUB;
  }

  // ── Check for resolver errors ──
  if (packConfig && packConfig.error) {
    console.warn(
      `[recommendation-adapter] Fallback to legacy stub: ${packConfig.error} — ${packConfig.message}`
    );
    return LEGACY_STUB;
  }

  // ── Extract scores from validatedData ──
  const scores = _extractScores(validatedData, packConfig.dimensions);
  if (!scores || Object.keys(scores).length === 0) {
    console.warn(
      '[recommendation-adapter] Fallback to legacy stub: no scores mappable to pack dimensions'
    );
    return LEGACY_STUB;
  }

  // ── Run engine ──
  let result;
  try {
    const engine = new RecommendationEngine(packConfig);
    result = engine.generate({
      assessment_id: assessmentId,
      user_id: validatedData?.user_id || 'unknown',
      type: packConfig.pack_id,
      scores,
    });
  } catch (err) {
    console.warn(
      `[recommendation-adapter] Fallback to legacy stub: engine threw — ${err.message}`
    );
    return LEGACY_STUB;
  }

  if (result && result.error) {
    console.warn(
      `[recommendation-adapter] Fallback to legacy stub: engine error — ${result.error}`
    );
    return LEGACY_STUB;
  }

  // ── Format structured output → legacy string[] ──
  return _formatRecommendations(result) || LEGACY_STUB;
}

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────

/**
 * Extract dimension-keyed scores from preprocessed assessment data.
 *
 * validatedData shape (from preprocessAssessmentData):
 *   { participants: [{ competencyScores: [{ competencyName, score }] }] }
 *
 * Maps competencyName (e.g. "Strategic Thinking") → dimension key
 * (e.g. "strategic_thinking") by lowercasing and replacing spaces/symbols
 * with underscores, then keeping only chars matching pack dimensions.
 */
function _extractScores(validatedData, dimensions) {
  const scores = {};
  const participants = validatedData?.participants || [];

  for (const participant of participants) {
    const compScores = participant.competencyScores || [];
    for (const cs of compScores) {
      // Normalize name to dimension key format
      const key = _normalizeKey(cs.competencyName);
      if (dimensions.includes(key)) {
        scores[key] = cs.score;
      }
      // Also try direct competencyId match (already snake_case)
      if (cs.competencyId && dimensions.includes(cs.competencyId)) {
        scores[cs.competencyId] = cs.score;
      }
    }
  }

  return scores;
}

/**
 * Normalize a competency display name to a dimension key.
 *   "Strategic Thinking" → "strategic_thinking"
 *   "People Development" → "people_development"
 */
function _normalizeKey(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Convert structured engine output to legacy string[] format.
 */
function _formatRecommendations(result) {
  const items = [];

  for (const s of result.strengths || []) {
    items.push(`Strength: ${s.label} (${s.score}) — ${s.reason}`);
  }

  for (const w of result.weaknesses || []) {
    items.push(`Growth area: ${w.label} (${w.score}) — ${w.reason}`);
  }

  if (result.next_best_action) {
    const nba = result.next_best_action;
    items.push(`Next step — ${nba.label}: ${nba.action}`);
  }

  return items.length > 0 ? items : null;
}
