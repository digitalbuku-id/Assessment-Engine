/**
 * Leadership Domain Pack — Metadata
 *
 * @migrated-from engines/recommendation/config/thresholds.js (dimensions + labels)
 * @pack_id  leadership
 * @version  1.0.0
 */
module.exports = {
  // ── REQUIRED ──────────────────────────────────────────
  pack_id: 'leadership',
  display_name: 'Leadership Assessment',
  version: '1.0.0',
  dimensions: [
    'communication',
    'decisiveness',
    'strategic_thinking',
    'people_development',
    'execution',
  ],

  // ── OPTIONAL ──────────────────────────────────────────
  description: '5-dimensi leadership assessment untuk mid-level manager',
  rubric_version: '2026-Q3',
  locale: 'id',

  // ── DISPLAY ───────────────────────────────────────────
  labels: {
    communication: 'Communication',
    decisiveness: 'Decisiveness',
    strategic_thinking: 'Strategic Thinking',
    people_development: 'People Development',
    execution: 'Execution',
  },
};
