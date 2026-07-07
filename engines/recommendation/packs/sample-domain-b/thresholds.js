/**
 * [TEST PACK — bukan untuk produksi]
 *
 * Sample Domain B — Threshold Map
 *
 * Threshold 80/55 sama dengan leadership pack — untuk testing arsitektur saja.
 * Dalam domain assessment nyata, threshold dikalibrasi oleh rubric designer.
 *
 * @purpose ARCHITECTURE VALIDATION ONLY
 */
module.exports = {
  strength_threshold: 80, // ≥ 80 → strength (TEST ONLY)
  weakness_threshold: 55, // ≤ 55 → weakness (TEST ONLY)
                           // 56–79 → neutral (tidak muncul)
};
