/**
 * Leadership Domain Pack — Metadata
 *
 * Aligned to Canonical Domain Model (ADR-003):
 *   assessments/leadership/config.json
 *
 * MAJOR version bump (1.0.0 → 2.0.0): dimensions changed from 5 to 4.
 *
 * @pack_id  leadership
 * @version  2.0.0  (MAJOR — breaking dimension change per SPEC-001)
 */
module.exports = {
  // ── REQUIRED ──────────────────────────────────────────
  pack_id: 'leadership',
  display_name: 'Leadership Assessment',
  version: '2.0.0',
  dimensions: [
    'motivation',
    'decision_making',
    'delegation',
    'feedback',
  ],

  // ── OPTIONAL ──────────────────────────────────────────
  description: '4-dimensi leadership assessment (Canonical Model ADR-003)',
  rubric_version: '2026-Q3',
  locale: 'id',
  maxScale: 5,                     // assessment scoring scale (1-5)

  // ── DISPLAY ───────────────────────────────────────────
  labels: {
    motivation: 'Motivation',
    decision_making: 'Decision Making',
    delegation: 'Delegation',
    feedback: 'Feedback',
  },
};
