/**
 * Leadership Domain Pack — Threshold Map
 *
 * Aligned to Canonical Domain Model (ADR-003): 4 dimensi.
 *
 * Nilai threshold SEMENTARA — akan dikalibrasi ulang di TASK-017.
 *
 * @migrated-from  engines/recommendation/packs/leadership/thresholds.js (v1.0.0)
 * @updated-for    ADR-003 canonical dimensions
 */
module.exports = {
  strength_threshold: 80, // ≥ 80 → strength  (rekalibrasi TASK-017)
  weakness_threshold: 55, // ≤ 55 → weakness (rekalibrasi TASK-017)
                           // 56–79 → neutral
};
